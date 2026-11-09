import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { parseCanaryScope, type CanaryScope } from '../../supabase/functions/_shared/admin-canary-policy.ts';

const actor = '10000000-0000-4000-8000-000000000001';
const productId = '20000000-0000-4000-8000-000000000001';
const requestKey = '30000000-0000-4000-8000-000000000001';
const operationId = '40000000-0000-4000-8000-000000000001';
const scope = (): CanaryScope => ({
  projectRef: 'iekwvvihjwghosqdxrdi', approvalRef: 'SYNTHETIC-CHANGE', actorId: actor,
  sku: 'QA-DRAFT-ONLY', variantSkus: ['QA-DRAFT-ONLY'], requestKey, productId,
  shopifyProductId: 'gid://shopify/Product/123',
  actions: ['update_field', 'save_new_product', 'create_shopify_draft', 'recover_shopify_draft'],
  fieldKeys: ['title'], expiresAt: new Date(Date.now() + 3600000).toISOString(),
});
const draft = { title: 'Bozza sintetica', sku: 'QA-DRAFT-ONLY', description: 'Fixture', currency: 'EUR', vendor: '',
  tags: [], categoryIds: [], images: [], seoTitle: '', seoDescription: '', botanical: {},
  variants: [{ sku: 'QA-DRAFT-ONLY', price: '10.00', compareAtPrice: null, option: 'Unico' }] };

// Execute the real HTTP entrypoint and local module graph. All I/O is synthetic and closed.
function load(options: { scope?: unknown; status?: string; sku?: string; role?: string; master?: boolean; mapping?: string; opKey?: string; endpoint?: string } = {}) {
  let handler!: (request: Request) => Promise<Response>;
  const calls = { rpc: 0, shopifyMutations: 0, statusReads: 0, events: 0 };
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://iekwvvihjwghosqdxrdi.supabase.co', PRODUCT_ADMIN_WRITE_MODE: 'canary',
    PRODUCT_ADMIN_WRITES_ENABLED: String(options.master ?? true), PRODUCT_ADMIN_DRAFTS_ENABLED: 'true',
    PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED: 'true', PRODUCT_ADMIN_CANARY_SCOPE: JSON.stringify(options.scope === undefined ? scope() : options.scope),
    PRODUCT_ADMIN_OPERATIONAL_APPROVAL: JSON.stringify({ action: 'create_shopify_draft', target: operationId, expiresAt: scope().expiresAt }),
  };
  const product = { id: productId, sku: options.sku ?? 'QA-DRAFT-ONLY', entity_type: 'simple', is_active: true };
  const definition = { key: 'title', label: 'Titolo', field_group: 'main', data_type: 'text', editor_type: 'text',
    visible: true, editable: true, manual_only: false, applies_to: 'both', validation_rules: {}, ai_allowed: false };
  const db = {
    from(table: string) {
      const data = table === 'products' ? product : table === 'product_field_definitions' ? [definition] :
        table === 'product_current_values' ? [{ product_id: productId, field_key: 'title', value_text: 'Prima', version: 1, review_status: 'approved' }] :
        table === 'product_sync_csv_products' ? { sku: product.sku, shopify_product_id: options.mapping ?? 'gid://shopify/Product/123' } :
        table === 'admin_product_operations' ? { id: operationId, actor, request_key: options.opKey ?? requestKey, product_id: productId, state: 'LOCAL_DRAFT', payload: draft } : null;
      const q = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q, gt: () => q,
        maybeSingle: async () => ({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }),
        single: async () => ({ data, error: null }),
        then: (fn: (v: unknown) => void) => Promise.resolve({ data, error: null }).then(fn),
      };
      return q;
    },
    async rpc(name: string) { assert.equal(name, 'admin_update_product_field'); calls.rpc++; calls.events++;
      return { data: { ok: true, code: 'APPLIED', version: 2 }, error: null }; },
  };
  const cache = new Map<string, Record<string, unknown>>();
  function module(file: string): Record<string, unknown> {
    if (cache.has(file)) return cache.get(file)!;
    const exports = {}; cache.set(file, exports);
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = (id: string): unknown => {
      if (id === 'npm:@supabase/supabase-js@2/cors') return { corsHeaders: {} };
      if (id.endsWith('/admin-v2-auth.ts')) return { authenticate: async () => ({ userId: actor, roles: [options.role ?? 'admin'] }), serviceClient: () => db, AuthError: class extends Error {} };
      if (id.endsWith('/shopify-admin-client.ts')) {
        const graphql = async (query: string) => {
          if (query.includes('mutation')) { calls.shopifyMutations++; throw Error('Unexpected external write'); }
          calls.statusReads++;
          return { product: { id: 'gid://shopify/Product/123', status: options.status ?? 'DRAFT' } };
        };
        return { shopifyAdminGraphQL: graphql, shopifyAdminGraphQLAtVersion: (_version: string, query: string) => graphql(query) };
      }
      if (!id.startsWith('.')) throw Error(`Unexpected dependency ${id}`);
      return module(resolve(dirname(file), id));
    };
    vm.runInNewContext(compiled, { exports, require, Request, Response, URL, TextEncoder, crypto,
      console: { log() {}, error() {} }, setTimeout, Deno: { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } } }, { filename: file });
    return exports;
  }
  module(resolve('supabase/functions/' + (options.endpoint ?? 'product-admin-api') + '/index.ts'));
  const request = (body: Record<string, unknown>) => handler(new Request('https://fixture.invalid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { calls, request };
}
const edit = { action: 'update_field', productId, fieldKey: 'title', value: 'Dopo', expectedVersion: 1, idempotencyKey: requestKey };

test('canary parser rejects missing, malformed, expired, broad and foreign-project approvals', () => {
  for (const value of [null, {}, { ...scope(), actions: ['publish'] }, { ...scope(), expiresAt: '2020-01-01T00:00:00Z' },
    { ...scope(), projectRef: 'another-project' }, { ...scope(), wildcard: '*' }, { ...scope(), variantSkus: ['A', 'a'] }]) {
    assert.equal(parseCanaryScope(JSON.stringify(value)), null);
  }
  assert.ok(parseCanaryScope(JSON.stringify(scope())));
});
for (const [label, options] of Object.entries({
  'approval absent': { scope: null }, 'other SKU': { sku: 'COMMERCIAL-SKU' }, 'commercial product ACTIVE': { status: 'ACTIVE' },
  'unknown Shopify status': { status: 'ARCHIVED' }, 'mapping conflict': { mapping: 'gid://shopify/Product/999' },
  'other actor': { scope: { ...scope(), actorId: productId } }, 'editor role': { role: 'editor' },
  'wrong internal product': { scope: { ...scope(), productId: actor } },
  'unapproved field': { scope: { ...scope(), fieldKeys: ['description'] } },
  'unapproved action': { scope: { ...scope(), actions: ['save_new_product'] } },
})) {
  test(`real HTTP handler rejects ${label} before every write`, async () => {
    const s = load(options); const res = await s.request(edit);
    assert.equal(res.status, 403); assert.equal((await res.json()).error.code, 'FORBIDDEN');
    assert.equal(s.calls.rpc, 0); assert.equal(s.calls.shopifyMutations, 0);
  });
}
test('approved exact DRAFT reaches the existing atomic field command and audit once', async () => {
  const s = load(); const res = await s.request(edit);
  assert.equal(res.status, 200); assert.equal(s.calls.rpc, 1); assert.equal(s.calls.events, 1);
  assert.equal(s.calls.statusReads, 1); assert.equal(s.calls.shopifyMutations, 0);
});
test('master OFF prevents the approved field command', async () => {
  const s = load({ master: false }); const res = await s.request(edit);
  assert.equal(res.status, 503); assert.equal(s.calls.rpc, 0);
});
test('save rejects a different parent, variant or idempotency request before DB writes', async () => {
  for (const body of [
    { draft: { ...draft, sku: 'COMMERCIAL' }, idempotencyKey: requestKey },
    { draft: { ...draft, variants: [{ ...draft.variants[0], sku: 'COMMERCIAL' }] }, idempotencyKey: requestKey },
    { draft, idempotencyKey: actor },
  ]) {
    const s = load(); const response = await s.request({ action: 'save_new_product', ...body, confirm: true });
    assert.ok(response.status >= 400); assert.equal(s.calls.rpc, 0); assert.equal(s.calls.shopifyMutations, 0);
  }
});
test('create and recovery reject an operation from another approved request', async () => {
  for (const action of ['create_shopify_draft', 'recover_shopify_draft']) {
    const s = load({ opKey: actor }); const response = await s.request({ action, operationId, confirm: true });
    assert.equal(response.status, 403); assert.equal(s.calls.rpc, 0); assert.equal(s.calls.shopifyMutations, 0);
  }
});
test('AI write route stays closed during the Level B canary', async () => {
  const s = load({ endpoint: 'product-admin-ai' });
  const response = await s.request({ action: 'generate_ai_suggestion', productId, fieldKey: 'title', baseVersion: 1 });
  assert.equal(response.status, 503); assert.equal(s.calls.rpc, 0);
});


test('runtime context exposes only capability booleans and version; master OFF keeps operations closed', async () => {
  const s = load({ master: false }); const response = await s.request({ action: 'get_admin_context' });
  assert.equal(response.status, 200);
  const context = await response.json();
  assert.equal(context.backendVersion, 'admin-operational-b-20261109-r1');
  assert.equal(context.canWrite, false);
  assert.equal(context.operationalCapabilities.drafts, false);
  assert.equal(context.operationalCapabilities.draftShopify, false);
  assert.equal(context.operationalCapabilities.categories, false);
  assert.equal(JSON.stringify(context).includes(actor), false);
  assert.equal(JSON.stringify(context).includes(requestKey), false);
});
