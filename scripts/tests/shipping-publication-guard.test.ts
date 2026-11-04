import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertHomogeneousB, guardCatalogMutation, guardCatalogRest } from "../../supabase/functions/_shared/shipping-publication-guard.mjs";
const id = "gid://shopify/Product/1";
const variant = { id: "gid://shopify/ProductVariant/2", sku: "BULB" };
const product = { id, tags: ["ogqashippingbapproved"], variants: { nodes: [variant], pageInfo: { hasNextPage: false } } };
const approval = { productId: id, variantId: variant.id, sku: variant.sku, class: "bulb", approvedBy: "owner", reference: "signed-review" };
const read = async () => ({ node: product });
test("B requires server approvals for every sibling and complete pagination", () => {
  assert.throws(() => assertHomogeneousB(product), /NOT_APPROVED/);
  assert.doesNotThrow(() => assertHomogeneousB(product, [approval]));
  assert.throws(() => assertHomogeneousB({ ...product, variants: { nodes: [variant, { id: "new", sku: "A" }], pageInfo: { hasNextPage: false } } }, [approval]), /NOT_APPROVED/);
  assert.throws(() => assertHomogeneousB(product, [{ ...approval, class: "standard" }]), /NOT_APPROVED/);
  assert.throws(() => assertHomogeneousB({ ...product, variants: { ...product.variants, pageInfo: { hasNextPage: true } } }, [approval]), /incompleto/);
});
test("new untagged products default A, reads never call the preflight", async () => {
  const noRead = async () => { throw Error("unexpected read"); };
  await guardCatalogMutation("query { products(first: 1) { nodes { id } } }", {}, noRead);
  await guardCatalogMutation("mutation { productCreate(product: $input) { product { id } } }", { input: { title: "new" } }, noRead);
  await guardCatalogRest("products.json", "GET", undefined, noRead);
});
test("client approval claims cannot assign B using aliases or tags", async () => {
  await assert.rejects(guardCatalogMutation("mutation { alias: tagsAdd(id: $id, tags: $tags) { userErrors { message } } }",
    { id, tags: ["ogshippingbapproved"], approved: true }, read), /ASSIGNMENT_BLOCKED/);
  await assert.rejects(guardCatalogMutation("mutation { productCreate(product: $input) { product { id } } }",
    { input: { tags: ["ogqashippingbapproved"] } }, read), /ASSIGNMENT_BLOCKED/);
});
test("unapproved B cannot publish, edit or gain variants, even with client approvals", async () => {
  for (const op of ["publishablePublish", "productUpdate", "productVariantsBulkCreate", "productVariantsBulkUpdate", "productSet"]) {
    await assert.rejects(guardCatalogMutation(`# query\nmutation { alias: ${op}(id: $id) { id } }`, { id, approvals: [approval] }, read), /NOT_APPROVED/);
  }
});
test("A existing product can publish; absent targets and failed reads block writes", async () => {
  const query = "mutation { publishablePublish(id: $id, input: $input) { userErrors { message } } }";
  await guardCatalogMutation(query, { id }, async () => ({ node: { id, tags: [] } }));
  await assert.rejects(guardCatalogMutation(query, { id }, async () => ({ node: null })), /REQUIRED/);
  await assert.rejects(guardCatalogMutation(query, {}, read), /REQUIRED/);
  await assert.rejects(guardCatalogMutation(query, { id }, async () => { throw Error("unavailable"); }), /unavailable/);
});
test("REST edits and alternative collection assignments fail closed", async () => {
  await assert.rejects(guardCatalogRest("products/1.json", "PUT", { product: { tags: "B" } }, read), /LEGACY/);
  await assert.rejects(guardCatalogRest("variants/2.json", "PUT", {}, read), /LEGACY/);
  await assert.rejects(guardCatalogMutation("mutation { collectionAddProducts(id: $id, productIds: $ids) { id } }", { ids: [id] }, read), /ASSIGNMENT_BLOCKED/);
});
test("managed transports include the guard before sending catalog writes", () => {
  for (const file of ["supabase/functions/_shared/shopify-admin-client.ts", "sync/product-sync.mjs", "sync/product-sync-csv.mjs", "sync/product-push-drafts-to-shopify.mjs"]) {
    assert.match(readFileSync(file, "utf8"), /await guardCatalogMutation\(/, file);
  }
  assert.match(readFileSync("supabase/functions/_shared/shopify-admin-client.ts", "utf8"), /await guardCatalogRest\(/);
});
