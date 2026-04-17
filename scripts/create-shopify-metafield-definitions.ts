// Variabili richieste in .env:
// SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
// SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxx
// SHOPIFY_API_VERSION=2025-01
//
// Esecuzione:
//   npm run shopify:create-metafields
//
// Lo script e' idempotente: se una definition esiste gia', viene saltata.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

type MetafieldType =
  | "single_line_text_field"
  | "multi_line_text_field"
  | "json";

interface Definition {
  namespace: string;
  key: string;
  name: string;
  description: string;
  type: MetafieldType;
}

interface UserError {
  field: string[] | null;
  message: string;
  code: string | null;
}

interface CreatedDefinition {
  id: string;
  name: string;
  namespace: string;
  key: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface CreateMutationResponse {
  metafieldDefinitionCreate: {
    createdDefinition: CreatedDefinition | null;
    userErrors: UserError[];
  };
}

const DEFINITIONS: Definition[] = [
  // BASE EDITORIALE
  { namespace: "custom", key: "short_intro", name: "Introduzione breve (PDP)", description: "Testo introduttivo breve mostrato nel PDP sopra la descrizione.", type: "multi_line_text_field" },
  { namespace: "custom", key: "special_bullets", name: "Special bullets (PDP)", description: "Punti di forza del prodotto. Una voce per riga.", type: "multi_line_text_field" },
  { namespace: "custom", key: "key_features", name: "Key features (PDP)", description: "Caratteristiche principali. Una voce per riga.", type: "multi_line_text_field" },
  { namespace: "custom", key: "care_info", name: "Care info (PDP)", description: "Istruzioni di cura sintetiche. Una voce per riga.", type: "multi_line_text_field" },
  { namespace: "custom", key: "promo_text", name: "Promo text (PDP)", description: "Testo promozione PDP. Vuoto = banner nascosto.", type: "single_line_text_field" },
  // SCHEDA BOTANICA
  { namespace: "custom", key: "cultivation_difficulty", name: "Difficolta di coltivazione", description: "Es. Facile / Media / Esperto", type: "single_line_text_field" },
  { namespace: "custom", key: "origins_habitat", name: "Origini e habitat", description: "Descrizione botanica delle origini e dell'habitat naturale.", type: "multi_line_text_field" },
  { namespace: "custom", key: "botanical_name", name: "Nome botanico", description: "Nome scientifico latino della specie.", type: "single_line_text_field" },
  { namespace: "custom", key: "common_name", name: "Nome comune", description: "Nome comune della pianta in italiano.", type: "single_line_text_field" },
  // SPECIFICHE RAPIDE
  { namespace: "custom", key: "product_attributes", name: "Attributi prodotto (specs)", description: "JSON array [{key, value}] per carosello specifiche nel PDP.", type: "json" },
  // CALENDARI STAGIONALI
  { namespace: "custom", key: "flowering_period", name: "Periodo di fioritura", description: "Es. Aprile - Giugno", type: "single_line_text_field" },
  { namespace: "custom", key: "pruning_period", name: "Periodo ottimale di potatura", description: "Es. Fine estate / Autunno", type: "single_line_text_field" },
  { namespace: "custom", key: "planting_period", name: "Periodo di messa a dimora", description: "Es. Autunno / Primavera", type: "single_line_text_field" },
  { namespace: "custom", key: "harvest_period", name: "Periodo di raccolta", description: "Usato per piante da frutto.", type: "single_line_text_field" },
  // CURA E APPROFONDIMENTI
  { namespace: "custom", key: "plant_knowledge", name: "Conosci meglio la tua pianta", description: "Testo editoriale approfondito sulla pianta.", type: "multi_line_text_field" },
  { namespace: "custom", key: "care_guide", name: "Come prendersene cura", description: "Guida dettagliata alla cura. Supporta piu paragrafi.", type: "multi_line_text_field" },
  // FAQ
  { namespace: "custom", key: "faq_title", name: "Titolo sezione FAQ", description: "Es. Domande piu frequenti sull'Iris.", type: "single_line_text_field" },
  { namespace: "custom", key: "faq_items", name: "FAQ prodotto", description: "JSON array [{question, answer}] per accordion FAQ nel PDP.", type: "json" },
];

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

function loadDotEnv(): void {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const rootDir = resolve(dirname(__filename), "..");
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
    // .env mancante e' OK, le variabili possono arrivare dall'ambiente
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`[FATAL] Variabile di ambiente mancante: ${name}`);
    console.error("Richieste in .env:");
    console.error("  SHOPIFY_STORE_DOMAIN=your-store.myshopify.com");
    console.error("  SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxx");
    console.error("  SHOPIFY_API_VERSION=2025-01");
    process.exit(1);
  }
  return value.trim();
}

function isAlreadyExistsError(err: UserError): boolean {
  if (err.code === "TAKEN" || err.code === "ALREADY_EXISTS") return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("already exists") || msg.includes("taken") || msg.includes("is already in use");
}

async function createDefinition(
  endpoint: string,
  token: string,
  def: Definition,
): Promise<"created" | "skipped" | "error"> {
  const variables = {
    definition: {
      name: def.name,
      namespace: def.namespace,
      key: def.key,
      description: def.description,
      type: def.type,
      ownerType: "PRODUCT",
      pin: true,
      access: {
        storefront: "PUBLIC_READ",
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query: CREATE_MUTATION, variables }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[ERROR] ${def.namespace}.${def.key} — network error: ${message}`);
    return "error";
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.log(
      `[ERROR] ${def.namespace}.${def.key} — HTTP ${response.status} ${response.statusText}${body ? ` :: ${body.slice(0, 200)}` : ""}`,
    );
    return "error";
  }

  let payload: GraphQLResponse<CreateMutationResponse>;
  try {
    payload = (await response.json()) as GraphQLResponse<CreateMutationResponse>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[ERROR] ${def.namespace}.${def.key} — invalid JSON response: ${message}`);
    return "error";
  }

  if (payload.errors && payload.errors.length > 0) {
    const msg = payload.errors.map((e) => e.message).join("; ");
    console.log(`[ERROR] ${def.namespace}.${def.key} — GraphQL: ${msg}`);
    return "error";
  }

  const result = payload.data?.metafieldDefinitionCreate;
  if (!result) {
    console.log(`[ERROR] ${def.namespace}.${def.key} — empty response`);
    return "error";
  }

  if (result.createdDefinition) {
    console.log(`[CREATED] ${def.namespace}.${def.key} — ${result.createdDefinition.name}`);
    return "created";
  }

  const errors = result.userErrors || [];
  if (errors.length > 0 && errors.every(isAlreadyExistsError)) {
    console.log(`[SKIPPED existing] ${def.namespace}.${def.key}`);
    return "skipped";
  }

  const msg = errors
    .map((e) => `${e.code ? `[${e.code}] ` : ""}${e.message}${e.field ? ` (field: ${e.field.join(".")})` : ""}`)
    .join("; ");
  console.log(`[ERROR] ${def.namespace}.${def.key} — ${msg || "unknown error"}`);
  return "error";
}

async function main(): Promise<void> {
  loadDotEnv();

  const domain = requireEnv("SHOPIFY_STORE_DOMAIN");
  const token = requireEnv("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const apiVersion = requireEnv("SHOPIFY_API_VERSION");

  const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  console.log(`Endpoint: ${endpoint}`);
  console.log(`Processing ${DEFINITIONS.length} metafield definitions...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const def of DEFINITIONS) {
    const outcome = await createDefinition(endpoint, token, def);
    if (outcome === "created") created += 1;
    else if (outcome === "skipped") skipped += 1;
    else errors += 1;
  }

  console.log(`\n✅ Completato: ${created} creati, ${skipped} saltati, ${errors} errori`);

  if (errors > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error("[FATAL] Unexpected error:", err);
  process.exit(1);
});
