import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedFacts, authorizeConfirmedAi, generateConfirmedProposal } from '../../supabase/functions/_shared/admin-ai-confirmed';
import { generateDraftSheet } from '../../supabase/functions/product-admin-ai/draft-sheet';
import { callAiProvider } from '../../supabase/functions/product-admin-ai/provider';
import type { AuthContext, FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';
const facts=['Il fiore ha petali di colore rosso.','La confezione contiene cinque bulbi.'];
const def:FieldDefinition={key:'description',label:'Descrizione',editor_type:'richtext',data_type:'text',field_group:'main',visible:true,editable:true,manual_only:false,ai_allowed:true,publishable:true,required:false,protected_on_reimport:true,applies_to:'product',sort_order:1,help_text:null,validation_rules:{},review_policy:'manual_review'};
const auth:AuthContext={userId:'synthetic',roles:['editor'],catalogGrant:{enabled:true,capabilities:['ai','edit'],fieldKeys:['description']}};
const prose=()=>({sections:[{heading:'Introduzione',text:'Il colore **rosso** dei petali dà risalto a questo fiore nella scheda del prodotto.',factIndices:[0]},{heading:'Caratteristiche principali',text:'La confezione proposta comprende cinque bulbi, come indicato nelle informazioni confermate.',factIndices:[1]}],missingInformation:['coltivazione']});

test('fatti vuoti, insufficienti, non confermati, personali o HTML non chiamano provider',()=>{
 for(const value of [[],['corto'],['<p>Testo fattuale confermato</p>'],['Contatto sintetico nome@example.test'],Array(13).fill(facts[0])]) assert.throws(()=>confirmedFacts(value,true));
 assert.throws(()=>confirmedFacts(facts,false));assert.deepEqual(confirmedFacts(facts,true),facts);
});
for(const change of [{roles:['publisher']},{catalogGrant:undefined},{catalogGrant:{...auth.catalogGrant,capabilities:['edit']}},{catalogGrant:{...auth.catalogGrant,capabilities:['ai']}},{catalogGrant:{...auth.catalogGrant,fieldKeys:[]}}])test('grant negativo '+JSON.stringify(change),()=>{
 assert.throws(()=>authorizeConfirmedAi({...auth,...change} as AuthContext,def,'suggest_confirmed_field'));
});
test('azione, campo protetto e ai_allowed sono verificati indipendentemente dal browser',()=>{
 authorizeConfirmedAi(auth,def,'suggest_confirmed_field');for(const d of [{...def,ai_allowed:false},{...def,manual_only:true},{...def,key:'price'},{...def,editable:false}])assert.throws(()=>authorizeConfirmedAi(auth,d,'suggest_confirmed_field'));
 assert.throws(()=>authorizeConfirmedAi(auth,def,'publish'));
});
test('proposta realmente generata, separata dai fatti e formattata',async()=>{
 let calls=0;const original=JSON.stringify(facts);
 const result=await generateConfirmedProposal(def,facts,async(strategy,ctx)=>{calls++;assert.equal(strategy.id,'verified-editorial-description');assert.equal(ctx.currentValue,facts.join('\n'));return {value:prose()};});
 assert.equal(calls,1);assert.equal(result.source,'model');assert.equal(JSON.stringify(facts),original);
 assert.match(String(result.value),/<h2>Caratteristiche principali<\/h2>/);assert.match(String(result.value),/<strong>rosso<\/strong>/);
 assert.deepEqual('missingInformation' in result?result.missingInformation:[],['coltivazione']);
});
test('provider riceve lo schema strutturato e non uno schema di copia/riordino',async()=>{
 let calls=0;
 const result=await generateConfirmedProposal(def,facts,async(s,c)=>callAiProvider(s,c,{apiKey:'synthetic',model:'synthetic',timeoutMs:12000,fetchImpl:async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));assert.equal(body.max_tokens,2000);
  assert.ok(body.tools[0].function.parameters.properties.suggested_value.properties.sections);
  assert.match(body.messages[0].content,/Rielabora realmente/);
  assert.doesNotMatch(body.messages[0].content,/Non includere HTML o markdown|"suggested_value":"testo"/);
  assert.deepEqual(JSON.parse(body.messages[1].content).facts,facts.map((text,index)=>({index,text})));
  return Response.json({choices:[{message:{tool_calls:[{function:{name:'propose_field_improvement',arguments:JSON.stringify({suggested_value:prose()})}}]}}]});
 }}));assert.equal(calls,1);assert.equal(result.source,'model');
});
test('liste restano estrattive: nessuna espansione implicita della capability',async()=>{
 const d={...def,key:'key_features',editor_type:'multiselect',data_type:'json'};assert.deepEqual(await generateConfirmedProposal(d,facts,async()=>({value:[facts[1],facts[0]]})),{source:'model', value:[facts[1],facts[0]]});
 await assert.rejects(generateConfirmedProposal(d,facts,async()=>({value:['Una caratteristica inventata']})),{code:'INVALID_MODEL_PROPOSAL'});
});
test('copia input, ordine di indici e output vuoto sono errori, mai fallback riusciti',async()=>{
 for(const value of [facts.join('\n'),[1,0],null,{},[],{...prose(),sections:facts.map((text,i)=>({heading:i?'Caratteristiche principali':'Introduzione',text,factIndices:[i]}))}])
  await assert.rejects(generateConfirmedProposal(def,facts,async()=>({value})),{code:'INVALID_MODEL_PROPOSAL'});
});
for(const invented of ['Altezza 120 cm.','Il fiore è non tossico.','La pianta è rustica e certificata biologica.','Ideale per contesti paesaggistici.','<script>alert(1)</script>'])test('rifiuta affermazione non supportata '+invented,async()=>{
 const value=prose();value.sections[0].text += ' '+invented;
 const result=await generateConfirmedProposal(def,facts,async()=>({value}));
 assert.ok('descriptionIssues' in result && result.descriptionIssues.some(i=>i.code==='UNSUPPORTED_FACT' || i.code==='FORMAT_ERROR'));
 assert.doesNotMatch(String(result.value),new RegExp(invented.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
test('non omette negazioni né fatti non citati',async()=>{
 const value=prose();value.sections[0].factIndices=[];
 const result=await generateConfirmedProposal(def,facts,async()=>({value}));
 assert.ok('descriptionIssues' in result && result.descriptionIssues.some(i=>i.code==='INCOMPLETE_RESPONSE'));
 assert.doesNotMatch(String(result.value),/petali/);
 const negative=await generateConfirmedProposal(def,['La scheda non attesta rusticità.',facts[1]],async()=>({value:prose()}));
 assert.ok('descriptionIssues' in negative && negative.descriptionIssues.some(i=>i.code==='UNSUPPORTED_FACT'));
});
test('plain text non contiene markup; richtext sanitizzato e limiti rispettati',async()=>{
 const result=await generateConfirmedProposal({...def,editor_type:'textarea'},facts,async()=>({value:prose()}));
 assert.doesNotMatch(String(result.value),/<|\*\*/);
 await assert.rejects(generateConfirmedProposal({...def,validation_rules:{maxLength:15}},facts,async()=>({value:prose()})),{code:'INVALID_MODEL_PROPOSAL'});
});
test('errore provider resta errore, non altera input né produce proposta Shopify',async()=>{
 let called=0;await assert.rejects(generateConfirmedProposal(def,facts,async()=>{called++;throw Error('synthetic provider unavailable');}),/synthetic provider unavailable/);assert.equal(called,1);
});
test('nuova bozza genera descrizione anche senza campi editoriali aggiuntivi',async()=>{
 let descriptions=0,selections=0;
 const result=await generateDraftSheet(def,facts,'Fiore',[],[],async()=>{descriptions++;return {value:prose(),provider:'lovable',model:'synthetic',usageTokens:null};},async()=>{selections++;throw Error('should not call');});
 assert.equal(descriptions,1);assert.equal(selections,0);assert.equal(result.source,'model');assert.deepEqual(result.editorial,{});
});
test('Yucca estesa: coltivazione solo citata, negazioni conservate, nessun beneficio inventato',async()=>{
 const lines=['Yucca rostrata ha foglie strette blu-verdi.','Sono confermati sole e terreno ben drenato.','Non è confermata la resistenza al gelo.'];
 const output={sections:[{heading:'Introduzione',text:'Il fogliame della Yucca rostrata si distingue per le foglie strette dal colore blu-verde.',factIndices:[0]},{heading:'Coltivazione e manutenzione',text:'Per la coltivazione, le indicazioni verificate riportano sole e un terreno ben drenato. La resistenza al gelo non è confermata.',factIndices:[1,2]}],missingInformation:['dimensioni']};
 const result=await generateConfirmedProposal(def,lines,async()=>({value:output}));
 assert.match(String(result.value),/Coltivazione e manutenzione/);assert.match(String(result.value),/non è confermata/);
 assert.doesNotMatch(String(result.value),/purifica|certificata|120/);
});
