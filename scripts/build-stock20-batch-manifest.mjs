#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const LOCATION_ID = "gid://shopify/Location/117678014804";
const DENIED = new Set(["OG_393883", "OG_891874", "OG_758263", "OG_152965"]);

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 2) values[argv[i]] = argv[i + 1];
  const manifest = values["--manifest"];
  const inventory = values["--inventory"];
  const output = values["--output"];
  const batchId = values["--batch-id"];
  const limit = Number(values["--limit"] || 25);
  if (!manifest || !inventory || !output || !batchId) {
    throw new Error(
      "Uso: --manifest <3B1C.csv> --inventory <read-only.json> --output <batch.json> --batch-id <id> [--limit 25]",
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new Error("--limit deve essere compreso tra 1 e 25");
  }
  return { manifest, inventory, output, batchId, limit };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows.filter((values) => values.some(Boolean)).map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""]),
    )
  );
}

export function buildBatchManifest({ rows, inventoryRows, batchId, limit }) {
  const inventory = new Map(inventoryRows.map((row) => [row.sku, row]));
  const items = [];
  for (const row of rows) {
    if (items.length >= limit) break;
    if (
      row.action !== "UPDATE_EXISTING" || row.entity_type !== "simple" ||
      row.stock_target !== "20" || row.content_ready !== "YES" ||
      Number(row.price) <= 0 || row.block_reason || DENIED.has(row.sku)
    ) continue;
    const live = inventory.get(row.sku);
    if (!live) continue;
    const exactProductId = `gid://shopify/Product/${row.shopify_product_id}`;
    if (
      live.shopifyProductId !== exactProductId ||
      !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
        live.shopifyVariantId || "",
      ) ||
      !/^gid:\/\/shopify\/InventoryItem\/\d+$/.test(live.inventoryItemId || "")
    ) continue;
    items.push({
      sku: row.sku,
      shopifyProductId: live.shopifyProductId,
      shopifyVariantId: live.shopifyVariantId,
      inventoryItemId: live.inventoryItemId,
      locationId: LOCATION_ID,
      currentTracked: live.currentTracked ?? null,
      currentPolicy: live.currentPolicy ?? null,
      currentAvailable: live.currentAvailable ?? null,
      targetAvailable: 20,
      readiness: "READY_FOR_SALE",
      structureStatus: "UPDATE_EXISTING",
    });
  }
  if (items.length === 0) {
    throw new Error(
      "Nessun target verificabile: integrare il read-only inventory export Lovable",
    );
  }
  return {
    schemaVersion: "3B.1G-v1",
    sourceManifest: "3B.1C",
    batchId,
    items,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const rows = parseCsv(readFileSync(args.manifest, "utf8"));
  const inventoryRows = JSON.parse(readFileSync(args.inventory, "utf8"));
  if (!Array.isArray(inventoryRows)) {
    throw new Error("Inventory JSON deve essere un array");
  }
  const result = buildBatchManifest({ rows, inventoryRows, ...args });
  writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    `Manifest creato: ${result.items.length} target (nessuna chiamata Shopify)`,
  );
}
