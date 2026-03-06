

# Fix: Aggiornare il SHOPIFY_ACCESS_TOKEN

## Problema

L'errore `Invalid API key or access token` indica che il secret `SHOPIFY_ACCESS_TOKEN` attualmente configurato non e valido. Tutte le chiamate alla Edge Function `shopify-admin-proxy` falliscono con 500.

## Soluzione

Aggiornare il secret `SHOPIFY_ACCESS_TOKEN` con il token corretto (che inizia con `shpat_`).

### Come ottenere il token

1. Accedi al pannello admin Shopify del tuo store (`lovable-project-6tknn.myshopify.com`)
2. Vai su **Settings → Apps and sales channels → Develop apps**
3. Seleziona la tua app (o creane una nuova con permessi `read_customers`, `write_customers`, `read_products`, `write_products`)
4. Vai su **API credentials**
5. Copia l'**Admin API access token** (formato: `shpat_...`)

### Implementazione

Una volta approvato il piano, usero lo strumento `add_secret` per chiederti di inserire il nuovo token in modo sicuro. Il token verra salvato come secret nel backend e sara accessibile solo dalla Edge Function, mai esposto nel frontend.

Nessuna modifica al codice necessaria -- la Edge Function gia legge `SHOPIFY_ACCESS_TOKEN` da `Deno.env.get()`.

