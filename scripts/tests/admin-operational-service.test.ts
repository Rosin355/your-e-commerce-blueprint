import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { handleOperational } from '../../supabase/functions/_shared/admin-operational-service.ts';
import { OperationalError, type ProductDraft } from '../../supabase/functions/_shared/admin-operational-core.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const id = '40000000-0000-4000-8000-000000000001',
  actor = { userId: '00000000-0000-4000-8000-000000000001', roles: ['admin'] as ['admin'] };
function simulation(
  options: {
    timeout?: boolean;
    mappingFailure?: boolean;
    skuConflict?: boolean | 'parent';
    multiVariant?: boolean;
    currency?: string;
  } = {},
) {
  const draft: ProductDraft = {
    title: 'Simulazione',
    sku: 'QA-001',
    description: 'Test',
    currency: 'EUR',
    vendor: '',
    tags: [],
    categoryIds: [],
    images: [],
    seoTitle: '',
    seoDescription: '',
    botanical: {},
    variants: [{ sku: 'QA-001', price: '12.00', compareAtPrice: null, option: 'Unico' }],
  };
  if (options.multiVariant) {
    draft.sku = 'QA-PARENT';
    draft.variants.push({ sku: 'QA-002', price: '13.00', compareAtPrice: null, option: 'Altro' });
  }
  const op = {
    id,
    product_id: '30000000-0000-4000-8000-000000000001',
    payload: draft,
    state: 'LOCAL_DRAFT',
    created_at: '2026-01-01T00:00:00Z',
  };
  const product = {
    id: 'gid://shopify/Product/1',
    status: 'DRAFT',
    handle: `og-draft-${id}`,
    title: draft.title,
    vendor: '',
    metafield: { value: id },
    variants: {
      nodes: [{
        id: 'gid://shopify/ProductVariant/2',
        sku: 'QA-001',
        price: '12.00',
        compareAtPrice: null,
      }],
      pageInfo: { hasNextPage: false },
    },
  };
  let mutations = 0;
  let completeCalls = 0;
  const db = {
    from(table: string) {
      let update: Record<string, unknown> | undefined;
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        gt() {
          return chain;
        },
        order() {
          return chain;
        },
        range() {
          return Promise.resolve({ data: [], error: null });
        },
        update(v: Record<string, unknown>) {
          update = v;
          return chain;
        },
        single() {
          return Promise.resolve({ data: op, error: null });
        },
        then(resolve: (x: unknown) => void) {
          if (update) Object.assign(op, update);
          resolve({ data: table === 'product_current_values' ? [] : op, error: null });
        },
      };
      return chain;
    },
    rpc(name: string) {
      if (name === 'admin_claim_draft') {
        const claimed = op.state === 'LOCAL_DRAFT';
        if (claimed) op.state = 'IN_FLIGHT';
        return Promise.resolve({ data: claimed, error: null });
      }
      if (name === 'admin_complete_draft') {
        completeCalls++;
        if (options.mappingFailure && completeCalls === 1) {
          return Promise.resolve({ data: null, error: { code: 'SIMULATED_DB_FAILURE' } });
        }
        op.state = 'VERIFIED_DRAFT';
        return Promise.resolve({ data: { state: op.state }, error: null });
      }
      throw Error(name);
    },
  } as unknown as SupabaseClient;
  const shopify = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    if (query.includes('DraftCurrency')) {
      return { shop: { currencyCode: options.currency ?? 'EUR' } } as T;
    }
    if (query.includes('DraftSku')) {
      const requestedSku = String(variables.query).match(/sku:"([^"]+)"/)?.[1];
      const conflict = options.skuConflict === true ||
        (options.skuConflict === 'parent' && requestedSku === 'QA-PARENT');
      return {
        productVariants: {
          nodes: conflict ? [{ sku: requestedSku }] : [],
          pageInfo: { hasNextPage: false },
        },
      } as T;
    }
    if (query.includes('mutation AdminCreateDraft')) {
      mutations++;
      assertEquals((variables.input as { status: string }).status, 'DRAFT');
      if (options.timeout) throw Error('simulated timeout after remote commit');
      return { productSet: { product, userErrors: [] } } as T;
    }
    if (query.includes('query VerifyDraft')) return { product } as T;
    if (query.includes('query RecoverDraft')) return { products: { nodes: [product] } } as T;
    throw Error('Unexpected simulated GraphQL operation');
  };
  return {
    db,
    shopify,
    op,
    get mutations() {
      return mutations;
    },
  };
}
async function withFlags(run: () => Promise<void>) {
  const keys = ['PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED', 'PRODUCT_ADMIN_OPERATIONAL_APPROVAL', 'PRODUCT_ADMIN_WRITES_ENABLED'];
  const prior = keys.map((k) => Deno.env.get(k));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], JSON.stringify({
    action: 'create_shopify_draft',
    target: id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }));
  Deno.env.set(keys[2], 'true');
  try {
    await run();
  } finally {
    keys.forEach((k, i) =>
      prior[i] === undefined ? Deno.env.delete(k) : Deno.env.set(k, prior[i]!)
    );
  }
}
Deno.test('creazione simulata: claim, unica mutation DRAFT, rilettura e mapping', () =>
  withFlags(async () => {
    const s = simulation();
    await handleOperational(s.db, actor, {
      action: 'create_shopify_draft',
      operationId: id,
      confirm: true,
    }, s.shopify);
    assertEquals(s.mutations, 1);
    assertEquals(s.op.state, 'VERIFIED_DRAFT');
    await handleOperational(s.db, actor, {
      action: 'create_shopify_draft',
      operationId: id,
      confirm: true,
    }, s.shopify);
    assertEquals(s.mutations, 1);
  }));
Deno.test('richiesta costruita manualmente con approvazione per un’altra bozza non crea prodotti', () =>
  withFlags(async () => {
    const s = simulation();
    Deno.env.set('PRODUCT_ADMIN_OPERATIONAL_APPROVAL', JSON.stringify({
      action: 'create_shopify_draft',
      target: '40000000-0000-4000-8000-000000000002',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }));
    await assertRejects(() => handleOperational(s.db, actor, {
      action: 'create_shopify_draft', operationId: id, confirm: true,
    }, s.shopify));
    assertEquals(s.mutations, 0);
    assertEquals(s.op.state, 'LOCAL_DRAFT');
  }));
Deno.test('interruttore generale OFF blocca invio anche con flag specifico e approvazione', () =>
  withFlags(async () => {
    const s = simulation();
    Deno.env.set('PRODUCT_ADMIN_WRITES_ENABLED', 'false');
    await assertRejects(() => handleOperational(s.db, actor, {
      action: 'create_shopify_draft', operationId: id, confirm: true,
    }, s.shopify));
    assertEquals(s.mutations, 0);
    assertEquals(s.op.state, 'LOCAL_DRAFT');
  }));
Deno.test('interruttore generale OFF blocca anche il recupero che scriverebbe il mapping', () =>
  withFlags(async () => {
    const s = simulation();
    s.op.state = 'NEEDS_RECONCILIATION';
    Deno.env.set('PRODUCT_ADMIN_WRITES_ENABLED', 'false');
    const error = await assertRejects(() => handleOperational(s.db, actor, {
      action: 'recover_shopify_draft', operationId: id,
    }, s.shopify), OperationalError, 'Recupero della bozza non abilitato.');
    assertEquals(error.code, 'WRITES_DISABLED');
    assertEquals(s.op.state, 'NEEDS_RECONCILIATION');
    assertEquals(s.mutations, 0);
  }));
Deno.test('timeout dopo creazione Shopify: retry non ricrea; recupero solo query', () =>
  withFlags(async () => {
    const s = simulation({ timeout: true });
    await assertRejects(() =>
      handleOperational(s.db, actor, {
        action: 'create_shopify_draft',
        operationId: id,
        confirm: true,
      }, s.shopify)
    );
    assertEquals(s.op.state, 'NEEDS_RECONCILIATION');
    await assertRejects(() =>
      handleOperational(s.db, actor, {
        action: 'create_shopify_draft',
        operationId: id,
        confirm: true,
      }, s.shopify)
    );
    await handleOperational(
      s.db,
      actor,
      { action: 'recover_shopify_draft', operationId: id },
      s.shopify,
    );
    assertEquals(s.mutations, 1);
    assertEquals(s.op.state, 'VERIFIED_DRAFT');
  }));
Deno.test('Shopify riuscito e mapping DB fallito: recupero idempotente senza seconda mutation', () =>
  withFlags(async () => {
    const s = simulation({ mappingFailure: true });
    await assertRejects(() =>
      handleOperational(s.db, actor, {
        action: 'create_shopify_draft',
        operationId: id,
        confirm: true,
      }, s.shopify)
    );
    await handleOperational(
      s.db,
      actor,
      { action: 'recover_shopify_draft', operationId: id },
      s.shopify,
    );
    assertEquals(s.mutations, 1);
    assertEquals(s.op.state, 'VERIFIED_DRAFT');
  }));
Deno.test('SKU privato già presente blocca prima della mutation', () =>
  withFlags(async () => {
    const s = simulation({ skuConflict: true });
    await assertRejects(() =>
      handleOperational(s.db, actor, {
        action: 'create_shopify_draft',
        operationId: id,
        confirm: true,
      }, s.shopify)
    );
    assertEquals(s.mutations, 0);
  }));
Deno.test('SKU famiglia di prodotto variabile controllato anche se distinto dalle varianti', () =>
  withFlags(async () => {
    const s = simulation({ multiVariant: true, skuConflict: 'parent' });
    await assertRejects(() => handleOperational(s.db, actor, {
      action: 'create_shopify_draft', operationId: id, confirm: true,
    }, s.shopify));
    assertEquals(s.mutations, 0);
  }));
Deno.test('valuta errata blocca prima della mutation', () =>
  withFlags(async () => {
    const s = simulation({ currency: 'USD' });
    await assertRejects(() =>
      handleOperational(s.db, actor, {
        action: 'create_shopify_draft',
        operationId: id,
        confirm: true,
      }, s.shopify)
    );
    assertEquals(s.mutations, 0);
  }));
Deno.test('drift categorie: anteprima non eseguibile e richiesta manuale non rimuove collezioni', async () => {
  const productId = '30000000-0000-4000-8000-000000000001';
  const categoryId = '20000000-0000-4000-8000-000000000001';
  const collectionId = 'gid://shopify/Collection/1';
  const rows: Record<string, Record<string, unknown>[]> = {
    product_categories: [{ id: categoryId, display_name: 'QA', slug: 'qa', is_active: true,
      visible_admin: true, visible_storefront: true }],
    product_category_shopify_map: [{ id: '50000000-0000-4000-8000-000000000001',
      category_id: categoryId, shopify_handle: 'piante-da-esterno',
      shopify_collection_gid: collectionId, map_status: 'verified' }],
    product_category_assignments: [],
    products: [{ id: productId, sku: 'QA-001', entity_type: 'simple', is_active: true }],
  };
  const db = { from(table: string) {
    const chain = {
      select() { return chain; }, order() { return chain; }, eq() { return chain; },
      range() { return Promise.resolve({ data: rows[table] ?? [], error: null }); },
      maybeSingle() { return Promise.resolve({ data: table === 'product_sync_csv_products'
        ? { shopify_product_id: 'gid://shopify/Product/1' }
        : table === 'products' ? { id: productId } : null, error: null }); },
    };
    return chain;
  } } as unknown as SupabaseClient;
  let mutations = 0;
  const shopify = async <T>(query: string): Promise<T> => {
    if (query.includes('mutation')) mutations++;
    return { product: { id: 'gid://shopify/Product/1', collections: {
      nodes: [{ id: collectionId, handle: 'piante-da-esterno', ruleSet: null }],
      pageInfo: { hasNextPage: false },
    } } } as T;
  };
  const preview = await handleOperational(db, actor, {
    action: 'preview_categories', productId, categoryIds: [],
  }, shopify) as { executable: boolean };
  assertEquals(preview.executable, false);
  await assertRejects(() => handleOperational(db, actor, {
    action: 'apply_categories', productId, categoryIds: [], confirm: true,
    expectedHash: 'forged', idempotencyKey: id,
  }, shopify));
  assertEquals(mutations, 0);
  rows.product_category_assignments.push({ id: '60000000-0000-4000-8000-000000000001',
    product_id: productId, category_id: categoryId, status: 'approved' });
  const aligned = await handleOperational(db, actor, {
    action: 'preview_categories', productId, categoryIds: [],
  }, shopify) as { expectedHash: string };
  const keys = ['PRODUCT_ADMIN_WRITES_ENABLED', 'PRODUCT_ADMIN_CATEGORIES_ENABLED',
    'PRODUCT_ADMIN_OPERATIONAL_APPROVAL'];
  const prior = keys.map((key) => Deno.env.get(key));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], 'true');
  Deno.env.set(keys[2], JSON.stringify({ action: 'apply_categories',
    target: aligned.expectedHash === 'a'.repeat(64) ? 'b'.repeat(64) : 'a'.repeat(64),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }));
  try {
    await assertRejects(() => handleOperational(db, actor, {
      action: 'apply_categories', productId, categoryIds: [], confirm: true,
      expectedHash: aligned.expectedHash, idempotencyKey: id,
    }, shopify));
    assertEquals(mutations, 0);
  } finally {
    keys.forEach((key, index) => prior[index] === undefined
      ? Deno.env.delete(key) : Deno.env.set(key, prior[index]!));
  }
});
Deno.test('rimozione collezione: finalizzazione DB solo dopo job Shopify completato e rilettura', async () => {
  const productId = '30000000-0000-4000-8000-000000000001';
  const categoryId = '20000000-0000-4000-8000-000000000001';
  const collectionId = 'gid://shopify/Collection/1';
  const rows: Record<string, Record<string, unknown>[]> = {
    product_categories: [{ id: categoryId, visible_admin: true, is_active: true }],
    product_category_shopify_map: [{ id: '50000000-0000-4000-8000-000000000001',
      category_id: categoryId, shopify_handle: 'piante-da-esterno',
      shopify_collection_gid: collectionId, map_status: 'verified' }],
    product_category_assignments: [{ id: '60000000-0000-4000-8000-000000000001',
      product_id: productId, category_id: categoryId, status: 'approved' }],
    products: [{ id: productId, sku: 'QA-001', entity_type: 'simple', is_active: true }],
  };
  let complete = 0;
  const db = { from(table: string) {
    const chain = {
      select() { return chain; }, order() { return chain; }, eq() { return chain; },
      insert() { return chain; }, update() { return chain; },
      range() { return Promise.resolve({ data: rows[table] ?? [], error: null }); },
      maybeSingle() { return Promise.resolve({ data: table === 'product_sync_csv_products'
        ? { shopify_product_id: 'gid://shopify/Product/1' }
        : table === 'products' ? { id: productId } : null, error: null }); },
      single() { return Promise.resolve({ data: { id }, error: null }); },
      then(resolve: (value: unknown) => void) { resolve({ error: null }); },
    };
    return chain;
  }, rpc(name: string) {
    assertEquals(name, 'admin_finish_categories');
    complete++;
    return Promise.resolve({ error: null });
  } } as unknown as SupabaseClient;
  let member = true;
  let mutations = 0;
  const shopify = async <T>(query: string): Promise<T> => {
    if (query.includes('CategoryMemberships')) return { product: { id: 'gid://shopify/Product/1',
      collections: { nodes: member ? [{ id: collectionId, handle: 'piante-da-esterno', ruleSet: null }] : [],
        pageInfo: { hasNextPage: false } } } } as T;
    if (query.includes('AssignmentCollection')) return { collection: {
      id: collectionId, handle: 'piante-da-esterno', ruleSet: null } } as T;
    if (query.includes('UnassignCollection')) {
      mutations++;
      return { collectionRemoveProducts: { job: { id: 'gid://shopify/Job/1', done: false },
        userErrors: [] } } as T;
    }
    if (query.includes('RemovalJob')) {
      assertEquals(complete, 0);
      member = false;
      return { job: { id: 'gid://shopify/Job/1', done: true } } as T;
    }
    throw Error('Unexpected operation');
  };
  const preview = await handleOperational(db, actor, {
    action: 'preview_categories', productId, categoryIds: [],
  }, shopify) as { expectedHash: string };
  const keys = ['PRODUCT_ADMIN_WRITES_ENABLED', 'PRODUCT_ADMIN_CATEGORIES_ENABLED',
    'PRODUCT_ADMIN_OPERATIONAL_APPROVAL'];
  const prior = keys.map((key) => Deno.env.get(key));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], 'true');
  Deno.env.set(keys[2], JSON.stringify({ action: 'apply_categories',
    target: preview.expectedHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }));
  try {
    const result = await handleOperational(db, actor, {
      action: 'apply_categories', productId, categoryIds: [], confirm: true,
      expectedHash: preview.expectedHash, idempotencyKey: id,
    }, shopify) as { state: string };
    assertEquals(result.state, 'VERIFIED');
    assertEquals(mutations, 1);
    assertEquals(complete, 1);
  } finally {
    keys.forEach((key, index) => prior[index] === undefined
      ? Deno.env.delete(key) : Deno.env.set(key, prior[index]!));
  }
});
