import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeProductVariants, fetchAllProducts, nextPageCursor, type ShopifyProduct } from '../../src/lib/shopify.ts';
import { canonicalUrl, seoDescription } from '../../src/lib/storefront-seo.ts';

const edge = (id: number) => ({ node: { id: String(id), availableForSale: true } });
const pageInfo = (hasNextPage: boolean, endCursor: string | null = null) => ({ hasNextPage, endCursor });

// Network is always replaced: tests cannot create Shopify carts or use live data.
async function withFetch(run: (body: { query: string; variables: Record<string, unknown> }, signal?: AbortSignal) => unknown, check: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    const data = await run(JSON.parse(String(init?.body)), init?.signal ?? undefined);
    return new Response(JSON.stringify(data), {status:200});
  }) as typeof fetch;
  try { await check(); } finally { globalThis.fetch = original; }
}

test('catalogo: 1.205 prodotti, cursori, deduplica, query inoltrata senza tetti', async () => {
  let calls = 0;
  await withFetch(({variables}) => {
    calls++;
    const offset = Number(variables.after ?? 0);
    const end = Math.min(offset + Number(variables.first),1205);
    assert.equal(variables.query,'title:"rosa"');
    const edges = Array.from({length:end-offset},(_,i)=>edge(i+offset));
    if(offset) edges.unshift(edge(offset-1));
    return {data:{products:{edges,pageInfo:pageInfo(end<1205,String(end))}}};
  }, async () => {
    const products = await fetchAllProducts('title:"rosa"');
    assert.equal(products.length,1205);
    assert.equal(products.at(-1)?.node.id,'1204');
    assert.equal(calls,13);
  });
});

test('catalogo: errore pagina intermedia non restituisce risultati incompleti', async () => {
  await withFetch(({variables}) => {
    if(variables.after) throw new Error('rete interrotta');
    return {data:{products:{edges:[edge(1)],pageInfo:pageInfo(true,'next')}}};
  }, async () => { await assert.rejects(fetchAllProducts(),/rete interrotta/); });
});

test('cursori mancanti/ciclici e pageInfo assente falliscono esplicitamente', () => {
  assert.throws(()=>nextPageCursor(undefined!,new Set()),/non valida/);
  assert.throws(()=>nextPageCursor(pageInfo(true),new Set()),/mancante/);
  const seen = new Set<string>();
  assert.equal(nextPageCursor(pageInfo(true,'A'),seen),'A');
  nextPageCursor(pageInfo(true,'B'),seen);
  assert.throws(()=>nextPageCursor(pageInfo(true,'A'),seen),/ripetuto/);
  assert.equal(nextPageCursor(pageInfo(false),seen),null);
});

test('varianti: oltre 10 e oltre 100, ID selezionabili e disponibilità conservati', async () => {
  const variants = Array.from({length:205},(_,i)=>({node:{id:String(i),availableForSale:i===204,price:{amount:'42.10',currencyCode:'EUR'}}}));
  const product = {node:{id:'product',variants:{edges:variants.slice(0,100),pageInfo:pageInfo(true,'100')}}} as ShopifyProduct;
  await withFetch(({variables}) => {
    const offset = Number(variables.after);
    return {data:{product:{id:'product',variants:{edges:variants.slice(offset,offset+100),pageInfo:pageInfo(offset+100<205,String(offset+100))}}}};
  }, async () => {
    const result = await completeProductVariants(product);
    assert.equal(result.node.variants.edges.length,205);
    assert.equal(result.node.variants.edges.find(edge=>edge.node.availableForSale)?.node.id,'204');
    assert.equal(product.node.variants.edges.length,100);
  });
});

test('varianti: prodotto sparito o pagina errata impediscono acquisto parziale', async () => {
  const product = {node:{id:'product',variants:{edges:[],pageInfo:pageInfo(true,'100')}}} as unknown as ShopifyProduct;
  await withFetch(()=>({data:{product:null}}),async()=>assert.rejects(completeProductVariants(product),/non valida/));
});

test('richieste: segnale cancellazione propagato al fetch', async () => {
  const controller = new AbortController(); controller.abort();
  await withFetch((_body,signal)=>{ assert.ok(signal?.aborted); throw new DOMException('Aborted','AbortError'); },async()=>assert.rejects(fetchAllProducts(undefined,controller.signal),{name:'AbortError'}));
});

test('SEO: canonical senza query/hash e nessun dominio esterno; testo da dati', () => {
  assert.equal(canonicalUrl('https://garden.example','/collections/all?q=rosa#top'),'https://garden.example/collections/all');
  assert.throws(()=>canonicalUrl('https://garden.example','https://other.example/a'),/esterno/);
  assert.equal(seoDescription(null),'');
  assert.equal(seoDescription(' Rosa\n  di prova '),'Rosa di prova');
  assert.equal(seoDescription('a'.repeat(200)).length,160);
});

test('catalogo: tutti i 10.000 prodotti sono raggiungibili, senza cap e con disponibilità conservata', async () => {
  let calls = 0;
  await withFetch(({variables}) => {
    calls++;
    const offset = Number(variables.after ?? 0);
    const end = Math.min(offset + Number(variables.first), 10000);
    return {data:{products:{edges:Array.from({length:end-offset},(_,i)=>edge(offset+i)),pageInfo:pageInfo(end<10000,String(end))}}};
  }, async () => {
    const result = await fetchAllProducts();
    assert.equal(result.length,10000);
    assert.equal(result.at(-1)?.node.id,'9999');
    assert.equal(calls,100);
  });
});
