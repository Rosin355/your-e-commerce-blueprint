/** Read-only public Storefront snapshot. Manual command; never runs in build/CI. */
import { writeFile, rename } from 'node:fs/promises';
import { storefrontApiRequest, nextPageCursor, isHiddenStorefrontProduct } from '../src/lib/shopify.ts';
import { buildSitemap } from '../src/lib/storefront-indexing.ts';

const query = `query SeoSitemap($after: String) {
  products(first: 100, after: $after, sortKey: ID) {
    pageInfo { hasNextPage endCursor }
    edges { node { id handle publishedAt availableForSale } }
  }
}`;
const products = [];
const seen = new Set<string>();
let after: string | null = null;
do {
  const response = await storefrontApiRequest(query, { after }, AbortSignal.timeout(30_000));
  const connection = response?.data?.products;
  if (!Array.isArray(connection?.edges)) throw new Error('Catalogo pubblico non valido');
  for (const product of connection.edges) {
    if (!isHiddenStorefrontProduct(product)) products.push(product.node);
  }
  if (products.length > 10_000) throw new Error('Catalogo oltre il limite verificato: generazione interrotta');
  after = nextPageCursor(connection.pageInfo, seen);
} while (after);
const snapshot = { source: 'Shopify public Storefront API; same publication as storefront', checkedAt: new Date().toISOString(), products };
// Validate the complete result before replacing either file. No partial sitemap on failure.
const xml = buildSitemap(products);
await writeFile('public/sitemap.xml.tmp', xml);
await rename('public/sitemap.xml.tmp', 'public/sitemap.xml');
await writeFile('docs/seo/evidence/public-catalog-snapshot.json', JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Sitemap preparata: ${products.length} prodotti pubblici; nessuna pubblicazione.`);
