import { articleVersion, type EditorialRevision } from '../_shared/admin-ai-revision.ts';
import { analyzeFacts, usableFacts } from '../_shared/admin-ai-evidence.ts';
import { ConfirmedProposalError, generateConfirmedProposal } from '../_shared/admin-ai-confirmed.ts';
import { draftModelEligible, editorialKeys, editorialOptions, registryKeys, resolveEditorialField, type EditorialKey, type EditorialOptions, type EditorialProposal } from '../_shared/admin-draft-editorial.ts';
import type { FieldDefinition } from '../_shared/admin-v2-types.ts';
import { callDraftSheetProvider, type callAiProvider } from './provider.ts';

// Only a server reservation can supply modelFields. The caller's payload never sets them.
export async function generateDraftSheet(description: FieldDefinition, facts: string[], title: string,
  definitions: FieldDefinition[], modelFields: string[], generate: typeof callAiProvider, generateSheet = callDraftSheetProvider, article = false, revision?: EditorialRevision) {
  const safeFacts = usableFacts(analyzeFacts(facts));
  const proposal = revision ? {value:'',source:'model' as const,promptVersion:articleVersion} :
    await generateConfirmedProposal(description, facts, generate, {productName:title, review:true,article});
  const baseOptions = editorialOptions(title, safeFacts);
  const options = { ...baseOptions };
  if (article) {
    // Keep restrictive or negative qualifications together (same rule as editorialOptions).
    const qualified = safeFacts.some(f => /\b(non|ma|solo|soltanto|salvo|eccetto|tranne|tuttavia|purché|rettifica|invece)\b/iu.test(f));
    if (!qualified) {
      // An entire, verified noun phrase; never extract a label from a qualified sentence.
      const habit = safeFacts.map(f => f.replace(/[.]$/, '').trim()).find(f =>
        /^(?:arbusto|albero|erbacea|rampicante) (?:sempreverde|caducifogli[oa]|perenne)$/iu.test(f));
      const titleWithHabit = habit && title + ' – ' + habit.toLocaleLowerCase('it');
      if (titleWithHabit && titleWithHabit.length <= 70) {
        options.seoTitle = [titleWithHabit, ...options.seoTitle.filter(v => v !== title)];
      }
      if (habit) options.tags = [...new Set([...options.tags, habit.toLocaleLowerCase('it')])];
      const sections = 'sections' in proposal ? proposal.sections ?? [] : [];
      const sentences = sections.map(s => s.text.replace(/\*\*/g,'').split(/(?<=[.!?])\s+/u)[0]);
      const care = safeFacts.find(f => /^(?:predilige|preferisce) (?:un |il )?(?:terreno|suolo|substrato) /iu.test(f));
      const summary = habit && care ? title + ' – ' + habit.toLocaleLowerCase('it') + '. ' + care : '';
      const rich = [summary, ...sentences].filter(v => v.length >= 45 && v.length <= 160 && /[.!?]$/.test(v));
      if (rich.length) options.seoDescription = [...new Set(rich)];
    }
    // Only explicit operator labels are eligible as additional keywords.
    const labels=safeFacts.flatMap(line=>{
      const match=/^(?:tag|parola chiave)\s*:\s*([\p{L}][\p{L}\p{M} ’'-]{1,58})[.]?$/iu.exec(line);
      return match && !/^og(?:qa)?shipping/i.test(match[1])?[match[1].trim()]:[];
    });
    options.tags=[...new Set([...options.tags,...labels])];
  }
  const candidates: Partial<EditorialOptions> = {};
  const fields = new Map<EditorialKey, FieldDefinition>();
  for (const key of editorialKeys) {
    if (revision && revision.target !== key) continue;
    const def = definitions.find(d => d.key === registryKeys[key]);
    if (!def) continue;
    // Narrow registries can still accept a shorter baseline candidate.
    if (!resolveEditorialField(key, options, undefined, def)) options[key] = baseOptions[key];
    if (!resolveEditorialField(key, options, undefined, def)) continue;
    fields.set(key, def);
    if (draftModelEligible(def) && modelFields.includes(def.key)) candidates[key] = options[key];
  }

  if (revision && !Object.keys(candidates).length) throw new ConfirmedProposalError('INVALID_FIELD_VALUE','La prenotazione non autorizza AI per questo campo.');
  let choices: Record<string, unknown> = {};
  if (safeFacts.length && Object.keys(candidates).length) {
    const output = (await generateSheet(safeFacts, candidates, {}, revision)).value;
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL', 'Risposta editoriale illeggibile.');
    }
    choices = output as Record<string, unknown>;
  }
  const editorial: Partial<Record<EditorialKey, EditorialProposal>> = {};
  for (const [key, def] of fields) {
    const row = resolveEditorialField(key, options, Object.hasOwn(candidates, key) && !(article && key === 'tags' && options.tags.length > 1 &&
      Array.isArray(choices.tags) && choices.tags.length === 1 && options.tags[Number(choices.tags[0])] === title)
      ? choices[key] : undefined, def);
    if (revision && row?.source !== 'model') throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL','Selezione editoriale non valida.');
    if (row) editorial[key] = row;
  }
  return { ...proposal, editorial };
}
