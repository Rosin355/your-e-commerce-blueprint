import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, HeadphonesIcon, ImageIcon, Info, Loader2, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShopifyProduct, fetchProducts } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface PdpV2Props {
  product: ShopifyProduct;
}

const trustRows = [
  "Imballaggio accurato per il trasporto",
  "Assistenza disponibile prima e dopo l'acquisto",
  "Checkout sicuro e flusso ordine già attivo",
];

export const PdpV2 = ({ product }: PdpV2Props) => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const isMobile = useIsMobile();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ShopifyProduct[]>([]);

  const { node } = product;
  const images = node.images.edges;
  const variants = node.variants.edges.map((edge) => edge.node);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null;
  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;

  useEffect(() => {
    setSelectedVariantId(variants[0]?.id ?? null);
  }, [node.id]);

  useEffect(() => {
    const loadRelated = async () => {
      const products = await fetchProducts(4);
      setRelatedProducts(products.filter((item) => item.node.handle !== node.handle).slice(0, 4));
    };

    loadRelated();
  }, [node.handle]);

  const optionSummary = useMemo(() => {
    return node.options
      .filter((option) => option.values.length > 0)
      .map((option) => ({ label: option.name, value: option.values.join(", ") }));
  }, [node.options]);

  const productHighlights = useMemo(() => {
    const highlights = [
      { label: "Disponibilità", value: selectedVariant?.availableForSale ? "Disponibile" : "Non disponibile" },
      { label: "Varianti", value: variants.length > 1 ? `${variants.length} opzioni` : "Unica opzione" },
      { label: "Immagini", value: images.length > 0 ? `${images.length} foto prodotto` : "Nessuna foto" },
      { label: "Handle", value: node.handle },
      ...optionSummary,
    ];

    return highlights.filter((item) => item.value);
  }, [selectedVariant?.availableForSale, variants.length, images.length, node.handle, optionSummary]);

  const detailRows = useMemo(() => {
    return [
      { label: "Titolo prodotto", value: node.title },
      { label: "Stato vendita", value: selectedVariant?.availableForSale ? "Acquistabile" : "Esaurito" },
      { label: "Prezzo", value: `€${parseFloat(price.amount).toFixed(2)}` },
      { label: "Numero immagini", value: String(images.length) },
      { label: "Numero varianti", value: String(variants.length) },
      ...optionSummary,
    ].filter((row) => row.value);
  }, [node.title, selectedVariant?.availableForSale, price.amount, images.length, variants.length, optionSummary]);

  const descriptionParagraphs = node.description
    ? node.description.split(/\n+/).map((item) => item.trim()).filter(Boolean)
    : [];

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error("Prodotto non disponibile");
      return;
    }

    addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions || [],
    });

    toast.success("Prodotto aggiunto al carrello!", { position: "top-center" });
  };

  const infoSections = [
    {
      value: "descrizione",
      title: "Descrizione",
      content: descriptionParagraphs.length > 0 ? (
        <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
          {descriptionParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-7 text-muted-foreground md:text-base">La descrizione dettagliata verrà mostrata qui quando disponibile nel catalogo.</p>
      ),
    },
    {
      value: "caratteristiche",
      title: "Caratteristiche",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          {detailRows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</p>
              <p className="mt-2 text-sm font-medium text-foreground md:text-base">{row.value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      value: "cura",
      title: "Cura e utilizzo",
      content: (
        <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
          <p>Usa le informazioni presenti in descrizione e varianti per scegliere il formato più adatto al tuo spazio.</p>
          <p>Se desideri confermare misure, disponibilità o dettagli specifici del prodotto, puoi contattare l'assistenza prima dell'acquisto.</p>
        </div>
      ),
    },
    {
      value: "spedizione",
      title: "Spedizione e supporto",
      content: (
        <div className="grid gap-4 md:grid-cols-3">
          {trustRows.map((row) => (
            <div key={row} className="rounded-2xl border border-border bg-card p-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm leading-6 text-foreground">{row}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <main className="bg-background pb-24 md:pb-0">
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="pl-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai prodotti
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="group relative block aspect-square w-full overflow-hidden rounded-[2rem] border border-border bg-muted text-left shadow-sm"
            >
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage].node.url}
                  alt={images[selectedImage].node.altText || node.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
              <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 text-sm font-medium text-foreground backdrop-blur">
                <Search className="h-4 w-4 text-primary" />
                Zoom immagine
              </div>
            </button>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 md:grid-cols-5">
                {images.map((img, idx) => (
                  <button
                    key={`${img.node.url}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square overflow-hidden rounded-2xl border bg-muted transition-all ${
                      selectedImage === idx ? "border-primary shadow-card" : "border-border"
                    }`}
                  >
                    <img
                      src={img.node.url}
                      alt={img.node.altText || `${node.title} ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">Scheda prodotto</Badge>
                {selectedVariant?.availableForSale ? (
                  <Badge className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">Disponibile</Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-wide">Non disponibile</Badge>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-heading font-bold leading-tight text-foreground md:text-5xl">{node.title}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Vista più chiara del prodotto, con dettagli acquisto, informazioni essenziali e rassicurazioni prima del checkout.
                </p>
              </div>
              <div className="text-4xl font-bold text-primary">€{parseFloat(price.amount).toFixed(2)}</div>
            </div>

            {variants.length > 1 && (
              <Card className="rounded-[1.5rem] border-border p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scegli la variante</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedVariant?.id === variant.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary"
                      }`}
                    >
                      {variant.title}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card className="rounded-[1.75rem] border-border p-6 shadow-sm">
              <div className="flex flex-col gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {productHighlights.slice(0, 4).map((item) => (
                    <div key={item.label} className="rounded-2xl bg-muted/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-border bg-background p-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setQuantity((value) => value + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleAddToCart}
                    disabled={!selectedVariant?.availableForSale}
                    size="lg"
                    className="h-12 flex-1 rounded-full text-sm font-semibold uppercase tracking-wide"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Aggiungi al carrello
                  </Button>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {trustRows.map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{row}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "Dettagli acquisto", description: "Più chiarezza su prezzo, varianti e disponibilità.", icon: Info },
                { title: "Supporto clienti", description: "Assistenza per dubbi prima della conferma ordine.", icon: HeadphonesIcon },
                { title: "Acquisto protetto", description: "Percorso di checkout già mantenuto e compatibile.", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="rounded-[1.5rem] border-border p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="mt-3 text-base font-heading font-semibold text-foreground">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-4 md:py-8">
        <Card className="rounded-[2rem] border-border p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-heading font-bold text-foreground">Panoramica rapida</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {productHighlights.map((item) => (
              <Badge key={`${item.label}-${item.value}`} variant="secondary" className="rounded-full px-4 py-2 text-sm">
                <span className="font-semibold text-foreground">{item.label}:</span>&nbsp;{item.value}
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      <section className="container mx-auto px-4 py-6 md:py-8">
        {isMobile ? (
          <Accordion type="single" collapsible className="rounded-[2rem] border border-border bg-card px-5 py-2 shadow-sm">
            {infoSections.map((section) => (
              <AccordionItem key={section.value} value={section.value} className="border-border">
                <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent className="pb-5">{section.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Tabs defaultValue="descrizione" className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-[1.25rem] bg-muted p-1">
              {infoSections.map((section) => (
                <TabsTrigger key={section.value} value={section.value} className="rounded-[1rem] text-sm font-medium">
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {infoSections.map((section) => (
              <TabsContent key={section.value} value={section.value} className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                {section.content}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>

      <section className="container mx-auto px-4 py-6 md:py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Imballaggio curato", description: "Protezione durante il trasporto per un'esperienza più affidabile.", icon: PackageCheck },
            { title: "Supporto disponibile", description: "Puoi chiarire dubbi su varianti e scelta prima di acquistare.", icon: HeadphonesIcon },
            { title: "Checkout invariato", description: "Il flusso finale rimane quello già esistente e compatibile.", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-[1.5rem] border-border p-6 shadow-sm">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-4 text-lg font-heading font-semibold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Continua a scoprire</p>
            <h2 className="mt-2 text-3xl font-heading font-bold text-foreground">Prodotti correlati</h2>
          </div>
        </div>
        {relatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((item) => (
              <button
                key={item.node.id}
                type="button"
                onClick={() => navigate(`/products/${item.node.handle}`)}
                className="group overflow-hidden rounded-[1.5rem] border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {item.node.images.edges[0]?.node ? (
                    <img
                      src={item.node.images.edges[0].node.url}
                      alt={item.node.images.edges[0].node.altText || item.node.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Nessuna immagine</div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-heading font-semibold text-foreground">{item.node.title}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-base font-bold text-primary">€{parseFloat(item.node.priceRange.minVariantPrice.amount).toFixed(2)}</span>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Apri <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </section>

      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-[1.5rem] border border-border bg-card p-3 shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{node.title}</p>
              <p className="text-sm font-bold text-primary">€{parseFloat(price.amount).toFixed(2)}</p>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={!selectedVariant?.availableForSale}
              className="rounded-full px-5 text-sm font-semibold uppercase tracking-wide"
            >
              Aggiungi
            </Button>
          </div>
        </div>
      )}

      {zoomOpen && images[selectedImage] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 p-4" onClick={() => setZoomOpen(false)}>
          <div className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-lg" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm"
            >
              Chiudi
            </button>
            <img
              src={images[selectedImage].node.url}
              alt={images[selectedImage].node.altText || node.title}
              className="max-h-[90vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
};
