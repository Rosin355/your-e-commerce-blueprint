import type { AuthContext, FieldDefinition } from './admin-v2-types.ts';
import { catalogAiAllowed, EDITORIAL_AI_FIELDS } from './admin-catalog-policy.ts';
import { aiDefinitionEligibility, type AiTrustedContext, strategyForField, validateSuggestedValue } from './admin-ai-core.ts';
import { editorialInstruction, extractiveInstruction, PROMPT_VERSION } from './admin-ai-editorial-contract.ts';
import { allowedRows, analyzeFacts } from './admin-ai-evidence.ts';
import { type DescriptionRequest, validateEditorialDescription } from './admin-ai-description.ts';
export const CONFIRMED_AI_FIELDS = EDITORIAL_AI_FIELDS;
export { confirmedFacts } from './admin-ai-facts.ts';
export function authorizeConfirmedAi(auth: AuthContext, def: FieldDefinition | null, action: unknown) {
  if (action !== 'suggest_confirmed_field' || !def || !catalogAiAllowed(auth,def.key) || !(CONFIRMED_AI_FIELDS as readonly string[]).includes(def.key) || !def.visible || !def.editable || aiDefinitionEligibility(def) !== 'allowed') throw new Error('Azione AI non autorizzata per questo account e campo.');
}
export class ConfirmedProposalError extends Error {
  constructor(public code: 'INVALID_MODEL_PROPOSAL' | 'INVALID_FIELD_VALUE', message: string) {
    super(message);
  }
}

export async function generateConfirmedProposal(
  def: FieldDefinition,
  facts: string[],
  generate: (strategy: NonNullable<ReturnType<typeof strategyForField>>, context: AiTrustedContext) => Promise<{ value: unknown }>,
  request: DescriptionRequest = {},
) {
  const strategy = strategyForField(def.key);
  if (!strategy) throw new ConfirmedProposalError('INVALID_FIELD_VALUE', 'Campo AI non supportato.');
  const description = def.key === 'description';
  const allowed = allowedRows(facts, analyzeFacts(facts));
  if (!allowed.some(Boolean)) {
    if (description && request.review && !request.section) {
      const assessment = validateEditorialDescription(def, facts, {sections:[],missingInformation:[]}, request);
      return {...assessment,source:'source_review' as const};
    }
    throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL','Tutti i fatti richiedono verifica. Correggi le informazioni prima di rigenerare.');
  }
  const inputs = description ? allowed : allowed.filter(Boolean);
  const response = await generate({
    ...strategy,
    ...(description ? { id: 'verified-editorial-description', version: PROMPT_VERSION, instruction: editorialInstruction(request.section) } : {
      instruction: extractiveInstruction,
    }),
  }, {
    sku: '', fieldKey: def.key, fieldLabel: def.label,
    currentValue: strategy.kind === 'text' ? inputs.join('\n') : inputs,
    wordpressOriginal: null, sourceSnapshotId: null, trustedRelatedValues: {}, ...(request.productName ? {productName:request.productName} : {}),
  });

  if (description) {
    try { return validateEditorialDescription(def, facts, response.value, request); }
    catch (error) { throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL', error instanceof Error ? error.message : 'Proposta editoriale non valida.'); }
  }
  return validateConfirmedProposal(def, inputs, response.value);
}

export function validateConfirmedProposal(def: FieldDefinition, facts: string[], raw: unknown) {
  const strategy = strategyForField(def.key);
  if (!strategy) throw new ConfirmedProposalError('INVALID_FIELD_VALUE', 'Campo AI non supportato.');
  const parts = typeof raw === 'string'
    ? raw.split(/\n+/).map(line => line.trim()).filter(Boolean)
    : raw;
  if (!Array.isArray(parts) || !parts.length || !parts.every(part => typeof part === 'string' && part.trim())) {
    throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL', 'Il modello ha restituito una proposta illeggibile.');
  }
  const extractive = parts.every(part => facts.includes(part)) && new Set(parts).size === parts.length;
  const description = def.key === 'description';
  const useOriginals = !extractive || (description && parts.length !== facts.length);
  if (useOriginals) {
    throw new ConfirmedProposalError('INVALID_MODEL_PROPOSAL', 'Il modello ha cambiato i fatti confermati.');
  }

  const lines: string[] = parts;
  const source = 'model' as const;
  let value: string | string[] = lines;
  if (strategy.kind === 'text') {
    value = def.editor_type === 'richtext'
      ? lines.map(line => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')
      : lines.join('\n\n');
  }
  // The shared field validator also requires canonical, sanitized editorial HTML.
  const valid = validateSuggestedValue(def, strategy, value);
  if (!valid.ok) throw new ConfirmedProposalError('INVALID_FIELD_VALUE', 'Il testo supera i limiti o non rispetta il formato del campo.');
  return { value: valid.value, source };
}
