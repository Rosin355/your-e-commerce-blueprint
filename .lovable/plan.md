

## Piano: Refactoring Shopify — da OAuth custom a sistema nativo Lovable

### Cosa cambia
Rimuoviamo tutto il codice OAuth custom per Shopify e usiamo il connettore nativo di Lovable, che gestisce automaticamente autenticazione, token e accesso alla Admin API (inclusi `read_orders` e `write_orders`).

### Step 1 — Attivare Shopify nativo
- Chiamare `shopify--enable` con `store_type: "new"` per creare un development store
- Offrire il claim dello store dopo la creazione

### Step 2 — Rimuovere edge functions OAuth custom
Eliminare queste edge functions che non servono più:
- `shopify-oauth-start`
- `shopify-oauth-callback`
- `shopify-disconnect`
- `shopify-status`
- `shopify-test-connection`
- `validate-shopify-connection`

### Step 3 — Rimuovere codice client OAuth
- Rimuovere `src/pages/ShopifyCallback.tsx` e la relativa route in `App.tsx`
- Rimuovere `src/lib/shopify-customer-auth.ts` (se legato all'OAuth custom)
- Semplificare `src/admin/pages/AdminSettings.tsx`: rimuovere tutta la logica di connessione/disconnessione OAuth manuale

### Step 4 — Aggiornare il client Admin API
- Riscrivere `supabase/functions/_shared/shopify-admin-client.ts` per usare i secrets forniti dal connettore nativo invece di leggere dalla tabella `shopify_connections`
- Le edge functions esistenti (`get-products`, `get-customer-orders`, `shopify-admin-proxy`, ecc.) useranno il nuovo client

### Step 5 — Aggiornare `src/lib/shopify.ts`
- Rimuovere le costanti hardcoded dello store vecchio (`SHOPIFY_STORE_PERMANENT_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`)
- Il domain e i token verranno dal sistema nativo

### Step 6 — Pulizia secrets obsoleti
- I secrets `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_APP_URL`, `SHOPIFY_ADMIN_SHOP` non saranno più necessari (il connettore nativo gestisce tutto)

### Step 7 — Test
- Verificare che i prodotti si carichino correttamente
- Verificare che gli ordini siano leggibili dal portale

### File coinvolti
- **Da eliminare**: 6 edge functions OAuth, `ShopifyCallback.tsx`
- **Da modificare**: `App.tsx`, `AdminSettings.tsx`, `shopify-admin-client.ts`, `shopify.ts`
- **Invariati**: `get-products`, `get-customer-orders`, `shopify-admin-proxy` (cambieranno solo il modo di ottenere il token)

### Ordini
Con il sistema nativo, gli scopes `read_orders` e `write_orders` sono disponibili. Potrai:
- Leggere lo storico ordini dei clienti
- Gestire ordini direttamente dal portale admin

