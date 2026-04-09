import { useEffect, useState } from "react";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";
import { Loader2 } from "lucide-react";

export const ProductsSection = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("TUTTE");

  const filters = [
    "TUTTE",
    "PIANTE DA INTERNO",
    "PIANTE DA ESTERNO",
    "AROMATICHE",
    "DA FRUTTO"
  ];

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedProducts = await fetchProducts(20);
        setProducts(fetchedProducts);
      } catch (err) {
        setError((err as Error).message || "Errore nel caricamento dei prodotti");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl">🪴</span>
            <h2 className="text-3xl md:text-section font-heading font-bold text-primary">
              Le Piante più vendute
            </h2>
          </div>
          <p className="text-muted-foreground text-lg">
            Tutti le vogliono… vedi anche la tua preferita?
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12 pb-4 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                px-4 py-2 text-sm font-semibold uppercase whitespace-nowrap
                transition-all duration-300
                ${activeFilter === filter 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-primary'
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.node.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">
              Nessun prodotto trovato
            </p>
            <p className="text-muted-foreground">
              Crea un prodotto dicendomi cosa vuoi vendere e il prezzo!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
