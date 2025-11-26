import { Search, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartDrawer } from "./CartDrawer";
import { useState } from "react";

export const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    "PIANTE DA INTERNO",
    "PIANTE DA ESTERNO",
    "ROSE",
    "BULBI",
    "PIANTE DA FRUTTO",
    "ALTRE CATEGORIE"
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow-md">
      {/* Top Bar Verde */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 h-10 flex items-center justify-between text-sm">
          <div className="hidden md:block">
            Più che Semplici Piante 🪴
          </div>
          <div className="flex-1 md:flex-none text-center">
            <span className="font-medium">Voto Medio 4.9 / 5.0 ⭐⭐⭐⭐⭐</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="text-2xl md:text-3xl font-heading font-bold text-primary">
              Online Garden
            </a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="relative w-full flex">
              <Input
                type="text"
                placeholder="Cerca la tua Pianta es. 'Calathea'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-r-none border-r-0 h-11"
              />
              <Button 
                className="rounded-l-none rounded-r-3xl px-6 h-11 uppercase font-semibold"
                onClick={() => console.log('Search:', searchQuery)}
              >
                <Search className="h-4 w-4 mr-2" />
                Cerca
              </Button>
            </div>
          </div>

          {/* Account & Cart */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
              <User className="h-5 w-5" />
              <span className="uppercase text-xs font-semibold">Accedi / Registrati</span>
            </Button>
            <CartDrawer />
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden border-t px-4 py-3">
          <div className="relative w-full flex">
            <Input
              type="text"
              placeholder="Cerca pianta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-r-none border-r-0"
            />
            <Button 
              className="rounded-l-none rounded-r-3xl"
              onClick={() => console.log('Search:', searchQuery)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12 overflow-x-auto scrollbar-hide">
            <nav className="flex items-center gap-1 md:gap-3 text-sm">
              {categories.map((cat, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="whitespace-nowrap px-2 md:px-3 py-2 hover:text-primary transition-colors font-medium text-xs md:text-sm"
                >
                  {cat}
                </a>
              ))}
            </nav>
            <Button size="sm" className="hidden lg:flex gap-2 ml-4 uppercase font-semibold">
              → Scrivici su WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
