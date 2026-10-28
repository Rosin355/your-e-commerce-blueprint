import { canonicalUrl } from './storefront-seo';

export interface ProductStructuredDataSource {
  title: string;
  description?: string;
  handle: string;
  images: { edges: Array<{ node: { url: string } }> };
}

/** Only descriptive merchant data. No inference of brand, offers, reviews or stock. */
export function productStructuredData(origin: string, product: ProductStructuredDataSource) {
  const url = canonicalUrl(origin, `/products/${encodeURIComponent(product.handle)}`);
  const image = product.images.edges.flatMap(({ node }) => {
    if (!node.url?.trim()) return [];
    try {
      const imageUrl = new URL(node.url, origin);
      return ['https:', 'http:'].includes(imageUrl.protocol) ? [imageUrl.href] : [];
    } catch { return []; }
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#product`,
        url,
        name: product.title,
        ...(product.description?.trim() ? { description: product.description.trim() } : {}),
        ...(image.length ? { image } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl(origin, '/') },
          { '@type': 'ListItem', position: 2, name: 'Tutti i prodotti', item: canonicalUrl(origin, '/collections/all') },
          { '@type': 'ListItem', position: 3, name: product.title, item: url },
        ],
      },
    ],
  };
}

/** Safe even if the serialized value is later placed in an HTML script element. */
export function serializeStructuredData(value: ReturnType<typeof productStructuredData>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
