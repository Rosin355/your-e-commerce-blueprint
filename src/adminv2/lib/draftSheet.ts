import type { FieldDefinition } from '../../../supabase/functions/_shared/admin-v2-types';
import type { ProductDraft } from '../../../supabase/functions/_shared/admin-operational-core';
import { isFieldEditable, validateValue } from '../../../supabase/functions/_shared/admin-v2-validation';

import { editorialOptions, type EditorialProposal } from '../../../supabase/functions/_shared/admin-draft-editorial';

export const sheetLabels = {
  description: 'Descrizione',
  seoTitle: 'Titolo SEO',
  seoDescription: 'Meta description SEO',
  tags: 'Tag',
  productType: 'Tipo prodotto',
} as const;
export type SheetKey = keyof typeof sheetLabels;
export type SheetChange = Partial<Pick<ProductDraft, SheetKey>>;
export const sheetKeys = Object.keys(sheetLabels) as SheetKey[];

export interface SheetContext {
  title: string;
  categories: string[];
  definitions: FieldDefinition[];
  editableKeys: string[];
  supportsType: boolean;
  canFillDraft: boolean;
}

export function sheetDefinition(key: SheetKey, context: SheetContext) {
  if (key === 'productType') {
    const mapped = context.definitions.filter(d => d.shopify_mapping?.type === 'core' &&
      ['productType', 'product_type'].includes(String(d.shopify_mapping.field)));
    return mapped.length === 1 ? mapped[0] : undefined;
  }
  const registryKey = { description: 'description', seoTitle: 'seo_title', seoDescription: 'seo_description', tags: 'tags' }[key];
  return context.definitions.find(d => d.key === registryKey);
}

function plain(text: string) {
  return Boolean(text.trim()) && !/[<>\p{Cc}]|\S+@\S+|https?:\/\//iu.test(text);
}

function domain(def: FieldDefinition) {
  const options = def.validation_rules?.enum;
  if (!Array.isArray(options) || !options.length || !options.every(
    v => typeof v === 'string' && v === v.trim() && plain(v) && v.length <= 255,
  )) return [];
  return new Set(options.map(v => v.toLocaleLowerCase('it'))).size === options.length ? options as string[] : [];
}

export function reasonUnavailable(key: SheetKey, context: SheetContext) {
  if (key !== 'description' && !context.canFillDraft)
    return 'Il tuo account non è abilitato a completare e salvare i metadati della bozza interna.';
  const def = sheetDefinition(key, context);
  if (key === 'productType' && (!context.supportsType || !def || !domain(def).length)) {
    return 'Manca un elenco verificato di tipi prodotto collegati a Shopify. Conferma una scelta per questa bozza oppure lascia vuoto.';
  }
  if (!def || def.applies_to === 'variant' || def.manual_only || !isFieldEditable(def).ok)
    return 'Il registro non consente la compilazione assistita di questo campo. Verifica il campo nelle opzioni del prodotto.';
  if (['description', 'seoTitle', 'seoDescription'].includes(key) && !context.editableKeys.includes(def.key))
    return 'Il tuo account non ha il permesso di modifica per questo campo.';
  if (key === 'description' && !def.ai_allowed)
    return 'Il registro riserva la descrizione alla compilazione manuale.';
}

export function manualDraftType(context: SheetContext) {
  return context.canFillDraft && context.supportsType && !context.definitions.some(d =>
    d.shopify_mapping?.type === 'core' && ['productType','product_type'].includes(String(d.shopify_mapping.field)));
}

export function sheetValueError(key: SheetKey, value: string | string[], context: SheetContext) {
  if (key === 'productType' && manualDraftType(context)) {
    return typeof value === 'string' && plain(value) && value.trim().length > 0 && value.length <= 255
      ? undefined : 'Scrivi o scegli un tipo commerciale per questa bozza, entro 255 caratteri.';
  }
  const unavailable = reasonUnavailable(key, context);
  if (unavailable) return unavailable;
  const def = sheetDefinition(key, context)!;
  if (key === 'tags') {
    if (!Array.isArray(value) || !value.length || value.length > 50 ||
      value.some(v => typeof v !== 'string' || !plain(v) || v.includes(',') || v.length > 100 || /^og(?:qa)?shipping/i.test(v)) ||
      new Set(value.map(v => v.toLocaleLowerCase('it'))).size !== value.length)
      return 'Usa tag distinti, senza virgole o codici logistici, di massimo 100 caratteri.';
  } else {
    if (typeof value !== 'string' || !value.trim()) return 'Il valore è vuoto.';
    if (key === 'productType' && !domain(def).includes(value)) return 'Scegli un tipo fra quelli verificati.';
    if (key === 'description') {
      if (value.length > 20000 || !value.replace(/<[^>]*>|&nbsp;/g, '').trim()) return 'Controlla la descrizione obbligatoria.';
    } else {
      const max = { seoTitle: 70, seoDescription: 320, productType: 255 }[key];
      if (!plain(value) || value.length > max) return 'Usa testo semplice entro ' + max + ' caratteri.';
    }
  }
  const checked = validateValue(def, value);
  return checked.ok ? undefined : checked.message || 'Valore non ammesso dal registro.';
}

export interface SheetRow { value?: string | string[]; reason?: string; options?: string[]; excluded?: boolean; source?: EditorialProposal['source'] | 'manual'; tagText?: string }
export type SheetPreview = Record<SheetKey, SheetRow>;

// Offline candidates also keep the review usable if the provider is unavailable.
export function localSheet(context: SheetContext, facts: string[]): SheetPreview {
  function copy(key: SheetKey, value: string | string[], empty: string): SheetRow {
    const reason = reasonUnavailable(key, context) || (!value.length ? empty : sheetValueError(key, value, context));
    return reason ? { reason } : { value, source: 'deterministic' };
  }
  const title = context.title.trim();
  const options = editorialOptions(title, facts);
  const tags = [...options.tags, ...context.categories].filter((tag, i, all) =>
    all.findIndex(v => v.toLocaleLowerCase('it') === tag.toLocaleLowerCase('it')) === i &&
    !sheetValueError('tags', [tag], context));
  const meta = options.seoDescription.find(line => !sheetValueError('seoDescription', line, context)) ?? '';
  const typeReason = reasonUnavailable('productType', context);
  let productType: SheetRow = { reason: typeReason };
  if (!typeReason) {
    const options = domain(sheetDefinition('productType', context)!).filter(v => !sheetValueError('productType', v, context));
    const declarations = facts.flatMap(line => {
      const match = /^tipo prodotto\s*:\s*(.+)$/i.exec(line);
      return match ? [match[1].trim().toLocaleLowerCase('it')] : [];
    });
    const labels = new Set([title, ...context.categories, ...facts, ...declarations].map(v => v.trim().toLocaleLowerCase('it')));
    const matches = options.filter(v => labels.has(v.toLocaleLowerCase('it')));
    const unknownDeclaration = declarations.some(label => !options.some(v => v.toLocaleLowerCase('it') === label));
    productType = matches.length === 1 && !unknownDeclaration ? { value: matches[0], options, source: 'deterministic' } :
      { options, reason: options.length ? 'Conferma manualmente il tipo fra quelli verificati.' : 'Nessun tipo supera i controlli del registro.' };
  }
  return {
    description: { reason: reasonUnavailable('description', context) },
    seoTitle: copy('seoTitle', options.seoTitle.find(v => !sheetValueError('seoTitle', v, context)) ?? title, 'Inserisci un nome utilizzabile come titolo SEO.'),
    seoDescription: copy('seoDescription', meta, 'Nessuna riga intera rispetta i limiti della meta description. Compilala a mano.'),
    tags: copy('tags', tags, 'Nome e categorie selezionate non contengono etichette utilizzabili.'),
    productType,
  };
}
