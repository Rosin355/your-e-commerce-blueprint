import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";
import { CatalogProductCard } from "@/components/storefront/CatalogProductCard";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { Footer } from "@/components/Footer";
import {
  fetchCollectionByHandle,
  ShopifyCollectionMeta,
  ShopifyProduct,
} from "@/lib/shopify";

const CollectionPage = () => {
  const navigate = useNavigate();
  const { handle = "" } = useParams<{ handle: string }>();
  const [collection, setCollection] = useState<ShopifyCollectionMeta | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCursor, setPageCursor] = useState<{ handle: string; after: string | null }>({ handle, after: null });
  const cursor = pageCursor.handle === handle ? pageCursor.after : null;
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pagination = useRef({ handle, seen: new Set<string>() });
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setPageCursor(current => current.handle === handle ? current : { handle, after: null });
    setLoading(true);
    if (pagination.current.handle !== handle || !cursor) pagination.current = { handle, seen: new Set<string>() };
    if (!cursor) { setProducts([]); setCollection(null); setNextCursor(null); }
    setNotFound(false);
    setApiError(null);
    fetchCollectionByHandle(handle, 60, cursor, controller.signal)
      .then((res) => {
        if (!active) return;
        if (!res.collection) {
          setNotFound(true);
          setCollection(null);
          setProducts([]);
        } else {
          if (res.nextCursor) {
            if (pagination.current.seen.has(res.nextCursor)) throw new Error('Cursore collezione ripetuto');
            pagination.current.seen.add(res.nextCursor);
          }
          setCollection(res.collection);
          setProducts(previous => cursor ? [...previous, ...res.products.filter(product => !previous.some(item => item.node.id === product.node.id))] : res.products);
          setNextCursor(res.nextCursor);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setApiError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      controller.abort();
    };
  }, [handle, cursor, attempt]);

  const title = collection?.title || handle.replace(/-/g, " ");
  const description = collection?.description || "";

  useStorefrontSeo({
    title: `${collection?.seo?.title || title} | Online Garden`,
    description: collection?.seo?.description || description,
    path: `/collections/${encodeURIComponent(handle)}`,
    noindex: notFound || !!apiError || !collection,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="page" />

      <main id="main-content" tabIndex={-1} className="flex-1 pt-4 md:pt-6">
        <div className="container mx-auto max-w-[1280px] px-4">
          {/* Diagnostica visibile SOLO in sviluppo (mai al cliente in produzione) */}
          {import.meta.env.DEV && !loading && (
            <div className="mt-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="font-semibold">[DEV] </span>
              handle: <code>{handle}</code> · collection: {notFound ? "MISSING" : "FOUND"} · prodotti: {products.length}
              {apiError ? <> · errore Storefront: {apiError}</> : null}
            </div>
          )}
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

          {loading && !collection ? (
            <div role="status" className="flex items-center justify-center py-20"><span className="sr-only">Caricamento collezione</span>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : apiError && !collection ? (
            <div role="alert" className="border border-border bg-card p-6 text-center">
              <h2 className="text-lg font-semibold">Impossibile caricare la collezione</h2>
              <p className="my-3 text-muted-foreground">Controlla la connessione e riprova.</p>
              <Button onClick={() => setAttempt(value => value + 1)}>Riprova</Button>
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
            <>
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-5 gap-y-8 pb-8 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, index) => <CatalogProductCard key={product.node.id} product={product} eager={index < 4} />)}
            </div>
            <div className="flex flex-col items-center gap-3 pb-16">
              <p role="status" className="text-sm text-muted-foreground">{products.length} prodotti caricati</p>
              {apiError && <p role="alert" className="text-sm text-destructive">Impossibile caricare altri prodotti. La selezione già caricata è ancora disponibile.</p>}
              {nextCursor && <Button variant="outline" disabled={loading} onClick={() => {
                if (apiError) setAttempt(value => value + 1);
                else setPageCursor({ handle, after: nextCursor });
              }}>{loading ? "Caricamento…" : apiError ? "Riprova" : "Carica altri prodotti"}</Button>}
            </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CollectionPage;
