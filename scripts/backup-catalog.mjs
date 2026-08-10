#!/usr/bin/env node
/**
 * Backup READ-ONLY delle tabelle catalogo/import prodotto.
 *
 * Uso:  node scripts/backup-catalog.mjs
 *
 * Scrive in  backups/<timestamp>/  :
 *   - <tabella>.json   dump integrale (array di righe, ogni colonna)
 *   - <tabella>.csv    stessa cosa in formato leggibile (JSON annidato serializzato)
 *   - manifest.json    conteggi, checksum sha256, verifica righe DB vs esportate
 *
 * Non esegue MAI scritture. I backup precedenti non vengono toccati.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const TABLES = [
  "product_sync_csv_products",
  "product_ai_drafts",
  "product_enrichment_runs",
  "product_enrichment_run_items",
  "pipeline_jobs",
  "product_sync_jobs",
];

/** Colonne di cui verificare esplicitamente la presenza nel backup del catalogo. */
const CRITICAL_COLUMNS = [
  "sku", "handle", "title", "description",
  "seo_title", "seo_description", "optimized_description",
  "metafields", "ai_enrichment_json", "ai_enriched_at",
  "shopify_product_id", "shopify_sync_status", "shopify_synced_at",
  "image_urls", "price", "tags",
];

const MANUAL_METAFIELD_KEYS = ["ibridatore", "colore_fiore", "colore_foglia", "curiosita", "nome_comune"];

function toCsv(rows) {
  if (!rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

async function fetchAll(client, table) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("[FATAL] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY mancanti in .env");
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false } });

  const startedAt = new Date().toISOString();
  const stamp = startedAt.replace(/[:.]/g, "-");
  const outDir = resolve(ROOT, "backups", stamp);
  mkdirSync(outDir, { recursive: true });

  const manifest = {
    created_at: startedAt,
    supabase_url: url,
    note: "Backup read-only pre Fase 0 (patch upsert import). Nessuna scrittura eseguita.",
    tables: {},
  };

  for (const table of TABLES) {
    const entry = { status: "ok", rows_exported: 0, rows_in_db: null, files: {} };
    try {
      const { count, error: countErr } = await client
        .from(table)
        .select("*", { count: "exact", head: true });
      if (countErr) throw new Error(countErr.message);
      entry.rows_in_db = count ?? null;

      const rows = await fetchAll(client, table);
      entry.rows_exported = rows.length;
      entry.columns = rows.length ? [...new Set(rows.flatMap((r) => Object.keys(r)))].sort() : [];

      const json = JSON.stringify(rows, null, 2);
      const csv = toCsv(rows);
      const jsonPath = resolve(outDir, `${table}.json`);
      const csvPath = resolve(outDir, `${table}.csv`);
      writeFileSync(jsonPath, json);
      writeFileSync(csvPath, csv);

      entry.files.json = { name: `${table}.json`, bytes: Buffer.byteLength(json), sha256: createHash("sha256").update(json).digest("hex") };
      entry.files.csv = { name: `${table}.csv`, bytes: Buffer.byteLength(csv), sha256: createHash("sha256").update(csv).digest("hex") };
      entry.count_matches = entry.rows_in_db === null || entry.rows_in_db === entry.rows_exported;

      if (table === "product_sync_csv_products") {
        entry.critical_columns_present = CRITICAL_COLUMNS.filter((c) => entry.columns.includes(c));
        entry.critical_columns_missing = CRITICAL_COLUMNS.filter((c) => !entry.columns.includes(c));
        const withMf = rows.filter((r) => r.metafields && Object.keys(r.metafields).length > 0);
        entry.rows_with_metafields = withMf.length;
        entry.rows_with_ai_enrichment = rows.filter((r) => !!r.ai_enrichment_json).length;
        entry.manual_field_samples = {};
        for (const k of MANUAL_METAFIELD_KEYS) {
          const hits = rows.filter((r) => {
            const v = r.metafields?.[k];
            return typeof v === "string" && v.trim().length > 0;
          });
          entry.manual_field_samples[k] = { count: hits.length, sample_skus: hits.slice(0, 3).map((r) => r.sku) };
        }
      }
      console.log(`[OK]   ${table.padEnd(32)} ${entry.rows_exported} righe (db: ${entry.rows_in_db})`);
    } catch (err) {
      entry.status = "error";
      entry.error = err instanceof Error ? err.message : String(err);
      console.log(`[SKIP] ${table.padEnd(32)} ${entry.error.slice(0, 80)}`);
    }
    manifest.tables[table] = entry;
  }

  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileSync(resolve(outDir, "manifest.json"), manifestJson);
  console.log(`\nBackup completato in: backups/${stamp}/`);
  console.log(`Manifest sha256: ${createHash("sha256").update(manifestJson).digest("hex").slice(0, 16)}…`);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
