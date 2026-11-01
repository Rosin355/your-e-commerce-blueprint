import { PaymentInformation } from "./storefront/PaymentInformation";
import { FOOTER_CATEGORIES, collectionHref } from "@/config/categories";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF, CONTACT_PATH, PUBLIC_LEGAL_LINKS } from "@/config/legal";
import { Link } from "react-router-dom";

export const Footer = () => {
  const categories = FOOTER_CATEGORIES;

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

        <div className="mt-10 grid gap-8 border-t border-border/65 pt-8 md:grid-cols-2 lg:grid-cols-3">
          <nav aria-labelledby="footer-catalog-heading">
            <h3 id="footer-catalog-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Catalogo</h3>
            <ul className="mt-4 space-y-2.5">
              {categories.map((item) => (
                <li key={item.handle}>
                  <Link to={collectionHref(item.handle)} className="inline-flex min-h-6 items-center text-sm text-foreground/90 transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-info-heading">
            <h3 id="footer-info-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Informazioni</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to={CONTACT_PATH} className="inline-flex min-h-6 items-center text-sm text-foreground/90 transition-colors hover:text-primary">
                  Contatti e assistenza
                </Link>
              </li>
              <li>
                <a href={CONTACT_EMAIL_HREF} className="inline-flex min-h-6 items-center break-all text-sm text-foreground/90 underline underline-offset-4 transition-colors hover:text-primary">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal-heading">
            <h3 id="footer-legal-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Legale</h3>
            <ul className="mt-4 space-y-2.5">
              {PUBLIC_LEGAL_LINKS.map((policy) => (
                <li key={policy.path}>
                  <a href={policy.href} className="inline-flex min-h-6 items-center text-sm text-foreground/90 transition-colors hover:text-primary">
                    {policy.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
