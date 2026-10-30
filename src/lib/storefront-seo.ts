/** Route metadata contains only merchant text and verified product fields. */
export interface StorefrontSeo {
  title: string;
  description?: string;
  path: string;
  image?: string;
  type?: 'website' | 'product';
  noindex?: boolean;
}

export function canonicalUrl(origin: string, path: string): string {
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Origine SEO non valida');
  const url = new URL(path, base.origin);
  if (url.origin !== base.origin) throw new Error('Canonical esterno non consentito');
  url.search = '';
  url.hash = '';
  return url.href;
}

export function seoDescription(value?: string | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
}
