import { PaymentInformation } from "./storefront/PaymentInformation";
import { FOOTER_CATEGORIES, collectionHref } from "@/config/categories";

export const Footer = () => {
  const categories = FOOTER_CATEGORIES;
  const links = {
    explore: ["Chi siamo", "Ispirazioni", "FAQ", "Assistenza clienti"],
    legal: ["Privacy Policy", "Resi e rimborsi", "Termini di servizio"],
  };



  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div>
          <h2 className="w-full font-['Playfair_Display'] text-[clamp(3.2rem,12vw,10.4rem)] font-semibold leading-[0.88] tracking-[-0.045em] text-primary">
            Online Garden
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Piante da esterno, rose, bulbi stagionali e accessori pensati per dare carattere a giardini, terrazzi e balconi.
          </p>
        </div>

        <div className="mt-10 grid gap-8 border-t border-border/65 pt-8 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Catalogo</h3>
            <ul className="mt-4 space-y-2.5">
              {categories.map((item) => (
                <li key={item.handle}>
                  <a href={collectionHref(item.handle)} className="text-sm text-foreground/90 transition-colors hover:text-primary">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Esplora</h3>
            <ul className="mt-4 space-y-2.5">
              {links.explore.map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground">{item} <span className="text-xs">(in preparazione)</span></span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Informazioni</h3>
            <ul className="mt-4 space-y-2.5">
              {links.legal.map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground">{item} <span className="text-xs">(in preparazione)</span></span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Seguici</h3>
            <p className="mt-4 text-sm text-muted-foreground">Canali social in preparazione.</p>
            <a href="mailto:info@onlinegarden.it" className="mt-3 inline-flex min-h-11 items-center text-sm underline">Scrivici</a>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Newsletter stagionale</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Le iscrizioni alla newsletter non sono ancora disponibili.</p>
            <a href="mailto:info@onlinegarden.it" className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Contatta il vivaio</a>
          </div>
        </div>

        <div className="mt-8 border-t border-border/65 pt-5">
          <div className="flex flex-col items-start justify-between gap-4 text-xs text-muted-foreground md:flex-row md:items-center">
            <p>© 2026 Online Garden. Vivaio online per esterni, terrazzi e giardini.</p>
            <PaymentInformation />
          </div>
        </div>
      </div>
    </footer>
  );
};
