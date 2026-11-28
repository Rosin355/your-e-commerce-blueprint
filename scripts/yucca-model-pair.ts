/** One isolated pair. Default transport is an in-memory fixture, even if a key is set. */
import { createHash, randomInt } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { factsFromText } from '../supabase/functions/_shared/admin-ai-facts.ts';
import type { FieldDefinition } from '../supabase/functions/_shared/admin-v2-types.ts';
import { generateDraftSheet } from '../supabase/functions/product-admin-ai/draft-sheet.ts';
import { callAiProvider, AiProviderError } from '../supabase/functions/product-admin-ai/provider.ts';

const args = process.argv.slice(2);
const live = args[0] === '--run-pair';
if (live ? args.length !== 2 : args.length !== 0) throw Error('Uso: nessun argomento (offline), oppure --run-pair <nuova directory privata>.');
const key = live ? process.env.YUCCA_AB_GATEWAY_KEY : 'fixture';
if (!key) throw Error('Chiave dedicata al test assente.');
// Text credits per million tokens, standard tier, Lovable GET /v1/models 2026-11-27.
const standardRates = {
  'google/gemini-3-flash-preview': {input:2, cached:0.2, output:12},
  'openai/gpt-5.4-mini': {input:3, cached:0.3, output:18},
};
const models = Object.keys(standardRates) as (keyof typeof standardRates)[];
const fixture = (file: string) => readFileSync(new URL('./tests/fixtures/yucca-filamentosa-' + file, import.meta.url), 'utf8');
const facts = factsFromText(fixture('uat-20261127.txt'), true);
const synthetic = JSON.parse(fixture('v3-semantica.json'));
const field = {key:'description', label:'Descrizione', editor_type:'richtext', data_type:'text',
  visible:true, editable:true, manual_only:false, ai_allowed:true, validation_rules:{}} as FieldDefinition;
const fields = ['seo_title','seo_description','tags'].map(key => ({...field, key,
  editor_type:key === 'tags' ? 'multiselect' : 'text', data_type:key === 'tags' ? 'json' : 'text'} as FieldDefinition));
const mock = () => Response.json({choices:[{message:{tool_calls:[{function:{
  name:'propose_field_improvement', arguments:JSON.stringify({suggested_value:synthetic}),
}}]}}]});
const describe = (model: string, transport: typeof fetch) => generateDraftSheet(field, facts, 'Yucca filamentosa',
  fields, [], (strategy, context) => callAiProvider(strategy, context, {
    model, apiKey:key, timeoutMs:12000, fetchImpl:transport,
  }), async () => {throw Error('Selezione AI SEO fuori protocollo.');}, true);

async function main() {
  // Verify both production-built request bodies before either arm may use the network.
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  let sharedHash = '';
  function checkBody(model: string, init?: RequestInit) {
    const { model: sentModel, ...contract } = JSON.parse(String(init?.body));
    if (model !== sentModel || contract.max_tokens !== 2000 || contract.temperature !== 0.2 ||
        JSON.parse(contract.messages[1].content).facts.length !== 15) throw Error('Contratto A/B incompatibile.');
    const hash = digest(contract);
    if (sharedHash && sharedHash !== hash) throw Error('Prompt, schema o parametri differenti.');
    sharedHash = hash;
  }
  for (const model of models) {
    await describe(model, async (_url, init) => { checkBody(model, init); return mock(); });
  }
  if (live) mkdirSync(args[1], {mode:0o700}); // Exclusive reservation for this pair, also on interrupted runs.
  const order = live && randomInt(2) ? [...models].reverse() : models;
  const save = (name: string, data: unknown) => writeFileSync(join(args[1], name),
    JSON.stringify(data, null, 2) + '\n', {mode:0o600, flag:'wx'});
  const records = [];
  let gatewayCalls = 0;
  for (const [index, model] of order.entries()) {
    const sample = String.fromCharCode(88 + index); // X/Y for independent editorial review.
    let calls = 0;
    let elapsedMs: number | null = null;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let cachedTokens: number | null = null;
    let finishReason: string | null = null;
    let servedModel: string | null = null;
    let rawSections: unknown = null;
    let statusCode: number | null = null;
    let startedUtc: string | null = null;
    let score;
    try {
      const result = await describe(model, async (url, init) => {
        checkBody(model, init);
        if (++calls !== 1) throw Error('Seconda chiamata esclusa dal pilota.');
        if (String(url) !== 'https://ai.gateway.lovable.dev/v1/chat/completions') throw Error('Gateway inatteso.');
        const start = performance.now();
        try {
          if (live) {
            gatewayCalls++;
            startedUtc = new Date().toISOString();
          }
          const response = live ? await fetch(url, {...init, redirect:'error'}) : mock();
          if (live) statusCode = response.status;
          if (response.ok) {
            const payload = await response.clone().json();
            inputTokens = payload.usage?.prompt_tokens ?? null;
            outputTokens = payload.usage?.completion_tokens ?? null;
            cachedTokens = payload.usage?.prompt_tokens_details?.cached_tokens ?? null;
            servedModel = payload.model ?? null;
            finishReason = payload.choices?.[0]?.finish_reason ?? null;
            const tool = payload.choices?.[0]?.message?.tool_calls?.[0]?.function;
            if (tool?.name === 'propose_field_improvement') {
              rawSections = JSON.parse(tool.arguments)?.suggested_value?.sections ?? null;
            }
          }
          return response;
        } finally {
          if (live) elapsedMs = Math.round(performance.now() - start);
        }
      });
      if (!('sections' in result) || !result.sections || !result.generationAudit) throw Error('Audit assente.');
      const distinct = result.coverage.filter(f => !f.exclusion && f.duplicateOf === undefined);
      score = {status:'validated', sectionAudit:result.sectionAudit, generationAudit:result.generationAudit,
        distinctCovered:distinct.filter(f => ['included','equivalent'].includes(f.status)).length,
        distinctUsable:distinct.length, issues:result.descriptionIssues, coverage:result.coverage};
      if (live) save('lettura-' + sample + '.json', {sample, facts, rawSections,
        sections:result.sections, seo:result.editorial, giudizio:{naturalezza_1_5:null, precisione_1_5:null,
          scorrevolezza_1_5:null, fatti_distinti_grezzi_su_14:null, fatti_distinti_finali_su_14:null,
          affermazioni_non_supportate_grezze:null, affermazioni_non_supportate_finali:null, seo_0_3:null}});
    } catch (error) {
      if (!live) throw error;
      score = {status:'inconclusive', reason:error instanceof AiProviderError ? error.code : 'VALIDATION_OR_TRANSPORT'};
      process.exitCode = 1;
    }
    const rate = standardRates[model];
    const cached = cachedTokens ?? 0;
    const estimatedStandardCredits = inputTokens !== null && outputTokens !== null && cached <= inputTokens
      ? ((inputTokens - cached) * rate.input + cached * rate.cached + outputTokens * rate.output) / 1_000_000 : null;
    const record = {sample, requestedModel:model, servedModel, contractSha256:sharedHash, startedUtc,
      statusCode, elapsedMs, inputTokens, cachedTokens, outputTokens, finishReason,
      estimatedStandardCredits, actualLovableCredits:null, ...score};
    records.push(record);
    if (live) save('tecnico-' + sample + '.json', record);
  }
  console.log(JSON.stringify({mode:live ? 'controlled' : 'offline-fixture', gatewayCalls, records}, null, 2));
}
main().catch(() => {console.error('Pilota interrotto. Verificare destinazione, contratto e autorizzazione.'); process.exitCode = 1;});
