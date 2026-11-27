import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedKeys, mergeRegenerated, reviewStatus, setReview } from '../../src/adminv2/lib/sheetReview.ts';
import type { SheetPreview } from '../../src/adminv2/lib/draftSheet.ts';

const rows = (): SheetPreview => ({
  description: { value: '<p>A</p>', source: 'model' },
  shortDescription: { value: 'Breve', source: 'model' },
  seoTitle: { value: 'SEO', source: 'model' },
  seoDescription: { reason: 'Compilala a mano.' },
  tags: { value: ['Yucca'], source: 'model' },
  productType: { reason: 'Conferma manualmente.' },
});

test('una proposta AI non è mai accettata automaticamente', () => {
  assert.equal(reviewStatus(rows().shortDescription, {}, 'shortDescription'), 'proposed');
  assert.deepEqual(acceptedKeys(rows(), {}, ['shortDescription', 'seoTitle']), []);
});

test('rigenerare un campo non tocca gli altri', () => {
  const r = rows();
  const out = mergeRegenerated(r, {}, 'seoTitle', { value: 'SEO nuovo', source: 'model' });
  assert.equal(out.rows.seoTitle.value, 'SEO nuovo');
  assert.equal(out.rows.shortDescription, r.shortDescription);
  assert.equal(out.rows.description, r.description);
});

test('un campo accettato non viene sovrascritto dalla rigenerazione', () => {
  const map = setReview({}, 'seoTitle', 'accepted');
  const out = mergeRegenerated(rows(), map, 'seoTitle', { value: 'Altro', source: 'model' });
  assert.equal(out.changed, false);
  assert.equal(out.rows.seoTitle.value, 'SEO');
});

test('errore AI o proposta non valida conserva il valore precedente', () => {
  const out = mergeRegenerated(rows(), {}, 'shortDescription', { reason: 'Errore' });
  assert.equal(out.changed, false);
  assert.equal(out.rows.shortDescription.value, 'Breve');
  assert.equal(mergeRegenerated(rows(), {}, 'shortDescription', undefined).changed, false);
});

test('valori mancanti sono segnalati e solo gli accettati si applicano', () => {
  assert.equal(reviewStatus(rows().seoDescription, {}, 'seoDescription'), 'missing');
  let map = setReview({}, 'tags', 'accepted');
  map = setReview(map, 'seoTitle', 'rejected');
  assert.deepEqual(acceptedKeys(rows(), map, ['tags', 'seoTitle', 'seoDescription']), ['tags']);
  assert.equal(reviewStatus(rows().seoTitle, map, 'seoTitle'), 'rejected');
});

test('modifica manuale resta da accettare', () => {
  assert.equal(reviewStatus({ value: 'x', source: 'manual' }, {}, 'seoTitle'), 'manual');
});
