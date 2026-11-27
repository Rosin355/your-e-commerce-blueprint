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
  const options = editorialOptions(title, safeFacts);
  if (article) {
    // Prefer a complete, already validated introduction over an isolated source fragment.
    const intro='sections' in proposal ? proposal.sections?.find(s=>s.heading==='Introduzione') : undefined;
    const lead=intro?.text.replace(/\*\*/g,'').split(/(?<=[.!?])\s+/u)[0];
    if (lead && /[.!?]$/.test(lead) && lead.length<=320) options.seoDescription=[...new Set([lead,...options.seoDescription])];
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
    if (!def || !resolveEditorialField(key, options, undefined, def)) continue;
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
    const row = resolveEditorialField(key, options, Object.hasOwn(candidates, key) ? choices[key] : undefined, def);
    if (revision && row?.source !== 'model') throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL','Selezione editoriale non valida.');
    if (row) editorial[key] = row;
  }
  return { ...proposal, editorial };
}
