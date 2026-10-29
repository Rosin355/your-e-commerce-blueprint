import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { selectHomepageProducts } from "@/lib/storefrontDiscovery";
import { CATEGORIES, collectionHref } from "@/config/categories";
import { HomeHero } from "./HomeHero";

export const HomepageV3 = () => {
  const [newestProducts, setNewestProducts] = useState<ShopifyProduct[]>([]);
  const [outdoorProducts, setOutdoorProducts] = useState<ShopifyProduct[]>([]);
  const [botanicalProducts, setBotanicalProducts] = useState<ShopifyProduct[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      try {
        const products = await fetchProducts(120, undefined, {
          sortKey: "CREATED_AT",
          reverse: true,
        });
        if (cancelled) return;
        const selection = selectHomepageProducts(products);
        setNewestProducts(selection.newest);
        setOutdoorProducts(selection.outdoor);
        setBotanicalProducts(selection.botanical);
      } catch (error) {
        console.error("Errore caricamento selezioni homepage:", error);
        if (!cancelled) {
          setLoadError(true);
          setNewestProducts([]);
          setOutdoorProducts([]);
          setBotanicalProducts([]);
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const productGroups = [
    {title: "Novità", subtitle: "Le pubblicazioni più recenti del vivaio.", items: newestProducts},
    {title: "Scelte per i tuoi esterni", subtitle: "Esplora la selezione per giardini, balconi e terrazzi.", items: outdoorProducts},
    {title: "Selezione botanica", subtitle: "Rose, fruttiferi, conifere e bulbi dal catalogo.", items: botanicalProducts},
  ];

  return (
    <div className="og-storefront">
      <HomeHero />
      <nav aria-label="Esplora le categorie" className="container mx-auto flex flex-wrap gap-2 px-4 pb-2 pt-6">
        <Link to="/collections/all" className="inline-flex min-h-11 items-center rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground">Tutti i prodotti</Link>
        {CATEGORIES.filter(category => !category.toCreate && category.handle !== "all").map(category => (
          <Link key={category.handle} to={collectionHref(category.handle)} className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-secondary">{category.label}</Link>
        ))}
      </nav>
      <section aria-label="Selezioni dal catalogo" className="container mx-auto px-4 py-6 md:py-8">
        {productGroups.map(group => (
          <section key={group.title} className="mb-10 last:mb-0 md:mb-14">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-heading text-[1.65rem] font-semibold leading-tight text-foreground md:text-[2rem]">{group.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{group.subtitle}</p>
              </div>
              <Link to="/collections/all" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-primary-dark underline underline-offset-4">Scopri tutto <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {loadingProducts ? (
              <div role="status" className="flex min-h-64 items-center justify-center"><span className="sr-only">Caricamento {group.title}</span><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : group.items.length ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {group.items.map(product => <ProductCard key={product.node.id} product={product} />)}
              </div>
            ) : (
              <p className="py-10 text-sm text-muted-foreground">{loadError ? "Impossibile caricare questa selezione. Riprova dal catalogo." : "Nessun prodotto disponibile in questa selezione."}</p>
            )}
          </section>
        ))}
      </section>
    </div>
  );
};
