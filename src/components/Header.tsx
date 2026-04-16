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

  const categories = [
    "PIANTE DA INTERNO",
    "PIANTE DA ESTERNO",
    "ROSE",
    "BULBI",
    "PIANTE DA FRUTTO",
    "ALTRE CATEGORIE",
  ];

  const trustBar = [
    { label: "Spedizione protetta", icon: Truck },
    { label: "Supporto reale", icon: HeadphonesIcon },
    { label: "Acquisto sicuro", icon: ShieldCheck },
  ];

  const utilityLinks = [
    { label: "Contatti", href: "#" },
    { label: "Journal", href: "#" },
    { label: "Chi siamo", href: "#" },
  ];

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
            Automatic site-wide discounts at checkout
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
                        key={cat}
                        href="#catalogo"
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-xs font-semibold tracking-[0.18em] text-foreground/90 transition-colors hover:bg-muted"
                      >
                        {cat}
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
              Premium botanical store
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
        <div className="container mx-auto flex h-12 items-center justify-between gap-6 px-4">
          <nav className="flex items-center gap-1 overflow-x-auto text-sm scrollbar-hide">
            {categories.map((cat) => (
              <a
                key={cat}
                href="#catalogo"
                className="whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold tracking-[0.17em] text-foreground/88 transition-colors hover:bg-muted hover:text-primary"
              >
                {cat}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <a href="#catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-dark hover:text-primary">
              <MessageCircle className="h-4 w-4" />
              Scrivici per scegliere meglio
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
