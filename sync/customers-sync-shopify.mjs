import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
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
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function safeTrim(v) {
  return String(v || "").trim();
}

function isLikelyEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function log(level, message, meta) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (meta) console.log(line, meta);
  else console.log(line);
}

function pickName(row, key1, key2) {
  const a = safeTrim(row[key1]);
  if (a) return a;
  return safeTrim(row[key2]);
}

function toPhone(value) {
  const v = safeTrim(value);
  return v || undefined;
}

function mapWooCustomer(row) {
  const email = safeTrim(row.billing_email) || safeTrim(row.user_email);
  if (!isLikelyEmail(email)) return null;

  const firstName = pickName(row, "billing_first_name", "first_name");
  const lastName = pickName(row, "billing_last_name", "last_name");
  const address1 = safeTrim(row.billing_address_1);
  const address2 = safeTrim(row.billing_address_2);
  const city = safeTrim(row.billing_city);
  const province = safeTrim(row.billing_state);
  const zip = safeTrim(row.billing_postcode);
  const countryCode = safeTrim(row.billing_country);

  return {
    email,
    input: {
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: toPhone(row.billing_phone),
      tags: ["woo-import", "legacy-onlinegarden", "customer"],
      note: `Imported from Woo customer_id=${safeTrim(row.customer_id) || safeTrim(row.ID)}`,
      addresses: [
        {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          company: safeTrim(row.billing_company) || undefined,
          address1: address1 || undefined,
          address2: address2 || undefined,
          city: city || undefined,
          province: province || undefined,
          zip: zip || undefined,
          countryCode: countryCode || undefined,
          phone: toPhone(row.billing_phone),
        },
      ],
    },
  };
}

async function shopifyGraphQL(config, query, variables) {
  const url = `https://${config.shopifyShop}/admin/api/${config.shopifyApiVersion}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.shopifyToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify Admin API HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(", "));
  }
  return json.data;
}

const FIND_CUSTOMER_QUERY = `
  query FindCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      edges { node { id email } }
    }
  }
`;

const CREATE_CUSTOMER_MUTATION = `
  mutation CustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id email }
      userErrors { field message }
    }
  }
`;

const UPDATE_CUSTOMER_MUTATION = `
  mutation CustomerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id email }
      userErrors { field message }
    }
  }
`;

async function findCustomerByEmail(config, email) {
  const data = await shopifyGraphQL(config, FIND_CUSTOMER_QUERY, { query: `email:${email}` });
  return data.customers.edges[0]?.node || null;
}

async function upsertCustomer(config, mapped) {
  const existing = await findCustomerByEmail(config, mapped.email);
  if (!existing) {
    const created = await shopifyGraphQL(config, CREATE_CUSTOMER_MUTATION, { input: mapped.input });
    const errors = created.customerCreate.userErrors;
    if (errors.length) throw new Error(errors.map((e) => e.message).join(", "));
    return "created";
  }
  const updated = await shopifyGraphQL(config, UPDATE_CUSTOMER_MUTATION, {
    input: { id: existing.id, ...mapped.input },
  });
  const errors = updated.customerUpdate.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join(", "));
  return "updated";
}

function parseCsvFile(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const parsed = parseCsv(raw);
  const headers = parsed[0].map((h) => h.trim());
  return parsed.slice(1).map((line) => {
    const row = {};
    for (let i = 0; i < headers.length; i += 1) row[headers[i]] = line[i] || "";
    return row;
  });
}

async function run() {
  loadEnvFile(path.join(__dirname, ".env"));

  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has("--dry-run");
  const config = {
    csvPath: process.env.WOO_CUSTOMERS_CSV_PATH || "",
    shopifyShop: process.env.SHOPIFY_ADMIN_SHOP || "",
    shopifyApiVersion: process.env.SHOPIFY_ADMIN_API_VERSION || "2025-07",
    shopifyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
    limit: Number(process.env.CUSTOMER_SYNC_LIMIT || 0),
  };

  if (!config.csvPath) throw new Error("WOO_CUSTOMERS_CSV_PATH mancante in sync/.env");
  if (!fs.existsSync(config.csvPath)) throw new Error(`CSV clienti non trovato: ${config.csvPath}`);
  if (!config.shopifyShop) throw new Error("SHOPIFY_ADMIN_SHOP mancante in sync/.env");
  if (!config.shopifyToken && !isDryRun) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN mancante in sync/.env");

  const rows = parseCsvFile(config.csvPath);
  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  log("info", `Loaded customer rows: ${rows.length}`);

  for (const row of rows) {
    if (config.limit > 0 && processed >= config.limit) break;
    const mapped = mapWooCustomer(row);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    processed += 1;

    try {
      if (isDryRun) {
        log("info", `DRY RUN customer ${mapped.email}`);
        continue;
      }
      const action = await upsertCustomer(config, mapped);
      if (action === "created") created += 1;
      if (action === "updated") updated += 1;
    } catch (error) {
      failed += 1;
      log("error", `Customer sync failed: ${mapped.email}`, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log("info", "Customer sync finished", { processed, created, updated, skipped, failed, dryRun: isDryRun });
}

run().catch((error) => {
  log("error", "Fatal customer sync error", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
