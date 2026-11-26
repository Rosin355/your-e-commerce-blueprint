import assert from 'node:assert/strict';
import { assetAllowed, readAssetState, assetView } from '../../supabase/functions/_shared/admin-catalog-assets.ts';
import { handleCatalogCommerce } from '../../supabase/functions/_shared/admin-catalog-commerce.ts';
import type { AuthContext } from '../../supabase/functions/_shared/admin-v2-types.ts';
const auth:AuthContext={userId:'synthetic',roles:['editor'],catalogGrant:{enabled:true,capabilities:['sync','images','prices'],fieldKeys:['product_gallery','product_formats']}};
const id='gid://shopify/Product/100';
const variant=(i:number)=>({id:'v'+i,sku:'s'+i,price:'10',selectedOptions:[{name:'Formato',value:'Vaso '+i}],media:{nodes:[],pageInfo:{hasNextPage:false}}});
Deno.test('lettura immagini e formati Editor richiede tutte le capability esistenti',()=>{
 for(const action of ['get_product_gallery','get_product_formats']){
  assert.equal(assetAllowed(auth,action),true);
  for (const missing of ['sync', action === 'get_product_gallery' ? 'images' : 'prices']) assert.equal(assetAllowed({...auth,catalogGrant:{enabled:true,capabilities:['sync','images','prices'].filter(c => c !== missing),fieldKeys:['product_gallery','product_formats']}},action),false);
  for(const fieldKeys of [[],[action==='get_product_gallery'?'product_formats':'product_gallery']])assert.equal(assetAllowed({...auth,catalogGrant:{...auth.catalogGrant,enabled:true,capabilities:['sync','images','prices'],fieldKeys}},action),false);
 }
});
Deno.test('handler nega capability mancante prima di contattare DB o Shopify',async()=>{
 const db={from(){throw Error('provider must remain closed');}};
 for(const action of ['get_product_gallery','get_product_formats','set_catalog_image','rename_catalog_format'])await assert.rejects(handleCatalogCommerce(db as never,{...auth,catalogGrant:undefined},{action,productId:'20000000-0000-4000-8000-000000000001'}),{code:'FORBIDDEN'});
});
Deno.test('letture paginate non richiedono inventario, spedizione o mutation',async()=>{
 let calls=0;
 const request=async<T>(query:string,variables:Record<string,unknown>)=>{
  assert.doesNotMatch(query,/mutation|deliveryProfile|inventoryQuantity|inventoryItem/);calls++;
  const last=calls===2;
  assert.equal(variables.mediaAfter,last?'next':null);
  return {product:{id,updatedAt:'v1',options:[{id:'o',name:'Formato',optionValues:[{id:'f',name:'Vaso'}]}],media:{nodes:[{id:'m'+calls,status:'READY',alt:'Foto',image:{url:'https://example.test/image.jpg'}}],pageInfo:{hasNextPage:!last,endCursor:last?null:'next'}},variants:{nodes:Array.from({length:last?1:100},(_,i)=>variant((calls-1)*100+i)),pageInfo:{hasNextPage:!last,endCursor:last?null:'next'}}}} as T;
 };
 const state=await readAssetState(id,true,request);assert.equal(calls,2);assert.equal(state.variants.nodes.length,101);assert.equal(state.media.nodes.length,2);
 const gallery=assetView(state,'get_product_gallery');assert.equal(gallery.images?.length,2);assert.equal(gallery.canModify,false);
 const formats=assetView(state,'get_product_formats');assert.equal(formats.variants?.length,101);assert.equal(formats.canModify,false);
});
Deno.test('snapshot scrittura conserva blocco sui limiti, non usa lettura permissiva',async()=>{
 const request=async<T>()=>({product:{id,updatedAt:'v1',options:[],media:{nodes:[],pageInfo:{hasNextPage:true}},variants:{nodes:[variant(0)],pageInfo:{hasNextPage:false}}}} as T);
 await assert.rejects(readAssetState(id,false,request),{code:'VALIDATION_ERROR'});
});
Deno.test('prodotto cambiato tra pagine o cursore bloccato non consente aggiornamenti',async()=>{
 const request=async<T>()=>({product:{id,updatedAt:'v1',options:[],media:{nodes:[],pageInfo:{hasNextPage:true,endCursor:null}},variants:{nodes:[variant(0)],pageInfo:{hasNextPage:false,endCursor:null}}}} as T);
 await assert.rejects(readAssetState(id,true,request),{code:'VALIDATION_ERROR'});
});
Deno.test('handler reale: Editor legge immagini e varianti con provider chiuso; nessuna scrittura',async()=>{
 const oldFetch=globalThis.fetch,oldToken=Deno.env.get('SHOPIFY_ADMIN_API_TOKEN');let writes=0,queries=0;
 Deno.env.set('SHOPIFY_ADMIN_API_TOKEN','synthetic-closed-token');
 globalThis.fetch=async(_input,init)=>{
  const {query}=JSON.parse(String(init?.body));queries++;
  if(query.includes('mutation')){writes++;throw Error('mutation forbidden');}
  assert.doesNotMatch(query,/deliveryProfile|inventoryItem|inventoryQuantity/);
  const data=query.includes('AdminFamilyIdentity')?{productVariants:{nodes:[{sku:'s0',product:{id}}],pageInfo:{hasNextPage:false}}}:{product:{id,updatedAt:'v1',options:[{id:'o',name:'Formato',optionValues:[{id:'f',name:'Vaso'}]}],media:{nodes:[{id:'m1',status:'READY',alt:'Foto sintetica',image:{url:'https://example.test/image.jpg'}}],pageInfo:{hasNextPage:false,endCursor:null}},variants:{nodes:[variant(0)],pageInfo:{hasNextPage:false,endCursor:null}}}};
  return Response.json({data},{headers:{'X-Shopify-API-Version':'2026-10'}});
 };
 const db={from(table:string){const chain={select(){return chain;},eq(){return chain;},maybeSingle:async()=>({data:table==='products'?{id:'20000000-0000-4000-8000-000000000001',sku:'s0',entity_type:'simple'}:table==='product_sync_csv_products'?{shopify_product_id:id}:null,error:null})};return chain;}};
 try{
  const gallery=await handleCatalogCommerce(db as never,auth,{action:'get_product_gallery',productId:'20000000-0000-4000-8000-000000000001'});
  assert.equal((gallery as {images:unknown[]}).images.length,1);
  const formats=await handleCatalogCommerce(db as never,auth,{action:'get_product_formats',productId:'20000000-0000-4000-8000-000000000001'});
  assert.equal((formats as {variants:unknown[]}).variants.length,1);assert.equal(queries,4);assert.equal(writes,0);
 }finally{globalThis.fetch=oldFetch;if(oldToken===undefined)Deno.env.delete('SHOPIFY_ADMIN_API_TOKEN');else Deno.env.set('SHOPIFY_ADMIN_API_TOKEN',oldToken);}
});
