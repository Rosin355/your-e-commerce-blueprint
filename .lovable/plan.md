
# Bug fix: rehydrate stato Admin > Arricchimento al reload

## Diagnosi

Ho ispezionato la catena di caricamento:

- `shopify-admin-proxy → list_db_products` (righe 183–203) — la SELECT include già: `sku, handle, title, ai_enrichment_json, ai_enriched_at, seo_title, seo_description, optimized_description, metafields, image_urls` e tutti i campi `shopify_*` (product_id, synced_at, sync_status, sync_error, resolved_by, metafields_written/skipped/failed/report, last_sync_mode). Manca solo `ai_seed_style`.
- `src/admin/lib/dbCatalogSource.ts::mapRow` — mappa già `shopifySync` completo (status, syncedAt, resolvedBy, error, metafields.report, lastMode) e `metafields`. Ma NON propaga `ai_enrichment_json` / `ai_enriched_at` sul prodotto (rehydrate della bozza avviene poi via `get_enriched_drafts`).
- `useProductEnrichment.analyzeAll` — costruisce `initial` con `publishedAt = sync.syncedAt` quando `sync.status ∈ {synced, partial}` e con `metafieldsReport` dal DB. Poi chiama `getEnrichedDraftsBySkus(skus)` e fa merge dei draft. Se questa seconda chiamata fallisce (solo `console.error`), i draft restano `null` → tutto va a "Da generare".
- `deriveShopifyStatus` usa `publishedAt`, quindi in teoria "Shopify OK" dovrebbe apparire subito. Se dopo il reload compaiono zero "Shopify OK", significa che `shopifySync` non arriva sul prodotto — quindi il problema è nel percorso `list_db_products → mapRow`, non nel derive.

Probabile causa reale del "tutto zero": la SELECT/mapping restituisce le righe ma per un sottoinsieme il `shopify_sync_status` è `null` (o `pending`) perché il backend segna "già sincronizzato" leggendo `shopify_product_id`, non `shopify_sync_status`. In quel caso `mapRow` non crea `shopifySync` (l'if richiede uno status non-null) e i counters vanno a 0 anche se il prodotto è di fatto già su Shopify. Il toast "Saltato: già sincronizzato" durante Pubblica conferma esattamente questo mismatch.

## Cosa cambio (solo frontend + proxy read-only, nessuna migration, nessun tocco a checkout/storefront/nav/AI/Shopify write)

### Step 1 — `shopify-admin-proxy/index.ts::listDbProducts`
- Aggiungo `ai_seed_style` e `parent_sku` alla SELECT.
- Nessun'altra modifica di logica.

### Step 2 — `src/admin/lib/dbCatalogSource.ts`
- Estendo `DbProductRow` con `ai_enrichment_json`, `ai_enriched_at`, `ai_seed_style`.
- In `mapRow` costruisco `shopifySync` anche quando `shopify_sync_status` è null ma `shopify_product_id` è valorizzato → in tal caso deduco `status = "synced"` (allineato al comportamento server-side che lo tratta come "già sincronizzato"). `syncedAt` fallback su `shopify_synced_at` o `null`.
- Propago `ai_enrichment_json` / `ai_enriched_at` / `ai_seed_style` sul prodotto in un campo opzionale `aiDraft` (nuovo campo su `ShopifyAdminProduct`) così il rehydrate funziona anche se `get_enriched_drafts` non risponde.

### Step 3 — `src/admin/types/aiWriter.ts`
- Aggiungo campo opzionale `aiDraft?: { json: Record<string, unknown>; enrichedAt: string | null; seedStyle: string | null }` a `ShopifyAdminProduct`. Nessun cambio breaking.

### Step 4 — `src/admin/hooks/useProductEnrichment.ts::analyzeAll`
- Rehydrate della bozza in due passaggi:
  1. Primo pass sincrono: se `p.aiDraft?.json` esiste, ricostruisco il draft via `rebuildDraftFromDbRow` usando i campi già in memoria e imposto `savedAt = aiDraft.enrichedAt`, `restored = true`, `status = "done"` (a meno che `shopifySync.status === "failed"`).
  2. Secondo pass (best-effort) su `getEnrichedDraftsBySkus` per completare eventuali righe mancanti.
- Logica badge coerente col brief:
  - `sync.status === "synced"` e `shopify_metafields_failed` in {0, null} → publishedAt valorizzato → derive "ok".
  - `sync.status === "partial"` → derive "partial".
  - `sync.status === "failed"` → derive "error" + messaggio.
  - Se `aiDraft.json` esiste → mai "Da generare".

### Step 5 — Filtro "Da syncare"
- Verifico che il tab `todo` escluda i risultati con `deriveShopifyStatus === "ok"`. Il tab "Tutti" resta invariato e mostra i badge.

### Step 6 — Log diagnostici (solo `import.meta.env.DEV`)
In `analyzeAll`, un unico `console.info("[enrichment.rehydrate]", {...})` con:
- `loadedFromDb`, `withAiJson`, `withShopifySyncStatus`, `rehydratedAsDraft`, `rehydratedAsShopifyOk`, `partial`, `failed`.
Niente log in produzione, niente token, niente PII.

## Cosa NON tocco

- Nessuna migration DB (schema invariato).
- Nessuna rigenerazione AI, nessuna ripubblicazione su Shopify.
- Nessuna modifica al checkout, storefront, PDP, navigazione, categorie, collezioni Shopify.
- Nessuna modifica alle action write del proxy (`update_product`, `create_collections`, `publish_product_copy`).
- Nessuna modifica a `enrichment-run`.

## Test di accettazione (manuali sulla preview)

1. Aprire Admin > Arricchimento, "Carica Catalogo DB".
2. Verificare che i prodotti con `shopify_product_id` mostrino badge "Shopify OK" (o "Parziale"/"Errore" secondo report).
3. Verificare che i prodotti con `ai_enrichment_json` mostrino badge "Bozza AI", mai "Da generare".
4. Reload pagina (F5) → "Carica Catalogo DB" di nuovo → contatori identici.
5. Console DEV mostra `[enrichment.rehydrate]` con numeri coerenti (`rehydratedAsShopifyOk > 0`, `rehydratedAsDraft > 0`).
6. Il tab "Da syncare" esclude i "Shopify OK"; il tab "Tutti" li mostra.
7. Bottone "Pubblica" disabilitato solo quando manca davvero la bozza.
8. `tsgo` e build passano.

## File modificati (previsti)

- `supabase/functions/shopify-admin-proxy/index.ts` (solo SELECT `listDbProducts`)
- `src/admin/lib/dbCatalogSource.ts`
- `src/admin/types/aiWriter.ts`
- `src/admin/hooks/useProductEnrichment.ts`
- (verifica sola lettura) `src/admin/components/ProductEnrichmentPanel.tsx` — modifica solo se il filtro `todo` non esclude già "ok".
