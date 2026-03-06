

## Diagnosi

Dalla documentazione Shopify che hai condiviso, ora è chiaro: con le app create dal Dev Dashboard, non ottieni direttamente un token `shpat_`. Devi **scambiare** il client_id e client_secret tramite il flusso OAuth `client_credentials` per ottenere un token temporaneo `shpat_` (valido 24 ore).

## Piano: Aggiornare la Edge Function per usare il flusso client_credentials

### Cosa cambia

La Edge Function `shopify-admin-proxy` verrà modificata per:

1. **Ottenere automaticamente un access token** prima di ogni batch di chiamate, usando:
   - `POST https://lovable-project-6tknn.myshopify.com/admin/oauth/access_token`
   - Body: `grant_type=client_credentials&client_id={id}&client_secret={secret}`
   - Risposta: `{ "access_token": "shpat_xxxxx", "expires_in": 86399 }`

2. **Usare il token ottenuto** nell'header `X-Shopify-Access-Token` per le chiamate Admin API.

3. **Cache in-memory** del token per evitare di richiederne uno nuovo ad ogni singola richiesta (il token dura 24h).

### Secrets necessari

Servono **due** secrets invece di uno:
- `SHOPIFY_CLIENT_ID` — il Client ID della tua app (lo vedi nello screenshot)
- `SHOPIFY_CLIENT_SECRET` — il Client Secret (`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`)

Il secret `SHOPIFY_ACCESS_TOKEN` attuale non servirà più (verrà generato automaticamente dalla funzione).

### Passaggi implementativi

1. **Aggiungere il secret `SHOPIFY_CLIENT_ID`** — ti chiederò di incollare il valore dal Dev Dashboard
2. **Rinominare/aggiornare `SHOPIFY_ACCESS_TOKEN`** in `SHOPIFY_CLIENT_SECRET` con il valore `shpss_` che hai già fornito
3. **Aggiornare `supabase/functions/shopify-admin-proxy/index.ts`**:
   - Aggiungere funzione `getAccessToken()` che fa il POST OAuth e cachea il risultato
   - Modificare `shopifyFetch()` per usare il token dinamico
4. **Testare** con una chiamata `search_customer` per verificare che il flusso funzioni

### Dettaglio tecnico della funzione token

```text
Edge Function startup
  │
  ├─ Richiesta in arrivo
  │   ├─ Token in cache e non scaduto? → usa quello
  │   └─ Altrimenti → POST /admin/oauth/access_token
  │       ├─ client_id + client_secret
  │       └─ Ritorna shpat_xxx (24h)
  │
  └─ Procedi con chiamata Admin API
```

