import type { AdminField } from './adminApi';

export interface FaqItem {
  question: string;
  answer: string;
}

export type FaqParseResult =
  | { kind: 'supported'; items: FaqItem[]; source: 'canonical' | 'legacy_alias' | 'json_string' }
  | { kind: 'unsupported'; raw: unknown; reason: string };

type EditableField = Pick<AdminField, 'key' | 'editorType' | 'dataType' | 'validationRules' | 'required'>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function parseFaqArray(value: unknown): Omit<Extract<FaqParseResult, { kind: 'supported' }>, 'source'> | null {
  if (!Array.isArray(value)) return null;
  const items: FaqItem[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) return null;
    if (
      exactKeys(entry, ['answer', 'question']) &&
      typeof entry.question === 'string' &&
      typeof entry.answer === 'string'
    ) {
      items.push({ question: entry.question, answer: entry.answer });
      continue;
    }
    if (
      exactKeys(entry, ['a', 'q']) &&
      typeof entry.q === 'string' &&
      typeof entry.a === 'string'
    ) {
      items.push({ question: entry.q, answer: entry.a });
      continue;
    }
    return null;
  }
  return { kind: 'supported', items };
}

/** Accetta solo i due formati FAQ realmente presenti; ogni altro legacy resta byte-for-byte intatto. */
export function parseFaqValue(raw: unknown): FaqParseResult {
  if (raw === null || raw === undefined) {
    return { kind: 'supported', items: [], source: 'canonical' };
  }
  const direct = parseFaqArray(raw);
  if (direct) {
    const legacyAlias = Array.isArray(raw) && raw.some((entry) => isPlainObject(entry) && 'q' in entry);
    return { ...direct, source: legacyAlias ? 'legacy_alias' : 'canonical' };
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const fromString = parseFaqArray(parsed);
      if (fromString) return { ...fromString, source: 'json_string' };
    } catch {
      // Il testo legacy opaco non viene trasformato né sostituito.
    }
  }

  return {
    kind: 'unsupported',
    raw,
    reason: 'Formato FAQ legacy non riconosciuto: il valore originale resta invariato.',
  };
}

export type EditorKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'string_list'
  | 'faq'
  | 'unsupported_json';

export function editorKind(field: EditableField): EditorKind {
  if (field.key === 'faq') return 'faq';
  if (field.dataType === 'number') return 'number';
  if (field.dataType === 'boolean') return 'boolean';
  if (field.dataType === 'array' || field.editorType === 'multiselect') return 'string_list';
  if (field.dataType === 'json') return 'unsupported_json';
  if (field.editorType === 'textarea' || field.editorType === 'richtext') return 'textarea';
  if (field.editorType === 'select') return 'select';
  return 'text';
}

export function isEditorValueSupported(field: EditableField, value: unknown): boolean {
  if (value === null || value === undefined) return editorKind(field) !== 'unsupported_json';
  switch (editorKind(field)) {
    case 'faq':
      return parseFaqValue(value).kind === 'supported';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'string_list':
      return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
    case 'unsupported_json':
      return false;
    default:
      return typeof value === 'string';
  }
}

export type NormalizationResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

/** Restituisce valori nativi: non converte mai number, boolean, array o JSON in stringa. */
export function normalizeEditorValue(field: EditableField, value: unknown): NormalizationResult {
  switch (editorKind(field)) {
    case 'faq': {
      const parsed = parseFaqValue(value);
      if (parsed.kind === 'unsupported') return { ok: false, message: parsed.reason };
      if (parsed.items.some((item) => !item.question.trim() || !item.answer.trim())) {
        return { ok: false, message: 'Ogni FAQ deve avere domanda e risposta.' };
      }
      return {
        ok: true,
        value: parsed.items.map((item) => ({ question: item.question.trim(), answer: item.answer.trim() })),
      };
    }
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? { ok: true, value }
        : { ok: false, message: 'Inserisci un numero valido.' };
    case 'boolean':
      return typeof value === 'boolean'
        ? { ok: true, value }
        : { ok: false, message: 'Seleziona vero o falso.' };
    case 'string_list':
      return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
        ? { ok: true, value: value.map((entry) => entry.trim()).filter(Boolean) }
        : { ok: false, message: 'Il campo richiede una lista di testi.' };
    case 'unsupported_json':
      return { ok: false, message: 'Questo formato JSON legacy non è modificabile in sicurezza.' };
    default: {
      if (typeof value !== 'string') return { ok: false, message: 'Il campo richiede testo.' };
      const normalized = value.trim();
      if (field.required && !normalized) return { ok: false, message: 'Il campo è obbligatorio.' };
      if (!normalized) return { ok: false, message: 'Per svuotare il campo serve un’azione dedicata.' };
      return { ok: true, value: normalized };
    }
  }
}
