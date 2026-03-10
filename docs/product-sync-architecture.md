# Smart Product Sync (Woo CSV -> Shopify) - Lovable + Supabase

## Componenti implementati

- **Migration SQL**: `supabase/migrations/20260309120000_create_product_sync_jobs.sql`
- **Edge Function avvio job**: `supabase/functions/start-product-sync/index.ts`
- **Edge Function processing batch**: `supabase/functions/process-product-sync/index.ts`
- **Moduli condivisi**:
  - `supabase/functions/_shared/product-sync-processor.ts`
  - `supabase/functions/_shared/product-compare.ts`
  - `supabase/functions/_shared/ai-product-enricher.ts`
  - `supabase/functions/_shared/csv-parser.ts`
  - `supabase/functions/_shared/shopify-graphql.ts`
  - `supabase/functions/_shared/job-repo.ts`
- **UI Admin**:
  - `src/admin/components/ProductSyncPanel.tsx`
  - `src/admin/lib/productSyncEngine.ts`
  - `src/admin/types/productSync.ts`
  - Integrazione tab in `src/admin/pages/AdminImport.tsx`

## Variabili ambiente Edge Functions

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOPIFY_STORE`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION` (default `2025-01`)
- `SYNC_CSV_BUCKET` (default `sync`)
- `SYNC_CSV_PATH` (default `shopify-ready.csv`)
- `SYNC_BATCH_SIZE` (default `10`, max `10`)
- `ADMIN_SYNC_EMAILS` (opzionale, CSV email)
- `ADMIN_SYNC_TOKEN` (opzionale hardening)
- `AI_ENRICH_MODE` (`mock` | `openai` | `disabled`)
- `AI_ENRICH_TIMEOUT_MS`
- `OPENAI_API_KEY` (solo se `AI_ENRICH_MODE=openai`)
- `OPENAI_COPY_MODEL` (opzionale)

## Flusso operativo

1. L'admin apre tab **Smart Sync** e clicca uno dei pulsanti:
   - Avvia sincronizzazione
   - Arricchisci con AI
   - Rigenera immagini AI
   - Verifica integrità
2. UI chiama `start-product-sync` e ottiene `job_id`.
3. UI effettua polling su `process-product-sync` (2.5s).
4. Ogni chiamata processa massimo 10 prodotti Shopify.
5. `product_sync_jobs.report_json.logs` viene aggiornato progressivamente.

## Note tecniche

- Nessuna API key AI lato client.
- Nessun accesso a filesystem locale.
- Lettura CSV da Supabase Storage.
- Aggiornamento Shopify solo sui campi realmente differenti.
- Retry/rate-limit base su Shopify (429 con backoff).
