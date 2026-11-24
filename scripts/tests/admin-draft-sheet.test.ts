import assert from 'node:assert/strict';
import test from 'node:test';
import { localSheet, sheetValueError, type SheetContext } from '../../src/adminv2/lib/draftSheet';
import { validateDraft } from '../../supabase/functions/_shared/admin-operational-core';
import { initialDraft } from '../../src/adminv2/lib/newDraft';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types';

function field(key: string, extra: Partial<FieldDefinition> = {}): FieldDefinition {
  return { key, label: key, field_group: 'content', data_type: 'text', editor_type: 'text',
    visible: true, editable: true, ai_allowed: true, manual_only: false, publishable: true,
    required: false, protected_on_reimport: false, applies_to: 'product', sort_order: 0,
    help_text: null, validation_rules: {}, review_policy: '', ...extra };
}
const fields = [
  field('description', { editor_type: 'richtext' }), field('seo_title'), field('seo_description'),
  field('tags', { ai_allowed: false, data_type: 'json' }),
  field('shopify_product_type', { editor_type: 'select', shopify_mapping: { type: 'core', field: 'productType' }, validation_rules: { enum: ['Alberi', 'Giardino'] } }),
];
const context: SheetContext = { title: 'Quercus robur', categories: ['Alberi'], definitions: fields,
  canFillDraft: true, supportsType: true, editableKeys: ['description', 'seo_title', 'seo_description'] };
const facts = ['La scheda riporta il nome Quercus robur.'];

test('SEO, tag e tipo derivano da testi interi e da un dominio esplicito', () => {
  const rows = localSheet(context, facts);
  assert.deepEqual(rows.seoTitle.value, context.title);
  assert.equal(rows.seoDescription.value, facts[0]);
  assert.deepEqual(rows.tags.value, [context.title, 'Alberi']);
  assert.equal(rows.productType.value, 'Alberi');
  const draft = initialDraft();
  draft.variants[0].price = '12.50';
  const saved = validateDraft({ ...draft, title: context.title, description: '<p>' + facts[0] + '</p>',
    seoTitle: rows.seoTitle.value, seoDescription: rows.seoDescription.value,
    tags: rows.tags.value, productType: rows.productType.value });
  assert.equal(saved.productType, 'Alberi');
  assert.deepEqual(saved.tags, rows.tags.value);
  assert.equal(saved.sku, draft.sku);
  assert.equal(saved.currency, 'EUR');
});
test('ambiguità, negazione o categoria assente richiedono una scelta verificata', () => {
  for (const categories of [['Alberi', 'Giardino'], []]) {
    const rows = localSheet({ ...context, categories }, ['Il prodotto non appartiene ad Alberi.']);
    assert.equal(rows.productType.value, undefined);
    assert.deepEqual(rows.productType.options, ['Alberi', 'Giardino']);
  }
  assert.equal(localSheet({ ...context, categories: [] }, ['Tipo prodotto: Alberi']).productType.value, 'Alberi');
  assert.equal(localSheet(context, ['Tipo prodotto: Nome sconosciuto']).productType.value, undefined);
  assert.ok(sheetValueError('productType', 'Inventato', context));
  for (const options of [[], ['Alberi', 'ALBERI'], ['Alberi', 7]]) {
    const definitions = [...fields.slice(0, -1), { ...fields.at(-1)!, validation_rules: { enum: options } }];
    assert.match(localSheet({ ...context, definitions }, facts).productType.reason!, /elenco verificato/);
  }
  assert.match(localSheet({ ...context, supportsType: false }, facts).productType.reason!, /elenco verificato/);
  const unmapped = field('entity_type', { validation_rules: { enum: ['simple'] } });
  assert.match(localSheet({ ...context, definitions: [...fields.slice(0, -1), unmapped] }, facts).productType.reason!, /elenco verificato/);
});
test('grant, campi manuali, registro e validazione bloccano soltanto le righe interessate', () => {
  let rows = localSheet({ ...context, editableKeys: ['seo_title'] }, facts);
  assert.ok(rows.description.reason);
  assert.ok(rows.seoDescription.reason);
  assert.equal(rows.seoTitle.value, context.title);
  rows = localSheet({ ...context, canFillDraft: false }, facts);
  assert.equal(rows.description.reason, undefined);
  assert.ok(rows.tags.reason);
  assert.ok(rows.seoTitle.reason);
  for (const change of [{ manual_only: true }, { visible: false }, { applies_to: 'variant' as const }, { editable: false }]) {
    const definitions = fields.map(d => d.key === 'tags' ? { ...d, ...change } : d);
    assert.ok(localSheet({ ...context, definitions }, facts).tags.reason);
  }
  assert.ok(sheetValueError('description', '<script>foo</script>', context));
  assert.ok(sheetValueError('description', '<p></p>', context));
});
test('nessun troncamento di fatti, tag duplicati, markup o tag riservati', () => {
  const rows = localSheet({ ...context, title: 'A'.repeat(71), categories: ['Alberi', 'alberi', 'OGQAShipping-A', '<price>'] }, ['x'.repeat(321), ...facts]);
  assert.ok(rows.seoTitle.reason);
  assert.equal(rows.seoDescription.value, facts[0]);
  assert.deepEqual(rows.tags.value, ['A'.repeat(71), 'Alberi']);
  const definitions = fields.map(d => d.key === 'seo_description' ? { ...d, validation_rules: { maxLength: 10 } } : d);
  assert.ok(localSheet({ ...context, definitions }, facts).seoDescription.reason);
  assert.ok(sheetValueError('tags', ['OGShipping-A'], context));
  assert.ok(sheetValueError('tags', ['uno', 'UNO'], context));
});
