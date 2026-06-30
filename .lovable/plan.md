## Obiettivo
Rendere persistente e visibile lo stato di sync Shopify per ogni prodotto in Admin > Arricchimento, in modo che dopo refresh / ricarica Catalogo DB i prodotti già sincronizzati continuino a mostrare "Shopify OK" con il relativo MF report.

## Stato attuale (verificato)
- `product_sync_csv_products` NON contiene campi per tracciare la sync Shopify (solo `ai_enrichment_json`, `ai_enriched_at`, `metafields`).
- `shopify-admin-proxy > update_product` esegue Shopify PUT + `metafieldsSet` ma NON scrive nulla in DB sul risultato.
- `listDbProducts` non seleziona alcun campo di sync Shopify.
- `useProductEnrichment.analyzeAll` ricostruisce `BatchProductResult` solo da memoria locale → dopo refresh sparisce `publishedAt` e `metafieldsReport`.
- `ShopifyAdminProduct` non ha campo `shopifySync`.
- "MF inviati · saltati" senza failed dovrebbe essere considerato OK ma oggi la logica di status guarda solo `details.some(failed)` su uno stato volatile.

## Piano

### 1. Migration Supabase
Aggiungere a `public.product_sync_csv_products`:
- `shopify_product_id text`
- `shopify_synced_at timestamptz`
- `shopify_sync_status text` (valori: `pending|synced|partial|failed`)
- `shopify_sync_error text`
- `shopify_resolved_by text`
- `shopify_metafields_written integer default 0`
- `shopify_metafields_skipped integer default 0`
- `shopify_metafields_failed integer default 0`
- `shopify_metafields_report jsonb`
- `shopify_last_sync_mode text` (`full_publish|metafields_only`)
- Indice su `shopify_sync_status`.

Nessuna nuova RLS (la tabella è già accessibile via service role dalle edge function).

### 2. `shopify-admin-proxy > update_product`
Dopo l'esecuzione di Shopify PUT + `metafieldsSet`:
- Calcolare counts dal report (`written`, `skipped`, `failed` — skipped NON conta come errore).
- Determinare status: `synced` se `failed === 0`, `partial` se `failed > 0` ma update prodotto OK, `failed` se l'intera PUT/lookup fallisce (gestito nel catch).
- `UPDATE product_sync_csv_products` per `sku` (con fallback `handle`) salvando: `shopify_product_id`, `shopify_synced_at = now()`, `shopify_sync_status`, `shopify_resolved_by`, counts, `shopify_metafields_report` (oggetto completo), `shopify_last_sync_mode` (`metafields_only` se flag, altrimenti `full_publish`), `shopify_sync_error = null`.
- Nel catch top-level del case `update_product`, se abbiamo `sku`/`handle`, scrivere `shopify_sync_status='failed'` + `shopify_sync_error = message` (best-effort, non bloccante).

### 3. `listDbProducts`
Aggiungere alla SELECT i nuovi campi sync.

### 4. Frontend types & mapping
- `src/admin/types/aiWriter.ts`: aggiungere a `ShopifyAdminProduct` un campo opzionale `shopifySync?: { status: 'pending'|'synced'|'partial'|'failed'; productId?: string; syncedAt?: string; resolvedBy?: string; error?: string; lastMode?: string; metafields?: { written: number; skipped: number; failed: number; report?: MetafieldsReport } }`.
- `src/admin/lib/dbCatalogSource.ts`: estendere `DbProductRow` e `mapRow` per popolare `shopifySync` dai nuovi campi.

### 5. `useProductEnrichment`
- Quando `analyzeAll` costruisce `BatchProductResult` iniziali, hydrate da `product.shopifySync`:
  - se `synced` o `partial` → `publishedAt = shopifySync.syncedAt`, `metafieldsReport = shopifySync.metafields?.report`, `status = 'done'`.
  - se `failed` → `status = 'error'`, `error = shopifySync.error`.
  - se `pending` → invariato.
- Centralizzare la logica di derivazione del badge sync in un helper `deriveShopifyStatus(result)` che restituisce `'ok'|'partial'|'error'|'none'`, considerando OK quando ci sono solo skipped.

### 6. `ProductEnrichmentPanel`
- Header counters: bozze AI, sync Shopify OK, sync parziali, sync errori, da fare (usare helper sopra).
- `StatusBadge`: nuovi badge "Shopify OK" / "Shopify parziale" / "Errore sync" / "Bozza AI" / "Da generare".
- MF chip: leggere da `metafieldsReport` già hydrato (resta visibile dopo reload).
- Aggiungere tabs/filtri sopra la lista: Tutti · Da syncare · Sync OK · Parziali/errori.
- Aggiornare copy "16 metafield" → "19 metafield" dove presente.
- Aggiornare tooltip/copy come da spec.

### 7. Idempotenza
La risoluzione id-by-sku/handle esiste già in `update_product`; nessun cambiamento, solo verificare che il flusso "Pubblica solo metafield" passi sempre `sku` o `handle` (già fatto).

### 8. Verifica
- `bunx tsgo --noEmit` per typecheck.
- Build automatica.

### 9. Deploy richiesti (post-approvazione)
- Applicare migration.
- `supabase functions deploy shopify-admin-proxy`.
- `enrichment-run` non viene toccato.

## File toccati
- `supabase/migrations/<new>_shopify_sync_tracking.sql` (nuovo)
- `supabase/functions/shopify-admin-proxy/index.ts`
- `src/admin/types/aiWriter.ts`
- `src/admin/lib/dbCatalogSource.ts`
- `src/admin/hooks/useProductEnrichment.ts`
- `src/admin/components/ProductEnrichmentPanel.tsx`

## Test di accettazione
1. Sync di un prodotto → riga mostra "Shopify OK" + MF report.
2. Refresh pagina + Ricarica Catalogo DB → stesso prodotto ancora "Shopify OK" + MF report visibile.
3. Prodotto con 1 metafield failed → badge "Shopify parziale".
4. Prodotto mai pubblicato → "Da syncare".
5. Filtri tab funzionano.

## Fuori scopo
Storefront pubblico, checkout, pipeline Woo, CSV export.
