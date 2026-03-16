import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, HeadphonesIcon, Loader2, PackageCheck, ShieldCheck, Sparkles, Star, Trees, HeartHandshake, SunMedium, Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/ProductCard";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";

const shortcuts = [
  { title: "Piante da interno", subtitle: "Per soggiorno, camera e studio", icon: Trees },
  { title: "Piante da esterno", subtitle: "Balconi, terrazzi e giardini", icon: SunMedium },
  { title: "Facili da curare", subtitle: "Ideali per iniziare", icon: Sparkles },
  { title: "Idee regalo", subtitle: "Pensieri verdi che durano", icon: Flower2 },
];

const trustItems = [
  {
    title: "Spedizione protetta",
    description: "Imballaggio curato per ridurre stress e danni durante il trasporto.",
    icon: PackageCheck,
  },
  {
    title: "Qualità selezionata",
    description: "Catalogo scelto per offrire prodotti più affidabili e chiari da acquistare.",
    icon: CheckCircle2,
  },
  {
    title: "Supporto reale",
    description: "Assistenza prima e dopo l'acquisto per aiutarti nella scelta.",
    icon: HeadphonesIcon,
  },
  {
    title: "Acquisto sereno",
    description: "Checkout già collaudato e percorso d'acquisto semplice anche da mobile.",
    icon: ShieldCheck,
  },
];

const testimonials = [
  {
    quote: "Acquisto più semplice del previsto: immagini chiare, scelta veloce e spedizione curata.",
    author: "Cliente verificato",
  },
  {
    quote: "Finalmente un catalogo che aiuta davvero a capire cosa comprare, anche da smartphone.",
    author: "Nuovo cliente",
  },
  {
    quote: "Esperienza pulita e rassicurante: il prodotto arrivato era coerente con le aspettative.",
    author: "Appassionata di piante",
  },
];

export const HomepageV2 = () => {
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

  const curated = useMemo(() => {
    return {
      bestSellers: products.slice(0, 4),
      beginner: products.slice(4, 8),
      seasonal: products.slice(8, 12),
    };
  }, [products]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary-light)/0.15),transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1),transparent_30%)]" />
        <div className="container relative mx-auto px-4 py-8 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Selezione guidata, shopping semplice, spedizione protetta
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight text-foreground md:text-6xl">
                  Piante e idee verdi scelte per farti comprare bene, subito.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Scopri prodotti facili da capire, immagini pulite e percorsi guidati per trovare più in fretta ciò che sta bene nei tuoi spazi.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full px-7 text-sm font-semibold uppercase tracking-wide">
                  <a href="#catalogo">Acquista ora</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-7 text-sm font-semibold uppercase tracking-wide">
                  <a href="#collezioni">Scopri le collezioni</a>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {trustItems.slice(0, 3).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-muted shadow-lg">
                {products[0]?.node.images.edges[0]?.node ? (
                  <img
                    src={products[0].node.images.edges[0].node.url}
                    alt={products[0].node.images.edges[0].node.altText || products[0].node.title}
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                    Immagine prodotto in evidenza
                  </div>
                )}
              </div>
              <Card className="absolute bottom-4 left-4 right-4 rounded-[1.5rem] border-border bg-card/95 p-5 shadow-lg backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">Selezione in primo piano</p>
                    <h2 className="mt-2 text-2xl font-heading font-bold text-foreground">
                      {products[0]?.node.title || "Collezione guidata per iniziare"}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Scopri una scelta visiva più chiara, pensata per aiutarti a decidere in meno tempo.
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-primary/10 p-3 text-primary md:block">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Scopri più in fretta</p>
              <h2 className="mt-2 text-3xl font-heading font-bold text-foreground">Percorsi guidati per iniziare</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <a
                  key={shortcut.title}
                  href="#catalogo"
                  className="group rounded-[1.5rem] border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-foreground">{shortcut.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{shortcut.subtitle}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Vai alla selezione <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="catalogo" className="bg-muted/30 py-14 md:py-20">
        <div className="container mx-auto px-4 space-y-12">
          {[{ title: "Best seller", subtitle: "I prodotti più convincenti per iniziare", items: curated.bestSellers }, { title: "Facili da scegliere", subtitle: "Una selezione semplice e leggibile", items: curated.beginner }, { title: "Collezione del momento", subtitle: "Scelte stagionali e idee regalo", items: curated.seasonal }].map((group) => (
            <div key={group.title} className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Selezione curata</p>
                  <h2 className="mt-2 text-3xl font-heading font-bold text-foreground">{group.title}</h2>
                  <p className="mt-2 text-muted-foreground">{group.subtitle}</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {group.items.map((product) => (
                    <ProductCard key={`${group.title}-${product.node.id}`} product={product} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-5 lg:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="rounded-[1.5rem] border-border p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Fiducia reale</p>
            <h2 className="mt-2 text-3xl font-heading font-bold text-foreground">Poche recensioni, più forti e leggibili</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.quote} className="rounded-[1.5rem] border-border p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-lg leading-8 text-foreground">“{item.quote}”</p>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{item.author}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Missione</p>
              <h2 className="mt-2 text-3xl font-heading font-bold text-foreground">Un ecommerce verde più chiaro, utile e rassicurante.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-[1.5rem] border-border p-6 shadow-sm">
                <Leaf className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-heading font-semibold text-foreground">Scelta più semplice</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Riduciamo rumore, confusione e attrito per accompagnare meglio la decisione d'acquisto.</p>
              </Card>
              <Card className="rounded-[1.5rem] border-border p-6 shadow-sm">
                <HeartHandshake className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-heading font-semibold text-foreground">Esperienza più umana</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Più fiducia prima dell'ordine e maggiore serenità dopo l'acquisto, soprattutto da mobile.</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="collezioni" className="border-t border-border bg-muted/30 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Esplora il catalogo</p>
              <h2 className="mt-2 text-3xl font-heading font-bold text-foreground">Accesso più profondo alle collezioni</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Categorie in evidenza",
              "Collezioni curate",
              "Idee stagionali",
              "Contenuti dedicati alla cura",
            ].map((item) => (
              <Card key={item} className="rounded-[1.5rem] border-border p-6 shadow-sm">
                <h3 className="text-lg font-heading font-semibold text-foreground">{item}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Una struttura più leggibile per aiutare navigazione, scoperta e conversione.</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
