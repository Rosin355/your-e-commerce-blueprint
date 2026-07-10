import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Leaf, Mail, Menu, Search, SunMedium, User, X } from "lucide-react";
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

const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <span className="inline-flex items-center gap-2.5">
    <span className={`${compact ? "text-[1.25rem]" : "text-[1.9rem]"} font-['Playfair_Display'] font-semibold tracking-[0.12em] text-white`}>
      ONLINE
    </span>
    <img
      src={logoOnlineGarden}
      alt="Online Garden logo"
      className={`${compact ? "h-16 w-16" : "h-24 w-24"} object-contain`}
      loading="eager"
    />
    <span className={`${compact ? "text-[1.25rem]" : "text-[1.9rem]"} font-['Playfair_Display'] font-semibold tracking-[0.12em] text-white`}>
      GARDEN
    </span>
  </span>
);

export type HomeHeaderOverlayVariant = "hero" | "page";
export const HomeHeaderOverlay = ({ variant = "hero" }: { variant?: HomeHeaderOverlayVariant }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeItem, setActiveItem] = useState<NavItem | null>(null);

  return (
    <header
      className={[
        variant === "hero" ? "absolute inset-x-0 top-7 z-40" : "sticky inset-x-0 top-7 z-40",
        "text-white md:top-8",
        variant === "page" ? "bg-black/10 backdrop-blur-xl border-b border-white/12" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <div
          className="hidden border-b border-white/16 py-3.5 lg:block"
          onMouseLeave={() => setActiveItem(null)}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <nav className="flex items-center gap-8">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onMouseEnter={() => !item.isComingSoon && setActiveItem(item)}
                  onFocus={() => !item.isComingSoon && setActiveItem(item)}
                  className={`relative inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.015em] transition-colors ${
                    item.isComingSoon
                      ? "cursor-default text-white/40"
                      : activeItem?.label === item.label
                      ? "text-white"
                      : "text-white/90 hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.isComingSoon && (
                    <span className="rounded-full border border-white/20 bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/40">
                      presto
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <Link to="/" aria-label="Homepage di Online Garden" className="justify-self-center">
              <BrandMark />
            </Link>

            <div className="justify-self-end [&_button>span]:hidden [&_button_svg]:h-[15px] [&_button_svg]:w-[15px] flex items-center gap-1.5 [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:border [&_button]:border-white/18 [&_button]:bg-transparent [&_button]:text-white/92 [&_button]:hover:bg-white/16">
              <a href="mailto:info@onlinegarden.it" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-transparent text-white/92 transition-colors hover:bg-white/16" aria-label="Contatti">
                <Mail className="h-4 w-4" />
              </a>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-transparent text-white/92 transition-colors hover:bg-white/16" aria-label="Tema">
                <SunMedium className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-transparent text-white/92 transition-colors hover:bg-white/16" aria-label="Ricerca">
                <Search className="h-4 w-4" />
              </button>
              <AccountButton />
              <CartDrawer />
            </div>
          </div>

          {activeItem ? (
            <div className="absolute inset-x-0 top-full mt-px">
              <div className="mx-auto max-w-[1600px] px-6">
                <div className="grid grid-cols-[0.92fr_1.08fr] gap-10 border border-white/14 bg-[rgba(12,16,13,0.72)] px-8 py-8 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-col justify-between gap-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.26em] text-white/56">Categorie</p>
                      <h3 className="mt-3 font-heading text-[2rem] font-medium leading-tight text-white">{activeItem.title}</h3>
                      <p className="mt-3 max-w-md text-sm leading-7 text-white/72">{activeItem.description}</p>
                    </div>
                    <div className="grid gap-2">
                      {activeItem.links.map((link) => (
                        <Link
                          key={link.label}
                          to={link.href}
                          className="group flex items-center gap-3 border-b border-white/10 py-2 text-sm text-white/86 transition-colors hover:text-white"
                        >
                          {link.image ? (
                            <img
                              src={link.image}
                              alt={link.label}
                              width={40}
                              height={40}
                              loading="lazy"
                              decoding="async"
                              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10 transition-all duration-500 group-hover:scale-[1.06] group-hover:brightness-110 group-hover:ring-white/25"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/15 to-white/5 text-white/70 ring-1 ring-white/10">
                              <Leaf className="h-4 w-4" />
                            </span>
                          )}
                          <span className="flex-1">{link.label}</span>
                          <ChevronRight className="h-4 w-4 text-white/52" />
                        </Link>
                      ))}
                    </div>
                    <Link to={activeItem.catalogHref} className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 transition-colors hover:text-white">
                      Vai al catalogo
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {activeItem.previewCards.map((card) => (
                      <Link
                        key={card.title}
                        to={card.href}
                        className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-md ring-1 ring-white/5 transition-all duration-500 hover:shadow-2xl hover:ring-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      >
                        <div className="relative aspect-[4/5] w-full overflow-hidden">
                          {card.image ? (
                            <img
                              src={card.image}
                              alt={card.title}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.tone} transition-transform duration-700 group-hover:scale-[1.04]`} />
                          )}
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Selezione</p>
                            <h4 className="mt-1.5 font-heading text-[1.35rem] font-medium leading-tight text-white">{card.title}</h4>
                            <p className="mt-1.5 text-[13px] leading-5 text-white/78 line-clamp-2">{card.description}</p>
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

        <div className="border-b border-white/16 py-3 lg:hidden">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-white/20 bg-black/20 text-white hover:bg-white/20">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[90%] max-w-sm border-border bg-background/98">
                <SheetHeader>
                  <SheetTitle className="font-heading text-2xl text-primary-dark">Online Garden</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {navigationItems.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/70 bg-card p-2">
                      {item.isComingSoon ? (
                        <div className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground/50 cursor-default">
                          <span>{item.label}</span>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/40 border border-border/40 rounded-full px-1.5 py-0.5">
                            Presto
                          </span>
                        </div>
                      ) : (
                        <Link
                          to={item.catalogHref}
                          onClick={() => setIsMobileNavOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Categoria</span>
                        </Link>
                      )}
                      <div className="mt-1 grid gap-1 px-1 pb-1">
                        {item.links.map((link) => (
                          item.isComingSoon ? (
                            <span
                              key={link.label}
                              className="rounded-xl px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/35 cursor-default block"
                            >
                              {link.label}
                            </span>
                          ) : (
                            <Link
                              key={link.label}
                              to={link.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className="rounded-xl px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/75 transition-colors hover:bg-muted"
                            >
                              {link.label}
                            </Link>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" aria-label="Homepage di Online Garden" className="justify-self-center">
              <BrandMark compact />
            </Link>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-white/20 bg-black/20 text-white hover:bg-white/20"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              >
                {isMobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
              <Link to="/auth" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white transition-colors hover:bg-white/20" aria-label="Account">
                <User className="h-4 w-4" />
              </Link>
              <div className="[&_button>span]:hidden [&_button_svg]:h-4 [&_button_svg]:w-4 [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-full [&_button]:border [&_button]:border-white/20 [&_button]:bg-black/20 [&_button]:text-white [&_button]:hover:bg-white/20">
                <CartDrawer />
              </div>
            </div>
          </div>

          {isMobileSearchOpen ? (
            <div className="mt-3 flex items-center rounded-full border border-white/24 bg-black/20 p-1 backdrop-blur">
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Cerca piante, vasi, idee regalo"
                className="h-9 border-0 bg-transparent text-sm text-white placeholder:text-white/68 focus-visible:ring-0"
              />
              <Button
                className="h-9 rounded-full bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-dark hover:bg-white/90"
                onClick={() => console.log("Search:", searchValue)}
              >
                Cerca
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
