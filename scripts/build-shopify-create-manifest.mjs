#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv } from "./build-stock20-batch-manifest.mjs";

const DENIED_ROOTS = new Set([
  "OG_393883",
  "OG_152965",
  "OG_891874",
  "OG_758263",
]);
const MAX_FAMILIES = 10;

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    values[argv[index]] = argv[index + 1];
  }
  const manifest = values["--manifest"];
  const content = values["--content"];
  const output = values["--output"];
  const batchId = values["--batch-id"];
  const limit = Number(values["--limit"] || MAX_FAMILIES);
  if (!manifest || !content || !output || !batchId) {
    throw new Error(
      "Uso: --manifest <3B1C.csv> --content <approved.json> --output <private.json> --batch-id <id> [--limit 10]",
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_FAMILIES) {
    throw new Error("--limit deve essere compreso tra 1 e 10 famiglie");
  }
  return { manifest, content, output, batchId, limit };
}

function rootSku(sku) {
  return String(sku || "").toUpperCase().replace(/[-_]\d+$/, "");
}

function denied(sku) {
  const normalized = String(sku || "").toUpperCase();
  return DENIED_ROOTS.has(normalized) ||
    DENIED_ROOTS.has(rootSku(normalized)) ||
    /^TEST(?:[-_]|$)/.test(normalized);
}

function validPrice(value) {
  return /^\d+(?:\.\d{1,2})?$/.test(String(value || "")) &&
    Number(value) > 0;
}

function approvedContent(entry) {
  return entry && entry.title?.trim() && entry.descriptionHtml?.trim() &&
    ["ORIGINAL", "MANUAL"].includes(entry.descriptionSource) &&
    Array.isArray(entry.publishBlockedFields) &&
    entry.publishBlockedFields.length === 0;
}

function parentEligible(row) {
  return row.action === "CREATE_VARIABLE_PARENT" &&
    row.entity_type === "variable" &&
    row.current_shopify_structure === "NOT_PRESENT" &&
    row.target_shopify_structure === "PARENT_PRODUCT" &&
    row.content_ready === "YES" && row.image_ready === "YES" &&
    !row.shopify_product_id && !row.shopify_variant_id && !row.block_reason;
}

function variantEligible(row, parentSku) {
  return row.action === "CREATE_VARIANT" &&
    row.entity_type === "variation" && row.parent_sku === parentSku &&
    row.current_shopify_structure === "NOT_PRESENT" &&
    row.target_shopify_structure === `VARIANT_OF_${parentSku}` &&
    row.content_ready === "YES" &&
    ["YES", "INHERIT_PARENT"].includes(row.image_ready) &&
    !row.shopify_product_id && !row.shopify_variant_id &&
    !row.block_reason && row.stock_target === "20";
}

export function summarizeCreateScope(rows) {
  return {
    createParents:
      rows.filter((row) => row.action === "CREATE_VARIABLE_PARENT").length,
    createVariants:
      rows.filter((row) => row.action === "CREATE_VARIANT").length,
    restructure:
      rows.filter((row) => row.action === "RESTRUCTURE_REQUIRED").length,
    skipped: rows.filter((row) => row.action === "SKIP").length,
  };
}

export function buildCreateManifest({ rows, contentRows, batchId, limit }) {
  const summary = summarizeCreateScope(rows);
  const content = new Map(contentRows.map((entry) => [entry.sku, entry]));
  const variantsByParent = new Map();
  for (const row of rows) {
    if (row.action !== "CREATE_VARIANT" || !row.parent_sku) continue;
    const list = variantsByParent.get(row.parent_sku) || [];
    list.push(row);
    variantsByParent.set(row.parent_sku, list);
  }
  const families = [];
  const blocked = [];
  for (const row of rows) {
    if (families.length >= limit) break;
    if (
      !parentEligible(row) || denied(row.sku)
    ) continue;
    const parent = content.get(row.sku);
    const childRows = variantsByParent.get(row.sku) || [];
    if (!approvedContent(parent) || childRows.length === 0) {
      blocked.push({ sku: row.sku, reason: "CONTENT_OR_VARIANTS_MISSING" });
      continue;
    }
    const variants = [];
    let invalid = false;
    for (const childRow of childRows) {
      const child = content.get(childRow.sku);
      if (
        !variantEligible(childRow, row.sku) || denied(childRow.sku) ||
        !validPrice(childRow.price) ||
        !child || !Array.isArray(child.optionValues) ||
        child.optionValues.length === 0
      ) {
        invalid = true;
        blocked.push({
          sku: row.sku,
          reason: `INVALID_VARIANT:${childRow.sku}`,
        });
        break;
      }
      variants.push({
        internalProductId: child.internalProductId,
        sku: childRow.sku,
        parentSku: row.sku,
        entityType: "variation",
        action: "CREATE_VARIANT",
        price: String(childRow.price),
        optionValues: child.optionValues,
        shopifyVariantId: null,
        stockTarget: 20,
        readiness: "READY_FOR_SALE",
        structureStatus: "CREATE_NEW",
      });
    }
    if (invalid) continue;
    const media = Array.isArray(parent.media)
      ? parent.media.filter((entry) => entry?.approved === true)
      : [];
    if (media.length === 0) {
      blocked.push({ sku: row.sku, reason: "APPROVED_MEDIA_MISSING" });
      continue;
    }
    families.push({
      internalProductId: parent.internalProductId,
      parentSku: row.sku,
      entityType: "variable",
      action: "CREATE_VARIABLE_PARENT",
      title: parent.title,
      descriptionHtml: parent.descriptionHtml,
      descriptionSource: parent.descriptionSource,
      handle: parent.handle,
      shopifyProductId: null,
      optionNames: parent.optionNames,
      variants,
      media,
      mediaStatus: "APPROVED",
      publicationIntent: parent.publicationIntent || "CREATE_DRAFT",
      publishBlockedFields: parent.publishBlockedFields,
      stockTarget: 20,
      readiness: "READY_FOR_SALE",
      structureStatus: "CREATE_NEW",
    });
  }
  return {
    manifest: {
      schemaVersion: "3B.2-v1",
      sourceManifest: "3B.1C",
      batchId,
      families,
    },
    summary: { ...summary, selectedFamilies: families.length, blocked },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const rows = parseCsv(readFileSync(args.manifest, "utf8"));
  const parsed = JSON.parse(readFileSync(args.content, "utf8"));
  const contentRows = Array.isArray(parsed) ? parsed : parsed.products;
  if (!Array.isArray(contentRows)) {
    throw new Error("Il content export deve essere un array o {products: []}");
  }
  const result = buildCreateManifest({ rows, contentRows, ...args });
  if (result.manifest.families.length === 0) {
    throw new Error("Nessuna famiglia CREATE sicura e completa");
  }
  writeFileSync(args.output, `${JSON.stringify(result.manifest, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  console.log(JSON.stringify(result.summary));
}
