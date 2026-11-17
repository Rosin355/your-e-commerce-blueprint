import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeEditorialList, encodeEditorialList } from '../../supabase/functions/_shared/editorial-list-codec.ts';
import { parseMultilineMetafield } from '../../src/components/storefront/pdpMetafields.ts';
import { performVerifiedShopifyFieldWrite, readEditorialListTarget, EDITORIAL_SYNC_API_VERSION, type ShopifyGraphQL } from '../../supabase/functions/_shared/admin-v2-shopify-field-sync.ts';
import { freshListSyncApproval } from '../../supabase/functions/_shared/admin-catalog-approvals.ts';
import { shopifyAdminGraphQL, shopifyAdminGraphQLAtVersion } from '../../supabase/functions/_shared/shopify-admin-client.ts';
const items=['Foglie & fiori — àèìòù 🌱','Una misura < del limite','Voce con "virgolette", \\ e tab\tinterna','Voce ripetuta','Voce ripetuta'];
for(const type of ['multi_line_text_field','json','list.single_line_text_field'])test('round-trip esatto, unicode, duplicati e ordine '+type,()=>{
 const wire=encodeEditorialList(JSON.stringify(items),type);assert.deepEqual(decodeEditorialList(wire,type),items);
 if(type==='multi_line_text_field'){assert.equal(wire,items.join('\n'));assert.deepEqual(parseMultilineMetafield({value:wire}),items);}
});
for(const raw of ['', '\nPrima','Prima\n','Prima\n\nSeconda',' Prima','Prima ','Prima\r\nSeconda','["Prima","Seconda"]','{"legacy":"test"}'])test('legacy ambiguo conservato/bloccato '+JSON.stringify(raw),()=>{
 assert.throws(()=>decodeEditorialList(raw,'multi_line_text_field'));
});
test('voce con newline non viene trasformata in due voci; spazi e vuoti non normalizzati',()=>{
 for(const value of [['Prima\nSeconda'],['Prima\rSeconda'],[' Prima'],['Prima '],['Prima',''],[]])assert.throws(()=>encodeEditorialList(JSON.stringify(value),'multi_line_text_field'));
 assert.deepEqual(decodeEditorialList('["Prima\\nSeconda"]','json'),['Prima\nSeconda']);
});
for(const key of ['key_features','special_bullets'])test('sync multi_line con CAS, readback raw esatto e storefront invariato '+key,async()=>{
 let value='Prima\nSeconda',writes=0;const gql:ShopifyGraphQL=async<T>(query,vars)=>{
  if(query.includes('mutation')){writes++;const input=(vars!.metafields as Record<string,unknown>[])[0];assert.equal(input.type,'multi_line_text_field');assert.equal(input.compareDigest,'digest-before');assert.equal(input.value,items.join('\n'));value=input.value as string;return {metafieldsSet:{userErrors:[]}} as T;}
  return {product:{id:'gid://shopify/Product/123',metafield:{namespace:'custom',key,type:'multi_line_text_field',value,compareDigest:writes?'digest-after':'digest-before'}},metafieldDefinitions:{nodes:[{namespace:'custom',key,type:{name:'multi_line_text_field'}}],pageInfo:{hasNextPage:false}}} as T;
 };
 const result=await performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:{kind:'metafield',namespace:'custom',key,valueType:'json'},expected:JSON.stringify(items),previousVerifiedAt:null,previousVerifiedValue:null,hasExpectedRemote:true,expectedRemote:value,graphql:gql});
 assert.equal(writes,1);assert.equal(result.verifiedValue,items.join('\n'));assert.deepEqual(parseMultilineMetafield({value}),items);
 const noWrite=await performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:{kind:'metafield',namespace:'custom',key,valueType:'json'},expected:JSON.stringify(items),previousVerifiedAt:null,previousVerifiedValue:null,hasExpectedRemote:true,expectedRemote:value,graphql:gql});assert.equal(noWrite.writePerformed,false);assert.equal(writes,1);
});
test('readback che normalizza righe non viene accettato come successo',async()=>{
 let writes=0;const key='key_features';const gql:ShopifyGraphQL=async<T>(query)=>{
 if(query.includes('mutation')){writes++;return {metafieldsSet:{userErrors:[]}} as T;}
 return {product:{id:'gid://shopify/Product/123',metafield:{namespace:'custom',key,type:'multi_line_text_field',value:writes?'Prima\n\nSeconda':'Vecchio',compareDigest:'digest'}},metafieldDefinitions:{nodes:[{namespace:'custom',key,type:{name:'multi_line_text_field'}}],pageInfo:{hasNextPage:false}}} as T;
 };
 await assert.rejects(performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:{kind:'metafield',namespace:'custom',key,valueType:'json'},expected:'["Prima","Seconda"]',previousVerifiedAt:null,previousVerifiedValue:null,graphql:gql}));assert.equal(writes,1);
});
test('key_benefits senza definizione resta bloccato, nessuna auto-creazione',async()=>{
 let calls=0;const gql:ShopifyGraphQL=async<T>()=>{calls++;return {product:{id:'gid://shopify/Product/123',metafield:null},metafieldDefinitions:{nodes:[],pageInfo:{hasNextPage:false}}} as T;};
 await assert.rejects(readEditorialListTarget('123',{kind:'metafield',namespace:'custom',key:'key_benefits',valueType:'json'},gql));assert.equal(calls,1);
});
test('approvazioni pre-adattatore negate dalla nuova revisione server',()=>{
 const policy=readFileSync('supabase/functions/_shared/admin-catalog-policy.ts','utf8');assert.match(policy,/editorial-list-sync-v2/);assert.doesNotMatch(policy,/editorial-list-sync-v1/);assert.equal(freshListSyncApproval({action:'sync_field',fieldKey:'key_features'},{syncRevision:'editorial-list-sync-v1'}),false);
});
test('API editoriale pinned supportata, mismatch header blocca, client preesistente invariato',async()=>{
 const originalFetch=globalThis.fetch;const prior=Object.getOwnPropertyDescriptor(globalThis,'Deno');const endpoints:string[]=[];
 Object.defineProperty(globalThis,'Deno',{value:{env:{get:(key:string)=>({SHOPIFY_ADMIN_API_TOKEN:'SYNTHETIC-NOT-A-SECRET',SHOPIFY_STORE_PERMANENT_DOMAIN:'synthetic.myshopify.com',SHOPIFY_ADMIN_API_VERSION:'2025-07'}[key])}},configurable:true});
 try {
  globalThis.fetch=async(input)=>{endpoints.push(String(input));return new Response('{"data":{"synthetic":true}}',{headers:{'X-Shopify-API-Version':'2026-10'}});};
  assert.equal(EDITORIAL_SYNC_API_VERSION,'2026-10');await shopifyAdminGraphQLAtVersion(EDITORIAL_SYNC_API_VERSION,'query { shop { name } }',{},true);assert.ok(endpoints[0].includes('/2026-10/'));
  await shopifyAdminGraphQL('query { shop { name } }');assert.ok(endpoints[1].includes('/2025-07/'));
  globalThis.fetch=async()=>new Response('{"data":{}}',{headers:{'X-Shopify-API-Version':'2026-07'}});
  await assert.rejects(shopifyAdminGraphQLAtVersion(EDITORIAL_SYNC_API_VERSION,'query { shop { name } }',{},true),/non verificata/);
  globalThis.fetch=async()=>new Response('{"data":{}}');await assert.rejects(shopifyAdminGraphQLAtVersion(EDITORIAL_SYNC_API_VERSION,'query { shop { name } }',{},true),/non verificata/);
 }finally{globalThis.fetch=originalFetch;if(prior)Object.defineProperty(globalThis,'Deno',prior);else Reflect.deleteProperty(globalThis,'Deno');}
});
