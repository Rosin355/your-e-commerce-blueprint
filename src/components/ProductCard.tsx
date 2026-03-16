import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
  const price = node.priceRange.minVariantPrice;
  const firstVariant = node.variants.edges[0]?.node;
  const shortDescription = node.description?.trim();

  const surfaceClass = dark
    ? "border-primary-foreground/10 bg-card/90 shadow-elevated"
    : "border-border bg-gradient-card shadow-soft";
  const badgeClass = dark
    ? "border-primary-foreground/10 bg-background/80 text-foreground"
    : "border-border bg-card/90 text-foreground";
  const metaChipClass = dark
    ? "bg-background/75 text-foreground"
    : "bg-muted text-foreground";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!firstVariant) {
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
      position: "top-center",
    });
  };

  const handleCardClick = () => {
    navigate(`/products/${node.handle}`);
  };

  return (
    <Card
      className={`group cursor-pointer overflow-hidden rounded-[1.75rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated ${surfaceClass}`}
      onClick={handleCardClick}
    >
      <div className="relative aspect-[4/4.8] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || node.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            Nessuna immagine
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Badge variant="secondary" className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] backdrop-blur ${badgeClass}`}>
            Selezione verde
          </Badge>
          {!firstVariant?.availableForSale && (
            <Badge variant="secondary" className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] backdrop-blur ${badgeClass}`}>
              Esaurito
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5 md:p-6">
        <div className="space-y-2">
          <h3 className="line-clamp-2 font-heading text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
            {node.title}
          </h3>
          {shortDescription && (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {shortDescription}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${metaChipClass}`}>
            {firstVariant?.availableForSale ? "Disponibile" : "Da verificare"}
          </span>
          {firstVariant?.selectedOptions?.[0]?.value && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground ${dark ? "bg-background/75" : "bg-muted"}`}>
              {firstVariant.selectedOptions[0].value}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-border/70 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prezzo da</p>
            <span className="text-2xl font-bold text-primary">€{parseFloat(price.amount).toFixed(2)}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={!firstVariant?.availableForSale}
            size="sm"
            className="rounded-full px-4 uppercase font-semibold text-xs tracking-[0.16em]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aggiungi
          </Button>
        </div>

        <button
          type="button"
          onClick={handleCardClick}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Scopri il prodotto <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
};
