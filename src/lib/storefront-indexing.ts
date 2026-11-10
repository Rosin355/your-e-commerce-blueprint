import { canonicalUrl } from './storefront-seo';

export const STOREFRONT_ORIGIN = 'https://onlinegarden.it';

export interface SitemapProduct {
  id: string;
  handle: string;
  publishedAt: string | null;
  availableForSale: boolean;
}

/** Out of stock is not the same as unpublished. Loading must not prevent JS rendering. */
export function productNoindex(loading: boolean, hasCurrentProduct: boolean, error: unknown): boolean {
  return !!error || (!loading && !hasCurrentProduct);
}

const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Input must come from the public Storefront publication, never the unrestricted Admin catalog. */
export function buildSitemap(products: SitemapProduct[]): string {
  const paths = new Set(['/', '/collections/all', '/contatti']);
  const ids = new Set<string>();
  for (const product of products) {
    if (!product.publishedAt) continue;
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(product.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.handle) || typeof product.availableForSale !== 'boolean') {
      throw new Error('Prodotto sitemap non valido');
    }
    if (ids.has(product.id) || paths.has(`/products/${product.handle}`)) throw new Error('Prodotto sitemap duplicato');
    ids.add(product.id);
    paths.add(`/products/${product.handle}`);
  }
  if (!ids.size) throw new Error('Nessun prodotto pubblico: non sostituire la sitemap');
  const urls = [...paths].sort().map(path => `  <url><loc>${xmlEscape(canonicalUrl(STOREFRONT_ORIGIN, path))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
