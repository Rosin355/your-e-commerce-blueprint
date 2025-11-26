import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const navigate = useNavigate();
  
  const { node } = product;
  const image = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;
  const firstVariant = node.variants.edges[0]?.node;

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
      selectedOptions: firstVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Prodotto aggiunto al carrello!", {
      position: "top-center"
    });
  };

  const handleCardClick = () => {
    navigate(`/products/${node.handle}`);
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-border hover:shadow-card-hover transition-all duration-300 bg-card"
      onClick={handleCardClick}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || node.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Nessuna immagine
          </div>
        )}
        {!firstVariant?.availableForSale && (
          <Badge variant="secondary" className="absolute top-3 right-3">
            Esaurito
          </Badge>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-card-title group-hover:text-primary transition-colors line-clamp-2">
          {node.title}
        </h3>
        
        {node.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {node.description}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-primary">
            €{parseFloat(price.amount).toFixed(2)}
          </span>
          
          <Button 
            onClick={handleAddToCart}
            disabled={!firstVariant?.availableForSale}
            size="sm"
            className="uppercase font-semibold text-xs"
          >
            Aggiungi
          </Button>
        </div>
      </div>
    </Card>
  );
};
