import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildSitemap, productNoindex, STOREFRONT_ORIGIN } from '../../src/lib/storefront-indexing.ts';
import { productStructuredData } from '../../src/lib/storefront-structured-data.ts';
import { redirectResponse, createHandler } from '../../infra/seo/legacy-redirects.mjs';

const oldPath='/prodotto/rose/rosa-jasmina-rampicante/';
const newUrl='https://onlinegarden.it/products/rosa-jasmina-rampicante';
const rule={ oldPath,newUrl,confidence:'HIGH',qaStatus:'PASS',destinationStatus:200,reviewApproved:true };
const approved={enabled:true,approvalReference:'TEST-OFFLINE-ONLY',rules:[rule]};
const request=(path=oldPath,method='GET',host='onlinegarden.it')=>new Request(`https://${host}${path}`,{method});

test('HTTP: exact legacy mapping sends www and apex straight to canonical, one 301',()=>{
  for(const host of ['onlinegarden.it','www.onlinegarden.it']){
    const response=redirectResponse(request(oldPath,'GET',host),approved);
    assert.equal(response?.status,301);assert.equal(response?.headers.get('location'),newUrl);
    assert.equal(redirectResponse(request('/products/rosa-jasmina-rampicante'),approved),null);
  }
});
test('HTTP: pending approval, missing gate, ambiguous rule and invalid destination never redirect',()=>{
  for(const manifest of [undefined,{}, {...approved,enabled:false},{...approved,approvalReference:''},{...approved,rules:[rule,rule]},{...approved,rules:'invalid'},...[
    {newUrl:'invalid'},{newUrl:'https://user:pass@onlinegarden.it/products/rosa'},{reviewApproved:false},{confidence:'MEDIUM'},{qaStatus:'PENDING'},{destinationStatus:404},{newUrl:'https://other.test/products/rosa'},{newUrl:'https://onlinegarden.it/'},{newUrl:newUrl+'?add-to-cart=1'},
  ].map(delta=>({...approved,rules:[{...rule,...delta}]}))]) assert.equal(redirectResponse(request(),manifest),null);
});
test('HTTP: actions, checkout, arbitrary URLs, POST and unknown query pass through',async()=>{
  for(const path of ['/cart','/checkout','/admin/settings','/products/rosa','/prodotto/rose/unknown/',oldPath+'?add-to-cart=1',oldPath+'?wc-ajax=checkout',oldPath+'?variant=1']) assert.equal(redirectResponse(request(path),approved),null);
  assert.equal(redirectResponse(request(oldPath,'POST'),approved),null);
  assert.equal(redirectResponse(request(oldPath,'GET','evil.test'),approved),null);
  let calls=0;const handler=createHandler(approved,async()=>{calls++;return new Response('origin');});
  assert.equal(await (await handler.fetch(request('/checkout'))).text(),'origin');assert.equal(calls,1);
});
test('HTTP: known legacy variant parameter is removed, attribution preserved; HEAD returns 301',()=>{
  const r=redirectResponse(request(oldPath+'?attribute_dimensioni=vaso&utm_source=google','HEAD'),approved);
  assert.equal(r?.status,301);assert.equal(r?.headers.get('location'),newUrl+'?utm_source=google');
});
test('committed redirect manifest remains inert',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../../infra/seo/redirect-candidates.json',import.meta.url),'utf8'));
  assert.equal(manifest.enabled,false);assert.equal(manifest.approvalReference,null);
  for(const r of manifest.rules){assert.equal(r.reviewApproved,false);assert.equal(redirectResponse(request(r.oldPath),manifest),null);}
});
const publicProduct={id:'gid://shopify/Product/1',handle:'rosa',publishedAt:'2026-11-01T00:00:00Z',availableForSale:true};
test('sitemap: public canonical products only; sold out remains indexable, no draft/private routes',()=>{
  const xml=buildSitemap([publicProduct,{...publicProduct,id:'gid://shopify/Product/2',handle:'esaurito',availableForSale:false},{...publicProduct,id:'gid://shopify/Product/3',handle:'draft',publishedAt:null}]);
  assert.ok(xml.includes(STOREFRONT_ORIGIN+'/products/rosa'));assert.ok(xml.includes('/products/esaurito'));
  for(const path of ['/products/draft','/admin','/auth','/checkout','/prodotto/','https://www.onlinegarden.it'])assert.ok(!xml.includes(path));
  assert.throws(()=>buildSitemap([]));assert.throws(()=>buildSitemap([publicProduct,publicProduct]));
  assert.throws(()=>buildSitemap([{...publicProduct,handle:'../../checkout'}]));
});
test('Product: loading permits rendering, absent/error noindex; stock does not determine indexing',()=>{
  assert.equal(productNoindex(true,false,null),false);assert.equal(productNoindex(false,false,null),true);
  assert.equal(productNoindex(false,true,null),false);assert.equal(productNoindex(false,true,new Error('offline')),true);
});
test('Product offers reproduce real price/currency without inferring inventory or reviews',()=>{
  const data=productStructuredData(STOREFRONT_ORIGIN,{title:'Rosa',handle:'rosa',images:{edges:[]},variants:{edges:[
    {node:{id:'v1',price:{amount:'12.50',currencyCode:'EUR'},availableForSale:true}},
    {node:{id:'v2',price:{amount:'18.00',currencyCode:'EUR'},availableForSale:false}},
    {node:{id:'bad',price:{amount:'NaN',currencyCode:'EUR'},availableForSale:true}},
  ]}});
  const product=data['@graph'][0];
  assert.deepEqual(product.offers?.map(o=>[o.price,o.priceCurrency]),[['12.50','EUR'],['18.00','EUR']]);
  assert.ok(!JSON.stringify(data).includes('availability'));
  for(const key of ['aggregateRating','review','brand','gtin','shippingDetails']) assert.ok(!(key in product));
});
