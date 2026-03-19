import heroBotanical from "@/assets/hero-botanical-spring.jpg";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { ArrowRight, CheckCircle2, HeadphonesIcon, HeartHandshake, Leaf, Loader2, PackageCheck, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";


const trustItems = [
{
  title: "Consegna sicura e protetta",
  description: "Ogni pianta viene confezionata con cura per arrivare fresca e intatta, anche in primavera.",
  icon: PackageCheck
},
{
  title: "Selezione stagionale",
  description: "Varietà scelte per la stagione: fioriture, profumi e colori pensati per questo momento dell'anno.",
  icon: CheckCircle2
},
{
  title: "Assistenza dedicata",
  description: "Ti aiutiamo a scegliere, piantare e curare. Prima, durante e dopo l'acquisto.",
  icon: HeadphonesIcon
},
{
  title: "Acquisto senza pensieri",
  description: "Checkout veloce, pagamento sicuro e un'esperienza fluida anche da smartphone.",
  icon: ShieldCheck
}];


const trustStatements = [
  "Consegna protetta",
  "Checkout semplice",
  "Assistenza reale"
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
    seasonal: products.slice(8, 12)
  }), [products]);

  const editorialCollections = [
  {
    title: "Fioriture di primavera",
    description: "Le piante più belle per portare colore e profumo in casa con l'arrivo della bella stagione."
  },
  {
    title: "Balconi e terrazze",
    description: "Idee e soluzioni per creare angoli verdi all'aperto, resistenti e pieni di vita."
  },
  {
    title: "Regala una pianta",
    description: "Idee regalo originali e facili da ordinare, perfette per ogni occasione primaverile."
  },
  {
    title: "Guida alla cura",
    description: "Consigli pratici per far crescere e mantenere le tue piante al meglio, stagione dopo stagione."
  }];


  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border/40 bg-hero">
        <div className="absolute inset-0">
          <img
            src={heroBotanical}
            alt="Piante primaverili in fiore con luce naturale calda"
            className="h-full min-h-[520px] w-full object-cover object-center"
            loading="eager" />
          
        </div>
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="absolute inset-0 bg-hero-accent opacity-90" />
        <div className="pointer-events-none absolute -left-12 top-20 hidden h-32 w-32 rounded-full bg-accent-bright/22 blur-3xl lg:block" />
        <div className="pointer-events-none absolute right-[8%] top-[16%] hidden h-24 w-24 rounded-full bg-accent-bright/18 blur-3xl lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background))/0.72_100%)]" />

        <div className="container relative mx-auto flex min-h-[440px] items-end px-4 py-4 md:min-h-[520px] md:py-6 lg:items-center lg:py-8">
          <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-8">
            <div className="glass-hero-panel animate-fade-up rounded-[1.5rem] p-4 text-primary-foreground shadow-hero md:rounded-[1.85rem] md:p-6 lg:p-8">
              <div className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-glass-hero bg-background/10 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-primary-foreground/88 md:px-4 md:py-2 md:text-[0.68rem] md:tracking-[0.26em]">
                <Leaf className="h-3.5 w-3.5 text-accent-bright md:h-4 md:w-4" />
                Botanical living
              </div>
              <h1 className="mt-4 max-w-3xl text-balance font-heading text-[2rem] font-bold leading-[0.94] text-primary-foreground md:mt-5 md:max-w-2xl md:text-[3.1rem] lg:max-w-3xl lg:text-[4.2rem] xl:text-[4.7rem]">
                È primavera: fai fiorire i tuoi spazi.
              </h1>
              <p className="animate-fade-up-delayed mt-3 max-w-xl text-[0.88rem] leading-5 text-primary-foreground/78 md:mt-4 md:text-[0.98rem] md:leading-6 lg:max-w-xl lg:text-[1.02rem] lg:leading-7">
                Scopri la nuova selezione primaverile: piante fiorite, aromatiche e da balcone pronte per te.
              </p>
              <div className="animate-fade-up-delayed mt-5 flex flex-col gap-2.5 sm:flex-row md:mt-6 md:gap-3">
                <Button asChild size="lg" className="h-10 rounded-full bg-accent-bright px-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-bright-foreground shadow-hero hover:bg-accent-bright/90 md:h-11 md:px-7 md:text-sm md:tracking-[0.18em]">
                  <a href="#catalogo">Scopri la collezione</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10 rounded-full border-glass-hero bg-background/10 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground backdrop-blur hover:bg-background/16 hover:text-primary-foreground md:h-11 md:px-7 md:text-sm md:tracking-[0.18em]">
                  <a href="#collezioni">Collezioni</a>
                </Button>
              </div>
              <div className="animate-fade-up-delayed-2 mt-5 grid gap-2 sm:grid-cols-3 md:mt-6 md:gap-3">
                {trustStatements.map((item) =>
                <div key={item} className="rounded-2xl border border-glass-hero bg-background/10 px-3 py-2.5 text-xs text-primary-foreground/88 backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 md:px-4 md:py-3 md:text-sm">
                    {item}
                  </div>
                )}
              </div>
            </div>

            









            
          </div>
        </div>
      </section>

      <section id="catalogo" className="relative overflow-hidden bg-background py-12 md:py-16">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,hsl(var(--primary-light)/0.08),transparent_24%)]" />
        <div className="container relative mx-auto px-4 space-y-12">
          {[
            { title: "Best seller", subtitle: "Prodotti che aprono la scelta con più immediatezza", items: curated.bestSellers },
            { title: "Facili da scegliere", subtitle: "Una selezione più accessibile per iniziare senza attrito", items: curated.easyCare },
            { title: "Collezione del momento", subtitle: "Scelte stagionali presentate con un taglio più editoriale", items: curated.seasonal },
          ].map((group) => (
            <div key={group.title} className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                    Selezione curata
                  </p>
                  <h2 className="mt-2 text-3xl font-heading font-bold text-foreground md:text-4xl">
                    {group.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-muted-foreground">{group.subtitle}</p>
                </div>
                <Button asChild variant="outline" className="rounded-full px-5 uppercase tracking-[0.18em]">
                  <a href="#collezioni">Esplora</a>
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : group.items.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:gap-5">
                  {group.items.map((product) => (
                    <ProductCard key={`${group.title}-${product.node.id}`} product={product} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">
                  Nessun prodotto trovato.
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="relative bg-background py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent-bright))/0.08,transparent_22%)]" />
        <div className="container relative mx-auto px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Fiducia e rassicurazione</p>
            <h2 className="mt-2 text-3xl font-heading font-bold text-foreground md:text-4xl">Elementi chiari che aiutano a comprare meglio</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="group rounded-[1.75rem] border border-glass-hero bg-background/82 p-6 shadow-soft backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-hero">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-glass-hero bg-accent-bright/12 text-accent-bright transition-transform duration-500 group-hover:scale-105">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-heading font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </Card>);

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
            {editorialCollections.map((item) =>
            <Card key={item.title} className="group rounded-[1.75rem] border-border bg-gradient-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
                <h3 className="text-xl font-heading font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Approfondisci <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>
    </>);

};