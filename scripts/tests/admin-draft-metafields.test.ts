import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonDraftPlan, planDraftMetafields, planDraftMetafieldsForComparison, requireDraftBotanicalReview, verifyAdminDraftFields, verifyDraftMetafields } from '../../supabase/functions/_shared/admin-draft-metafields.ts';
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
test('confronto read-only mantiene i valori esistenti senza esigere nuove conferme',async()=>{
 const d=draft({nome_botanico:'Specie'});delete d.botanicalConfirmedKeys;
 const before=JSON.stringify(d);
 const plan=planDraftMetafieldsForComparison(d,[def('nome_botanico')]);
 const result=await verifyDraftMetafields('gid://shopify/Product/1',plan,async <T>()=>({product:{id:'gid://shopify/Product/1',metafields:{nodes:[{namespace:'custom',key:'nome_botanico',type:'single_line_text_field',value:'Specie'}],pageInfo:{hasNextPage:false}}}} as T),true);
 assert.equal(result[0].value,'Specie');assert.equal(JSON.stringify(d),before);
});
test('confronto lista legge solo encodings ammessi, senza nuova definizione o conversione remota',async()=>{
 const plan=planDraftMetafieldsForComparison(draft({key_features:['Sempreverde','Crescita lenta']}),[def('key_features','json','multiselect')]);
 for(const type of ['multi_line_text_field','rich_text_field']){
  const read=async <T>()=>({product:{id:'gid://shopify/Product/1',metafields:{nodes:[{namespace:'custom',key:'key_features',type,value:'Sempreverde\nCrescita lenta'}],pageInfo:{hasNextPage:false}}}} as T);
  if(type==='rich_text_field')await assert.rejects(()=>verifyDraftMetafields('gid://shopify/Product/1',plan,read,true));
  else assert.equal((await verifyDraftMetafields('gid://shopify/Product/1',plan,read,true))[0].type,type);
 }
});
test('rilettura Admin verifica testo e FAQ anche con ordine delle proprietà JSON diverso',()=>{
 const productId='local';const faq=[{question:'Domanda?',answer:'Risposta.'}];
 const requested=[{key:'nome_botanico',text:'Specie'},{key:'faq',json:faq}];
 const rows=[{product_id:productId,field_key:'nome_botanico',value_text:'Specie',value_json:null,value_number:null},{product_id:productId,field_key:'faq',value_text:null,value_json:[{answer:'Risposta.',question:'Domanda?'}],value_number:null}];
 assert.deepEqual(verifyAdminDraftFields(productId,requested,rows).map(row=>row.state),['VERIFIED_ADMIN','VERIFIED_ADMIN']);
});
test('salvataggio Admin parziale non equivale a tutti i campi verificati',()=>{
 assert.throws(()=>verifyAdminDraftFields('local',[{key:'periodo_di_fioritura',json:['Giugno']}],[]));
});
test('rilettura Admin di un’altra identità o con valori diversi viene rifiutata',()=>{
 for(const productId of ['local','other'])assert.throws(()=>verifyAdminDraftFields('local',[{key:'nome_botanico',text:'Specie'}],[{product_id:productId,field_key:'nome_botanico',value_text:'Diversa',value_json:null,value_number:null}]));
});
test('FAQ: ordine delle proprietà irrilevante, ordine delle domande e valori significativi',async()=>{
  const faq = [{question:'Prima?',answer:'A'},{question:'Seconda?',answer:'B'}];
  const plan = await planDraftMetafields(draft({faq}),[def('faq','json','json',{type:'metafield',namespace:'custom',key:'faq_prodotto'})],gql([{key:'faq_prodotto',type:'json'}]));
  const read = (items:unknown) => verifyDraftMetafields('product',plan,async<T>()=>({product:{id:'product',metafields:{nodes:[{...plan[0],value:JSON.stringify(items)}],pageInfo:{hasNextPage:false}}}} as T));
  assert.equal((await read(faq.map(({question,answer})=>({answer,question}))))[0].state,'VERIFIED');
  await assert.rejects(()=>read([...faq].reverse()));
  await assert.rejects(()=>read([{question:'Prima?',answer:'B'},faq[1]]));
});

test('ricevuta di tre campi: corretto, valore diverso e assente; nessun successo globale',async()=>{
  const plan = ['nome_botanico','nome_comune','difficolta_di_coltivazione'].map(fieldKey=>({fieldKey,namespace:'custom',key:fieldKey,type:'single_line_text_field',value:'Valore'}));
  const read = async<T>() => ({product:{id:'product',metafields:{nodes:[plan[0],{...plan[1],value:'Altro'}],pageInfo:{hasNextPage:false}}}} as T);
  await assert.rejects(()=>verifyDraftMetafields('product',plan,read), (error: {details?:{metafieldVerification?:{fieldKey:string;state:string}[]}}) => {
    assert.deepEqual(error.details?.metafieldVerification?.map(r=>[r.fieldKey,r.state]),plan.map((r,i)=>[r.fieldKey,i===0?'VERIFIED':'NOT_VERIFIED']));
    return true;
  });
  await assert.rejects(()=>verifyDraftMetafields('product',plan,async()=>{throw Error('rete');}), (error: {details?:{metafieldVerification?:{state:string}[]}}) => {
    assert.deepEqual(error.details?.metafieldVerification?.map(r=>r.state),['UNREAD','UNREAD','UNREAD']);
    return true;
  });
});

test('preflight PRODUCT rifiuta owner variante nel registro e nella definizione e testi monoriga con CR o LF',async()=>{
  const field=def('nome_botanico'), item={key:field.key,type:'single_line_text_field'};
  for(const value of ['Uno\nDue','Uno\rDue','Uno\n','\rDue']) await assert.rejects(()=>planDraftMetafields(draft({nome_botanico:value}),[field],gql([item])),/una sola riga/);
  const variant:FieldDefinition={...field,applies_to:'variant'};
  await assert.rejects(()=>planDraftMetafields(draft({nome_botanico:'Test'}),[variant],gql([item])),/mapping/);
  assert.throws(()=>planDraftMetafieldsForComparison(draft({nome_botanico:'Test'}),[variant]));
  await assert.rejects(()=>planDraftMetafields(draft({nome_botanico:'Test'}),[field],async<T>()=>({metafieldDefinitions:{nodes:[{namespace:'custom',key:field.key,type:{name:item.type},ownerType:'PRODUCTVARIANT',access:{storefront:'PUBLIC_READ'}}],pageInfo:{hasNextPage:false}}} as T)),/Owner/);
});

test('preflight aggregato e recovery verificano anche i campi con mapping ancora utilizzabile',async()=>{
  const item = draft({nome_botanico:'Specie',nome_comune:'Altro',difficolta_di_coltivazione:'Media'});
  const defs = [def('nome_botanico'),{...def('nome_comune'),applies_to:'variant' as const}];
  const check = (states:string[]) => (err: {details?:{metafieldVerification?:{state:string}[]}}) => {
    assert.deepEqual(err.details?.metafieldVerification?.map(row=>row.state),states);
    return true;
  };
  await assert.rejects(()=>planDraftMetafields(item,defs,gql([{key:'nome_botanico',type:'single_line_text_field'}])),check(['UNREAD','BLOCKED','BLOCKED']));
  const {fields,blocked} = comparisonDraftPlan(item,defs);
  const remote = async <T>() => ({product:{id:'p',metafields:{nodes:fields,pageInfo:{hasNextPage:false}}}} as T);
  await assert.rejects(()=>verifyDraftMetafields('p',fields,remote,true,blocked),check(['VERIFIED','BLOCKED','BLOCKED']));
});

test('curiosità manuale confermata richiede il mapping esatto e il tipo Shopify verificato',async()=>{
  const field:FieldDefinition={...def('curiosita','text','textarea'),manual_only:true,field_group:'botanical',applies_to:'both'};
  const value='Il margine della foglia presenta filamenti.';
  const input=draft({curiosita:value});
  const definitions=gql([{key:'curiosita',type:'multi_line_text_field'}]);
  const plan=await planDraftMetafields(input,[field],definitions);
  assert.deepEqual(plan,[{fieldKey:'curiosita',namespace:'custom',key:'curiosita',type:'multi_line_text_field',value}]);
  const read = (remote:string) => async <T>() => ({product:{id:'fixture',metafields:{
    nodes:[{...plan[0],value:remote}],pageInfo:{hasNextPage:false}}}} as T);
  assert.equal((await verifyDraftMetafields('fixture',plan,read(value)))[0].state,'VERIFIED');
  await assert.rejects(()=>verifyDraftMetafields('fixture',plan,read('Un valore diverso.')));
  for(const wrong of [{manual_only:false},{field_group:'system'},{shopify_mapping:{type:'metafield',namespace:'custom',key:'altro'}},{publishable:false}]) {
    await assert.rejects(()=>planDraftMetafields(input,[{...field,...wrong}],definitions),/mapping/);
  }
  await assert.rejects(()=>planDraftMetafields(input,[field],gql([{key:'curiosita',type:'json'}])),/incompatibile/);
  await assert.rejects(()=>planDraftMetafields({...input,botanicalConfirmedKeys:[]},[field],definitions),/Conferma/);
});
