
Diagnosi (perché non funziona)
- Ho ritestato la funzione backend `shopify-admin-proxy`: risponde 500.
- I log mostrano sempre: `Invalid API key or access token`.
- Dal tuo screenshot, il valore che hai passato (`shpss_...`) è il **Secret della app** (client secret), non il **Admin API access token** richiesto dalle chiamate Admin.
- La funzione invia quel valore nell’header `X-Shopify-Access-Token`: lì deve esserci un token `shpat_...`.
- Quindi: app installata correttamente, ma credenziale sbagliata nel secret backend.

Piano di risoluzione
1) Recuperare il token corretto
- In Shopify Admin dello store `lovable-project-6tknn`:
  `Impostazioni → App e canali di vendita → Sviluppa app → [tua app] → API credentials`
- Copiare **Admin API access token** (prefisso `shpat_`), non “API secret key” (`shpss_`).

2) Verificare scope app
- Confermare che la app abbia almeno:
  `read_customers`, `write_customers`, `read_products`, `write_products`.
- Se modifichi scope: salva e reinstalla/aggiorna la app.

3) Aggiornare il secret backend
- Sostituire `SHOPIFY_ACCESS_TOKEN` con il nuovo `shpat_...`.

4) Retest tecnico immediato
- Chiamata test `search_customer` su `shopify-admin-proxy`.
- Esito atteso: risposta 200 con `{ found: ... }` (non 500).

5) Verifica funzionale in UI
- Da `/admin/import`: eseguire prima **Dry Run** clienti, poi **Sync Shopify**.
- Esito atteso: niente errori “Invalid API key or access token”.

Dettagli tecnici (breve)
- Punto codice: `supabase/functions/shopify-admin-proxy/index.ts` usa `Deno.env.get('SHOPIFY_ACCESS_TOKEN')` in `X-Shopify-Access-Token`.
- Dominio store in funzione è coerente (`lovable-project-6tknn.myshopify.com`), quindi non è il problema principale.
- Possibile miglioramento (da implementare dopo): validazione formato token in funzione (se `shpss_` → errore esplicito guidato) per evitare futuri loop di debug.

Input che mi serve da te per procedere subito
- Incolla il nuovo token **`shpat_...`** e faccio io update + retest end-to-end.
