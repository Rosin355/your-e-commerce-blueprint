import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmedFacts, generateConfirmedProposal } from '../../supabase/functions/_shared/admin-ai-confirmed';
import { validateEditorialDescription } from '../../supabase/functions/_shared/admin-ai-description';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';
const def = {key:'description',editor_type:'richtext',data_type:'text',validation_rules:{}} as FieldDefinition;
const yucca = confirmedFacts(readFileSync(new URL('./fixtures/yucca-rostrata-uat-20261126.txt',import.meta.url),'utf8').trim().split('\n'),true);
const short = ['L’arbusto è sempreverde e presenta foglie di colore verde.'];
const rewritten = { sections:[{heading:'Introduzione',text:'Il fogliame verde caratterizza questo **arbusto sempreverde**, secondo le informazioni confermate.',factIndices:[0]}],missingInformation:['dimensioni','manutenzione'] };
test('A/C/F: synthetic short evergreen reworked, bold and list rendered; no automatic mutation',async()=>{
 const original=JSON.stringify(short);let providerCalls=0;
 const result=await generateConfirmedProposal(def,short,async()=>{providerCalls++;return {value:rewritten};});
 assert.equal(providerCalls,1);assert.equal(result.source,'model');assert.notEqual(result.value,short.join('\n'));
 assert.equal(JSON.stringify(short),original);assert.match(String(result.value),/<strong>arbusto sempreverde<\/strong>/);
 assert.deepEqual('descriptionIssues' in result?result.descriptionIssues:[],[]);
 const list=validateEditorialDescription(def,short,{...rewritten,sections:[{...rewritten.sections[0],text:'Caratteristiche confermate:\n\n- Fogliame **verde**\n- Portamento di arbusto sempreverde'}]});
 assert.match(String(list.value),/<ul><li>/);assert.doesNotMatch(String(list.value),/\*\*/);
});
test('B: exact eleven-line Yucca UAT input, preserving confirmed numerical facts',async()=>{
 assert.equal(yucca.length,11);
 const value={sections:[
  {heading:'Introduzione',text:'Originaria del Texas e delle regioni messicane di Chihuahua e Coahuila, la **Yucca rostrata**, detta yucca a becco, appartiene al genere Yucca e ha aspetto arboreo. Il suo ambiente spontaneo è arido, con scarse precipitazioni, nei climi Bw e Bs.',factIndices:[0]},
  {heading:'Descrizione botanica',text:'Il tronco raggiunge fino a 4,5 metri e porta una chioma di foglie sottili e rigide: lunghe fino a 60 cm, raramente superano 15 mm di larghezza e terminano in una punta acuminata. I fiori bianchi sono raccolti in una pannocchia alta fino a 100 cm.',factIndices:[1,2]},
  {heading:'Coltivazione e manutenzione',text:'Tra le yucche con tronco più resistenti al freddo, questa specie è coltivabile all’aperto fino alla zona USDA 5. È diffusa a Palm Springs, Phoenix e Las Vegas; nelle zone USDA 7 e 8 si coltiva a El Paso, Albuquerque, Salt Lake City e Denver. Anche lungo la costa orientale statunitense, nelle zone 7 e 8, compare in Carolina del Nord, Virginia Beach, Ocean City, Long Island e sulle coste del Connecticut. In Europa mediterranea viene coltivata nell’Italia meridionale, in Spagna, Grecia e sud della Francia; è meno diffusa nel Regno Unito, in Germania e nelle altre regioni temperate settentrionali. Fuori dalle zone mediterranee più secche, estati fresche e umidità frequente rendono la coltivazione più difficile: molti coltivatori dell’Europa nordoccidentale usano coperture invernali contro l’umidità diretta.',factIndices:[3,4,5,6,7,8,9]},
  {heading:'Utilizzo ornamentale',text:'In Australia è molto apprezzata e viene occasionalmente impiegata nei giardini residenziali come esemplare ornamentale singolo.',factIndices:[10]}
 ],missingInformation:['manutenzione']};
 const result=await generateConfirmedProposal(def,yucca,async()=>({value}));
 assert.equal(result.source,'model');assert.ok('descriptionIssues' in result);assert.deepEqual(result.descriptionIssues,[]);
 assert.match(String(result.value),/4,5/);assert.match(String(result.value),/60 cm/);assert.match(String(result.value),/100 cm/);
 assert.match(String(result.value),/<h2>Descrizione botanica/);assert.notEqual(result.value,yucca.join('\n'));
});
test('D: incomplete response preserves usable section and explicitly warns missing facts',()=>{
 const result=validateEditorialDescription(def,[...short,'La pianta raggiunge una altezza di 120 cm.'],rewritten);
 assert.equal(result.source,'model');assert.ok(result.descriptionIssues.some(i=>i.code==='INCOMPLETE_RESPONSE'));
 assert.doesNotMatch(String(result.value),/120/);
});
test('E: unconfirmed watering and invented measure excluded, not replaced by source',()=>{
 const result=validateEditorialDescription(def,short,{...rewritten,sections:[...rewritten.sections,{heading:'Coltivazione e manutenzione',text:'Ann affiature quotidiane; altezza 200 cm.',factIndices:[0]}]});
 assert.ok(result.descriptionIssues.some(i=>i.code==='UNSUPPORTED_FACT'));assert.doesNotMatch(String(result.value),/200|quotidiane/);
 assert.match(String(result.value),/arbusto sempreverde/);
 assert.throws(()=>validateEditorialDescription(def,short,{...rewritten,sections:[{...rewritten.sections[0],text:'Richiede irrigazione quotidiana.'}]}));
});
test('F/G: unsafe HTML and provider failure produce explicit failures, never fallback',async()=>{
 assert.throws(()=>validateEditorialDescription(def,short,{...rewritten,sections:[{...rewritten.sections[0],text:'<img src=x onerror=alert(1)>'}]}));
 await assert.rejects(generateConfirmedProposal(def,short,async()=>{throw Error('synthetic provider offline');}),/synthetic provider offline/);
 assert.throws(()=>validateEditorialDescription(def,short,{...rewritten,sections:[{...rewritten.sections[0],text:short[0]}]}));
});
