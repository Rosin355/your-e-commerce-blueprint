import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProductsSection } from "@/components/ProductsSection";
import { ContentSection } from "@/components/ContentSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import { HomepageV2 } from "@/components/storefront/HomepageV2";
import { isHomepageRefreshV2Enabled } from "@/lib/storefront-flags";

const Index = () => {
  if (isHomepageRefreshV2Enabled) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <HomepageV2 />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <ProductsSection />
        <ContentSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
