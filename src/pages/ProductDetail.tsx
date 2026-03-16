import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storefrontApiRequest, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShoppingCart, Droplet, Sun, Ruler, Leaf, Heart, Shield, TrendingUp } from "lucide-react";
import { isPdpRefreshV2Enabled, isPdpVisualUpgradeV3Enabled } from "@/lib/storefront-flags";
import { PdpV2 } from "@/components/storefront/PdpV2";
import { PdpV3 } from "@/components/storefront/PdpV3";

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      description
      handle
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      if (!handle) return;
      
      setLoading(true);
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
        if (data?.data?.productByHandle) {
          setProduct({ node: data.data.productByHandle });
        }
      } catch (error) {
        console.error('Errore caricamento prodotto:', error);
        toast.error("Errore nel caricamento del prodotto");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [handle]);

  const handleAddToCart = () => {
    if (!product) return;
    
    const firstVariant = product.node.variants.edges[0]?.node;
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

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Prodotto non trovato</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Home
          </Button>
        </div>
        <Footer />
      </>
    );
  }

  if (isPdpVisualUpgradeV3Enabled) {
    return (
      <>
        <Header />
        <PdpV3 product={product} />
        <Footer />
      </>
    );
  }

  if (isPdpRefreshV2Enabled) {
    return (
      <>
        <Header />
        <PdpV2 product={product} />
        <Footer />
      </>
    );
  }

  const { node } = product;
  const images = node.images.edges;
  const price = node.priceRange.minVariantPrice;
  const firstVariant = node.variants.edges[0]?.node;

  return (
    <>
      <Header />
      <main className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai prodotti
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
            {/* Images */}
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
                {images[selectedImage] ? (
                  <img
                    src={images[selectedImage].node.url}
                    alt={images[selectedImage].node.altText || node.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    🪴
                  </div>
                )}
              </div>
              
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                        selectedImage === idx ? 'border-primary' : 'border-border'
                      }`}
                    >
                      <img
                        src={img.node.url}
                        alt={img.node.altText || `${node.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                    Pianta da Interno
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
                  {node.title}
                </h1>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-4xl font-bold text-primary">
                    €{parseFloat(price.amount).toFixed(2)}
                  </div>
                  {!firstVariant?.availableForSale && (
                    <Badge variant="secondary" className="text-sm">
                      Esaurito
                    </Badge>
                  )}
                </div>
              </div>

              {node.description && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {node.description}
                  </p>
                </div>
              )}

              {/* Quick Features */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center bg-muted/50 border-border">
                  <Sun className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">Luce Media</p>
                  <p className="text-xs text-muted-foreground">Indiretta</p>
                </Card>
                <Card className="p-4 text-center bg-muted/50 border-border">
                  <Droplet className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">Acqua</p>
                  <p className="text-xs text-muted-foreground">Moderata</p>
                </Card>
                <Card className="p-4 text-center bg-muted/50 border-border">
                  <Ruler className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">Altezza</p>
                  <p className="text-xs text-muted-foreground">30-40cm</p>
                </Card>
              </div>

              <div className="pt-6 space-y-4">
                <Button 
                  onClick={handleAddToCart}
                  disabled={!firstVariant?.availableForSale}
                  size="lg"
                  className="w-full uppercase font-semibold text-base h-14"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Aggiungi al Carrello
                </Button>
              </div>

              <Card className="p-4 bg-muted/30 border-border">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Garanzia fino alla consegna</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Spedizione gratuita oltre €50</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Resi entro 14 giorni</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Detailed Information Tabs */}
          <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="care" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="care" className="text-sm md:text-base">
                  <Leaf className="h-4 w-4 mr-2" />
                  Cura della Pianta
                </TabsTrigger>
                <TabsTrigger value="characteristics" className="text-sm md:text-base">
                  <Sun className="h-4 w-4 mr-2" />
                  Caratteristiche
                </TabsTrigger>
                <TabsTrigger value="benefits" className="text-sm md:text-base">
                  <Heart className="h-4 w-4 mr-2" />
                  Benefici
                </TabsTrigger>
              </TabsList>

              <TabsContent value="care" className="space-y-6">
                <Card className="p-6 border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <Droplet className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold text-foreground">Annaffiatura</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Innaffia quando il terreno è asciutto al tatto, circa 1-2 volte a settimana. 
                    Evita i ristagni d'acqua per prevenire marciume radicale. In inverno riduci le annaffiature.
                  </p>
                </Card>

                <Card className="p-6 border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <Sun className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold text-foreground">Luce</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Preferisce luce indiretta luminosa. Evita l'esposizione diretta al sole che potrebbe bruciare le foglie. 
                    Posiziona vicino a una finestra con tenda leggera.
                  </p>
                </Card>

                <Card className="p-6 border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <Leaf className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-heading font-bold text-foreground">Concimazione</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Concima ogni 2-3 settimane durante la stagione di crescita (primavera-estate) con un fertilizzante liquido per piante verdi. 
                    In autunno e inverno sospendi la concimazione.
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="characteristics" className="space-y-6">
                <Card className="p-6 border-border">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-4">Specifiche Tecniche</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Nome Botanico</span>
                        <span className="font-semibold text-foreground">{node.title}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Famiglia</span>
                        <span className="font-semibold text-foreground">Araceae</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Origine</span>
                        <span className="font-semibold text-foreground">Tropicale</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Altezza</span>
                        <span className="font-semibold text-foreground">30-40 cm</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Temperatura</span>
                        <span className="font-semibold text-foreground">18-24°C</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Umidità</span>
                        <span className="font-semibold text-foreground">Media-Alta</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-primary/5">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-4">Cosa Include</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-primary text-lg">✓</span>
                      <span className="text-muted-foreground">Pianta sana e rigogliosa</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary text-lg">✓</span>
                      <span className="text-muted-foreground">Vaso decorativo in ceramica</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary text-lg">✓</span>
                      <span className="text-muted-foreground">Sottovaso abbinato</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary text-lg">✓</span>
                      <span className="text-muted-foreground">Guida alla cura personalizzata</span>
                    </li>
                  </ul>
                </Card>
              </TabsContent>

              <TabsContent value="benefits" className="space-y-6">
                <Card className="p-6 border-border">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-4">Perché Scegliere Questa Pianta</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Purifica l'Aria</h4>
                        <p className="text-muted-foreground text-sm">
                          Rimuove le tossine dall'aria creando un ambiente più sano e respirabile in casa tua.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Heart className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Riduce lo Stress</h4>
                        <p className="text-muted-foreground text-sm">
                          La presenza di piante in casa ha dimostrato di ridurre lo stress e migliorare l'umore.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sun className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Facile da Curare</h4>
                        <p className="text-muted-foreground text-sm">
                          Ideale anche per principianti, richiede poche cure e si adatta facilmente agli ambienti domestici.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Aumenta la Produttività</h4>
                        <p className="text-muted-foreground text-sm">
                          Le piante migliorano la concentrazione e la produttività, perfette per l'home office.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-border bg-primary/5">
                  <h3 className="text-xl font-heading font-bold text-foreground mb-3">
                    💚 Perfetta Per
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="px-3 py-1">Camera da Letto</Badge>
                    <Badge variant="secondary" className="px-3 py-1">Soggiorno</Badge>
                    <Badge variant="secondary" className="px-3 py-1">Ufficio</Badge>
                    <Badge variant="secondary" className="px-3 py-1">Bagno</Badge>
                    <Badge variant="secondary" className="px-3 py-1">Cucina</Badge>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetail;
