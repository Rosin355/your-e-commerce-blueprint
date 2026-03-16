import heroBotanical from "@/assets/hero-botanical-v3.jpg";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { ArrowRight, CheckCircle2, HeadphonesIcon, Leaf, Loader2, PackageCheck, ShieldCheck, Sparkles, SunMedium, Trees, Flower2, HeartHandshake } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const shortcuts = [
  { title: "Interno", subtitle: "Soggiorni, camere e studio", icon: Trees },
  { title: "Esterno", subtitle: "Balconi, terrazzi e giardini", icon: SunMedium },
  { title: "Facili da curare", subtitle: "Scelte ideali per iniziare", icon: Sparkles },
  { title: "Idee regalo", subtitle: "Pensieri verdi più eleganti", icon: Flower2 },
];

const trustItems = [
  {
    title: "Spedizione protetta",
    description: "Imballaggi curati per ridurre stress, urti e sorprese all'arrivo.",
    icon: PackageCheck,
  },
  {
    title: "Qualità selezionata",
    description: "Una proposta più leggibile, con prodotti presentati in modo chiaro e rassicurante.",
    icon: CheckCircle2,
  },
  {
    title: "Supporto reale",
    description: "Aiuto prima e dopo l'acquisto per scegliere meglio senza incertezza.",
    icon: HeadphonesIcon,
  },
  {
    title: "Acquisto sereno",
    description: "Flusso di carrello e checkout già collaudato, semplice anche da mobile.",
    icon: ShieldCheck,
  },
];

const trustStatements = [
  "Confezioni studiate per il trasporto",
  "Percorso di acquisto chiaro e sicuro",
  "Supporto umano per dubbi e scelta",
];

export const HomepageV3 = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const fetchedProducts = await fetchProducts(12);
      setProducts(fetchedProducts);
      setLoading(false);
    };

    loadProducts();
  }, []);

  const curated = useMemo(() => ({
    bestSellers: products.slice(0, 4),
    easyCare: products.slice(4, 8),
    seasonal: products.slice(8, 12),
  }), [products]);

  const editorialCollections = [
    {
      title: "Selezioni per interni luminosi",
      description: "Scelte più decorative per ambienti domestici puliti, accoglienti e contemporanei.",
    },
    {
      title: "Balconi e spazi outdoor",
      description: "Prodotti pensati per dare struttura, freschezza e carattere agli spazi esterni.",
    },
    {
      title: "Regali verdi",
      description: "Idee facili da acquistare e belle da ricevere, con presentazione più curata.",
    },
    {
      title: "Guide e cura",
      description: "Contenuti di orientamento per capire meglio scelta, manutenzione e collocazione.",
    },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border/40 bg-hero">
        <div className="absolute inset-0">
          <img
            src={heroBotanical}
            alt="Ambiente elegante con piante da interno e luce naturale"
            className="h-full min-h-[620px] w-full object-cover object-center"
            loading="eager"
          />
        </div>
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="absolute inset-0 bg-hero-accent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background))/0.72_100%)]" />

        <div className="container relative mx-auto flex min-h-[620px] items-end px-4 py-8 md:min-h-[720px] md:py-12 lg:items-center lg:py-16">
          <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,700px)_1fr] lg:gap-10">
            <div className="glass-hero-panel rounded-[2rem] p-6 text-primary-foreground shadow-hero md:p-8 lg:p-10">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-glass-hero bg-background/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-primary-foreground/88">
                <Leaf className="h-4 w-4 text-accent-bright" />
                Botanical living, shopping più chiaro
              </div>
              <h1 className="mt-6 max-w-3xl text-balance font-heading text-5xl font-bold leading-[0.92] text-primary-foreground md:text-6xl xl:text-7xl">
                Piante e idee verdi in una hero più immersiva, elegante e desiderabile.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/78 md:text-lg">
                Una selezione guidata tra immagini atmosferiche, dettagli più leggibili e un'esperienza d'acquisto più calma fin dal primo sguardo.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full bg-accent-bright px-7 text-sm font-semibold uppercase tracking-[0.18em] text-accent-bright-foreground shadow-hero hover:bg-accent-bright/90">
                  <a href="#catalogo">Acquista ora</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-glass-hero bg-background/10 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground backdrop-blur hover:bg-background/16 hover:text-primary-foreground">
                  <a href="#collezioni">Scopri le collezioni</a>
                </Button>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustStatements.map((item) => (
                  <div key={item} className="rounded-2xl border border-glass-hero bg-background/10 px-4 py-3 text-sm text-primary-foreground/88 backdrop-blur-md">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex lg:items-end lg:justify-end">
              <Card className="max-w-sm rounded-[1.75rem] border-glass-hero bg-background/10 p-6 text-primary-foreground shadow-hero backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-bright">Selezione in evidenza</p>
                <h2 className="mt-3 text-2xl font-heading font-bold text-primary-foreground md:text-3xl">
                  Atmosfera botanica, merchandising più premium.
                </h2>
                <p className="mt-3 text-sm leading-6 text-primary-foreground/74 md:text-base">
                  Overlay raffinati, superfici glass e accenti verde quasi fluo per un impatto above the fold molto più forte.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-background py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Inizia da qui</p>
              <h2 className="mt-2 text-3xl font-heading font-bold text-foreground md:text-4xl">Percorsi rapidi per orientarti meglio</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <a
                  key={shortcut.title}
                  href="#catalogo"
                  className="group rounded-[1.75rem] border border-border bg-gradient-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="mt-6 text-xl font-heading font-semibold text-foreground">{shortcut.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{shortcut.subtitle}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="catalogo" className="relative overflow-hidden bg-showcase py-14 md:py-20">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,hsl(var(--primary-light)/0.12),transparent_25%)]" />
        <div className="container relative mx-auto px-4 space-y-14">
          {[
            { title: "Best seller", subtitle: "Prodotti che aprono la scelta con più immediatezza", items: curated.bestSellers },
            { title: "Facili da scegliere", subtitle: "Una selezione più accessibile per iniziare senza attrito", items: curated.easyCare },
            { title: "Collezione del momento", subtitle: "Scelte stagionali presentate con un taglio più editoriale", items: curated.seasonal },
          ].map((group, index) => (
            <div key={group.title} className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${index === 1 ? "text-primary-foreground/70" : "text-primary"}`}>
                    Selezione curata
                  </p>
                  <h2 className={`mt-2 text-3xl font-heading font-bold md:text-4xl ${index === 1 ? "text-primary-foreground" : "text-foreground"}`}>
                    {group.title}
                  </h2>
                  <p className={`mt-2 max-w-2xl ${index === 1 ? "text-primary-foreground/72" : "text-muted-foreground"}`}>{group.subtitle}</p>
                </div>
                <Button asChild variant={index === 1 ? "secondary" : "outline"} className="rounded-full px-5 uppercase tracking-[0.18em]">
                  <a href="#collezioni">Esplora</a>
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : group.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {group.items.map((product) => (
                    <ProductCard key={`${group.title}-${product.node.id}`} product={product} dark={index === 1} />
                  ))}
                </div>
              ) : (
                <div className={`rounded-[1.75rem] border px-6 py-12 text-center ${index === 1 ? "border-primary-foreground/10 bg-card/8 text-primary-foreground/72" : "border-border bg-card text-muted-foreground"}`}>
                  Nessun prodotto trovato.
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Fiducia e rassicurazione</p>
            <h2 className="mt-2 text-3xl font-heading font-bold text-foreground md:text-4xl">Elementi chiari che aiutano a comprare meglio</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="rounded-[1.75rem] border-border bg-gradient-card p-6 shadow-soft">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-heading font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background py-6 md:py-10">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] border border-border bg-gradient-card p-7 shadow-soft md:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Missione</p>
                <h2 className="mt-2 text-3xl font-heading font-bold text-foreground md:text-4xl">Un ecommerce verde più solido, elegante e facile da leggere.</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-[1.5rem] border-border bg-background/80 p-6 shadow-soft">
                  <Leaf className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 text-lg font-heading font-semibold text-foreground">Scelta più semplice</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Meno rumore visivo, più priorità chiare tra immagine, informazioni e acquisto.</p>
                </Card>
                <Card className="rounded-[1.5rem] border-border bg-background/80 p-6 shadow-soft">
                  <HeartHandshake className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 text-lg font-heading font-semibold text-foreground">Esperienza più umana</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Più fiducia nella navigazione e nella fase decisionale, soprattutto da mobile.</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="collezioni" className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Esplora il catalogo</p>
              <h2 className="mt-2 text-3xl font-heading font-bold text-foreground md:text-4xl">Accessi più profondi a collezioni e contenuti</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {editorialCollections.map((item) => (
              <Card key={item.title} className="group rounded-[1.75rem] border-border bg-gradient-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
                <h3 className="text-xl font-heading font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Approfondisci <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
