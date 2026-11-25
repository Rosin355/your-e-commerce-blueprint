import type { FieldDefinition } from '../../../supabase/functions/_shared/admin-v2-types';
import { validateValue } from '../../../supabase/functions/_shared/admin-v2-validation';
import type { DraftVariant, ProductDraft } from '../../../supabase/functions/_shared/admin-operational-core';

export function generateFamilySku(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const code = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `OG-NP-${code.slice(0, 10)}-${code.slice(10)}`;
}

export function initialDraft(): ProductDraft {
  const sku = generateFamilySku();
  return {
    title: '', sku, description: '', currency: 'EUR', vendor: '', tags: [], categoryIds: [],
    variants: [{ sku, option: 'Formato unico', price: '', compareAtPrice: null }],
    images: [], seoTitle: '', seoDescription: '', botanical: {},
  };
}

export function changeFamilySku(draft: ProductDraft, sku: string, replaceAll = false) {
  const variants = draft.variants.map((v, i) => {
    if (draft.variants.length === 1) return { ...v, sku };
    if (replaceAll) return { ...v, sku: `${sku}-${i + 1}` };
    if (v.sku.startsWith(draft.sku + '-')) return { ...v, sku: sku + v.sku.slice(draft.sku.length) };
    return v;
  });
  return { sku, variants };
}

export type DraftErrors = Record<string, string>;

export function draftErrors(draft: ProductDraft, definitions: FieldDefinition[] = []): DraftErrors {
  const errors: DraftErrors = {};
  const validSku = (sku: string) => /^[A-Za-z0-9_.-]{1,80}$/.test(sku);
  const validPrice = (value: string) => /^(0|[1-9]\d{0,7})([.,]\d{1,2})?$/.test(value);
  if (!draft.title.trim() || draft.title.trim().length > 255) errors.title = 'Inserisci un nome da 1 a 255 caratteri.';
  if (!draft.description.replace(/<[^>]*>|&nbsp;/g, '').trim() || draft.description.length > 20000) errors.description = 'Inserisci una descrizione verificata, entro 20.000 caratteri.';
  if (draft.shortDescription && (draft.shortDescription.length > 320 || /[<>]/.test(draft.shortDescription) ||
    draft.shortDescription.trim() === draft.description.replace(/<[^>]*>/g, '').trim())) errors.shortDescription = 'Inserisci una sintesi distinta dal testo esteso, entro 320 caratteri.';
  if (!validSku(draft.sku)) errors.sku = 'Usa da 1 a 80 lettere, numeri, trattini, punti o underscore.';
  if (!/^[A-Z]{3}$/.test(draft.currency)) errors.currency = 'Inserisci un codice valuta di tre lettere maiuscole, ad esempio EUR.';
  const skus = new Set<string>(draft.variants.length > 1 ? [draft.sku.toLowerCase()] : []);
  const options = new Set<string>();
  draft.variants.forEach((v, i) => {
    const prefix = `variant-${i}-`;
    const option = v.option.trim().toLowerCase();
    if (!option || option.length > 80) errors[prefix + 'option'] = 'Indica il formato, entro 80 caratteri.';
    else if (options.has(option)) errors[prefix + 'option'] = 'Ogni formato deve avere un nome diverso.';
    options.add(option);
    if (!validPrice(v.price)) errors[prefix + 'price'] = 'Inserisci un prezzo da zero in su, con massimo due decimali.';
    if (v.compareAtPrice && (!validPrice(v.compareAtPrice) || Number(v.compareAtPrice.replace(',', '.')) <= Number(v.price.replace(',', '.'))))
      errors[prefix + 'compareAtPrice'] = 'Il prezzo precedente deve essere valido e superiore al prezzo di vendita.';
    if (!validSku(v.sku) || skus.has(v.sku.toLowerCase())) errors[prefix + 'sku'] = 'Inserisci un codice valido e distinto per il formato.';
    skus.add(v.sku.toLowerCase());
  });
  for (const [field, max] of [['vendor', 255], ['productType', 255], ['seoTitle', 70], ['seoDescription', 320]] as const) {
    if ((draft[field]?.trim().length ?? 0) > max) errors[field] = `Usa al massimo ${max} caratteri.`;
  }
  if (draft.tags.length > 50 || draft.tags.some(t => t.length > 100) || new Set(draft.tags.map(t => t.toLowerCase())).size !== draft.tags.length)
    errors.tags = 'Usa fino a 50 tag diversi, con massimo 100 caratteri ciascuno.';
  if (Math.max(draft.categoryIds.length, draft.collectionIds?.length ?? 0) > 23) errors.categories = 'Seleziona al massimo 23 categorie.';
  if (draft.tags.some(t => /^og(?:qa)?shipping/i.test(t))) errors.tags = 'I tag logistici sono riservati.';
  draft.images.forEach((image,i) => {
    if (!image.alt.trim() || image.alt.trim().length > 250) errors['image-alt-' + i] = 'Descrivi la foto in 1–250 caratteri.';
  });
  for (const def of definitions) {
    if (!Object.prototype.hasOwnProperty.call(draft.botanical, def.key)) continue;
    const result = validateValue(def, draft.botanical[def.key]);
    if (!result.ok) errors[def.key] = result.message ?? 'Controlla il valore inserito.';
  }
  return errors;
}

export function addFormat(variants: DraftVariant[], sku: string): DraftVariant[] {
  const previous = variants.length === 1 ? [{ ...variants[0], sku: sku + '-1' }] : variants;
  const used = new Set(previous.map(v => v.sku.toLowerCase()));
  let next = 1;
  while (used.has(`${sku}-${next}`.toLowerCase())) next++;
  return [...previous, { sku: `${sku}-${next}`, option: '', price: '', compareAtPrice: null }];
}
