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
    <Card className={`og-product-card group min-w-0 overflow-hidden rounded-[var(--og-radius-card)] border border-border bg-card ${dark ? "bg-card/90" : ""}`}>
      <Link to={`/products/${node.handle}`} aria-label={`Vedi ${node.title}`} className="relative block aspect-[4/4.7] overflow-hidden bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-4px]">
        {image ? <img src={image.url} alt={image.altText || node.title} className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]" loading="lazy" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nessuna immagine</div>}
        {!inStock && <Badge variant="secondary" className="absolute left-2 top-2 rounded-full border border-border bg-background px-2 py-1 text-[10px] text-foreground">Esaurito</Badge>}
      </Link>
      <div className="space-y-3 p-3 md:p-4">
        <h3 className="line-clamp-2 break-words font-heading text-base font-semibold leading-6 text-foreground md:text-lg"><Link to={`/products/${node.handle}`}>{node.title}</Link></h3>
        {shortDescription && <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{shortDescription}</p>}
        {firstVariant?.selectedOptions?.[0]?.value && <p className="text-xs text-muted-foreground">{hasMultipleVariants ? "Più formati" : firstVariant.selectedOptions[0].value}</p>}
        <p className="text-lg font-semibold text-primary-dark">{formatProductPrice(node.priceRange)}</p>
        <Button onClick={handleAddToCart} disabled={!inStock || isCheckingOut} size="sm" className="min-h-11 w-full gap-1.5 rounded-lg px-2 text-[11px] font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />{hasMultipleVariants ? "Scegli formato" : "Aggiungi"}
        </Button>
        <Link to={`/products/${node.handle}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary-dark underline underline-offset-4">Vedi dettagli <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </Card>
  );
};
