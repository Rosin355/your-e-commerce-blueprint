import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDraft, changeFamilySku, addFormat, draftErrors } from '../../src/adminv2/lib/newDraft';
import { validateDraft } from '../../supabase/functions/_shared/admin-operational-core';

test('due nuove bozze, formato unico e più formati con modifica manuale', () => {
  const draft = initialDraft();
  assert.notEqual(draft.sku,initialDraft().sku);
  assert.deepEqual(Object.keys(draftErrors(draft)).sort(),['description','title','variant-0-price']);
  draft.description='Descrizione di prova'; draft.title='Titolo'; draft.variants[0].price='12,05';
  assert.equal(validateDraft(draft).sku,draft.variants[0].sku);
  Object.assign(draft,changeFamilySku(draft,'MIA-FAMIGLIA'));
  draft.variants=addFormat(draft.variants,draft.sku);
  draft.variants[1].option='Grande'; draft.variants[1].price='20.00';
  assert.deepEqual(validateDraft(draft).variants.map(v=>v.sku),['MIA-FAMIGLIA-1','MIA-FAMIGLIA-2']);
  draft.variants[1].sku='MANUALE';
  Object.assign(draft,changeFamilySku(draft,'SECONDA'));
  assert.deepEqual(draft.variants.map(v=>v.sku),['SECONDA-1','MANUALE']);
  draft.variants[1].sku='seconda-1';
  assert.ok(draftErrors(draft)['variant-1-sku']);
  assert.throws(()=>validateDraft(draft),/duplicato/);
});
