import { useProductStructuredData } from "@/hooks/useProductStructuredData";
import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";
import { useNavigate, useParams } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useProduct } from "@/hooks/useProduct";
import { Pdp } from "@/components/storefront/Pdp";
import { ProductCareInfo } from "@/components/product/ProductCareInfo";
import { SiteHeader } from "@/components/storefront/SiteHeader";

const ProductLoadingState = () => (
  <main id="main-content" tabIndex={-1} className="flex items-center justify-center min-h-[60vh]" role="status">
    <span className="sr-only">Caricamento prodotto</span>
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </main>
);

interface ProductNotFoundStateProps {
  onBackHome: () => void;
}

const ProductNotFoundState = ({ onBackHome }: ProductNotFoundStateProps) => (
  <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-20 text-center">
    <h1 className="text-2xl font-bold mb-4">Prodotto non trovato</h1>
    <Button onClick={onBackHome}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Torna alla Home
    </Button>
  </main>
);

const ProductDetail = () => {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const { product, loading, error, retry, selectedVariant, setSelectedVariant } = useProduct(handle);
  useProductStructuredData(!loading && !error && product?.node.handle === handle ? {
    title: product.node.title,
    description: product.node.description,
    handle: product.node.handle,
    images: product.node.images,
  } : null);
  const fallbackTitle = error ? 'Prodotto non disponibile' : loading ? 'Caricamento prodotto' : 'Prodotto non trovato';
  useStorefrontSeo({
    title: `${product?.node.seo?.title || product?.node.title || fallbackTitle} | Online Garden`,
    description: product?.node.seo?.description || product?.node.description,
    path: `/products/${encodeURIComponent(handle ?? '')}`,
    image: product?.node.images.edges[0]?.node.url,
    type: product ? 'product' : 'website',
    noindex: !product || !!error,
  });
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

  if (error) {
    return <>
      <SiteHeader variant="page" />
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Impossibile caricare il prodotto</h1>
        <p role="alert" className="my-4 text-muted-foreground">Controlla la connessione e riprova.</p>
        <Button onClick={retry}>Riprova</Button>
      </main>
      <Footer />
    </>;
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
        key={product.node.id}
        product={product}
        selectedVariant={selectedVariant}
        setSelectedVariant={setSelectedVariant}
        careInfoContent={
          <ProductCareInfo
            config={
              product.node.careInfo?.value
                ? {
                    paragraphs: product.node.careInfo.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }
                : undefined
            }
          />
        }
      />
      <Footer />
    </>
  );
};

export default ProductDetail;
