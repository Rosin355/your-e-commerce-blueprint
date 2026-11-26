import assert from "node:assert/strict";
import {
  checkDeletionReferences,
  checkDeletionStock,
  checkInternalReferences,
  executeLifecycle,
  lifecycleAllowed,
  verifyStorefrontAbsence,
} from "../../supabase/functions/_shared/admin-catalog-lifecycle.ts";
import type { CatalogProduct } from "../../supabase/functions/_shared/admin-catalog-commerce.ts";

const id = "gid://shopify/Product/100",
  channel = "gid://shopify/Publication/10";
const sources = {
  id,
  handle: "fixture",
  variants: { nodes: [{ id: "v1", sku: "fixture-01" }] },
} as CatalogProduct;
const base = {
  id,
  handle: "fixture",
  title: "Scheda tecnica",
  action: "delete_catalog_product",
  updatedAt: "v1",
  status: "ARCHIVED",
  channels: [],
  variants: [],
  mandate: "APPROVAZIONE-TEST",
};
const end = { hasNextPage: false, endCursor: null };
const fake =
  (fn: (q: string, v: Record<string, unknown>) => unknown) =>
  async <T>(q: string, v: Record<string, unknown>) => await fn(q, v) as T;

Deno.test("ogni transizione richiede sia sync sia il grant personale specifico", () => {
  for (
    const [action, key] of Object.entries({
      archive_catalog_product: "product_archive",
      restore_catalog_product: "product_archive",
      delete_catalog_product: "product_delete",
      unpublish_catalog_product: "product_unpublish",
    })
  ) {
    for (
      const [roles, capabilities, fieldKeys, enabled, expected] of [
        [["editor"], ["sync"], [key], true, true],
        [["editor"], ["sync"], [], true, false],
        [["editor"], [], [key], true, false],
        [["admin"], ["sync"], [key], true, false],
        [["editor"], ["sync"], [key], false, false],
      ] as const
    ) {
      assert.equal(
        lifecycleAllowed(
          {
            roles,
            catalogGrant: { enabled, capabilities, fieldKeys },
          } as never,
          action,
        ),
        expected,
      );
    }
  }
});
Deno.test("le transizioni leggono il risultato e interrogano la vetrina dopo una sola mutazione", async () => {
  for (
    const [action, status, expected] of [
      ["archive_catalog_product", "ACTIVE", "ARCHIVED"],
      ["restore_catalog_product", "ARCHIVED", "DRAFT"],
      ["unpublish_catalog_product", "ACTIVE", "ACTIVE"],
      ["delete_catalog_product", "ARCHIVED", "DELETED"],
    ]
  ) {
    let mutations = 0, storeReads = 0;
    const result = await executeLifecycle(
      { ...base, action, status },
      channel,
      base.title,
      fake((q, v) => {
        if (q.includes("mutation")) {
          mutations++;
          if (action === "unpublish_catalog_product") {
            assert.deepEqual(v, { id, input: [{ publicationId: channel }] });
            return { publishableUnpublish: { userErrors: [] } };
          }
          if (action === "delete_catalog_product") {
            assert.deepEqual(v, { input: { id } });
            return { productDelete: { deletedProductId: id, userErrors: [] } };
          }
          assert.deepEqual(v, { input: { id, status: expected } });
          return { productUpdate: { userErrors: [] } };
        }
        return {
          product: expected === "DELETED"
            ? null
            : { id, status: expected, publishedOnPublication: false },
        };
      }),
      async (checked) => {
        assert.equal(checked, id);
        storeReads++;
      },
    );
    assert.equal(result.result.state, expected);
    assert.equal(mutations, 1);
    assert.equal(storeReads, 1);
  }
});
Deno.test("mandato o titolo assente, azione inattesa e rilettura incerta impediscono il successo", async () => {
  const never = fake(() => assert.fail("richiesta inattesa"));
  for (
    const [plan, title] of [[base, "errato"], [
      { ...base, mandate: null },
      base.title,
    ], [{ ...base, action: "unknown" }, base.title]] as const
  ) {
    await assert.rejects(() => executeLifecycle(plan, channel, title, never));
  }
  let writes = 0;
  await assert.rejects(
    () =>
      executeLifecycle(
        base,
        channel,
        base.title,
        fake((q) => {
          if (q.includes("mutation")) {
            writes++;
            return { productDelete: { deletedProductId: id, userErrors: [] } };
          }
          throw new Error("timeout");
        }),
      ),
    /timeout/,
  );
  assert.equal(writes, 1);
});
Deno.test("la scomparsa richiede PDP assente e indice completamente letto", async () => {
  await assert.rejects(
    () => verifyStorefrontAbsence(id, fake(() => ({ product: { id } }))),
    /Scheda/,
  );
  await assert.rejects(
    () =>
      verifyStorefrontAbsence(
        id,
        fake((q) =>
          q.includes("RemovedProduct")
            ? { product: null }
            : { products: { nodes: [{ id }], pageInfo: end } }
        ),
      ),
    /catalogo/,
  );
  await assert.rejects(
    () =>
      verifyStorefrontAbsence(
        id,
        fake((q) =>
          q.includes("RemovedProduct") ? { product: null } : {
            products: {
              nodes: [],
              pageInfo: { hasNextPage: true, endCursor: "stesso" },
            },
          }
        ),
      ),
    /incompleto/,
  );
  await verifyStorefrontAbsence(
    id,
    fake((q, v) =>
      q.includes("RemovedProduct") ? { product: null } : {
        products: {
          nodes: [],
          pageInfo: v.after ? end : { hasNextPage: true, endCursor: "b" },
        },
      }
    ),
  );
});
Deno.test("ordini, redirect, accesso mancante o lettura incompleta bloccano la cancellazione", async () => {
  for (const mode of ["clear", "order", "redirect", "no-scope", "incomplete"]) {
    const run = () =>
      checkDeletionReferences(
        sources,
        fake((q) => {
          if (q.includes("DeletionScopes")) {
            return {
              currentAppInstallation: {
                accessScopes: (mode === "no-scope"
                  ? ["read_orders"]
                  : ["read_all_orders", "read_orders"]).map((handle) => ({
                    handle,
                  })),
              },
            };
          }
          if (q.includes("OrderRefs")) {
            return {
              orders: {
                nodes: [{
                  lineItems: {
                    nodes: mode === "order"
                      ? [{ product: null, variant: null, sku: "fixture-01" }]
                      : [],
                    pageInfo: { hasNextPage: mode === "incomplete" },
                  },
                }],
                pageInfo: end,
              },
            };
          }
          return {
            urlRedirects: {
              nodes: mode === "redirect"
                ? [{ path: "/old", target: "/it/products/fixture/?id=1" }]
                : [],
              pageInfo: end,
            },
          };
        }),
      );
    if (mode === "clear") await run();
    else await assert.rejects(run);
  }
});
Deno.test("stock nullo aggregato non autorizza sedi con impegni, quantità mancanti o paginazione incompleta", async () => {
  for (const mode of ["clear", "reserved", "unknown", "partial"]) {
    const run = () =>
      checkDeletionStock(
        sources,
        fake((_q, v) => ({
          productVariant: {
            id: "v1",
            inventoryItem: {
              inventoryLevels: {
                nodes: [{
                  quantities: mode === "unknown"
                    ? []
                    : (v.names as string[]).map((name) => ({
                      name,
                      quantity: mode === "reserved" && name === "reserved"
                        ? 1
                        : 0,
                    })),
                }],
                pageInfo: { hasNextPage: mode === "partial" },
              },
            },
          },
        })),
      );
    if (mode === "clear") await run();
    else await assert.rejects(run);
  }
});

Deno.test("una bozza irrisolta, un mapping esterno o una variante estranea bloccano il controllo interno", async () => {
  for (
    const mode of ["clear", "draft", "link", "legacy", "variant", "db-error"]
  ) {
    const tables: Record<string, unknown[]> = {
      products: [{ id: "local", sku: "fixture-01" }],
      admin_product_shopify_links: [{
        product_id: mode === "link" ? "other" : "local",
        shopify_variant_gid: mode === "variant" ? "v2" : "v1",
      }],
      product_sync_csv_products: [{
        sku: mode === "legacy" ? "other" : "fixture-01",
      }],
      admin_product_operations: mode === "draft" ? [{ id: "pending" }] : [],
    };
    const db = {
      from(table: string) {
        const builder = {
          select: () => builder,
          eq: () => builder,
          or: () => builder,
          in: () => builder,
          limit: () =>
            Promise.resolve({
              data: tables[table],
              error: mode === "db-error" ? "incomplete" : null,
            }),
        };
        return builder;
      },
    };
    const run = () => checkInternalReferences(db as never, "local", sources);
    if (mode === "clear") await run();
    else await assert.rejects(run);
  }
});
