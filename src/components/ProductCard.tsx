import { formatProductPrice } from "@/lib/storefront-money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface ProductCardProps {
  product: ShopifyProduct;
  dark?: boolean;
}

export const ProductCard = ({ product, dark = false }: ProductCardProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const navigate = useNavigate();

  const { node } = product;
  const image = node.images.edges[0]?.node;
  const firstVariant = node.variants.edges.find(({ node }) => node.availableForSale)?.node ?? node.variants.edges[0]?.node;
  const hasMultipleVariants = node.variants.edges.length > 1 || node.options.some(option => option.values.length > 1);
  const inStock = node.availableForSale ?? !!firstVariant?.availableForSale;
  const isCheckingOut = useCartStore(state => state.isLoading);
  const shortDescription = node.description?.trim();

  const surfaceClass = dark
    ? "border-primary-foreground/14 bg-card/88"
    : "border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(247,244,237,0.88)_100%)]";
  const badgeClass = dark
    ? "border-primary-foreground/14 bg-background/70 text-foreground"
    : "border-border/70 bg-background/78 text-foreground";
  const metaChipClass = dark
    ? "bg-background/75 text-foreground"
    : "bg-muted/75 text-foreground";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (useCartStore.getState().isLoading) return;
    if (hasMultipleVariants) { navigate(`/products/${node.handle}`); return; }
    if (!firstVariant?.availableForSale) {
      toast.error("Prodotto non disponibile");
      return;
    }

    const cartItem = {
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || [],
    };

    addItem(cartItem);
    toast.success("Prodotto aggiunto al carrello!", {
      position: "top-center", id: "cart-added",
    });
  };

  return (
    <Card
      className={`group cursor-pointer overflow-hidden rounded-none border transition-all duration-500 hover:-translate-y-1 hover:shadow-soft ${surfaceClass}`}
    >
      <Link to={`/products/${node.handle}`} aria-label={`Vedi ${node.title}`} className="relative block aspect-[4/4.7] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || node.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Nessuna immagine
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Badge variant="secondary" className={`rounded-none border px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] backdrop-blur ${badgeClass}`}>
            Selezione outdoor
          </Badge>
          {!inStock && (
            <Badge variant="secondary" className={`rounded-none border px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] backdrop-blur ${badgeClass}`}>
              Esaurito
            </Badge>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f4efe6]/88 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      </Link>

      <div className="space-y-3.5 p-4 md:p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 font-heading text-[1.2rem] font-semibold leading-[1.2] text-foreground transition-colors group-hover:text-primary-dark">
            <Link to={`/products/${node.handle}`}>{node.title}</Link>
          </h3>
          {shortDescription && (
            <p className="line-clamp-2 text-[13px] leading-6 text-muted-foreground/90">
              {shortDescription}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-none px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] ${metaChipClass}`}>
            {inStock ? "Disponibile ora" : "Da verificare"}
          </span>
          {firstVariant?.selectedOptions?.[0]?.value && (
            <span className={`inline-flex items-center rounded-none px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground ${dark ? "bg-background/75" : "bg-muted/75"}`}>
              {firstVariant.selectedOptions[0].value}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/65 pt-3.5">
          <div>
            <span className="text-[1.45rem] font-semibold leading-none text-primary-dark">{formatProductPrice(node.priceRange)}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={!inStock || isCheckingOut}
            size="sm"
            className="min-h-11 rounded-none px-3.5 text-[10px] uppercase font-semibold tracking-[0.16em]"
          >
            <CheckCircle2 className="h-4 w-4" />
            {hasMultipleVariants ? "Scegli formato" : "Aggiungi"}
          </Button>
        </div>

        <Link
          to={`/products/${node.handle}`}
              className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-dark transition-colors hover:text-primary"
        >
          Vedi dettagli <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </Card>
  );
};
