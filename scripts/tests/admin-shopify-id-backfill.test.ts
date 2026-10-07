import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptUrl = new URL("../admin-shopify-id-backfill.sql", import.meta.url);
const queriesUrl = new URL(
  "../../supabase/functions/_shared/admin-v2-queries.ts",
  import.meta.url,
);

test("runtime Admin usa il catalogo e non introduce fallback ledger", async () => {
  const queries = await readFile(queriesUrl, "utf8");
  const exactMapping = queries.match(
    /export async function getExactShopifyProductMapping[\s\S]*?\n}\n/,
  )?.[0] ?? "";

  assert.match(exactMapping, /\.from\("product_sync_csv_products"\)/);
  assert.match(exactMapping, /\.eq\("sku", sku\)/);
  assert.doesNotMatch(exactMapping, /shopify_creation_ledger/);
});

test("controlled script e' dry-run per default e richiede execute esplicito", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  assert.match(sql, /\\set backfill_mode dry-run/);
  assert.match(sql, /lower\(:'backfill_mode'\) = 'execute'/);
  assert.match(sql, /ROLLBACK;/);
  assert.match(sql, /COMMIT;/);
});

test("dry-run usa REPEATABLE READ READ ONLY senza LOCK o TEMP", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  const marker = "\\else\n\n-- Lovable e gli altri consumer read-only";
  const [executePath, dryRunPath] = sql.split(marker);

  assert.ok(executePath && dryRunPath, "branch psql execute/dry-run non separati");
  assert.match(
    dryRunPath,
    /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;/,
  );
  assert.doesNotMatch(dryRunPath, /\bLOCK TABLE\b/);
  assert.doesNotMatch(dryRunPath, /\bCREATE TEMP TABLE\b/);
  assert.doesNotMatch(dryRunPath, /\bUPDATE public\.product_sync_csv_products\b/);
  assert.match(dryRunPath, /0::bigint AS "WRITES"/);
});

test("execute conserva REPEATABLE READ, lock forte e guardia anti-overwrite", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  const executePath = sql.split(
    "\\else\n\n-- Lovable e gli altri consumer read-only",
  )[0];

  assert.match(
    executePath,
    /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ WRITE;/,
  );
  assert.match(
    executePath,
    /LOCK TABLE public\.product_sync_csv_products IN SHARE ROW EXCLUSIVE MODE;/,
  );
  assert.match(
    executePath,
    /nullif\(btrim\(c\.shopify_product_id\), ''\) IS NULL/,
  );
});

test("execute e dry-run mantengono identica la CASE di classificazione", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  const cases = [
    ...sql.matchAll(
      /CASE\n      WHEN nullif\(btrim\(i\.current_shopify_product_id\), ''\)[\s\S]*?END AS classification/g,
    ),
  ].map((match) => match[0]);

  assert.equal(cases.length, 2);
  assert.equal(cases[0], cases[1]);
});

test("dry-run conserva candidato e classificazione OG_111899", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  assert.match(sql, /"OG_111899_CLASSIFICATION"/);
  assert.match(sql, /"OG_111899_CANDIDATE_PRODUCT_ID"/);
  assert.match(sql, /gid:\/\/shopify\/Product\/15836694249812/);
});

test("backfill accetta solo Product GID verificati ed esatti", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  assert.match(sql, /\^gid:\/\/shopify\/Product\/\[1-9\]\[0-9\]\*\$/);
  assert.match(sql, /l\.verified_at IS NOT NULL/);
  assert.match(sql, /e\.internal_sku = i\.sku/);
  assert.doesNotMatch(sql, /\b(?:title|handle)\s*=/i);
});

test("variation richiede prova variant e stesso Product GID del parent", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  assert.match(sql, /e\.operation = 'CREATE_VARIANT'/);
  assert.match(sql, /e\.internal_sku = i\.canonical_parent_sku/);
  assert.match(sql, /p\.shopify_product_id = d\.shopify_product_id/);
  assert.match(sql, /c\.parent_sku IS NOT DISTINCT FROM parent\.sku/);
});

test("update non sovrascrive ID e verifica superfici non correlate", async () => {
  const sql = await readFile(scriptUrl, "utf8");
  assert.match(sql, /UPDATE public\.product_sync_csv_products/);
  assert.match(sql, /nullif\(btrim\(c\.shopify_product_id\), ''\) IS NULL/);
  assert.doesNotMatch(sql, /UPDATE public\.product_current_values/);
  assert.doesNotMatch(sql, /INSERT INTO public\.product_field_history/);
  assert.match(sql, /current_values_hash/);
  assert.match(sql, /history_hash/);
  assert.match(sql, /protected_catalog_hash/);
  assert.match(sql, /gid:\/\/shopify\/Product\/15836694249812/);
});
