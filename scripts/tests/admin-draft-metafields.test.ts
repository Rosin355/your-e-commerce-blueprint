import test from 'node:test';
import assert from 'node:assert/strict';
import { planDraftMetafields, requireDraftBotanicalReview, verifyDraftMetafields } from '../../supabase/functions/_shared/admin-draft-metafields.ts';
import { validateDraft, type ProductDraft } from '../../supabase/functions/_shared/admin-operational-core.ts';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types.ts';
import { draftErrors } from '../../src/adminv2/lib/newDraft.ts';

const draft = (botanical: Record<string,unknown> = {}):ProductDraft => ({title:'Sintetico',sku:'QA-META',description:'Descrizione sintetica',currency:'EUR',vendor:'',tags:[],categoryIds:[],images:[],seoTitle:'',seoDescription:'',variants:[{sku:'QA-META',price:'14.60',compareAtPrice:null,option:'Unico'}],botanical,botanicalConfirmedKeys:Object.keys(botanical)});
const def=(key:string,data_type='text',editor_type='text',mapping:Record<string,unknown>={type:'metafield',namespace:'custom',key})=>({key,label:key,visible:true,editable:true,publishable:true,manual_only:false,data_type,editor_type,shopify_mapping:mapping} as FieldDefinition);
const gql=(definitions:{key:string;type:string;access?:string}[])=>async <T>(query:string)=>{
  assert.ok(query.startsWith('query '));
  return {metafieldDefinitions:{nodes:definitions.map(d=>({namespace:'custom',key:d.key,type:{name:d.type},access:{storefront:d.access??'PUBLIC_READ'}})),pageInfo:{hasNextPage:false,endCursor:null}}} as T;
};

test('metafield testuale richiesto non viene omesso',async()=>{
 const plan=await planDraftMetafields(draft({nome_botanico:'Specie sintetica'}),[def('nome_botanico')],gql([{key:'nome_botanico',type:'single_line_text_field'}]));
 assert.deepEqual(plan,[{fieldKey:'nome_botanico',namespace:'custom',key:'nome_botanico',type:'single_line_text_field',value:'Specie sintetica'}]);
});
test('FAQ strutturata conserva domande/risposte e tipo JSON',async()=>{
 const value=[{question:'Informazione confermata?',answer:'Risposta sintetica verificata.'}];
 const plan=await planDraftMetafields(draft({faq:value}),[def('faq','json','json',{type:'metafield',namespace:'custom',key:'faq_prodotto'})],gql([{key:'faq_prodotto',type:'json'}]));
 assert.equal(plan[0].value,JSON.stringify(value));assert.equal(plan[0].type,'json');
});
test('campo non mappato fallisce esplicitamente',async()=>{
 await assert.rejects(()=>planDraftMetafields(draft({nome_botanico:'Specie sintetica'}),[def('nome_botanico','text','text',{})],gql([])),/mapping/);
});
test('tipo incompatibile non viene indovinato o convertito',async()=>{
 await assert.rejects(()=>planDraftMetafields(draft({periodo_di_fioritura:['Giugno','Luglio']}),[def('periodo_di_fioritura','array','multiselect')],gql([{key:'periodo_di_fioritura',type:'json'}])),/incompatibile/);
});
test('botanica senza conferma individuale blocca prima delle letture',async()=>{
 const d=draft({periodo_di_fioritura:['Giugno']});delete d.botanicalConfirmedKeys;let reads=0;
 await assert.rejects(()=>planDraftMetafields(d,[def('periodo_di_fioritura')],async <T>()=>{reads++;return {} as T;}),/Conferma la fonte/);
 assert.equal(reads,0);assert.throws(()=>requireDraftBotanicalReview(d),/Conferma la fonte/);
 assert.ok(draftErrors(d,[def('periodo_di_fioritura','array','multiselect')]).periodo_di_fioritura);
});
test('campo senza fonte rimane assente, non viene dedotto dai fatti o titolo',async()=>{
 const d=draft();const plan=await planDraftMetafields(d,[],async <T>()=>{throw new Error('Lettura inattesa');return {} as T;});
 assert.deepEqual(plan,[]);assert.deepEqual(d.botanical,{});
});
test('conferme spurie o duplicate non superano il contratto',()=>{
 assert.throws(()=>validateDraft({...draft(),botanicalConfirmedKeys:['periodo_di_raccolta']}),/Conferme/);
 assert.throws(()=>validateDraft({...draft({nome_botanico:'Specie'}),botanicalConfirmedKeys:['nome_botanico','nome_botanico']}),/Conferme/);
});
test('definizione non leggibile pubblicamente blocca il campo, non cambia accessi',async()=>{
 await assert.rejects(()=>planDraftMetafields(draft({nome_botanico:'Specie'}),[def('nome_botanico')],gql([{key:'nome_botanico',type:'single_line_text_field',access:'NONE'}])),/non leggibile/);
});
test('definizioni paginate: pagina parziale non equivale a registro completo',async()=>{
 let reads=0;
 const plan=await planDraftMetafields(draft({nome_botanico:'Specie'}),[def('nome_botanico')],async <T>(_q:string,v:Record<string,unknown>)=>{
  reads++;assert.equal(v.after,reads===1?null:'page2');
  return {metafieldDefinitions:{nodes:reads===1?[]:[{namespace:'custom',key:'nome_botanico',type:{name:'single_line_text_field'},access:{storefront:'PUBLIC_READ'}}],pageInfo:{hasNextPage:reads===1,endCursor:reads===1?'page2':null}}} as T;
 });assert.equal(reads,2);assert.equal(plan[0].value,'Specie');
});
test('rilettura parziale/mancante non dichiara VERIFIED',async()=>{
 const plan=await planDraftMetafields(draft({nome_botanico:'Specie'}),[def('nome_botanico')],gql([{key:'nome_botanico',type:'single_line_text_field'}]));
 await assert.rejects(()=>verifyDraftMetafields('gid://shopify/Product/1',plan,async <T>()=>({product:{id:'gid://shopify/Product/1',metafields:{nodes:[],pageInfo:{hasNextPage:false}}}} as T)),/non verificato/);
});
for(const type of ['json','list.single_line_text_field','multi_line_text_field'])test('liste usano il tipo realmente definito: '+type,async()=>{
 const plan=await planDraftMetafields(draft({key_features:['Sempreverde','Crescita lenta']}),[def('key_features','json','multiselect')],gql([{key:'key_features',type}]));
 assert.equal(plan[0].type,type);assert.equal(plan[0].value,type==='multi_line_text_field'?'Sempreverde\nCrescita lenta':'["Sempreverde","Crescita lenta"]');
});