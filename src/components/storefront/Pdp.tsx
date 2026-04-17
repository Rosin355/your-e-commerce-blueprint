import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/useMobile";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import pdpCalmaBg from "@/assets/pdp-calma-bg.png";
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Flower2,
  ImageIcon,
  Leaf,
  Link2,
  Loader2,
  Minus,
  Package,
  Plus,
  Scissors,
  Shovel,
  Sprout,
  Twitter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDifficultyLevel,
  parseBotanicalInfo,
  parseFaqItems,
  parseMultilineMetafield,
  parseProductAttributes,
  parseSeasonalCalendar,
  parseSingleLineMetafield,
} from "@/components/storefront/pdpMetafields";

interface PdpProps {
  product: ShopifyProduct;
  selectedVariant: ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null;
  setSelectedVariant: (variant: ShopifyProduct["node"]["variants"]["edges"][number]["node"] | null) => void;
  careInfoContent: ReactNode;
}

const specialBulletsDefault = [
  "Valorizza i tuoi spazi esterni con carattere e freschezza.",
  "Favorisce un'esperienza piu vivida tra terrazzi, balconi e giardini.",
  "Consegnato con cura dal vivaio, pronto da posizionare.",
  "Basso mantenimento, ideale anche per chi inizia con il verde.",
  "Coltivazione responsabile e imballaggio eco-attento.",
];

const keyFeaturesDefault = [
  "Selezione outdoor premium scelta per durata e portamento.",
  "Formati coerenti con vasi e composizioni da esterno.",
  "Migliora l'estetica di terrazzi, balconi e aiuole.",
  "Cura semplice, adatta sia a esperti sia a principianti.",
  "Origine tracciata e packaging a basso impatto ambientale.",
];


const BuyNowColor = "#B4483C";
const BuyNowHoverColor = "#9A3A2F";

const PaymentLogos = () => {
  const base = "inline-flex h-7 items-center justify-center border border-border bg-white px-2.5";
  return (
    <>
      <span className={base} aria-label="Visa">
        <svg viewBox="0 0 64 20" className="h-3.5 w-10" xmlns="http://www.w3.org/2000/svg">
          <text
            x="32"
            y="15"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="16"
            fontWeight="900"
            fontStyle="italic"
            fill="#1A1F71"
            letterSpacing="1"
          >
            VISA
          </text>
        </svg>
      </span>
      <span className={base} aria-label="Mastercard">
        <svg viewBox="0 0 36 22" className="h-4 w-8" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="11" r="9" fill="#EB001B" />
          <circle cx="22" cy="11" r="9" fill="#F79E1B" fillOpacity="0.9" />
          <path
            d="M18 4.4a9 9 0 0 1 0 13.2 9 9 0 0 1 0-13.2Z"
            fill="#FF5F00"
          />
        </svg>
      </span>
      <span className={base} aria-label="American Express">
        <svg viewBox="0 0 64 20" className="h-4 w-10" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="20" fill="#1F72CD" rx="2" />
          <text
            x="32"
            y="14"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="10"
            fontWeight="900"
            fill="#FFFFFF"
            letterSpacing="0.5"
          >
            AMEX
          </text>
        </svg>
      </span>
      <span className={base} aria-label="PayPal">
        <svg viewBox="0 0 80 20" className="h-4 w-14" xmlns="http://www.w3.org/2000/svg">
          <text
            x="4"
            y="15"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="14"
            fontWeight="900"
            fontStyle="italic"
            fill="#003087"
          >
            Pay
          </text>
          <text
            x="40"
            y="15"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="14"
            fontWeight="900"
            fontStyle="italic"
            fill="#009CDE"
          >
            Pal
          </text>
        </svg>
      </span>
      <span className={base} aria-label="Apple Pay">
        <svg viewBox="0 0 60 20" className="h-4 w-12" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11.2 6.3c-.5.6-1.3 1-2.1 1-.1-.8.3-1.6.8-2.1.5-.6 1.3-1 2-1 .1.8-.2 1.5-.7 2.1Zm.7.8c-1.1-.1-2 .6-2.5.6-.5 0-1.3-.6-2.2-.6-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.1.9 6.8.6.8 1.3 1.7 2.2 1.7.9 0 1.2-.5 2.3-.5 1.1 0 1.4.5 2.3.5.9 0 1.5-.8 2.1-1.6.7-1 .9-2 .9-2-1.3-.5-2-1.8-2-3.1 0-1.4 1.2-2.2 1.2-2.2-.7-1-1.7-1.3-2.4-1.3Z"
            fill="#000"
          />
          <text
            x="20"
            y="14"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="11"
            fontWeight="700"
            fill="#000"
          >
            Pay
          </text>
        </svg>
      </span>
      <span className={base} aria-label="Google Pay">
        <svg viewBox="0 0 70 20" className="h-4 w-12" xmlns="http://www.w3.org/2000/svg">
          <text x="2" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#4285F4">G</text>
          <text x="11" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#EA4335">o</text>
          <text x="19" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#FBBC04">o</text>
          <text x="27" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#4285F4">g</text>
          <text x="35" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#34A853">l</text>
          <text x="40" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#EA4335">e</text>
          <text x="49" y="14" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="700" fill="#5F6368">Pay</text>
        </svg>
      </span>
    </>
  );
};

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
  const cartItems = useCartStore((state) => state.items);
  const createCheckout = useCartStore((state) => state.createCheckout);
  const isMobile = useIsMobile();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ShopifyProduct[]>([]);
  const [limitedOfferVisible, setLimitedOfferVisible] = useState(true);

  const { node } = product;
  const images = node.images.edges;
  const hasMultipleImages = images.length > 1;
  const variants = node.variants.edges.map((edge) => edge.node);
  const price = selectedVariant?.price ?? node.priceRange.minVariantPrice;
  const inCartQuantity = selectedVariant ? cartItems.find((item) => item.variantId === selectedVariant.id)?.quantity ?? 0 : 0;

  const resolvedSpecialBullets = parseMultilineMetafield(node.specialBullets, specialBulletsDefault);
  const resolvedKeyFeatures = parseMultilineMetafield(node.keyFeatures, keyFeaturesDefault);
  const resolvedPromoText = node.promoText?.value?.trim() || null;
  const resolvedShortIntro = parseMultilineMetafield(node.shortIntro);
  const resolvedOriginsHabitat = parseMultilineMetafield(node.originsHabitat);
  const resolvedPlantKnowledge = parseMultilineMetafield(node.plantKnowledge);
  const resolvedCareGuide = parseMultilineMetafield(node.careGuide);
  const botanical = parseBotanicalInfo(node);
  const resolvedProductAttributes = parseProductAttributes(node.productAttributes);
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
    const load = async () => {
      const products = await fetchProducts(6);
      setRelatedProducts(products.filter((item) => item.node.handle !== node.handle).slice(0, 4));
    };
    load();
  }, [node.handle]);

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

  const handleBuyNow = async () => {
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
    await createCheckout();
    const state = useCartStore.getState();
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
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

  const stockCount = useMemo(() => {
    if (!selectedVariant?.availableForSale) return 0;
    const seed = (selectedVariant.id || node.handle).length;
    return 6 + (seed % 10);
  }, [selectedVariant?.availableForSale, selectedVariant?.id, node.handle]);
  const stockPercentage = Math.min(100, (stockCount / 20) * 100);

  return (
    <main className="bg-background pb-24 md:pb-0">
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
          <button type="button" onClick={() => navigate("/")} className="hover:text-foreground">
            Tutti i prodotti
          </button>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="truncate text-foreground">{node.title}</span>
        </nav>
      </div>

      <section className="container mx-auto max-w-[1200px] px-4 py-5 md:py-7">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14">
          <div className="space-y-8">
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
                      <img src={img.node.url} alt={img.node.altText || ""} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="lg:order-2">
                <div className="group relative w-full overflow-hidden border border-border/60 bg-muted">
                  <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    className="block aspect-[5/6] w-full"
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

            {resolvedShortIntro.length > 0 && (
              <div className="space-y-3 text-[15px] leading-7 text-foreground/85 md:text-[16px] md:leading-8">
                {resolvedShortIntro.map((paragraph, idx) => (
                  <p key={`short-intro-${idx}`}>{paragraph}</p>
                ))}
              </div>
            )}

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

            {resolvedProductAttributes.length > 0 && (
              <div className="border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg font-semibold text-foreground">Specifiche rapide</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {resolvedProductAttributes.map((attr) => (
                    <div
                      key={`${attr.key}-${attr.value}`}
                      className="border border-border/70 bg-background px-3 py-2.5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {attr.key}
                      </p>
                      <p className="mt-1 text-[14px] font-medium leading-tight text-foreground">
                        {attr.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-border bg-card p-5 md:p-7">
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
            </div>

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

            {seasonalCalendar.length > 0 && (
              <div className="border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg font-semibold text-foreground">Calendario stagionale</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {seasonalCalendar.map((slot) => {
                    const Icon =
                      slot.id === "flowering"
                        ? Flower2
                        : slot.id === "pruning"
                        ? Scissors
                        : slot.id === "planting"
                        ? Shovel
                        : Apple;
                    return (
                      <div
                        key={slot.id}
                        className="flex flex-col gap-2 border border-border/70 bg-background px-3 py-3.5"
                      >
                        <Icon className="h-5 w-5 text-primary-dark" strokeWidth={1.6} />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {slot.label}
                        </p>
                        <p className="text-[14px] font-medium leading-tight text-foreground">
                          {slot.value}
                        </p>
                      </div>
                    );
                  })}
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <PaymentLogos />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Le informazioni di pagamento vengono gestite in modo sicuro. Non conserviamo dati delle carte di credito ne
                abbiamo accesso alle relative informazioni.
              </p>
            </div>
          </div>

          <aside id="product-info" className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Online Garden</p>
            <h1 className="mt-2 text-[2rem] font-heading font-semibold leading-[1.1] text-foreground md:text-[2.25rem]">
              {node.title}
            </h1>
            {botanical.botanicalName && (
              <p className="mt-1.5 text-sm italic text-muted-foreground">{botanical.botanicalName}</p>
            )}

            <p className="mt-2.5 text-[1.6rem] font-heading font-semibold text-foreground">
              €{parseFloat(price.amount).toFixed(2)}
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
                  {stockCount > 0 ? `Disponibile (${stockCount})` : "Non disponibile"}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(8, stockPercentage)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2.5">
              <div className="inline-flex h-11 items-center border border-border bg-background">
                <button
                  type="button"
                  aria-label="Riduci quantita"
                  className="flex h-full items-center px-3 text-foreground"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-8 px-1 text-center text-sm font-semibold text-foreground">{quantity}</span>
                <button
                  type="button"
                  aria-label="Aumenta quantita"
                  className="flex h-full items-center px-3 text-foreground"
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.availableForSale}
                className="h-11 flex-1 border border-foreground bg-background text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aggiungi al carrello
              </button>
            </div>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!selectedVariant?.availableForSale}
              style={{ backgroundColor: BuyNowColor }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = BuyNowHoverColor;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = BuyNowColor;
              }}
              className="mt-2.5 h-11 w-full text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Acquista ora
            </button>

            {inCartQuantity > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Gia nel carrello: {inCartQuantity}</p>
            )}

            {resolvedPromoText && limitedOfferVisible && (
              <div
                className="relative mt-4 border p-4 pr-10"
                style={{ borderColor: "rgba(180,72,60,0.3)", backgroundColor: "rgba(180,72,60,0.06)" }}
              >
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BuyNowColor }} />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Offerta a tempo limitato</p>
                    <p className="mt-1 text-foreground/80">{resolvedPromoText}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Chiudi"
                  onClick={() => setLimitedOfferVisible(false)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground">Categorie correlate</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {relatedProducts.slice(0, 3).map((item) => (
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
          <AccordionItem value="features">
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
          </AccordionItem>
          <AccordionItem value="care">
            <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline md:text-[1.25rem]">
              Cura e utilizzo
            </AccordionTrigger>
            <AccordionContent className="pb-6">{careInfoContent}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="shipping">
            <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline md:text-[1.25rem]">
              Spedizione e resi
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-[15px] leading-7 text-muted-foreground">
              <div className="space-y-3">
                <p>
                  Tutti gli ordini vengono preparati in vivaio con imballaggio protetto. La consegna standard richiede in media{" "}
                  <strong className="font-semibold text-foreground">3-5 giorni lavorativi</strong> in Italia.
                </p>
                <p>
                  Se il prodotto arriva danneggiato o non conforme, contattaci entro{" "}
                  <strong className="font-semibold text-foreground">48 ore</strong> per una sostituzione o il rimborso
                  completo.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
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
        {relatedProducts.length > 0 ? (
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
                    €{parseFloat(item.node.priceRange.minVariantPrice.amount).toFixed(2)}
                  </p>
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
        <div className="fixed inset-x-0 bottom-4 z-50 px-4 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 border border-border/70 bg-background/95 p-3 shadow-elevated">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{node.title}</p>
              <p className="text-sm font-bold text-foreground">€{parseFloat(price.amount).toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant?.availableForSale}
              className="h-10 bg-primary px-5 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-50"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {zoomOpen && images[selectedImage] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden border border-border bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute right-4 top-4 z-10 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-soft"
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
