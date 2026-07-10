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

/**
 * Chiavi immagine risolte nei componenti (Header, HomeHeaderOverlay) tramite IMAGE_MAP.
 * - Le prime 8 sono le immagini "megamenu" storiche (src/assets/megamenu/*.jpg).
 * - Le successive sono le foto categoria dedicate (src/assets/categories/*.jpg).
 */
export type CategoryImageKey =
  | "outdoorLiving"
  | "evergreenGarden"
  | "roseSelection"
  | "roseGift"
  | "citrus"
  | "berries"
  | "potsAccessories"
  | "bulbsSeasonal"
  | "alberi"
  | "arbusti"
  | "aromatiche"
  | "conifere"
  | "erbaceeGraminacee"
  | "alberiDaFrutto"
  | "pianteGrasse"
  | "piantePalustri"
  | "piccoliFrutti"
  | "rampicanti"
  | "rose"
  | "roseRampicanti"
  | "siepi";

export interface CategorySubLink {
  /** Etichetta mostrata in UI */
  label: string;
  /** Handle Shopify (slug) — usato per costruire /collections/<handle> */
  handle: string;
  /** Se true, la collezione Shopify NON esiste ancora e va creata (dry-run) */
  toCreate?: boolean;
  /** Thumbnail opzionale mostrata accanto al link nel mega-menu (fallback grafico se assente) */
  image?: CategoryImageKey;
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
    imageKey: CategoryImageKey;
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
      { label: "Arbusti", handle: "arbusti", toCreate: true, image: "arbusti" },
      { label: "Alberi", handle: "alberi", toCreate: true, image: "alberi" },
      { label: "Erbacee perenni e graminacee", handle: "erbacee-perenni-graminacee", toCreate: true, image: "erbaceeGraminacee" },
      { label: "Piante da siepe", handle: "piante-da-siepe", toCreate: true, image: "siepi" },
      { label: "Piante grasse e succulente", handle: "piante-grasse-succulente", toCreate: true, image: "pianteGrasse" },
      { label: "Aromatiche", handle: "aromatiche", toCreate: true, image: "aromatiche" },
      { label: "Rampicanti / arbusti a spalliera", handle: "rampicanti-arbusti-spalliera", toCreate: true, image: "rampicanti" },
      { label: "Rampicanti", handle: "rampicanti", image: "rampicanti" },
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
      { label: "Rose cespuglio", handle: "rose-cespuglio", image: "rose" },
      { label: "Rose rampicanti", handle: "rose-rampicanti", image: "roseRampicanti" },
      { label: "Rose profumate", handle: "rose-profumate", image: "rose" },
      // Foto dedicata non ancora fornita → riuso temporaneo dello scatto generico "rose"
      { label: "Rose paesaggistiche", handle: "rose-paesaggistiche", toCreate: true, image: "rose" },
      { label: "Rose a fiore grande", handle: "rose-fiore-grande", toCreate: true, image: "rose" },
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
      { label: "Alberi da frutto", handle: "alberi-da-frutto", toCreate: true, image: "alberiDaFrutto" },
      { label: "Piccoli frutti", handle: "piccoli-frutti", image: "piccoliFrutti" },
    ],
    previewCards: [
      { title: "Alberi da frutto", description: "Varietà selezionate per giardini produttivi e ornamentali.", imageKey: "alberiDaFrutto", href: "/collections/alberi-da-frutto" },
      { title: "Piccoli frutti", description: "Una proposta piacevole da coltivare e vivere all'aperto.", imageKey: "piccoliFrutti", href: "/collections/piccoli-frutti" },
    ],
  },
  {
    label: "Conifere",
    handle: "conifere",
    description: "Sempreverdi strutturali per giardini di carattere — selezione in arrivo.",
    toCreate: true,
    links: [],
    previewCards: [
      { title: "Conifere", description: "Collezione in arrivo, curata con Marco.", imageKey: "conifere", href: "/collections/conifere" },
    ],
  },
  {
    label: "Altre categorie",
    handle: "all",
    description: "Dettagli complementari per completare con gusto il tuo spazio verde.",
    links: [
      { label: "Vasi da esterno", handle: "vasi-da-esterno", image: "potsAccessories" },
      { label: "Accessori", handle: "accessori", image: "potsAccessories" },
      { label: "Aromatiche da esterno", handle: "aromatiche-da-esterno", image: "aromatiche" },
      // Foto dedicata non ancora fornita → riuso temporaneo dello scatto generico "bulbi stagionali"
      { label: "Bulbi", handle: "bulbi", toCreate: true, image: "bulbsSeasonal" },
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
