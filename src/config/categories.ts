/**
 * Single source of truth per la navigazione delle categorie del catalogo.
 * Usata da NavBar (Header) e Footer.
 *
 * Modifiche 12 giugno (richieste cliente):
 *  - Piante da frutto: rimossi "Agrumi" e "Varietà da terrazzo"; aggiunto "Alberi da frutto"
 *  - Rose: rimosso "Idee regalo"; aggiunti "Rose paesaggistiche" e "Rose a fiore grande"
 *  - Altre Categorie: "Bulbi" promosso a sotto-categoria attiva (scheda prodotti)
 *  - Piante da esterno: rimossi "Balconi e terrazze" e "Fioriture stagionali";
 *    aggiunti Arbusti, Alberi, Erbacee perenni e graminacee, Piante da siepe,
 *    Piante grasse e succulente, Aromatiche, Rampicanti / arbusti a spalliera
 *  - Nuova top-level: "Conifere" (in attesa lista + foto da Marco)
 */

export interface CategorySubLink {
  /** Etichetta mostrata in UI */
  label: string;
  /** Handle Shopify (slug) — usato per costruire /collections/<handle> */
  handle: string;
  /** Se true, la collezione Shopify NON esiste ancora e va creata (dry-run) */
  toCreate?: boolean;
}

export interface CategoryNode {
  label: string;
  handle: string;
  description: string;
  /** Sotto-categorie mostrate nel mega-menu e nel footer */
  links: CategorySubLink[];
  /** Card preview opzionali per il mega-menu (asset path importati nel componente) */
  previewCards?: Array<{
    title: string;
    description: string;
    imageKey: "outdoorLiving" | "evergreenGarden" | "roseSelection" | "roseGift" | "citrus" | "berries" | "potsAccessories" | "bulbsSeasonal";
    href: string;
  }>;
  /** Se true, la collezione top-level Shopify va creata */
  toCreate?: boolean;
}

export const CATEGORIES: CategoryNode[] = [
  {
    label: "Piante da esterno",
    handle: "piante-da-esterno",
    description: "Per giardini, balconi, terrazzi e aiuole dal tono naturale e raffinato.",
    links: [
      { label: "Arbusti", handle: "arbusti", toCreate: true },
      { label: "Alberi", handle: "alberi", toCreate: true },
      { label: "Erbacee perenni e graminacee", handle: "erbacee-perenni-graminacee", toCreate: true },
      { label: "Piante da siepe", handle: "piante-da-siepe", toCreate: true },
      { label: "Piante grasse e succulente", handle: "piante-grasse-succulente", toCreate: true },
      { label: "Aromatiche", handle: "aromatiche", toCreate: true },
      { label: "Rampicanti / arbusti a spalliera", handle: "rampicanti-arbusti-spalliera", toCreate: true },
      { label: "Rampicanti", handle: "rampicanti" },
      { label: "Sempreverdi", handle: "sempreverdi" },
    ],
    previewCards: [
      { title: "Vivere l'esterno", description: "Una selezione luminosa per spazi aperti pieni di carattere.", imageKey: "outdoorLiving", href: "/collections/piante-da-esterno" },
      { title: "Giardino essenziale", description: "Varietà scelte per composizioni curate e leggere.", imageKey: "evergreenGarden", href: "/collections/sempreverdi" },
    ],
  },
  {
    label: "Rose",
    handle: "rose",
    description: "Collezioni romantiche e profumate per chi cerca eleganza senza tempo.",
    links: [
      { label: "Rose cespuglio", handle: "rose-cespuglio" },
      { label: "Rose rampicanti", handle: "rose-rampicanti" },
      { label: "Rose profumate", handle: "rose-profumate" },
      { label: "Rose paesaggistiche", handle: "rose-paesaggistiche", toCreate: true },
      { label: "Rose a fiore grande", handle: "rose-fiore-grande", toCreate: true },
    ],
    previewCards: [
      { title: "Rose selezionate", description: "Una proposta pensata per roseti, ingressi e spazi esterni dal tono poetico.", imageKey: "roseSelection", href: "/collections/rose" },
      { title: "Roseto profumato", description: "Composizioni eleganti dai profumi intensi.", imageKey: "roseGift", href: "/collections/rose-profumate" },
    ],
  },
  {
    label: "Piante da frutto",
    handle: "piante-da-frutto",
    description: "Varietà decorative e produttive, perfette per esterni e terrazze.",
    links: [
      { label: "Alberi da frutto", handle: "alberi-da-frutto", toCreate: true },
      { label: "Piccoli frutti", handle: "piccoli-frutti" },
    ],
    previewCards: [
      { title: "Alberi da frutto", description: "Varietà selezionate per giardini produttivi e ornamentali.", imageKey: "berries", href: "/collections/alberi-da-frutto" },
      { title: "Piccoli frutti", description: "Una proposta piacevole da coltivare e vivere all'aperto.", imageKey: "citrus", href: "/collections/piccoli-frutti" },
    ],
  },
  {
    label: "Conifere",
    handle: "conifere",
    description: "Sempreverdi strutturali per giardini di carattere — selezione in arrivo.",
    toCreate: true,
    links: [],
    previewCards: [
      { title: "Conifere", description: "Collezione in arrivo, curata con Marco.", imageKey: "evergreenGarden", href: "/collections/conifere" },
    ],
  },
  {
    label: "Altre categorie",
    handle: "all",
    description: "Dettagli complementari per completare con gusto il tuo spazio verde.",
    links: [
      { label: "Vasi da esterno", handle: "vasi-da-esterno" },
      { label: "Accessori", handle: "accessori" },
      { label: "Aromatiche da esterno", handle: "aromatiche-da-esterno" },
      { label: "Bulbi", handle: "bulbi", toCreate: true },
    ],
    previewCards: [
      { title: "Vasi e accessori", description: "Forme, materie e dettagli pensati per terrazzi e balconi curati.", imageKey: "potsAccessories", href: "/collections/vasi-da-esterno" },
      { title: "Bulbi stagionali", description: "Selezione dedicata alle prossime fioriture outdoor.", imageKey: "bulbsSeasonal", href: "/collections/bulbi" },
    ],
  },
];

/** Categorie mostrate nel Footer (top-level + handle) */
export const FOOTER_CATEGORIES = CATEGORIES.map((c) => ({ label: c.label, handle: c.handle }));

/** Helper per costruire l'URL della collezione */
export const collectionHref = (handle: string) => `/collections/${handle}`;
