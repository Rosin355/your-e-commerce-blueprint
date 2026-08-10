/**
 * Test della logica di merge non distruttiva dell'import catalogo (Fase 0).
 *
 * Esecuzione:  npm run test:catalog
 * Usa il test runner integrato di Node (node:test) — nessuna dipendenza nuova.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCatalogRowPatch,
  hasSourceValue,
  mergeMetafields,
  PROTECTED_METAFIELD_KEYS,
} from "../../supabase/functions/_shared/product-catalog-merge.ts";

/** Riga DB realistica con campi manuali e arricchimento AI già presenti. */
const dbRow = () => ({
  sku: "ROSA-001",
  title: "Titolo vecchio",
  description: "Descrizione importata in precedenza",
  short_description: "",
  handle: "rosa-antica-climbing",
  vendor: "Online Garden",
  product_type: "Rose",
  parent_sku: null,
  price: 24.9,
  compare_at_price: null,
  barcode: null,
  weight_grams: 2500,
  inventory_quantity: 12,
  tags: ["rosa", "rampicante"],
  product_category: "Rose",
  product_category_id: null,
  image_urls: ["https://cdn.example.com/rosa-1.jpg"],
  metafields: {
    curiosita: "Varietà coltivata nei roseti storici inglesi.",
    ibridatore: "David Austin",
    colore_fiore: "rosa antico",
    nome_botanico: "Rosa 'Climbing Antica'",
    short_intro: "Rosa rampicante dal profumo intenso.",
  },
});

// ── TEST 1 ────────────────────────────────────────────────────────────────
test("TEST 1 — CSV senza metafield: l'oggetto metafields resta invariato", () => {
  const existing = dbRow();
  const source = { sku: "ROSA-001", title: "Titolo vecchio", metafields: null };

  const { payload } = buildCatalogRowPatch(source, existing);

  assert.deepEqual(payload.metafields, existing.metafields);
  assert.equal((payload.metafields as Record<string, unknown>).curiosita, existing.metafields.curiosita);
  assert.equal((payload.metafields as Record<string, unknown>).ibridatore, "David Austin");
  assert.equal((payload.metafields as Record<string, unknown>).colore_fiore, "rosa antico");
});

// ── TEST 2 ────────────────────────────────────────────────────────────────
test("TEST 2 — title source-controlled: un valore reale nel CSV aggiorna il DB", () => {
  const existing = dbRow();
  const source = { sku: "ROSA-001", title: "Titolo nuovo" };

  const { payload, plan } = buildCatalogRowPatch(source, existing);

  assert.equal(payload.title, "Titolo nuovo");
  assert.equal(plan.find((p) => p.field === "title")?.action, "UPDATE");
});

// ── TEST 3 ────────────────────────────────────────────────────────────────
test("TEST 3 — campo manuale 'curiosita' assente nel CSV: resta invariato", () => {
  const existing = dbRow();
  const source = { sku: "ROSA-001", metafields: { exposure: "pieno sole" } };

  const { payload, plan } = buildCatalogRowPatch(source, existing);
  const mf = payload.metafields as Record<string, unknown>;

  assert.equal(mf.curiosita, "Varietà coltivata nei roseti storici inglesi.");
  assert.equal(mf.exposure, "pieno sole", "la chiave sorgente nuova viene comunque aggiunta");
  assert.equal(plan.find((p) => p.field === "metafields")?.action, "PROTECTED");
});

test("TEST 3b — il CSV non può sovrascrivere una chiave manuale nemmeno se la contiene", () => {
  const existing = dbRow();
  const source = {
    sku: "ROSA-001",
    metafields: { ibridatore: "VALORE DAL CSV", curiosita: "sovrascrittura tentata" },
  };

  const mf = buildCatalogRowPatch(source, existing).payload.metafields as Record<string, unknown>;

  assert.equal(mf.ibridatore, "David Austin");
  assert.equal(mf.curiosita, "Varietà coltivata nei roseti storici inglesi.");
});

// ── TEST 4 ────────────────────────────────────────────────────────────────
test("TEST 4 — le colonne AI non sono mai nel payload dell'import", () => {
  const existing = { ...dbRow(), ai_enrichment_json: { generated: true }, ai_enriched_at: "2026-07-01T10:00:00Z", seo_title: "SEO esistente" };
  const source = { sku: "ROSA-001", title: "Titolo nuovo" };

  const { payload } = buildCatalogRowPatch(source, existing);

  for (const column of ["ai_enrichment_json", "ai_enriched_at", "ai_seed_style", "seo_title", "seo_description", "optimized_description"]) {
    assert.equal(column in payload, false, `${column} non deve comparire nel payload di import`);
  }
});

// ── TEST 5 ────────────────────────────────────────────────────────────────
test("TEST 5 — fallback tecnici vuoti non azzerano i dati esistenti", () => {
  const existing = dbRow();
  const source = {
    sku: "ROSA-001",
    metafields: {},          // il vecchio `row.metafields ?? {}`
    title: "",               // stringa vuota
    tags: [],                // array vuoto
    image_urls: [],          // array vuoto
    price: null,             // null
    description: undefined,  // assente
  };

  const { payload, plan } = buildCatalogRowPatch(source, existing);

  assert.deepEqual(payload.metafields, existing.metafields, "metafields non deve diventare {}");
  assert.equal(payload.title, "Titolo vecchio");
  assert.deepEqual(payload.tags, ["rosa", "rampicante"]);
  assert.deepEqual(payload.image_urls, ["https://cdn.example.com/rosa-1.jpg"]);
  assert.equal(payload.price, 24.9);
  assert.equal(payload.description, "Descrizione importata in precedenza");
  assert.equal(plan.find((p) => p.field === "title")?.action, "KEEP");
});

// ── TEST 6 ────────────────────────────────────────────────────────────────
test("TEST 6 — SKU mai esistito: creazione corretta", () => {
  const source = {
    sku: "NUOVO-001",
    title: "Prodotto nuovo",
    price: 12.5,
    tags: ["nuovo"],
    image_urls: ["https://cdn.example.com/nuovo.jpg"],
    metafields: { exposure: "mezz'ombra" },
  };

  const { payload, plan } = buildCatalogRowPatch(source, null);

  assert.equal(payload.sku, "NUOVO-001");
  assert.equal(payload.title, "Prodotto nuovo");
  assert.equal(payload.price, 12.5);
  assert.deepEqual(payload.metafields, { exposure: "mezz'ombra" });
  assert.equal(payload.description, null, "i campi assenti restano null su un record nuovo");
  assert.ok(plan.every((p) => p.action === "CREATE"));
});

// ── Helper ────────────────────────────────────────────────────────────────
test("hasSourceValue distingue assenza di dato da valore reale", () => {
  for (const empty of [null, undefined, "", "   ", [], {}, NaN]) {
    assert.equal(hasSourceValue(empty), false, `${JSON.stringify(empty)} deve valere "assente"`);
  }
  for (const real of ["x", 0, 12.5, ["a"], { k: 1 }, false]) {
    assert.equal(hasSourceValue(real), true, `${JSON.stringify(real)} deve valere "presente"`);
  }
});

test("mergeMetafields non rimuove mai chiavi esistenti", () => {
  const merged = mergeMetafields({ a: "1", b: "2" }, { b: "", c: "3" });
  assert.deepEqual(merged, { a: "1", b: "2", c: "3" });
});

test("tutte le chiavi manuali dichiarate sono effettivamente protette", () => {
  const existing = Object.fromEntries(PROTECTED_METAFIELD_KEYS.map((k) => [k, `db-${k}`]));
  const incoming = Object.fromEntries(PROTECTED_METAFIELD_KEYS.map((k) => [k, `csv-${k}`]));
  const merged = mergeMetafields(existing, incoming);
  for (const key of PROTECTED_METAFIELD_KEYS) {
    assert.equal(merged[key], `db-${key}`);
  }
});
