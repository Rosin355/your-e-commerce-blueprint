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

function escapeCsv(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers, rows) {
  const out = [];
  out.push(headers.map(escapeCsv).join(","));
  for (const row of rows) {
    out.push(headers.map((h) => escapeCsv(row[h] || "")).join(","));
  }
  return `${out.join("\n")}\n`;
}

function safeTrim(v) {
  return String(v || "").trim();
}

function isLikelyEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function pickName(row, key1, key2) {
  const a = safeTrim(row[key1]);
  if (a) return a;
  return safeTrim(row[key2]);
}

loadEnvFile(path.join(__dirname, ".env"));

const inputPath = process.env.WOO_CUSTOMERS_CSV_PATH || "";
const outputPath = process.env.SHOPIFY_CUSTOMERS_CSV_OUTPUT || "sync/out/shopify-customers-import.csv";

if (!inputPath) {
  console.error("WOO_CUSTOMERS_CSV_PATH mancante in sync/.env");
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error(`File clienti non trovato: ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const parsed = parseCsv(raw);
if (parsed.length < 2) {
  console.error("CSV clienti vuoto o invalido");
  process.exit(1);
}

const headersIn = parsed[0].map((h) => h.trim());
const customers = parsed.slice(1).map((line) => {
  const row = {};
  for (let i = 0; i < headersIn.length; i += 1) row[headersIn[i]] = line[i] || "";
  return row;
});

const shopifyHeaders = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Accepts Email Marketing",
  "Company",
  "Address1",
  "Address2",
  "City",
  "Province",
  "Province Code",
  "Country",
  "Country Code",
  "Zip",
  "Tags",
  "Note",
];

const outRows = [];
let skipped = 0;
for (const row of customers) {
  const email = safeTrim(row.billing_email) || safeTrim(row.user_email);
  if (!isLikelyEmail(email)) {
    skipped += 1;
    continue;
  }

  const firstName = pickName(row, "billing_first_name", "first_name");
  const lastName = pickName(row, "billing_last_name", "last_name");
  const phone = safeTrim(row.billing_phone);
  const company = safeTrim(row.billing_company);
  const address1 = safeTrim(row.billing_address_1);
  const address2 = safeTrim(row.billing_address_2);
  const city = safeTrim(row.billing_city);
  const province = safeTrim(row.billing_state);
  const country = safeTrim(row.billing_country);
  const zip = safeTrim(row.billing_postcode);

  const tags = ["woo-import", "legacy-onlinegarden", "customer"].join(", ");
  const note = `Imported from Woo customer_id=${safeTrim(row.customer_id) || safeTrim(row.ID)}`;

  outRows.push({
    "First Name": firstName,
    "Last Name": lastName,
    Email: email,
    Phone: phone,
    "Accepts Email Marketing": "no",
    Company: company,
    Address1: address1,
    Address2: address2,
    City: city,
    Province: province,
    "Province Code": "",
    Country: country,
    "Country Code": "",
    Zip: zip,
    Tags: tags,
    Note: note,
  });
}

const outDir = path.dirname(outputPath);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outputPath, buildCsv(shopifyHeaders, outRows), "utf8");

console.log(`Input customers: ${customers.length}`);
console.log(`Output customers: ${outRows.length}`);
console.log(`Skipped (invalid email): ${skipped}`);
console.log(`Output file: ${outputPath}`);
