import { SEASONAL_FIELD_KEYS } from './admin-v2-field-policy.ts';
export const draftRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : null;
export const draftStrings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every(v => typeof v === 'string') ? value : null;

export function projectDraft(raw: unknown, names: ReadonlyMap<string, string>) {
  const p = draftRecord(raw);
  const ids = draftStrings(p.categoryIds);
  const collections = p.collectionIds === undefined ? [] : draftStrings(p.collectionIds);
  return {
    seasons: SEASONAL_FIELD_KEYS.flatMap(key => {
      const months = draftStrings(draftRecord(p.botanical)[key]);
      return months?.length ? [{ key, months }] : [];
    }),
    title: text(p.title), sku: text(p.sku), description: text(p.description), shortDescription: text(p.shortDescription),
    productType: text(p.productType), vendor: text(p.vendor), currency: text(p.currency), tags: draftStrings(p.tags),
    categories: [...(ids ?? []), ...(collections ?? [])].map(id => names.get(id) ?? 'Categoria registrata · nome non verificato'),
    categoryDataIncomplete: !ids || !collections,
    variants: Array.isArray(p.variants) ? p.variants.map(entry => {
      const v = draftRecord(entry);
      return { option: text(v.option), sku: text(v.sku), price: text(v.price), compareAtPrice: text(v.compareAtPrice) };
    }) : null,
    images: Array.isArray(p.images) ? p.images.map(entry => {
      const i = draftRecord(entry);
      const url = text(i.url);
      return { url: url && /^https:\/\/cdn\.shopify\.com\//i.test(url) ? url : null, alt: text(i.alt) };
    }) : null,
    seoTitle: text(p.seoTitle), seoDescription: text(p.seoDescription),
  };
}
export type DraftSummary = ReturnType<typeof projectDraft>;
