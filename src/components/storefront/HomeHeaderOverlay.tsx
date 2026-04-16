import { useState } from "react";
import { ChevronRight, Mail, Menu, Search, SunMedium, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AccountButton } from "@/components/AccountButton";
import { CartDrawer } from "@/components/CartDrawer";
import logoOnlineGarden from "@/assets/logo-online-garden.png";
const navigationItems = [
  {
    label: "Piante da esterno",
    title: "Piante da esterno",
    description: "Soluzioni pensate per terrazzi, balconi, aiuole e giardini ricchi di stagione.",
    links: ["Fioriture stagionali", "Rampicanti", "Balconi e terrazze", "Sempreverdi"],
    previewCards: [
      {
        title: "Idee per terrazzo",
        description: "Accenti verdi e fioriti per spazi esterni luminosi e curati.",
        tone: "from-[#e8dfcf] via-[#d7c9b3] to-[#c7b08a]",
      },
      {
        title: "Verde da giardino",
        description: "Varieta ornamentali selezionate per dare struttura e colore all'esterno.",
        tone: "from-[#6b7f51] via-[#495a39] to-[#2e3a27]",
      },
    ],
  },
  {
    label: "Rose",
    title: "Rose",
    description: "Varieta iconiche dal carattere romantico e raffinato.",
    links: ["Rose cespuglio", "Rose rampicanti", "Rose profumate", "Idee regalo"],
    previewCards: [
      {
        title: "Rose profumate",
        description: "Una selezione curata per giardini, ingressi e angoli esterni dal tono poetico.",
        tone: "from-[#e5d0cf] via-[#d8bab6] to-[#c79b96]",
      },
      {
        title: "Regala una rosa",
        description: "Un gesto elegante da ordinare con semplicita in ogni periodo della stagione.",
        tone: "from-[#efe5d8] via-[#dcc7ad] to-[#bea07f]",
      },
    ],
  },
  {
    label: "Piante da frutto",
    title: "Piante da frutto",
    description: "Essenze scelte per unire bellezza, profumo e raccolto.",
    links: ["Agrumi", "Piccoli frutti", "Alberi da frutto", "Varieta da terrazzo"],
    previewCards: [
      {
        title: "Agrumi e profumi",
        description: "Accenti mediterranei per terrazzi e giardini pieni di luce.",
        tone: "from-[#d9c96b] via-[#b8a649] to-[#8d7a2b]",
      },
      {
        title: "Piccoli frutti",
        description: "Varieta decorative e piacevoli da coltivare all'aperto.",
        tone: "from-[#cfd7c1] via-[#98ab7c] to-[#63754e]",
      },
    ],
  },
  {
    label: "Altre categorie",
    title: "Altre categorie",
    description: "Dettagli complementari per completare terrazzi, balconi e spazi outdoor con gusto.",
    links: ["Vasi da esterno", "Accessori", "Aromatiche da esterno", "Bulbi - disponibile a breve", "Idee regalo"],
    previewCards: [
      {
        title: "Vasi e accessori",
        description: "Dettagli essenziali per un allestimento outdoor curato e resistente.",
        tone: "from-[#d8cfbf] via-[#c6b59b] to-[#a88c68]",
      },
      {
        title: "Bulbi e novita",
        description: "Una categoria in arrivo per accompagnare le prossime fioriture.",
        tone: "from-[#b7c691] via-[#91a26d] to-[#5c6c42]",
      },
    ],
  },
] as const;

const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <span className="inline-flex items-center gap-2.5">
    <span className={`${compact ? "text-[1.25rem]" : "text-[1.9rem]"} font-['Playfair_Display'] font-semibold tracking-[0.12em] text-white`}>
      ONLINE
    </span>
    <img
      src={logoOnlineGarden}
      alt="Online Garden logo"
      className={`${compact ? "h-8 w-8" : "h-9 w-9"} object-contain`}
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
  const [activeItem, setActiveItem] = useState<(typeof navigationItems)[number] | null>(null);

  return (
    <header
      className={[
        variant === "hero" ? "absolute inset-x-0 top-7 z-30" : "sticky inset-x-0 top-7 z-40",
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
                  onMouseEnter={() => setActiveItem(item)}
                  onFocus={() => setActiveItem(item)}
                  className={`text-[13px] font-medium tracking-[0.015em] transition-colors ${
                    activeItem?.label === item.label ? "text-white" : "text-white/90 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <a href="/" aria-label="Homepage di Online Garden" className="justify-self-center">
              <BrandMark />
            </a>

            <div className="justify-self-end [&_button>span]:hidden [&_button_svg]:h-[15px] [&_button_svg]:w-[15px] flex items-center gap-1.5 [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:border [&_button]:border-white/18 [&_button]:bg-transparent [&_button]:text-white/92 [&_button]:hover:bg-white/16">
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-transparent text-white/92 transition-colors hover:bg-white/16" aria-label="Contatti">
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
                        <a
                          key={link}
                          href="/collections/all"
                          className="flex items-center justify-between border-b border-white/10 py-2.5 text-sm text-white/86 transition-colors hover:text-white"
                        >
                          <span>{link}</span>
                          <ChevronRight className="h-4 w-4 text-white/52" />
                        </a>
                      ))}
                    </div>
                    <a href="/collections/all" className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 transition-colors hover:text-white">
                      Vai al catalogo
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {activeItem.previewCards.map((card) => (
                      <a key={card.title} href="/collections/all" className="group block">
                        <div className="overflow-hidden">
                          <div className={`h-52 w-full bg-gradient-to-br ${card.tone} transition-transform duration-700 group-hover:scale-[1.03]`} />
                        </div>
                        <div className="border-x border-b border-white/10 bg-black/12 px-5 py-4">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/48">Selezione</p>
                          <h4 className="mt-2 font-heading text-[1.35rem] font-medium text-white">{card.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-white/68">{card.description}</p>
                        </div>
                      </a>
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
                      <a
                        href="/collections/all"
                        onClick={() => setIsMobileNavOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Categoria</span>
                      </a>
                      <div className="mt-1 grid gap-1 px-1 pb-1">
                        {item.links.map((link) => (
                          <a
                            key={link}
                            href="/collections/all"
                            onClick={() => setIsMobileNavOpen(false)}
                            className="rounded-xl px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/75 transition-colors hover:bg-muted"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <a href="/" aria-label="Homepage di Online Garden" className="justify-self-center">
              <BrandMark compact />
            </a>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-white/20 bg-black/20 text-white hover:bg-white/20"
                onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              >
                {isMobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
              <a href="/auth" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white transition-colors hover:bg-white/20" aria-label="Account">
                <User className="h-4 w-4" />
              </a>
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
