import type { AuthContext, FieldDefinition } from './admin-v2-types.ts';
import { catalogAiAllowed, EDITORIAL_AI_FIELDS } from './admin-catalog-policy.ts';
import { aiDefinitionEligibility, type AiTrustedContext, strategyForField, validateSuggestedValue } from './admin-ai-core.ts';
export const CONFIRMED_AI_FIELDS = EDITORIAL_AI_FIELDS;
export { confirmedFacts } from './admin-ai-facts.ts';
export function authorizeConfirmedAi(auth: AuthContext, def: FieldDefinition | null, action: unknown) {
  if (action !== 'suggest_confirmed_field' || !def || !catalogAiAllowed(auth,def.key) || !(CONFIRMED_AI_FIELDS as readonly string[]).includes(def.key) || !def.visible || !def.editable || aiDefinitionEligibility(def) !== 'allowed') throw new Error('Azione AI non autorizzata per questo account e campo.');
}
export async function generateConfirmedProposal(def: FieldDefinition, facts: string[], generate: (strategy: NonNullable<ReturnType<typeof strategyForField>>, context: AiTrustedContext) => Promise<{ value: unknown }>) {
  const strategy = strategyForField(def.key)!;
  const response = await generate({ ...strategy, instruction: 'Organizza esclusivamente le frasi confermate, riportandole ESATTAMENTE senza cambiare parole o aggiungere fatti. Per il testo separale con un a capo; per gli elenchi usa una frase per voce. Non aggiungere titoli, HTML, prezzi o specifiche.' }, { sku: '', fieldKey: def.key, fieldLabel: def.label, currentValue: strategy.kind === 'text' ? facts.join('\n') : facts, wordpressOriginal: null, sourceSnapshotId: null, trustedRelatedValues: {} });
  const parts = typeof response.value === 'string' ? response.value.split(/\n+/).map(x=>x.trim()).filter(Boolean) : response.value;
  // Extractive mode: a model cannot introduce even a negation or an unsupported number/claim.
  if (!Array.isArray(parts) || !parts.length || parts.some(x=>typeof x!=='string' || !facts.includes(x)) || new Set(parts).size!==parts.length) throw new Error('La proposta contiene informazioni diverse da quelle confermate. Nessuna modifica effettuata; compila manualmente.');
  const value = strategy.kind === 'text' ? (def.editor_type === 'richtext' ? parts.map(x=>`<p>${x.replace(/&/g,'&amp;')}</p>`).join('') : parts.join('\n\n')) : parts;
  const valid = validateSuggestedValue(def,strategy,value);
  if (!valid.ok) throw new Error('Proposta non valida per il campo. Nessuna modifica effettuata.');
  return valid.value;
}
