import { analyzeFacts, usableFacts } from '../_shared/admin-ai-evidence.ts';
import { ConfirmedProposalError, generateConfirmedProposal } from '../_shared/admin-ai-confirmed.ts';
import { draftModelEligible, editorialKeys, editorialOptions, registryKeys, resolveEditorialField, type EditorialKey, type EditorialOptions, type EditorialProposal } from '../_shared/admin-draft-editorial.ts';
import type { FieldDefinition } from '../_shared/admin-v2-types.ts';
import { callDraftSheetProvider, type callAiProvider } from './provider.ts';

// Only a server reservation can supply modelFields. The caller's payload never sets them.
export async function generateDraftSheet(description: FieldDefinition, facts: string[], title: string,
  definitions: FieldDefinition[], modelFields: string[], generate: typeof callAiProvider, generateSheet = callDraftSheetProvider) {
  const safeFacts = usableFacts(analyzeFacts(facts));
  const options = editorialOptions(title, safeFacts);
  const candidates: Partial<EditorialOptions> = {};
  const fields = new Map<EditorialKey, FieldDefinition>();
  for (const key of editorialKeys) {
    const def = definitions.find(d => d.key === registryKeys[key]);
    if (!def || !resolveEditorialField(key, options, undefined, def)) continue;
    fields.set(key, def);
    if (draftModelEligible(def) && modelFields.includes(def.key)) candidates[key] = options[key];
  }

  const proposal = await generateConfirmedProposal(description, facts, generate, {productName:title, review:true});
  let choices: Record<string, unknown> = {};
  if (safeFacts.length && Object.keys(candidates).length) {
    const output = (await generateSheet(safeFacts, candidates)).value;
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL', 'Risposta editoriale illeggibile.');
    }
    choices = output as Record<string, unknown>;
  }
  const editorial: Partial<Record<EditorialKey, EditorialProposal>> = {};
  for (const [key, def] of fields) {
    const row = resolveEditorialField(key, options, Object.hasOwn(candidates, key) ? choices[key] : undefined, def);
    if (row) editorial[key] = row;
  }
  return { ...proposal, editorial };
}
