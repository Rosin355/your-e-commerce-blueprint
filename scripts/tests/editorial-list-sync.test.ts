import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogAiAllowed, EDITORIAL_LIST_FIELDS, editorialListSyncRevision } from '../../supabase/functions/_shared/admin-catalog-policy.ts';
import { freshListSyncApproval, prepareCatalogApproval, withCatalogApproval } from '../../supabase/functions/_shared/admin-catalog-approvals.ts';
import { buildShopifyWritePlan, performVerifiedShopifyFieldWrite, readEditorialListTarget, type ShopifyGraphQL } from '../../supabase/functions/_shared/admin-v2-shopify-field-sync.ts';
import { payloadHash } from '../../supabase/functions/_shared/admin-v2-commands.ts';
import { serializeValueForShopify, resolveShopifyTarget } from '../../supabase/functions/_shared/admin-v2-field-policy.ts';
import type { AuthContext, FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types.ts';
const actor='10000000-0000-4000-8000-000000000001',productId='20000000-0000-4000-8000-000000000001',approvalId='30000000-0000-4000-8000-000000000001';
const auth=():AuthContext=>({userId:actor,roles:['editor'],catalogGrant:{enabled:true,capabilities:['edit','sync'],fieldKeys:[...EDITORIAL_LIST_FIELDS]}});
const env:Record<string,string>={PRODUCT_ADMIN_WRITES_ENABLED:'true',PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED:'true'};
Object.defineProperty(globalThis,'Deno',{value:{env:{get:(key:string)=>env[key]}},configurable:true});
const command=(key='key_benefits')=>({action:'sync_field',productId,fieldKey:key,expectedVersion:3,expectedShopifyHash:'a'.repeat(64),idempotencyKey:'40000000-0000-4000-8000-000000000001'});
const snapshot={syncRevision:editorialListSyncRevision('key_benefits'),internal:{version:3,value_json:['Secondo','Primo']},remoteValue:'["Vecchio"]'};
const target=(key='key_benefits')=>({kind:'metafield' as const,namespace:'custom',key,valueType:'json' as const});
function shop(options:{type?:string;missing?:boolean;noDef?:boolean;badDigest?:boolean;drift?:boolean;afterWrong?:boolean;failWrite?:boolean}={}){
 let value=options.missing?null:'["Vecchio"]',digest='before',writes=0,reads=0;const variables:Record<string,unknown>[]=[];
 const graphql:ShopifyGraphQL=async<T>(query,vars)=>{
  if(query.includes('mutation')){
   writes++;variables.push(vars!);if(options.failWrite)throw Error('synthetic timeout');
   const item=(vars!.metafields as Record<string,unknown>[])[0];
   assert.equal((vars!.metafields as unknown[]).length,1);assert.equal(item.compareDigest,options.missing?null:digest);
   if(options.drift)throw Error('synthetic compareDigest conflict');
   value=options.afterWrong?'["Riordinato"]':item.value as string;digest='after';
   return {metafieldsSet:{userErrors:[]}} as T;
  }
  reads++;return {product:{id:'gid://shopify/Product/123',metafield:value===null?null:{namespace:'custom',key:vars!.key,type:options.type??'json',value,compareDigest:options.badDigest?undefined:digest}},metafieldDefinitions:{nodes:options.noDef?[]:[{namespace:'custom',key:vars!.key,type:{name:options.type??'json'}}],pageInfo:{hasNextPage:false}}} as T;
 };
 return {graphql,variables,get writes(){return writes;},get reads(){return reads;}};
}
for(const key of EDITORIAL_LIST_FIELDS)for(const type of ['json','list.single_line_text_field'])test(key+' sync singolo campo tipizzato/CAS/readback ordinato '+type,async()=>{
 const def={key,publishable:true,shopify_mapping:{type:'metafield',namespace:'custom',key},editor_type:'multiselect',data_type:'json'} as FieldDefinition;
 const expected=serializeValueForShopify(def,['Secondo','Primo']);assert.equal(expected,'["Secondo","Primo"]');
 const fixture=shop({type});let checks=0;
 const result=await performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:resolveShopifyTarget(def)!,expected,previousVerifiedAt:null,previousVerifiedValue:null,expectedRemote:'["Vecchio"]',hasExpectedRemote:true,graphql:fixture.graphql,verifyBeforeWrite:async()=>{checks++;}});
 assert.equal(result.verifiedValue,expected);assert.equal(fixture.writes,1);assert.ok(checks>=1);
 const item=(fixture.variables[0].metafields as Record<string,unknown>[])[0];assert.equal(item.key,key);assert.equal(item.namespace,'custom');assert.equal(item.type,type);assert.equal(item.value,expected);assert.equal(item.compareDigest,'before');assert.equal('delete' in fixture.variables[0],false);
});
for(const options of [{noDef:true},{type:'single_line_text_field'},{badDigest:true}])test('definizione incompatibile/non verificabile blocca senza mutation '+JSON.stringify(options),async()=>{
 const fixture=shop(options);await assert.rejects(performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:target(),expected:'["Nuovo"]',previousVerifiedAt:null,previousVerifiedValue:null,graphql:fixture.graphql}),/non compatibile/);assert.equal(fixture.writes,0);
});
test('metafield assente viene creato solo con definizione verificata e compareDigest null',async()=>{
 const fixture=shop({missing:true});await performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:target(),expected:'["Nuovo"]',previousVerifiedAt:null,previousVerifiedValue:null,hasExpectedRemote:true,expectedRemote:null,graphql:fixture.graphql});assert.equal(fixture.writes,1);
});
test('cancellazioni implicite e valori non lista vengono respinti',async()=>{
 const fixture=shop();const read=await readEditorialListTarget('123',target(),fixture.graphql);
 for(const value of ['[]','null','{}','[""]','[1]'])assert.throws(()=>buildShopifyWritePlan({productId:'123',target:target(),value,resolvedTarget:read}));assert.equal(fixture.writes,0);
});
test('hash remoto cambiato e versione locale obsoleta impediscono mutation',async()=>{
 for(const local of [false,true]){
 const fixture=shop();await assert.rejects(performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:target(),expected:'["Nuovo"]',previousVerifiedAt:null,previousVerifiedValue:null,hasExpectedRemote:true,expectedRemote:local?'["Vecchio"]':'["Cambiato"]',graphql:fixture.graphql,verifyBeforeWrite:async()=>{throw Error('synthetic VERSION_CONFLICT');}}));assert.equal(fixture.writes,0);
 }
});
for(const options of [{drift:true},{afterWrong:true},{failWrite:true}])test('conflitto CAS/esito incerto/readback errato non causa retry '+JSON.stringify(options),async()=>{
 const fixture=shop(options);await assert.rejects(performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:target(),expected:'["Nuovo"]',previousVerifiedAt:null,previousVerifiedValue:null,graphql:fixture.graphql}));assert.equal(fixture.writes,1);
});
function database(state='PENDING',snap:Record<string,unknown>=snapshot){
 const row={request_key:command().idempotencyKey,id:approvalId,actor,action:'sync_field',target:productId,payload_hash:'',state,target_snapshot:snap,result:{ok:true},expires_at:new Date(Date.now()+600000).toISOString(),command:command()};let claimed=0;
 const db={from:()=>{let requestKey:unknown;const q={select:()=>q,eq:(key:string,value:unknown)=>{if(key==='request_key')requestKey=value;return q;},in:()=>q,insert:(data:Record<string,unknown>)=>{Object.assign(row,data);return q;},update:(data:Record<string,unknown>)=>{Object.assign(row,data);return q;},single:async()=>({data:row,error:null}),maybeSingle:async()=>({data:requestKey===row.request_key?row:null,error:null}),then:(resolve:(v:unknown)=>void)=>resolve({data:row.state==='REVIEW_REQUIRED'?[row]:[],error:null})};return q;},rpc:async()=>{if(claimed)return {data:false,error:null};claimed++;row.state='IN_FLIGHT';return {data:true,error:null};}};
 return {db:db as unknown as Parameters<typeof withCatalogApproval>[0],row};
}
test('revision server respinge vecchie approvazioni anche COMPLETE prima del replay',async()=>{
 assert.equal(freshListSyncApproval(command(),{}),false);assert.equal(freshListSyncApproval(command(),snapshot),true);assert.equal(freshListSyncApproval({...command(),fieldKey:'description'},{}),true);
 for(const state of ['PENDING','COMPLETE']){const f=database(state,{});f.row.payload_hash=await payloadHash(command());let calls=0;await assert.rejects(withCatalogApproval(f.db,auth(),{...command(),approvalId},async()=>{calls++;return new Response('{}');},async()=>snapshot));assert.equal(calls,0);}
});
test('grant/campo/gate negati e approvazione mancante non raggiungono dispatch',async()=>{
 for(const changed of [{catalogGrant:undefined},{roles:['publisher']},{catalogGrant:{...auth().catalogGrant!,fieldKeys:[]}},{catalogGrant:{...auth().catalogGrant!,capabilities:['edit']}}]){
 // prepare sempre verifica grant anche se una richiesta non raggiungerebbe il dispatch API.
 await assert.rejects(prepareCatalogApproval(database().db,{...auth(),...changed} as AuthContext,{command:command(),confirm:true},async()=>snapshot));
 }
 const f=database();f.row.payload_hash=await payloadHash(command());await assert.rejects(withCatalogApproval(f.db,auth(),command(),async()=>new Response('{}'),async()=>snapshot));
 env.PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED='false';try{await assert.rejects(prepareCatalogApproval(f.db,auth(),{command:command(),confirm:true},async()=>snapshot));}finally{env.PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED='true';}
});
test('nuova approvazione ricontrolla contenuto e claim atomico ammette un solo dispatch',async()=>{
 const f=database();f.row.payload_hash=await payloadHash(command());let writes=0;
 const execute=()=>withCatalogApproval(f.db,auth(),{...command(),approvalId},async()=>{writes++;return new Response('{"ok":true}');},async()=>snapshot);
 const results=await Promise.allSettled([execute(),execute()]);assert.equal(writes,1);assert.equal(results.filter(x=>x.status==='rejected').length,1);
 const replay=await execute();assert.equal((await replay.json()).replayed,true);assert.equal(writes,1);
 const changed=database();changed.row.payload_hash=await payloadHash(command());await assert.rejects(withCatalogApproval(changed.db,auth(),{...command(),approvalId},async()=>new Response('{}'),async()=>({...snapshot,internal:{version:4}})));
});
test('esito incerto blocca nuova approvazione anche con nuovo idempotency key',async()=>{
 const f=database('REVIEW_REQUIRED');await assert.rejects(prepareCatalogApproval(f.db,auth(),{command:{...command(),idempotencyKey:'50000000-0000-4000-8000-000000000001'},confirm:true},async()=>snapshot));
});
test('AI sei campi conservata e sync non parte da save/accept/open',()=>{
 assert.equal(catalogAiAllowed({...auth(),catalogGrant:{...auth().catalogGrant!,capabilities:['edit','sync','ai']}},'key_benefits'),true);
 assert.equal(catalogAiAllowed({...auth(),catalogGrant:{...auth().catalogGrant!,capabilities:['edit','sync','ai'],fieldKeys:['title']}},'title'),false);
 const field=readFileSync('src/adminv2/components/FieldCard.tsx','utf8');const save = field.slice(field.indexOf('const save ='), field.indexOf('const syncCurrentValue'));
 assert.match(save, /onCommand\(/); assert.doesNotMatch(save, /onSync|sync_field/);
 const api=readFileSync('supabase/functions/product-admin-api/index.ts','utf8');assert.match(api,/action === 'sync_field' && isEditorialList\(payload.fieldKey\)\) requireCatalog/);
});

test('nuova preparazione e conferma legano campo/prodotto/versione/contenuto e attore',async()=>{
 const f=database();const cmd={...command(),idempotencyKey:'60000000-0000-4000-8000-000000000001'};
 const prepared=await prepareCatalogApproval(f.db,auth(),{command:cmd,confirm:true},async()=>snapshot);assert.equal(prepared.approvalId,approvalId);assert.equal(f.row.target_snapshot.syncRevision,editorialListSyncRevision('key_benefits'));
 for(const change of [{fieldKey:'key_features'},{expectedVersion:4},{productId:'20000000-0000-4000-8000-000000000002'}])await assert.rejects(withCatalogApproval(f.db,auth(),{...cmd,...change,approvalId},async()=>new Response('{}'),async()=>snapshot));
 await assert.rejects(withCatalogApproval(f.db,{...auth(),userId:'10000000-0000-4000-8000-000000000002'},{...cmd,approvalId},async()=>new Response('{}'),async()=>snapshot));
 await assert.rejects(withCatalogApproval(f.db,auth(),{...cmd,approvalId},async()=>new Response('{}'),async()=>({...snapshot,internal:{...snapshot.internal,value_json:['Diverso']}})));
});
test('due scritture concorrenti stesso digest ammettono un solo aggiornamento',async()=>{
 const fixture=shop();const attempt=()=>performVerifiedShopifyFieldWrite({productId:'123',sku:'SYNTHETIC',target:target(),expected:'["Nuovo"]',previousVerifiedAt:null,previousVerifiedValue:null,graphql:fixture.graphql});
 const results=await Promise.allSettled([attempt(),attempt()]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
