# Audit Shopify Admin Proxy — 401 "Invalid API key or access token"

## 1. Stato attuale dei secrets nel progetto

Dai secrets Supabase configurati (nomi visibili, valori mai mostrati):

| Variabile | Presente | Note |
|---|---|---|
| `SHOPIFY_ADMIN_API_TOKEN` | **ASSENTE** | Manca il token di Custom App (`shpat_***`). Sarebbe la priorità 1 del resolver. |
| `SHOPIFY_CLIENT_ID` | presente | Usato per OAuth client_credentials. |
| `SHOPIFY_CLIENT_SECRET` | presente | Usato per OAuth client_credentials. |
| `SHOPIFY_ONLINE_ACCESS_TOKEN:user:DkarFxhhJoWcKGvcCPRYwjWrVMk2` | presente | Token online del connettore nativo Lovable, legato all'utente. |
| `SHOPIFY_ACCESS_TOKEN` | presente | Legacy: scelto solo se inizia con `shpat_/shpca_/shpss_`. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | ASSENTE | — |
| `SHOPIFY_HEADLESS_PRIVATE_TOKEN` | presente | Storefront privato (lato cliente), non interferisce. |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | presente | Storefront pubblico, non interferisce. |
| `SHOPIFY_STORE_PERMANENT_DOMAIN` | non impostato come secret | Il codice usa fallback hardcoded `ecom-blueprint-gen-6ud1s.myshopify.com` (formato corretto). |

## 2. Quale token sta usando davvero il proxy (e perché fallisce)

Ordine reale di scelta nel resolver `resolveAdminAccessToken()`:

1. `SHOPIFY_ADMIN_API_TOKEN` → **non c'è**, si passa oltre.
2. OAuth `client_credentials` con `SHOPIFY_CLIENT_ID/SECRET` → i log dicono:
   ```
   [shopify-admin-client] client_credentials failed (400):
   {"error":"app_not_installed","error_description":"The application is not installed on this shop."}
   ```
   La Custom App associata a `CLIENT_ID/SECRET` **non risulta installata** sullo store `ecom-blueprint-gen-6ud1s.myshopify.com`. Quindi salta.
3. `SHOPIFY_ONLINE_ACCESS_TOKEN:user:...` → viene scelto questo. È un token online del connettore Lovable, presumibilmente **scaduto o emesso per una sessione precedente / app non più installata**, e Shopify lo rifiuta con `401 Invalid API key or access token`. È questo l'errore che vedi.

Diagnosi: il resolver sta usando un token "online" stantio perché manca il token Custom App e la app OAuth non è installata.

## 3. Dominio store

`SHOPIFY_STORE_PERMANENT_DOMAIN` non è impostato come secret; il codice usa il default `ecom-blueprint-gen-6ud1s.myshopify.com`. Formato corretto (`*.myshopify.com`, senza `https://`, senza `www`). Coerente con la memoria di progetto. Nessun fix necessario qui — ma è opportuno impostarlo esplicitamente come secret per evitare drift.

## 4. Azione consigliata: aggiungere un Admin API token di Custom App

Questa è la via più stabile e quella già prevista come priorità 1.

Dove recuperarlo in Shopify:
1. Shopify Admin → **Settings** → **Apps and sales channels**
2. **Develop apps** → crea (o seleziona) una **Custom App**, es. "Lovable Admin Proxy"
3. **Configure Admin API scopes** e abilita: `read_products`, `write_products`, `read_metafields`, `write_metafields`, `read_inventory`, `write_inventory` (aggiungi `read_publications`/`write_publications` se in futuro pubblichi su canali)
4. **Install app** sullo store (fondamentale, altrimenti darà di nuovo `app_not_installed`)
5. **API credentials** → copia **Admin API access token** (inizia con `shpat_...`)
6. Verifica che lo store su cui hai installato la Custom App sia esattamente `ecom-blueprint-gen-6ud1s.myshopify.com`.

Poi lo salvi come secret `SHOPIFY_ADMIN_API_TOKEN` tramite il tool sicuro (nessun valore in chat, nessun commit in repo).

## 5. Secrets da rimuovere / aggiornare

- `SHOPIFY_ONLINE_ACCESS_TOKEN:user:DkarFxhhJoWcKGvcCPRYwjWrVMk2` → **rimuovere**. È stantio, ed essendo nello scope `SHOPIFY_ONLINE_ACCESS_TOKEN*` viene scelto come priorità 3 e provoca proprio il 401 attuale.
- `SHOPIFY_ACCESS_TOKEN` → controllare il valore: se non inizia con `shpat_/shpca_/shpss_` (es. è una API key/secret), **rimuoverlo** per evitare confusione. Se invece è un vero token Admin valido per questo store, può restare come fallback.
- `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` → tenerli solo se vuoi continuare con OAuth client_credentials, ma in quel caso devi **installare la app** sullo store. Se passi al Custom App token, puoi anche lasciarli ma non verranno usati (perché la priorità 1 vince).
- `SHOPIFY_STORE_PERMANENT_DOMAIN` → impostarlo esplicitamente a `ecom-blueprint-gen-6ud1s.myshopify.com` per togliere il fallback hardcoded.

(Niente token verrà mai stampato: nei log resta solo la sorgente scelta.)

## 6. Funzioni da redeployare

Dopo l'aggiornamento dei secrets:
- `shopify-admin-proxy`
- `create-product-ai` (se usa lo stesso shared client)
- `enrichment-run` (se invoca il proxy o lo shared client)

I secrets sono letti a runtime, ma il redeploy garantisce ambiente fresco e cache token invalidata.

## 7. Test di verifica

1. Admin → Arricchimento → Shopify Admin → **Carica prodotti**: deve restituire la lista senza 401.
2. Nei log della funzione, l'errore `client_credentials failed` non deve più comparire (perché ora vince la priorità 1).
3. Lanciare anche un **"Pubblica solo metafield"** su un prodotto noto per validare scope `write_metafields`.
4. Se Shopify risponde ancora 401 dopo il fix, ricontrollare che:
   - il token sia stato copiato per intero (i `shpat_...` sono lunghi),
   - la Custom App sia **installata** sullo store giusto,
   - gli scope siano stati salvati prima di installare.

## Dettagli tecnici (riferimenti)

- Resolver: `supabase/functions/_shared/shopify-admin-client.ts:99-135`
- Dominio default: `supabase/functions/shopify-admin-proxy/index.ts:115`
- API version usata: `2025-07` (env `SHOPIFY_ADMIN_API_VERSION`, default ok).

## Riepilogo decisione

Causa root: manca `SHOPIFY_ADMIN_API_TOKEN`; il fallback OAuth fallisce con `app_not_installed`; viene poi scelto `SHOPIFY_ONLINE_ACCESS_TOKEN:user:...` stantio che Shopify rifiuta con 401.

Fix: creare/installare una Custom App, salvarne il token in `SHOPIFY_ADMIN_API_TOKEN`, rimuovere il vecchio `SHOPIFY_ONLINE_ACCESS_TOKEN:user:...` (e gli eventuali `SHOPIFY_ACCESS_TOKEN` non validi), redeployare le funzioni elencate, ritestare "Carica prodotti".
