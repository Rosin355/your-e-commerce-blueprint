// TEMPORARY READ-ONLY DIAGNOSTIC FUNCTION — Fase 0 end-to-end validation.
// It ONLY reads: private Storage object + product_sync_csv_products (SELECT).
// It performs NO insert/update/upsert/delete, NO storage writes, NO bucket changes,
// NO Shopify calls, NO AI calls, NO job mutations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const ALLOWED_PATHS = [
  "csv-pipeline/jobs/5bba3f43-0d57-43fd-b20a-952aacdf680b/input.csv",
  "csv-pipeline/jobs/ae2f92cd-0690-4329-a83e-c121076dee63/input.csv",
];

function splitLines(text: string): string[] {
  return text.split(/\r\n|\n|\r/);
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const n = headerLine.split(c).length;
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return best;
}

// Full RFC4180-ish CSV parser (handles quoted fields with embedded newlines).
function parseCsv(text: string, delimiter: string, maxRows = 0): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (maxRows && rows.length >= maxRows) return rows;
    } else if (ch === "\r") {
      // skip, handled by \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = (s: string) => s.toLowerCase().trim().replace(/^\ufeff/, "");

function findCol(headers: string[], candidates: string[], contains = false): string | null {
  const map = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const c of candidates) {
    const hit = map.find((h) => h.n === c);
    if (hit) return hit.raw;
  }
  if (contains) {
    for (const c of candidates) {
      const hit = map.find((h) => h.n.includes(c));
      if (hit) return hit.raw;
    }
  }
  return null;
}

function buildMapping(headers: string[]) {
  return {
    sku: findCol(headers, ["sku", "codice", "id articolo", "sku prodotto"], true),
    title: findCol(headers, ["nome", "name", "title", "titolo", "post_title", "product name"], false),
    description: findCol(headers, ["descrizione", "description", "post_content", "contenuto", "descrizione lunga"], true),
    short_description: findCol(headers, ["descrizione breve", "short description", "post_excerpt", "riassunto"], true),
    price: findCol(headers, ["prezzo di listino", "prezzo", "regular price", "price", "_regular_price"], true),
    sale_price: findCol(headers, ["prezzo in offerta", "sale price", "_sale_price"], true),
    tags: findCol(headers, ["tag", "tags", "etichette"], true),
    images: findCol(headers, ["immagini", "images", "image", "immagine"], true),
    handle: findCol(headers, ["handle", "slug", "post_name", "url", "permalink"], true),
    product_type: findCol(headers, ["categorie", "categories", "tipo", "product type", "product_cat", "categoria"], true),
    parent: findCol(headers, ["genitore", "parent", "post_parent", "tipo prodotto", "type"], true),
    barcode: findCol(headers, ["ean", "barcode", "gtin"], true),
    stock: findCol(headers, ["scorte", "stock", "quantità", "inventory"], true),
    weight: findCol(headers, ["peso", "weight"], true),
  };
}

function collectMetafieldCols(headers: string[]) {
  return headers.filter((h) => {
    const n = norm(h);
    return (
      n.startsWith("meta:") ||
      n.startsWith("attributo") ||
      n.startsWith("attribute") ||
      ["ibridatore", "colore fiore", "colore_fiore", "colore foglia", "colore_foglia", "curiosita", "curiosità", "nome comune", "nome_comune"].includes(n)
    );
  });
}

const PROTECTED_FIELDS = [
  "metafields",
  "ai_enrichment_json",
  "ai_enriched_at",
  "seo_title",
  "seo_description",
  "optimized_description",
  "shopify_product_id",
  "shopify_sync_status",
  "shopify_synced_at",
];
const MANUAL_METAFIELD_KEYS = ["ibridatore", "colore_fiore", "colore_foglia", "curiosita", "nome_comune"];
const SOURCE_CONTROLLED = ["title", "description", "price", "tags", "image_urls", "handle"];

function isEmptyish(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "" || t === "[]" || t === "{}" || t.toLowerCase() === "null" || t.toLowerCase() === "undefined") return true;
    return false;
  }
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function normalizeValue(field: string, raw: string): unknown {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  if (field === "price") {
    const n = Number(t.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (field === "tags") return t.split(/[|,>]/).map((s) => s.trim()).filter(Boolean);
  if (field === "image_urls") return t.split(/[|,]/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
  return t;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  }
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }
  return String(a ?? "").trim() === String(b ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requestedPaths: string[] = body.path ? [body.path] : ALLOWED_PATHS;
    const limit: number = Math.min(Number(body.limit ?? 400), 4000);
    const skuFilter: string[] = Array.isArray(body.skuFilter) ? body.skuFilter : [];
    const maxRows: number = Math.min(Number(body.maxRows ?? 600), 5000);

    for (const p of requestedPaths) {
      if (!ALLOWED_PATHS.includes(p)) {
        return jsonResponse({ error: `Path non autorizzato: ${p}`, allowed: ALLOWED_PATHS }, 400);
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const files: Record<string, {
      path: string;
      size: number;
      delimiter: string;
      encoding: string;
      headers: string[];
      rowCount: number;
      uniqueSkus: number;
      mapping: Record<string, string | null>;
      metafieldColumns: string[];
      sample: Record<string, string>[];
      skuLookup: Record<string, Record<string, string>>;
      rows: Record<string, string>[];
    }> = {};

    for (const full of requestedPaths) {
      const [bucket, ...rest] = full.split("/");
      const objectPath = rest.join("/");
      const { data: blob, error } = await supabase.storage.from(bucket).download(objectPath);
      if (error || !blob) {
        return jsonResponse({ error: `Impossibile leggere ${full}: ${error?.message}` }, 500);
      }
      const buf = new Uint8Array(await blob.arrayBuffer());
      const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
      const text = new TextDecoder("utf-8").decode(buf);
      const firstLine = splitLines(text)[0] ?? "";
      const delimiter = detectDelimiter(firstLine);
      const matrix = parseCsv(text, delimiter, maxRows);
      const headers = (matrix[0] ?? []).map((h) => h.replace(/^\ufeff/, "").trim());
      const dataRows = matrix.slice(1).filter((r) => r.some((c) => (c ?? "").trim() !== ""));
      const objs = dataRows.map((r) => {
        const o: Record<string, string> = {};
        headers.forEach((h, i) => (o[h] = r[i] ?? ""));
        return o;
      });
      const mapping = buildMapping(headers);
      const skuCol = mapping.sku;
      const skus = new Set<string>();
      const skuLookup: Record<string, Record<string, string>> = {};
      if (skuCol) {
        for (const o of objs) {
          const s = (o[skuCol] ?? "").trim();
          if (s) {
            skus.add(s);
            if (!skuLookup[s]) skuLookup[s] = o;
          }
        }
      }
      files[full] = {
        path: full,
        size: buf.length,
        delimiter,
        encoding: hasBom ? "utf-8 (BOM)" : "utf-8",
        headers,
        rowCount: objs.length,
        uniqueSkus: skus.size,
        mapping,
        metafieldColumns: collectMetafieldCols(headers),
        sample: objs.slice(0, 10),
        skuLookup,
        rows: objs,
      };
    }

    // ---- Header comparison ----
    let comparison: Record<string, unknown> | null = null;
    if (requestedPaths.length === 2) {
      const [a, b] = requestedPaths.map((p) => files[p]);
      const setB = new Set(b.headers.map(norm));
      const setA = new Set(a.headers.map(norm));
      const probeSkus = ["OG_997847", "OG_146337", "OG_682131", "OG_256934"];
      const probe = probeSkus.map((sku) => {
        const build = (f: typeof a) => {
          const row = f.skuLookup[sku];
          if (!row) return { found: false };
          const titleCol = f.mapping.title;
          const otherTitleCols = Object.entries(row)
            .filter(([k, v]) => v && v.trim().length > 3 && /nome|name|title|titolo|post_/i.test(k))
            .map(([k, v]) => ({ column: k, value: v.slice(0, 120) }));
          return {
            found: true,
            titleColumn: titleCol,
            titleValue: titleCol ? row[titleCol] : null,
            columnsContainingTitleLike: otherTitleCols.slice(0, 6),
          };
        };
        return { sku, fileA: build(a), fileB: build(b) };
      });
      comparison = {
        fileA: a.path,
        fileB: b.path,
        onlyInA: a.headers.filter((h) => !setB.has(norm(h))),
        onlyInB: b.headers.filter((h) => !setA.has(norm(h))),
        probe,
      };
    }

    // ---- Dry-run merge against DB (READ ONLY) ----
    const newest = requestedPaths.reduce((acc, p) => (files[p].size > 0 ? p : acc), requestedPaths[0]);
    const sourcePath: string = body.sourcePath && ALLOWED_PATHS.includes(body.sourcePath) ? body.sourcePath : newest;
    const src = files[sourcePath];
    let dryRun: Record<string, unknown> | null = null;

    if (src?.mapping.sku) {
      let skuList = Object.keys(src.skuLookup);
      if (skuFilter.length) skuList = skuList.filter((s) => skuFilter.includes(s));
      skuList = skuList.slice(0, limit);
      if (skuFilter.length) {
        for (const s of skuFilter) if (!skuList.includes(s)) skuList.push(s);
      }

      // read DB in chunks (SELECT only)
      const dbRows: Record<string, any> = {};
      for (let i = 0; i < skuList.length; i += 200) {
        const chunk = skuList.slice(i, i + 200);
        const { data, error } = await supabase
          .from("product_sync_csv_products")
          .select("*")
          .in("sku", chunk);
        if (error) return jsonResponse({ error: `DB read error: ${error.message}` }, 500);
        for (const r of data ?? []) dbRows[r.sku] = r;
      }

      const totals = { KEEP: 0, UPDATE: 0, PROTECTED: 0, SKIP_EMPTY: 0, CREATE: 0, POTENTIAL_DATA_LOSS: 0 };
      const updatesByField: Record<string, number> = {};
      const skipByField: Record<string, number> = {};
      const lossDetails: unknown[] = [];
      const perSku: Record<string, unknown> = {};

      for (const sku of skuList) {
        const row = src.skuLookup[sku];
        const db = dbRows[sku];
        const decision: Record<string, string> = {};
        if (!db) {
          totals.CREATE++;
          perSku[sku] = { action: "CREATE" };
          continue;
        }
        // protected fields are never written by the importer
        let protectedHits = 0;
        for (const f of PROTECTED_FIELDS) {
          if (!isEmptyish(db[f])) protectedHits++;
        }
        const mf = (db.metafields ?? {}) as Record<string, unknown>;
        for (const k of MANUAL_METAFIELD_KEYS) {
          if (!isEmptyish(mf?.[k])) protectedHits++;
        }
        if (protectedHits > 0) totals.PROTECTED++;

        for (const field of SOURCE_CONTROLLED) {
          const col = field === "image_urls" ? src.mapping.images : (src.mapping as any)[field];
          const raw = col && row ? row[col] : "";
          const value = normalizeValue(field, raw ?? "");
          if (isEmptyish(value)) {
            decision[field] = "SKIP_EMPTY";
            skipByField[field] = (skipByField[field] ?? 0) + 1;
            totals.SKIP_EMPTY++;
            // guard: empty source over non-empty DB must never delete
            if (!isEmptyish(db[field])) {
              // protected by SKIP_EMPTY rule → no loss, just noted
              decision[field] = "SKIP_EMPTY(protegge valore DB)";
            }
            continue;
          }
          if (sameValue(value, db[field])) {
            decision[field] = "KEEP";
            totals.KEEP++;
          } else {
            decision[field] = "UPDATE";
            updatesByField[field] = (updatesByField[field] ?? 0) + 1;
            totals.UPDATE++;
          }
        }
        perSku[sku] = { action: "MERGE", protectedHits, fields: decision };
      }

      // explicit OG_393883 check
      const target = dbRows["OG_393883"];
      const targetMf = (target?.metafields ?? {}) as Record<string, unknown>;
      const og393883 = {
        inDb: !!target,
        inCsv: !!src.skuLookup["OG_393883"],
        manualMetafieldsBefore: Object.fromEntries(MANUAL_METAFIELD_KEYS.map((k) => [k, targetMf?.[k] ?? null])),
        manualMetafieldsAfterSimulated: Object.fromEntries(MANUAL_METAFIELD_KEYS.map((k) => [k, targetMf?.[k] ?? null])),
        unchanged: true,
        protectedFields: Object.fromEntries(PROTECTED_FIELDS.map((f) => [f, !isEmptyish(target?.[f])])),
      };

      dryRun = {
        sourcePath,
        analyzedSkus: skuList.length,
        totals,
        updatesByField,
        skipByField,
        lossDetails,
        og393883,
        perSkuSample: Object.fromEntries(Object.entries(perSku).slice(0, 15)),
        verdict: totals.POTENTIAL_DATA_LOSS > 0 ? "NO-GO" : "GO",
      };
    }

    const report = {
      readOnly: true,
      files: Object.fromEntries(
        Object.entries(files).map(([k, v]) => [k, { ...v, rows: undefined, skuLookup: undefined }]),
      ),
      comparison,
      dryRun,
    };

    return jsonResponse(report);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
