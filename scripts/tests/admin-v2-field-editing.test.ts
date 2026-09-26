import test from 'node:test';
import assert from 'node:assert/strict';

import { AdminApiError } from '../../src/adminv2/lib/AdminApiError.ts';
import {
  editorKind,
  isEditorValueSupported,
  normalizeEditorValue,
  parseFaqValue,
} from '../../src/adminv2/lib/fieldValueCodecs.ts';
import {
  appliesToEntity,
  calculateFieldCapabilities,
} from '../../supabase/functions/product-admin-api/capabilities.ts';
import { serializeField } from '../../supabase/functions/product-admin-api/serializers.ts';
import { validateCommand, validateValue } from '../../supabase/functions/product-admin-api/validation.ts';
import type { CurrentValueRow, FieldDefinition } from '../../supabase/functions/product-admin-api/types.ts';

function def(over: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    key: 'title', label: 'Titolo', field_group: 'main', editor_type: 'text', data_type: 'text',
    visible: true, editable: true, ai_allowed: true, manual_only: false, publishable: true,
    required: false, protected_on_reimport: true, applies_to: 'both', sort_order: 1,
    help_text: null, validation_rules: {}, review_policy: 'none', ...over,
  };
}

function row(over: Partial<CurrentValueRow> = {}): CurrentValueRow {
  return {
    id: 'v1', product_id: 'p1', sku: 'OG_TEST', field_key: 'title', entity_type: 'product',
    value_text: 'Titolo', value_number: null, value_json: null, value_origin: 'manual', origin: 'manual',
    review_status: 'approved', publish_blocked: false, protected_on_reimport: true,
    source_snapshot_id: null, is_locked: false, version: 3, updated_at: '2026-09-24T00:00:00Z',
    ...over,
  };
}

const writable = { roles: ['admin'] as const, writesEnabled: true, writeMode: 'full' as const };

test('applies_to distingue simple, parent e variation', () => {
  assert.equal(appliesToEntity('product', 'simple'), true);
  assert.equal(appliesToEntity('product', 'variable'), true);
  assert.equal(appliesToEntity('product', 'variation'), false);
  assert.equal(appliesToEntity('variant', 'variation'), true);
  assert.equal(appliesToEntity('variant', 'variable'), false);
  assert.equal(appliesToEntity('both', 'simple'), true);
  assert.equal(appliesToEntity('both', 'variation'), true);
});

test('capability server-side consentono manual_only locked e creazione solo ad Admin', () => {
  const lockedLegacy = calculateFieldCapabilities(
    def({ manual_only: true, ai_allowed: true }),
    row({ is_locked: true, review_status: 'legacy_unverified' }),
    'simple', writable,
  );
  assert.equal(lockedLegacy.canUpdate, true);
  assert.equal(lockedLegacy.updateBlockReason, 'allowed');
  assert.equal(lockedLegacy.canConfirmLegacy, true);
  assert.equal(lockedLegacy.canRejectLegacy, false);
  assert.equal(lockedLegacy.manualOnly, true);
  assert.equal(lockedLegacy.aiAllowed, false);
  assert.equal(lockedLegacy.protectedOnReimport, true);

  const absentManual = calculateFieldCapabilities(def({ manual_only: true }), undefined, 'simple', writable);
  assert.equal(absentManual.canUpdate, true);
  assert.equal(absentManual.updateBlockReason, 'allowed');

  const absentNormal = calculateFieldCapabilities(def(), undefined, 'simple', writable);
  assert.equal(absentNormal.canUpdate, false);
  assert.equal(absentNormal.updateBlockReason, 'current_value_missing');

  const editorLocked = calculateFieldCapabilities(
    def({ manual_only: true, ai_allowed: false }), row({ is_locked: true }), 'simple',
    { roles: ['editor'], writesEnabled: true, writeMode: 'full' },
  );
  assert.equal(editorLocked.canUpdate, false);
  assert.equal(editorLocked.updateBlockReason, 'current_value_locked');
});

test('i cinque campi manuali golden restano protetti e senza capability AI', () => {
  const manualKeys = ['nome_comune', 'ibridatore', 'colore_fiore', 'colore_foglia', 'curiosita'];
  for (const key of manualKeys) {
    const capabilities = calculateFieldCapabilities(
      def({ key, manual_only: true, ai_allowed: false, protected_on_reimport: true }),
      row({ field_key: key, protected_on_reimport: false, is_locked: true }),
      'variable',
      writable,
    );
    assert.equal(capabilities.manualOnly, true, key);
    assert.equal(capabilities.protectedOnReimport, true, key);
    assert.equal(capabilities.aiAllowed, false, key);
    assert.equal(capabilities.canUpdate, true, key);
    assert.equal(capabilities.updateBlockReason, 'allowed', key);
  }
});

test('validazione command supera il lock solo per manual_only Admin', () => {
  const locked = row({ is_locked: true, review_status: 'legacy_unverified' });
  assert.equal(
    validateCommand('update_field', def(), locked, 'Nuovo titolo', { expectedVersion: 3 }).code,
    'FIELD_NOT_EDITABLE',
  );
  assert.equal(
    validateCommand('reject_legacy_value', def(), locked, null, { expectedVersion: 3 }).code,
    'FIELD_NOT_EDITABLE',
  );
  assert.equal(
    validateCommand('confirm_legacy_value', def(), locked, null, { expectedVersion: 3 }).ok,
    true,
  );
  const manual = def({ key: 'nome_comune', manual_only: true, ai_allowed: false });
  assert.equal(
    validateCommand('update_field', manual, locked, 'Nuovo nome', {
      expectedVersion: 3,
      allowLockedManual: true,
    }).ok,
    true,
  );
  assert.equal(
    validateCommand('reject_legacy_value', manual, locked, null, {
      expectedVersion: 3,
      allowLockedManual: true,
    }).code,
    'FIELD_NOT_EDITABLE',
  );
});

test('campo manuale assente espone version zero e capability di creazione', () => {
  const field = serializeField(
    def({ key: 'nome_comune', manual_only: true, ai_allowed: false }),
    undefined,
    'simple',
    writable,
  );
  assert.equal(field.version, 0);
  assert.equal(field.capabilities.currentValueExists, false);
  assert.equal(field.capabilities.canUpdate, true);
  assert.equal(field.sourceSnapshotId, null);
  assert.equal(field.sourceState, 'original_absent');
});

test('snapshot collegato, baseline non collegata e originale assente sono distinti', () => {
  const linked = serializeField(def(), row({ source_snapshot_id: 's1' }), 'simple', writable, {
    fallbackSnapshot: { id: 'fallback', product_id: 'p1', normalized: { title: 'Fallback' }, created_at: 'x' },
    linkedSnapshots: [{ id: 's1', product_id: 'p1', normalized: { title: 'Originale' }, created_at: 'x' }],
  });
  assert.equal(linked.sourceState, 'linked_snapshot');
  assert.equal(linked.baselineValue, 'Originale');

  const linkedWithoutField = serializeField(def(), row({ source_snapshot_id: 's2' }), 'simple', writable, {
    linkedSnapshots: [{ id: 's2', product_id: 'p1', normalized: {}, created_at: 'x' }],
  });
  assert.equal(linkedWithoutField.sourceState, 'original_absent');

  const unlinked = serializeField(def(), row(), 'simple', writable, {
    fallbackSnapshot: { id: 'fallback', product_id: 'p1', normalized: { title: 'Fallback' }, created_at: 'x' },
  });
  assert.equal(unlinked.sourceState, 'unlinked_baseline');
  assert.equal(unlinked.sourceSnapshotId, null);

  const absent = serializeField(def(), row(), 'simple', writable);
  assert.equal(absent.sourceState, 'original_absent');
});

test('editor tipizzati conservano number, boolean e array', () => {
  const numberField = { key: 'price', editorType: 'number', dataType: 'number', validationRules: {}, required: true } as const;
  const boolField = { key: 'active', editorType: 'checkbox', dataType: 'boolean', validationRules: {}, required: true } as const;
  const arrayField = { key: 'tags', editorType: 'multiselect', dataType: 'array', validationRules: {}, required: false } as const;
  assert.equal(editorKind(numberField), 'number');
  assert.equal(normalizeEditorValue(numberField, 12.5).value, 12.5);
  assert.equal(typeof normalizeEditorValue(numberField, 12.5).value, 'number');
  assert.equal(normalizeEditorValue(boolField, false).value, false);
  assert.deepEqual(normalizeEditorValue(arrayField, ['a', ' b ']).value, ['a', 'b']);
  assert.equal(isEditorValueSupported(arrayField, 'a'), false);
});

test('FAQ canonicali e alias q/a sono editabili, legacy opaco resta invariato', () => {
  assert.deepEqual(parseFaqValue([{ question: 'Q?', answer: 'A.' }]), {
    kind: 'supported', items: [{ question: 'Q?', answer: 'A.' }], source: 'canonical',
  });
  const alias = parseFaqValue([{ q: 'Q?', a: 'A.' }]);
  assert.equal(alias.kind, 'supported');
  if (alias.kind === 'supported') assert.deepEqual(alias.items, [{ question: 'Q?', answer: 'A.' }]);
  assert.equal(parseFaqValue('[{"q":"Q?","a":"A."}]').kind, 'supported');

  const opaque = 'Domanda: testo libero non strutturato';
  const unsupported = parseFaqValue(opaque);
  assert.equal(unsupported.kind, 'unsupported');
  if (unsupported.kind === 'unsupported') assert.equal(unsupported.raw, opaque);
  assert.equal(parseFaqValue([{ question: 'Q?', answer: 'A.', note: 'non perdere' }]).kind, 'unsupported');
});

test('FAQ inviate al server richiedono domanda/risposta canoniche complete', () => {
  const faq = def({ key: 'faq', editor_type: 'json', data_type: 'json' });
  assert.equal(validateValue(faq, [{ question: 'Q?', answer: 'A.' }]).ok, true);
  assert.equal(validateValue(faq, [{ q: 'Q?', a: 'A.' }]).ok, false);
  assert.equal(validateValue(faq, [{ question: '', answer: 'A.' }]).ok, false);
});

test('il conflitto versione conserva i dettagli server per una ricarica esplicita', () => {
  const error = new AdminApiError('VERSION_CONFLICT', 'Conflitto', { currentVersion: 8 });
  assert.equal(error.code, 'VERSION_CONFLICT');
  assert.equal(error.details?.currentVersion, 8);
});
