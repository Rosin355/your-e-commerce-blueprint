import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedFacts, authorizeConfirmedAi, generateConfirmedProposal } from '../../supabase/functions/_shared/admin-ai-confirmed';
import { calculateFieldCapabilities } from '../../supabase/functions/product-admin-api/capabilities';
import type { AuthContext, FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';
const facts=['Il fiore ha petali di colore rosso.','La confezione contiene cinque bulbi.'];
const def:FieldDefinition={key:'description',label:'Descrizione',editor_type:'richtext',data_type:'text',field_group:'main',visible:true,editable:true,manual_only:false,ai_allowed:true,publishable:true,required:false,protected_on_reimport:true,applies_to:'product',sort_order:1,help_text:null,validation_rules:{},review_policy:'manual_review'};
const auth:AuthContext={userId:'synthetic',roles:['editor'],catalogGrant:{enabled:true,capabilities:['ai','edit'],fieldKeys:['description']}};
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
test('campo mancante espone assistenza ma non genera o inizializza automaticamente',()=>{
 const caps=calculateFieldCapabilities(def,undefined,'simple',{roles:['editor'],writesEnabled:true,writeMode:'full',aiEnabled:true,scopedFieldKeys:['description'],scopedActions:['update_field']});assert.equal(caps.canSuggestAi,true);assert.equal(caps.currentValueExists,false);
});
test('nuova bozza e campo vuoto producono una proposta separata da fatti confermati',async()=>{
 let calls=0;const value=await generateConfirmedProposal(def,confirmedFacts(facts,true),async(_strategy,ctx)=>{calls++;assert.equal(ctx.sku,'');assert.deepEqual(ctx.trustedRelatedValues,{});return {value:facts.join('\n')};});
 assert.equal(calls,1);assert.equal(value,facts.map(x=>`<p>${x}</p>`).join(''));
});
test('liste: ordine proposto lecito e nessun fatto aggiunto',async()=>{
 const d={...def,key:'key_features',editor_type:'multiselect',data_type:'json'};assert.deepEqual(await generateConfirmedProposal(d,facts,async()=>({value:[facts[1],facts[0]]})),[facts[1],facts[0]]);
});
for(const value of ['Il fiore è non tossico.','Prezzo 99 euro.','Altezza 120 cm.','Stock 20 pezzi.','SKU NUOVO-123.','Certificazione biologica garantita.','<script>alert(1)</script>'])test('rifiuta invenzione: '+value,async()=>{
 await assert.rejects(generateConfirmedProposal(def,facts,async()=>({value})),/diverse/);
});
test('errore provider resta errore, nessuna proposta sostitutiva inventata',async()=>{await assert.rejects(generateConfirmedProposal(def,facts,async()=>{throw Error('synthetic failure');}));});

test('handler deriva attore dalla sessione verificata, non dal payload',()=>{
 const source=readFileSync('supabase/functions/product-admin-ai/index.ts','utf8');assert.match(source,/const auth = await deps.authenticate\(req\)/);assert.match(source,/p_actor:auth.userId/);assert.doesNotMatch(source,/p_actor:payload/);
});
