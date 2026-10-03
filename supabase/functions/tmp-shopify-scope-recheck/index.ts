// TEMPORARY read-only diagnostic. No mutations. Deleted right after use.
const NONCE = "og-recheck-7f3a91c2e4";
const API = "2025-07";
const shop = Deno.env.get("SHOPIFY_STORE_PERMANENT_DOMAIN") || Deno.env.get("SHOPIFY_ADMIN_SHOP") || "ecom-blueprint-gen-6ud1s.myshopify.com";

async function scopes(tok: string) {
  const r = await fetch(`https://${shop}/admin/oauth/access_scopes.json`, { headers: { "X-Shopify-Access-Token": tok } });
  if (!r.ok) return { status: r.status };
  const j = await r.json();
  return { status: r.status, scopes: (j.access_scopes || []).map((s: any) => s.handle) };
}
async function gql(tok: string, query: string, variables = {}) {
  const r = await fetch(`https://${shop}/admin/api/${API}/graphql.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": tok },
    body: JSON.stringify({ query, variables }),
  });
  return { status: r.status, body: await r.json() };
}

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get("n") !== NONCE) return new Response("forbidden", { status: 403 });
  const out: any = {};
  const stored = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
  out.stored = stored ? await scopes(stored) : { missing: true };
  let cc: string | null = null;
  const id = Deno.env.get("SHOPIFY_CLIENT_ID"), sec = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  if (id && sec) {
    const r = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: sec }),
    });
    const j = await r.json().catch(() => ({}));
    cc = j.access_token || null;
    out.cc = { status: r.status, scopeField: j.scope, expires_in: j.expires_in, ...(cc ? await scopes(cc) : { err: JSON.stringify(j).slice(0, 200) }) };
  }
  const tok = cc || stored!;
  out.app = (await gql(tok, `{ currentAppInstallation { app { title id } accessScopes { handle } } }`)).body;
  out.location = (await gql(tok, `{ location(id:"gid://shopify/Location/117678014804"){ id name isActive fulfillsOnlineOrders hasActiveInventory shipsInventory fulfillmentService{ handle serviceName } address{ city countryCode } } }`)).body;
  out.sku = (await gql(tok, `{ productVariants(first:5, query:"sku:OG_257799"){ nodes{ id sku inventoryPolicy inventoryQuantity product{ id title } inventoryItem{ id tracked inventoryLevels(first:5){ nodes{ location{ id name } quantities(names:["available","on_hand","committed","incoming"]){ name quantity } } } } } } }`)).body;
  return new Response(JSON.stringify(out, null, 1), { headers: { "Content-Type": "application/json" } });
});
