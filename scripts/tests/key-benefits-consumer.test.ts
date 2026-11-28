import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { freshListSyncApproval } from '../../supabase/functions/_shared/admin-catalog-approvals';
import {parseKeyBenefits,parseMultilineMetafield} from '../../src/components/storefront/pdpMetafields';
const benefits={type:'multi_line_text_field',value:'Secondo & à 🌱\nPrimo < limite\nRipetuto\nRipetuto'};
test('benefits conserva ordine, duplicati interni e caratteri speciali',()=>{
 assert.deepEqual(parseKeyBenefits(benefits),['Secondo & à 🌱','Primo < limite','Ripetuto','Ripetuto']);
});
for(const input of [undefined,null,{type:'multi_line_text_field',value:''},{type:'json',value:'{"legacy":"Uno"}'},{value:'Uno'},{type:'multi_line_text_field',value:'Uno\n\nDue'},{type:'multi_line_text_field',value:' Uno'},{type:'multi_line_text_field',value:'Uno\r\nDue'}])test('benefits vuoto/incompatibile/ambiguo resta invisibile '+JSON.stringify(input),()=>assert.deepEqual(parseKeyBenefits(input),[]));
test('sopprime solo duplicati esatti con le sezioni esistenti, senza alterarle',()=>{
 const features={value:'Comune\nCaratteristica'},special={value:'Speciale\nAltro'};
 const existing=[...parseMultilineMetafield(features),...parseMultilineMetafield(special)];const before=structuredClone(existing);
 assert.deepEqual(parseKeyBenefits({type:'multi_line_text_field',value:'Comune\nSolo beneficio\nSpeciale\nAltro beneficio'},existing),['Solo beneficio','Altro beneficio']);
 assert.deepEqual(existing,before);assert.deepEqual(parseMultilineMetafield(features),['Comune','Caratteristica']);assert.deepEqual(parseMultilineMetafield(special),['Speciale','Altro']);
 assert.deepEqual(parseKeyBenefits({type:'multi_line_text_field',value:'Comune\nSpeciale'},existing),[]);
});
test('query e tipo TS includono solo il nuovo metafield, PDP condizionale',()=>{
 const query=readFileSync('src/hooks/useProduct.ts','utf8');assert.match(query,/keyBenefits: metafield\(namespace: "custom", key: "key_benefits"\)\s*\{\s*value\s*type/);
 assert.match(readFileSync('src/lib/shopify.ts','utf8'),/keyBenefits\?: \{ value: string; type\?: string \} \| null/);
 const pdp=readFileSync('src/components/storefront/Pdp.tsx','utf8');assert.match(pdp,/resolvedKeyBenefits.length > 0/);assert.match(pdp,/Punti di forza/);
});

test('nuova revisione solo benefits: approvazioni degli altri due consumer invariate',()=>{
 for(const fieldKey of ['key_features','special_bullets'])assert.equal(freshListSyncApproval({action:'sync_field',fieldKey},{syncRevision:'editorial-list-sync-v2'}),true);
 assert.equal(freshListSyncApproval({action:'sync_field',fieldKey:'key_benefits'},{syncRevision:'editorial-list-sync-v2'}),false);
 assert.equal(freshListSyncApproval({action:'sync_field',fieldKey:'key_benefits'},{syncRevision:'editorial-list-sync-v3'}),true);
});

for (const type of ['json','list.single_line_text_field']) {
  for (const [key, parse] of [['key_features',parseMultilineMetafield],['key_benefits',parseKeyBenefits]] as const) {
    test('PDP mostra le singole voci di '+key+' con tipo storico '+type, () => {
      const values = ['Seconda','Prima','Prima'];
      assert.deepEqual(parse({type,value:JSON.stringify(values)}),values);
    });
  }
}
