import type { FieldDefinition } from '../../../supabase/functions/_shared/admin-v2-types';
import { isFieldEditable, validateValue } from '../../../supabase/functions/_shared/admin-v2-validation';
import type { AdminField } from './adminApi';

export const evidenceLabels = {
  key_features: 'Caratteristiche principali',
  key_benefits: 'Punti di forza',
  faq: 'Domande frequenti',
} as const;
export type EvidenceKey = keyof typeof evidenceLabels;
export type EvidenceReview = Partial<
  Record<EvidenceKey, { value: unknown; selected: boolean; manual?: boolean }>
>;
export function evidenceReview(facts: string[], defs: FieldDefinition[], editable: string[]): EvidenceReview {
  const rows: EvidenceReview = {};
  const features = facts.filter((s) => !/^FAQ\s*:|^Punto di forza\s*:/i.test(s)).map((s) =>
    s.replace(/^Caratteristica\s*:\s*/i, '')
  );
  const benefits = facts.filter((s) => /^Punto di forza\s*:/i.test(s)).map((s) =>
    s.replace(/^Punto di forza\s*:\s*/i, '')
  );
  const faq = facts.flatMap((s) => {
    const pair = /^FAQ\s*:\s*(.+?\?)\s+(.+)$/i.exec(s);
    return pair ? [{ question: pair[1], answer: pair[2] }] : [];
  });
  for (const key of Object.keys(evidenceLabels) as EvidenceKey[]) {
    const def = defs.find((d) => d.key === key);
    if (
      !def?.editable || !def.visible || !isFieldEditable(def).ok || def.manual_only || !editable.includes(key)
    ) continue;
    const items = key === 'faq' ? faq : key === 'key_features' ? features : benefits;
    const value = items;
    if (items.length && validateValue(def, value).ok) rows[key] = { value, selected: true };
  }
  return rows;
}

export function sourceFacts(fields: AdminField[]) {
  const out: { text: string; origin: string }[] = [];
  for (
    const key of [
      'description',
      'short_description',
      'key_features',
      'key_benefits',
      'nome_botanico',
      'nome_comune',
      'faq',
    ]
  ) {
    const field = fields.find((f) => f.key === key);
    if (!field) continue;
    for (
      const [value, origin] of [[field.shopifyLiveValue, 'Shopify · da verificare'], [
        field.value,
        field.reviewStatus === 'approved' ? 'Admin · confermato' : 'Admin · da verificare',
      ]] as const
    ) {
      const parts = Array.isArray(value) ? value : [value];
      for (const part of parts) {
        const raw = typeof part === 'string'
          ? part
          : key === 'faq' && typeof part?.question === 'string' && typeof part.answer === 'string'
          ? 'FAQ: ' + part.question + ' ' + part.answer
          : '';
        const cleaned = raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(
          /<\/(?:p|li)>|<br\s*\/?>/gi,
          '\n',
        ).replace(/<[^>]*>/g, '');
        const prefix = key === 'key_benefits' ? 'Punto di forza: ' : '';
        for (const line of cleaned.split(key === 'faq' ? /\n/ : /\n|(?<=[.!?])\s+(?=[A-ZÀ-Ü])/)) {
          const t = prefix + line.trim();
          if (!line.trim()) continue;
          if (
            t.length >= 12 && t.length <= 500 && !/[<>]|https?:\/\/|\S+@\S+/i.test(t) &&
            !out.some((o) => o.text === t)
          ) out.push({ text: t, origin });
        }
      }
    }
  }
  return out.slice(0, 12);
}
