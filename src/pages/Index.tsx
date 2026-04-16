import { Footer } from "@/components/Footer";
import { HomepageV3 } from "@/components/storefront/HomepageV3";

const Index = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <main className="flex-1">
      <HomepageV3 />
    </main>
    <Footer />
  </div>
);

export default Index;
