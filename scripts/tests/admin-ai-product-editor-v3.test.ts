import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factsFromText } from '../../supabase/functions/_shared/admin-ai-facts.ts';
import { articleVersion, validRevision } from '../../supabase/functions/_shared/admin-ai-revision.ts';
import { generateDraftSheet } from '../../supabase/functions/product-admin-ai/draft-sheet.ts';
import { generateConfirmedProposal } from '../../supabase/functions/_shared/admin-ai-confirmed.ts';
import { callAiProvider } from '../../supabase/functions/product-admin-ai/provider.ts';
import {
  application,
  articleAssessment,
  articleRows,
  categoryMatches,
  faqPairs,
  historicalText,
} from '../../src/adminv2/lib/customerArticle.ts';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types.ts';
const load = (file: string) => readFileSync(new URL('./fixtures/yucca-filamentosa-' + file, import.meta.url), 'utf8');
const facts = factsFromText(load('uat-20261127.txt'), true);
const fixture = JSON.parse(load('v3.json'));
const description = {
  key: 'description',
  label: 'Descrizione',
  editor_type: 'richtext',
  data_type: 'text',
  visible: true,
  editable: true,
  ai_allowed: true,
  manual_only: false,
  validation_rules: {},
} as FieldDefinition;
const ctx = {
  title: 'Yucca filamentosa',
  definitions: [description],
  editableKeys: ['description'],
  canFillDraft: true,
  supportsType: false,
  categories: [],
};
test('Yucca originale V3 attraversa provider e validatore; copertura, passaggi PDP e campi complementari', async () => {
  let calls = 0;
  const result = await generateDraftSheet(
    description,
    facts,
    ctx.title,
    [],
    [],
    (strategy, context) =>
      callAiProvider(strategy, context, {
        apiKey: 'synthetic',
        model: 'offline',
        timeoutMs: 1000,
        fetchImpl: async (_url, init) => {
          calls++;
          const body = JSON.parse(String(init?.body));
          assert.match(body.messages[0].content, /@3/);
          assert.doesNotMatch(body.messages[0].content, /@2/);
          const atoms = JSON.parse(body.messages[1].content).facts;
          assert.equal(atoms.length, 15);
          assert.doesNotMatch(JSON.stringify(atoms), /Agavaceae|Asparagaceae|150 cm|fusto a fiamma/);
          return Response.json({
            choices: [{
              message: {
                tool_calls: [{
                  function: {
                    name: 'propose_field_improvement',
                    arguments: JSON.stringify({ suggested_value: fixture }),
                  },
                }],
              },
            }],
          });
        },
      }),
    undefined,
    true,
  );
  assert.equal(calls, 1);
  assert.equal(result.promptVersion, articleVersion);
  assert.ok('sections' in result && result.sections);
  const rows = articleRows(result.sections!, facts);
  const assessment = articleAssessment(rows, facts);
  assert.equal(assessment.covered, 15);
  assert.equal(assessment.missing.length, 0);
  assert.deepEqual(assessment.problems, []);
  assert.ok(assessment.words >= 250 && assessment.words <= 450);
  assert.equal(assessment.coverage.filter((f) => f.status === 'contradictory').length, 4);
  assert.equal(assessment.coverage.filter((f) => f.status === 'unverified').length, 1);
  const short = rows.find((r) => r.key === 'shortDescription')!.text;
  assert.ok(short.length > 80 && short.length <= 320 && /[.!?]$/.test(short));
  assert.ok(rows.find((r) => r.key === 'curiosity')!.text.includes('filamenti'));
  assert.ok(
    faqPairs(rows.find((r) => r.key === 'faq')!.text).every((p) => p.question.endsWith('?') && p.answer.length >= 25),
  );
  assert.ok(rows.find((r) => r.key === 'key_benefits')!.text.includes('orticoltura'));
  const candidate = application(rows, ctx);
  assert.deepEqual(candidate.errors, []);
  assert.deepEqual(Object.keys(candidate.change), ['description']);
  assert.deepEqual(candidate.botanical, {});
  assert.match(candidate.change.description!, /3 metri/);
  assert.doesNotMatch(candidate.change.description!, /150 cm|Agavaceae|Asparagaceae/);
});
test('una risposta breve con citazioni generiche non completa il registro e richiede il recupero', () => {
  const rows = articleRows(fixture.sections.filter((s: { heading: string }) => s.heading === 'Fioritura'), facts);
  const audit = articleAssessment(rows, facts);
  assert.ok(audit.missing.length >= 10);
  assert.ok(audit.problems.includes('Introduzione da recuperare.'));
  assert.ok(audit.words < 100);
  assert.equal(rows.some((r) => r.key === 'curiosity'), false);
});
test('WooCommerce e ACF utilizzano soltanto campi riconosciuti e richiedono la verifica umana', () => {
  const source = historicalText(JSON.stringify({
    description: '<p>Arbusto sempreverde.</p>',
    sku: 'SEGRETO',
    stock_quantity: 12,
    acf: { curiosita: 'Margini con filamenti bianchi.', key_benefits: ['Apprezzato in orticoltura.'] },
    meta_data: [{ key: 'faq', value: [{ question: 'Che foglie ha?', answer: 'Foglie lineari.' }] }],
  }));
  assert.match(source, /Arbusto sempreverde/);
  assert.match(source, /FAQ: Che foglie ha\? Foglie lineari/);
  assert.match(source, /Punto di forza/);
  assert.doesNotMatch(source, /SEGRETO|12|<p>/);
  assert.throws(() => factsFromText(source, false));
  assert.deepEqual(
    categoryMatches([{ id: 'real', title: 'Yucca' }, { id: 'other', title: 'Rose' }], facts, 'Yucca filamentosa').map(
      (o) => o.id,
    ),
    ['real'],
  );
  assert.deepEqual(categoryMatches([], facts, 'Yucca filamentosa'), []);
});
test('la preferenza di revisione non costituisce una fonte; la prenotazione SEO resta vincolante', async () => {
  const revision = {
    target: 'short_description',
    current: 'Sintesi precedente.',
    instruction: 'Aggiungi irrigazione quotidiana.',
  } as const;
  assert.ok(validRevision(revision));
  assert.ok(!validRevision({ ...revision, target: 'price' }));
  assert.ok(!validRevision({ ...revision, instruction: 'x'.repeat(501) }));
  await assert.rejects(
    generateConfirmedProposal(
      { ...description, key: 'short_description', editor_type: 'textarea' },
      facts,
      async (_s, c) => {
        assert.deepEqual(c.revision, revision);
        return { value: 'La Yucca richiede irrigazioni quotidiane.' };
      },
      { article: true, revision },
    ),
    /verificabile/,
  );
  let called = false;
  await assert.rejects(
    generateDraftSheet(
      description,
      facts,
      ctx.title,
      [],
      [],
      async () => {
        called = true;
        throw Error();
      },
      undefined,
      true,
      { ...revision, target: 'seoTitle' },
    ),
    /prenotazione/,
  );
  assert.equal(called, false);
});
