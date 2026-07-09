## Obiettivo

Backup immediato e read-only delle 354 righe prodotto attualmente presenti in `product_sync_csv_products`, con focus sulle 350 bozze AI. Nessuna modifica ai dati, nessuna rigenerazione AI, nessuna sync Shopify, nessun tocco a storefront/nav/checkout.

## Cosa farò

### 1. Verifica preliminare read-only (SELECT)
Eseguo query di conteggio su `product_sync_csv_products` per confermare i numeri prima di esportare:
- totale righe
- righe con `ai_enrichment_json IS NOT NULL` (bozze AI presenti)
- righe con `shopify_sync_status = 'failed'` o `'partial'` (i "4 in errore")
- righe con `shopify_product_id IS NOT NULL` (Shopify OK)

Se i numeri non tornano (es. non trovo 350 bozze o 354 prodotti), mi fermo e te lo segnalo prima di generare il backup, così decidiamo insieme.

### 2. Export JSON (backup completo, fedele)
Genero `/mnt/documents/backups/ai-drafts-backup-<timestamp>.json` con array di oggetti, un record per SKU, contenente esattamente i campi richiesti:
- `sku`, `handle`, `title`
- `ai_enrichment_json` (intero oggetto, non stringificato)
- `ai_enriched_at`
- `seo_title`, `seo_description`, `optimized_description`
- `metafields` (intero oggetto)
- `shopify_sync_status`
- `shopify_metafields_report`

Nessun token, nessun segreto, nessun campo `auth.*`.

### 3. Export CSV (leggibile, per apertura in Excel/Sheets)
Genero `/mnt/documents/backups/ai-drafts-backup-<timestamp>.csv` con le stesse colonne. I campi JSON annidati (`ai_enrichment_json`, `metafields`, `shopify_metafields_report`) vengono serializzati come stringa JSON in singola cella, con escaping CSV corretto (virgolette raddoppiate, newline preservati).

Entrambi i file sono generati leggendo la stessa query, quindi contenuto identico.

### 4. Report finale
Ti mando:
- numero esatto di bozze AI salvate nel backup (righe con `ai_enrichment_json` non nullo)
- lista dei prodotti in errore: SKU, handle, title, `shopify_sync_status`, `shopify_sync_error`
- path dei due file backup in `/mnt/documents/backups/`, esposti con `<presentation-artifact>` per download diretto
- conferma esplicita che le bozze AI sono già persistite in DB (`product_sync_csv_products.ai_enrichment_json`) e quindi ricaricare la pagina NON le perde — la fix rehydrate del turno precedente le rilegge correttamente all'apertura di Catalogo DB

## Cosa NON farò

- Nessuna `UPDATE`, `INSERT`, `DELETE`, `ALTER`, `DROP` — solo `SELECT`.
- Nessuna chiamata a `ai-enrich-products`, `create-product-ai`, `shopify-admin-proxy` (create/update/publish).
- Nessuna modifica a checkout, storefront, nav, collezioni Shopify, metafield definitions, prodotti Shopify.
- Nessun log/print di `SHOPIFY_ADMIN_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` o altri secret.
- Nessuna migration.
- Nessuna modifica di codice applicativo (nessun file `.ts`/`.tsx` toccato).

## Dettagli tecnici

- Fonte dati: tabella `public.product_sync_csv_products` (RLS attiva, accedo via psql con `PG*` env vars già presenti nel sandbox — service-level read).
- Formato JSON: pretty-print con indent 2 per leggibilità, UTF-8.
- Formato CSV: intestazione sulla prima riga, encoding UTF-8 con BOM per compatibilità Excel IT, separatore `,`.
- File in `/mnt/documents/backups/` sono persistenti e scaricabili dall'utente.
- Timestamp nel nome file in formato `YYYYMMDD-HHMMSS` UTC per evitare sovrascritture in caso di più backup.

## Test di accettazione

- Entrambi i file esistono in `/mnt/documents/backups/`.
- Il conteggio righe del CSV (esclusa intestazione) = conteggio elementi array JSON = conteggio righe query.
- Almeno una riga di spot-check nel JSON mostra `ai_enrichment_json` come oggetto strutturato con i campi attesi (h1_title, seo_title, care_guide, ecc.).
- Report chat elenca esattamente i 4 prodotti in errore con motivo, oppure segnala se il numero effettivo differisce.

Confermi e procedo?
