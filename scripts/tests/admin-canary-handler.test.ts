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
function load(options: { scope?: unknown; status?: string; sku?: string; role?: string; master?: boolean; mapping?: string; opKey?: string; opState?: string; endpoint?: string; catalog?: boolean; fullMode?: boolean; commerce?: boolean; media?: boolean } = {}) {
  let handler!: (request: Request) => Promise<Response>;
  const calls = { rpc: 0, shopifyMutations: 0, statusReads: 0, events: 0, uploads: 0 };
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://iekwvvihjwghosqdxrdi.supabase.co', PRODUCT_ADMIN_WRITE_MODE: options.fullMode ? 'full' : 'canary',
    PRODUCT_ADMIN_WRITES_ENABLED: String(options.master ?? true), PRODUCT_ADMIN_DRAFTS_ENABLED: 'true',
    PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED: 'true', PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED:'true', PRODUCT_ADMIN_CANARY_SCOPE: JSON.stringify(options.scope === undefined ? scope() : options.scope),
    PRODUCT_ADMIN_OPERATIONAL_APPROVAL: JSON.stringify({ action: 'create_shopify_draft', target: operationId, expiresAt: scope().expiresAt }),
  };
  const product = { id: productId, sku: options.sku ?? 'QA-DRAFT-ONLY', entity_type: 'simple', is_active: true };
  const definition = { key: 'title', label: 'Titolo', field_group: 'main', data_type: 'text', editor_type: 'text',
    visible: true, editable: true, manual_only: false, applies_to: 'both', validation_rules: {}, ai_allowed: false };
  const commerceProduct = { id:'gid://shopify/Product/123',title:'TEST ADMIN — NON PUBBLICARE',handle:'fixture',status:'DRAFT',updatedAt:'2026-11-10T12:00:00Z',
    variants:{nodes:[{id:'gid://shopify/ProductVariant/456',sku:'QA-DRAFT-ONLY',price:'10.00',compareAtPrice:null}],pageInfo:{hasNextPage:false}},
    collections:{nodes:[],pageInfo:{hasNextPage:false}} };
  const media: Record<string, unknown>[] = [];
  const approvals: Record<string, unknown>[] = [];
  const grant = { enabled: options.catalog === true, capabilities: ['edit','sync','drafts','prices','publish','images','categories'], field_keys: ['title'] };
  const db = {
    from(table: string) {
      const data = table === 'admin_catalog_media' ? media : table === 'admin_catalog_capabilities' ? grant : table === 'admin_catalog_approvals' ? approvals : table === 'products' ? product : table === 'product_field_definitions' ? [definition] :
        table === 'product_current_values' ? [{ product_id: productId, field_key: 'title', value_text: 'Prima', version: 1, review_status: 'approved' }] :
        table === 'product_sync_csv_products' ? { sku: product.sku, shopify_product_id: options.mapping ?? 'gid://shopify/Product/123' } :
        table === 'admin_product_operations' ? { id: operationId, actor, request_key: options.opKey ?? requestKey, product_id: productId, state: options.opState ?? 'LOCAL_DRAFT', payload: draft } : null;
      let added: Record<string, unknown> | undefined;
      const changes: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const journal = table === 'admin_catalog_media' ? media : approvals;
      const selected = () => ['admin_catalog_approvals','admin_catalog_media'].includes(table) ? journal.filter(row => Object.entries(filters).every(([k,v]) => row[k] === v)) : data;
      const q = { insert: (value: Record<string,unknown>) => { added = { ...value, id: crypto.randomUUID(), state: table === 'admin_catalog_media' ? 'UPLOADING' : 'PENDING' }; journal.push(added); return q; }, update: (value: Record<string,unknown>) => { Object.assign(changes,value); return q; }, select: () => q, eq: (key: string, value: unknown) => { if (['admin_catalog_approvals','admin_catalog_media'].includes(table)) filters[key] = value; return q; }, in: () => q, gte: () => q, neq: () => q, order: () => q, limit: () => q, gt: () => q,
        maybeSingle: async () => { const rows = selected(); return { data: Array.isArray(rows) ? rows[0] ?? null : rows, error: null }; },
        single: async () => { const rows = selected(); return { data: added ?? (Array.isArray(rows) ? rows[0] : rows), error: null }; },
        then: (fn: (v: unknown) => void) => { const rows = selected(); if (['admin_catalog_approvals','admin_catalog_media'].includes(table) && Array.isArray(rows)) rows.forEach(row => Object.assign(row,changes)); return Promise.resolve({ data: rows, count: Array.isArray(rows) ? rows.length : 0, error: null }).then(fn); },
      };
      return q;
    },
    async rpc(name: string, parameters: Record<string,unknown>) { if (name === 'admin_claim_catalog_approval') { const row = approvals.find(a => a.id === parameters.p_id && a.actor === parameters.p_actor && a.payload_hash === parameters.p_hash && a.state === 'PENDING'); if (row) row.state = 'IN_FLIGHT'; return { data: !!row, error: null }; } assert.equal(name, 'admin_update_product_field'); calls.rpc++; calls.events++;
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
        const graphql = async (query: string, vars: Record<string, unknown> = {}) => {
          if (options.media && query.includes('AdminStage')) { calls.shopifyMutations++; return {stagedUploadsCreate:{stagedTargets:[{url:'https://storage.googleapis.com/synthetic-upload',resourceUrl:'https://storage.googleapis.com/synthetic-resource',parameters:[]}],userErrors:[]}}; }
          if (options.media && query.includes('AdminFile')) { calls.shopifyMutations++; return {fileCreate:{files:[{id:'gid://shopify/MediaImage/789'}],userErrors:[]}}; }
          if (options.media && query.includes('AdminMedia')) return {node:{id:'gid://shopify/MediaImage/789',fileStatus:'READY',image:{url:'https://cdn.shopify.com/fixture.png',width:16,height:16}}};
          if (options.commerce && query.includes('DeliveryProduct')) return {product:commerceProduct};
          if (options.commerce && query.includes('DeliveryPrices')) { calls.shopifyMutations++;
            const proposed=vars.variants as typeof commerceProduct.variants.nodes;
            assert.deepEqual(Object.keys(proposed[0]).sort(),['compareAtPrice','id','price']);
            Object.assign(commerceProduct.variants.nodes[0],proposed[0]); return {productVariantsBulkUpdate:{userErrors:[]}};
          }
          if (query.includes('mutation')) { calls.shopifyMutations++; throw Error('Unexpected external write'); }
          calls.statusReads++;
          if (query.includes('RecoverDraft')) return { products: { nodes: [{ id: 'gid://shopify/Product/123' }] } };
          return { product: { id: 'gid://shopify/Product/123', status: options.status ?? 'DRAFT' } };
        };
        return { shopifyAdminGraphQL: graphql, shopifyAdminGraphQLAtVersion: (_version: string, query: string, vars: Record<string, unknown>) => graphql(query, vars) };
      }
      if (!id.startsWith('.')) throw Error(`Unexpected dependency ${id}`);
      return module(resolve(dirname(file), id));
    };
    vm.runInNewContext(compiled, { exports, require, Request, Response, URL, TextEncoder, crypto, Blob, FormData, atob, AbortSignal, fetch: async (url: string) => { assert.equal(url, 'https://storage.googleapis.com/synthetic-upload'); calls.uploads++; return new Response('', {status:201}); },
      console: { log() {}, error() {} }, setTimeout, Deno: { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } } }, { filename: file });
    return exports;
  }
  module(resolve('supabase/functions/' + (options.endpoint ?? 'product-admin-api') + '/index.ts'));
  const request = (body: Record<string, unknown>) => handler(new Request('https://fixture.invalid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { calls, request, grant, approvals };
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
  assert.equal(context.backendVersion, 'admin-delivery-20261110-r1');
  assert.equal(context.canWrite, false);
  assert.equal(context.operationalCapabilities.drafts, false);
  assert.equal(context.operationalCapabilities.draftShopify, false);
  assert.equal(context.operationalCapabilities.categories, false);
  assert.equal(JSON.stringify(context).includes(actor), false);
  assert.equal(JSON.stringify(context).includes(requestKey), false);
});


test('final gate: recovery rejects a Shopify Product GID different from the approved pin', async () => {
  const s = load({ opState: 'NEEDS_RECONCILIATION', scope: { ...scope(), shopifyProductId: 'gid://shopify/Product/999' } });
  const response = await s.request({ action: 'recover_shopify_draft', operationId });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error.message, /Product GID diverso/);
  assert.equal(s.calls.rpc, 0); assert.equal(s.calls.shopifyMutations, 0);
});

test('final gate: an already pinned Product GID cannot authorize a fresh Shopify create', async () => {
  const s = load();
  const response = await s.request({ action: 'create_shopify_draft', operationId, confirm: true });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error.message, /non autorizza una nuova creazione/);
  assert.equal(s.calls.rpc, 0); assert.equal(s.calls.shopifyMutations, 0); assert.equal(s.calls.statusReads, 0);
});


test('ordinary editor: persisted approval, modified payload rejected and successful retry replays without second RPC', async () => {
  const s = load({ role: 'editor', catalog: true, scope: null });
  const prepared = await s.request({ action: 'prepare_catalog_approval', command: edit, confirm: true });
  assert.equal(prepared.status, 200); const { approvalId } = await prepared.json();
  assert.equal(s.approvals.length, 1);
  const changed = await s.request({ ...edit, value: 'Alterato', approvalId, confirm: true });
  assert.equal(changed.status, 403); assert.equal(s.calls.rpc, 0);
  const executed = await s.request({ ...edit, approvalId, confirm: true });
  assert.equal(executed.status, 200); assert.equal(s.calls.rpc, 1);
  const replay = await s.request({ ...edit, approvalId, confirm: true });
  assert.equal(replay.status, 200); assert.equal((await replay.json()).replayed, true);
  assert.equal(replay.headers.get('Access-Control-Allow-Origin'), '*'); assert.equal(s.calls.rpc, 1);
});
test('ordinary approval expires or is revoked before execution, without writing', async () => {
  for (const revoke of [true, false]) {
    const s = load({ role: 'editor', catalog: true, scope: null });
    const prepared = await s.request({ action: 'prepare_catalog_approval', command: edit, confirm: true });
    const { approvalId } = await prepared.json();
    if (revoke) s.grant.enabled = false; else s.approvals[0].expires_at = '2020-01-01T00:00:00Z';
    const response = await s.request({ ...edit, approvalId, confirm: true });
    assert.equal(response.status, 403); assert.equal(s.calls.rpc, 0); assert.equal(s.calls.shopifyMutations, 0);
  }
});
test('full environment cannot grant ordinary operations to an admin without exact scope or a fabricated body grant', async () => {
  const s = load({ scope: null, fullMode: true });
  const response = await s.request({ ...edit, catalogGrant: { enabled: true, capabilities: ['edit'] }, approval: true });
  assert.equal(response.status, 403); assert.equal(s.calls.rpc, 0);
});

test('catalog grant never opens the legacy clear-field command or unapproved field keys', async () => {
  for (const body of [{ ...edit, action: 'clear_field' }, { ...edit, fieldKey: 'inventory_quantity' }]) {
    const s = load({ role: 'editor', catalog: true, scope: null });
    const response = await s.request({ ...body, approvalId: actor, confirm: true });
    assert.equal(response.status, 403); assert.equal(s.calls.rpc, 0);
  }
});

test('price confirmation uses the live version and mutates only explicit prices; replay does not repeat Shopify', async () => {
  const s = load({role:'editor',catalog:true,commerce:true,scope:null});
  const body={action:'set_catalog_prices',productId,idempotencyKey:requestKey,expectedUpdatedAt:'2026-11-10T12:00:00Z',prices:[{id:'gid://shopify/ProductVariant/456',price:'12.50',compareAtPrice:null}]};
  const prepared=await s.request({action:'prepare_catalog_approval',command:body,confirm:true}); assert.equal(prepared.status,200);
  const {approvalId}=await prepared.json();
  const response=await s.request({...body,approvalId,confirm:true}); assert.equal(response.status,200); assert.equal(s.calls.shopifyMutations,1);
  const replay=await s.request({...body,approvalId,confirm:true}); assert.equal(replay.status,200); assert.equal(s.calls.shopifyMutations,1);
});
test('stale Shopify version and technical DRAFT publication are rejected before external writes', async () => {
  for(const command of [
    {action:'set_catalog_prices',expectedUpdatedAt:'stale',prices:[{id:'gid://shopify/ProductVariant/456',price:'12.50',compareAtPrice:null}]},
    {action:'publish_catalog_product',expectedUpdatedAt:'2026-11-10T12:00:00Z',logistics:[]},
  ]) {
    const s=load({role:'editor',catalog:true,commerce:true,scope:null});
    const response=await s.request({action:'prepare_catalog_approval',command:{...command,productId,idempotencyKey:requestKey},confirm:true});
    assert.equal(response.status,400); assert.equal(s.calls.shopifyMutations,0);
  }
});

test('image upload stays server-side, waits for READY and replays the same request without duplicate files', async () => {
  const s=load({role:'editor',catalog:true,media:true,scope:null});
  const png=new Uint8Array(32); png.set([137,80,78,71,13,10,26,10]); const view=new DataView(png.buffer); view.setUint32(16,16);view.setUint32(20,16);
  const body={action:'upload_catalog_image',idempotencyKey:requestKey,mimeType:'image/png',base64:Buffer.from(png).toString('base64'),alt:'Fixture sintetica',confirm:true};
  const response=await s.request(body); assert.equal(response.status,200); const result=await response.json();
  assert.equal(result.media.state,'READY'); assert.equal(result.media.url,'https://cdn.shopify.com/fixture.png');
  assert.equal(s.calls.uploads,1); assert.equal(s.calls.shopifyMutations,2);
  const replay=await s.request(body); assert.equal(replay.status,200); assert.equal(s.calls.uploads,1); assert.equal(s.calls.shopifyMutations,2);
  const other=await s.request({...body,alt:'Altri dati'});assert.equal(other.status,400);assert.equal(s.calls.uploads,1);
});
test('image upload denies ungranted users and invalid bytes before any upload', async () => {
  for(const catalog of [true,false]) {
    const s=load({role:'editor',catalog,media:true,scope:null});
    const response=await s.request({action:'upload_catalog_image',idempotencyKey:requestKey,mimeType:'image/png',base64:btoa('<svg/>'),alt:'Fixture',confirm:true});
    assert.equal(response.status,catalog?400:403); assert.equal(s.calls.uploads,0);assert.equal(s.calls.shopifyMutations,0);
  }
});
