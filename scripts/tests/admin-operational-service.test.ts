import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { handleOperational } from '../../supabase/functions/_shared/admin-operational-service.ts';
import { OperationalError, type ProductDraft } from '../../supabase/functions/_shared/admin-operational-core.ts';
import type { AuthContext } from '../../supabase/functions/_shared/admin-v2-types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const id = '40000000-0000-4000-8000-000000000001',
  actor: AuthContext = { userId: '00000000-0000-4000-8000-000000000001', roles: ['editor'], catalogGrant: { enabled: true, capabilities: ['drafts','categories'], fieldKeys: [] }, catalogApproval: { action: 'create_shopify_draft', target: id, before: {} } };
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
    actor: actor.userId, id,
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
  let completeCalls = 0;
  let createdInput: Record<string, unknown> | undefined;
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
        maybeSingle() {
          const definition = {key:'short_description',editable:true,publishable:true,shopify_mapping:
            options.missingShortMapping ? {} : {type:'metafield',namespace:'custom',key:'short_intro'}};
          return Promise.resolve({data:table === 'product_field_definitions' ? definition : null,error:null});
        },
        single() {
          return Promise.resolve({ data: op, error: null });
        },
        then(resolve: (x: unknown) => void) {
          if (update) Object.assign(op, update);
          resolve({ data: table === 'product_field_definitions' ? [
            {key:'short_description',visible:true,editable:true,publishable:true,manual_only:false,data_type:'text',editor_type:'textarea',shopify_mapping:options.missingShortMapping?{}:{type:'metafield',namespace:'custom',key:'short_intro'}},
            ...Object.keys(options.botanical ?? {}).map(key=>({key,visible:true,editable:true,publishable:true,manual_only:false,data_type:key==='nome_botanico'?'text':'array',editor_type:'multiselect',shopify_mapping:{type:'metafield',namespace:'custom',key}})),
          ] : table === 'product_current_values' ? [] : op, error: null });
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
      return { productSet: { product, userErrors: options.metafieldUserError?[{message:'Metafield sintetico rifiutato.'}]:[] } } as T;
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
    get input() { return createdInput; },
    get completions() { return completeCalls; },
  };
}
async function withFlags(run: () => Promise<void>) {
  const keys = ['PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED', 'PRODUCT_ADMIN_OPERATIONAL_APPROVAL', 'PRODUCT_ADMIN_WRITES_ENABLED', 'PRODUCT_ADMIN_WRITE_MODE'];
  const prior = keys.map((k) => Deno.env.get(k));
  Deno.env.set(keys[0], 'true');
  Deno.env.set(keys[1], JSON.stringify({
    action: 'create_shopify_draft',
    target: id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }));
  Deno.env.set(keys[2], 'true');
  Deno.env.set(keys[3], 'full');
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
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','edit','sync'],fieldKeys:['short_description']}};
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
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','sync'],fieldKeys:['nome_botanico','periodo_di_fioritura','key_features']}};
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
  const author={...actor,catalogGrant:{enabled:true,capabilities:['drafts','sync'],fieldKeys:['short_description']}};
  const command={action:'create_shopify_draft',operationId:id,confirm:true};
  await assertRejects(()=>handleOperational(s.db,author,command,s.shopify));
  assertEquals(s.completions,0); assertEquals(s.op.state,'NEEDS_RECONCILIATION');
  await assertRejects(()=>handleOperational(s.db,author,command,s.shopify));
  assertEquals(s.mutations,1);
}));

Deno.test('Editor senza field scope non contatta Shopify per i nuovi metafield',()=>withFlags(async()=>{
  const s=simulation({botanical:{nome_botanico:'Specie sintetica'}});
  let reads=0;
  await assertRejects(()=>handleOperational(s.db,actor,{action:'create_shopify_draft',operationId:id,confirm:true},async <T>(q:string,v:Record<string,unknown>)=>{reads++;return s.shopify<T>(q,v);}));
  assertEquals(reads,0); assertEquals(s.mutations,0);
}));
