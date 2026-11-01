import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF, CONTACT_PATH } from "@/config/legal";
import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";

const Contacts = () => {
  const mainRef = useRef<HTMLElement>(null);

  useStorefrontSeo({
    title: "Contatti e assistenza | Online Garden",
    description: "Contatta Online Garden per informazioni sui prodotti e assistenza sugli ordini: info@onlinegarden.it.",
    path: CONTACT_PATH,
  });

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="page" />
      <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-1 py-10 outline-none md:py-14">
        <div className="container mx-auto max-w-[1280px] px-4">
          <nav aria-label="Percorso pagina" className="text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-4 hover:text-foreground">Home</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span aria-current="page">Contatti</span>
          </nav>
          <h1 className="mt-8 font-heading text-[2.5rem] font-semibold leading-[1.05] text-foreground md:text-[3rem]">
            Contatti e assistenza
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Per informazioni sui prodotti o assistenza su un ordine, scrivi a Online Garden.
          </p>
          <a href={CONTACT_EMAIL_HREF} className="mt-5 inline-flex min-h-11 items-center break-all text-base text-primary underline underline-offset-4 hover:text-primary-dark">
            {CONTACT_EMAIL}
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contacts;
