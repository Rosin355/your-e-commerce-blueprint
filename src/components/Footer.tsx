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
    <footer className="bg-showcase text-primary-foreground">
      <div className="container mx-auto px-4 py-14">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-2xl font-heading font-bold">Online Garden</h3>
            <p className="text-sm leading-6 text-primary-foreground/78">
              Uno storefront verde più elegante, leggibile e rassicurante per accompagnare la scelta con più calma.
            </p>
            <div className="text-sm text-primary-foreground/72">
              <p>Via delle Piante, 123</p>
              <p>00100 Roma, Italia</p>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold">Link Utili</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/78">
              {links.company.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="transition-opacity hover:opacity-100 hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold">Categorie</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/78">
              {categories.map((cat, idx) => (
                <li key={idx}>
                  <a href="#" className="transition-opacity hover:opacity-100 hover:underline">
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold">Seguici</h4>
            <div className="mb-6 flex gap-4">
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-primary-foreground/78">
              Iscriviti alla newsletter per offerte esclusive e novità di stagione.
            </p>
          </div>
        </div>

        <div className="border-t border-primary-foreground/12 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-primary-foreground/72 md:flex-row">
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
