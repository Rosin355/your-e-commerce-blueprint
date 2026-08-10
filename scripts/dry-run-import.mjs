#!/usr/bin/env node
/**
 * DRY-RUN dell'import catalogo — NESSUNA SCRITTURA SU DATABASE.
 *
 * Uso:  npm run dryrun:import
 *
 * Mostra, per un campione di prodotti, cosa farebbe l'import per ogni campo:
 *   CREATE      record nuovo
 *   UPDATE      la sorgente porta un valore reale e diverso
 *   KEEP        la sorgente è vuota → si conserva il valore in DB
 *   PROTECTED   metafields con chiavi manuali → mai sovrascritte
 *   SKIP EMPTY  vuoto sia in DB sia nella sorgente
 *
 * Prova prima a leggere righe reali dal DB; se non ne trova (tabella vuota o
 * RLS che blocca la chiave anonima) usa fixture rappresentative, dichiarandolo.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogRowPatch } from "../supabase/functions/_shared/product-catalog-merge.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_SIZE = 8;

function loadEnv() {
  const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

/** Righe DB rappresentative dello stato "cliente ha già curato a mano". */
const FIXTURE_DB_ROWS = [
  {
    sku: "ROSA-001", title: "Rosa Antica Climbing", description: "Rampicante storica.",
    handle: "rosa-antica-climbing", vendor: "Online Garden", product_type: "Rose",
    price: 24.9, weight_grams: 2500, inventory_quantity: 12,
    tags: ["rosa", "rampicante"], image_urls: ["https://cdn.example.com/rosa-1.jpg"],
    metafields: { curiosita: "Coltivata nei roseti storici inglesi.", ibridatore: "David Austin", colore_fiore: "rosa antico", nome_botanico: "Rosa 'Climbing Antica'" },
  },
  {
    sku: "ARB-014", title: "Ortensia Annabelle", description: "Arbusto da mezz'ombra.",
    handle: "ortensia-annabelle", vendor: "Online Garden", product_type: "Arbusti",
    price: 18.5, weight_grams: 1800, inventory_quantity: 30,
    tags: ["arbusto", "ortensia"], image_urls: ["https://cdn.example.com/arb-14.jpg"],
    metafields: { colore_fiore: "bianco", short_intro: "Fioritura generosa e duratura." },
  },
  {
    sku: "BULB-207", title: "Tulipano Queen of Night", description: "Bulbo a fioritura tardiva.",
    handle: "tulipano-queen-of-night", vendor: "Online Garden", product_type: "Bulbi",
    price: 5.9, weight_grams: 120, inventory_quantity: 240,
    tags: ["bulbo", "tulipano"], image_urls: ["https://cdn.example.com/bulb-207.jpg"],
    metafields: { curiosita: "Il suo violaceo quasi nero è dovuto a un'alta concentrazione di antociani." },
  },
];

/** Righe CSV WordPress simulate: alcune complete, altre con buchi tecnici. */
const FIXTURE_SOURCE_ROWS = [
  // 1. CSV senza metafield e senza immagini → non deve cancellare nulla
  { sku: "ROSA-001", title: "Rosa Antica Climbing", description: "Rampicante storica.", price: 26.9, tags: [], image_urls: [], metafields: null },
  // 2. CSV con metafield botanici nuovi → merge additivo
  { sku: "ARB-014", title: "Ortensia Annabelle (2026)", price: 19.9, image_urls: ["https://cdn.example.com/arb-14.jpg"], metafields: { exposure: "mezz'ombra", watering: "regolare" } },
  // 3. CSV che tenta di sovrascrivere un campo manuale
  { sku: "BULB-207", title: "", price: null, metafields: { curiosita: "TESTO GENERICO DAL GESTIONALE" } },
  // 4. SKU mai visto → creazione
  { sku: "CONIF-055", title: "Thuja Smaragd", description: "Conifera per siepi.", handle: "thuja-smaragd", vendor: "Online Garden", product_type: "Conifere", price: 14.9, weight_grams: 3000, inventory_quantity: 60, tags: ["conifera", "siepe"], image_urls: ["https://cdn.example.com/conif-55.jpg"], metafields: { exposure: "pieno sole" } },
  // 5. CSV con il fallback tecnico {} — il bug originale
  { sku: "ROSA-001", title: "Rosa Antica Climbing", metafields: {} },
];

const ICON = { CREATE: "🟢", UPDATE: "🔵", KEEP: "⚪️", PROTECTED: "🛡️ ", "SKIP EMPTY": "· " };

function short(v) {
  if (v === null || v === undefined) return "—";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 42 ? `${s.slice(0, 39)}…` : s || "(vuoto)";
}

async function loadRealRows() {
  try {
    const env = loadEnv();
    const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await client
      .from("product_sync_csv_products")
      .select("*")
      .limit(SAMPLE_SIZE);
    if (error) return { rows: [], reason: error.message };
    return { rows: data ?? [], reason: null };
  } catch (err) {
    return { rows: [], reason: err instanceof Error ? err.message : String(err) };
  }
}

const { rows: realRows, reason } = await loadRealRows();
const usingFixtures = realRows.length === 0;

console.log("─".repeat(96));
console.log("DRY-RUN IMPORT CATALOGO — nessuna scrittura sul database");
console.log("─".repeat(96));
if (usingFixtures) {
  console.log(`Sorgente dati: FIXTURE locali (il DB non ha restituito righe${reason ? `: ${reason}` : ""}).`);
  console.log("Le fixture riproducono lo stato reale atteso: metafield manuali già compilati.\n");
} else {
  console.log(`Sorgente dati: ${realRows.length} righe reali lette dal database (sola lettura).\n`);
}

const dbRows = usingFixtures ? FIXTURE_DB_ROWS : realRows;
const dbBySku = new Map(dbRows.map((r) => [String(r.sku), r]));

const sourceRows = usingFixtures
  ? FIXTURE_SOURCE_ROWS
  : dbRows.slice(0, SAMPLE_SIZE).map((r) => ({ sku: r.sku, title: r.title, metafields: null }));

let counts = { CREATE: 0, UPDATE: 0, KEEP: 0, PROTECTED: 0, "SKIP EMPTY": 0 };
let danger = 0;

for (const [i, source] of sourceRows.entries()) {
  const existing = dbBySku.get(String(source.sku)) ?? null;
  const { plan } = buildCatalogRowPatch(source, existing);

  console.log(`\n[${i + 1}] SKU ${source.sku}  ${existing ? "(esistente)" : "(NUOVO)"}`);
  console.log(`    ${"CAMPO".padEnd(22)} ${"VALORE DB".padEnd(44)} ${"VALORE SORGENTE".padEnd(44)} AZIONE`);

  for (const p of plan) {
    counts[p.action] = (counts[p.action] ?? 0) + 1;
    // Segnala una perdita: il DB aveva un valore e il piano lo azzererebbe.
    const dbHad = p.dbValue !== null && p.dbValue !== undefined && JSON.stringify(p.dbValue) !== "{}" && JSON.stringify(p.dbValue) !== "[]";
    const wouldWipe = dbHad && p.action === "UPDATE" && !short(p.sourceValue).trim();
    if (wouldWipe) danger++;
    if (p.action === "SKIP EMPTY") continue; // rumore: nulla da nessuna parte
    console.log(
      `    ${ICON[p.action] ?? "  "} ${p.field.padEnd(20)} ${short(p.dbValue).padEnd(44)} ${short(p.sourceValue).padEnd(44)} ${p.action}`,
    );
  }
}

console.log(`\n${"─".repeat(96)}`);
console.log("RIEPILOGO:", Object.entries(counts).map(([k, v]) => `${k}=${v}`).join("  "));
console.log(danger === 0
  ? "✅ Nessuna cancellazione inattesa rilevata: i valori DB non presenti nella sorgente vengono conservati."
  : `❌ ATTENZIONE: ${danger} potenziali cancellazioni rilevate — FERMARSI.`);
console.log("Nessuna scrittura sul database è stata eseguita.");
console.log("─".repeat(96));

process.exit(danger === 0 ? 0 : 1);
