import { isManualDraftCuriosity } from './admin-v2-field-policy.ts';
import type { FieldDefinition } from './admin-v2-types.ts';
import { DRAFT_BOTANICAL_KEYS, OperationalError, demand, type ProductDraft } from './admin-operational-core.ts';
import { resolveShopifyTarget, serializeValueForShopify } from './admin-v2-field-policy.ts';
import { encodeEditorialList } from './editorial-list-codec.ts';
import { isEditorialList } from './admin-catalog-policy.ts';
import { isFieldEditable, validateValue } from './admin-v2-validation.ts';

type GraphQL = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;
export interface DraftMetafield { fieldKey: string; namespace: string; key: string; type: string; value: string }
interface AdminDraftField { key: string; text?: string; json?: unknown; number?: number }
interface AdminDraftValue { product_id: string; field_key: string; value_text: string | null; value_json: unknown; value_number: number | null }
interface Definition { ownerType?: string; namespace: string; key: string; type: { name: string }; access: { storefront: string } }

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  return value;
}

/** A successful RPC is not a successful field read-back; JSON object key order is irrelevant. */
export function verifyAdminDraftFields(productId: string, requested: AdminDraftField[], rows: AdminDraftValue[]) {
  const results = requested.map(expected => {
    const matches = rows.filter(row => row.product_id === productId && row.field_key === expected.key);
    const actual = matches[0];
    const expectedValue = expected.json ?? expected.text ?? expected.number;
    const verified = matches.length === 1 && actual && JSON.stringify(canonical(actual.value_json ?? actual.value_text ?? actual.value_number)) === JSON.stringify(canonical(expectedValue));
    return { fieldKey: expected.key, value: expectedValue, state: verified ? 'VERIFIED_ADMIN' as const : 'NOT_VERIFIED' as const };
  });
  const missing = results.filter(row => row.state !== 'VERIFIED_ADMIN');
  if (missing.length) throw new OperationalError('NEEDS_RECONCILIATION',
    'Bozza Admin da rileggere per ' + missing.map(row => row.fieldKey).join(', ') + '. Recupera la stessa richiesta.',
    { adminFieldVerification: results });
  return results;
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
      'query AdminDraftMetafieldDefinitions($after:String){metafieldDefinitions(ownerType:PRODUCT,first:100,after:$after){nodes{ownerType namespace key type{name} access{storefront}} pageInfo{hasNextPage endCursor}}}', { after });
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

type Requested = ReturnType<typeof requestedDraftFields>;
type BlockedField = {fieldKey: string; state: 'BLOCKED'; reason: string};

function collectPlan(requested: Requested, prepare: (item: Requested[number]) => DraftMetafield) {
  const fields: DraftMetafield[] = [];
  const blocked: BlockedField[] = [];
  for (const item of requested) {
    try { fields.push(prepare(item)); }
    catch (cause) {
      blocked.push({fieldKey: item.fieldKey, state: 'BLOCKED',
        reason: cause instanceof OperationalError ? cause.message : 'Valore non rappresentabile per ' + item.fieldKey + '.'});
    }
  }
  return {fields, blocked};
}

function requireCompletePlan(plan: ReturnType<typeof collectPlan>) {
  if (plan.blocked.length) throw new OperationalError('VALIDATION_ERROR', plan.blocked.map(row => row.reason).join(' '),
    {metafieldVerification: [...unreadDraftMetafields(plan.fields), ...plan.blocked]});
  return plan.fields;
}

/** Read comparison does not grant a write or demand fresh authoring acknowledgement. */
export function planDraftMetafieldsForComparison(draft: ProductDraft, registry: FieldDefinition[]): DraftMetafield[] {
  return requireCompletePlan(comparisonDraftPlan(draft, registry));
}

export function comparisonDraftPlan(draft: ProductDraft, registry: FieldDefinition[]) {
  return collectPlan(requestedDraftFields(draft), ({ fieldKey, value }) => {
    const field = registry.find(def => def.key === fieldKey);
    const target = field && resolveShopifyTarget(field);
    demand(field?.visible && field.applies_to !== 'variant' && (fieldKey !== 'curiosita' || isManualDraftCuriosity(field)) && target?.kind === 'metafield', `Mapping di confronto non disponibile per ${fieldKey}: nessuna nuova creazione.`);
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
  const definitions = await readDraftMetafieldDefinitions(graphql).catch(() => {
    throw new OperationalError('VALIDATION_ERROR', 'Definizioni Shopify incomplete. Nessun invio.',
      {metafieldVerification: requested.map(({fieldKey}) => ({fieldKey, state:'UNREAD'}))});
  });
  return requireCompletePlan(collectPlan(requested, ({ fieldKey, value }) => {
    const field = registry.find(def => def.key === fieldKey);
    const target = field && resolveShopifyTarget(field);
    demand(field?.visible && field.applies_to !== 'variant' && field.editable && (fieldKey === 'curiosita' ? isManualDraftCuriosity(field) : !field.manual_only) && target?.kind === 'metafield', `Campo ${fieldKey} senza mapping Shopify autorizzato: nessun invio.`);
    demand(isFieldEditable(field).ok && validateValue(field, value).ok, `Valore ${fieldKey} non valido nel registro corrente: nessun invio.`);
    const matches = definitions.filter(def => def.namespace === target.namespace && def.key === target.key);
    const definition = matches[0];
    demand(matches.length === 1 && definition, `Definizione Shopify assente o ambigua per ${fieldKey}: nessun invio.`);
    demand(definition.ownerType === undefined || definition.ownerType === 'PRODUCT', `Owner Shopify incompatibile per ${fieldKey}.`);
    const type = definition.type?.name;
    demand(definition.access?.storefront === 'PUBLIC_READ', `Campo ${fieldKey} non leggibile dal sito: nessun invio.`);
    const serialized = serializeValueForShopify(field, value);
    demand(typeof serialized === 'string', `Campo ${fieldKey} non rappresentabile come metafield.`);
    demand(type !== 'single_line_text_field' || (!/[\r\n]/.test(serialized) && !(typeof value === 'string' && /[\r\n]/.test(value))), `Il campo ${fieldKey} richiede una sola riga.`);
    let wire = serialized;
    if (isEditorialList(fieldKey)) {
      demand(['json', 'list.single_line_text_field', 'multi_line_text_field'].includes(type), `Tipo Shopify incompatibile per ${fieldKey}: ${type}.`);
      try { wire = encodeEditorialList(serialized, type); }
      catch { demand(false, `Valore non reversibile per ${fieldKey}: nessun invio.`); }
    } else {
      demand(type === target.valueType, `Tipo Shopify incompatibile per ${fieldKey}: atteso ${target.valueType}, trovato ${type}.`);
    }
    return { fieldKey, namespace: target.namespace, key: target.key, type, value: wire };
  }));
}

function sameWireValue(type: string, actual: string, expected: string) {
  if (actual === expected) return true;
  if (type !== 'json' && type !== 'list.single_line_text_field') return false;
  return JSON.stringify(canonical(JSON.parse(actual))) === JSON.stringify(canonical(JSON.parse(expected)));
}

export function unreadDraftMetafields(plan: DraftMetafield[]) {
  return plan.map(({fieldKey, namespace, key, type}) => ({fieldKey, namespace, key, type, state: 'UNREAD' as const}));
}

async function readProductMetafields(productId: string, graphql: GraphQL) {
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
  return fields;
}

/** Raccoglie ogni esito prima di decidere se il mapping può essere completato. */
export async function verifyDraftMetafields(productId: string, plan: DraftMetafield[], graphql: GraphQL, comparison = false, blocked: BlockedField[] = []) {
  if (!plan.length && !blocked.length) return [];
  const fields = !plan.length ? [] : await readProductMetafields(productId, graphql).catch(() => {
    throw new OperationalError('NEEDS_RECONCILIATION', 'Rilettura metafield incompleta. Recupera la stessa operazione.',
      {metafieldVerification: [...unreadDraftMetafields(plan), ...blocked]});
  });
  const results = plan.map(expected => {
    const matches = fields.filter(field => field.namespace === expected.namespace && field.key === expected.key);
    const actual = matches[0];
    const readableList = comparison && isEditorialList(expected.fieldKey) && actual &&
      ['json', 'list.single_line_text_field', 'multi_line_text_field'].includes(actual.type);
    let verified = false;
    if (matches.length === 1 && (actual.type === expected.type || readableList)) {
      try {
        const value = readableList ? encodeEditorialList(expected.value, actual.type) : expected.value;
        verified = sameWireValue(actual.type, actual.value, value);
      } catch { /* Encoding remoto incompatibile. Continua con gli altri campi. */ }
    }
    return { ...expected, type: actual?.type ?? expected.type, value: actual?.value ?? null,
      state: verified ? 'VERIFIED' as const : 'NOT_VERIFIED' as const };
  });
  if (blocked.length || results.some(row => row.state !== 'VERIFIED')) {
    const all = [...results, ...blocked];
    const summary = all.map(row => row.fieldKey + (row.state === 'VERIFIED' ? ' verificato' : ' non verificato')).join(', ');
    throw new OperationalError('NEEDS_RECONCILIATION', 'Sincronizzazione incompleta: ' + summary, { metafieldVerification: all });
  }
  return results;
}