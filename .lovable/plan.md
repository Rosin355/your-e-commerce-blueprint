

## Piano: Hardening OAuth Shopify + logging diagnostico

### Problema
Il flusso OAuth potrebbe non funzionare correttamente. Servono log diagnostici, hard fail su token mancante, status endpoint migliorato, e disabilitazione del fallback env quando esiste connessione DB.

### Modifiche

#### 1. `shopify-oauth-start/index.ts` — Log diagnostici
- Aggiungere log dopo la costruzione dell'URL: `console.log("[OAUTH START]", { shopDomain, redirectUri, authUrl })`
- Verificare che `redirect_uri` punti correttamente a `SHOPIFY_APP_URL + /api/shopify/callback` (la route esiste gia' in App.tsx)

#### 2. `shopify-oauth-callback/index.ts` — Log + hard fail
- Aggiungere dopo parsing input: `console.log("[OAUTH CALLBACK INPUT]", { code, shop, state })`
- Aggiungere dopo token exchange: `console.log("[TOKEN RESPONSE]", { status: tokenResponse.status, has_token: !!tokenData.access_token, scope: tokenData.scope })`
- Hard fail esplicito se `access_token` mancante: `throw new Error("Shopify OAuth non ha restituito access_token")`
- Aggiungere dopo DB save: `console.log("[DB SAVE]", { shop: shopDomain, token_prefix: tokenData.access_token?.substring(0,6), scopes: tokenData.scope })`

#### 3. `shopify-status/index.ts` — Endpoint migliorato
- Quando connessione DB trovata, aggiungere `token_present: true` e `source: "db"` nella risposta
- Quando connessione DB trovata, leggere anche `access_token` (per verificare presenza, non esporre il valore)
- Rimuovere il blocco fallback env vars: se non c'e' connessione DB, restituire `connected: false`

#### 4. `_shared/shopify-admin-client.ts` — Disabilitare fallback env
- In `getShopifyConfigAsync`: rimuovere il fallback a env vars (linee 72-82). Se non c'e' connessione DB attiva, lanciare errore diretto
- Mantenere `getShopifyConfig()` sync come backward compat ma marcarlo deprecated
- Mantenere `clearConfigCache()` invariato

#### 5. Deploy e test
- Deploy delle 3 edge functions modificate
- Curl `shopify-status` per verificare risposta

### File coinvolti
- `supabase/functions/shopify-oauth-start/index.ts`
- `supabase/functions/shopify-oauth-callback/index.ts`
- `supabase/functions/shopify-status/index.ts`
- `supabase/functions/_shared/shopify-admin-client.ts`

