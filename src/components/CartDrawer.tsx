import { Link } from "react-router-dom";
import { PaymentInformation } from "./storefront/PaymentInformation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

export const CartDrawer = () => {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { 
    items, 
    isLoading, 
    updateQuantity, 
    removeItem, 
    createCheckout 
  } = useCartStore();
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);

  const handleCheckout = async () => {
    if (items.length === 0 || useCartStore.getState().isLoading) return;
    setCheckoutError(null);
    try {
      // Use the URL returned directly from createCheckout — never read a possibly stale
      // value from the store after the call.
      const checkoutUrl = await createCheckout();
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        setIsOpen(false);
      } else {
        toast.error("Errore durante il checkout");
      }
    } catch (error) {
      console.error('Checkout fallito:', error);
      setCheckoutError("Impossibile avviare il checkout. Il carrello è stato conservato: riprova o contatta l’assistenza.");
      toast.error("Errore durante il checkout. Riprova.");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (open) toast.dismiss("cart-added"); setIsOpen(open); }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-2 hover:text-primary" aria-label={`Carrello, ${totalItems} articoli`}>
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary">
              {totalItems}
            </Badge>
          )}
          <span className="hidden md:inline">Carrello</span>
          <span className="font-semibold">€{totalPrice.toFixed(2)}</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Carrello</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Il tuo carrello è vuoto" : `${totalItems} articol${totalItems !== 1 ? 'i' : 'o'} nel carrello`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Il tuo carrello è vuoto</p>
                <Button asChild className="mt-5"><Link to="/collections/all" onClick={() => setIsOpen(false)}>Esplora il catalogo</Link></Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-3 border rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={item.product.node.images.edges[0].node.url}
                            alt={item.product.node.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${item.product.node.handle}`} onClick={() => setIsOpen(false)} className="line-clamp-2 text-sm font-medium hover:underline">{item.product.node.title}</Link>
                        {item.selectedOptions.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.selectedOptions.map(option => option.value).join(' • ')}
                          </p>
                        )}
                        <p className="font-semibold text-primary mt-1">
                          €{parseFloat(item.price.amount).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="col-span-2 flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-destructive hover:text-destructive"
                          aria-label={`Rimuovi ${item.product.node.title}`}
                          disabled={isLoading}
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11"
                            aria-label={`Riduci quantità di ${item.product.node.title}`}
                            disabled={isLoading || item.quantity <= 1}
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11"
                            aria-label={`Aumenta quantità di ${item.product.node.title}`}
                            disabled={isLoading}
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex-shrink-0 space-y-4 pt-4 border-t bg-background">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Subtotale</span>
                  <span className="text-xl font-bold text-primary">
                    €{totalPrice.toFixed(2)}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground">Spedizione ed eventuali aggiornamenti di prezzo e disponibilità saranno verificati al checkout.</p>
                <PaymentInformation />
                {checkoutError && <p role="alert" className="text-sm text-destructive">{checkoutError}</p>}
                <Button 
                  onClick={handleCheckout}
                  className="w-full" 
                  size="lg"
                  disabled={items.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creazione checkout...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Procedi al Checkout
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
