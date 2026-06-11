# Persistenza arricchimento + azioni singole

## Obiettivi
1. **Non perdere i dati al refresh**: le bozze già generate (e salvate nel DB) devono essere ricaricate automaticamente nel pannello quando si analizzano gli stessi prodotti.
2. **Aggiornare uno alla volta**: oltre ai bottoni batch ("Genera AI tutti" / "Pubblica tutti"), aggiungere bottoni per-riga per generare/pubblicare un singolo prodotto.

## Cosa esiste già
- Durante `generateAll`, ogni bozza viene **già salvata immediatamente nel DB** (`product_sync_csv_products.ai_enrichment_json` + `ai_enriched_at`) — vedi `useProductEnrichment.ts` riga ~204. Quindi i dati persistono lato server.
- Manca solo la **rehydration**: dopo refresh, quando si ricaricano i prodotti, lo stato `batchResults` resta vuoto finché non si rifà tutto da zero.

## Modifiche

### 1. Edge Function — nuova action `get_enriched_drafts`
File: `supabase/functions/shopify-admin-proxy/index.ts`
- Aggiungere action `get_enriched_drafts` che riceve `{ skus: string[] }` e ritorna le righe di `product_sync_csv_products` filtrate per SKU con `ai_enrichment_json IS NOT NULL`.
- Risposta: `{ drafts: Array<{ sku, handle, ai_enrichment_json, seo_title, seo_description, optimized_description, ai_enriched_at, seed_style }> }`.
- Service role bypassa RLS, quindi nessuna policy nuova da scrivere.

### 2. Helper di rehydration
File: `src/admin/lib/aiWriterEngine.ts`
- Aggiungere `getEnrichedDraftsBySkus(skus: string[])` che chiama la nuova action.

File: `src/admin/lib/productEnrichmentEngine.ts`
- Aggiungere `rebuildDraftFromDbRow(row)` che ricostruisce un `EnrichedProductDraft` dai campi salvati (legge `ai_enrichment_json` + colonne SEO).

### 3. Hook `useProductEnrichment`
File: `src/admin/hooks/useProductEnrichment.ts`
- In `analyzeAll`, dopo aver creato `initial`, chiamare in background `getEnrichedDraftsBySkus(skus)` e fondere le bozze trovate nei rispettivi `BatchProductResult` (status `done`, `savedAt` da `ai_enriched_at`, `completeness` ricalcolata con `evaluateCompletenessWithDraft`).
- Mostrare toast tipo "X bozze pre-esistenti ripristinate dal DB".
- Aggiungere `generateOne(product, seedStyle)`: stessa logica di una iterazione di `generateAll`, ma senza loop. Aggiorna lo stato del singolo `BatchProductResult` con `status: "generating" → "done"|"error"`.
- Aggiungere `publishOne(product)`: stessa logica di una iterazione di `publishAll`, richiede `draft` già presente.
- Esporli nel return del hook.

### 4. UI — bottoni per-riga
File: `src/admin/components/ProductEnrichmentPanel.tsx`
- Nella riga `batchResults.map(...)` (intorno a riga 489 "Per-item actions") aggiungere:
  - Bottone **Genera** (icona `Sparkles`) → `generateOne(product, seedStyle)`. Disabilitato se l'item è già in `generating`/`publishing` o se è in corso un batch globale.
  - Bottone **Pubblica** (icona `UploadCloud`) → `publishOne(product)`. Disabilitato se non c'è `draft`, se sorgente è "db", o se l'item è già in corso.
  - Il bottone "CSV" esistente resta.
- Mostrare spinner sul singolo bottone quando lo status dell'item è `generating`/`publishing`.
- I bottoni batch esistenti ("Genera AI tutti", "Pubblica tutti") restano invariati.

### 5. Indicatore "ripristinato da DB"
- Aggiungere mini-badge "DB" accanto allo StatusBadge quando `savedAt` è valorizzato ma la sessione corrente non l'ha generato (semplice flag `restored: boolean` su `BatchProductResult`).

## Non incluso
- Nessuna modifica alle rotte storefront pubbliche.
- Nessuna modifica al CSV di export né al merge Shopify (già fatti nel turno precedente).
- Nessuna nuova tabella DB: la persistenza usa la tabella `product_sync_csv_products` esistente.

## Verifica finale
- `npx tsc --noEmit`
- Test manuale: generare 2-3 prodotti → refresh pagina → cliccare "Carica" + "Analizza tutti" → le bozze devono ricomparire con badge "DB" e score aggiornato.
