import { Search, MessageCircle, Menu, ShieldCheck, Truck, HeadphonesIcon, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "./CartDrawer";
import { AccountButton } from "./AccountButton";
import { useState } from "react";

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/88 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-background/82">
      <div className="border-b border-border/50 bg-showcase text-primary-foreground">
        <div className="container mx-auto flex h-9 items-center justify-center gap-4 overflow-x-auto px-4 text-xs font-medium md:justify-between md:text-sm">
          <span className="hidden md:inline">Selezione botanica più curata</span>
          <span className="whitespace-nowrap">Spedizione protetta • supporto reale • acquisto sicuro</span>
          <span className="hidden md:inline">Esperienza ecommerce più premium</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full border border-border bg-card/80 shadow-soft">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88%] max-w-sm border-border bg-background">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left font-heading text-2xl text-primary">
                    <Leaf className="h-5 w-5" />
                    Online Garden
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 space-y-6">
                  <div className="space-y-3">
                    {categories.map((cat) => (
                      <a key={cat} href="#catalogo" className="block text-sm font-semibold tracking-[0.18em] text-foreground">
                        {cat}
                      </a>
                    ))}
                  </div>
                  <div className="space-y-3 rounded-[1.5rem] border border-border bg-gradient-card p-4 shadow-soft">
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
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <a href="/" className="shrink-0 font-heading text-2xl font-bold text-primary md:text-3xl">
            Online Garden
          </a>

          <div className="hidden flex-1 md:flex">
            <div className="flex w-full max-w-3xl items-center rounded-full border border-border/70 bg-card/82 p-1 shadow-soft backdrop-blur">
              <Input
                type="text"
                placeholder="Cerca la tua pianta ideale..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                className="h-11 rounded-full px-6 uppercase font-semibold tracking-[0.16em]"
                onClick={() => console.log("Search:", searchQuery)}
              >
                <Search className="mr-2 h-4 w-4" />
                Cerca
              </Button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 md:gap-3">
            <AccountButton />
            <CartDrawer />
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <div className="flex items-center rounded-full border border-border/70 bg-card/85 p-1 shadow-soft backdrop-blur">
            <Input
              type="text"
              placeholder="Cerca pianta, vaso, idea regalo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              className="h-10 rounded-full px-4"
              onClick={() => console.log("Search:", searchQuery)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden border-t border-border/60 bg-background/75 md:block">
        <div className="container mx-auto flex h-12 items-center justify-between gap-6 px-4">
          <nav className="flex items-center gap-1 overflow-x-auto text-sm scrollbar-hide">
            {categories.map((cat) => (
              <a
                key={cat}
                href="#catalogo"
                className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                {cat}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <a href="#catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <MessageCircle className="h-4 w-4" />
              Scrivici per scegliere meglio
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
