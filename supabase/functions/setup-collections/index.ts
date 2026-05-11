// One-shot edge function to bootstrap manual (custom) collections in Shopify
// Creates each collection if missing and populates with matching products.
// Safe to re-run: skips existing collections (matched by handle).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, shopifyAdminFetch } from "../_shared/shopify-admin-client.ts";
interface CollectionDef {
  handle: string;
  title: string;
  body_html: string;
  // Regex (case-insensitive) used to match products by title|tags|product_type
  match: RegExp | null;
  // If set, also include products matched by these other handles (composition)
  union?: string[];
  // Hard limit so we don't overload tiny collections
  max?: number;
}

const COLLECTIONS: CollectionDef[] = [
  // Piante da esterno
  { handle: "fioriture-stagionali", title: "Fioriture stagionali", body_html: "Piante da esterno che regalano colore stagione dopo stagione: lavanda, ortensie, gerani, dipladenia e altre fioriture protagoniste di balconi e giardini.", match: /lavand|ortens|peoni|gerani|surfin|petunia|gardeni|camelia|azalea|rododendr|hibisc|ibisco|dipladen|mandevill|dahlia|dalia|begonia|primul|viola|tagete/i },
  { handle: "rampicanti", title: "Rampicanti", body_html: "Piante rampicanti per pergolati, recinzioni e muri: glicine, gelsomino, edera, passiflora e clematidi.", match: /rampic|glicin|gelsomin|edera|passiflor|bougain|clematid|caprifogli|trachelosp/i },
  { handle: "balconi-e-terrazze", title: "Balconi e terrazze", body_html: "Una selezione pensata per spazi compatti: piante e fiori dal portamento contenuto, perfetti per vasi, cassette e fioriere.", match: /balcon|terrazz|geran|surfin|petuni|dipladen|lavand|aromatic|basilico|menta|piccoli frutti|fragol/i, max: 30 },
  { handle: "sempreverdi", title: "Sempreverdi", body_html: "Verde strutturale che dura tutto l'anno: bosso, alloro, magnolia, ulivo e altre specie sempreverdi per dare carattere agli spazi esterni.", match: /sempreverd|bosso|alloro|laurus|tasso|cipress|abete|pino|ginepro|magnolia|olivo|ulivo|photin|pittosp|skimm/i },
  { handle: "piante-da-esterno", title: "Piante da esterno", body_html: "Tutta la nostra selezione outdoor: fioriture, sempreverdi, rampicanti, aromatiche e specie da giardino.", match: null, union: ["fioriture-stagionali", "rampicanti", "sempreverdi", "balconi-e-terrazze"], max: 60 },

  // Rose
  { handle: "rose-cespuglio", title: "Rose cespuglio", body_html: "Rose dal portamento arbustivo, ideali per aiuole e bordure.", match: /rosa.*cespugli|rosa.*arbust|rose cespugli|rose arbust/i },
  { handle: "rose-rampicanti", title: "Rose rampicanti", body_html: "Rose rampicanti per archi, pergolati e recinzioni.", match: /rosa.*rampic|rosa.*rambl|rose rampic/i },
  { handle: "rose-profumate", title: "Rose profumate", body_html: "Una selezione di rose dal profumo intenso e persistente.", match: /rosa.*profum|rosa.*fragran|rose profum/i },
  { handle: "rose", title: "Rose", body_html: "Tutte le rose della nostra selezione: cespuglio, rampicanti, profumate e antiche.", match: /\brosa\b|\brose\b|rosier/i },

  // Piante da frutto
  { handle: "agrumi", title: "Agrumi", body_html: "Limoni, aranci, mandarini, kumquat, bergamotti e cedri: profumi del Mediterraneo per il tuo terrazzo o giardino.", match: /limon|aranc|mandar|pompelm|cedro|kumquat|bergamot|chinott|agrum|citrus/i },
  { handle: "piccoli-frutti", title: "Piccoli frutti", body_html: "Mirtilli, lamponi, fragole, ribes, more e uva spina: i piccoli frutti perfetti anche per coltivazione in vaso.", match: /mirtill|lampon|fragol|ribes|\bmor[ae]\b|goji|uva spin|gelso|cassis/i },
  { handle: "alberi-da-frutto", title: "Alberi da frutto", body_html: "Meli, peri, ciliegi, albicocchi, peschi, susini, fichi, cachi, melograni e altri alberi da frutto.", match: /\bmelo\b|\bpero\b|cilieg|albicocc|\bpesc[ao]\b|prugn|susin|\bfico\b|\bkaki\b|cachi|melagran|melogran|\bnoce\b|noci\b|nocciol|castagn|olivo|ulivo|\bkiwi\b|nashi|cotogn|giuggiol/i },
  { handle: "varieta-da-terrazzo", title: "Varietà da terrazzo", body_html: "Frutti e piante in formato compatto, selezionati per la coltivazione in vaso su balconi e terrazze.", match: /nano|nana|colonnar|patio|terrazz|piccoli frutti|fragol|mirtill/i, max: 30 },
  { handle: "piante-da-frutto", title: "Piante da frutto", body_html: "Tutta la selezione di piante da frutto: agrumi, alberi, piccoli frutti e varietà da terrazzo.", match: null, union: ["agrumi", "piccoli-frutti", "alberi-da-frutto"], max: 60 },

  // Altre categorie
  { handle: "vasi-da-esterno", title: "Vasi da esterno", body_html: "Vasi e fioriere per esterno in resa naturale, perfetti per terrazze e giardini.", match: /\bvas[oi]\b|fiorier|cachepot|coprivas|portavas/i },
  { handle: "accessori", title: "Accessori", body_html: "Tutto il necessario per la cura delle piante: terriccio, concimi, attrezzi, tutori e accessori.", match: /substrat|terricc|concim|fertilizz|guant|forbic|attrezz|annaffi|innaffi|tutor|palett|biostimol|antiparas/i },
  { handle: "aromatiche", title: "Aromatiche", body_html: "Erbe aromatiche da esterno per cucina e giardino: basilico, rosmarino, salvia, menta, timo e molte altre.", match: /basilic|rosmarin|\bsalvia\b|\bmenta\b|\btimo\b|origan|\balloro\b|santoreggi|melissa|erba cipoll|prezzemol|maggioran|aneto|coriand|estragon|dragoncell|aromatic/i },
  { handle: "bulbi", title: "Bulbi", body_html: "Bulbi da fiore stagionali — disponibili a breve.", match: /\bbulb[oi]\b|tulipan|narcis|giacint|\blilium\b|amaryll|crocus|fresia|dalia|gladiolo|ranuncol|anemon|iris/i },
  { handle: "idee-regalo", title: "Idee regalo", body_html: "Una selezione curata per chi vuole regalare bellezza e cura.", match: /regal|gift|cofanett|special/i, max: 20 },
  { handle: "altre-categorie", title: "Altre categorie", body_html: "Vasi, accessori, aromatiche, bulbi e idee regalo.", match: null, union: ["vasi-da-esterno", "accessori", "aromatiche", "bulbi", "idee-regalo"], max: 40 },
];

interface ShopifyProduct {
  id: number;
  title: string;
  tags: string;
  product_type: string;
  handle: string;
}

async function listAllProducts(): Promise<ShopifyProduct[]> {
  // Admin REST: paginate via page_info link header is heavy; use simple limit=250 single page.
  const all: ShopifyProduct[] = [];
  let pageInfo = "";
  for (let i = 0; i < 10; i++) {
    const qs = new URLSearchParams({ limit: "250", fields: "id,title,tags,product_type,handle,status", status: "active" });
    if (pageInfo) qs.set("page_info", pageInfo);
    const res = await shopifyAdminFetch(`products.json?${qs.toString()}`, "GET");
    const list: ShopifyProduct[] = res.products || [];
    all.push(...list);
    if (list.length < 250) break;
    // Without link header parsing here (Deno fetch wrapper hides headers), break.
    break;
  }
  return all;
}

function matchProducts(products: ShopifyProduct[], def: CollectionDef): ShopifyProduct[] {
  if (!def.match) return [];
  const re = def.match;
  const matched = products.filter((p) => {
    const haystack = `${p.title} ${p.tags} ${p.product_type}`;
    return re.test(haystack);
  });
  return def.max ? matched.slice(0, def.max) : matched;
}

async function findCollectionByHandle(handle: string): Promise<number | null> {
  const res = await shopifyAdminFetch(`custom_collections.json?handle=${encodeURIComponent(handle)}&limit=1`, "GET");
  const found = res.custom_collections?.[0];
  return found ? Number(found.id) : null;
}

async function createCollection(def: CollectionDef): Promise<number> {
  const res = await shopifyAdminFetch("custom_collections.json", "POST", {
    custom_collection: { handle: def.handle, title: def.title, body_html: def.body_html, published: true },
  });
  return Number(res.custom_collection.id);
}

async function addProductToCollection(collectionId: number, productId: number): Promise<void> {
  try {
    await shopifyAdminFetch("collects.json", "POST", { collect: { collection_id: collectionId, product_id: productId } });
  } catch (e: any) {
    // Ignore "already exists" type errors
    const msg = String(e?.message || "");
    if (!msg.includes("already") && !msg.includes("taken")) throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const products = await listAllProducts();
    const log: any[] = [];

    // First pass: create collections + populate matched ones
    const handleToId: Record<string, number> = {};
    const handleToProductIds: Record<string, number[]> = {};

    for (const def of COLLECTIONS) {
      let id = await findCollectionByHandle(def.handle);
      const existed = !!id;
      if (!id) id = await createCollection(def);
      handleToId[def.handle] = id;

      const matched = matchProducts(products, def).map((p) => p.id);
      handleToProductIds[def.handle] = matched;

      let added = 0;
      if (!existed && matched.length) {
        for (const pid of matched) {
          await addProductToCollection(id, pid);
          added++;
        }
      }
      log.push({ handle: def.handle, id, existed, matched: matched.length, added });
    }

    // Second pass: union collections
    for (const def of COLLECTIONS) {
      if (!def.union) continue;
      const id = handleToId[def.handle];
      const entry = log.find((l) => l.handle === def.handle);
      if (entry?.existed) continue;
      const set = new Set<number>();
      for (const sub of def.union) (handleToProductIds[sub] || []).forEach((pid) => set.add(pid));
      const ids = def.max ? Array.from(set).slice(0, def.max) : Array.from(set);
      for (const pid of ids) await addProductToCollection(id, pid);
      if (entry) entry.added = ids.length;
    }

    return jsonResponse({ success: true, totalProducts: products.length, log });
  } catch (e: any) {
    console.error("setup-collections error", e);
    return jsonResponse({ success: false, error: e?.message || String(e) }, 500);
  }
});
