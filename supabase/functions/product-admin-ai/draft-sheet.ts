import { ConfirmedProposalError, generateConfirmedProposal, validateConfirmedProposal } from '../_shared/admin-ai-confirmed.ts';
import { editorialKeys, editorialOptions, registryKeys, resolveEditorialField, type EditorialKey, type EditorialOptions, type EditorialProposal } from '../_shared/admin-draft-editorial.ts';
import type { FieldDefinition } from '../_shared/admin-v2-types.ts';
import { callDraftSheetProvider, type callAiProvider } from './provider.ts';

// Only a server reservation can supply modelFields. The caller's payload never sets them.
export async function generateDraftSheet(description: FieldDefinition, facts: string[], title: string,
  definitions: FieldDefinition[], modelFields: string[], generate: typeof callAiProvider, generateSheet = callDraftSheetProvider) {
  const options = editorialOptions(title, facts);
  const candidates: Partial<EditorialOptions> = {};
  const fields = new Map<EditorialKey, FieldDefinition>();
  for (const key of editorialKeys) {
    const def = definitions.find(d => d.key === registryKeys[key]);
    if (!def || !resolveEditorialField(key, options, undefined, def)) continue;
    fields.set(key, def);
    if (def.ai_allowed && modelFields.includes(def.key)) candidates[key] = options[key];
  }

  let proposal;
  let choices: Record<string, unknown> = {};
  let descriptionError: {code: string; message: string} | undefined;
  if (Object.keys(candidates).length) {
    const output = (await generateSheet(facts, candidates)).value;
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL', 'Risposta editoriale illeggibile.');
    }
    choices = output as Record<string, unknown>;
    const order = choices.description;
    const validOrder = Array.isArray(order) && order.length === facts.length &&
      new Set(order).size === facts.length && order.every(n => Number.isInteger(n) && n >= 0 && n < facts.length);
    try {
      // An invalid ordering can only fall back to the complete, original sequence.
      proposal = validateConfirmedProposal(description, facts, validOrder ? order.map(n => facts[n]) : facts);
      if (!validOrder) proposal.source = 'confirmed_facts';
    } catch (error) {
      if (!(error instanceof ConfirmedProposalError)) throw error;
      descriptionError = {code: error.code, message: error.message};
    }
  } else {
    proposal = await generateConfirmedProposal(description, facts, generate);
  }
  const editorial: Partial<Record<EditorialKey, EditorialProposal>> = {};
  for (const [key, def] of fields) {
    const row = resolveEditorialField(key, options, Object.hasOwn(candidates, key) ? choices[key] : undefined, def);
    if (row) editorial[key] = row;
  }
  return { ...proposal, editorial, ...(descriptionError ? {descriptionError} : {}) };
}
