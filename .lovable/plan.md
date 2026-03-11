## Stato: ✅ Risolto

### Problema
Il secret `SHOPIFY_ACCESS_TOKEN` conteneva un Client Secret (`shpss_`), non un Admin API access token (`shpat_`). Le app create dal Dev Dashboard richiedono il flusso OAuth `client_credentials` per ottenere un token temporaneo.

### Soluzione implementata
- Edge Function `shopify-admin-proxy` aggiornata per usare il flusso OAuth `client_credentials`
- Due nuovi secrets configurati: `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET`
- Token cachato in-memory con refresh automatico (validità 24h)
- Test superato: `search_customer` risponde 200 con `{ "found": false }`
