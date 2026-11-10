export const DRAFT_BOTANICAL_KEYS = [
  'nome_botanico',
  'nome_comune',
  'periodo_di_fioritura',
  'periodo_di_messa_a_dimora',
  'periodo_di_raccolta',
  'periodo_ottimale_di_potatura',
  'difficolta_di_coltivazione',
  'faq',
] as const;
/** Pure contracts. No environment access, network calls or inferred taxonomy. */
export const CANONICAL_HANDLES = [
  'piante-da-esterno',
  'arbusti',
  'alberi',
  'erbacee-perenni-graminacee',
  'piante-da-siepe',
  'piante-grasse-succulente',
  'aromatiche',
  'rampicanti-arbusti-spalliera',
  'rampicanti',
  'sempreverdi',
  'rose',
  'rose-cespuglio',
  'rose-rampicanti',
  'rose-profumate',
  'rose-paesaggistiche',
  'rose-fiore-grande',
  'piante-da-frutto',
  'alberi-da-frutto',
  'piccoli-frutti',
  'conifere',
  'vasi-da-esterno',
  'accessori',
  'bulbi',
] as const;
export const OPERATION_ACTIONS = [
  'catalog_categories',
  'preview_categories',
  'apply_categories',
  'preview_new_product',
  'save_new_product',
  'get_product_operations',
  'create_shopify_draft',
  'recover_shopify_draft',
] as const;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class OperationalError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}
export function demand(value: unknown, message: string): asserts value {
  if (!value) throw new OperationalError('VALIDATION_ERROR', message);
}
export interface OperationalApproval {
  action: 'create_shopify_draft' | 'apply_categories';
  target: string;
  expiresAt: string;
}
/** Approval is server configuration, scoped to one saved draft or one category snapshot. */
export function parseOperationalApproval(raw: string | undefined, now = Date.now()): OperationalApproval | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const approval = value as Record<string, unknown>;
    if (Object.keys(approval).sort().join(',') !== 'action,expiresAt,target') return null;
    if (approval.action !== 'create_shopify_draft' && approval.action !== 'apply_categories') return null;
    if (typeof approval.target !== 'string' || !(approval.action === 'create_shopify_draft'
      ? UUID.test(approval.target)
      : /^[a-f0-9]{64}$/i.test(approval.target))) return null;
    if (typeof approval.expiresAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(approval.expiresAt)) return null;
    const expiry = Date.parse(approval.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now || expiry > now + 24 * 60 * 60 * 1000) return null;
    return approval as unknown as OperationalApproval;
  } catch {
    return null;
  }
}
export function approvalMatches(
  approval: OperationalApproval | null,
  action: OperationalApproval['action'],
  target: string,
) {
  return approval?.action === action && approval.target === target;
}
export function operationalAccess(
  action: string,
  roles: string[],
  flags: { drafts: boolean; shopify: boolean; approval: boolean },
  confirm = false,
) {
  const reader = roles.some((r) => ['admin', 'tech_admin', 'editor', 'publisher'].includes(r));
  const editor = roles.some((r) => ['admin', 'tech_admin', 'editor'].includes(r));
  const admin = roles.some((r) => ['admin', 'tech_admin'].includes(r));
  if (
    !reader || (action === 'save_new_product' && !editor) ||
    (['create_shopify_draft', 'recover_shopify_draft', 'apply_categories'].includes(action) &&
      !admin)
  ) throw new OperationalError('FORBIDDEN', 'Operazione non consentita al tuo account.');
  if (action === 'save_new_product' && !flags.drafts) {
    throw new OperationalError(
      'WRITES_DISABLED',
      'Il salvataggio delle nuove bozze non è ancora abilitato.',
    );
  }
  if (action === 'create_shopify_draft' && (!flags.shopify || !flags.approval || !confirm)) {
    throw new OperationalError(
      'WRITES_DISABLED',
      'Invio Shopify non abilitato o conferma mancante.',
    );
  }
}
export interface DraftVariant {
  sku: string;
  price: string;
  compareAtPrice: string | null;
  option: string;
}
export interface ProductDraft {
  title: string;
  sku: string;
  description: string;
  currency: string;
  vendor: string;
  tags: string[];
  categoryIds: string[];
  variants: DraftVariant[];
  images: { url: string; alt: string }[];
  seoTitle: string;
  seoDescription: string;
  botanical: Record<string, unknown>;
  collectionIds?: string[];
}
function text(v: unknown, label: string, max: number, required = false): string {
  demand(
    typeof v === 'string' && v.trim().length <= max && (!required || v.trim().length > 0),
    `${label}: valore mancante o troppo lungo.`,
  );
  return v.trim();
}
export function validateDraft(raw: unknown): ProductDraft {
  demand(raw && typeof raw === 'object' && !Array.isArray(raw), 'Compilazione non valida.');
  const r = raw as Record<string, unknown>;
  const sku = (v: unknown) => {
    const s = text(v, 'SKU', 80, true);
    demand(
      /^[A-Za-z0-9_.-]+$/.test(s),
      'SKU: usare lettere, numeri, punto, trattino o underscore.',
    );
    return s;
  };
  const price = (v: unknown) => {
    demand(
      typeof v === 'string' && /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(v),
      'Prezzo: numero positivo o zero con massimo due decimali.',
    );
    return Number(v).toFixed(2);
  };
  demand(
    Array.isArray(r.variants) && r.variants.length >= 1 && r.variants.length <= 50,
    'Inserire da 1 a 50 varianti.',
  );
  const variants = r.variants.map((v: Record<string, unknown>) => {
    demand(v && typeof v === 'object', 'Variante non valida.');
    const p = price(v.price);
    const compare = v.compareAtPrice === '' || v.compareAtPrice == null
      ? null
      : price(v.compareAtPrice);
    demand(
      compare === null || Number(compare) > Number(p),
      'Il prezzo di confronto deve superare il prezzo di vendita.',
    );
    return {
      sku: sku(v.sku),
      price: p,
      compareAtPrice: compare,
      option: text(v.option, 'Formato', 80, true),
    };
  });
  const familySku = sku(r.sku);
  const skus = variants.map((v) => v.sku.toLowerCase());
  demand(new Set(skus).size === skus.length, 'SKU variante duplicato.');
  demand(
    new Set(variants.map((v) => v.option.toLowerCase())).size === variants.length,
    'Formato duplicato.',
  );
  demand(
    variants.length === 1 ? variants[0].sku === familySku : !skus.includes(familySku.toLowerCase()),
    'SKU famiglia e varianti incoerenti: per un solo formato usare lo stesso SKU; per più formati SKU distinti.',
  );
  demand(typeof r.currency === 'string' && /^[A-Z]{3}$/.test(r.currency), 'Valuta ISO richiesta.');
  demand(
    Array.isArray(r.categoryIds) && r.categoryIds.length <= 23 &&
      r.categoryIds.every((id) => typeof id === 'string' && UUID.test(id)) &&
      new Set(r.categoryIds).size === r.categoryIds.length,
    'Categorie non valide.',
  );
  demand(Array.isArray(r.tags) && r.tags.length <= 50, 'Massimo 50 tag.');
  demand(Array.isArray(r.images) && r.images.length <= 20, 'Massimo 20 immagini.');
  const images = r.images.map((i: Record<string, unknown>) => {
    demand(i && typeof i === 'object', 'Immagine non valida.');
    const url = text(i.url, 'URL immagine', 2048, true);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new OperationalError('VALIDATION_ERROR', 'URL immagine non valido.');
    }
    demand(
      parsed.protocol === 'https:' && parsed.hostname === 'cdn.shopify.com' && !parsed.username &&
        !parsed.password,
      'Usare un’immagine già caricata su cdn.shopify.com.',
    );
    return { url, alt: text(i.alt, 'Testo alternativo', 250, true) };
  });
  demand(
    r.botanical && typeof r.botanical === 'object' && !Array.isArray(r.botanical) &&
      Object.keys(r.botanical).length <= 40,
    'Contenuti botanici non validi.',
  );
  demand(r.collectionIds===undefined || (Array.isArray(r.collectionIds) && r.collectionIds.length<=23 && r.collectionIds.every(id=>typeof id==='string' && /^gid:\/\/shopify\/Collection\/\d+$/.test(id)) && new Set(r.collectionIds).size===r.collectionIds.length),'Collezioni non valide.');
  return {
    ...(r.collectionIds!==undefined ? {collectionIds:r.collectionIds as string[]} : {}),
    title: text(r.title, 'Nome prodotto', 255, true),
    sku: familySku,
    description: text(r.description, 'Descrizione', 20000, true),
    currency: r.currency,
    vendor: text(r.vendor, 'Fornitore', 255),
    tags: r.tags.map((t) => text(t, 'Tag', 100, true)),
    categoryIds: r.categoryIds,
    variants,
    images,
    seoTitle: text(r.seoTitle, 'Titolo SEO', 70),
    seoDescription: text(r.seoDescription, 'Descrizione SEO', 320),
    botanical: r.botanical as Record<string, unknown>,
  };
}
export function categoryDiff(current: string[], proposed: string[], allowed: string[]) {
  demand(
    new Set(proposed).size === proposed.length && proposed.every((id) => allowed.includes(id)),
    'Categoria sconosciuta o non approvata.',
  );
  demand(current.every((id) => allowed.includes(id)),
    'Assegnazione interna non riconciliata: una categoria corrente non ha un mapping verificato.');
  return {
    add: proposed.filter((id) => !current.includes(id)).sort(),
    remove: current.filter((id) => !proposed.includes(id)).sort(),
    keep: proposed.filter((id) => current.includes(id)).sort(),
  };
}
export function canonicalMembershipAligned(
  internalGids: string[],
  shopifyGids: string[],
  canonicalGids: string[],
) {
  const ordered = (ids: string[]) => [...new Set(ids)].sort();
  return JSON.stringify(ordered(internalGids)) ===
    JSON.stringify(ordered(shopifyGids.filter((id) => canonicalGids.includes(id))));
}
export function verifyCreatedMapping(
  draft: ProductDraft,
  product: { id: string; status: string; variants: { id: string; sku: string }[] },
) {
  demand(
    /^gid:\/\/shopify\/Product\/\d+$/.test(product.id) && product.status === 'DRAFT',
    'Bozza Shopify non verificata.',
  );
  demand(
    product.variants.length === draft.variants.length &&
      new Set(product.variants.map((v) => v.id)).size === draft.variants.length,
    'Mapping varianti incompleto.',
  );
  return draft.variants.map((v) => {
    const matches = product.variants.filter((x) =>
      x.sku === v.sku && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(x.id)
    );
    demand(matches.length === 1, 'SKU Shopify non univoco: riconciliazione necessaria.');
    return { sku: v.sku, productGid: product.id, variantGid: matches[0].id };
  });
}
export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(
    /"/g,
    '&quot;',
  ).replace(/'/g, '&#39;');
}
