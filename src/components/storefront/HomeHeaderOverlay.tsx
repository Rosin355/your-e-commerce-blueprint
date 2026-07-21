import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Leaf, Mail, Menu, Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AccountButton } from "@/components/AccountButton";
import { CartDrawer } from "@/components/CartDrawer";
import logoOnlineGardenAsset from "@/assets/logo-online-garden-v2.png.asset.json";
const logoOnlineGarden = logoOnlineGardenAsset.url;
import { CATEGORIES, collectionHref } from "@/config/categories";
import { CATEGORY_IMAGES } from "@/config/categoryImages";

interface NavLink {
  label: string;
  href: string;
  image?: string;
}

interface PreviewCard {
  title: string;
  description: string;
  tone: string;
  href: string;
  image?: string;
}

interface NavItem {
  label: string;
  isComingSoon?: boolean;
  title: string;
  description: string;
  catalogHref: string;
  links: NavLink[];
  previewCards: PreviewCard[];
}

const DEFAULT_TONES = [
  "from-[#e8dfcf] via-[#d7c9b3] to-[#c7b08a]",
  "from-[#6b7f51] via-[#495a39] to-[#2e3a27]",
];

const navigationItems: NavItem[] = CATEGORIES.map((cat) => ({
  label: cat.label,
  isComingSoon: cat.toCreate,
  title: cat.label,
  description: cat.description,
  catalogHref: collectionHref(cat.handle),
  links: cat.links.map((link) => ({
    label: link.label,
    href: collectionHref(link.handle),
    image: link.image ? CATEGORY_IMAGES[link.image] : undefined,
  })),
  previewCards: (cat.previewCards ?? []).map((card, idx) => ({
    title: card.title,
    description: card.description,
    tone: DEFAULT_TONES[idx % DEFAULT_TONES.length],
    href: card.href,
    image: CATEGORY_IMAGES[card.imageKey],
  })),
}));

/**
 * Etichetta nav con slide verticale all'hover: due copie del testo sovrapposte;
 * all'hover/focus la copia base scorre su e la copia accent subentra dal basso.
 * L'altezza del contenitore è quella naturale del testo (una o due righe), quindi
 * nessun layout shift e lo slide funziona anche con etichette su due righe.
 * Con prefers-reduced-motion lo slide è disattivato: resta cambio colore + underline.
 */
const AnimatedNavLabel = ({ label }: { label: string }) => {
  const motionClass =
    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
  return (
    <span className="relative block overflow-hidden text-left leading-[1.25]">
      <span
        className={`block ${motionClass} group-hover:-translate-y-[110%] group-focus-visible:-translate-y-[110%] motion-reduce:group-hover:translate-y-0 motion-reduce:group-focus-visible:translate-y-0`}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`absolute inset-0 block translate-y-[110%] text-primary ${motionClass} group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:group-hover:translate-y-[110%] motion-reduce:group-focus-visible:translate-y-[110%]`}
      >
        {label}
      </span>
    </span>
  );
};

const BrandMark = ({ compact = false }: { compact?: boolean }) => {
  // compact: sotto `sm` il wordmark si riduce e l'emblema sparisce, così su 390px
  // logo + hamburger + search/account/carrello stanno su una riga senza tagli.
  const wordClass = compact
    ? "text-[0.95rem] tracking-[0.08em] sm:text-[1.1rem] sm:tracking-[0.12em]"
    : "text-[1.6rem] tracking-[0.12em]";
  return (
    <span className={`inline-flex items-center whitespace-nowrap ${compact ? "gap-1.5 sm:gap-2" : "gap-2"}`}>
      <span className={`${wordClass} font-['Playfair_Display'] font-semibold leading-none text-primary-dark`}>
        ONLINE
      </span>
      <img
        src={logoOnlineGarden}
        alt="Online Garden logo"
        className={`${compact ? "hidden h-10 w-10 sm:block sm:h-11 sm:w-11" : "h-14 w-14"} shrink-0 object-contain`}
        loading="eager"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <span className={`${wordClass} font-['Playfair_Display'] font-semibold leading-none text-primary-dark`}>
        GARDEN
      </span>
    </span>
  );
};

export type HomeHeaderOverlayVariant = "hero" | "page";
export const HomeHeaderOverlay = ({ variant = "hero" }: { variant?: HomeHeaderOverlayVariant }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeItem, setActiveItem] = useState<NavItem | null>(null);

  return (
    <header
      className={[
        // top-9 = altezza della HomeAnnouncementBar (h-9): l'header parte flush sotto la fascia promo
        variant === "hero" ? "absolute inset-x-0 top-9 z-40" : "sticky inset-x-0 top-9 z-40",
        // Sfondo solido crema, testo verde scuro — leggibile su qualsiasi immagine hero
        "bg-[hsl(var(--cream))]/97 backdrop-blur-md border-b border-border/70 shadow-soft text-foreground",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <div
          className="hidden py-3 xl:block"
          onMouseLeave={() => setActiveItem(null)}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <nav className="flex items-center gap-4 2xl:gap-6" aria-label="Categorie principali">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onMouseEnter={() => !item.isComingSoon && setActiveItem(item)}
                  onFocus={() => !item.isComingSoon && setActiveItem(item)}
                  className={`group relative inline-flex min-h-[44px] items-center gap-2 rounded-md px-2 py-1 text-left text-[15px] font-semibold leading-[1.25] tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 after:absolute after:inset-x-2 after:bottom-0.5 after:h-[2px] after:rounded-full after:bg-primary after:transition-transform after:duration-300 motion-reduce:after:transition-none ${
                    item.isComingSoon
                      ? "cursor-default text-muted-foreground after:hidden"
                      : activeItem?.label === item.label
                      ? "text-primary-dark after:scale-x-100"
                      : "text-foreground/90 hover:text-primary-dark motion-reduce:hover:text-primary after:origin-left after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100"
                  }`}
                >
                  {item.isComingSoon ? (
                    <span className="leading-[1.25]">{item.label}</span>
                  ) : (
                    <AnimatedNavLabel label={item.label} />
                  )}
                  {item.isComingSoon && (
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-dark">
                      presto
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <Link
              to="/"
              aria-label="Homepage di Online Garden"
              className="justify-self-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="2xl:hidden"><BrandMark compact /></span>
              <span className="hidden 2xl:inline"><BrandMark /></span>
            </Link>

            <div className="flex items-center justify-self-end gap-2">
              {/* Pill Cerca — riusa lo stato/handler esistenti (isDesktopSearchOpen + searchValue) */}
              <button
                type="button"
                onClick={() => setIsDesktopSearchOpen((v) => !v)}
                aria-label="Cerca piante"
                aria-expanded={isDesktopSearchOpen}
                className="inline-flex h-12 items-center gap-2.5 rounded-full border-2 border-primary/25 bg-white pl-4 pr-5 text-left text-[15px] font-medium text-foreground/70 shadow-soft transition-colors hover:border-primary/50 hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 2xl:min-w-[260px]"
              >
                <Search className="h-5 w-5 shrink-0 text-primary-dark" strokeWidth={2.25} />
                <span className="2xl:hidden">Cerca</span>
                <span className="hidden 2xl:inline">Cerca piante…</span>
              </button>

              <a
                href="mailto:info@onlinegarden.it"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-white text-primary-dark transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Contattaci via email"
              >
                <Mail className="h-5 w-5" strokeWidth={2.25} />
              </a>

              {/* Account + Carrello: stessa riga, stessa dimensione (48px) di email */}
              <div
                className="flex items-center gap-2 [&_button>span]:hidden [&_button_svg]:h-5 [&_button_svg]:w-5 [&_button]:h-12 [&_button]:w-12 [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-border [&_button]:bg-white [&_button]:text-primary-dark [&_button]:transition-colors [&_button]:hover:bg-muted"
              >
                <AccountButton />
                <CartDrawer />
              </div>
            </div>
          </div>

          {/* Desktop search dropdown */}
          {isDesktopSearchOpen ? (
            <div className="absolute inset-x-0 top-full mt-2 z-50">
              <div className="mx-auto max-w-[1600px] px-6">
                <div className="ml-auto max-w-xl rounded-2xl border border-border bg-white p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Search className="ml-2 h-5 w-5 text-primary-dark" />
                    <Input
                      autoFocus
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder="Cerca piante, vasi, idee regalo…"
                      className="h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                    />
                    <Button
                      className="h-11 rounded-full px-5 text-sm font-semibold"
                      onClick={() => console.log("Search:", searchValue)}
                    >
                      Cerca
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={() => setIsDesktopSearchOpen(false)}
                      aria-label="Chiudi ricerca"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeItem ? (
            /* Flush sotto l'header (niente gap che lasci intravedere la hero) */
            <div className="absolute inset-x-0 top-full">
              <div className="mx-auto max-w-[1600px] px-6">
                <div className="grid grid-cols-[0.92fr_1.08fr] gap-10 rounded-b-2xl border border-border bg-white px-8 py-8 shadow-lg">
                  <div className="flex flex-col justify-between gap-8">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Categorie</p>
                      <h3 className="mt-3 font-heading text-[2.1rem] font-semibold leading-tight text-primary-dark">{activeItem.title}</h3>
                      <p className="mt-3 max-w-md text-[15px] leading-7 text-foreground/75">{activeItem.description}</p>
                    </div>
                    <div className="grid gap-1">
                      {activeItem.links.map((link) => (
                        <Link
                          key={link.label}
                          to={link.href}
                          className="group flex items-center gap-3 rounded-lg border-b border-border/50 py-2.5 pr-2 text-[15px] font-medium text-foreground transition-colors hover:bg-muted/60 hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          {link.image ? (
                            <img
                              src={link.image}
                              alt=""
                              width={44}
                              height={44}
                              loading="lazy"
                              decoding="async"
                              className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-border transition-all duration-500 group-hover:scale-[1.06] group-hover:ring-primary/40"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/10 text-primary/80 ring-1 ring-border">
                              <Leaf className="h-4 w-4" />
                            </span>
                          )}
                          <span className="flex-1">{link.label}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                    <Link
                      to={activeItem.catalogHref}
                      className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-sm transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      Vai al catalogo
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {activeItem.previewCards.map((card) => (
                      <Link
                        key={card.title}
                        to={card.href}
                        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        <div className="relative aspect-[4/5] w-full overflow-hidden">
                          {card.image ? (
                            <img
                              src={card.image}
                              alt={card.title}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.tone} transition-transform duration-700 group-hover:scale-[1.04]`} />
                          )}
                          {/* Gradiente più leggero, solo dietro il testo */}
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">Selezione</p>
                            <h4 className="mt-1.5 font-heading text-[1.4rem] font-semibold leading-tight text-white drop-shadow-sm">{card.title}</h4>
                            <p className="mt-1.5 text-[13px] leading-5 text-white/90 line-clamp-2">{card.description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* MOBILE + TABLET (fino a 1279px: sotto xl il layout desktop sarebbe compresso) */}
        <div className="py-3 xl:hidden">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full border border-border bg-white text-primary-dark hover:bg-muted"
                  aria-label="Apri menu"
                >
                  <Menu className="h-6 w-6" strokeWidth={2.25} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[92%] max-w-sm border-border bg-background">
                <SheetHeader>
                  <SheetTitle className="font-heading text-2xl text-primary-dark">Online Garden</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {navigationItems.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-card p-2">
                      {item.isComingSoon ? (
                        <div className="flex items-center justify-between rounded-xl px-3 py-3.5 text-base font-semibold text-muted-foreground/60 cursor-default">
                          <span>{item.label}</span>
                          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50 border border-border/60 rounded-full px-1.5 py-0.5">
                            Presto
                          </span>
                        </div>
                      ) : (
                        <Link
                          to={item.catalogHref}
                          onClick={() => setIsMobileNavOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </Link>
                      )}
                      <div className="mt-1 grid gap-1 px-1 pb-1">
                        {item.links.map((link) => (
                          item.isComingSoon ? (
                            <span
                              key={link.label}
                              className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/45 cursor-default block"
                            >
                              {link.label}
                            </span>
                          ) : (
                            <Link
                              key={link.label}
                              to={link.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-base font-medium text-foreground/85 transition-colors hover:bg-muted"
                            >
                              {link.image ? (
                                <img
                                  src={link.image}
                                  alt=""
                                  width={36}
                                  height={36}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-border"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-accent/10 text-primary/80">
                                  <Leaf className="h-4 w-4" />
                                </span>
                              )}
                              <span className="flex-1">{link.label}</span>
                            </Link>
                          )
                        ))}
                      </div>
                    </div>
                  ))}

                  <a
                    href="mailto:info@onlinegarden.it"
                    className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Mail className="h-5 w-5 shrink-0 text-primary-dark" strokeWidth={2.25} />
                    <span>Scrivici: info@onlinegarden.it</span>
                  </a>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" aria-label="Homepage di Online Garden" className="justify-self-center">
              <BrandMark compact />
            </Link>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full border border-border bg-white text-primary-dark hover:bg-muted"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
                aria-label={isMobileSearchOpen ? "Chiudi ricerca" : "Apri ricerca"}
                aria-expanded={isMobileSearchOpen}
              >
                {isMobileSearchOpen ? <X className="h-5 w-5" strokeWidth={2.25} /> : <Search className="h-5 w-5" strokeWidth={2.25} />}
              </Button>
              <Link
                to="/auth"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary-dark transition-colors hover:bg-muted"
                aria-label="Area account"
              >
                <User className="h-5 w-5" strokeWidth={2.25} />
              </Link>
              <div className="[&_button>span]:hidden [&_button_svg]:h-5 [&_button_svg]:w-5 [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-full [&_button]:border [&_button]:border-border [&_button]:bg-white [&_button]:text-primary-dark [&_button]:hover:bg-muted">
                <CartDrawer />
              </div>
            </div>
          </div>

          {/* Barra ricerca mobile — pill sempre visibile per over 50 */}
          {!isMobileSearchOpen ? (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="mt-3 flex w-full items-center gap-2.5 rounded-full border-2 border-primary/25 bg-white px-4 py-3 text-left text-sm font-medium text-muted-foreground shadow-soft"
              aria-label="Apri ricerca prodotti"
            >
              <Search className="h-5 w-5 text-primary-dark" strokeWidth={2.25} />
              <span>Cerca piante, vasi, idee regalo…</span>
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-full border-2 border-primary/30 bg-white p-1.5 shadow-soft">
              <Search className="ml-2 h-5 w-5 text-primary-dark" />
              <Input
                autoFocus
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Cerca piante, vasi, idee regalo"
                className="h-10 border-0 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              />
              <Button
                className="h-10 rounded-full px-4 text-sm font-semibold"
                onClick={() => console.log("Search:", searchValue)}
              >
                Cerca
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
