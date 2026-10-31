import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import type { AuthContext, FieldDefinition } from './admin-v2-types.ts';
import {
  CANONICAL_HANDLES,
  categoryDiff,
  demand,
  DRAFT_BOTANICAL_KEYS,
  escapeHtml,
  operationalAccess,
  OperationalError,
  type ProductDraft,
  UUID,
  validateDraft,
  verifyCreatedMapping,
} from './admin-operational-core.ts';
import { payloadHash, writeMode, writesEnabled } from './admin-v2-commands.ts';
import { getExactShopifyProductMapping, getFieldDefinitions } from './admin-v2-queries.ts';
import { isFieldEditable, validateValue } from './admin-v2-validation.ts';
import { shopifyAdminGraphQLAtVersion } from './shopify-admin-client.ts';

const graphql = <T>(q: string, v: Record<string, unknown> = {}) =>
  shopifyAdminGraphQLAtVersion<T>('2026-01', q, v);
export const operationalFlags = () => ({
  drafts: writesEnabled() && Deno.env.get('PRODUCT_ADMIN_DRAFTS_ENABLED') === 'true',
  shopify: Deno.env.get('PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED') === 'true',
  approval: Boolean(Deno.env.get('PRODUCT_ADMIN_OPERATIONAL_APPROVAL')?.trim()),
});
// All pages read; never turn a PostgREST page limit into a catalogue count.
async function allRows(db: SupabaseClient, table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 100000; offset += 500) {
    const { data, error } = await db.from(table).select(columns).order('id').range(
      offset,
      offset + 499,
    );
    if (error) {
      throw new OperationalError(
        'CATALOG_UNAVAILABLE',
        'Catalogo interno non disponibile: verificare schema e autorizzazioni.',
      );
    }
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if ((data ?? []).length < 500) return rows;
  }
  throw new OperationalError(
    'CATALOG_UNAVAILABLE',
    'Catalogo oltre il limite di lettura: conteggi non presentati.',
  );
}
export async function catalogCategories(db: SupabaseClient) {
  const [categories, maps, assignments, products] = await Promise.all([
    allRows(
      db,
      'product_categories',
      'id,display_name,slug,parent_id,level,is_active,visible_admin,visible_storefront',
    ),
    allRows(
      db,
      'product_category_shopify_map',
      'id,category_id,shopify_handle,shopify_collection_gid,map_status,last_checked_at',
    ),
    allRows(db, 'product_category_assignments', 'id,product_id,category_id,status'),
    allRows(db, 'products', 'id,sku,entity_type,is_active'),
  ]);
  const canonicalMaps = maps.filter((m) =>
    (CANONICAL_HANDLES as readonly unknown[]).includes(m.shopify_handle)
  );
  const categoryIds = new Set(canonicalMaps.map((m) => m.category_id));
  const families = products.filter((p) => p.entity_type !== 'variation' && p.is_active);
  const approved = assignments.filter((a) =>
    a.status === 'approved' && categoryIds.has(a.category_id)
  );
  const list = categories.filter((c) => c.visible_admin && categoryIds.has(c.id)).map((c) => ({
    ...c,
    id: String(c.id),
    is_active: c.is_active === true,
    maps: canonicalMaps.filter((m) => m.category_id === c.id),
    productCount: new Set(
      approved.filter((a) => a.category_id === c.id && families.some((p) => p.id === a.product_id))
        .map((a) => a.product_id),
    ).size,
  }));
  return {
    categories: list,
    products: families.map((p) => ({
      ...p,
      id: String(p.id),
      sku: String(p.sku),
      categoryIds: approved.filter((a) => a.product_id === p.id).map((a) => a.category_id),
    })),
    source: 'SUPABASE_INTERNAL',
    observedAt: new Date().toISOString(),
    atomicSnapshot: false,
    historicalReview: { total: 82, resolved: null, status: 'UNRECONCILED' },
    missingCanonicalHandles: CANONICAL_HANDLES.filter((h) =>
      !canonicalMaps.some((m) => m.shopify_handle === h)
    ),
    notice:
      'Conteggi interni delle assegnazioni approvate; non sono conteggi Shopify né attestazioni di pubblicazione. Lettura paginata, non snapshot transazionale.',
  };
}
function validatedFields(draft: ProductDraft, defs: FieldDefinition[]) {
  const entries: Record<string, unknown> = {
    title: draft.title,
    description: draft.description,
    seo_title: draft.seoTitle,
    seo_description: draft.seoDescription,
  };
  for (const [key, value] of Object.entries(draft.botanical)) {
    demand(!Object.hasOwn(entries, key), 'Campo botanico duplicato.');
    const def = defs.find((d) => d.key === key);
    demand(
      def && def.applies_to !== 'variant' && isFieldEditable(def).ok && !def.manual_only &&
        (DRAFT_BOTANICAL_KEYS as readonly string[]).includes(key),
      'Campo botanico non ammesso dal registro.',
    );
    entries[key] = value;
  }
  return Object.entries(entries).filter(([, v]) => v !== '').map(([key, value]) => {
    const def = defs.find((d) => d.key === key);
    demand(
      def && isFieldEditable(def).ok && validateValue(def, value).ok,
      `Valore non ammesso per ${def?.label ?? 'il campo'}.`,
    );
    return {
      key,
      ...(typeof value === 'number'
        ? { number: value }
        : typeof value === 'string'
        ? { text: value }
        : { json: value }),
    };
  });
}
const PRODUCT_FIELDS =
  `id handle status title descriptionHtml vendor tags seo { title description } metafield(namespace:"online_garden",key:"creation_id") { value } variants(first:100) { nodes { id sku price compareAtPrice selectedOptions { name value } } pageInfo { hasNextPage } }`;
interface ShopifyDraft {
  id: string;
  handle: string;
  status: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  tags: string[];
  seo: { title: string | null; description: string | null };
  metafield: { value: string } | null;
  variants: {
    nodes: { id: string; sku: string; price: string; compareAtPrice: string | null }[];
    pageInfo: { hasNextPage: boolean };
  };
}
function verifiedLinks(draft: ProductDraft, opId: string, product: ShopifyDraft) {
  demand(
    product.metafield?.value === opId && product.handle === `og-draft-${opId}` &&
      !product.variants.pageInfo.hasNextPage,
    'Identità della bozza non verificata.',
  );
  demand(
    product.title === draft.title && product.vendor === draft.vendor &&
      product.variants.nodes.every((v) =>
        draft.variants.some((x) =>
          x.sku === v.sku && Number(x.price) === Number(v.price) &&
          (x.compareAtPrice === null
            ? v.compareAtPrice === null
            : Number(x.compareAtPrice) === Number(v.compareAtPrice))
        )
      ),
    'La bozza Shopify è cambiata: riconciliazione manuale richiesta.',
  );
  return verifyCreatedMapping(draft, { ...product, variants: product.variants.nodes });
}
export async function handleOperational(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
  shopify: typeof graphql = graphql,
) {
  const action = String(p.action);
  const flags = operationalFlags();
  operationalAccess(action, auth.roles, flags, p.confirm === true);
  if (
    action === 'save_new_product' && writeMode() === 'canary' &&
    !auth.roles.some((r) => r === 'admin' || r === 'tech_admin')
  ) throw new OperationalError('FORBIDDEN', 'Salvataggio riservato al collaudo amministratori.');
  if (action === 'catalog_categories') {
    return {
      ok: true,
      ...await catalogCategories(db),
      canSaveDraft: flags.drafts &&
        auth.roles.some((r) =>
          r === 'admin' || r === 'tech_admin' || (r === 'editor' && writeMode() === 'full')
        ),
      canSendDraft: flags.shopify && flags.approval &&
        auth.roles.some((r) => r === 'admin' || r === 'tech_admin'),
      canAssign: Deno.env.get('PRODUCT_ADMIN_CATEGORIES_ENABLED') === 'true' && flags.approval &&
        auth.roles.some((r) => r === 'admin' || r === 'tech_admin'),
    };
  }
  if (action === 'preview_categories' || action === 'apply_categories') {
    demand(
      typeof p.productId === 'string' && UUID.test(p.productId) && Array.isArray(p.categoryIds) &&
        p.categoryIds.every((x) => typeof x === 'string'),
      'Prodotto o categorie non validi.',
    );
    const catalog = await catalogCategories(db);
    const product = catalog.products.find((x) => x.id === p.productId);
    demand(product, 'Prodotto non disponibile.');
    const eligible = catalog.categories.filter((c) =>
      c.is_active && c.maps.length > 0 &&
      c.maps.every((m) => m.map_status === 'verified' && m.shopify_collection_gid)
    );
    const allowed = eligible.map((c) => c.id);
    const diff = categoryDiff(product.categoryIds as string[], p.categoryIds as string[], allowed);
    const mapping = await getExactShopifyProductMapping(db, product.sku);
    if (!mapping?.shopify_product_id) {
      demand(action === 'preview_categories', 'Mapping Shopify assente.');
      return {
        ok: true,
        diff,
        executable: false,
        reason: 'Anteprima interna: mapping Shopify assente, nessuna scrittura possibile.',
      };
    }
    const read = async () => {
      const result = await shopify<
        {
          product: {
            id: string;
            collections: {
              nodes: { id: string; handle: string; ruleSet: unknown }[];
              pageInfo: { hasNextPage: boolean };
            };
          } | null;
        }
      >(
        'query CategoryMemberships($id:ID!){product(id:$id){id collections(first:250){nodes{id handle ruleSet{appliedDisjunctively}} pageInfo{hasNextPage}}}}',
        { id: mapping.shopify_product_id },
      );
      demand(
        result.product && !result.product.collections.pageInfo.hasNextPage,
        'Membership Shopify non completamente leggibili.',
      );
      return result.product.collections.nodes;
    };
    let before: Awaited<ReturnType<typeof read>>;
    try {
      before = await read();
    } catch (error) {
      if (action === 'apply_categories') throw error;
      return {
        ok: true,
        diff,
        executable: false,
        reason:
          'Anteprima interna: Shopify non disponibile per verificare le associazioni effettive.',
      };
    }
    const approvedGids = eligible.flatMap((c) =>
      c.maps.map((m) => String(m.shopify_collection_gid))
    );
    const desiredGids = [
      ...new Set(
        eligible.filter((c) => (p.categoryIds as string[]).includes(c.id)).flatMap((c) =>
          c.maps.map((m) => String(m.shopify_collection_gid))
        ),
      ),
    ].sort();
    const beforeGids = before.map((c) => c.id).sort();
    const add = desiredGids.filter((id) => !beforeGids.includes(id));
    const remove = beforeGids.filter((id) =>
      approvedGids.includes(id) && !desiredGids.includes(id)
    );
    const hash = await payloadHash({
      productId: p.productId,
      categoryIds: [...p.categoryIds].sort(),
      beforeGids,
      desiredGids,
    });
    const enabled = Deno.env.get('PRODUCT_ADMIN_CATEGORIES_ENABLED') === 'true' && flags.approval &&
      auth.roles.some((r) => r === 'admin' || r === 'tech_admin');
    if (action === 'preview_categories') {
      return {
        ok: true,
        diff,
        shopifyDiff: { add: add.length, remove: remove.length },
        expectedHash: hash,
        executable: enabled,
        reason: enabled
          ? 'Conferma esplicitamente per applicare questa proposta verificata.'
          : 'Lettura Shopify verificata; scrittura non ancora abilitata.',
      };
    }
    if (!enabled || p.confirm !== true) {
      throw new OperationalError(
        'WRITES_DISABLED',
        'Assegnazione non abilitata o conferma mancante.',
      );
    }
    demand(
      typeof p.idempotencyKey === 'string' && UUID.test(p.idempotencyKey) &&
        p.expectedHash === hash,
      'La proposta è cambiata. Rileggere e verificare nuovamente.',
    );
    // Validate each exact collection ID/handle and reject automatic collections.
    for (const id of [...add, ...remove]) {
      const r = await shopify<
        { collection: { id: string; handle: string; ruleSet: unknown } | null }
      >(
        'query AssignmentCollection($id:ID!){collection(id:$id){id handle ruleSet{appliedDisjunctively}}}',
        { id },
      );
      demand(
        r.collection && r.collection.ruleSet === null &&
          eligible.some((c) =>
            c.maps.some((m) =>
              m.shopify_collection_gid === id && m.shopify_handle === r.collection?.handle
            )
          ),
        'Collezione automatica o mapping cambiato.',
      );
    }
    const { data: operation, error: reserveError } = await db.from('admin_category_operations')
      .insert({
        actor: auth.userId,
        request_key: p.idempotencyKey,
        product_id: p.productId,
        payload_hash: hash,
        payload: { categoryIds: p.categoryIds, beforeGids, desiredGids },
      }).select('id').single();
    demand(!reserveError && operation, 'Operazione già avviata o da riconciliare: non reinviare.');
    try {
      // Re-read immediately before the first write; external Shopify edits cannot be locked by Supabase.
      demand(
        JSON.stringify((await read()).map((c) => c.id).sort()) === JSON.stringify(beforeGids),
        'Associazioni cambiate esternamente.',
      );
      for (const id of add) {
        const r = await shopify<{ collectionAddProducts: { userErrors: unknown[] } }>(
          'mutation AssignCollection($id:ID!,$products:[ID!]!){collectionAddProducts(id:$id,productIds:$products){userErrors{message}}}',
          { id, products: [mapping.shopify_product_id] },
        );
        demand(!r.collectionAddProducts.userErrors.length, 'Assegnazione Shopify rifiutata.');
      }
      for (const id of remove) {
        const r = await shopify<{ collectionRemoveProducts: { userErrors: unknown[] } }>(
          'mutation UnassignCollection($id:ID!,$products:[ID!]!){collectionRemoveProducts(id:$id,productIds:$products){userErrors{message}}}',
          { id, products: [mapping.shopify_product_id] },
        );
        demand(
          !r.collectionRemoveProducts.userErrors.length,
          'Rimozione associazione Shopify rifiutata.',
        );
      }
      const after = (await read()).map((c) => c.id).sort();
      const expected = [...new Set([...beforeGids.filter((id) => !remove.includes(id)), ...add])]
        .sort();
      demand(
        JSON.stringify(after) === JSON.stringify(expected),
        'Stato Shopify non ancora verificato: riconciliazione necessaria.',
      );
      const { error: finishError } = await db.rpc('admin_finish_categories', {
        p_actor: auth.userId,
        p_id: operation.id,
        p_allowed: allowed,
      });
      demand(!finishError, 'Assegnazioni Shopify verificate, catalogo interno da riconciliare.');
      return {
        ok: true,
        state: 'VERIFIED',
        reason: 'Associazioni Shopify rilette e catalogo interno aggiornato.',
      };
    } catch {
      await db.from('admin_category_operations').update({ state: 'NEEDS_RECONCILIATION' }).eq(
        'id',
        operation.id,
      );
      throw new OperationalError(
        'NEEDS_RECONCILIATION',
        'Operazione registrata: serve riconciliazione tecnica, senza ripetere le scritture.',
      );
    }
  }
  if (action === 'preview_new_product' || action === 'save_new_product') {
    const draft = validateDraft(p.draft);
    const defs = await getFieldDefinitions(db);
    const fields = validatedFields(draft, defs);
    const catalog = await catalogCategories(db);
    demand(
      draft.categoryIds.every((id) => catalog.categories.some((c) => c.id === id && c.is_active)),
      'Categoria non disponibile.',
    );
    const skus = [draft.sku, ...draft.variants.map((v) => v.sku)].map((s) => s.toLowerCase());
    // Retry is reconciled by the atomic RPC, before its SKU unique constraints.
    if (action === 'preview_new_product') {
      const { data, error } = await db.from('products').select('sku').in('sku_norm', [
        ...new Set(skus),
      ]);
      if (error) throw new OperationalError('CATALOG_UNAVAILABLE', 'Verifica SKU non disponibile.');
      demand(!data?.length, 'SKU già presente nel catalogo interno.');
      return {
        ok: true,
        draft,
        canSave: flags.drafts,
        shopifySkuVerified: false,
        warnings: [
          'Unicità Shopify verificata solo prima dell’invio autorizzato.',
          'Inventario e pubblicazione non vengono modificati.',
        ],
      };
    }
    demand(
      typeof p.idempotencyKey === 'string' && UUID.test(p.idempotencyKey) && p.confirm === true,
      'Conferma o identificativo richiesta mancante.',
    );
    const { data, error } = await db.rpc('admin_save_new_draft', {
      p_actor: auth.userId,
      p_key: p.idempotencyKey,
      p_hash: await payloadHash({ ...draft }),
      p_payload: draft,
      p_fields: fields,
    });
    if (error) {
      throw new OperationalError(
        error.code === '23505' ? 'SKU_CONFLICT' : 'SAVE_FAILED',
        'Bozza non salvata: verificare SKU e riprovare con la stessa richiesta.',
      );
    }
    return { ok: true, result: data };
  }
  if (action === 'get_product_operations') {
    demand(typeof p.productId === 'string' && UUID.test(p.productId), 'Prodotto non valido.');
    const { data, error } = await db.from('admin_product_operations').select(
      'id,product_id,state,created_at,updated_at,admin_operation_events(state,created_at)',
    ).eq('product_id', p.productId).order('created_at', { ascending: false });
    if (error) {
      throw new OperationalError('CATALOG_UNAVAILABLE', 'Storico operazioni non disponibile.');
    }
    return {
      ok: true,
      operations: data,
      canSendDraft: flags.shopify && flags.approval &&
        auth.roles.some((r) => r === 'admin' || r === 'tech_admin'),
    };
  }
  demand(typeof p.operationId === 'string' && UUID.test(p.operationId), 'Operazione non valida.');
  const { data: op, error } = await db.from('admin_product_operations').select('*').eq(
    'id',
    p.operationId,
  ).single();
  if (error || !op) throw new OperationalError('NOT_FOUND', 'Operazione non disponibile.');
  const draft = validateDraft(op.payload);
  if (op.state === 'VERIFIED_DRAFT') {
    return { ok: true, result: { state: op.state, productId: op.product_id } };
  }
  let product: ShopifyDraft;
  if (action === 'recover_shopify_draft') {
    demand(
      ['IN_FLIGHT', 'NEEDS_RECONCILIATION'].includes(op.state),
      'Nessun invio da riconciliare.',
    );
    // READ ONLY Shopify. Absence never authorizes another create.
    const found = await shopify<{ products: { nodes: ShopifyDraft[] } }>(
      `query RecoverDraft($query:String!){products(first:2,query:$query){nodes{${PRODUCT_FIELDS}}}}`,
      { query: `handle:og-draft-${op.id}` },
    );
    demand(
      found.products.nodes.length === 1,
      'Bozza non individuata univocamente: attendere o verificare manualmente, senza reinviare.',
    );
    product = found.products.nodes[0];
  } else {
    demand(
      action === 'create_shopify_draft' && op.state === 'LOCAL_DRAFT',
      'Invio già iniziato: usare Recupera stato, senza creare un altro prodotto.',
    );
    // The saved request is immutable; refuse later editorial edits rather than silently overwriting them.
    const { data: values, error: valuesError } = await db.from('product_current_values').select(
      'updated_at',
    ).eq('product_id', op.product_id).gt('updated_at', op.created_at);
    demand(
      !valuesError && !values?.length,
      'Contenuti modificati dopo il salvataggio: revisione tecnica necessaria prima dell’invio.',
    );
    const shop = await shopify<{ shop: { currencyCode: string } }>(
      'query DraftCurrency{shop{currencyCode}}',
    );
    demand(shop.shop.currencyCode === draft.currency, 'Valuta diversa dalla valuta base Shopify.');
    for (const variant of draft.variants) {
      const found = await shopify<
        { productVariants: { nodes: { sku: string }[]; pageInfo: { hasNextPage: boolean } } }
      >(
        'query DraftSku($query:String!){productVariants(first:100,query:$query){nodes{sku} pageInfo{hasNextPage}}}',
        { query: `sku:"${variant.sku}"` },
      );
      demand(
        !found.productVariants.pageInfo.hasNextPage &&
          !found.productVariants.nodes.some((v) =>
            v.sku.toLowerCase() === variant.sku.toLowerCase()
          ),
        'SKU già presente o ricerca Shopify non univoca.',
      );
    }
    const catalog = await catalogCategories(db);
    const selected = catalog.categories.filter((c) => draft.categoryIds.includes(String(c.id)));
    demand(
      selected.length === draft.categoryIds.length &&
        selected.every((c) =>
          c.is_active && c.maps.length > 0 &&
          c.maps.every((m) => m.map_status === 'verified' && m.shopify_collection_gid)
        ),
      'Mapping categorie non verificato.',
    );
    const collections = [
      ...new Set(selected.flatMap((c) => c.maps.map((m) => m.shopify_collection_gid))),
    ];
    // Verify manual collections before allowing a mutation.
    for (const id of collections) {
      const read = await shopify<{ collection: { id: string; ruleSet: unknown } | null }>(
        'query DraftCollection($id:ID!){collection(id:$id){id ruleSet{appliedDisjunctively}}}',
        { id },
      );
      demand(
        read.collection && read.collection.ruleSet === null,
        'Collezione mancante o automatica: assegnazione manuale non consentita.',
      );
    }
    const { data: claimed, error: claimError } = await db.rpc('admin_claim_draft', {
      p_actor: auth.userId,
      p_id: op.id,
    });
    demand(!claimError && claimed === true, 'Invio già iniziato: recuperare lo stato.');
    const input = {
      title: draft.title,
      status: 'DRAFT',
      handle: `og-draft-${op.id}`,
      descriptionHtml: escapeHtml(draft.description).replace(/\n/g, '<br>'),
      vendor: draft.vendor,
      tags: draft.tags,
      seo: { title: draft.seoTitle, description: draft.seoDescription },
      collections,
      productOptions: [{
        name: 'Formato',
        position: 1,
        values: draft.variants.map((v) => ({ name: v.option })),
      }],
      variants: draft.variants.map((v) => ({
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        optionValues: [{ optionName: 'Formato', name: v.option }],
      })),
      files: draft.images.map((i) => ({ originalSource: i.url, alt: i.alt, contentType: 'IMAGE' })),
      metafields: [{
        namespace: 'online_garden',
        key: 'creation_id',
        type: 'single_line_text_field',
        value: op.id,
      }],
    };
    try {
      const created = await shopify<
        { productSet: { product: ShopifyDraft | null; userErrors: { message: string }[] } }
      >(
        `mutation AdminCreateDraft($input:ProductSetInput!){productSet(input:$input,synchronous:true){product{${PRODUCT_FIELDS}} userErrors{message}}}`,
        { input },
      );
      demand(
        created.productSet.product && !created.productSet.userErrors.length,
        'Shopify non ha confermato la bozza: recuperare lo stato.',
      );
      const read = await shopify<{ product: ShopifyDraft | null }>(
        `query VerifyDraft($id:ID!){product(id:$id){${PRODUCT_FIELDS}}}`,
        { id: created.productSet.product.id },
      );
      demand(read.product, 'Rilettura Shopify non disponibile.');
      product = read.product;
    } catch {
      await db.from('admin_product_operations').update({ state: 'NEEDS_RECONCILIATION' }).eq(
        'id',
        op.id,
      ).eq('state', 'IN_FLIGHT');
      throw new OperationalError(
        'NEEDS_RECONCILIATION',
        'Esito Shopify incerto. Usare Recupera stato; non creare una nuova richiesta.',
      );
    }
  }
  const links = verifiedLinks(draft, op.id, product);
  const { data: result, error: completeError } = await db.rpc('admin_complete_draft', {
    p_actor: auth.userId,
    p_id: op.id,
    p_gid: product.id,
    p_links: links,
  });
  if (completeError) {
    throw new OperationalError(
      'NEEDS_RECONCILIATION',
      'Bozza Shopify individuata; mapping interno da recuperare con la stessa operazione.',
    );
  }
  return { ok: true, result };
}
