import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { handleOperational } from '../../supabase/functions/_shared/admin-operational-service.ts';
import type { ProductDraft } from '../../supabase/functions/_shared/admin-operational-core.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const id = '40000000-0000-4000-8000-000000000001',
  actor = { userId: '00000000-0000-4000-8000-000000000001', roles: ['admin'] as ['admin'] };
function simulation(
  options: {
    timeout?: boolean;
    mappingFailure?: boolean;
    skuConflict?: boolean;
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
      return {
        productVariants: {
          nodes: options.skuConflict ? [{ sku: 'QA-001' }] : [],
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
  const keys = ['PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED', 'PRODUCT_ADMIN_OPERATIONAL_APPROVAL'];
  const prior = keys.map((k) => Deno.env.get(k));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], 'LOCAL-QA-ONLY');
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
