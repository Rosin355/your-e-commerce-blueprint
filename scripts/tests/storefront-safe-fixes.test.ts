import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fetchAllProducts, STOREFRONT_CATALOG_PAGE_QUERY, STOREFRONT_PRODUCTS_QUERY} from '../../src/lib/shopify.ts';
import {productStructuredData,serializeStructuredData} from '../../src/lib/storefront-structured-data.ts';

test('payload catalogo separato da home, mantiene prezzo minimo/opzioni/disponibilità',()=>{
  for(const field of ['variants(']) assert.ok(!STOREFRONT_CATALOG_PAGE_QUERY.includes(field),field);
  for(const field of ['description','tags','vendor','productType','publishedAt','collections','availableForSale','minVariantPrice','currencyCode','options','values','pageInfo']) assert.ok(STOREFRONT_CATALOG_PAGE_QUERY.includes(field),field);
  assert.ok(STOREFRONT_PRODUCTS_QUERY.includes('description'));
  assert.ok(STOREFRONT_PRODUCTS_QUERY.includes('variants(first: 10)'));
});

test('abort tra pagine non avvia richieste successive né restituisce un catalogo parziale',async()=>{
  const original=globalThis.fetch;const controller=new AbortController();let calls=0;
  globalThis.fetch=(async()=>{
    calls++;controller.abort();
    return new Response(JSON.stringify({data:{products:{edges:[{node:{id:'p',availableForSale:true}}],pageInfo:{hasNextPage:true,endCursor:'100'}}}}));
  }) as typeof fetch;
  try {await assert.rejects(fetchAllProducts(undefined,controller.signal),{name:'AbortError'});assert.equal(calls,1);}
  finally{globalThis.fetch=original;}
});

test('disponibilità assente non diventa falso esaurito',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=(async()=>new Response(JSON.stringify({data:{products:{edges:[{node:{id:'p'}}],pageInfo:{hasNextPage:false,endCursor:null}}}}))) as typeof fetch;
  try {await assert.rejects(fetchAllProducts(),/Disponibilità catalogo non valida/);}
  finally {globalThis.fetch=original;}
});

const product={title:'Pianta da dati verificati',description:'Descrizione da sorgente.',handle:'pianta',images:{edges:[{node:{url:'https://cdn.example/pianta.jpg'}}]}};
test('JSON-LD: Product descrittivo e breadcrumb effettivo, nessuna proprietà commerciale dedotta',()=>{
  const data=productStructuredData('https://garden.example',product);
  assert.deepEqual(data['@graph'][0],{'@type':'Product','@id':'https://garden.example/products/pianta#product',url:'https://garden.example/products/pianta',name:product.title,description:product.description,image:['https://cdn.example/pianta.jpg']});
  assert.equal(data['@graph'][1]['@type'],'BreadcrumbList');
  assert.deepEqual(data['@graph'][1].itemListElement?.map(item=>item.name),['Home','Tutti i prodotti',product.title]);
  for(const key of ['offers','price','availability','aggregateRating','review','brand','sku','gtin'])assert.ok(!JSON.stringify(data).includes(`"${key}"`));
});
test('JSON-LD: niente fallback inventati per immagini/descrizioni assenti o non valide',()=>{
  const data=productStructuredData('https://garden.example',{...product,description:'',images:{edges:[{node:{url:''}},{node:{url:'javascript:alert(1)'}}]}});
  assert.ok(!('image' in data['@graph'][0]));assert.ok(!('description' in data['@graph'][0]));
});
test('JSON-LD: serializzazione conserva testo ostile senza chiusura script in HTML',()=>{
  const title='</script><script>alert(1)</script>\u2028';
  const serialized=serializeStructuredData(productStructuredData('https://garden.example',{...product,title}));
  assert.ok(!serialized.includes('<'));assert.equal(JSON.parse(serialized)['@graph'][0].name,title);
});
