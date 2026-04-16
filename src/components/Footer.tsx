import { Facebook, Instagram, MessageCircle } from "lucide-react";

export const Footer = () => {
  const categories = ["Piante da esterno", "Rose", "Piante da frutto"];
  const links = {
    explore: ["Chi siamo", "Ispirazioni", "FAQ", "Assistenza clienti"],
    legal: ["Privacy Policy", "Resi e rimborsi", "Termini di servizio"],
  };

  const paymentMethods = ["Visa", "Mastercard", "Amex", "PayPal", "Diners", "Discover"];

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
                <li key={item}>
                  <a href="/collections/all" className="text-sm text-foreground/90 transition-colors hover:text-primary">
                    {item}
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
                  <a href="#" className="text-sm text-foreground/90 transition-colors hover:text-primary">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Informazioni</h3>
            <ul className="mt-4 space-y-2.5">
              {links.legal.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-foreground/90 transition-colors hover:text-primary">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Seguici</h3>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 text-foreground/85 hover:border-primary hover:text-primary">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 text-foreground/85 hover:border-primary hover:text-primary">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 text-foreground/85 hover:border-primary hover:text-primary">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Newsletter stagionale</h3>
            <div className="mt-4 border-b border-border/80 pb-2">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="email"
                  placeholder="Inserisci la tua email"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <span className="text-lg text-primary">→</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Iscriviti per ricevere novita dal vivaio, idee per terrazzi e giardini e selezioni dedicate alla stagione.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border/65 pt-5">
          <div className="flex flex-col items-start justify-between gap-4 text-xs text-muted-foreground md:flex-row md:items-center">
            <p>© 2026 Online Garden. Vivaio online per esterni, terrazzi e giardini.</p>
            <div className="flex flex-wrap items-center gap-2">
              {paymentMethods.map((method) => (
                <span key={method} className="rounded border border-border/70 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-foreground/70">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
