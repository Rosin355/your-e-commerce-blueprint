import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { Footer } from "@/components/Footer";
import {
  fetchCollectionByHandle,
  ShopifyCollectionMeta,
  ShopifyProduct,
} from "@/lib/shopify";

const productIsInStock = (product: ShopifyProduct) =>
  product.node.variants.edges.some((v) => v.node.availableForSale);

const CollectionPage = () => {
  const navigate = useNavigate();
  const { handle = "" } = useParams<{ handle: string }>();
  const [collection, setCollection] = useState<ShopifyCollectionMeta | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    fetchCollectionByHandle(handle, 60)
      .then((res) => {
        if (!active) return;
        if (!res.collection) {
          setNotFound(true);
          setCollection(null);
          setProducts([]);
        } else {
          setCollection(res.collection);
          setProducts(res.products);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setNotFound(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [handle]);

  const title = collection?.title || handle.replace(/-/g, " ");
  const description = collection?.description || "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="page" />

      <main className="flex-1 pt-24 md:pt-28">
        <div className="container mx-auto max-w-[1280px] px-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground pt-4">
            <button type="button" onClick={() => navigate("/")} className="hover:text-foreground">
              Home
            </button>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <Link to="/collections/all" className="hover:text-foreground">
              Collezioni
            </Link>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <span className="text-foreground capitalize">{title}</span>
          </nav>

          <header className="py-10 md:py-14">
            <h1 className="font-heading text-[2.5rem] font-semibold leading-[1.05] text-foreground md:text-[3rem] capitalize">
              {title}
            </h1>
            {description && (
              <p className="mt-5 max-w-3xl text-[15px] leading-7 text-muted-foreground">
                {description}
              </p>
            )}
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notFound ? (
            <div className="border border-border bg-card p-10 text-center">
              <p className="text-base font-semibold text-foreground">
                Collezione non disponibile
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Questa collezione non è ancora pubblicata. Torna più tardi o esplora il catalogo
                completo.
              </p>
              <Link
                to="/collections/all"
                className="mt-4 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
              >
                Vai a tutti i prodotti
              </Link>
            </div>
          ) : products.length === 0 ? (
            <div className="border border-border bg-card p-10 text-center">
              <p className="text-base font-semibold text-foreground">
                Nessun prodotto in questa collezione
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Stiamo curando questa selezione. Nel frattempo, scopri il resto del catalogo.
              </p>
              <Link
                to="/collections/all"
                className="mt-4 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
              >
                Esplora tutti i prodotti
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 pb-20 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, index) => {
                const image = product.node.images.edges[0]?.node;
                const price = product.node.priceRange.minVariantPrice;
                const inStock = productIsInStock(product);
                return (
                  <article key={product.node.id} className="group">
                    <button
                      type="button"
                      onClick={() => navigate(`/products/${product.node.handle}`)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                        {image ? (
                          <img
                            src={image.url}
                            alt={image.altText || product.node.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading={index < 8 ? "eager" : "lazy"}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            Nessuna immagine
                          </div>
                        )}
                        {!inStock && (
                          <span className="absolute left-3 top-3 inline-flex h-6 items-center border border-border bg-background/95 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                            Esaurito
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <h3 className="text-[15px] font-medium leading-6 text-foreground">
                          {product.node.title}
                        </h3>
                        <p className="mt-1 text-[15px] font-semibold text-foreground">
                          €{parseFloat(price.amount).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CollectionPage;
