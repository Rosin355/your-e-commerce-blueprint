import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factsFromText } from '../../supabase/functions/_shared/admin-ai-facts.ts';
import {
  analyzeFacts,
  factCoverage,
  usableFacts,
} from '../../supabase/functions/_shared/admin-ai-evidence.ts';
import { validateEditorialDescription } from '../../supabase/functions/_shared/admin-ai-description.ts';
import { generateConfirmedProposal } from '../../supabase/functions/_shared/admin-ai-confirmed.ts';
import { generateDraftSheet } from '../../supabase/functions/product-admin-ai/draft-sheet.ts';
import { callAiProvider } from '../../supabase/functions/product-admin-ai/provider.ts';
import { type EditorialSection, renderSections } from '../../supabase/functions/_shared/admin-ai-sections.ts';
import {
  activeSections,
  allSectionsReviewed,
  replaceSection,
  type SectionReview,
} from '../../src/adminv2/lib/descriptionReview.ts';
import type { FieldDefinition } from '../../supabase/functions/_shared/admin-v2-types.ts';

const fixture = (name: string) => readFileSync(new URL('./fixtures/' + name, import.meta.url), 'utf8');
const source = fixture('yucca-filamentosa-uat-20261127.txt');
const rows = factsFromText(source, true);
const response = JSON.parse(fixture('yucca-filamentosa-proposta.json'));
const def = {
  key: 'description',
  label: 'Descrizione',
  editor_type: 'richtext',
  data_type: 'text',
  validation_rules: {},
} as FieldDefinition;
const flower = response.sections.find((s: EditorialSection) => s.heading === 'Fioritura');
const output = (text: string, factIndices = [0]) => ({
  sections: [{ heading: 'Introduzione', text, factIndices }],
  missingInformation: [],
});

test('Yucca originale: provider simulato, prompt effettivo, testo sviluppato e rendiconto completo', async () => {
  let calls = 0;
  const result = await generateDraftSheet(
    def,
    rows,
    'Yucca filamentosa',
    [],
    [],
    (strategy, ctx) =>
      callAiProvider(strategy, ctx, {
        apiKey: 'simulata',
        model: 'simulato',
        timeoutMs: 1000,
        fetchImpl: async (_url, init) => {
          calls++;
          const body = JSON.parse(String(init?.body));
          assert.match(body.messages[0].content, /online-garden-editoriale-it@2/);
          assert.match(body.messages[0].content, /250–450/);
          assert.doesNotMatch(body.messages[0].content, /simulata/);
          const data = JSON.parse(body.messages[1].content);
          assert.equal(data.productName, 'Yucca filamentosa');
          assert.doesNotMatch(JSON.stringify(data.facts), /Agavaceae|Asparagaceae|150 cm|fusto a fiamma/);
          assert.match(JSON.stringify(data.facts), /steli floreali/);
          return Response.json({
            choices: [{
              message: {
                tool_calls: [{
                  function: {
                    name: 'propose_field_improvement',
                    arguments: JSON.stringify({ suggested_value: response }),
                  },
                }],
              },
            }],
          });
        },
      }),
    async () => {
      throw Error('Nessuna selezione prenotata');
    },
  );
  assert.ok('coverage' in result);
  assert.equal(calls, 1);
  assert.equal(result.promptVersion, 'online-garden-editoriale-it@2');
  assert.equal(result.sections.length, 5);
  assert.equal(result.descriptionIssues.length, 0);
  assert.equal(result.coverage.length, 20);
  assert.equal(result.coverage.filter((f) => f.status === 'contradictory').length, 4);
  assert.equal(result.coverage.filter((f) => f.status === 'unverified').length, 1);
  assert.equal(result.coverage.filter((f) => f.status === 'uncovered').length, 0);
  assert.ok(result.coverage.filter((f) => !f.exclusion).every((f) => f.headings.length > 0));
  assert.match(String(result.value), /<strong>3 metri di altezza<\/strong>/);
  assert.doesNotMatch(String(result.value), /Agavaceae|Asparagaceae|150|irrigazione/);
  const words = (s: string) => s.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
  assert.ok(words(String(result.value)) > words(source));
  assert.deepEqual(rows, factsFromText(source, true));
});

test('testo libero anche su una riga, convalidato senza troncamenti', () => {
  const prose = source.trim().replace(/\s+/g, ' ');
  assert.equal(factsFromText(prose, true).join(' '), prose);
  assert.throws(() => factsFromText(prose, false));
  assert.throws(() => factsFromText(prose + ' https://example.test', true));
});

test('citare una riga non copre tutte le sue affermazioni e una rosetta non prova un fusto assente', () => {
  const facts = ['La pianta forma rosette basali. Solitamente priva di fusto.'];
  const result = validateEditorialDescription(
    def,
    facts,
    output('Alla base la pianta forma rosette basali.'),
  );
  assert.equal(result.coverage[1].status, 'uncovered');
  for (
    const text of [
      'La pianta è senza fusto.',
      'Generalmente la pianta ha un fusto.',
      'La pianta non è priva di fusto.',
    ]
  ) {
    assert.throws(() => validateEditorialDescription(def, facts, output(text)));
  }
  const equivalent = validateEditorialDescription(
    def,
    facts,
    output('La pianta è generalmente senza fusto.'),
  );
  assert.equal(equivalent.coverage[1].status, 'equivalent');
  assert.equal(equivalent.coverage[0].status, 'uncovered');
});

test('nessuna deduzione su organo, unità, famiglia, usi, rischi e campi commerciali', () => {
  for (
    const text of [
      'La pianta raggiunge 3 metri di altezza.',
      'La pianta raggiunge tre metri.',
      'Lo stelo floreale raggiunge 3 cm.',
      'La famiglia è Agavaceae.',
      'Le foglie sono tossiche.',
      'La pianta è adatta al pieno sole.',
      'La pianta è resistente al gelo.',
      'La pianta è rustica.',
      'La pianta richiede irrigazione quotidiana.',
      'La pianta richiede concimazione mensile.',
      'La pianta è certificata biologica.',
      'La pianta purifica l’aria.',
      'La pianta è adatta alle bordure.',
      'Il prezzo della pianta è 3 euro.',
      'SKU della pianta 3.',
      'La pianta è disponibile in stock.',
      'La pianta sopporta 3 °C.',
      'Le foglie sono viola.',
      '<img src=x>',
    ]
  ) {
    assert.throws(() => validateEditorialDescription(def, rows, output(text, [0, 1, 2])), text);
  }
  const corrected = analyzeFacts([
    'La pianta raggiunge 150 cm di altezza.',
    'Lo stelo floreale raggiunge i 3 metri di altezza.',
  ]);
  assert.ok(corrected.every((f) => !f.exclusion));
  assert.ok(!usableFacts(analyzeFacts(rows)).join(' ').includes('150 cm'));
  assert.match(
    renderSections([{ heading: 'Fioritura', text: '<script>test</script>' }], true),
    /&lt;script&gt;/,
  );
});

test('una sola sezione è richiesta e validata, errori e campi già accettati conservano il testo', async () => {
  const sections: SectionReview[] = response.sections.map((s: EditorialSection) => ({
    ...s,
    status: s.heading === 'Introduzione' ? 'accepted' : 'manual',
  }));
  const stable = JSON.stringify(sections);
  const result = await generateConfirmedProposal(def, rows, async (strategy, ctx) => {
    assert.match(strategy.instruction, /una sola sezione, intitolata «Fioritura»/);
    assert.equal(ctx.productName, 'Yucca filamentosa');
    return { value: { sections: [flower], missingInformation: [] } };
  }, { section: 'Fioritura', productName: 'Yucca filamentosa', review: true });
  assert.ok('sections' in result);
  const next = replaceSection(sections, 'Fioritura', result.sections[0]);
  assert.equal(next.find((s) => s.heading === 'Fioritura')?.status, 'proposed');
  assert.ok(sections.filter((s) => s.heading !== 'Fioritura').every((s) => next.includes(s)));
  assert.equal(replaceSection(sections, 'Introduzione', sections[0]), sections);
  assert.equal(replaceSection(sections, 'Fioritura', undefined), sections);
  assert.equal(allSectionsReviewed(next), false);
  assert.equal(activeSections([{ ...sections[0], status: 'rejected' }]).length, 0);
  assert.ok(factCoverage(analyzeFacts(rows), []).every((f) => f.exclusion || f.status === 'uncovered'));
  for (
    const invalid of [response, output('La pianta è tossica.'), {
      sections: [{ ...flower, text: 'Questo stelo misura 400 metri.' }],
      missingInformation: [],
    }]
  ) {
    await assert.rejects(
      generateConfirmedProposal(def, rows, async () => ({ value: invalid }), {
        section: 'Fioritura',
        review: true,
      }),
    );
  }
  assert.equal(JSON.stringify(sections), stable);
});

test('se tutte le fonti sono escluse la preview rende conto del motivo senza interrogare AI', async () => {
  const r = await generateConfirmedProposal(def, ['Prezzo commerciale 10 euro.'], async () => {
    throw Error('provider inatteso');
  }, { review: true });
  assert.ok('coverage' in r);
  assert.equal(r.value, '');
  assert.equal(r.coverage[0].status, 'unverified');
  assert.deepEqual(r.sections, []);
  assert.equal(r.source,'source_review');
});

test('misure con condizioni distinte richiedono lo stesso contesto nelle proposte', () => {
  const facts = [
    'In vaso la pianta raggiunge 150 cm di altezza.',
    'In piena terra la pianta raggiunge 3 metri di altezza.',
  ];
  assert.ok(analyzeFacts(facts).every((f) => !f.exclusion));
  assert.throws(() =>
    validateEditorialDescription(def, facts, output('La pianta raggiunge 3 metri di altezza.', [0, 1]))
  );
  assert.throws(() =>
    validateEditorialDescription(def, facts, output('In vaso la pianta arriva a 3 metri di altezza.', [0, 1]))
  );
  assert.doesNotThrow(() =>
    validateEditorialDescription(
      def,
      facts,
      output('In piena terra la pianta può raggiungere 3 metri di altezza.', [1]),
    )
  );
});
