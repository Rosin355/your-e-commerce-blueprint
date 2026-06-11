## Check dominio Shopify

Verificato — il dominio hardcoded nel codice **coincide** con lo store Shopify reale collegato:

- Store reale: `ecom-blueprint-gen-6ud1s.myshopify.com`
- `src/lib/shopify.ts` → `ecom-blueprint-gen-6ud1s.myshopify.com` ✅
- `supabase/functions/_shared/shopify-admin-client.ts` (fallback) → `ecom-blueprint-gen-6ud1s.myshopify.com` ✅

Nessuna modifica al dominio necessaria.

## Redeploy edge functions

Eseguire un redeploy forzato di:
- `shopify-admin-proxy`
- `create-product-ai`

Tramite il tool `supabase--deploy_edge_functions` (nessuna modifica al codice — solo redeploy per assicurare che l'ultima versione sia attiva in produzione).

## Nota sul messaggio "Nessun prodotto trovato"

Il pannello "Arricchisci catalogo esistente" usa di default i filtri `source=Shopify Admin` + `status=Attivi`. Il proxy chiama `products.json?status=active&limit=50`. Se vedi "Nessun prodotto trovato" dopo il redeploy, le cause più probabili sono:

1. I prodotti su Shopify sono in stato **draft**, non `active` → prova a cambiare il filtro su "Bozze" o "Tutti".
2. Il secret `SHOPIFY_ACCESS_TOKEN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` nelle edge functions è scaduto o non ha lo scope `read_products`.

Dopo il redeploy posso fare un check rapido chiamando direttamente `shopify-admin-proxy` con `action: list_products` per confermare se Shopify restituisce prodotti o se serve agire sui secrets/stato prodotti.

## Tecnico

In build mode eseguirò:
1. `supabase--deploy_edge_functions({ function_names: ["shopify-admin-proxy", "create-product-ai"] })`
2. `supabase--curl_edge_functions` su `/shopify-admin-proxy` con `{ action: "list_products", data: { status: "any", limit: 5 } }` per validare la risposta reale dello store.
