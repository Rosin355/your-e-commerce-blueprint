import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const script = join(root, "scripts/admin-shopify-id-backfill.sql");
const temp = mkdtempSync("/tmp/admin-shopify-id-backfill-");
const dataDir = join(temp, "pgdata");
const socketDir = join(temp, "socket");
const port = "55447";
const psqlArgs = [
  "-X", "-h", socketDir, "-p", port, "-U", "postgres", "-d", "postgres",
  "-v", "ON_ERROR_STOP=1", "-A", "-t",
];

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${name} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result.stdout.trim();
}

function sql(statement) {
  return command("psql", [...psqlArgs, "-c", statement]);
}

function runBackfill(mode) {
  return command("psql", [
    ...psqlArgs,
    "-v", `backfill_mode=${mode}`,
    "-f", script,
  ]);
}

function test(label, fn) {
  fn();
  console.log(`ok - ${label}`);
}

const setup = String.raw`
CREATE TABLE public.product_sync_csv_products (
  id text PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  parent_sku text,
  title text,
  description text,
  price numeric,
  inventory_quantity integer,
  metafields jsonb NOT NULL DEFAULT '{}'::jsonb,
  shopify_product_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.touch_catalog_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_touch_catalog
BEFORE UPDATE ON public.product_sync_csv_products
FOR EACH ROW EXECUTE FUNCTION public.touch_catalog_updated_at();

CREATE TABLE public.products (
  id text PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  entity_type text NOT NULL,
  parent_product_id text REFERENCES public.products(id)
);

CREATE TABLE public.product_current_values (
  id text PRIMARY KEY,
  sku text NOT NULL,
  field_key text NOT NULL,
  value_text text,
  value_json jsonb,
  value_number numeric
);

CREATE TABLE public.product_field_history (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  field_key text NOT NULL,
  new_value jsonb
);

CREATE TABLE public.shopify_creation_ledger (
  id text PRIMARY KEY,
  internal_sku text NOT NULL,
  operation text NOT NULL,
  shopify_product_id text,
  status text NOT NULL,
  applied_at timestamptz,
  verified_at timestamptz
);

INSERT INTO public.products (id, sku, entity_type, parent_product_id) VALUES
  ('p-og', 'OG_111899', 'simple', null),
  ('p-safe', 'SAFE_1', 'simple', null),
  ('p-match', 'MATCH_1', 'simple', null),
  ('p-existing-conflict', 'EXISTING_CONFLICT_1', 'simple', null),
  ('p-duplicate', 'DUP_1', 'simple', null),
  ('p-unmatched', 'NONE_1', 'simple', null),
  ('p-parent', 'PARENT_1', 'variable', null),
  ('p-variant', 'VARIANT_1', 'variation', 'p-parent');

INSERT INTO public.product_sync_csv_products
  (id, sku, parent_sku, title, description, price, inventory_quantity, metafields, shopify_product_id)
VALUES
  ('c-og', 'OG_111899', null, 'Canary', 'Canary description', 10, 7,
    '{"periodo_di_fioritura":["Marzo"]}', null),
  ('c-safe', 'SAFE_1', null, 'Safe', 'Safe description', 11, 8,
    '{"periodo_di_raccolta":["Settembre","Ottobre"]}', null),
  ('c-match', 'MATCH_1', null, 'Match', 'Match description', 12, 9, '{}',
    'gid://shopify/Product/1003'),
  ('c-existing-conflict', 'EXISTING_CONFLICT_1', null, 'Existing conflict',
    'Must not change', 13, 10, '{}', 'gid://shopify/Product/9999'),
  ('c-duplicate', 'DUP_1', null, 'Duplicate', 'Must stay null', 14, 11, '{}', null),
  ('c-unmatched', 'NONE_1', null, 'Unmatched', 'Must stay null', 15, 12, '{}', null),
  ('c-parent', 'PARENT_1', null, 'Parent', 'Variable parent', 16, 13, '{}', null),
  ('c-variant', 'VARIANT_1', 'PARENT_1', 'Variant', 'Exact child', 17, 14, '{}', null);

INSERT INTO public.shopify_creation_ledger
  (id, internal_sku, operation, shopify_product_id, status, applied_at, verified_at)
VALUES
  ('l-og', 'OG_111899', 'CREATE_PARENT',
    'gid://shopify/Product/15836694249812', 'APPLIED', now(), now()),
  ('l-safe', 'SAFE_1', 'CREATE_PARENT',
    'gid://shopify/Product/1002', 'RECONCILED', now(), now()),
  ('l-match', 'MATCH_1', 'CREATE_PARENT',
    'gid://shopify/Product/1003', 'APPLIED', now(), now()),
  ('l-existing-conflict', 'EXISTING_CONFLICT_1', 'CREATE_PARENT',
    'gid://shopify/Product/1004', 'APPLIED', now(), now()),
  ('l-dup-a', 'DUP_1', 'CREATE_PARENT',
    'gid://shopify/Product/1005', 'APPLIED', now(), now()),
  ('l-dup-b', 'DUP_1', 'SET_ACTIVE',
    'gid://shopify/Product/1006', 'VERIFIED', now(), now()),
  ('l-parent', 'PARENT_1', 'CREATE_PARENT',
    'gid://shopify/Product/1007', 'APPLIED', now(), now()),
  ('l-variant', 'VARIANT_1', 'CREATE_VARIANT',
    'gid://shopify/Product/1007', 'APPLIED', now(), now());

INSERT INTO public.product_current_values VALUES
  ('v-1', 'SAFE_1', 'periodo_di_fioritura', null, '["Marzo"]', null),
  ('v-2', 'SAFE_1', 'price', null, null, 11);
INSERT INTO public.product_field_history VALUES
  ('h-1', 'p-safe', 'title', '"Safe"');
`;

let postgres;
try {
  command("initdb", ["-D", dataDir, "-U", "postgres", "--auth=trust", "--no-locale"]);
  command("mkdir", ["-p", socketDir]);
  postgres = spawn("postgres", [
    "-D", dataDir,
    "-k", socketDir,
    "-p", port,
    "-F",
  ], { stdio: ["ignore", "ignore", "ignore"] });

  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const probe = spawnSync("psql", [...psqlArgs, "-c", "select 1"], {
      encoding: "utf8",
    });
    if (probe.status === 0) {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  assert.equal(ready, true, "PostgreSQL locale non avviato");
  sql(setup);

  const protectedBefore = sql(`
    SELECT md5(string_agg((to_jsonb(c)-'shopify_product_id'-'updated_at')::text, '' ORDER BY sku))
    FROM product_sync_csv_products c;
  `);
  const currentBefore = sql(`
    SELECT count(*) || ':' || md5(string_agg(to_jsonb(v)::text, '' ORDER BY id))
    FROM product_current_values v;
  `);
  const historyBefore = sql(`
    SELECT count(*) || ':' || md5(string_agg(to_jsonb(h)::text, '' ORDER BY id))
    FROM product_field_history h;
  `);
  const matchingTimestampBefore = sql(`
    SELECT updated_at::text FROM product_sync_csv_products WHERE sku='MATCH_1';
  `);

  const dryRun = runBackfill("dry-run");
  test("dry-run classifica TOTAL_MISSING=6, SAFE=4, CONFLICT=1, UNMATCHED=1", () => {
    assert.match(dryRun, /6\|4\|1\|1\|1\|1/);
  });
  test("dry-run non scrive", () => {
    assert.equal(
      sql("SELECT count(*) FROM product_sync_csv_products WHERE shopify_product_id IS NULL;"),
      "6",
    );
  });

  const firstExecute = runBackfill("execute");
  test("null Admin ID + una mapping verificata viene valorizzato", () => {
    assert.equal(
      sql("SELECT shopify_product_id FROM product_sync_csv_products WHERE sku='SAFE_1';"),
      "gid://shopify/Product/1002",
    );
  });
  test("OG_111899 riceve esattamente il GID approvato", () => {
    assert.equal(
      sql("SELECT shopify_product_id FROM product_sync_csv_products WHERE sku='OG_111899';"),
      "gid://shopify/Product/15836694249812",
    );
  });
  test("variation usa il Product GID del parent solo con prove coerenti", () => {
    assert.equal(
      sql("SELECT shopify_product_id FROM product_sync_csv_products WHERE sku='VARIANT_1';"),
      "gid://shopify/Product/1007",
    );
  });
  test("ID esistente matching e conflittuale non vengono aggiornati", () => {
    assert.equal(
      sql("SELECT shopify_product_id FROM product_sync_csv_products WHERE sku='MATCH_1';"),
      "gid://shopify/Product/1003",
    );
    assert.equal(
      sql("SELECT shopify_product_id FROM product_sync_csv_products WHERE sku='EXISTING_CONFLICT_1';"),
      "gid://shopify/Product/9999",
    );
    assert.equal(
      sql("SELECT updated_at::text FROM product_sync_csv_products WHERE sku='MATCH_1';"),
      matchingTimestampBefore,
    );
  });
  test("mapping duplicate e mapping assente restano bloccate", () => {
    assert.equal(
      sql("SELECT count(*) FROM product_sync_csv_products WHERE sku IN ('DUP_1','NONE_1') AND shopify_product_id IS NULL;"),
      "2",
    );
  });
  test("nessun campo estraneo, current value o history viene mutato", () => {
    assert.equal(sql(`
      SELECT md5(string_agg((to_jsonb(c)-'shopify_product_id'-'updated_at')::text, '' ORDER BY sku))
      FROM product_sync_csv_products c;
    `), protectedBefore);
    assert.equal(sql(`
      SELECT count(*) || ':' || md5(string_agg(to_jsonb(v)::text, '' ORDER BY id))
      FROM product_current_values v;
    `), currentBefore);
    assert.equal(sql(`
      SELECT count(*) || ':' || md5(string_agg(to_jsonb(h)::text, '' ORDER BY id))
      FROM product_field_history h;
    `), historyBefore);
  });

  const secondExecute = runBackfill("execute");
  test("seconda esecuzione idempotente: zero write", () => {
    assert.match(secondExecute, /\n0\n/);
    assert.equal(
      sql("SELECT count(*) FROM product_sync_csv_products WHERE shopify_product_id IS NULL;"),
      "2",
    );
  });

  assert.match(firstExecute, /gid:\/\/shopify\/Product\/15836694249812/);
  assert.equal(readFileSync(script, "utf8").includes("UPDATE public.product_current_values"), false);
  console.log("ADMIN SHOPIFY ID BACKFILL PostgreSQL harness: 9/9 PASS");
} finally {
  if (postgres && !postgres.killed) postgres.kill("SIGTERM");
  rmSync(temp, { recursive: true, force: true });
}
