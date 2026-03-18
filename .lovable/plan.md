

## Problema

L'edge function `export-complete-products-csv` tenta di chiamare l'API Admin GraphQL di Shopify direttamente, ma la variabile `SHOPIFY_STORE` non è configurata come secret, causando l'errore "SHOPIFY_STORE mancante".

Inoltre, la logica è sbagliata concettualmente: l'export "solo completi" dovrebbe filtrare i **2443 prodotti già arricchiti nel database** (`product_sync_csv_products` con `ai_enriched_at` non null), non fare query a Shopify.

## Piano

### 1. Riscrivere `export-complete-products-csv` per leggere dal database

Invece di chiamare Shopify Admin GraphQL, la funzione:
- Legge da `product_sync_csv_products` (come fa già `export-enriched-csv`)
- Filtra solo i prodotti arricchiti (`ai_enriched_at IS NOT NULL`) che soddisfano i criteri di completezza:
  1. Almeno un'immagine (`image_urls` array non vuoto)
  2. SEO title non vuoto (`seo_title` oppure dal campo `ai_enrichment_json.seo_title`)
  3. SEO description non vuota (`seo_description` oppure dal campo `ai_enrichment_json.seo_description`)
  4. Prezzo > 0
- Pagina con blocchi da 1000 righe via `.range()`
- Genera CSV nello stesso formato Shopify-compatible di `export-enriched-csv`
- Restituisce stats (analizzati, esportati, scartati) negli header HTTP custom

### 2. Aggiornare il client `exportCompleteProductsCsv`

Nessuna modifica sostanziale necessaria — la funzione client già legge gli header `X-Total-Analyzed/Exported/Skipped` e scarica il blob CSV.

### 3. Nessuna modifica alla UI

Il bottone e il pannello stats nel `ProductSyncPanel.tsx` restano invariati.

### File da modificare
- `supabase/functions/export-complete-products-csv/index.ts` — riscrittura completa: da Shopify GraphQL a query database locale con filtri completezza

