// TEMPORANEA, SOLO LETTURA (3B.1G live dry-run). Da eliminare subito dopo l'uso.
import { corsHeaders, shopifyAdminGraphQLAtVersion } from "../_shared/shopify-admin-client.ts";
import { authenticate } from "../_shared/admin-v2-auth.ts";
import { canWriteCanary } from "../_shared/admin-v2-permissions.ts";

const LOC = "gid://shopify/Location/117678014804";
const Q = `query P($id: ID!, $loc: ID!) { product(id: $id) { id variants(first: 5) { nodes {
  id sku inventoryPolicy inventoryItem { id tracked inventoryLevel(locationId: $loc) {
  quantities(names: ["available"]) { name quantity } } } } } } }`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const h = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const auth = await authenticate(req);
    if (!canWriteCanary(auth.roles)) return new Response('{"error":"FORBIDDEN"}', { status: 403, headers: h });
    const { productIds } = await req.json();
    if (!Array.isArray(productIds) || productIds.length > 40) throw new Error("bad input");
    const out: unknown[] = [];
    for (const pid of productIds) {
      if (!/^\d+$/.test(String(pid))) continue;
      // deno-lint-ignore no-explicit-any
      const d: any = await shopifyAdminGraphQLAtVersion("2026-01", Q, { id: `gid://shopify/Product/${pid}`, loc: LOC });
      const nodes = d?.product?.variants?.nodes ?? [];
      for (const v of nodes) {
        const q = v.inventoryItem?.inventoryLevel?.quantities?.find((x: { name: string }) => x.name === "available");
        out.push({
          sku: v.sku, shopifyProductId: d.product.id, shopifyVariantId: v.id,
          inventoryItemId: v.inventoryItem?.id ?? null, currentTracked: v.inventoryItem?.tracked ?? null,
          currentPolicy: v.inventoryPolicy ?? null, currentAvailable: typeof q?.quantity === "number" ? q.quantity : null,
          variantCount: nodes.length, levelPresent: !!v.inventoryItem?.inventoryLevel,
        });
      }
      if (!nodes.length) out.push({ productId: pid, missing: true });
    }
    return new Response(JSON.stringify(out), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message).slice(0, 300) }), { status: 500, headers: h });
  }
});
