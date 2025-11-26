import { Facebook, Instagram, MessageCircle } from "lucide-react";

export const Footer = () => {
  const categories = [
    "Piante da Interno",
    "Piante da Esterno",
    "Rose",
    "Bulbi",
    "Piante da Frutto",
    "Aromatiche"
  ];

  const links = {
    company: [
      { label: "Chi Siamo", href: "#" },
      { label: "Spedizioni", href: "#" },
      { label: "Resi e Rimborsi", href: "#" },
    ],
    legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Termini e Condizioni", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ]
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Info Azienda */}
          <div className="space-y-4">
            <h3 className="text-2xl font-heading font-bold">Online Garden</h3>
            <p className="text-sm opacity-90">
              La tua piattaforma di fiducia per la vendita di piante online. 
              Qualità garantita e spedizione in tutta Italia.
            </p>
            <div className="text-sm opacity-90">
              <p>Via delle Piante, 123</p>
              <p>00100 Roma, Italia</p>
            </div>
          </div>

          {/* Link Utili */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Link Utili</h4>
            <ul className="space-y-2 text-sm">
              {links.company.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="opacity-90 hover:opacity-100 hover:underline transition-opacity">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categorie */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Categorie</h4>
            <ul className="space-y-2 text-sm">
              {categories.map((cat, idx) => (
                <li key={idx}>
                  <a href="#" className="opacity-90 hover:opacity-100 hover:underline transition-opacity">
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Social */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-4">Seguici</h4>
            <div className="flex gap-4 mb-6">
              <a href="#" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm opacity-90">
              Iscriviti alla newsletter per offerte esclusive
            </p>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-90">
            <p>© 2025 Online Garden. Tutti i diritti riservati.</p>
            <div className="flex gap-4">
              {links.legal.map((link, idx) => (
                <a key={idx} href={link.href} className="hover:underline">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
