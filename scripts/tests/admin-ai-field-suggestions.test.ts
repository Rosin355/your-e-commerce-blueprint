import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calculateFieldCapabilities } from '../../supabase/functions/product-admin-api/capabilities.ts';
import { canWrite } from '../../supabase/functions/product-admin-api/permissions.ts';
import type { CurrentValueRow, FieldDefinition } from '../../supabase/functions/product-admin-api/types.ts';
import {
  aiDefinitionEligibility,
  aiValueEligibility,
  isCanonicalFaq,
  strategyForField,
  validateSuggestedValue,
} from '../../supabase/functions/product-admin-ai/ai-core.ts';
import { AiProviderError, callAiProvider } from '../../supabase/functions/product-admin-ai/provider.ts';
import {
  acceptAiSuggestion,
  AiServiceError,
  generateAiSuggestion,
  rejectAiSuggestion,
  type AiRepository,
  type AiSuggestionRow,
  type ProductRow,
} from '../../supabase/functions/product-admin-ai/service.ts';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const SUGGESTION_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR_ID = '33333333-3333-4333-8333-333333333333';

function def(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    key: 'title', label: 'Titolo', field_group: 'main', editor_type: 'text', data_type: 'text',
    visible: true, editable: true, ai_allowed: true, manual_only: false, publishable: true,
    required: true, protected_on_reimport: true, applies_to: 'both', sort_order: 1,
    help_text: null, validation_rules: {}, review_policy: 'manual_review', ...overrides,
  };
}

function row(overrides: Partial<CurrentValueRow> = {}): CurrentValueRow {
  return {
    id: '44444444-4444-4444-8444-444444444444', product_id: PRODUCT_ID, sku: 'OG_TEST',
    field_key: 'title', entity_type: 'product', value_text: 'Titolo corrente', value_number: null,
    value_json: null, value_origin: 'manual', origin: 'manual', review_status: 'approved',
    publish_blocked: false, protected_on_reimport: true, source_snapshot_id: null,
    is_locked: false, version: 1, updated_at: '2026-09-29T00:00:00.000Z', ...overrides,
  };
}

function suggestion(overrides: Partial<AiSuggestionRow> = {}): AiSuggestionRow {
  return {
    id: SUGGESTION_ID, sku: 'OG_TEST', entity_type: 'product', product_id: PRODUCT_ID,
    field_key: 'title', suggestion_text: 'Titolo migliorato', suggestion_json: null,
    model: 'lovable/test-model', prompt_hint: 'product-title', based_on_value: 'Titolo corrente',
    status: 'pending', created_by: ACTOR_ID, created_at: '2026-09-29T00:00:00.000Z',
    resolved_at: null, resolved_by: null, base_version: 1, prompt_version: 'product-title@1',
    ...overrides,
  };
}

class FakeRepo implements AiRepository {
  product: ProductRow | null = { id: PRODUCT_ID, sku: 'OG_TEST', entity_type: 'simple', is_active: true };
  definition: FieldDefinition | null = def();
  current: CurrentValueRow | null = row();
  pending: AiSuggestionRow[] = [];
  stored = new Map<string, AiSuggestionRow>();
  recent = 0;
  inserted: AiSuggestionRow[] = [];
  resolutions: Array<{ id: string; status: string }> = [];
  executeCalls = 0;
  reconcileResult: Record<string, unknown> | null = null;
  executeResult: Record<string, unknown> = { ok: true, code: 'APPLIED', version: 2 };
  lastCommand: Record<string, unknown> | null = null;
  original: unknown = null;
  contextRows: CurrentValueRow[] = [row({ field_key: 'description', value_text: 'Descrizione attendibile' })];

  async getProduct() { return this.product; }
  async getDefinition() { return this.definition; }
  async getCurrent() { return this.current; }
  async getContextValues() { return this.contextRows; }
  async getOriginal() { return this.original; }
  async listPending() { return this.pending; }
  async getSuggestion(id: string) { return this.stored.get(id) ?? null; }
  async countRecent() { return this.recent; }
  async insertSuggestion(input: Omit<AiSuggestionRow, 'id' | 'created_at' | 'resolved_at' | 'resolved_by'>) {
    const created = suggestion({ ...input, id: SUGGESTION_ID });
    this.inserted.push(created);
    this.stored.set(created.id, created);
    this.pending = [created];
    return created;
  }
  async resolveSuggestion(id: string, status: 'accepted' | 'discarded' | 'superseded') {
    this.resolutions.push({ id, status });
    const existing = this.stored.get(id);
    if (existing) existing.status = status;
    this.pending = this.pending.filter((item) => item.id !== id);
  }
  async reconcileCommand(input: Record<string, unknown>) {
    this.lastCommand = input;
    return this.reconcileResult;
  }
  async executeCommand(input: Record<string, unknown>) {
    this.executeCalls += 1;
    this.lastCommand = input;
    return this.executeResult;
  }
}

const provider = async () => ({ value: 'Titolo migliorato', provider: 'lovable' as const, model: 'test-model', usageTokens: 21 });

test('1. ai_allowed=true espone la capability solo per un valore supportato', () => {
  const capability = calculateFieldCapabilities(def(), row(), 'simple', {
    roles: ['admin'], writesEnabled: true, writeMode: 'full',
  });
  assert.equal(capability.canSuggestAi, true);
  assert.equal(capability.aiBlockReason, 'allowed');
});

test('2. ai_allowed=false nega la suggestion', () => {
  assert.equal(aiDefinitionEligibility(def({ ai_allowed: false })), 'ai_not_allowed');
});

test('3. manual_only=true nega la suggestion, inclusi i cinque campi protetti', () => {
  assert.equal(aiDefinitionEligibility(def({ key: 'nome_comune', manual_only: true })), 'manual_only');
});

test('4. campi strutturali sono negati anche se il registry fosse errato', () => {
  assert.equal(aiDefinitionEligibility(def({ key: 'price' })), 'structural_field');
});

test('5-6. generate salva base_version senza modificare il current value', async () => {
  const repo = new FakeRepo();
  const before = structuredClone(repo.current);
  const result = await generateAiSuggestion(repo, {
    actor: ACTOR_ID, productId: PRODUCT_ID, fieldKey: 'title', baseVersion: 1,
  }, provider);
  assert.equal(result.suggestion.baseVersion, 1);
  assert.equal(repo.inserted[0].base_version, 1);
  assert.deepEqual(repo.current, before);
  assert.equal(repo.executeCalls, 0);
});

test('7. accept usa update_field con expectedVersion della suggestion', async () => {
  const repo = new FakeRepo();
  repo.stored.set(SUGGESTION_ID, suggestion());
  await acceptAiSuggestion(repo, {
    actor: ACTOR_ID, suggestionId: SUGGESTION_ID, value: 'Titolo revisionato', expectedVersion: 1,
    idempotencyKey: 'accept-key-0001',
  });
  assert.equal(repo.lastCommand?.action, 'update_field');
  assert.equal(repo.lastCommand?.expectedVersion, 1);
  assert.equal(repo.executeCalls, 1);
});

test('8. una modifica concorrente rende la proposta stale senza write', async () => {
  const repo = new FakeRepo();
  repo.current = row({ version: 2 });
  repo.stored.set(SUGGESTION_ID, suggestion());
  await assert.rejects(
    acceptAiSuggestion(repo, {
      actor: ACTOR_ID, suggestionId: SUGGESTION_ID, value: 'Titolo revisionato', expectedVersion: 1,
      idempotencyKey: 'accept-key-0002',
    }),
    (error: unknown) => error instanceof AiServiceError && error.code === 'SUGGESTION_STALE',
  );
  assert.equal(repo.executeCalls, 0);
  assert.equal(repo.resolutions[0].status, 'superseded');
});

test('9. reject risolve solo la suggestion e non chiama il comando prodotto', async () => {
  const repo = new FakeRepo();
  repo.stored.set(SUGGESTION_ID, suggestion());
  const result = await rejectAiSuggestion(repo, { actor: ACTOR_ID, suggestionId: SUGGESTION_ID });
  assert.equal(result.status, 'rejected');
  assert.equal(repo.executeCalls, 0);
  assert.deepEqual(repo.resolutions, [{ id: SUGGESTION_ID, status: 'discarded' }]);
});

test('10. una proposta modificata dall’Admin può essere accettata', async () => {
  const repo = new FakeRepo();
  repo.stored.set(SUGGESTION_ID, suggestion());
  await acceptAiSuggestion(repo, {
    actor: ACTOR_ID, suggestionId: SUGGESTION_ID, value: 'Testo editato dall’Admin', expectedVersion: 1,
    idempotencyKey: 'accept-key-0003',
  });
  assert.equal(repo.lastCommand?.value, 'Testo editato dall’Admin');
  assert.equal(repo.resolutions.at(-1)?.status, 'accepted');
});

test('11-12. il nuovo endpoint non importa Shopify né i publish legacy', () => {
  const source = readFileSync('supabase/functions/product-admin-ai/index.ts', 'utf8') +
    readFileSync('supabase/functions/product-admin-ai/service.ts', 'utf8');
  assert.doesNotMatch(source, /shopify-admin|shopifyAdmin|publish_product|publishProduct/);
  assert.doesNotMatch(source, /create-product-ai|AI Writer|aiWriterEngine/);
});

test('13. il nuovo endpoint autentica prima di costruire il repository privilegiato', () => {
  const source = readFileSync('supabase/functions/product-admin-ai/index.ts', 'utf8');
  const auth = source.indexOf('await deps.authenticate(req)');
  const repository = source.indexOf('const repo = deps.repository()');
  assert.ok(auth >= 0 && repository > auth);
  assert.match(source, /error instanceof AuthError/);
});

test('14. ruolo non Admin/editor è respinto sulle azioni AI di scrittura', () => {
  assert.equal(canWrite(['publisher']), false);
  const source = readFileSync('supabase/functions/product-admin-ai/index.ts', 'utf8');
  assert.match(source, /if \(!canWrite\(auth\.roles\)\)/);
  assert.match(source, /return fail\(\s*"FORBIDDEN"/);
});

test('15. output AI malformato viene rifiutato', async () => {
  await assert.rejects(
    callAiProvider(strategyForField('title')!, {
      sku: 'OG_TEST', fieldKey: 'title', fieldLabel: 'Titolo', currentValue: 'Titolo',
      wordpressOriginal: null, sourceSnapshotId: null, trustedRelatedValues: {},
    }, {
      apiKey: 'fixture', model: 'fixture', timeoutMs: 50,
      fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 }),
    }),
    (error: unknown) => error instanceof AiProviderError && error.code === 'MALFORMED_AI_OUTPUT',
  );
});

test('16. errore provider non produce suggestion', async () => {
  await assert.rejects(
    callAiProvider(strategyForField('title')!, {
      sku: 'OG_TEST', fieldKey: 'title', fieldLabel: 'Titolo', currentValue: 'Titolo',
      wordpressOriginal: null, sourceSnapshotId: null, trustedRelatedValues: {},
    }, {
      apiKey: 'fixture', model: 'fixture', timeoutMs: 50,
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: 'fixture error' } }), { status: 503 }),
    }),
    (error: unknown) => error instanceof AiProviderError && error.code === 'AI_PROVIDER_ERROR',
  );
});

test('17. valore corrente vuoto non è inviato al provider', () => {
  assert.equal(aiValueEligibility(def(), row({ value_text: '   ' })), 'empty_or_unsupported_value');
});

test('18. source_snapshot_id NULL resta NULL nel contesto attendibile', async () => {
  const repo = new FakeRepo();
  let seenSnapshot: string | null | undefined;
  await generateAiSuggestion(repo, {
    actor: ACTOR_ID, productId: PRODUCT_ID, fieldKey: 'title', baseVersion: 1,
  }, async (_strategy, context) => {
    seenSnapshot = context.sourceSnapshotId;
    return provider();
  });
  assert.equal(seenSnapshot, null);
  assert.equal(repo.current?.source_snapshot_id, null);
});

test('19. replay esatto restituisce il risultato precedente senza seconda write', async () => {
  const repo = new FakeRepo();
  repo.stored.set(SUGGESTION_ID, suggestion({ status: 'accepted' }));
  repo.reconcileResult = { ok: true, code: 'APPLIED', version: 2, replayed: true };
  const result = await acceptAiSuggestion(repo, {
    actor: ACTOR_ID, suggestionId: SUGGESTION_ID, value: 'Titolo revisionato', expectedVersion: 1,
    idempotencyKey: 'accept-key-0004',
  });
  assert.equal(result.result.replayed, true);
  assert.equal(repo.executeCalls, 0);
});

test('20. FAQ è ammessa solo nel formato canonico e conserva l’ordine', () => {
  const value = [
    { question: 'Prima?', answer: 'Prima.' },
    { question: 'Seconda?', answer: 'Seconda.' },
  ];
  assert.equal(isCanonicalFaq(value), true);
  const faqDef = def({ key: 'faq', data_type: 'json', editor_type: 'json', required: false });
  const result = validateSuggestedValue(faqDef, strategyForField('faq')!, value);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, value);
  assert.equal(isCanonicalFaq([{ q: 'legacy?', a: 'legacy.' }]), false);
});

test('21. pending sulla stessa versione evita una seconda call provider', async () => {
  const repo = new FakeRepo();
  repo.pending = [suggestion()];
  let calls = 0;
  const result = await generateAiSuggestion(repo, {
    actor: ACTOR_ID, productId: PRODUCT_ID, fieldKey: 'title', baseVersion: 1,
  }, async () => {
    calls += 1;
    return provider();
  });
  assert.equal(result.replayed, true);
  assert.equal(calls, 0);
  assert.equal(repo.inserted.length, 0);
});

test('22. stessa idempotency key con payload diverso non richiama la write', async () => {
  const repo = new FakeRepo();
  repo.stored.set(SUGGESTION_ID, suggestion());
  repo.reconcileResult = { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'payload diverso' };
  await assert.rejects(
    acceptAiSuggestion(repo, {
      actor: ACTOR_ID, suggestionId: SUGGESTION_ID, value: 'Payload diverso', expectedVersion: 1,
      idempotencyKey: 'accept-key-0005',
    }),
    (error: unknown) => error instanceof AiServiceError && error.code === 'IDEMPOTENCY_CONFLICT',
  );
  assert.equal(repo.executeCalls, 0);
});

test('23. UX contiene stati responsive/accessibili senza JSON grezzo', () => {
  const source = readFileSync('src/adminv2/components/AiSuggestionCard.tsx', 'utf8');
  const fieldCard = readFileSync('src/adminv2/components/FieldCard.tsx', 'utf8');
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /md:grid-cols-2/);
  assert.match(source, /Sto preparando una proposta/);
  assert.match(source, /Migliora con AI/);
  assert.match(source, /Miglioramento AI/);
  assert.match(source, /Modifica proposta/);
  assert.match(source, /Proposta accettata/);
  assert.match(source, /Proposta rifiutata/);
  assert.match(source, /Proposta AI non più aggiornata/);
  assert.match(source, /field\.version !== suggestion\.baseVersion/);
  assert.match(source, /Genera nuova proposta/);
  assert.match(source, /role="alert"/);
  assert.doesNotMatch(source, /JSON\.stringify\(draft/);
  assert.match(fieldCard, /field\.capabilities\.canSuggestAi && onGenerateAi/);
  assert.doesNotMatch(fieldCard, /aiAllowed && !field\.capabilities\.canSuggestAi/);
});

test('24. output con markup attivo viene rifiutato prima del salvataggio', () => {
  const result = validateSuggestedValue(def(), strategyForField('title')!, '<script>alert(1)</script>');
  assert.equal(result.ok, false);
});
