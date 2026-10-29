import { formatMoney, formatProductPrice } from "@/lib/storefront-money";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PaymentInformation } from "./PaymentInformation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/useMobile";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { selectRelatedProducts } from "@/lib/storefrontDiscovery";
import { useCartStore } from "@/stores/cartStore";
import pdpCalmaBg from "@/assets/pdp-calma-bg.png";
import {
  ChevronLeft,
  ChevronRight,
  Facebook,
  ImageIcon,
  Leaf,
  Link2,
  Loader2,
  Minus,
  Plus,
  Sprout,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDifficultyLevel,
  isRoseProduct,
  parseBotanicalInfo,
  parseFaqItems,
  parseMultilineMetafield,
  parseProductAttributes,
  parseSeasonalCalendar,
  parseSingleLineMetafield,
  type ProductAttribute,
  type SeasonalCalendarSlot,
} from "@/components/storefront/pdpMetafields";

interface PdpProps {
  product: ShopifyProduct;
  selectedVariant: ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null;
  setSelectedVariant: (variant: ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null) => void;
  careInfoContent: ReactNode;
}

const MONTH_LABELS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const MONTH_MAP: Record<string, number> = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
  gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5,
  lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11,
};

function parseMonthsFromValue(value: string): number[] {
  let months: string[];
  try {
    const parsed: unknown = JSON.parse(value);
    months = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : value.split(/[,\n]/);
  } catch {
    months = value.split(/[,\n]/);
  }
  return months
    .map((m) => MONTH_MAP[m.trim().toLowerCase()])
    .filter((m): m is number => typeof m === "number");
}

const SLOT_STYLES: Record<SeasonalCalendarSlot["id"], { bar: string; legend: string }> = {
  flowering: { bar: "bg-[#f4c2c2]", legend: "bg-[#f4c2c2]" },
  pruning:   { bar: "bg-[#b5c9a8]", legend: "bg-[#b5c9a8]" },
  planting:  { bar: "bg-[#c4956a]", legend: "bg-[#c4956a]" },
  harvest:   { bar: "bg-[#e8c87a]", legend: "bg-[#e8c87a]" },
};

const BuyNowColor = "#B4483C";
const BuyNowHoverColor = "#9A3A2F";

const colorSwatchMap: Record<string, string> = {
  verde: "#4a7a4a",
  "verde chiaro": "#7ba77b",
  "verde scuro": "#2f5a33",
  bianco: "#f5f2ea",
  rosso: "#c44536",
  rosa: "#e8a1b0",
  viola: "#8b5fbf",
  giallo: "#e3c35a",
  arancione: "#d98b3f",
  arancio: "#d98b3f",
  nero: "#222",
  blu: "#3c5a85",
  azzurro: "#6fa3c7",
  beige: "#d9c3a0",
  lilla: "#b797cf",
  fucsia: "#c64373",
};

export const Pdp = ({ product, selectedVariant, setSelectedVariant, careInfoContent }: PdpProps) => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const isCheckingOut = useCartStore((state) => state.isLoading);
  const buyAttempt = useRef<string | null>(null);
  const zoomTrigger = useRef<HTMLButtonElement>(null);
  const cartItems = useCartStore((state) => state.items);
  const createCheckout = useCartStore((state) => state.createCheckout);
  const isMobile = useIsMobile();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ShopifyProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const { node } = product;
  const images = node.images.edges;
  const hasMultipleImages = images.length > 1;
  const variants = useMemo(() => node.variants.edges.map((edge) => edge.node), [node.variants.edges]);
  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;
  const inCartQuantity = selectedVariant ? cartItems.find((item) => item.variantId === selectedVariant.id)?.quantity ?? 0 : 0;

  const resolvedSpecialBullets = parseMultilineMetafield(node.specialBullets);
  const resolvedKeyFeatures = parseMultilineMetafield(node.keyFeatures);
  const resolvedOriginsHabitat = parseMultilineMetafield(node.originsHabitat);
  const resolvedPlantKnowledge = parseMultilineMetafield(node.plantKnowledge);
  const resolvedCareGuide = parseMultilineMetafield(node.careGuide);
  const botanical = parseBotanicalInfo(node);
  const resolvedProductAttributes = parseProductAttributes(node.productAttributes);

  // Nuovi metafield cliente (STEP B). Tutti condizionali: se vuoti, nulla cambia.
  const isRose = isRoseProduct(node);
  const resolvedHybridizer = isRose ? parseSingleLineMetafield(node.hybridizer) : null;
  const resolvedFlowerColor = parseSingleLineMetafield(node.flowerColor);
  const resolvedLeafColor = parseSingleLineMetafield(node.leafColor);
  const resolvedCuriosity = parseMultilineMetafield(node.curiosity);

  // Specifiche rapide = attributi JSON + colori + ibridatore (rose). `swatch` opzionale per i colori.
  const quickSpecs: Array<ProductAttribute & { swatch?: string }> = [
    ...resolvedProductAttributes,
    ...(resolvedFlowerColor ? [{ key: "Colore fiore", value: resolvedFlowerColor, swatch: colorSwatchMap[resolvedFlowerColor.toLowerCase().trim()] }] : []),
    ...(resolvedLeafColor ? [{ key: "Colore foglia", value: resolvedLeafColor, swatch: colorSwatchMap[resolvedLeafColor.toLowerCase().trim()] }] : []),
    ...(resolvedHybridizer ? [{ key: "Ibridatore", value: resolvedHybridizer }] : []),
  ];

  const seasonalCalendar = parseSeasonalCalendar(node);
  const faqItems = parseFaqItems(node.faqItems);
  const faqTitle = parseSingleLineMetafield(node.faqTitle) || "Domande frequenti";
  const difficultyLevel = getDifficultyLevel(botanical.cultivationDifficulty);
  const difficultyStyle: Record<typeof difficultyLevel, { bg: string; text: string; dot: string }> = {
    easy:    { bg: "rgba(74,122,74,0.12)",  text: "#3d6a3d", dot: "#4a7a4a" },
    medium:  { bg: "rgba(217,139,63,0.14)", text: "#a06424", dot: "#d98b3f" },
    hard:    { bg: "rgba(180,72,60,0.14)",  text: "#8a3a30", dot: "#B4483C" },
    unknown: { bg: "rgba(100,100,100,0.08)", text: "#5a5a5a", dot: "#8a8a8a" },
  };
  const hasBotanicalCard = Boolean(
    botanical.commonName || botanical.botanicalName || botanical.cultivationDifficulty,
  );

  useEffect(() => {
    // Related products are non-critical: a Shopify failure here must never break the PDP.
    let cancelled = false;
    const load = async () => {
      setRelatedLoading(true);
      try {
        const products = await fetchProducts(120, undefined, { sortKey: "CREATED_AT", reverse: true });
        if (!cancelled) {
          setRelatedProducts(selectRelatedProducts(product, products, 4));
        }
      } catch (error) {
        console.error("Errore caricamento prodotti correlati:", error);
        if (!cancelled) setRelatedProducts([]);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [node.handle, product]);

  const optionGroups = useMemo(() => {
    return node.options.map((option) => {
      const selectedValue =
        selectedVariant?.selectedOptions?.find((item) => item.name === option.name)?.value ?? option.values[0];
      const values = option.values.map((value) => {
        const trialOptions = node.options.map((opt) => ({
          name: opt.name,
          value:
            opt.name === option.name
              ? value
              : selectedVariant?.selectedOptions?.find((i) => i.name === opt.name)?.value ?? opt.values[0],
        }));
        const match = variants.find((variant) =>
          variant.selectedOptions?.every((o) => trialOptions.find((t) => t.name === o.name)?.value === o.value),
        );
        return { value, available: Boolean(match?.availableForSale) };
      });
      return { name: option.name, values, selectedValue };
    });
  }, [node.options, selectedVariant?.selectedOptions, variants]);

  const handleOptionChange = (optionName: string, value: string) => {
    const desired = optionGroups.map((group) => ({
      name: group.name,
      value: group.name === optionName ? value : group.selectedValue,
    }));
    const match = variants.find((variant) =>
      variant.selectedOptions?.every((o) => desired.find((d) => d.name === o.name)?.value === o.value),
    );
    if (match) setSelectedVariant(match);
  };

  const handleAddToCart = () => {
    if (useCartStore.getState().isLoading) return;
    if (!selectedVariant?.availableForSale) {
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
    toast.success("Prodotto aggiunto al carrello!", { position: "top-center", id: "cart-added" });
  };

  const handleBuyNow = async () => {
    if (useCartStore.getState().isLoading) return;
    if (!selectedVariant || !selectedVariant.availableForSale) {
      toast.error("Prodotto non disponibile");
      return;
    }
    // Retrying the same failed attempt must not add the quantity a second time.
    const attemptKey = `${selectedVariant.id}:${quantity}`;
    const existingQuantity = useCartStore.getState().items.find(item => item.variantId === selectedVariant.id)?.quantity ?? 0;
    if (buyAttempt.current !== attemptKey || existingQuantity < quantity) {
      addItem({
        product,
        variantId: selectedVariant.id,
        variantTitle: selectedVariant.title,
        price: selectedVariant.price,
        quantity,
        selectedOptions: selectedVariant.selectedOptions || [],
      });
      buyAttempt.current = attemptKey;
    }
    try {
      // Use the URL returned directly from createCheckout to avoid opening a stale URL.
      const checkoutUrl = await createCheckout();
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else {
        toast.error("Errore durante il checkout");
      }
    } catch (error) {
      console.error("Checkout fallito:", error);
      toast.error("Errore durante il checkout. Riprova.");
    }
  };

  const handleShareCopy = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiato negli appunti");
    } catch {
      /* ignore */
    }
  };

  const descriptionParagraphs = node.description
    ? node.description.split(/\n+/).map((item) => item.trim()).filter(Boolean)
    : [];
  const descriptionText =
    descriptionParagraphs.join(" ") ||
    "Una selezione outdoor pensata per valorizzare terrazzi, balconi e giardini con eleganza naturale.";
  const hasLongDescription = descriptionText.length > 220;
  const shortDescription = hasLongDescription ? `${descriptionText.slice(0, 220).trim()}...` : descriptionText;

  return (
    <main id="main-content" tabIndex={-1} className="bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <a
        href="#product-info"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] bg-background/95 px-4 py-2 text-sm font-semibold text-foreground shadow-soft"
      >
        Salta alle informazioni del prodotto
      </a>

      <div className="container mx-auto max-w-[1200px] px-4 pt-6 md:pt-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <button type="button" onClick={() => navigate("/")} className="hover:text-foreground">
            Home
          </button>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <button type="button" onClick={() => navigate("/collections/all")} className="hover:text-foreground">
            Tutti i prodotti
          </button>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="truncate text-foreground">{node.title}</span>
        </nav>
      </div>

      <section className="container mx-auto max-w-[1200px] px-4 py-5 md:py-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14">
          <div className="min-w-0 max-w-full space-y-8 [overflow-wrap:anywhere]">
            <div className={hasMultipleImages ? "lg:grid lg:grid-cols-[80px_minmax(0,1fr)] lg:gap-3" : ""}>
              {hasMultipleImages && (
                <div className="hidden lg:order-1 lg:flex lg:flex-col lg:gap-3">
                  {images.map((img, idx) => (
                    <button
                      key={`thumb-desktop-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`aspect-square w-20 shrink-0 overflow-hidden border bg-muted ${
                        selectedImage === idx ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border/60"
                      }`}
                      aria-label={`Immagine ${idx + 1}`}
                    >
                      <img src={img.node.url} alt={img.node.altText || ""} className="h-full w-full object-contain lg:object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="min-w-0 lg:order-2">
                <div className="group relative w-full overflow-hidden border border-border/60 bg-muted">
                  <button
                    type="button"
                    ref={zoomTrigger}
                    onClick={() => setZoomOpen(true)}
                    className="block h-[min(62svh,460px)] w-full sm:h-[min(68svh,560px)] lg:aspect-[5/6] lg:h-auto"
                    aria-label="Ingrandisci immagine"
                  >
                    {images[selectedImage] ? (
                      <img
                        src={images[selectedImage].node.url}
                        alt={images[selectedImage].node.altText || node.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12" />
                      </div>
                    )}
                  </button>
                  {hasMultipleImages && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-soft hover:bg-background"
                        aria-label="Immagine precedente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
                        className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-soft hover:bg-background"
                        aria-label="Immagine successiva"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {hasMultipleImages && (
                <div className="mt-3 flex gap-3 overflow-x-auto lg:hidden">
                  {images.map((img, idx) => (
                    <button
                      key={`thumb-mobile-${idx}`}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`aspect-square w-20 shrink-0 overflow-hidden border bg-muted ${
                        selectedImage === idx ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border/60"
                      }`}
                      aria-label={`Immagine ${idx + 1}`}
                    >
                      <img src={img.node.url} alt={img.node.altText || ""} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasBotanicalCard && (
              <div className="border border-border bg-card p-5 md:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">
                  Scheda botanica
                </p>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {botanical.commonName && (
                    <h2 className="text-xl font-heading font-semibold text-foreground md:text-[1.4rem]">
                      {botanical.commonName}
                    </h2>
                  )}
                  {botanical.botanicalName && (
                    <p className="text-[15px] italic text-muted-foreground">{botanical.botanicalName}</p>
                  )}
                </div>
                {botanical.cultivationDifficulty && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold"
                    style={{
                      backgroundColor: difficultyStyle[difficultyLevel].bg,
                      color: difficultyStyle[difficultyLevel].text,
                    }}
                  >
                    <Sprout className="h-3.5 w-3.5" />
                    Difficolta di coltivazione: {botanical.cultivationDifficulty}
                  </div>
                )}
              </div>
            )}

            {quickSpecs.length > 0 && (
              <div className="border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg font-semibold text-foreground">Specifiche rapide</h2>
                <div className="mt-4 grid grid-cols-1 min-[375px]:grid-cols-2 gap-3 md:grid-cols-3">
                  {quickSpecs.map((attr) => (
                    <div
                      key={`${attr.key}-${attr.value}`}
                      className="border border-border/70 bg-background px-3 py-2.5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {attr.key}
                      </p>
                      <p className="mt-1 flex break-words items-center gap-2 text-[14px] font-medium leading-tight text-foreground">
                        {attr.swatch && (
                          <span
                            aria-hidden="true"
                            className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-border/60"
                            style={{ backgroundColor: attr.swatch }}
                          />
                        )}
                        <span>{attr.value}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {seasonalCalendar.length > 0 && (
              <div className="border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg font-semibold text-foreground">Calendario stagionale</h2>

                <div className="mt-5 max-w-full overflow-x-auto overscroll-x-contain pb-2 [scrollbar-gutter:stable]" role="region" aria-label="Calendario stagionale: scorri per vedere tutti i mesi" tabIndex={0}>
                  <div style={{ minWidth: 520 }}>
                    <div className="grid grid-cols-12 gap-[2px] pl-[108px] mb-2">
                      {MONTH_LABELS.map((m) => (
                        <div
                          key={m}
                          className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          {m}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2">
                      {seasonalCalendar.map((slot) => {
                        const activeMonths = parseMonthsFromValue(slot.value);
                        const style = SLOT_STYLES[slot.id];
                        return (
                          <div key={slot.id} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-foreground w-[100px] shrink-0 text-right">
                              {slot.label}<span className="sr-only">: {activeMonths.length ? activeMonths.map(month => MONTH_LABELS[month]).join(", ") : slot.value}</span>
                            </span>
                            <div className="grid grid-cols-12 flex-1 gap-[2px]">
                              {Array.from({ length: 12 }, (_, i) => {
                                const isActive = activeMonths.includes(i);
                                const prevActive = activeMonths.includes(i - 1);
                                const nextActive = activeMonths.includes(i + 1);
                                const rounded = [
                                  isActive && !prevActive ? "rounded-l-full" : "",
                                  isActive && !nextActive ? "rounded-r-full" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ");
                                return (
                                  <div
                                    key={i}
                                    className={`h-5 ${
                                      isActive ? `${style.bar} ${rounded}` : "bg-muted/30"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-4 pl-[108px]">
                      {seasonalCalendar.map((slot) => {
                        const style = SLOT_STYLES[slot.id];
                        return (
                          <div key={`legend-${slot.id}`} className="flex items-center gap-1.5">
                            <span className={`h-3 w-3 rounded-full ${style.legend}`} />
                            <span className="text-xs text-muted-foreground">{slot.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {resolvedSpecialBullets.length > 0 && <div className="border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg font-semibold text-foreground">Cosa lo rende speciale</h2>
              <ul className="mt-4 space-y-2.5">
                {resolvedSpecialBullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[15px] leading-6 text-muted-foreground">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[13px] leading-none text-primary-dark">
                      +
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>}

            {resolvedOriginsHabitat.length > 0 && (
              <div className="border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg font-semibold text-foreground">Origini e habitat</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">
                  {resolvedOriginsHabitat.map((paragraph, idx) => (
                    <p key={`origins-${idx}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {resolvedPlantKnowledge.length > 0 && (
              <div className="bg-muted/40 p-5 md:p-7">
                <div className="flex items-center gap-2 text-primary-dark">
                  <Leaf className="h-4 w-4" strokeWidth={1.8} />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Approfondimento</p>
                </div>
                <h2 className="mt-2 text-[1.35rem] font-heading font-semibold text-foreground md:text-[1.5rem]">
                  Conosci meglio la tua pianta
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-foreground/85">
                  {resolvedPlantKnowledge.map((paragraph, idx) => (
                    <p key={`knowledge-${idx}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {resolvedCareGuide.length > 0 && (
              <div className="border border-border bg-card p-5 md:p-7">
                <h2 className="text-[1.35rem] font-heading font-semibold text-foreground md:text-[1.5rem]">
                  Come prendersene cura
                </h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">
                  {resolvedCareGuide.map((paragraph, idx) => (
                    <p key={`care-guide-${idx}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/40 p-5 md:p-7">
              <h2 className="text-lg font-semibold text-foreground">Pagamenti e sicurezza</h2>
              <div className="mt-3"><PaymentInformation /></div>
            </div>
          </div>

          <aside id="product-info" tabIndex={-1} className="min-w-0 scroll-mt-48 lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Online Garden</p>
            <h1 className="mt-2 text-[2rem] font-heading font-semibold leading-[1.1] text-foreground md:text-[2.25rem]">
              {node.title}
            </h1>
            {botanical.botanicalName && (
              <p className="mt-1.5 text-sm italic text-muted-foreground">{botanical.botanicalName}</p>
            )}

            <p className="mt-2.5 text-[1.6rem] font-heading font-semibold text-foreground">
              {formatMoney(price)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Tasse incluse.</p>

            <hr className="mt-4 border-border/70" />

            <p className="mt-4 text-[15px] leading-7 text-foreground/85">
              {descriptionExpanded ? descriptionText : shortDescription}
            </p>
            {hasLongDescription && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((prev) => !prev)}
                className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4"
              >
                {descriptionExpanded ? "Leggi meno" : "Leggi di piu"}
              </button>
            )}

            {optionGroups.map((group) => {
              // Nascondi l'opzione "Title / Default Title" di Shopify per prodotti senza varianti reali
              const isDefaultTitleOnly =
                group.values.length <= 1 &&
                (/^title$/i.test(group.name) || /^default title$/i.test(group.selectedValue));
              if (isDefaultTitleOnly) return null;
              const isColorGroup = /color|colore|tonalit/i.test(group.name);
              return (
                <div key={group.name} className="mt-4">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{group.name}:</span>{" "}
                    <span className="text-muted-foreground">{group.selectedValue}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.values.map(({ value, available }) => {
                      const isActive = group.selectedValue === value;

                      if (isColorGroup) {
                        const swatch = colorSwatchMap[value.toLowerCase()] || "#e2ded4";
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleOptionChange(group.name, value)}
                            title={value}
                            className={`relative h-10 w-10 overflow-hidden border transition-all ${
                              isActive ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
                            } ${!available ? "opacity-60" : ""}`}
                            style={{ backgroundColor: swatch }}
                            aria-label={value}
                          >
                            {!available && (
                              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_47%,rgba(0,0,0,0.55)_48%,rgba(0,0,0,0.55)_52%,transparent_53%)]" />
                            )}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => available && handleOptionChange(group.name, value)}
                          disabled={!available}
                          className={`relative min-w-[76px] border px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "border-primary text-foreground"
                              : "border-border bg-background text-foreground hover:border-foreground/60"
                          } ${!available ? "cursor-not-allowed text-muted-foreground" : ""}`}
                        >
                          {value}
                          {!available && (
                            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_47%,rgba(0,0,0,0.2)_48%,rgba(0,0,0,0.2)_52%,transparent_53%)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span className="text-foreground">
                  {selectedVariant?.availableForSale ? "Disponibile" : "Non disponibile"}
                </span>
              </div>

            </div>

            <div className="mt-4 flex items-center gap-2.5">
              <div className="inline-flex h-11 items-center border border-border bg-background">
                <button
                  type="button"
                  aria-label="Riduci quantita"
                  className="flex h-full items-center px-3 text-foreground"
                  disabled={quantity <= 1 || isCheckingOut}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-8 px-1 text-center text-sm font-semibold text-foreground">{quantity}</span>
                <button
                  type="button"
                  aria-label="Aumenta quantita"
                  className="flex h-full items-center px-3 text-foreground"
                  disabled={isCheckingOut}
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.availableForSale || isCheckingOut}
                className="min-h-11 flex-1 px-2 py-2 border border-foreground bg-background text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aggiungi al carrello
              </button>
            </div>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!selectedVariant?.availableForSale || isCheckingOut}
              style={{ backgroundColor: BuyNowColor }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = BuyNowHoverColor;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = BuyNowColor;
              }}
              className="mt-2.5 h-11 w-full text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCheckingOut ? "Preparazione checkout…" : "Acquista ora"}
            </button>

            {inCartQuantity > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Gia nel carrello: {inCartQuantity}</p>
            )}

            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground">Potrebbero interessarti</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {relatedProducts.map((item) => (
                  <button
                    key={item.node.id}
                    type="button"
                    onClick={() => navigate(`/products/${item.node.handle}`)}
                    className="inline-flex items-center gap-2 border border-border bg-background px-3 py-1.5 text-xs text-foreground/85 hover:border-foreground/60"
                  >
                    {item.node.images.edges[0]?.node?.url ? (
                      <img
                        src={item.node.images.edges[0].node.url}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-muted" />
                    )}
                    <span className="truncate max-w-[140px]">{item.node.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <p className="text-sm font-semibold text-foreground">Condividi:</p>
              <div className="flex items-center gap-3 text-muted-foreground">
                <a
                  href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                  aria-label="Condividi su Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                  aria-label="Condividi su Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={handleShareCopy}
                  className="hover:text-foreground"
                  aria-label="Copia link"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="container mx-auto max-w-[1200px] px-4 py-10">
        <Accordion type="multiple" defaultValue={["features"]} className="w-full">
          {resolvedKeyFeatures.length > 0 && <AccordionItem value="features">
            <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline md:text-[1.25rem]">
              Caratteristiche principali
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <ul className="space-y-3 text-[15px] leading-7 text-muted-foreground">
                {resolvedKeyFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>}
          <AccordionItem value="care">
            <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline md:text-[1.25rem]">
              Cura e utilizzo
            </AccordionTrigger>
            <AccordionContent className="pb-6">{careInfoContent}</AccordionContent>
          </AccordionItem>
          {resolvedCuriosity.length > 0 ? (
            /* Curiosità (manuale) sostituisce visivamente "Spedizione e resi" quando valorizzato. */
            <AccordionItem value="curiosita">
              <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline md:text-[1.25rem]">
                Curiosità
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="border-l-2 border-primary/40 bg-muted/30 py-4 pl-5 pr-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Lo sapevi che
                  </p>
                  <div className="mt-2 space-y-3 text-[15px] leading-7 text-foreground/85">
                    {resolvedCuriosity.map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : (
            <AccordionItem value="shipping">
              <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline md:text-[1.25rem]">
                Spedizione e resi
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-[15px] leading-7 text-muted-foreground">
                <div className="space-y-3">
                  <p>Costi e opzioni di spedizione vengono mostrati nel checkout prima della conferma.</p>
                  <p>Per informazioni su consegna, resi o assistenza, <a href="mailto:info@onlinegarden.it" className="underline underline-offset-4">contatta il vivaio</a>.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </section>

      {faqItems.length > 0 && (
        <section className="container mx-auto max-w-[1200px] px-4 pb-10">
          <div className="mb-4">
            <h2 className="text-2xl font-heading font-semibold text-foreground md:text-[1.75rem]">
              {faqTitle}
            </h2>
          </div>
          <Accordion type="multiple" className="w-full">
            {faqItems.map((item, idx) => (
              <AccordionItem key={`faq-${idx}`} value={`faq-${idx}`}>
                <AccordionTrigger className="py-5 text-left text-[15px] font-semibold text-foreground hover:no-underline md:text-base">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[15px] leading-7 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      <section
        className="relative isolate overflow-hidden text-white"
        style={{
          backgroundImage: `url(${pdpCalmaBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0.08) 100%)",
          }}
        />
        <div className="container mx-auto max-w-[1200px] px-4 py-20 md:py-28">
          <h2
            className="max-w-3xl text-3xl font-heading font-semibold leading-[1.15] md:text-[2.5rem]"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}
          >
            Un momento di calma, nel tuo spazio.
          </h2>
          <p
            className="mt-4 max-w-2xl text-base leading-7 text-white/92"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.45)" }}
          >
            Crea angoli verdi che raccontano una storia. Che sia una fioritura solitaria, una pianta ornamentale o un
            piccolo agrume, ogni superficie diventa il riflesso della tua quiete personale.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-[1200px] px-4 py-10 md:py-14">
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-semibold text-foreground md:text-[1.75rem]">Prodotti correlati</h2>
          <p className="mt-2 text-sm text-muted-foreground">Potrebbe piacerti anche</p>
        </div>
        {relatedLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : relatedProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((item) => (
              <button
                key={item.node.id}
                type="button"
                onClick={() => navigate(`/products/${item.node.handle}`)}
                className="group h-auto overflow-hidden border border-border bg-card p-0 text-left shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {item.node.images.edges[0]?.node ? (
                    <img
                      src={item.node.images.edges[0].node.url}
                      alt={item.node.images.edges[0].node.altText || item.node.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Nessuna immagine</div>
                  )}
                </div>
                <div className="w-full p-4">
                  <h3 className="text-base font-semibold text-foreground">{item.node.title}</h3>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {formatProductPrice(item.node.priceRange)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nessun prodotto correlato disponibile al momento.
          </div>
        )}
      </section>

      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 border border-border/70 bg-background/95 p-3 shadow-elevated">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{node.title}</p>
              <p className="text-sm font-bold text-foreground">{formatMoney(price)}</p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant?.availableForSale || isCheckingOut}
              className="h-11 shrink-0 bg-primary px-4 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-50"
            >
              {selectedVariant?.availableForSale ? "Aggiungi" : "Esaurito"}
            </button>
          </div>
        </div>
      )}

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); zoomTrigger.current?.focus(); }} className="max-w-5xl p-6">
          <DialogTitle className="sr-only">Immagine di {node.title}</DialogTitle>
          {images[selectedImage] && <img src={images[selectedImage].node.url} alt={images[selectedImage].node.altText || node.title} className="max-h-[80dvh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </main>
  );
};
