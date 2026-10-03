// TEMPORARY one-shot canary for OG_257799 only. Delete after use.
import { shopifyAdminGraphQL, jsonResponse, corsHeaders } from "../_shared/shopify-admin-client.ts";

const ONE_TIME_KEY = "og-3b1f-7c1e9a4d2b8f40e6a5d3c9b17f02e8a4";
const VARIANT = "gid://shopify/ProductVariant/55507146146132";
const ITEM = "gid://shopify/InventoryItem/56346278953300";
const LOCATION = "gid://shopify/Location/117678014804";

const READ = `query($v:ID!,$i:ID!,$l:ID!){
  productVariant(id:$v){ id sku price inventoryPolicy inventoryQuantity availableForSale
    product{ id title handle status totalInventory media(first:5){nodes{id}} } }
  inventoryItem(id:$i){ id tracked inventoryLevel(locationId:$l){ quantities(names:["available","on_hand"]){name quantity} } }
}`;

async function safeRead() {
  try { return { ok: true, data: await shopifyAdminGraphQL(READ, { v: VARIANT, i: ITEM, l: LOCATION }) }; }
  catch (e) {
    // retry without inventoryLevel (may need read_locations)
    const q2 = READ.replace(/inventoryLevel\(locationId:\$l\)\{[^}]*\}\s*\}/, "").replace(",$l:ID!", "");
    try { return { ok: true, partial: String(e), data: await shopifyAdminGraphQL(q2, { v: VARIANT, i: ITEM }) }; }
    catch (e2) { return { ok: false, error: String(e2), first: String(e) }; }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-canary-key") !== ONE_TIME_KEY) return jsonResponse({ error: "forbidden" }, 403);
  const { mode } = await req.json().catch(() => ({}));
  const before = await safeRead();
  if (mode !== "write") return jsonResponse({ before });

  const steps: Record<string, unknown> = {};
  try {
    const t = await shopifyAdminGraphQL(`mutation($id:ID!){ inventoryItemUpdate(id:$id,input:{tracked:true}){ inventoryItem{id tracked} userErrors{field message} } }`, { id: ITEM });
    steps.tracking = t;
    const ue = (t as any).inventoryItemUpdate?.userErrors;
    if (ue?.length || !(t as any).inventoryItemUpdate?.inventoryItem?.tracked) return jsonResponse({ before, steps, stop: "tracking" });
  } catch (e) { return jsonResponse({ before, steps, stop: "tracking", error: String(e) }); }

  try {
    const s = await shopifyAdminGraphQL(`mutation($input:InventorySetQuantitiesInput!){ inventorySetQuantities(input:$input){ inventoryAdjustmentGroup{ reason changes{name delta} } userErrors{field message code} } }`, {
      input: { name: "available", reason: "correction", ignoreCompareQuantity: true,
        quantities: [{ inventoryItemId: ITEM, locationId: LOCATION, quantity: 20 }] },
    });
    steps.setQuantity = s;
    if ((s as any).inventorySetQuantities?.userErrors?.length) return jsonResponse({ before, steps, stop: "setQuantity", after: await safeRead() });
  } catch (e) { return jsonResponse({ before, steps, stop: "setQuantity", error: String(e), after: await safeRead() }); }

  return jsonResponse({ before, steps, after: await safeRead() });
});
