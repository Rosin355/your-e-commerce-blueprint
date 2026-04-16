import { Search, MessageCircle, Menu, ShieldCheck, Truck, HeadphonesIcon, Leaf, Sparkles, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "./CartDrawer";
import { AccountButton } from "./AccountButton";
import { useState } from "react";
import logoOnlineGarden from "@/assets/logo-online-garden.png";

export const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Piante da esterno");

  const categories = [
    {
      label: "Piante da esterno",
      description: "Per giardini, balconi, terrazzi e aiuole dal tono naturale e raffinato.",
      links: ["Fioriture stagionali", "Rampicanti", "Sempreverdi", "Balconi e terrazze"],
      previewCards: [
        { title: "Vivere l'esterno", description: "Una selezione luminosa per spazi aperti pieni di carattere.", tone: "from-[#e8dfcf] via-[#d7c9b3] to-[#c7b08a]" },
        { title: "Giardino essenziale", description: "Varieta scelte per composizioni curate e leggere.", tone: "from-[#6b7f51] via-[#495a39] to-[#2e3a27]" },
      ],
    },
    {
      label: "Rose",
      description: "Collezioni romantiche e profumate per chi cerca eleganza senza tempo.",
      links: ["Rose cespuglio", "Rose rampicanti", "Rose profumate", "Idee regalo"],
      previewCards: [
        { title: "Rose selezionate", description: "Una proposta pensata per roseti, ingressi e spazi esterni dal tono poetico.", tone: "from-[#e5d0cf] via-[#d8bab6] to-[#c79b96]" },
        { title: "Regali floreali", description: "Composizioni eleganti da scegliere con facilita durante la stagione.", tone: "from-[#efe5d8] via-[#dcc7ad] to-[#bea07f]" },
      ],
    },
    {
      label: "Piante da frutto",
      description: "Varieta decorative e produttive, perfette per esterni e terrazze.",
      links: ["Agrumi", "Piccoli frutti", "Alberi da frutto", "Varieta da terrazzo"],
      previewCards: [
        { title: "Agrumi", description: "Profumi mediterranei e presenza scenica per terrazzi e giardini.", tone: "from-[#d9c96b] via-[#b8a649] to-[#8d7a2b]" },
        { title: "Piccoli frutti", description: "Una proposta piacevole da coltivare e vivere all'aperto.", tone: "from-[#cfd7c1] via-[#98ab7c] to-[#63754e]" },
      ],
    },
    {
      label: "Altre categorie",
      description: "Dettagli complementari per completare con gusto il tuo spazio verde.",
      links: ["Vasi da esterno", "Accessori", "Aromatiche da esterno", "Bulbi - disponibile a breve", "Idee regalo"],
      previewCards: [
        { title: "Vasi e accessori", description: "Forme, materie e dettagli pensati per terrazzi e balconi curati.", tone: "from-[#d8cfbf] via-[#c6b59b] to-[#a88c68]" },
        { title: "Bulbi e stagionalita", description: "Una categoria in arrivo, pensata per le prossime fioriture outdoor.", tone: "from-[#b7c691] via-[#91a26d] to-[#5c6c42]" },
      ],
    },
  ] as const;

  const trustBar = [
    { label: "Spedizione protetta", icon: Truck },
    { label: "Supporto reale", icon: HeadphonesIcon },
    { label: "Acquisto sicuro", icon: ShieldCheck },
  ];

  const utilityLinks = [
    { label: "Contatti", href: "#" },
    { label: "Ispirazioni", href: "#" },
    { label: "Chi siamo", href: "#" },
  ];
  const activeCategoryData = categories.find((category) => category.label === activeCategory) ?? categories[0];

  const BrandMark = ({ compact = false }: { compact?: boolean }) => (
    <span className="inline-flex items-center gap-2">
      <span className={`${compact ? "text-[1.2rem]" : "text-[1.6rem]"} font-['Playfair_Display'] font-semibold tracking-[0.11em] text-primary-dark`}>
        ONLINE
      </span>
      <img
        src={logoOnlineGarden}
        alt="Online Garden logo"
        className={`${compact ? "h-7 w-7" : "h-8 w-8"} object-contain`}
        loading="eager"
      />
      <span className={`${compact ? "text-[1.2rem]" : "text-[1.6rem]"} font-['Playfair_Display'] font-semibold tracking-[0.11em] text-primary-dark`}>
        GARDEN
      </span>
    </span>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/65 bg-background/93 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-background/88">
      <div className="border-b border-border/50 bg-showcase text-primary-foreground">
        <div className="container mx-auto flex h-8 items-center justify-center gap-2 px-4 text-[10px] font-medium uppercase tracking-[0.18em] md:h-9 md:text-[11px]">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5" />
            Offerte automatiche al checkout e spedizione protetta
          </span>
        </div>
      </div>

      <div className="hidden border-b border-border/50 bg-background/84 md:block">
        <div className="container mx-auto flex h-10 items-center justify-between px-4">
          <div className="flex items-center gap-5">
            {utilityLinks.map((item) => (
              <a key={item.label} href={item.href} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </div>
          <button type="button" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <Globe className="h-3.5 w-3.5" />
            Regione & Lingua
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-6">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border/80 bg-card/90 shadow-soft">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[90%] max-w-sm border-border bg-background px-0">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 px-6 text-left font-heading text-2xl text-primary-dark">
                    <Leaf className="h-5 w-5" />
                    Online Garden
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6 px-6 pb-6">
                  <div className="space-y-1 rounded-[1.35rem] border border-border/70 bg-card p-2">
                    {categories.map((cat) => (
                      <a
                        key={cat.label}
                        href="#catalogo"
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-xs font-semibold tracking-[0.18em] text-foreground/90 transition-colors hover:bg-muted"
                      >
                        {cat.label}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                  <div className="space-y-3 rounded-[1.35rem] border border-border bg-gradient-card p-4 shadow-soft">
                    {trustBar.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Icon className="h-4 w-4 text-primary" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2 border-t border-border/70 pt-4">
                    {utilityLinks.map((item) => (
                      <a key={item.label} href={item.href} className="block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <a href="/" className="group shrink-0 justify-self-center md:justify-self-start">
            <span className="block leading-none transition-colors group-hover:opacity-90">
              <BrandMark />
            </span>
            <span className="mt-1 hidden text-[10px] uppercase tracking-[0.24em] text-muted-foreground md:block">
              Vivaio premium per esterni
            </span>
          </a>

          <div className="hidden flex-1 justify-center md:flex">
            <div className="flex w-full max-w-2xl items-center rounded-full border border-border/80 bg-card/92 p-1.5 shadow-soft backdrop-blur">
              <Input
                type="text"
                placeholder="Cerca la tua pianta ideale"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                className="h-10 rounded-full px-5 text-xs uppercase font-semibold tracking-[0.18em]"
                onClick={() => console.log("Search:", searchQuery)}
              >
                <Search className="mr-2 h-4 w-4" />
                Cerca
              </Button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:gap-2.5">
            <AccountButton />
            <CartDrawer />
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <div className="flex items-center rounded-full border border-border/80 bg-card/90 p-1.5 shadow-soft backdrop-blur">
            <Input
              type="text"
              placeholder="Cerca pianta, vaso o idea regalo"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            />
            <Button
              className="h-9 rounded-full px-3"
              onClick={() => console.log("Search:", searchQuery)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden border-t border-border/60 bg-background/80 md:block">
        <div className="container mx-auto px-4">
          <div className="flex h-12 items-center justify-between gap-6">
            <nav className="flex items-center gap-1 overflow-x-auto text-sm scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onMouseEnter={() => setActiveCategory(cat.label)}
                  onFocus={() => setActiveCategory(cat.label)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold tracking-[0.17em] transition-colors ${
                    activeCategory === cat.label ? "bg-muted text-primary-dark" : "text-foreground/88 hover:bg-muted hover:text-primary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </nav>
            <div className="hidden items-center gap-4 lg:flex">
              <a href="#catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-dark hover:text-primary">
                <MessageCircle className="h-4 w-4" />
                Scrivici per scegliere meglio
              </a>
            </div>
          </div>

          <div className="grid grid-cols-[0.9fr_1.1fr] gap-10 border-t border-border/60 py-8">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Categorie</p>
                <h3 className="mt-3 font-heading text-[2rem] font-medium leading-tight text-foreground">
                  {activeCategoryData.label}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{activeCategoryData.description}</p>
              </div>

              <div className="grid gap-2">
                {activeCategoryData.links.map((link) => (
                  <a
                    key={link}
                    href="#catalogo"
                    className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm text-foreground/88 transition-colors hover:text-primary-dark"
                  >
                    <span>{link}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>

              <a href="#catalogo" className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark hover:text-primary">
                Scopri tutto
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {activeCategoryData.previewCards.map((card) => (
                <a key={card.title} href="#catalogo" className="group block overflow-hidden rounded-[1.35rem] border border-border/65 bg-card/55">
                  <div className={`h-48 w-full bg-gradient-to-br ${card.tone} transition-transform duration-700 group-hover:scale-[1.03]`} />
                  <div className="px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Selezione</p>
                    <h4 className="mt-2 font-heading text-[1.3rem] font-medium text-foreground">{card.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
