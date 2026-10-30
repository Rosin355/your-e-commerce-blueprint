import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";
import { Footer } from "@/components/Footer";
import { HomepageV3 } from "@/components/storefront/HomepageV3";

const Index = () => {
  useStorefrontSeo({
    title: 'Online Garden — Piante online',
    description: 'Esplora il catalogo di piante Online Garden e consulta le schede dei prodotti.',
    path: '/',
  });
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main id="main-content" tabIndex={-1} className="flex-1">
        <HomepageV3 />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
