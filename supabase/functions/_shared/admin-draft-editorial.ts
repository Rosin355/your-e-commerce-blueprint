import type { FieldDefinition } from './admin-v2-types.ts';
import { isFieldEditable, validateValue } from './admin-v2-validation.ts';

export const editorialKeys = ['seoTitle', 'seoDescription', 'tags'] as const;
export type EditorialKey = typeof editorialKeys[number];
export const registryKeys = { seoTitle: 'seo_title', seoDescription: 'seo_description', tags: 'tags' } as const;
export type EditorialOptions = Record<EditorialKey, string[]>;
export interface EditorialProposal {
  value: string | string[];
  source: 'model' | 'deterministic';
}

export function safeLabel(value: string) {
  return value.trim() === value && value.length > 0 &&
    !/[<>\p{Cc}]|\S+@\S+|https?:\/\//iu.test(value);
}
function unique(values: string[]) {
  return values.filter((v, i) => values.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);
}

// The model chooses complete, indexed candidates. It cannot remove a negation,
// manufacture a label from part of a sentence, or return new prose in its place.
export function editorialOptions(title: string, facts: string[]): EditorialOptions {
  const names = facts.flatMap(line => {
    const match = /^(?:nome comune|nome botanico|cultivar):\s*([\p{L}][\p{L}\p{M} ’'-]{1,59})$/iu.exec(line);
    return match ? [match[1].trim()] : [];
  });
  const aliases = unique(names).filter(name => name.toLowerCase() !== title.toLowerCase());
  const titles = [...aliases.flatMap(name => [title + ' (' + name + ')', name + ' (' + title + ')']), title];
  const tags = unique([title, ...aliases]).filter(v => safeLabel(v) && v.length <= 100 && !v.includes(',') && !/^og(?:qa)?shipping/i.test(v));
  const all = facts.join(' ');
  // A separate qualification may limit another line. Keep these facts together.
  const qualified = facts.some(line => /\b(non|ma|solo|soltanto|salvo|eccetto|tranne|tuttavia|purché|rettifica|invece)\b/iu.test(line));
  const prose = facts.filter(line => !/^(?:nome comune|nome botanico|cultivar):/iu.test(line));
  const excerpts = !prose.length ? [] : qualified ? [all] : unique([prose.join(' '), ...prose, all]);
  const meta = unique(excerpts.filter(Boolean).flatMap(v => {
    const includeName = !v.toLowerCase().includes(title.toLowerCase()) && title.length + v.length + 3 <= 160;
    return includeName ? [v, title + ' — ' + v] : [v];
  })).filter(v => v.length <= 320 && safeLabel(v));
  return { seoTitle: unique(titles.filter(v => safeLabel(v) && v.length <= 70)), seoDescription: meta, tags };
}

// The tags exception is only for this native field and a positive per-actor draft reservation.
export function draftModelEligible(def: FieldDefinition) {
  return def.key === 'tags'
    ? ['array', 'json'].includes(def.data_type) && def.shopify_mapping?.type === 'core' && def.shopify_mapping.field === 'tags'
    : def.ai_allowed;
}

export function resolveEditorialField(key: EditorialKey, options: EditorialOptions, pick: unknown,
  def: FieldDefinition): EditorialProposal | undefined {
  if (def.key !== registryKeys[key] || def.manual_only || def.applies_to === 'variant' || !isFieldEditable(def).ok) return;
  const choices = options[key];
  const validIndex = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < choices.length;
  let selected: string | string[] | undefined;
  if (key === 'tags') {
    if (Array.isArray(pick) && pick.length > 0 && pick.length <= 5 && pick.every(validIndex) && new Set(pick).size === pick.length)
      selected = pick.map(n => choices[n]);
  } else if (validIndex(pick)) selected = choices[pick];
  if (draftModelEligible(def) && selected !== undefined && validateValue(def, selected).ok) return { value: selected, source: 'model' };
  if (key === 'tags') {
    const tags = choices.filter(v => validateValue(def, [v]).ok).slice(0, 5);
    if (tags.length && validateValue(def, tags).ok) return { value: tags, source: 'deterministic' };
  } else {
    const value = choices.find(v => validateValue(def, v).ok);
    if (value !== undefined) return { value, source: 'deterministic' };
  }
}
