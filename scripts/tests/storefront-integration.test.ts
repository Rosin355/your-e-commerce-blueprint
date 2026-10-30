import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchAllProducts, fetchProducts, fetchCollectionByHandle, HIDDEN_STOREFRONT_PRODUCT_IDS, CART_CREATE_MUTATION, STOREFRONT_PRODUCTS_QUERY } from '../../src/lib/shopify.ts';
import { createStorefrontCheckout } from '../../src/lib/shopify-checkout.ts';

const hidden = [...HIDDEN_STOREFRONT_PRODUCT_IDS].map(id => ({node:{id,availableForSale:true}}));
const visible = {node:{id:'gid://shopify/Product/valid',availableForSale:true}};
const done = {hasNextPage:false,endCursor:null};

test('prodotti test esclusi da catalogo completo, homepage e collezioni, senza mutare Shopify', async () => {
  const original = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (_url,init) => {
    const {query} = JSON.parse(String(init?.body));requests.push(query);
    return new Response(JSON.stringify({data:query.includes('GetCollection') ? {collection:{handle:'rose',title:'Rose',products:{edges:[...hidden,visible],pageInfo:done}}} : {products:{edges:[...hidden,visible],pageInfo:done}}}));
  }) as typeof fetch;
  try {
    assert.deepEqual((await fetchAllProducts()).map(p=>p.node.id),[visible.node.id]);
    assert.deepEqual((await fetchProducts(120,undefined,{sortKey:'CREATED_AT',reverse:true})).map(p=>p.node.id),[visible.node.id]);
    assert.deepEqual((await fetchCollectionByHandle('rose')).products.map(p=>p.node.id),[visible.node.id]);
    assert.ok(requests.every(query=>!query.includes('mutation')));
    assert.ok(STOREFRONT_PRODUCTS_QUERY.includes('$sortKey: ProductSortKeys'));
  } finally {globalThis.fetch=original;}
});

test('checkout: quantità invalida non invia richieste; errore Shopify non restituisce URL; cartCreate conserva variante e quantità', async () => {
  const original = globalThis.fetch;let calls=0;let fail=true;
  globalThis.fetch = (async (_url,init) => {
    calls++;
    const body=JSON.parse(String(init?.body));
    assert.equal(body.query,CART_CREATE_MUTATION);
    assert.deepEqual(body.variables.input.lines,[{quantity:2,merchandiseId:'gid://shopify/ProductVariant/205'}]);
    return new Response(JSON.stringify({data:{cartCreate:fail ? {userErrors:[{message:'Fixture: quantità non disponibile'}],cart:null} : {userErrors:[],cart:{checkoutUrl:'https://checkout.example.test/test'}}}}));
  }) as typeof fetch;
  const item={variantId:'gid://shopify/ProductVariant/205',quantity:2} as Parameters<typeof createStorefrontCheckout>[0][number];
  try {
    await assert.rejects(createStorefrontCheckout([{...item,quantity:1.5}]),/quantità/);assert.equal(calls,0);
    await assert.rejects(createStorefrontCheckout([item]),/quantità non disponibile/);
    fail=false;assert.equal(await createStorefrontCheckout([item]),'https://checkout.example.test/test?channel=online_store');
    assert.equal(calls,2);
  } finally {globalThis.fetch=original;}
});
