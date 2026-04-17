#!/usr/bin/env node
/*
 * Verifica che TUTTE e 18 le metafield definitions del PDP siano raggiungibili
 * via Storefront API per un prodotto.
 *
 * Usage:
 *   node scripts/check-product-metafields.mjs            # usa il primo prodotto disponibile
 *   node scripts/check-product-metafields.mjs <handle>   # usa l'handle specificato
 *
 * Env (override rispetto a .env):
 *   SHOPIFY_STOREFRONT_DOMAIN         default: ecom-blueprint-gen-6ud1s.myshopify.com
 *   SHOPIFY_STOREFRONT_TOKEN          public storefront access token
 *   SHOPIFY_API_VERSION               default: 2025-07
 *
 * Exit codes:
 *   0 = query completata (metafield possono comunque essere null/missing)
 *   1 = errore di rete / GraphQL / args invalidi
 *   2 = nessun prodotto trovato
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(rootDir, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      process.env[key] = value;
    }
  } catch {
    /* .env missing is OK */
  }
}

loadDotEnv();

const DEFAULT_DOMAIN = "ecom-blueprint-gen-6ud1s.myshopify.com";
const DEFAULT_TOKEN = "713f230dc12508e20c6128d287808360";
const DEFAULT_API_VERSION = "2025-07";

const domain = process.env.SHOPIFY_STOREFRONT_DOMAIN || DEFAULT_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN || DEFAULT_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION;
const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;

const METAFIELDS = [
  { group: "BASE EDITORIALE", key: "short_intro", expectedType: "multi_line_text_field" },
  { group: "BASE EDITORIALE", key: "special_bullets", expectedType: "multi_line_text_field" },
  { group: "BASE EDITORIALE", key: "key_features", expectedType: "multi_line_text_field" },
  { group: "BASE EDITORIALE", key: "care_info", expectedType: "multi_line_text_field" },
  { group: "BASE EDITORIALE", key: "promo_text", expectedType: "single_line_text_field" },
  { group: "SCHEDA BOTANICA", key: "difficolta_di_coltivazione", expectedType: "single_line_text_field" },
  { group: "SCHEDA BOTANICA", key: "origini_e_habitat", expectedType: "multi_line_text_field" },
  { group: "SCHEDA BOTANICA", key: "nome_botanico", expectedType: "single_line_text_field" },
  { group: "SCHEDA BOTANICA", key: "nome_comune", expectedType: "single_line_text_field" },
  { group: "SPECIFICHE RAPIDE", key: "attributi_prodotto", expectedType: "json" },
  { group: "CALENDARI STAGIONALI", key: "periodo_di_fioritura", expectedType: "single_line_text_field" },
  { group: "CALENDARI STAGIONALI", key: "periodo_ottimale_di_potatura", expectedType: "single_line_text_field" },
  { group: "CALENDARI STAGIONALI", key: "periodo_di_messa_a_dimora", expectedType: "single_line_text_field" },
  { group: "CALENDARI STAGIONALI", key: "periodo_di_raccolta", expectedType: "single_line_text_field" },
  { group: "CURA E APPROFONDIMENTI", key: "conosci_meglio_la_tua_pianta", expectedType: "multi_line_text_field" },
  { group: "CURA E APPROFONDIMENTI", key: "come_prendersene_cura", expectedType: "multi_line_text_field" },
  { group: "FAQ", key: "titolo_sezione_faq", expectedType: "single_line_text_field" },
  { group: "FAQ", key: "faq_prodotto", expectedType: "json" },
];

function aliasFor(key) {
  return key
    .split("_")
    .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

const metafieldSelections = METAFIELDS.map(
  ({ key }) =>
    `${aliasFor(key)}: metafield(namespace: "custom", key: "${key}") { value type }`,
).join("\n      ");

const PRODUCT_QUERY = /* GraphQL */ `
  query CheckMetafields($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      ${metafieldSelections}
    }
  }
`;

const FIRST_PRODUCT_QUERY = /* GraphQL */ `
  query FirstProduct {
    products(first: 1) {
      edges { node { handle title } }
    }
  }
`;

async function storefrontRequest(query, variables = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${response.statusText}${body ? ` :: ${body.slice(0, 300)}` : ""}`);
  }
  const payload = await response.json();
  if (payload.errors) {
    throw new Error(`GraphQL: ${payload.errors.map((e) => e.message).join("; ")}`);
  }
  return payload.data;
}

function truncate(text, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function summarizeValue(mf) {
  if (!mf) return { status: "MISSING", detail: "definition non creata, o storefront access disabilitato" };
  const rawValue = mf.value ?? "";
  const trimmed = rawValue.trim();
  if (!trimmed) return { status: "EMPTY", detail: `type: ${mf.type || "?"}` };

  if (mf.type === "multi_line_text_field") {
    const items = rawValue
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const preview = items
      .slice(0, 3)
      .map((item, i) => `      ${i + 1}. ${truncate(item)}`)
      .join("\n");
    const more = items.length > 3 ? `\n      … (+${items.length - 3} altre)` : "";
    return {
      status: "OK",
      detail: `type: ${mf.type}, ${items.length} line${items.length === 1 ? "" : "s"}`,
      preview: `${preview}${more}`,
    };
  }

  if (mf.type === "json") {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const count = parsed.length;
        const preview = parsed
          .slice(0, 2)
          .map((item, i) => `      ${i + 1}. ${truncate(JSON.stringify(item))}`)
          .join("\n");
        const more = count > 2 ? `\n      … (+${count - 2} altri)` : "";
        return {
          status: "OK",
          detail: `type: ${mf.type}, array di ${count} elementi`,
          preview: `${preview}${more}`,
        };
      }
      return {
        status: "OK",
        detail: `type: ${mf.type}, oggetto`,
        preview: `      ${truncate(JSON.stringify(parsed))}`,
      };
    } catch (err) {
      return {
        status: "INVALID_JSON",
        detail: `parse error: ${err.message}`,
        preview: `      raw: ${truncate(trimmed)}`,
      };
    }
  }

  return {
    status: "OK",
    detail: `type: ${mf.type || "?"}`,
    preview: `      "${truncate(trimmed)}"`,
  };
}

function formatLine(key, expectedType, mf) {
  const summary = summarizeValue(mf);
  const tag =
    summary.status === "OK"
      ? "[OK]      "
      : summary.status === "EMPTY"
        ? "[EMPTY]   "
        : summary.status === "MISSING"
          ? "[MISSING] "
          : `[${summary.status}] `;

  const typeWarning =
    mf && mf.type && mf.type !== expectedType
      ? ` ⚠ type mismatch (atteso: ${expectedType})`
      : "";

  const paddedKey = key.padEnd(32);
  const head = `  - ${paddedKey} ${tag} (${summary.detail})${typeWarning}`;
  return summary.preview ? `${head}\n${summary.preview}` : head;
}

async function resolveHandle() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg;
  const data = await storefrontRequest(FIRST_PRODUCT_QUERY);
  const first = data?.products?.edges?.[0]?.node;
  if (!first) return null;
  return first.handle;
}

async function main() {
  console.log(`Endpoint: ${endpoint}`);

  let handle;
  try {
    handle = await resolveHandle();
  } catch (err) {
    console.error(`Errore nella ricerca prodotti: ${err.message}`);
    process.exit(1);
  }

  if (!handle) {
    console.error("Nessun prodotto trovato nello store.");
    process.exit(2);
  }

  console.log(`Handle:   ${handle}\n`);

  let data;
  try {
    data = await storefrontRequest(PRODUCT_QUERY, { handle });
  } catch (err) {
    console.error(`Errore query prodotto: ${err.message}`);
    process.exit(1);
  }

  const product = data?.productByHandle;
  if (!product) {
    console.error(`Prodotto non trovato per handle: ${handle}`);
    process.exit(2);
  }

  console.log(`Product: ${product.title}  (${product.id})\n`);

  const counters = { OK: 0, EMPTY: 0, MISSING: 0, INVALID_JSON: 0 };
  let currentGroup = "";

  for (const def of METAFIELDS) {
    if (def.group !== currentGroup) {
      currentGroup = def.group;
      console.log(`\n[${currentGroup}]`);
    }
    const mf = product[aliasFor(def.key)];
    const summary = summarizeValue(mf);
    counters[summary.status] = (counters[summary.status] || 0) + 1;
    console.log(formatLine(def.key, def.expectedType, mf));
  }

  const total = METAFIELDS.length;
  console.log(
    `\nSummary: ${counters.OK || 0} OK • ${counters.EMPTY || 0} vuoti • ${counters.MISSING || 0} non definiti • ${
      counters.INVALID_JSON || 0
    } JSON invalidi  (totale ${total})`,
  );

  if ((counters.MISSING || 0) > 0) {
    console.log("\nNOTE: le definitions MISSING possono dipendere da:");
    console.log("  1. definition non creata in Shopify Admin → Settings → Custom data → Products");
    console.log("  2. Storefront access non abilitato per quella definition");
    console.log("  3. namespace/key non coincidenti con quelli attesi (custom.<key>)");
  }
  if ((counters.EMPTY || 0) > 0) {
    console.log("\nNOTE: i metafield EMPTY esistono ma non sono valorizzati per questo prodotto.");
  }
}

main().catch((err) => {
  console.error("Errore inatteso:", err);
  process.exit(1);
});
