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
function load(options: { anonymous?: boolean; scope?: unknown; status?: string; sku?: string; role?: string; master?: boolean; mapping?: string; opKey?: string; opState?: string; endpoint?: string; catalog?: boolean; fullMode?: boolean; assets?: boolean; imageAssigned?:boolean; commerce?: boolean; publishable?: boolean; indexed?: boolean; media?: boolean; ai?: { grant: boolean; reserved?: boolean; output?: unknown; descriptionOutput?: unknown; http?: number; maxLength?: number; batch?: boolean; fields?: string[]; optIns?: string[]; tagsAi?: boolean; badReservation?: boolean; reservationError?: string } } = {}) {
  let handler!: (request: Request) => Promise<Response>;
  const calls = { rpc: 0, shopifyMutations: 0, statusReads: 0, events: 0, uploads: 0 };
  const traces: string[] = [];
  const providerRequests: { messages: {content:string}[]; tools: {function:{name:string;parameters:unknown}}[] }[] = [];
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://iekwvvihjwghosqdxrdi.supabase.co', PRODUCT_ADMIN_WRITE_MODE: options.fullMode ? 'full' : 'canary',
    PRODUCT_ADMIN_WRITES_ENABLED: String(options.master ?? true), PRODUCT_ADMIN_DRAFTS_ENABLED: 'true',
    PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED: 'true', PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED:'true', PRODUCT_ADMIN_CANARY_SCOPE: JSON.stringify(options.scope === undefined ? scope() : options.scope),
    PRODUCT_ADMIN_OPERATIONAL_APPROVAL: JSON.stringify({ action: 'create_shopify_draft', target: operationId, expiresAt: scope().expiresAt }),
  };
  const product = { id: productId, sku: options.sku ?? 'QA-DRAFT-ONLY', entity_type: 'simple', is_active: true };
  const definition = options.ai ? {key:'description', label:'Descrizione', field_group:'main', data_type:'text', editor_type:'richtext', visible:true, editable:true, manual_only:false, ai_allowed:true, applies_to:'both', validation_rules:{maxLength:options.ai.maxLength}} : { key: 'title', label: 'Titolo', field_group: 'main', data_type: 'text', editor_type: 'text',
    visible: true, editable: true, manual_only: false, applies_to: 'both', validation_rules: {}, ai_allowed: false };
  const commerceProduct = { id:'gid://shopify/Product/123',title:'TEST ADMIN — NON PUBBLICARE',handle:'fixture',status:'DRAFT',updatedAt:'2026-11-10T12:00:00Z',
    variants:{nodes:[{id:'gid://shopify/ProductVariant/456',sku:'QA-DRAFT-ONLY',price:'10.00',compareAtPrice:null}],pageInfo:{hasNextPage:false}},
    collections:{nodes:[],pageInfo:{hasNextPage:false}} };
  if (options.publishable) {
    Object.assign(commerceProduct, {title:'Scheda sintetica', description:'Descrizione verificata per il test isolato.',
      seo:{title:'Titolo',description:'Descrizione'}, media:{nodes:[{status:'READY',image:{url:'https://cdn.shopify.com/fixture.png'}}]},
      collections:{nodes:[{id:'gid://shopify/Collection/12',handle:'alberi',title:'Alberi'}],pageInfo:{hasNextPage:false}}, publishedOnPublication:false});
    Object.assign(commerceProduct.variants.nodes[0], {title:'Unico', inventoryQuantity:2, inventoryItem:{tracked:true, requiresShipping:true},
      deliveryProfile:{id:'gid://shopify/DeliveryProfile/139796676948'}});
  }
  const media: Record<string, unknown>[] = [];
  const oldFile = 'gid://shopify/MediaImage/101';
  const newFile = 'gid://shopify/MediaImage/102';
  const newAlt = 'Vista laterale verificata';
  const assetImages = [{id:oldFile,status:'READY',alt:'Prima',image:{url:'https://cdn.shopify.com/a.png'}}];
  const assetOption = {id:'gid://shopify/ProductOption/1', name:'Formato',optionValues:[{id:'gid://shopify/ProductOptionValue/9',name:'Unico'}]};
  if(options.assets) media.push({id:requestKey,actor,state:'READY',shopify_file_gid:newFile,alt:newAlt});
  const approvals: Record<string, unknown>[] = [];
  const grant = { enabled: options.catalog === true, capabilities: ['edit','sync','drafts','prices','publish','images','categories'], field_keys: ['title'] };
  if (options.assets) grant.field_keys.push('product_gallery','product_formats');
  if (options.ai) {
    env.LOVABLE_API_KEY = 'synthetic-only';
    grant.field_keys = ['description', ...(options.ai.fields ?? [])];
    env.PRODUCT_ADMIN_DRAFT_AI_EDITORIAL_ENABLED = String(options.ai.batch === true);
    if (options.ai.grant) grant.capabilities.push('ai');
  }
  const db = {
    from(table: string) {
      const data = table === 'admin_catalog_media' ? media : table === 'admin_catalog_capabilities' ? grant : table === 'admin_catalog_approvals' ? approvals : table === 'products' ? product : table === 'product_field_definitions' ? [definition, ...(options.ai ? [
          {...definition, key:'seo_title',editor_type:'text'}, {...definition,key:'seo_description',editor_type:'textarea'},
          {...definition,key:'tags',editor_type:'multiselect',data_type:'json',shopify_mapping:{type:'core',field:'tags'},ai_allowed:options.ai.tagsAi === true},
        ] : [])] :
        table === 'product_current_values' ? [{ product_id: productId, field_key: 'title', value_text: 'Prima', version: 1, review_status: 'approved' }] :
        table === 'product_sync_csv_products' ? { sku: product.sku, shopify_product_id: options.mapping ?? 'gid://shopify/Product/123' } :
        table === 'admin_product_operations' ? [{ id: operationId, actor, request_key: options.opKey ?? requestKey, product_id: productId, state: options.opState ?? 'LOCAL_DRAFT', payload: draft }] : null;
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
    async rpc(name: string, parameters: Record<string,unknown>) { if (options.ai && name === 'reserve_new_draft_editorial_v1') {
        assert.deepEqual(Object.keys(parameters).sort(),['p_actor','p_context_hash','p_request_key']);
        calls.rpc++;
        if (options.ai.reservationError) return {data:null,error:{code:options.ai.reservationError}};
        return {data: options.ai.badReservation ? true : {reserved:options.ai.reserved !== false,fields:options.ai.optIns ?? []},error:null};
      }
      if (options.ai && name === 'reserve_confirmed_ai_request') {
        assert.equal(parameters.p_actor, actor); calls.rpc++; return {data:options.ai.reserved !== false,error:null};
      }
      if (name === 'admin_claim_catalog_approval') { const row = approvals.find(a => a.id === parameters.p_id && a.actor === parameters.p_actor && a.payload_hash === parameters.p_hash && a.state === 'PENDING'); if (row) row.state = 'IN_FLIGHT'; return { data: !!row, error: null }; } assert.equal(name, 'admin_update_product_field'); calls.rpc++; calls.events++;
      return { data: { ok: true, code: 'APPLIED', version: 2 }, error: null }; },
  };
  const cache = new Map<string, Record<string, unknown>>();
  function module(file: string): Record<string, unknown> {
    if (cache.has(file)) return cache.get(file)!;
    const exports = {}; cache.set(file, exports);
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = (id: string): unknown => {
      if (id === 'npm:@supabase/supabase-js@2/cors') return { corsHeaders: {} };
      if (options.anonymous && id === 'https://esm.sh/@supabase/supabase-js@2.49.8') {
        return {createClient: () => { throw new Error('Unexpected database access before authentication'); }};
      }
      if (id.endsWith('/admin-v2-auth.ts') && !options.anonymous) return { authenticate: async () => ({ userId: actor, roles: [options.role ?? 'admin'] }), serviceClient: () => db, AuthError: class extends Error {} };
      if (options.publishable && id.endsWith('/shopify-storefront-server.ts')) return {
        shopifyStorefrontGraphQL:async () => ({product: {id:commerceProduct.id,availableForSale:true}, products:{pageInfo:{hasNextPage:false,endCursor:null},nodes:options.indexed === false ? [] : [{id:commerceProduct.id}]}}),
      };
      if (id.endsWith('/shopify-admin-client.ts')) {
        const graphql = async (query: string, vars: Record<string, unknown> = {}) => {
          if(options.assets && query.includes('EditorProductAssets')) return {product:{...commerceProduct,
            options:[structuredClone(assetOption)],media:{nodes:structuredClone(assetImages),pageInfo:{hasNextPage:false}},
            variants:{nodes:commerceProduct.variants.nodes.map(v=>({...v,selectedOptions:[{name:'Formato',value:assetOption.optionValues[0].name}],
            media:{nodes:options.imageAssigned ? [{id:oldFile}] : [],pageInfo:{hasNextPage:false}}})),pageInfo:{hasNextPage:false}}}};
          if(options.assets && query.includes('EditorLibraryImage')) return {node:{id:newFile,alt:newAlt,fileStatus:'READY'}};
          if(options.assets && query.includes('EditorImageReference')) {
            const [file]=vars.files as {id:string;referencesToAdd?:string[];referencesToRemove?:string[]}[];
            assert.deepEqual(Array.from(file.referencesToAdd ?? file.referencesToRemove ?? []),[commerceProduct.id]);
            assert.equal('alt' in file,false);
            if(file.referencesToAdd) assetImages.push({id:newFile,status:'READY',alt:newAlt,image:{url:'https://cdn.shopify.com/b.png'}});
            else assetImages.splice(assetImages.findIndex(m=>m.id===file.id),1);
            calls.shopifyMutations++; return {fileUpdate:{files:[{id:file.id}],userErrors:[]}};
          }
          if(options.assets && query.includes('EditorFormatName')) {
            assert.equal(vars.product,commerceProduct.id);
            assert.match(query,/LEAVE_AS_IS/);
            assetOption.optionValues[0].name=(vars.values as {name:string}[])[0].name;
            calls.shopifyMutations++;return {productOptionUpdate:{userErrors:[]}};
          }
          if (options.media && query.includes('AdminStage')) { calls.shopifyMutations++; return {stagedUploadsCreate:{stagedTargets:[{url:'https://storage.googleapis.com/synthetic-upload',resourceUrl:'https://storage.googleapis.com/synthetic-resource',parameters:[]}],userErrors:[]}}; }
          if (options.media && query.includes('AdminFile')) { calls.shopifyMutations++; return {fileCreate:{files:[{id:'gid://shopify/MediaImage/789'}],userErrors:[]}}; }
          if (options.media && query.includes('AdminMedia')) return {node:{id:'gid://shopify/MediaImage/789',fileStatus:'READY',image:{url:'https://cdn.shopify.com/fixture.png',width:16,height:16}}};
          if (options.commerce && query.includes('AdminFamilyIdentity')) return {
            productVariants: { nodes: [{sku: commerceProduct.variants.nodes[0].sku, product: {id: commerceProduct.id}}], pageInfo: {hasNextPage: false} },
          };
          if (options.publishable && query.includes('DeliveryShipping')) return {
            a:{sources:[{targetType:'VARIANTS',inclusion:{matchType:'ALL',conditions:[{__typename:'CollectionSourceInclusionConditionVariantPrice',relation:'GREATER_THAN',value:{amount:'-0.01'}}]},
              exclusion:{matchType:'ANY',conditions:[{__typename:'CollectionSourceExclusionConditionCollection',values:[{id:vars.b}]}]}}]},
            b:{sources:[{targetType:'VARIANTS',inclusion:{conditions:[],selections:{nodes:[],pageInfo:{hasNextPage:false}}},exclusion:{conditions:[]}}]},
          };
          if (options.publishable && query.includes('DeliveryChannel')) return {publication:{id:vars.id,catalog:{title:'Channel Catalog 338862113108 for Ecom Blueprint Gen 6ud1s Headless'}}};
          if (options.publishable && query.includes('DeliveryActivate')) {
            calls.shopifyMutations++; commerceProduct.status='ACTIVE'; return {productUpdate:{userErrors:[]}};
          }
          if (options.publishable && query.includes('DeliveryPublish')) {
            calls.shopifyMutations++; Object.assign(commerceProduct,{publishedOnPublication:true}); return {publishablePublish:{userErrors:[]}};
          }
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
    vm.runInNewContext(compiled, { exports, require, Request, Response, URL, TextEncoder, crypto, Blob, FormData, atob, AbortSignal, AbortController, clearTimeout, fetch: async (url: string, init: RequestInit) => {
      if (options.ai && url === 'https://ai.gateway.lovable.dev/v1/chat/completions') {
        providerRequests.push(JSON.parse(String(init.body)));
        const providerRequest = providerRequests.at(-1);
        const descriptionCall = providerRequest?.tools[0].function.name === 'propose_field_improvement';
        const input = JSON.parse(providerRequest?.messages[1].content ?? '{}');
        const original = String(input.product?.current_value ?? '').split('\n');
        const output = descriptionCall && options.ai.batch ? options.ai.descriptionOutput ?? {
          sections:[{heading:'Introduzione',text:'Informazioni editoriali documentate: '+original.join(' '),factIndices:original.map((_v,i)=>i)}],missingInformation:[],
        } : options.ai.output;
        return Response.json({choices:[{message:{tool_calls:[{function:{name:providerRequests.at(-1)!.tools[0].function.name,arguments:JSON.stringify({suggested_value:output})}}]}}]}, {status:options.ai.http ?? 200});
      }
      assert.equal(url, 'https://storage.googleapis.com/synthetic-upload'); calls.uploads++; return new Response('', {status:201}); },
      console: { log() {}, error() {}, warn: (line: string) => traces.push(line), info: (line: string) => traces.push(line) }, setTimeout, Deno: { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } } }, { filename: file });
    return exports;
  }
  module(resolve('supabase/functions/' + (options.endpoint ?? 'product-admin-api') + '/index.ts'));
  const request = (body: Record<string, unknown>) => handler(new Request('https://fixture.invalid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { traces, calls, request, grant, approvals, providerRequests };
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
  assert.equal(context.backendVersion, 'admin-editor-20261125');
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

test('SKU TEST-OG-AI-001: editor con publish non può preparare o inviare la pubblicazione', async () => {
  const fixture = load({ role: 'editor', catalog: true, sku: 'TEST-OG-AI-001', commerce: true });
  const command = { action: 'publish_catalog_product', productId, expectedUpdatedAt: '2026-11-10T12:00:00Z',
    logistics: [], idempotencyKey: requestKey };
  const prepared = await fixture.request({ action: 'prepare_catalog_approval', command, confirm: true });
  assert.ok(prepared.status >= 400);
  assert.match((await prepared.json()).error.message, /prodotto tecnico/i);
  assert.equal(fixture.approvals.length, 0);
  const executed = await fixture.request({ ...command, confirm: true });
  assert.ok(executed.status >= 400);
  assert.equal(fixture.calls.shopifyMutations, 0);
  assert.equal(fixture.calls.rpc, 0);
});

test('AI da fatti confermati: handler Editor, diagnosi per fase e nessun fallback riuscito', async () => {
  const facts = ['La scheda riporta Quercus robur. Il nome è stato verificato.'];
  const request = {action:'suggest_confirmed_field', fieldKey:'description', confirmed:true, requestKey, facts};
  const cases = [
    { ai:{ grant:false }, status:403, code:'FORBIDDEN', reservations:0 },
    { ai:{ grant:true }, override:{confirmed:false}, status:422, code:'INVALID_CONFIRMED_FACTS', reservations:0 },
    { ai:{ grant:true, reserved:false }, status:429, code:'RATE_LIMITED', reservations:1 },
    { ai:{ grant:true, output:null }, status:502, code:'INVALID_MODEL_PROPOSAL', reservations:1 },
    { ai:{ grant:true, http:503 }, status:503, code:'AI_PROVIDER_ERROR', reservations:1 },
    { ai:{ grant:true, maxLength:16, output:{sections:[{heading:'Introduzione',text:'Informazioni editoriali documentate: '+facts[0],factIndices:[0]}],missingInformation:[]} }, status:502, code:'INVALID_MODEL_PROPOSAL', reservations:1 },
    { ai:{ grant:true, output:'Il modello aggiunge un dettaglio.' }, status:502, code:'INVALID_MODEL_PROPOSAL', reservations:1 },
  ];
  for (const example of cases) {
    const fixture = load({ endpoint:'product-admin-ai', catalog:true, role:'editor', ai:example.ai });
    const response = await fixture.request({...request,...example.override});
    const body = await response.json();
    assert.equal(response.status, example.status, JSON.stringify(body));
    if (example.code) {
      assert.equal(body.error.code,example.code);
      assert.equal(body.error.details.requestId,requestKey);
      assert.equal(body.value,undefined);
    } else {
      assert.equal(body.source,'confirmed_facts');
      assert.equal(body.value,`<p>${facts[0]}</p>`);
    }
    assert.equal(fixture.calls.rpc,example.reservations);
    assert.equal(fixture.calls.events,0);
    assert.equal(fixture.calls.shopifyMutations,0);
    assert.equal(fixture.traces.length,1);
    const trace = JSON.parse(fixture.traces[0]);
    assert.deepEqual(Object.keys(trace).sort(),['action','code','field','requestId','scope','stage']);
    assert.equal(trace.field,'description');
    assert.equal(trace.requestId,requestKey);
    assert.equal(trace.code,example.code ?? 'INVALID_MODEL_PROPOSAL');
    assert.ok(!fixture.traces[0].includes(facts[0]));
  }
});

test('Scheda SEO: prenotazione per campo, descrizione e selezione strutturate e validazione server', async () => {
  const facts = ['Nome comune: Farnia', 'Il cartellino riporta Quercus robur.'];
  const payload = {action:'suggest_confirmed_field',fieldKey:'description',draftTitle:'Quercus robur',confirmed:true,requestKey,facts};
  const keys = ['seo_title','seo_description','tags'];
  const fixture = load({endpoint:'product-admin-ai', catalog:true, role:'editor', ai:{
    grant:true,batch:true,fields:['seo_title','seo_description'],optIns:keys,tagsAi:false,output:{description:[1,0],seoTitle:0,seoDescription:0,tags:[1,0],sku:'IGNORA'},
  }});
  const body = await (await fixture.request(payload)).json();
  assert.equal(body.ok,true);
  assert.match(body.value, /Informazioni editoriali documentate/);
  assert.equal(body.source,'model');
  assert.deepEqual(body.editorial,{
    seoTitle:{value:'Quercus robur (Farnia)',source:'model'},
    seoDescription:{value:facts[1],source:'model'},tags:{value:['Farnia','Quercus robur'],source:'model'},
  });
  assert.equal(body.sku,undefined);
  assert.equal(fixture.calls.rpc,1);
  assert.equal(fixture.providerRequests.length,2);
  assert.equal(fixture.providerRequests[0].tools[0].function.name,'propose_field_improvement');
  assert.equal(fixture.providerRequests[1].tools[0].function.name,'select_draft_editorial');
  assert.equal(fixture.calls.shopifyMutations,0);
  assert.equal(fixture.calls.events,0);
});

test('Scheda SEO: valori inventati o indici fuori dominio scartati campo per campo', async () => {
  const facts=['Nome comune: Farnia','La scheda non conferma la resistenza al gelo.'];
  const fixture=load({endpoint:'product-admin-ai',catalog:true,role:'editor',ai:{grant:true,batch:true,
    fields:['seo_title','seo_description','tags'],optIns:['seo_title','seo_description','tags'],tagsAi:true,
    output:{description:[1,1],seoTitle:'Farnia certificata',seoDescription:42,tags:[0,0]}}});
  const body=await (await fixture.request({action:'suggest_confirmed_field',fieldKey:'description',draftTitle:'Quercus robur',confirmed:true,requestKey,facts})).json();
  assert.equal(body.source,'model');
  assert.deepEqual(Object.values(body.editorial as Record<string,{source:string}>).map(r=>r.source),['deterministic','deterministic','deterministic']);
  assert.equal(body.editorial.seoDescription.value,facts.join(' '));
  assert.ok(!JSON.stringify(body).includes('certificata'));
  assert.equal(fixture.providerRequests.length,2);
});

test('Scheda SEO: registro, permessi e prenotazione prevalgono sul payload', async()=>{
  const data={action:'suggest_confirmed_field',fieldKey:'description',draftTitle:'Quercus robur',confirmed:true,requestKey,facts:['Nome comune: Farnia']};
  const setup={grant:true,batch:true,fields:['seo_title'],optIns:['seo_title','seo_description'],output:{description:[0],seoTitle:0,tags:[0]}};
  const fixture=load({endpoint:'product-admin-ai',catalog:true,role:'editor',ai:setup});
  for(const extra of [{productId},{fields:['tags']}]) {
    assert.equal((await fixture.request({...data,...extra})).status,422);
    assert.equal(fixture.providerRequests.length,0);
  }
  const body=await (await fixture.request(data)).json();
  assert.equal(body.editorial.seoDescription,undefined);
  assert.equal(body.editorial.tags.source,'deterministic');
  const prompt=JSON.parse(fixture.providerRequests[1].messages[1].content);
  assert.deepEqual(Object.keys(prompt).sort(),['description','seoTitle']);
  for (const [extra,status] of [[{reserved:false},429],[{badReservation:true},500],[{grant:false},403]] as const) {
    const f=load({endpoint:'product-admin-ai',catalog:true,role:'editor',ai:{...setup,...extra}});
    assert.equal((await f.request(data)).status,status);
    assert.equal(f.providerRequests.length,0);
  }
  const old=load({endpoint:'product-admin-ai',catalog:true,role:'editor',ai:{...setup,batch:false,output:{sections:[{heading:'Introduzione',text:'Nome documentato per questa scheda: Farnia.',factIndices:[0]}],missingInformation:[]}}});
  const fallback=await (await old.request(data)).json();
  assert.equal(old.providerRequests.length,1);
  assert.equal(old.providerRequests[0].tools[0].function.name,'propose_field_improvement');
  assert.equal(fallback.editorial.seoTitle.source,'deterministic');
  assert.equal(fallback.editorial.tags.source,'deterministic');
});

test('Scheda SEO: RPC assente conserva il servizio precedente, errore ambiguo blocca la richiesta', async () => {
  const facts = ['Il cartellino riporta Quercus robur.'];
  const input = {action:'suggest_confirmed_field',fieldKey:'description',draftTitle:'Quercus robur',confirmed:true,requestKey,facts};
  for (const reservationError of ['PGRST202','08006']) {
    const fixture = load({endpoint:'product-admin-ai',catalog:true,role:'editor',ai:{
      grant:true,batch:true,fields:['seo_title'],reservationError,output:{sections:[{heading:'Introduzione',text:'Identità documentata della pianta: il cartellino riporta Quercus robur.',factIndices:[0]}],missingInformation:[]},descriptionOutput:{sections:[{heading:'Introduzione',text:'Identità documentata della pianta: il cartellino riporta Quercus robur.',factIndices:[0]}],missingInformation:[]},
    }});
    const result = await fixture.request(input);
    if (reservationError === 'PGRST202') {
      assert.equal(result.status,200);
      assert.equal((await result.json()).editorial.seoTitle.source,'deterministic');
      assert.equal(fixture.providerRequests.length,1);
      assert.equal(fixture.calls.rpc,2);
    } else {
      assert.equal(result.status,500);
      assert.equal(fixture.providerRequests.length,0);
      assert.equal(fixture.calls.rpc,1);
    }
  }
});

test('Nuova bozza anonima: l’autenticazione effettiva rifiuta prima di database, prenotazione e provider', async () => {
  const fixture = load({endpoint:'product-admin-ai',anonymous:true,ai:{grant:false}});
  const result = await fixture.request({action:'suggest_confirmed_field',fieldKey:'description',draftTitle:'Scheda tecnica',
    confirmed:true,requestKey,facts:['Nome verificato per il collaudo.']});
  assert.equal(result.status,401);
  assert.equal((await result.json()).error.code,'UNAUTHENTICATED');
  assert.equal(fixture.calls.rpc,0);
  assert.equal(fixture.providerRequests.length,0);
});

test('pubblicazione esplicita sul canale, rilettura per handle e catalogo, nessun successo prima dell’indicizzazione', async () => {
  for (const indexed of [true,false]) {
    const s = load({role:'editor',catalog:true,commerce:true,publishable:true,indexed,scope:null});
    const cmd={action:'publish_catalog_product',productId,idempotencyKey:requestKey,expectedUpdatedAt:'2026-11-10T12:00:00Z',
      logistics:[{id:'gid://shopify/ProductVariant/456',class:'A'}],allowSoldOut:false};
    const prepared=await s.request({action:'prepare_catalog_approval',command:cmd,confirm:true});
    assert.equal(prepared.status,200); assert.equal(s.calls.shopifyMutations,0);
    const {approvalId}=await prepared.json();
    const response=await s.request({...cmd,approvalId,confirm:true});
    assert.equal(s.calls.shopifyMutations,2);
    if (indexed) {
      assert.equal(response.status,200);
      assert.equal((await response.json()).result.state,'STOREFRONT_VERIFIED');
    } else assert.notEqual(response.status,200);
  }
});

test('galleria nominale e formato esistente richiedono confronto e rilettura indipendenti',async()=>{
  for (const proposal of [
    {action:'set_catalog_image',change:'replace',imageId:'gid://shopify/MediaImage/101',libraryId:requestKey},
    {action:'rename_catalog_format',optionValueId:'gid://shopify/ProductOptionValue/9',name:'Vaso grande'},
  ]) {
    const command={...proposal,productId,idempotencyKey:requestKey,expectedUpdatedAt:'2026-11-10T12:00:00Z'};
    for(const assets of [false,true]) {
      const s=load({role:'editor',scope:null,catalog:true,fullMode:true,commerce:true,assets});
      const approval=await s.request({action:'prepare_catalog_approval',command,confirm:true});
      if(!assets){assert.equal(approval.status,403);assert.equal(s.calls.shopifyMutations,0);continue;}
      assert.equal(approval.status,200,JSON.stringify(await approval.clone().json()));
      const {approvalId}=await approval.json();
      const result=await s.request({...command,approvalId,confirm:true});
      assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
      assert.equal((await result.json()).result.state,'VERIFIED');
      assert.equal(s.calls.shopifyMutations,proposal.action==='set_catalog_image'?2:1);
    }
  }
});
test('una foto associata a una variante e un file fuori dalla libreria impediscono l’invio',async()=>{
  for(const assigned of [false,true]) {
    const s=load({role:'editor',scope:null,catalog:true,fullMode:true,commerce:true,assets:true,imageAssigned:assigned});
    const command={action:'set_catalog_image',change:'replace',imageId:'gid://shopify/MediaImage/101',
      libraryId:assigned ? requestKey : productId,productId,idempotencyKey:requestKey,expectedUpdatedAt:'2026-11-10T12:00:00Z'};
    assert.notEqual((await s.request({action:'prepare_catalog_approval',command,confirm:true})).status,200);
    assert.equal(s.calls.shopifyMutations,0);
  }
});
