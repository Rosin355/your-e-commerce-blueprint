
# Piano: Integrazione completa app Headless di Shopify

Obiettivo: risolvere il problema del token Admin scaduto, ridurre la dipendenza dall'Admin API per le letture e centralizzare la Customer Account API sotto l'app Headless ufficiale.

---

## Parte 1 — Rigenerare Admin API token (sblocca enrichment AI, sync, proxy)

L'app Headless non genera Admin token, quindi serve una **Custom App** dedicata. Procedura che ti guiderò passo passo:

1. Shopify Admin → Settings → Apps and sales channels → **Develop apps** → Create an app → nome es. "Lovable Admin"
2. Configure Admin API scopes: `read_products`, `write_products`, `read_customers`, `write_customers`, `read_orders`, `read_inventory`, `write_inventory`, `read_files`, `write_files`
3. Install app → copia l'**Admin API access token** (`shpat_...`)
4. Aggiorno il secret `SHOPIFY_ACCESS_TOKEN` tramite il tool secrets (form sicuro, tu incolli il valore)
5. Test immediato del proxy con `list_products` per confermare che enrichment + sync tornino attivi

Nessuna modifica al codice in questa fase — solo rotazione del secret.

---

## Parte 2 — Migrare letture su Storefront API privata dell'app Headless

Nelle edge functions, oggi tutte le letture passano da Admin API. Le sposto su **Storefront API token privato** dello Storefront che hai creato nell'app Headless (più resiliente, scope dedicati read-only, rate limit migliori, non scade come gli Admin token).

### Cosa migra
- `shopify-admin-proxy::list_products` (listing per pannello enrichment)
- `shopify-admin-proxy::get_product` (lettura singolo prodotto prima dell'enrichment AI)
- `get-products` edge function (homepage V3, già su Admin REST)
- Eventuali letture in `process-product-sync` per il diff (verifico durante l'implementazione)

### Cosa NON migra (resta su Admin API)
- `update_product`, `create_product`, `publish_product_copy` (scritture)
- `search_customer`, `create_customer`, `update_customer`
- `get-customer-orders` (richiede Admin scope)
- Gestione immagini/media (`productCreateMedia`)
- Metafields write

### Tecnico
- Nuovo secret `SHOPIFY_HEADLESS_PRIVATE_TOKEN` (Storefront private access token dall'app Headless)
- Nuovo helper `supabase/functions/_shared/shopify-storefront-server.ts` con client GraphQL Storefront server-side (API version 2025-07)
- Refactor delle funzioni di lettura per usare il nuovo helper, mantenendo lo stesso shape di risposta verso i chiamanti frontend (`normalizeProduct`) per evitare regressioni nel pannello admin
- Fallback automatico su Admin API se Storefront fallisce (resilienza)

---

## Parte 3 — Consolidare Customer Account API sotto Headless

Oggi il login cliente usa Client ID OAuth PKCE configurato manualmente (vedi `src/lib/shopify-customer-auth.ts`). L'app Headless ti dà un pannello unico per:

- Client ID Customer Account API
- Redirect URIs allowlist (importante: aggiungere `https://romeshbigbird.com/account/callback`, preview Lovable e localhost)
- Scope (`customer-account-api:full`)

### Cosa faccio
1. Ti guido a verificare nello Storefront Headless → Customer Account API → copia Client ID e Authorization endpoint
2. Confronto con i valori hardcoded in `src/lib/shopify-customer-auth.ts`; se diversi, li allineo
3. Aggiungo i redirect URI mancanti (te li indico, li incolli tu nell'app Headless)
4. Test del flusso login end-to-end dalla preview

Nessun cambio di logica di auth — solo allineamento delle credenziali e verifica del flusso esistente.

---

## Ordine di esecuzione (passi in build mode)

1. **Step 1 (immediato, sblocca tutto):** richiesta `update_secret` per `SHOPIFY_ACCESS_TOKEN` → tu incolli il nuovo Admin token → test `list_products` via curl edge function
2. **Step 2:** richiesta `add_secret` per `SHOPIFY_HEADLESS_PRIVATE_TOKEN` → tu incolli lo Storefront private token
3. **Step 3:** creo helper Storefront server-side + refactor `list_products` / `get_product` / `get-products` con fallback
4. **Step 4:** verifica Customer Account API credentials (lettura file + confronto con quanto vedi in Headless)
5. **Step 5:** smoke test: enrichment AI su un prodotto, homepage che carica, login cliente

---

## Note tecniche

- Tutti gli helper rispettano i constraint Deno (ESM da `esm.sh`, no `npm:`)
- Mantengo invariati i contratti API verso il frontend (pannello admin e storefront) → zero breaking change
- Cache 60s già attiva nel client Admin viene replicata nel client Storefront server-side
- Il fallback Admin→Storefront e viceversa è loggato per diagnostica

---

## Cosa serve da te prima di partire (build mode)

- **Admin API access token** della Custom App che creerai (Parte 1)
- **Storefront private access token** dello Storefront Headless già installato (Parte 2)
- Conferma che i redirect URI Customer Account siano allineati (Parte 3) — te li indicherò io

Confermi e passiamo in build mode?
