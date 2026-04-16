import { useState } from "react";
import { Mail, Menu, Search, SunMedium, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AccountButton } from "@/components/AccountButton";
import { CartDrawer } from "@/components/CartDrawer";
import logoOnlineGarden from "@/assets/logo-online-garden.png";

const categories = ["Products", "About", "Journal"];
const subCategories = ["Piante da interno", "Piante da esterno", "Rose", "Bulbi", "Piante da frutto", "Altre categorie"];

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

export const HomeHeaderOverlay = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className="absolute inset-x-0 top-7 z-30 text-white md:top-8">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <div className="hidden border-b border-white/16 py-3.5 lg:flex lg:items-center lg:justify-between">
          <nav className="flex items-center gap-8">
            {categories.map((item) => (
              <a key={item} href="#catalogo" className="text-[13px] font-medium tracking-[0.015em] text-white/90 transition-colors hover:text-white">
                {item}
              </a>
            ))}
          </nav>

          <a href="/" aria-label="Online Garden home">
            <BrandMark />
          </a>

          <div className="[&_button>span]:hidden [&_button_svg]:h-[15px] [&_button_svg]:w-[15px] flex items-center gap-1.5 [&_button]:h-8 [&_button]:w-8 [&_button]:rounded-full [&_button]:border [&_button]:border-white/18 [&_button]:bg-transparent [&_button]:text-white/92 [&_button]:hover:bg-white/16">
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
                <nav className="mt-6 space-y-1 rounded-2xl border border-border/70 bg-card p-2">
                  {categories.map((item) => (
                    <a
                      key={item}
                      href="#catalogo"
                      onClick={() => setIsMobileNavOpen(false)}
                      className="block rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {item}
                    </a>
                  ))}
                </nav>
                <div className="mt-4 space-y-1 rounded-2xl border border-border/70 bg-gradient-card p-2">
                  {subCategories.map((item) => (
                    <a
                      key={item}
                      href="#catalogo"
                      onClick={() => setIsMobileNavOpen(false)}
                      className="block rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/85 transition-colors hover:bg-muted"
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <a href="/" aria-label="Online Garden home" className="justify-self-center">
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
