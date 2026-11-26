import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { prepareCatalogApproval, withCatalogApproval } from '../../supabase/functions/_shared/admin-catalog-approvals.ts';
import { handleOperational } from '../../supabase/functions/_shared/admin-operational-service.ts';
import { OperationalError, type ProductDraft } from '../../supabase/functions/_shared/admin-operational-core.ts';
import type { AuthContext } from '../../supabase/functions/_shared/admin-v2-types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const id = '40000000-0000-4000-8000-000000000001',
  actor: AuthContext = { userId: '00000000-0000-4000-8000-000000000001', roles: ['editor'], catalogGrant: { enabled: true, capabilities: ['drafts','categories','sync','edit'], fieldKeys: ['title','description','seo_title'] }, catalogApproval: { action: 'create_shopify_draft', target: id, before: {} } };
function simulation(
  options: {
    timeout?: boolean;
    mappingFailure?: boolean;
    skuConflict?: boolean | 'parent';
    multiVariant?: boolean;
    currency?: string;
    requestedVendor?: string;
    remoteVendor?: string;
    productType?: string;
    remoteOption?: string;
    short?: string;
    missingShortMapping?: boolean;
    useDefaultSeoTitle?: boolean;
    botanical?: Record<string, unknown>;
    missingRemoteMetafield?: boolean;
    metafieldUserError?: boolean;
    missingAdminField?: boolean;
    botanicalReceipt?: boolean;
  } = {},
) {
  const draft: ProductDraft = {
    title: 'Simulazione',
    sku: 'QA-001',
    description: '<p>Test <strong>editoriale</strong></p>',
    shortDescription: options.short,
    productType: options.productType,
    currency: 'EUR',
    vendor: options.requestedVendor ?? '',
    tags: [],
    categoryIds: [],
    images: [],
    seoTitle: options.useDefaultSeoTitle ? 'Simulazione' : '',
    seoDescription: '',
    botanical: options.botanical ?? {},
    botanicalConfirmedKeys: Object.keys(options.botanical ?? {}),
    variants: [{ sku: 'QA-001', price: '12.00', compareAtPrice: null, option: 'Unico' }],
  };
  if (options.multiVariant) {
    draft.sku = 'QA-PARENT';
    draft.variants.push({ sku: 'QA-002', price: '13.00', compareAtPrice: null, option: 'Altro' });
  }
  const op = {
    actor: actor.userId, id, request_key: id, payload_hash: 'fixture-version',
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
    shortIntro: options.short ? {type:'multi_line_text_field',value:options.short} : null,
    descriptionHtml: draft.description,
    tags: draft.tags,
    seo: { title: options.useDefaultSeoTitle ? null : draft.seoTitle, description: draft.seoDescription },
    productType: draft.productType ?? '',
    vendor: options.remoteVendor ?? draft.vendor,
    metafield: { value: id },
    variants: {
      nodes: [{
        id: 'gid://shopify/ProductVariant/2',
        sku: 'QA-001',
        price: '12.00',
        selectedOptions: [{ name: 'Formato', value: options.remoteOption ?? 'Unico' }],
        compareAtPrice: null,
      }],
      pageInfo: { hasNextPage: false },
    },
  };
  let mutations = 0;
  let saves = 0;
  let completeCalls = 0;
  let createdInput: Record<string, unknown> | undefined;
  let savedRows: Record<string, unknown>[] = [];
  const db = {
    from(table: string) {
      let update: Record<string, unknown> | undefined;
      const filters: [string, unknown][] = [];
      const matchesOp = () => filters.every(([key, value]) => Reflect.get(op, key) === value);
      const chain = {
        select() {
          return chain;
        },
        eq(key: string, value: unknown) {
          filters.push([key, value]);
          return chain;
        },
        contains(column:string, value:unknown) {
          assertEquals(column,'result');
          assertEquals(value,{botanicalReview:{operationId:id,payloadHash:op.payload_hash}});
          return chain;
        },
        limit() { return chain; },
        gt() {
          return chain;
        },
        in() { return chain; },
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
        maybeSingle() {
          if (table === 'admin_catalog_approvals' && options.botanicalReceipt) {
            assertEquals(Object.fromEntries(filters),{actor:actor.userId,action:'save_new_product',target:'draft-botany:'+id,state:'COMPLETE'});
            return Promise.resolve({data:{id},error:null});
          }
          if (table === 'admin_product_operations') return Promise.resolve({data:saves && matchesOp() ? {...op} : null, error:null});
          const definition = {key:'short_description',editable:true,publishable:true,shopify_mapping:
            options.missingShortMapping ? {} : {type:'metafield',namespace:'custom',key:'short_intro'}};
          return Promise.resolve({data:table === 'product_field_definitions' ? definition : null,error:null});
        },
        single() {
          return Promise.resolve({ data: matchesOp() ? {...op} : null, error: null });
        },
        then(resolve: (x: unknown) => void) {
          if (update && matchesOp()) Object.assign(op, update);
          resolve({ data: table === 'product_field_definitions' ? [
            ...['title','description','seo_title','seo_description'].map(key=>({key,visible:true,editable:true,data_type:'text',editor_type:'textarea'})),
            {key:'short_description',visible:true,editable:true,publishable:true,manual_only:false,data_type:'text',editor_type:'textarea',shopify_mapping:options.missingShortMapping?{}:{type:'metafield',namespace:'custom',key:'short_intro'}},
            ...Object.keys(options.botanical ?? {}).map(key=>({key,visible:true,editable:true,publishable:true,manual_only:false,data_type:key==='nome_botanico'?'text':'array',editor_type:'multiselect',shopify_mapping:{type:'metafield',namespace:'custom',key}})),
          ] : table === 'product_current_values' ? options.missingAdminField?savedRows.slice(1):savedRows : op, error: null });
        },
      };
      return chain;
    },
    rpc(name: string, args?: Record<string, unknown>) {
      if (name === 'admin_save_new_draft') {
        saves++;
        op.payload_hash = String(args?.p_hash);
        op.request_key = String(args?.p_key);
        savedRows=((args?.p_fields ?? []) as {key:string;text?:string;json?:unknown;number?:number}[]).map(field=>({product_id:op.product_id,field_key:field.key,value_text:field.text ?? null,value_json:field.json ?? null,value_number:field.number ?? null}));
        return Promise.resolve({data:{productId:op.product_id,operationId:id,state:'LOCAL_DRAFT'},error:null});
      }
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
    if (query.includes('AdminDraftMetafieldDefinitions')) return {metafieldDefinitions:{nodes:[
      ...(options.short ? [{namespace:'custom',key:'short_intro',type:{name:'multi_line_text_field'},access:{storefront:'PUBLIC_READ'}}] : []),
      ...Object.keys(options.botanical ?? {}).map(key=>({namespace:'custom',key,type:{name:key==='key_features'?'multi_line_text_field':'single_line_text_field'},access:{storefront:'PUBLIC_READ'}})),
    ],pageInfo:{hasNextPage:false,endCursor:null}}} as T;
    if (query.includes('AdminVerifyDraftMetafields')) {
      const fields=(createdInput?.metafields ?? []) as Record<string,unknown>[];
      return {product:{id:product.id,metafields:{nodes:options.missingRemoteMetafield?fields.slice(0,1):fields,pageInfo:{hasNextPage:false,endCursor:null}}}} as T;
    }
    if (query.includes('DraftShortDefinition')) return {metafieldDefinitions:{nodes:[{type:{name:'multi_line_text_field'},access:{storefront:'PUBLIC_READ'}}]}} as T;
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
      createdInput = variables.input as Record<string, unknown>;
      assertEquals((variables.input as { status: string }).status, 'DRAFT');
      if (options.timeout) throw Error('simulated timeout after remote commit');
      return { productSet: { product, userErrors: options.metafieldUserError?[{field:['input','metafields','1','value'],message:'Metafield sintetico rifiutato.'}]:[] } } as T;
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
    get saves() { return saves; },
    get input() { return createdInput; },
    get completions() { return completeCalls; },
  };
}
async function withFlags(run: () => Promise<void>) {
  const keys = ['PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED', 'PRODUCT_ADMIN_OPERATIONAL_APPROVAL', 'PRODUCT_ADMIN_WRITES_ENABLED', 'PRODUCT_ADMIN_WRITE_MODE', 'PRODUCT_ADMIN_DRAFTS_ENABLED','PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED'];
  const prior = keys.map((k) => Deno.env.get(k));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], JSON.stringify({
    action: 'create_shopify_draft',
    target: id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }));
  Deno.env.set(keys[2], 'true');
  Deno.env.set(keys[3], 'full');
  Deno.env.set(keys[4], 'true');
  Deno.env.set(keys[5], 'true');
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
Deno.test('tipo e descrizione formattata arrivano a Shopify; un formato riassegnato blocca il mapping', () =>
  withFlags(async () => {
    const s = simulation({ productType: 'Arbusto', remoteOption: 'Altro formato' });
    await assertRejects(() => handleOperational(s.db, actor, {
      action: 'create_shopify_draft', operationId: id, confirm: true,
    }, s.shopify));
    assertEquals(s.input?.productType, 'Arbusto');
    assertEquals(s.input?.descriptionHtml, '<p>Test <strong>editoriale</strong></p>');
    assertEquals(s.completions, 0);
    assertEquals(s.mutations, 1);
  }));
Deno.test('fornitore facoltativo: default Shopify consentito, recupero senza seconda create', () =>
  withFlags(async () => {
    const s = simulation({ remoteVendor: 'Online Garden' });
    await handleOperational(s.db, actor, {
      action: 'create_shopify_draft', operationId: id, confirm: true,
    }, s.shopify);
    assertEquals(Object.hasOwn(s.input!, 'vendor'), false);
    assertEquals(s.op.state, 'VERIFIED_DRAFT');
    s.op.state = 'IN_FLIGHT';
    await handleOperational(s.db, {
      ...actor, catalogApproval: {
        ...actor.catalogApproval!, action: 'recover_shopify_draft', target: 'recovery:' + id,
      },
    }, { action: 'recover_shopify_draft', operationId: id }, s.shopify);
    assertEquals(s.mutations, 1);
    assertEquals(s.op.state, 'VERIFIED_DRAFT');
  }));
Deno.test('fornitore esplicito: un valore remoto diverso blocca il mapping', () =>
  withFlags(async () => {
    const s = simulation({ requestedVendor: 'Vivaio richiesto', remoteVendor: 'Altro fornitore' });
    s.op.state = 'IN_FLIGHT';
    await assertRejects(() => handleOperational(s.db, {
      ...actor, catalogApproval: {
        ...actor.catalogApproval!, action: 'recover_shopify_draft', target: 'recovery:' + id,
      },
    }, { action: 'recover_shopify_draft', operationId: id }, s.shopify),
    OperationalError, 'La bozza Shopify è cambiata');
    assertEquals(s.mutations, 0);
    assertEquals(s.completions, 0);
    assertEquals(s.op.state, 'NEEDS_RECONCILIATION');
  }));
Deno.test('fornitore esplicito: invio e verifica mantengono il valore richiesto', () =>
  withFlags(async () => {
    const s = simulation({ useDefaultSeoTitle: true, requestedVendor: 'Vivaio richiesto', remoteVendor: 'Vivaio richiesto' });
    await handleOperational(s.db, actor, {
      action: 'create_shopify_draft', operationId: id, confirm: true,
    }, s.shopify);
    assertEquals(s.input?.vendor, 'Vivaio richiesto');
    assertEquals(s.op.state, 'VERIFIED_DRAFT');
    assertEquals(s.mutations, 1);
  }));
Deno.test('richiesta costruita manualmente con approvazione per un’altra bozza non crea prodotti', () =>
  withFlags(async () => {
    const s = simulation();
    const wrongApproval = { ...actor, catalogApproval: { action: 'create_shopify_draft', target: '40000000-0000-4000-8000-000000000002', before: {} } };
    await assertRejects(() => handleOperational(s.db, wrongApproval, {
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
    const error = await assertRejects(() => handleOperational(s.db, {...actor,catalogApproval:{...actor.catalogApproval!,action:'recover_shopify_draft',target:'recovery:'+id}}, {
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
      {...actor,catalogApproval:{...actor.catalogApproval!,action:'recover_shopify_draft',target:'recovery:'+id}},
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
      {...actor,catalogApproval:{...actor.catalogApproval!,action:'recover_shopify_draft',target:'recovery:'+id}},
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
  const categoryActor = { ...actor, catalogApproval: { action: 'apply_categories', target: productId, before: {} } };
  const preview = await handleOperational(db, categoryActor, {
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
    'PRODUCT_ADMIN_OPERATIONAL_APPROVAL', 'PRODUCT_ADMIN_WRITE_MODE'];
  const prior = keys.map((key) => Deno.env.get(key));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], 'true');
  Deno.env.set(keys[3], 'full');
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
  const categoryActor = { ...actor, catalogApproval: { action: 'apply_categories', target: productId, before: {} } };
  const preview = await handleOperational(db, categoryActor, {
    action: 'preview_categories', productId, categoryIds: [],
  }, shopify) as { expectedHash: string };
  const keys = ['PRODUCT_ADMIN_WRITES_ENABLED', 'PRODUCT_ADMIN_CATEGORIES_ENABLED',
    'PRODUCT_ADMIN_OPERATIONAL_APPROVAL', 'PRODUCT_ADMIN_WRITE_MODE'];
  const prior = keys.map((key) => Deno.env.get(key));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], 'true');
  Deno.env.set(keys[3], 'full');
  Deno.env.set(keys[2], JSON.stringify({ action: 'apply_categories',
    target: preview.expectedHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }));
  try {
    const result = await handleOperational(db, categoryActor, {
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

Deno.test('riepilogo autorizzato: payload persistito, categoria per GID esatto, nessun accesso Shopify', async () => {
  const categoryId = '30000000-0000-4000-8000-000000000003';
  const gid = 'gid://shopify/Collection/123';
  const payload = {
    title: 'TEST — Lavanda', sku: 'TEST-OG-AI-001', description: '<p>Testo confermato.</p>',
    currency: 'EUR', vendor: 'Fornitore sintetico', tags: ['prova'], categoryIds: [], collectionIds: [gid],
    variants: [{ sku: 'TEST-OG-AI-001', option: 'Formato unico', price: '10.00', compareAtPrice: null }],
    images: [{ url: 'https://cdn.shopify.com/fixture.png', alt: 'Lavanda sintetica' }],
    seoTitle: 'Titolo SEO', seoDescription: '', botanical: {}, privateExtra: 'non esportare',
  };
  let mapped = true;
  const tables: string[] = [];
  const columns: string[] = [];
  const db = { from(table: string) {
    tables.push(table);
    const data = table === 'admin_product_operations' ? [{ id, product_id: id, state: 'LOCAL_DRAFT', payload, actor: 'privato' }]
      : table === 'product_category_shopify_map' ? (mapped ? [{ shopify_collection_gid: gid, category_id: categoryId }] : [])
      : table === 'product_categories' ? [{ id: categoryId, display_name: 'Aromatiche da esterno' }]
      : null;
    if (!data) throw Error('Tabella fuori dal contratto ' + table);
    const q = {
      select(fields: string) { columns.push(fields); return q; },
      eq(key: string, value: unknown) {
        const expected = { product_id: id, map_status: 'verified', visible_admin: true };
        assertEquals(value, expected[key as keyof typeof expected]);
        return q;
      },
      in(key: string, values: string[]) { assertEquals(values, key === 'id' ? [categoryId] : [gid]); return q; },
      order() { return q; },
      then(resolve: (v: unknown) => void) { resolve({ data, error: null }); },
    };
    return q;
  } } as unknown as SupabaseClient;
  const read = async (auth: AuthContext) =>
    await handleOperational(db, auth, { action: 'get_product_operations', productId: id },
      () => { throw Error('Chiamata Shopify inattesa'); }) as { operations: { summary?: Record<string, unknown> }[] };
  const res = await read(actor);
  const { summary } = res.operations[0];
  assertEquals(summary?.variants, payload.variants);
  assertEquals(summary?.categories, ['Aromatiche da esterno']);
  assertEquals(summary?.description, payload.description);
  assertEquals(summary?.vendor, payload.vendor);
  assertEquals(summary?.images, payload.images);
  assertEquals(summary?.seoDescription, null);
  assertEquals('payload' in res.operations[0] || 'actor' in res.operations[0] || 'privateExtra' in summary!, false);
  mapped = false;
  let lookups = 0;
  const rawRead = () => ({ action: 'get_product_operations', productId: id });
  for (const available of [true, false]) {
    const legacy = await handleOperational(db, actor, rawRead(), async <T>(query: string, vars?: Record<string, unknown>) => {
      lookups++;
      assertEquals(query.startsWith('query EditorDraftCollectionNames'), true);
      assertEquals(vars?.ids, [gid]);
      if (!available) throw Error('Catalogo esterno non disponibile');
      return { nodes: [{ id: gid, title: 'Aromatiche da esterno', handle: 'aromatiche' }] } as T;
    }) as { operations: { summary: { categories: string[]; variants: unknown } }[] };
    assertEquals(legacy.operations[0].summary.categories, [available ? 'Aromatiche da esterno' : 'Categoria registrata · nome non verificato']);
    assertEquals(legacy.operations[0].summary.variants, payload.variants);
  }
  assertEquals(lookups, 2);
  tables.length = 0;
  columns.length = 0;
  const limited = await read({ ...actor, catalogGrant: { enabled: true, capabilities: ['edit'], fieldKeys: ['description'] } });
  assertEquals(limited.operations[0].summary, undefined);
  assertEquals(columns.some(c => c.includes('payload')), false);
  assertEquals(tables, ['admin_product_operations']);
});

import { listPublicationStates } from '../../supabase/functions/_shared/admin-list-publication.ts';

Deno.test('publication badges distinguish local, Shopify and channel state and preserve ambiguous mappings', async () => {
  const products = ['local', 'draft', 'active', 'off', 'unlisted', 'archived', 'conflict', 'unmapped', 'inflight'].map(id => ({ id, sku: id }));
  const remoteStates = ['DRAFT', 'ACTIVE', 'ACTIVE', 'UNLISTED', 'ARCHIVED'];
  const links = products.slice(1, 7).map((p, index) => ({ product_id: p.id, shopify_product_gid: 'gid://shopify/Product/' + (index + 1) }));
  const tables: Record<string, object[]> = {
    admin_product_shopify_links: links,
    product_sync_csv_products: [{ sku: 'draft', shopify_product_id: '1' }, { sku: 'conflict', shopify_product_id: '99' }],
    admin_product_operations: [{ product_id: 'local', state: 'LOCAL_DRAFT' }, { product_id: 'inflight', state: 'IN_FLIGHT' }],
  };
  const db = { from: (table: string) => ({ select: () => ({ in: () => ({ data: tables[table], error: null }) }) }) } as unknown as SupabaseClient;
  const read = async <T>(_version: string, _query: string, variables: Record<string, unknown> = {}) => {
    assertEquals(variables.ids, links.slice(0, 5).map(row => row.shopify_product_gid));
    return { nodes: remoteStates.map((status, index) => ({ id: links[index].shopify_product_gid, status, publishedOnPublication: index !== 2 })) } as T;
  };
  assertEquals(Object.fromEntries(await listPublicationStates(db, products, read)), {
    local: 'local_draft', draft: 'shopify_draft', active: 'published', off: 'off_channel', unlisted: 'unlisted', archived: 'archived',
  });
  assertEquals(Object.fromEntries(await listPublicationStates(db, products, () => Promise.reject(new Error('Shopify unavailable')))), { local: 'local_draft' });
});

Deno.test('la bozza Shopify registra entrambi i testi solo per l’autore abilitato',()=>withFlags(async()=>{
  const s=simulation({short:'Sintesi verificata.'});
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','edit','sync'],fieldKeys:['title','description','short_description']}};
  const command={action:'create_shopify_draft',operationId:id,confirm:true};
  await assertRejects(()=>handleOperational(s.db,{...author,userId:'00000000-0000-4000-8000-000000000009'},command,s.shopify));
  assertEquals(s.mutations,0);
  const missing=simulation({short:'Sintesi verificata.',missingShortMapping:true});
  await assertRejects(()=>handleOperational(missing.db,author,command,missing.shopify));
  assertEquals(missing.mutations,0);
  await handleOperational(s.db,author,command,s.shopify);
  assertEquals(s.input?.descriptionHtml,'<p>Test <strong>editoriale</strong></p>');
  assertEquals((s.input?.metafields as {key:string;value:string}[]).find(f=>f.key==='short_intro')?.value,'Sintesi verificata.');
  assertEquals(s.mutations,1);
}));

Deno.test('nuova bozza invia botanica richiesta e verifica tutti i metafield prima del completamento',()=>withFlags(async()=>{
  const s=simulation({botanical:{nome_botanico:'Specie sintetica',periodo_di_fioritura:['Giugno','Luglio'],key_features:['Sempreverde','Crescita lenta']}});
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','sync'],fieldKeys:['title','description','nome_botanico','periodo_di_fioritura','key_features']}};
  const result=await handleOperational(s.db,author,{action:'create_shopify_draft',operationId:id,confirm:true},s.shopify) as {metafieldVerification:{fieldKey:string;state:string}[]};
  const fields=s.input?.metafields as {key:string;type:string;value:string}[];
  assertEquals(fields.find(f=>f.key==='periodo_di_fioritura')?.value,'Giugno, Luglio');
  assertEquals(fields.find(f=>f.key==='key_features')?.value,'Sempreverde\nCrescita lenta');
  assertEquals(result.metafieldVerification.length,3);
  assertEquals(result.metafieldVerification.every(f=>f.state==='VERIFIED'),true);
  assertEquals(s.completions,1); assertEquals(s.mutations,1);
}));

for(const failure of ['missingRemoteMetafield','metafieldUserError'] as const)Deno.test('errore metafield impedisce successo globale e seconda create: '+failure,()=>withFlags(async()=>{
  const s=simulation({short:'Sintesi verificata.',[failure]:true});
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','sync'],fieldKeys:['title','description','short_description']}};
  const command={action:'create_shopify_draft',operationId:id,confirm:true};
  const error=await assertRejects(()=>handleOperational(s.db,author,command,s.shopify),OperationalError);
  assertEquals((error.details?.metafieldVerification as {state:string}[]).map(row=>row.state),
    [failure==='metafieldUserError'?'REJECTED':'NOT_VERIFIED']);
  assertEquals(s.completions,0); assertEquals(s.op.state,'NEEDS_RECONCILIATION');
  await assertRejects(()=>handleOperational(s.db,author,command,s.shopify));
  assertEquals(s.mutations,1);
}));

Deno.test('Editor senza field scope non contatta Shopify per i nuovi metafield',()=>withFlags(async()=>{
  const s=simulation({botanical:{nome_botanico:'Specie sintetica'}});
  let reads=0;
  await assertRejects(()=>handleOperational(s.db,actor,{action:'create_shopify_draft',operationId:id,confirm:true},async <T>(q:string,v:Record<string,unknown> = {})=>{reads++;return s.shopify<T>(q,v);}));
  assertEquals(reads,0); assertEquals(s.mutations,0);
}));

Deno.test('timeout metafield: recovery non richiede nuovo grant sync o definizioni live e non ricrea',()=>withFlags(async()=>{
  const s=simulation({timeout:true,botanical:{nome_botanico:'Specie sintetica',key_features:['Sempreverde']}});
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','sync'],fieldKeys:['title','description','nome_botanico','key_features']}};
  await assertRejects(()=>handleOperational(s.db,author,{action:'create_shopify_draft',operationId:id,confirm:true},s.shopify));
  assertEquals(s.op.state,'NEEDS_RECONCILIATION');assertEquals(s.mutations,1);
  const recoveryAuthor={...actor,catalogApproval:{action:'recover_shopify_draft',target:'recovery:'+id,before:{}}};
  const result=await handleOperational(s.db,recoveryAuthor,{action:'recover_shopify_draft',operationId:id,confirm:true},async <T>(q:string,v:Record<string,unknown> = {})=>{
    if(q.includes('AdminDraftMetafieldDefinitions'))throw Error('Nessuna nuova definizione può bloccare una sola rilettura');
    return s.shopify<T>(q,v);
  }) as {metafieldVerification:{fieldKey:string;state:string}[]};
  assertEquals(result.metafieldVerification.length,2);assertEquals(s.completions,1);assertEquals(s.mutations,1);
}));

Deno.test('nuova bozza salva e rilegge tutti i campi Admin; salvataggio parziale non dichiara successo',()=>withFlags(async()=>{
  for(const missingAdminField of [false,true]){
    const s=simulation({botanical:{nome_botanico:'Specie sintetica'},missingAdminField});
    const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','edit'],fieldKeys:['title','description','nome_botanico']},catalogApproval:{action:'save_new_product',target:'new-sku:qa-001',before:{}}};
    const run=()=>handleOperational(s.db,author,{action:'save_new_product',draft:s.op.payload,idempotencyKey:id,confirm:true},s.shopify);
    if(missingAdminField)await assertRejects(run);
    else assertEquals((await run() as {adminFieldVerification:{fieldKey:string}[]}).adminFieldVerification.map(field=>field.fieldKey),['title','description','nome_botanico']);
    assertEquals(s.mutations,0);
  }
}));

Deno.test('commit locale seguito da rilettura interrotta: due retry leggono lo stesso prodotto e la stessa operazione', () => withFlags(async () => {
  const options = {missingAdminField:true};
  const s = simulation(options);
  const command = {action:'save_new_product', draft:s.op.payload, idempotencyKey:id, confirm:true};
  const approval = {action:'save_new_product', target:'new-sku:qa-001', before:{}};
  await assertRejects(() => handleOperational(s.db, {...actor, catalogApproval:approval}, command, s.shopify));
  assertEquals(s.saves, 1);
  options.missingAdminField = false;
  const recover = (request = command) => handleOperational(s.db, {...actor, catalogApproval:{...approval, recoverSavedDraft:true}}, request, () => { throw Error('Shopify non previsto'); });
  const [first, second] = await Promise.all([recover(), recover()]);
  assertEquals(first, second);
  assertEquals((first as {result:unknown}).result, {operationId:id, productId:s.op.product_id, state:'LOCAL_DRAFT', replayed:true});
  await assertRejects(() => recover({...command, draft:{...command.draft, title:'Altra versione'}}));
  assertEquals(s.saves, 1);
  assertEquals(s.mutations, 0);
}));

Deno.test('creazione, due recovery e una rilettura tardiva convergono sulla stessa VERIFIED_DRAFT', () => withFlags(async () => {
  const s = simulation({botanical:{nome_botanico:'Specie sintetica'}});
  const author = {...actor, catalogGrant:{enabled:true, capabilities:['drafts','sync'],fieldKeys:['title','description','nome_botanico']}};
  const recover = {...actor, catalogApproval:{action:'recover_shopify_draft',target:'recovery:'+id,before:{}}};
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const creating = handleOperational(s.db, author, {action:'create_shopify_draft',operationId:id,confirm:true}, async (query, vars = {}) => {
    if (query.includes('AdminVerifyDraftMetafields')) {
      entered.resolve();
      await release.promise;
      throw Error('Rilettura interrotta');
    }
    return s.shopify(query,vars);
  });
  await entered.promise;
  const command = {action:'recover_shopify_draft',operationId:id,confirm:true};
  await Promise.all([handleOperational(s.db, recover, command, s.shopify),handleOperational(s.db, recover, command, s.shopify)]);
  assertEquals(s.op.state,'VERIFIED_DRAFT');
  release.resolve();
  await assertRejects(() => creating);
  assertEquals(s.op.state,'VERIFIED_DRAFT');
  assertEquals(s.mutations,1);
}));

Deno.test('editor con grant parziale: verifica edit locale e sync remota per ogni campo botanico', () => withFlags(async () => {
  const values = {nome_botanico:'Sintetico',nome_comune:'Test',difficolta_di_coltivazione:'Media',periodo_di_fioritura:['Febbraio','Maggio'],periodo_di_raccolta:['Gennaio'],periodo_di_messa_a_dimora:['Marzo'],periodo_ottimale_di_potatura:['Aprile'],faq:[{question:'Q?',answer:'A.'}],key_benefits:['Uno'],key_features:['Due']};
  for (const [fieldKey,value] of Object.entries(values)) {
    const s = simulation({botanical:{[fieldKey]:value}});
    for (const action of ['save_new_product','create_shopify_draft']) {
      const local = action === 'save_new_product';
      const subject = {...actor,catalogApproval:{action,target:local?'new-sku:qa-001':id,before:{}}};
      const command = local ? {action,draft:s.op.payload,idempotencyKey:id,confirm:true} : {action,operationId:id,confirm:true};
      const error = await assertRejects(() => handleOperational(s.db,subject,command,() => {throw Error('Shopify inatteso');}), OperationalError);
      assertEquals(error.code,'FORBIDDEN',fieldKey);
      assertEquals(s.saves,0);
      assertEquals(s.mutations,0);
    }
  }
}));

Deno.test('bozza storica: conferma dei mesi legata ad autore, operazione e versione senza create', () => withFlags(async () => {
  const key = 'periodo_di_fioritura';
  const s = simulation({botanical:{[key]:['Febbraio','Maggio','Novembre']}});
  delete s.op.payload.botanicalConfirmedKeys;
  const subject = {...actor,catalogGrant:{enabled:true,capabilities:['drafts','edit'],fieldKeys:[key]},catalogApproval:{action:'save_new_product',target:'draft-botany:'+id,before:{}}};
  const command = {action:'save_new_product',operationId:id,expectedHash:s.op.payload_hash,botanicalConfirmedKeys:[key],confirm:true};
  await assertRejects(() => handleOperational(s.db,subject,{...command, botanicalConfirmedKeys:[]},s.shopify));
  await assertRejects(() => handleOperational(s.db,subject,{...command, expectedHash:'superato'},s.shopify));
  await assertRejects(() => handleOperational(s.db,{...subject,userId:'altro-editor'},command,s.shopify));
  assertEquals(await handleOperational(s.db,subject,command,s.shopify),{ok:true,botanicalReview:{operationId:id,payloadHash:s.op.payload_hash}});
  assertEquals(s.op.state,'LOCAL_DRAFT');
  assertEquals(s.op.payload.botanicalConfirmedKeys,undefined);
  assertEquals(s.saves,0);
  assertEquals(s.mutations,0);
}));

Deno.test('API completa: prepare, claim, commit, perdita di rilettura e recupero con la chiave originale scaduta', () => withFlags(async () => {
  const options = {missingAdminField:true};
  const s = simulation(options);
  const subject:AuthContext = {...actor, catalogApproval:undefined};
  const action = 'save_new_product';
  const command = {action, draft:s.op.payload, idempotencyKey:id};
  let approval:Record<string,unknown>|undefined;
  let claims = 0;
  const db = {
    from(table:string) {
      if (table !== 'admin_catalog_approvals') return s.db.from(table);
      const filters: [string, unknown[]][] = [];
      let update:Record<string,unknown>|undefined;
      const matches = () => approval && filters.every(([key,values]) => values.includes(approval![key]));
      const chain = {
        select() {return chain;},
        eq(key:string,value:unknown) {filters.push([key,[value]]);return chain;},
        in(key:string,values:unknown[]) {filters.push([key,values]);return chain;},
        maybeSingle() {return Promise.resolve({data:matches()?{...approval}:null,error:null});},
        single() {return chain.maybeSingle();},
        insert(row:Record<string,unknown>) {assertEquals(approval,undefined);approval={...row,id,state:'PENDING'};return chain;},
        update(row:Record<string,unknown>) {update=row;return chain;},
        then(resolve:(response:unknown)=>void) {if(matches() && update)Object.assign(approval!,update);resolve({error:null});},
      };
      return chain;
    },
    rpc(name:string) {
      assertEquals(name,'admin_claim_catalog_approval');
      claims++;
      assertEquals(approval?.state,'PENDING');
      approval!.state='IN_FLIGHT';
      return Promise.resolve({data:true,error:null});
    },
  } as unknown as SupabaseClient;
  const call = async (request=command) => {
    const {approvalId} = await prepareCatalogApproval(db,subject,{command:request,confirm:true});
    const body = {...request,approvalId,confirm:true};
    return withCatalogApproval(db,subject,body,async () => Response.json(await handleOperational(s.db,subject,body,s.shopify)));
  };
  await assertRejects(call);
  assertEquals(approval?.state,'REVIEW_REQUIRED');
  assertEquals(s.saves,1);
  approval!.expires_at='2000-01-01T00:00:00Z';
  options.missingAdminField=false;
  await assertRejects(()=>call({...command,draft:{...command.draft,title:'Altra versione'}}));
  const recovered=await (await call()).json();
  assertEquals(recovered.result.operationId,id);
  assertEquals(approval?.state,'COMPLETE');
  assertEquals((await (await call()).json()).result.productId,s.op.product_id);
  assertEquals(claims,1);
  assertEquals(s.saves,1);
  assertEquals(s.mutations,0);
}));

Deno.test('solo una ricevuta COMPLETE della stessa versione sblocca la create separata di una LOCAL_DRAFT storica', () => withFlags(async () => {
  const command={action:'create_shopify_draft',operationId:id,confirm:true};
  const subject={...actor,catalogGrant:{enabled:true,capabilities:['drafts','sync'],fieldKeys:['title','description','nome_botanico']}};
  for (const botanicalReceipt of [false,true]) {
    const s=simulation({botanical:{nome_botanico:'Specie sintetica'},botanicalReceipt});
    delete s.op.payload.botanicalConfirmedKeys;
    if (botanicalReceipt) {
      const result=await handleOperational(s.db,subject,command,s.shopify) as {metafieldVerification:{state:string}[]};
      assertEquals(result.metafieldVerification.map(row=>row.state),['VERIFIED']);
      assertEquals(s.op.state,'VERIFIED_DRAFT');
      const replay=await handleOperational(s.db,subject,command,s.shopify) as {metafieldVerification?:unknown};
      assertEquals(replay.metafieldVerification,undefined);
    } else await assertRejects(()=>handleOperational(s.db,subject,command,s.shopify),OperationalError,'Conferma la fonte');
    assertEquals(s.mutations,botanicalReceipt?1:0);
    assertEquals(s.saves,0);
  }
}));
