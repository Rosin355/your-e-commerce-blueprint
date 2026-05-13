
# Persistenza bozze AI, completezza dinamica e pulsante Interrompi

## Obiettivi

1. Salvare automaticamente nel DB ogni bozza AI **subito dopo** la generazione, così sopravvive a refresh/chiusura tab.
2. Ricalcolare la **completezza** (la barra %) usando i campi presenti nella bozza AI generata, non solo nel prodotto sorgente.
3. Aggiungere un pulsante **Interrompi** che ferma il loop in modo pulito (la bozza in corso si conclude, le successive non partono) — ciò che è già stato salvato resta nel DB.

## Scelte architetturali

- **Niente nuova tabella**: `product_sync_csv_products` ha già le colonne giuste (`seo_title`, `seo_description`, `optimized_description`, `metafields`, `ai_enrichment_json`, `ai_enriched_at`, `ai_seed_style`). Upsert per `sku`.
- Salvataggio via **edge function** (`shopify-admin-proxy` con nuova action `save_enriched_draft`) per usare il service role e bypassare l'RLS della tabella.
- Lo `sku` è la chiave: lo propaghiamo dall'edge function `list_db_products` fino a `BatchProductResult` (campo nuovo `sku`).
- La completezza diventa una funzione di `(product + draft)`: se la bozza esiste, i suoi campi contano come "presenti".
- **Cancellazione**: `useRef<boolean>` letto a inizio iterazione del loop in `generateAll` / `publishAll`; nessun `AbortController` server-side perché la singola chiamata AI è breve e va completata per non sprecare il risultato.

## Modifiche

### Backend
- `supabase/functions/shopify-admin-proxy/index.ts`
  - In `listDbProducts`: aggiungere `sku` alla SELECT e includerlo nella risposta (era già selezionato, va solo esposto a valle).
  - Nuova action `save_enriched_draft`: input `{ sku, draft: EnrichedProductDraft, seedStyle }`. Esegue upsert su `product_sync_csv_products` per `sku` con i campi `seo_title`, `seo_description`, `optimized_description = draft.body_html`, `metafields`, `ai_seed_style`, `ai_enriched_at = now()`, `ai_enrichment_json = draft`.

### Client
- `src/admin/types/aiWriter.ts` — aggiungere campo opzionale `sku?: string` a `ShopifyAdminProduct` (usato solo in modalità DB).
- `src/admin/lib/dbCatalogSource.ts` — popolare `sku` nel mapping.
- `src/admin/lib/aiWriterEngine.ts` — nuova `saveEnrichedDraftToDb({ sku, draft, seedStyle })` che invoca l'edge function.
- `src/admin/lib/productEnrichmentEngine.ts` — nuova `evaluateCompletenessWithDraft(product, draft)`: costruisce un prodotto sintetico (merge di `seo_title`, `seo_description`, `body_html`, `metafields` dalla bozza dove il sorgente è vuoto) e riusa la funzione esistente.
- `src/admin/hooks/useProductEnrichment.ts`
  - Aggiungere `sku` a `BatchProductResult`.
  - `cancelRef = useRef(false)`; nuova funzione `cancelBatch()`; `isRunning` esposto.
  - `generateAll`: a inizio loop check `cancelRef.current` → break con toast "Interrotto: X/Y completati". Dopo ogni `generateEnrichedDraft` riuscita: chiama `saveEnrichedDraftToDb` (best-effort, errore solo loggato per non bloccare il batch) e ricalcola `completeness` con `evaluateCompletenessWithDraft`.
  - `publishAll`: stesso check di cancellazione.
- `src/admin/components/ProductEnrichmentPanel.tsx`
  - Quando `batchProgress` non è null mostrare bottone **Interrompi** (rosso, secondario) accanto alla progress bar che chiama `cancelBatch()`.
  - La `ScoreBar` continua a leggere `result.completeness.completeness_score` → aggiornamento automatico.

### Comportamento dopo interruzione / refresh

- I prodotti già arricchiti hanno `ai_enriched_at` valorizzato nel DB.
- Cliccando di nuovo "Carica" dalla tab Arricchimento, l'edge function restituisce anche le colonne arricchite e `evaluateProductCompleteness` mostra il nuovo punteggio (perché `seo_title`/`body_html`/`metafields` sono ora popolati dal DB).
- Il bottone "Genera tutti" può essere riusato e processerà anche prodotti già arricchiti (al momento non c'è skip; eventuale "salta arricchiti" è fuori scope).

## File toccati

- `supabase/functions/shopify-admin-proxy/index.ts`
- `src/admin/types/aiWriter.ts`
- `src/admin/lib/dbCatalogSource.ts`
- `src/admin/lib/aiWriterEngine.ts`
- `src/admin/lib/productEnrichmentEngine.ts`
- `src/admin/hooks/useProductEnrichment.ts`
- `src/admin/components/ProductEnrichmentPanel.tsx`
