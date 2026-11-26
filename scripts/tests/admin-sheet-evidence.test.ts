import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceReview, sourceFacts } from '../../src/adminv2/lib/sheetEvidence';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';
const def = (
  key: string,
) => ({
  key,
  visible: true,
  editable: true,
  manual_only: false,
  data_type: 'json',
  editor_type: key === 'faq' ? 'faq_editor' : 'textarea',
  validation_rules: {},
} as FieldDefinition);
test('precarica soltanto campi editoriali, conserva la risposta e distingue le fonti', () => {
  const rows = sourceFacts([
    {
      key: 'faq',
      value: [{ question: 'Quale formato è indicato?', answer: 'Il cartellino riporta vaso.' }],
      reviewStatus: 'approved',
    },
    { key: 'key_benefits', value: 'Dato verificato sulla scheda.' },
    { key: 'description', shopifyLiveValue: '<p>Valore del catalogo da confermare.</p>' },
    { key: 'price', value: 'Prezzo commerciale di esempio.' },
  ] as never);
  assert.deepEqual(
    rows.map((r) => r.text).sort(),
    [
      'FAQ: Quale formato è indicato? Il cartellino riporta vaso.',
      'Punto di forza: Dato verificato sulla scheda.',
      'Valore del catalogo da confermare.',
    ].sort(),
  );
  assert.equal(rows.find((r) => r.text.startsWith('FAQ'))?.origin, 'Admin · confermato');
  assert.match(rows.find((r) => r.text.startsWith('Valore'))!.origin, /da verificare/);
});
test('caratteristiche dai fatti, vantaggi solo espliciti, campi in sola lettura esclusi', () => {
  const defs = ['key_features', 'key_benefits', 'faq'].map(def), keys = defs.map((d) => d.key);
  const facts = ['La scheda indica il nome.', 'Punto di forza: Testo confermato.'];
  const rows = evidenceReview(facts, defs, keys);
  assert.deepEqual(rows.key_features?.value, [facts[0]]);
  assert.deepEqual(rows.key_benefits?.value, ['Testo confermato.']);
  assert.equal(rows.faq, undefined);
  assert.equal(evidenceReview(facts, defs, ['key_features']).key_benefits, undefined);
  assert.equal(evidenceReview([facts[0]], defs, keys).key_benefits, undefined);
});
test('una FAQ senza risposta resta vuota; una coppia confermata mantiene i testi originali', () => {
  const defs = [def('faq')];
  assert.equal(evidenceReview(['FAQ: Qual è il formato?'], defs, ['faq']).faq, undefined);
  assert.deepEqual(evidenceReview(['FAQ: Qual è il formato? Vaso confermato.'], defs, ['faq']).faq?.value, [{
    question: 'Qual è il formato?',
    answer: 'Vaso confermato.',
  }]);
});
