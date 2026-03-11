import type { CsvProductRow } from "./product-sync-types.ts";

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      continue;
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function toFloat(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toTags(value: string | undefined): string[] {
  return String(value || "")
    .split(/[,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toImageUrls(value: string | undefined): string[] {
  return String(value || "")
    .split(/[,|]/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

export function parseShopifyReadyCsv(text: string): CsvProductRow[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (!rows.length) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  const dataRows = rows.slice(1);
  const parsed: CsvProductRow[] = [];

  for (const cells of dataRows) {
    const mapped: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      mapped[headers[i]] = String(cells[i] || "").trim();
    }

    const sku = pick(mapped, "variant_sku", "sku", "variant_sku_1");
    if (!sku) continue;

    // Weight: WooCommerce uses kg, convert to grams
    let weight = toFloat(pick(mapped, "variant_grams", "weight", "variant_weight", "peso_(kg)"));
    const rawWeightKg = pick(mapped, "peso_(kg)");
    if (rawWeightKg && !pick(mapped, "variant_grams")) {
      const kg = toFloat(rawWeightKg);
      if (kg !== undefined) weight = Math.round(kg * 1000);
    }

    // Metafields from WooCommerce ACF meta columns
    const metaExposure = pick(mapped, "meta:_esposizione_pianta_acf", "meta:_esposizione_pianta", "esposizione");
    const metaSoil = pick(mapped, "meta:_tipo_terreno_acf", "meta:_tipo_terreno", "tipo_terreno");
    const metaWatering = pick(mapped, "meta:_irrigazione_acf", "meta:_irrigazione", "irrigazione");
    const metaPetSafe = pick(mapped, "meta:_tossicita_per_animali_acf", "meta:_tossicita_per_animali", "tossicita");
    const metaHeight = pick(mapped, "meta:_altezza_massima_pianta_acf", "meta:_altezza_massima_pianta", "altezza_massima");

    const hasMetafields = metaExposure || metaSoil || metaWatering || metaPetSafe || metaHeight;

    parsed.push({
      sku,
      title: pick(mapped, "title", "name", "nome"),
      description: pick(mapped, "body_html", "description", "body_(html)", "descrizione"),
      shortDescription: pick(mapped, "short_description", "breve_descrizione"),
      handle: pick(mapped, "handle", "slug", "permalink"),
      vendor: pick(mapped, "vendor", "marchi", "brand"),
      productType: pick(mapped, "type", "tipo"),
      parentSku: pick(mapped, "parent", "genitore", "parent_sku"),
      price: pick(mapped, "variant_price", "price", "regular_price", "prezzo_di_listino"),
      compareAtPrice: pick(mapped, "variant_compare_at_price", "compare_at_price", "sale_price", "prezzo_in_offerta"),
      barcode: pick(mapped, "variant_barcode", "barcode", "gtin,_upc,_ean,_o_isbn"),
      weight,
      inventoryQuantity: toInt(pick(mapped, "variant_inventory_qty", "inventory_quantity", "stock", "magazzino")),
      tags: toTags(pick(mapped, "tags", "tag")),
      productCategory: pick(mapped, "product_category", "category", "categorie", "categories"),
      productCategoryId: pick(mapped, "product_category_id", "category_gid"),
      imageUrls: toImageUrls(pick(mapped, "image_src", "images", "immagini", "immagine")),
      metafields: hasMetafields
        ? {
            exposure: metaExposure,
            soil: metaSoil,
            watering: metaWatering,
            petSafe: metaPetSafe,
            heightCm: metaHeight,
          }
        : undefined,
    });
  }

  return parsed;
}

export function mapCsvBySku(rows: CsvProductRow[]): Map<string, CsvProductRow> {
  const index = new Map<string, CsvProductRow>();
  for (const row of rows) {
    const sku = String(row.sku || "").trim();
    if (!sku) continue;
    index.set(sku, row);
  }
  return index;
}
