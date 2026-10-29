import { formatProductPrice } from "@/lib/storefront-money";
import { Link } from 'react-router-dom';
import type { CatalogProduct, ShopifyProduct } from '@/lib/shopify';

/** Shared by catalogue and collections; navigation remains a genuine link. */
export const CatalogProductCard = ({ product, eager = false }: { product: CatalogProduct | ShopifyProduct; eager?: boolean }) => {
  const { node } = product;
  const image = node.images.edges[0]?.node;
  const inStock = node.availableForSale ?? ('variants' in node && node.variants.edges.some(({ node: variant }) => variant.availableForSale));
  return (
    <article className="og-catalog-card group min-w-0">
      <Link to={`/products/${node.handle}`} className="block rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--og-radius-card)] bg-muted">
          {image ? <img src={image.url} alt={image.altText || node.title} loading={eager ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nessuna immagine</div>}
          {!inStock && <span className="absolute left-2 top-2 rounded-full border border-border bg-background/95 px-2 py-1 text-xs font-semibold">Esaurito</span>}
        </div>
        <h2 className="mt-3 break-words text-[15px] font-medium leading-6 text-foreground">{node.title}</h2>
        <p className="mt-1 text-[15px] font-semibold text-foreground">{formatProductPrice(node.priceRange)}</p>
        <span className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4">Vedi dettagli</span>
      </Link>
    </article>
  );
};
