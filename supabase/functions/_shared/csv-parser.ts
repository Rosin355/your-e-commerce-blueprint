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
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toImageUrls(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
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

    parsed.push({
      sku,
      title: pick(mapped, "title", "name"),
      description: pick(mapped, "body_html", "description", "body_(html)"),
      price: pick(mapped, "variant_price", "price", "regular_price"),
      compareAtPrice: pick(mapped, "variant_compare_at_price", "compare_at_price", "sale_price"),
      barcode: pick(mapped, "variant_barcode", "barcode"),
      weight: toFloat(pick(mapped, "variant_grams", "weight", "variant_weight")),
      inventoryQuantity: toInt(pick(mapped, "variant_inventory_qty", "inventory_quantity", "stock")),
      tags: toTags(pick(mapped, "tags")),
      productCategory: pick(mapped, "product_category", "category"),
      productCategoryId: pick(mapped, "product_category_id", "category_gid"),
      imageUrls: toImageUrls(pick(mapped, "image_src", "images")),
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
