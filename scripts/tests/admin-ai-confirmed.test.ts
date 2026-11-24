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
 assert.equal(calls,1);assert.deepEqual(value, { source: 'model', value: facts.map(x=>`<p>${x}</p>`).join('') });
});
test('liste: ordine proposto lecito e nessun fatto aggiunto',async()=>{
 const d={...def,key:'key_features',editor_type:'multiselect',data_type:'json'};assert.deepEqual(await generateConfirmedProposal(d,facts,async()=>({value:[facts[1],facts[0]]})),{source:'model', value:[facts[1],facts[0]]});
});
for(const value of ['Il fiore è non tossico.','Prezzo 99 euro.','Altezza 120 cm.','Stock 20 pezzi.','SKU NUOVO-123.','Certificazione biologica garantita.','<script>alert(1)</script>'])test('rifiuta invenzione: '+value,async()=>{
 const proposal = await generateConfirmedProposal(def, facts, async () => ({ value }));
 assert.deepEqual(proposal, { source: 'confirmed_facts', value: facts.map(line => `<p>${line}</p>`).join('') });
});
test('errore provider resta errore, nessuna proposta sostitutiva inventata',async()=>{await assert.rejects(generateConfirmedProposal(def,facts,async()=>{throw Error('synthetic failure');}));});

test('handler deriva attore dalla sessione verificata, non dal payload',()=>{
 const source=readFileSync('supabase/functions/product-admin-ai/index.ts','utf8');assert.match(source,/const auth = await deps.authenticate\(req\)/);assert.match(source,/p_actor:auth.userId/);assert.doesNotMatch(source,/p_actor:payload/);
});

test('un paragrafo di più frasi o tre righe distinte, senza descrizione preesistente', async () => {
  const lines = ['La scheda riporta Quercus robur.', 'Il nome è stato trascritto dal cartellino.', 'Il riferimento A & B è verificato.'];
  for (const original of [[lines.join(' ')], lines]) {
    const input = confirmedFacts(original, true);
    const result = await generateConfirmedProposal(def, input, async () => ({ value: [...input].reverse().join('\n') }));
    const html = [...input].reverse().map(line => `<p>${line.replace(/&/g, '&amp;')}</p>`).join('');
    assert.deepEqual(result, { value: html, source: 'model' });
  }
});

test('punteggiatura, omissioni e duplicati usano tutte le righe originali in ordine', async () => {
  const expected = facts.map(line => `<p>${line}</p>`).join('');
  for (const value of [facts[0], facts.join('\n') + '!', [facts[0],facts[0]]]) {
    assert.deepEqual(await generateConfirmedProposal(def, facts, async () => ({ value })),
      { value: expected, source: 'confirmed_facts' });
  }
});

test('formato modello illeggibile e limiti del campo hanno diagnosi distinte', async () => {
  for (const value of [null, {}, [], ['']]) {
    await assert.rejects(generateConfirmedProposal(def, facts, async () => ({value})), {code:'INVALID_MODEL_PROPOSAL'});
  }
  const limited = {...def, validation_rules:{ maxLength: 15 }};
  for (const value of [facts.join('\n'), 'Una parafrasi generata.']) {
    await assert.rejects(generateConfirmedProposal(limited, facts, async () => ({value})), {code:'INVALID_FIELD_VALUE'});
  }
  await assert.rejects(generateConfirmedProposal({...def,key:'key_features'}, facts, async () => ({value:['Testo inatteso']})), {code:'INVALID_MODEL_PROPOSAL'});
});
