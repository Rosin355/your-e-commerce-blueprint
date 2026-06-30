/**
 * scripts/create-shopify-collections.ts
 *
 * Script SICURO per creare su Shopify le collezioni mancanti definite in
 * `scripts/shopify-collections-dryrun.json`.
 *
 * Garanzie:
 *  - Modalità DRY-RUN di default. Nessuna scrittura su Shopify se non si passa `--execute`.
 *  - Crea SOLO collezioni mancanti (controllo per handle via Admin GraphQL).
 *  - NON cancella, NON rinomina, NON sposta collezioni esistenti.
 *  - NON assegna prodotti (le collezioni vengono create vuote, smart=false).
 *  - Stampa un report finale: to_create / already_exists / created / failed.
 *
 * Uso:
 *   # dry-run (default, sicuro)
 *   deno run -A scripts/create-shopify-collections.ts
 *
 *   # esecuzione reale
 *   deno run -A scripts/create-shopify-collections.ts --execute
 *
 * Env richieste:
 *   SHOPIFY_STORE_DOMAIN        es. ecom-blueprint-gen-6ud1s.myshopify.com
 *   SHOPIFY_ADMIN_API_TOKEN     token Admin API con scope write_products
 *
 * NOTA: questo file NON viene eseguito automaticamente da nessun build/CI.
 *       Deve essere lanciato manualmente quando l'utente da OK.
 */

interface DryRunItem {
  handle: string;
  title: string;
  parent_label: string;
  action: string;
  notes?: string;
}

interface DryRunFile {
  _meta: Record<string, unknown>;
  collections_to_create: DryRunItem[];
}

const API_VERSION = "2025-07";
const EXECUTE = Deno.args.includes("--execute");

async function loadDryRun(): Promise<DryRunFile> {
  const raw = await Deno.readTextFile(
    new URL("./shopify-collections-dryrun.json", import.meta.url),
  );
  return JSON.parse(raw) as DryRunFile;
}

async function shopifyGql<T>(
  domain: string,
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data as T;
}

async function findCollectionByHandle(
  domain: string,
  token: string,
  handle: string,
): Promise<{ id: string; handle: string; title: string } | null> {
  const query = `
    query($handle: String!) {
      collectionByHandle(handle: $handle) { id handle title }
    }`;
  const data = await shopifyGql<{ collectionByHandle: { id: string; handle: string; title: string } | null }>(
    domain,
    token,
    query,
    { handle },
  );
  return data.collectionByHandle;
}

async function createCustomCollection(
  domain: string,
  token: string,
  handle: string,
  title: string,
): Promise<{ id: string; handle: string }> {
  const mutation = `
    mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id handle title }
        userErrors { field message }
      }
    }`;
  const data = await shopifyGql<{
    collectionCreate: {
      collection: { id: string; handle: string; title: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(domain, token, mutation, { input: { title, handle } });

  if (data.collectionCreate.userErrors.length > 0) {
    throw new Error(JSON.stringify(data.collectionCreate.userErrors));
  }
  if (!data.collectionCreate.collection) {
    throw new Error("collectionCreate: no collection returned");
  }
  return data.collectionCreate.collection;
}

async function main() {
  const domain = Deno.env.get("SHOPIFY_STORE_DOMAIN");
  const token = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");

  console.log(`\n=== create-shopify-collections.ts ===`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE (real writes)" : "DRY-RUN (no writes)"}`);

  if (EXECUTE && (!domain || !token)) {
    console.error("Mancano SHOPIFY_STORE_DOMAIN o SHOPIFY_ADMIN_API_TOKEN.");
    Deno.exit(1);
  }

  const file = await loadDryRun();
  const items = file.collections_to_create;

  const report = {
    total: items.length,
    already_exists: [] as string[],
    to_create: [] as string[],
    created: [] as string[],
    failed: [] as Array<{ handle: string; error: string }>,
    skipped_no_check: [] as string[],
  };

  for (const item of items) {
    if (!domain || !token) {
      // Pure dry-run senza credenziali: non possiamo verificare esistenza.
      report.skipped_no_check.push(item.handle);
      console.log(`  [?] ${item.handle} — no creds, cannot verify (would create in execute)`);
      continue;
    }

    try {
      const existing = await findCollectionByHandle(domain, token, item.handle);
      if (existing) {
        report.already_exists.push(item.handle);
        console.log(`  [=] ${item.handle} — already exists (${existing.id})`);
        continue;
      }
      report.to_create.push(item.handle);

      if (!EXECUTE) {
        console.log(`  [+] ${item.handle} — WOULD CREATE "${item.title}"`);
        continue;
      }

      const created = await createCustomCollection(domain, token, item.handle, item.title);
      report.created.push(created.handle);
      console.log(`  [✓] ${item.handle} — created (${created.id})`);
    } catch (err) {
      report.failed.push({ handle: item.handle, error: String(err) });
      console.error(`  [x] ${item.handle} — ${err}`);
    }
  }

  console.log(`\n=== REPORT ===`);
  console.log(JSON.stringify(report, null, 2));
  if (!EXECUTE) {
    console.log(`\nNothing was written. Re-run with --execute to apply.`);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
}
