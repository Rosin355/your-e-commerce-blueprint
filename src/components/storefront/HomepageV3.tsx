import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, HeadphonesIcon, Leaf, Loader2, PackageCheck, ShieldCheck } from "lucide-react";
import heroBotanicalSpring from "@/assets/hero-botanical-spring.jpg";
import newsletterOutdoorTree from "@/assets/newsletter-outdoor-tree.png";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { HomeHero } from "./HomeHero";

const trustItems = [
  { title: "Spedizione protetta", subtitle: "Consegna curata per piante e accessori oltre €50", icon: PackageCheck },
  { title: "Reso semplice", subtitle: "30 giorni per gestire il reso con serenita", icon: CheckCircle2 },
  { title: "Pagamento sicuro", subtitle: "Checkout affidabile e acquisto senza pensieri", icon: ShieldCheck },
  { title: "Supporto vivaio", subtitle: "Assistenza prima e dopo l'ordine", icon: HeadphonesIcon },
];

type ProductGroup = {
  label: string;
  title: string;
  subtitle: string;
  items: ShopifyProduct[];
  isLoading: boolean;
};

const withImages = (products: ShopifyProduct[]) => products.filter((p) => p.node.images.edges.length > 0);

const sectionHeading = (label: string, title: string, actionLabel = "Scopri tutto") => (
  <div className="mb-7 flex items-end justify-between gap-5 border-b border-border/70 pb-4">
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <h2 className="mt-1 font-heading text-[2rem] font-medium leading-tight text-foreground md:text-[2.3rem]">{title}</h2>
    </div>
    <a href="#catalogo" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      <ArrowRight className="h-4 w-4" />
      {actionLabel}
    </a>
  </div>
);

export const HomepageV3 = () => {
  const [bestSellers, setBestSellers] = useState<ShopifyProduct[]>([]);
  const [easyCare, setEasyCare] = useState<ShopifyProduct[]>([]);
  const [seasonal, setSeasonal] = useState<ShopifyProduct[]>([]);
  const [loadingBest, setLoadingBest] = useState(true);
  const [loadingEasy, setLoadingEasy] = useState(true);
  const [loadingSeasonal, setLoadingSeasonal] = useState(true);
  const [newsletterParallax, setNewsletterParallax] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const newsletterSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchProducts(20).then((p) => {
      const valid = withImages(p).filter((pr) => parseFloat(pr.node.priceRange.minVariantPrice.amount) > 0);
      setBestSellers(valid.slice(0, 4));
      setLoadingBest(false);
    });
    fetchProducts(8).then((p) => {
      setEasyCare(withImages(p).slice(0, 4));
      setLoadingEasy(false);
    });
    fetchProducts(8, "product_type:variable").then((p) => {
      setSeasonal(withImages(p).slice(0, 4));
      setLoadingSeasonal(false);
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduceMotion(media.matches);
    syncMotion();
    media.addEventListener("change", syncMotion);
    return () => media.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setNewsletterParallax(0);
      return;
    }

    let rafId = 0;
    const updateParallax = () => {
      const section = newsletterSectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      setNewsletterParallax((clamped - 0.5) * 66);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateParallax();
        rafId = 0;
      });
    };

    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [reduceMotion]);

  const productGroups: ProductGroup[] = [
    {
      label: "Catalogo",
      title: "Novita di stagione",
      subtitle: "Selezioni pensate per balconi, terrazze e giardini nel momento migliore della stagione.",
      items: bestSellers,
      isLoading: loadingBest,
    },
    {
      label: "Selezione outdoor",
      title: "Scelte per i tuoi esterni",
      subtitle: "Varieta versatili e decorative per dare forma a spazi verdi eleganti e facili da vivere.",
      items: easyCare,
      isLoading: loadingEasy,
    },
    {
      label: "Fioriture",
      title: "Edit botanico outdoor",
      subtitle: "Rose, bulbi e fioriture ornamentali selezionate per portare ritmo e colore all'aperto.",
      items: seasonal,
      isLoading: loadingSeasonal,
    },
  ];

  const imagePool = useMemo(() => {
    const fromProducts = [...bestSellers, ...easyCare, ...seasonal]
      .flatMap((p) => p.node.images.edges[0]?.node?.url ? [p.node.images.edges[0].node.url] : []);
    return fromProducts.length > 0 ? fromProducts : [heroBotanicalSpring];
  }, [bestSellers, easyCare, seasonal]);

  const getImage = (index: number) => imagePool[index % imagePool.length] ?? heroBotanicalSpring;

  const journalCards = [
    { date: "22.03.26", title: "Come combinare vasi da esterno per terrazzi armoniosi", category: "Ispirazioni", author: "Online Garden" },
    { date: "19.03.26", title: "Rose e rampicanti: idee per ingressi e pergolati", category: "Giardino", author: "Online Garden" },
    { date: "10.03.26", title: "Bulbi e fioriture stagionali per balconi pieni di colore", category: "Stagionalita", author: "Online Garden" },
    { date: "08.03.26", title: "Agrumi e fruttiferi: come dare carattere agli spazi outdoor", category: "Vivaio", author: "Online Garden" },
  ];

  return (
    <>
      <HomeHero />

      <section className="border-y border-border/65 bg-background py-10 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h3 className="font-heading text-[2rem] font-medium text-foreground md:text-[2.3rem]">Perche scegliere Online Garden</h3>
            <p className="mt-2 text-sm text-muted-foreground">Qualita vivaistica, supporto reale e selezioni pensate per i tuoi esterni</p>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {trustItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="relative text-center">
                  {index !== 3 ? <span className="absolute right-0 top-1/2 hidden h-10 w-px -translate-y-1/2 bg-border md:block" /> : null}
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card">
                    <Icon className="h-6 w-6 text-primary-dark" />
                  </div>
                  <p className="mt-3 text-base font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="container mx-auto px-4">
          {productGroups.slice(0, 2).map((group) => (
            <div key={group.title} className="mb-16">
              {sectionHeading(group.label, group.title)}
              <p className="mb-6 max-w-3xl text-sm leading-7 text-muted-foreground">{group.subtitle}</p>
              {group.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((product) => (
                    <ProductCard key={`${group.title}-${product.node.id}`} product={product} />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="mb-16 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative h-[300px] md:h-[360px]">
              <img
                src={getImage(4)}
                alt="Editorial plant story"
                className="absolute left-0 top-8 h-[200px] w-[45%] rotate-[-9deg] rounded-sm border-[10px] border-white object-cover shadow-soft md:h-[250px]"
              />
              <img
                src={getImage(5)}
                alt="Editorial plant story"
                className="absolute left-[30%] top-0 h-[220px] w-[45%] rotate-[6deg] rounded-sm border-[10px] border-white object-cover shadow-soft md:h-[280px]"
              />
              <img
                src={getImage(6)}
                alt="Editorial plant story"
                className="absolute left-[22%] top-[52%] h-[160px] w-[40%] rotate-[-2deg] rounded-sm border-[10px] border-white object-cover shadow-soft md:h-[200px]"
              />
            </div>
            <div className="max-w-xl">
              <Leaf className="h-5 w-5 text-primary" />
              <h3 className="mt-2 font-heading text-[2.1rem] font-medium leading-tight text-foreground md:text-[2.7rem]">Dai forma ai tuoi spazi outdoor</h3>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Dalle prime fioriture di balcone ai giardini piu strutturati, selezioniamo piante e accessori per accompagnare ogni esterno con naturale eleganza.
              </p>
              <Button asChild className="mt-6 h-11 rounded-sm bg-primary-dark px-6 text-xs uppercase tracking-[0.16em]">
                <a href="#catalogo">Scopri il catalogo outdoor</a>
              </Button>
            </div>
          </div>

          {productGroups.slice(2).map((group) => (
            <div key={group.title} className="mb-16 last:mb-0">
              {sectionHeading(group.label, group.title)}
              <p className="mb-6 max-w-3xl text-sm leading-7 text-muted-foreground">{group.subtitle}</p>
              {group.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((product) => (
                    <ProductCard key={`${group.title}-${product.node.id}`} product={product} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background pb-16 md:pb-20">
        <div className="container mx-auto px-4">
          {sectionHeading("Ispirazioni", "Idee e consigli per il tuo verde esterno", "Leggi tutto")}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {journalCards.map((item, index) => (
              <article key={item.title} className="group border border-border/60 bg-card/55">
                <div className="relative">
                  <img src={getImage(index + 1)} alt={item.title} className="h-44 w-full object-cover" />
                  <span className="absolute left-2 top-2 text-[10px] font-medium tracking-[0.12em] text-foreground/70">{item.date}</span>
                </div>
                <div className="space-y-3 p-4">
                  <h4 className="line-clamp-2 font-heading text-[1.04rem] font-medium text-foreground">{item.title}</h4>
                  <div className="border-t border-border/60 pt-2">
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground/90">{item.author}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section ref={newsletterSectionRef} className="bg-background pb-16 md:pb-24">
        <div className="relative isolate min-h-[460px] overflow-hidden md:min-h-[560px]">
          <img
            src={newsletterOutdoorTree}
            alt="Selezione outdoor Online Garden"
            className="absolute inset-0 h-[120%] w-full object-cover will-change-transform"
            style={reduceMotion ? { transform: "translateY(-8%) scale(1.02)" } : { transform: `translateY(calc(-8% + ${newsletterParallax}px)) scale(1.02)` }}
          />
          <div className="absolute inset-0 bg-black/16" />

          <div className="relative z-10 mx-auto flex min-h-[460px] max-w-[1600px] items-center justify-center px-4 md:min-h-[560px] md:px-6">
            <div className="w-full max-w-[520px] bg-primary px-7 py-8 text-primary-foreground md:px-10 md:py-10">
              <h3 className="font-heading text-[2.8rem] font-medium leading-[0.98] md:text-[3.4rem]">Resta vicino alla stagione</h3>
              <div className="mt-8 flex items-center border-b border-primary-foreground/55 pb-2">
                <input
                  type="email"
                  placeholder="Inserisci la tua email"
                  className="w-full bg-transparent text-sm text-primary-foreground placeholder:text-primary-foreground/72 focus:outline-none"
                />
                <ArrowRight className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xs leading-5 text-primary-foreground/80">
                Iscriviti per ricevere novita di stagione, idee per terrazzi e giardini e selezioni dedicate dal nostro vivaio online.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
