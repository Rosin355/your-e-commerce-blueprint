import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factsFromText } from '../../supabase/functions/_shared/admin-ai-facts.ts';
import { validateEditorialDescription } from '../../supabase/functions/_shared/admin-ai-description.ts';
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

test('UAT ricostruita: 137 parole, tre equivalenze, recupero locale e SEO senza seconda chiamata', async () => {
  const partial = JSON.parse(load('v3-uat-parziale.json'));
  const before = articleAssessment(articleRows(partial.sections, facts), facts);
  assert.equal(before.words, 137);
  assert.equal(before.covered, 8);
  assert.equal(before.coverage.filter(f => f.duplicateOf !== undefined).length, 1);
  for (const fragment of ['Fiori bianco crema', 'All\'inizio dell\'estate', 'la pianta tende']) {
    assert.equal(before.coverage.find(f => f.text.startsWith(fragment))?.status, 'equivalent');
  }
  const definitions = ['seo_title','seo_description','tags'].map(key => ({
    ...description, key, editor_type:key === 'tags' ? 'multiselect' : 'text',
    data_type:key === 'tags' ? 'json' : 'text',
  } as FieldDefinition));
  let calls = 0;
  const result = await generateDraftSheet(description,facts,ctx.title,definitions,[],async (_strategy, context) => {
    calls++;
    assert.ok(context.sourceAtoms?.every(f => 'suggestedHeading' in f));
    return {value:partial,provider:'lovable',model:'fixture',usageTokens:null};
  },async () => { throw Error('Prenotazione SEO assente'); },true);
  assert.equal(calls,1);
  assert.ok('sections' in result && result.sections);
  const assessment = articleAssessment(articleRows(result.sections,facts,result.editorial),facts);
  assert.equal(assessment.covered,10);
  assert.equal(assessment.missing.length,5);
  assert.deepEqual(assessment.problems,[]);
  assert.deepEqual(result.sections.filter(s=>s.origin==='derived').map(s=>s.heading),
    ['Introduzione','Descrizione botanica','Coltivazione e manutenzione']);
  assert.equal(result.editorial.seoTitle?.value,'Yucca filamentosa – arbusto sempreverde');
  assert.match(String(result.editorial.seoDescription?.value),/terreno fertile e ben drenato/);
  assert.deepEqual(result.editorial.tags?.value,['Yucca filamentosa','arbusto sempreverde']);
  assert.equal(result.editorial.tags?.source,'deterministic');
});

test('un organo o una polarità errati non coprono una misura o un fatto affermativo', () => {
  for (const [source, text] of [
    ['Gli steli floreali possono arrivare a 3 metri.', 'La pianta può arrivare a 3 metri.'],
    ['La pianta produce numerosi germogli basali.', 'La pianta non produce numerosi germogli basali.'],
    ['La specie appartiene alla famiglia delle Agavaceae.', 'La specie appartiene alla famiglia delle Asparagaceae.'],
  ]) {
    const check = articleAssessment([{key:'Descrizione botanica',text,factIndices:[0],origin:'model'}],[source]);
    assert.equal(check.covered,0);
    assert.ok(check.problems.length>0);
  }
});

test('una sezione scartata resta diagnosticata anche quando si recupera una nuova frase dalle fonti', async () => {
  const partial = JSON.parse(load('v3-uat-parziale.json'));
  partial.sections.push({heading:'Coltivazione e manutenzione',text:'Richiede irrigazioni quotidiane.',factIndices:[0]});
  const result = await generateConfirmedProposal(description,facts,async () => ({value:partial}),
    {article:true,review:true,productName:ctx.title});
  assert.ok('sections' in result && result.sections);
  assert.deepEqual(result.sectionAudit,{received:4,accepted:3,rejected:1,derived:3});
  assert.ok(result.descriptionIssues.some(i => i.section === 'Coltivazione e manutenzione' && i.code === 'UNSUPPORTED_FACT'));
  assert.doesNotMatch(result.value as string,/quotidiane/);
});

test('la forma e il colore delle foglie non possono coprire la proprietà dei fiori', () => {
  const statement='Fiori bianco crema a forma di campana.';
  const check=articleAssessment([{key:'Fioritura',text:'Compaiono i fiori. Le foglie sono bianco crema a forma di campana.',
    factIndices:[0,1],origin:'model'}],[statement,'Le foglie sono bianco crema a forma di campana.']);
  assert.equal(check.coverage[0].status,'uncovered');
});

test('una prima sezione errata non oscura la successiva versione valida dello stesso titolo', async () => {
  const partial = JSON.parse(load('v3-uat-parziale.json'));
  partial.sections.unshift({heading:'Fioritura',text:'I fiori sono velenosi.',factIndices:[0]});
  const result = await generateConfirmedProposal(description,facts,async () => ({value:partial}),
    {article:true,review:true,productName:ctx.title});
  assert.ok('sections' in result && result.sections);
  assert.equal(result.sections.filter(s => s.heading==='Fioritura').length,1);
  assert.equal(result.sectionAudit?.rejected,1);
  assert.ok(result.descriptionIssues.some(i => i.code==='UNSUPPORTED_FACT'));
  assert.doesNotMatch(result.value as string,/velenosi/);
});

test('equivalenza del portamento circoscritta a soggetto, polarità e contesto', () => {
  const check = (source: string[], text: string) => articleAssessment([{
    key:'Portamento e sviluppo', text, factIndices:source.map((_,i)=>i), origin:'model',
  }], source);
  for (const text of ['Il portamento è verticale.', 'Lo sviluppo è verticale.']) {
    assert.equal(check(['Portamento eretto'], text).coverage[0].status, 'equivalent');
    for (const source of ['Gli steli sono verticali.', 'Portamento non eretto.', 'Portamento eretto solo in vaso.',
      'Portamento eretto in piena terra.', 'Portamento eretto da adulta.']) {
      assert.ok(check([source], text).problems.length);
      assert.equal(check([source], text).covered, 0);
    }
  }
  const wrongOrgan = check(['Portamento eretto', 'Le foglie sono verdi.'], 'Le foglie sono verticali.');
  assert.equal(wrongOrgan.covered, 0);
  assert.ok(wrongOrgan.problems.some(p=>p.includes('organo')));
  for (const text of ['Le foglie hanno un portamento eretto.', 'Il portamento dello stelo è verticale.']) {
    assert.ok(check(['Portamento eretto.', 'Le foglie sono verdi.', 'Lo stelo è lungo.'],text).problems.some(p=>p.includes('organo')));
  }
  assert.equal(check(['Portamento eretto'], 'Il portamento non è verticale.').covered, 0);
});

test('aggettivo estetico richiede fonte sullo stesso organo', () => {
  const run = (sources: string[]) => validateEditorialDescription(description, sources, {sections:[{
    heading:'Fioritura', text:'I fiori sono eleganti.', factIndices:sources.map((_,i)=>i),
  }],missingInformation:[]},{article:true,review:true});
  for (const facts of [['Fiori penduli.'], ['Fiori penduli.', 'Le foglie sono eleganti.'],
    ['I fiori non sono eleganti.']]) {
    const result = run(facts);
    assert.equal(result.sectionAudit?.rejected, 1);
    assert.match(result.descriptionIssues[0].message, /estetico/);
  }
  assert.equal(run(['Fiori eleganti e penduli.']).sectionAudit?.accepted, 1);
});

test('audit separa frasi scartate, fatti distinti e parole derivate', () => {
  const raw = JSON.parse(load('v3-semantica.json'));
  const result = validateEditorialDescription(description,facts,raw,{productName:ctx.title,article:true,review:true});
  assert.deepEqual(result.sectionAudit, {received:2,accepted:1,rejected:1,derived:3});
  assert.deepEqual(result.generationAudit?.words, {generated:13,accepted:4,derived:26,final:30});
  assert.equal(result.generationAudit?.partialSections, 1);
  assert.deepEqual(result.descriptionIssues.filter(i=>i.code==='UNSUPPORTED_FACT').map(i=>[i.section,i.sentence]),
    [['Portamento e sviluppo',2],['Fioritura',undefined]]);
  assert.doesNotMatch(result.value, /eleganti|irrigazioni/);
  const assessment = articleAssessment(articleRows(result.sections,facts),facts);
  assert.deepEqual([assessment.covered,assessment.distinctCovered,assessment.distinctUsable],[5,4,14]);
  assert.equal(assessment.coverage.filter(f=>f.duplicateOf!==undefined).length,1);
  assert.equal(assessment.coverage.filter(f=>f.status==='contradictory').length,4);
  assert.equal(result.generationAudit?.unmatchedFacts.length,10);
  assert.deepEqual(result.generationAudit?.filteredFacts,[]);
});

test('scarto misurato di un fatto prima presente, omissione e testo grezzo indisponibile', () => {
  const raw = {sections:[{heading:'Portamento e sviluppo',text:'Portamento eretto.',factIndices:[0]},
    {heading:'Fioritura',text:null,factIndices:[1]}],missingInformation:[]};
  const result = validateEditorialDescription(description,['Portamento eretto.','Fiori penduli.'],raw,{article:true,review:true});
  assert.deepEqual(result.generationAudit?.filteredFacts,[0]); // Exact copy, a provable loss.
  assert.deepEqual(result.generationAudit?.unmatchedFacts,[1]);
  assert.deepEqual(result.generationAudit?.words,{generated:null,accepted:0,derived:0,final:0});
  assert.deepEqual(result.descriptionIssues.map(i=>i.code),['EXTRACTIVE_COPY','FORMAT_ERROR','INCOMPLETE_RESPONSE']);
});

test('scarta la misura attribuita alla pianta conservando soltanto il portamento autonomo', () => {
  const result = validateEditorialDescription(description,['Portamento eretto.','Gli steli possono raggiungere 3 metri.'],
    {sections:[{heading:'Portamento e sviluppo',text:'Il portamento è verticale. La pianta raggiunge 3 metri.', factIndices:[0,1]}],
      missingInformation:[]},{article:true,review:true});
  assert.equal(result.sections[0].text,'Il portamento è verticale.');
  assert.match(result.descriptionIssues[0].message,/organo/);
  assert.deepEqual(result.coverage.map(f=>f.status),['equivalent','uncovered']);
});

test('rifiuta il recupero parziale se cambia una condizione, un riferimento o la sicurezza del formato', () => {
  for (const tail of ['Tuttavia i fiori sono eleganti.', 'Lo sono soltanto in vaso.', 'Le foglie sono eleganti solo in estate.',
    'La pianta non richiede irrigazione quotidiana.', 'I fiori sono eleganti; tranne in estate.', '<b>Fiori eleganti</b>.']) {
    const result = validateEditorialDescription(description,['Portamento eretto.','Fiori penduli.'],
      {sections:[{heading:'Portamento e sviluppo',text:'Il portamento è verticale. '+tail,factIndices:[0,1]}],
        missingInformation:[]},{article:true,review:true});
    assert.equal(result.sectionAudit?.accepted,0,tail);
  }
  const mixed = {sections:[{heading:'Fioritura', text:'I fiori sono penduli. I fiori sono eleganti.',factIndices:[0]}],missingInformation:[]};
  const extractive = validateEditorialDescription(description,['I fiori sono penduli.'],mixed,{article:true,review:true});
  assert.equal(extractive.sectionAudit?.rejected,1);
  assert.ok(extractive.descriptionIssues.some(i=>i.code==='EXTRACTIVE_COPY'));
  assert.throws(()=>validateEditorialDescription(description,['I fiori sono penduli.'],mixed,{article:true,review:true,section:'Fioritura'}));
});
