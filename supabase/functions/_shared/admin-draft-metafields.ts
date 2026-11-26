import type { FieldDefinition } from './admin-v2-types.ts';
import { DRAFT_BOTANICAL_KEYS, demand, type ProductDraft } from './admin-operational-core.ts';
import { resolveShopifyTarget, serializeValueForShopify } from './admin-v2-field-policy.ts';
import { encodeEditorialList } from './editorial-list-codec.ts';
import { isEditorialList } from './admin-catalog-policy.ts';
import { isFieldEditable, validateValue } from './admin-v2-validation.ts';

type GraphQL = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
export interface DraftMetafield { fieldKey: string; namespace: string; key: string; type: string; value: string }
interface AdminDraftField { key: string; text?: string; json?: unknown; number?: number }
interface AdminDraftValue { product_id: string; field_key: string; value_text: string | null; value_json: unknown; value_number: number | null }
interface Definition { namespace: string; key: string; type: { name: string }; access: { storefront: string } }

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

/** A successful RPC is not a successful field read-back; JSON object key order is irrelevant. */
export function verifyAdminDraftFields(productId: string, requested: AdminDraftField[], rows: AdminDraftValue[]) {
  return requested.map(expected => {
    const matches = rows.filter(row => row.product_id === productId && row.field_key === expected.key);
    const actual = matches[0];
    const expectedValue = expected.json ?? expected.text ?? expected.number;
    demand(matches.length === 1 && actual && JSON.stringify(canonical(actual.value_json ?? actual.value_text ?? actual.value_number)) === JSON.stringify(canonical(expectedValue)),
      `Campo ${expected.key} non riletto nella bozza Admin: usa la stessa richiesta, senza creare un'altra bozza.`);
    return { fieldKey: expected.key, value: expectedValue, state: 'VERIFIED_ADMIN' as const };
  });
}

export function requestedDraftFields(draft: ProductDraft) {
  return [
    ...(draft.shortDescription ? [{ fieldKey: 'short_description', value: draft.shortDescription }] : []),
    ...Object.entries(draft.botanical).map(([fieldKey, value]) => ({ fieldKey, value })),
  ];
}

/** Acknowledgement is per field, never inferred from AI output or a save button. */
export function requireDraftBotanicalReview(draft: ProductDraft) {
  for (const key of Object.keys(draft.botanical)) {
    demand((DRAFT_BOTANICAL_KEYS as readonly string[]).includes(key), `Campo non ammesso nella bozza: ${key}.`);
    demand(draft.botanicalConfirmedKeys?.includes(key), `Conferma la fonte del campo ${key} prima di salvare o inviare la bozza.`);
  }
}

/** All product definitions are paginated; a partial page never authorizes a write. */
export async function readDraftMetafieldDefinitions(graphql: GraphQL): Promise<Definition[]> {
  const result: Definition[] = [];
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const data: { metafieldDefinitions: { nodes: Definition[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } = await graphql(
      'query AdminDraftMetafieldDefinitions($after:String){metafieldDefinitions(ownerType:PRODUCT,first:100,after:$after){nodes{namespace key type{name} access{storefront}} pageInfo{hasNextPage endCursor}}}', { after });
    const connection = data.metafieldDefinitions;
    demand(connection && Array.isArray(connection.nodes) && typeof connection.pageInfo?.hasNextPage === 'boolean', 'Definizioni metafield Shopify incomplete: nessun invio.');
    result.push(...connection.nodes);
    if (!connection.pageInfo.hasNextPage) return result;
    const cursor = connection.pageInfo.endCursor;
    demand(cursor && cursor !== after, 'Paginazione definizioni Shopify non verificata: nessun invio.');
    after = cursor;
  }
  demand(false, 'Definizioni Shopify oltre il limite verificabile: nessun invio.');
  return result;
}

/** Read comparison does not grant a write or demand fresh authoring acknowledgement. */
export function planDraftMetafieldsForComparison(draft: ProductDraft, registry: FieldDefinition[]): DraftMetafield[] {
  return requestedDraftFields(draft).map(({ fieldKey, value }) => {
    const field = registry.find(def => def.key === fieldKey);
    const target = field && resolveShopifyTarget(field);
    demand(field?.visible && target?.kind === 'metafield', `Mapping di confronto non disponibile per ${fieldKey}: nessuna nuova creazione.`);
    const serialized = serializeValueForShopify(field, value);
    demand(typeof serialized === 'string', `Valore di confronto non rappresentabile per ${fieldKey}.`);
    return { fieldKey, namespace: target.namespace, key: target.key, type: target.valueType,
      value: isEditorialList(fieldKey) ? encodeEditorialList(serialized, target.valueType) : serialized };
  });
}

export async function planDraftMetafields(draft: ProductDraft, registry: FieldDefinition[], graphql: GraphQL): Promise<DraftMetafield[]> {
  requireDraftBotanicalReview(draft);
  const requested = requestedDraftFields(draft);
  if (!requested.length) return [];
  const definitions = await readDraftMetafieldDefinitions(graphql);
  return requested.map(({ fieldKey, value }) => {
    const field = registry.find(def => def.key === fieldKey);
    const target = field && resolveShopifyTarget(field);
    demand(field?.visible && field.editable && !field.manual_only && target?.kind === 'metafield', `Campo ${fieldKey} senza mapping Shopify autorizzato: nessun invio.`);
    demand(isFieldEditable(field).ok && validateValue(field, value).ok, `Valore ${fieldKey} non valido nel registro corrente: nessun invio.`);
    const matches = definitions.filter(def => def.namespace === target.namespace && def.key === target.key);
    const definition = matches[0];
    demand(matches.length === 1 && definition, `Definizione Shopify assente o ambigua per ${fieldKey}: nessun invio.`);
    const type = definition.type?.name;
    demand(definition.access?.storefront === 'PUBLIC_READ', `Campo ${fieldKey} non leggibile dal sito: nessun invio.`);
    const serialized = serializeValueForShopify(field, value);
    demand(typeof serialized === 'string', `Campo ${fieldKey} non rappresentabile come metafield.`);
    let wire = serialized;
    if (isEditorialList(fieldKey)) {
      demand(['json', 'list.single_line_text_field', 'multi_line_text_field'].includes(type), `Tipo Shopify incompatibile per ${fieldKey}: ${type}.`);
      try { wire = encodeEditorialList(serialized, type); }
      catch { demand(false, `Valore non reversibile per ${fieldKey}: nessun invio.`); }
    } else {
      demand(type === target.valueType, `Tipo Shopify incompatibile per ${fieldKey}: atteso ${target.valueType}, trovato ${type}.`);
    }
    return { fieldKey, namespace: target.namespace, key: target.key, type, value: wire };
  });
}

/** Compare exact identity, type and wire value after creation/recovery. Never mutate. */
export async function verifyDraftMetafields(productId: string, plan: DraftMetafield[], graphql: GraphQL, comparison = false) {
  if (!plan.length) return [];
  const fields: { namespace: string; key: string; type: string; value: string }[] = [];
  let after: string | null = null;
  let complete = false;
  for (let page = 0; page < 20; page++) {
    const data: { product: { id: string; metafields: { nodes: typeof fields; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null } = await graphql(
      'query AdminVerifyDraftMetafields($id:ID!,$after:String){product(id:$id){id metafields(first:100,after:$after){nodes{namespace key type value} pageInfo{hasNextPage endCursor}}}}', { id: productId, after });
    demand(data.product?.id === productId && Array.isArray(data.product.metafields?.nodes) && typeof data.product.metafields.pageInfo?.hasNextPage === 'boolean', 'Metafield Shopify non riletti: riconciliare senza ricreare.');
    fields.push(...data.product.metafields.nodes);
    const info = data.product.metafields.pageInfo;
    if (!info.hasNextPage) { complete = true; break; }
    demand(info.endCursor && info.endCursor !== after, 'Rilettura metafield incompleta: riconciliare senza ricreare.');
    after = info.endCursor;
  }
  demand(complete, 'Rilettura metafield oltre il limite: riconciliare senza ricreare.');
  return plan.map(expected => {
    const matches = fields.filter(field => field.namespace === expected.namespace && field.key === expected.key);
    const actual = matches[0];
    const readableList = comparison && isEditorialList(expected.fieldKey) && actual &&
      ['json', 'list.single_line_text_field', 'multi_line_text_field'].includes(actual.type);
    const expectedValue = readableList ? encodeEditorialList(expected.value, actual.type) : expected.value;
    demand(matches.length === 1 && actual && (actual.type === expected.type || readableList) && actual.value === expectedValue,
      `Campo ${expected.fieldKey} non verificato su Shopify: riconciliare senza ricreare.`);
    return { fieldKey: expected.fieldKey, namespace: expected.namespace, key: expected.key, type: actual.type, value: actual.value, state: 'VERIFIED' as const };
  });
}