import { useNavigate, useParams } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useProduct } from "@/hooks/useProduct";
import { Pdp } from "@/components/storefront/Pdp";
import { ProductCareInfo } from "@/components/product/ProductCareInfo";
import { SiteHeader } from "@/components/storefront/SiteHeader";

const ProductLoadingState = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

interface ProductNotFoundStateProps {
  onBackHome: () => void;
}

const ProductNotFoundState = ({ onBackHome }: ProductNotFoundStateProps) => (
  <div className="container mx-auto px-4 py-20 text-center">
    <h1 className="text-2xl font-bold mb-4">Prodotto non trovato</h1>
    <Button onClick={onBackHome}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Torna alla Home
    </Button>
  </div>
);

const ProductDetail = () => {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const { product, loading, selectedVariant, setSelectedVariant } = useProduct(handle);
  const goToHomepage = () => navigate("/");

  if (loading) {
    return (
      <>
        <SiteHeader variant="page" />
        <ProductLoadingState />
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <SiteHeader variant="page" />
        <ProductNotFoundState onBackHome={goToHomepage} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="page" />
      <Pdp
        product={product}
        selectedVariant={selectedVariant}
        setSelectedVariant={setSelectedVariant}
        careInfoContent={<ProductCareInfo />}
      />
      <Footer />
    </>
  );
};

export default ProductDetail;
