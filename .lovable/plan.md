## Cosa cambia per il cliente

Risposta breve da dargli: **sì, il flusso è "Genera → Scarica CSV Shopify (importabile) → importa in Shopify Admin"**. La pubblicazione diretta API resta come opzione, ma il CSV è il backup stabile.

Sul bug della barra: oggi lo stato del batch vive solo in memoria React, quindi al refresh si azzera anche se i dati AI sono già stati salvati su `product_sync_csv_products`. Risolvo con due livelli di persistenza, come hai chiesto.

## Obiettivo

1. **Vista "stato catalogo" sempre visibile** — mostra in ogni momento quanti prodotti hanno già AI/SEO/metafield generati, indipendentemente da chi ha lanciato il batch o quando.
2. **Sessioni di run persistite** — ogni batch viene registrato su DB; al refresh ritrovi il run con i suoi item (fatti / falliti / mancanti) e decidi tu se cliccare di nuovo "Genera" sui rimanenti.

## Cosa farò

### 1. Nuova tabella `product_enrichment_runs`

Migrazione DB con due tabelle:

- `product_enrichment_runs` — un record per batch lanciato.
  - `id uuid pk`, `created_at`, `updated_at`, `initiated_by text` (email admin), `status text` (`running`/`paused`/`completed`/`aborted`), `total int`, `done int`, `failed int`, `mode text` (`generate`/`generate_and_publish`), `notes jsonb` (debug flag, retries, style, ecc.).
- `product_enrichment_run_items` — un record per SKU dentro il run.
  - `id uuid pk`, `run_id fk`, `sku text`, `handle text`, `title text`, `status text` (`pending`/`done`/`error`), `error_message text`, `metafields_report jsonb`, `updated_at`.

Grant + RLS: lettura/scrittura ad `authenticated` (controllo admin lato edge function / hook usa già il whitelist email), `service_role` tutto.

### 2. Vista "Stato catalogo" (riquadro nuovo in cima al pannello)

Componente `EnrichmentCatalogStatus.tsx`:

- Query DB diretta su `product_sync_csv_products`:
  - **Totale prodotti** con `price > 0` e immagine.
  - **Con AI completata**: `ai_enriched_at IS NOT NULL`.
  - **Con metafield popolati**: count su `metafields ?| array['nome_botanico', ...]` (almeno N key presenti).
  - **Con SEO completa**: `seo_title IS NOT NULL AND seo_description IS NOT NULL`.
- Barra di progresso "X / Y prodotti pronti all'export" (i 4 conteggi + percentuale).
- Pulsante "Aggiorna" per ricalcolo on-demand; auto-refresh ogni 10s mentre c'è un run attivo.

Questa vista è **sempre coerente con la realtà del DB**, sopravvive al refresh, e dà al cliente la risposta visiva a "quanti ne ho fatti finora?".

### 3. Run persistenti nel batch flow

In `useProductEnrichment.ts`:

- All'avvio di un batch chiamo una edge function `enrichment-run` (action `start`) che crea il record `product_enrichment_runs` + un `product_enrichment_run_items` per ogni SKU della selezione, status `pending`. Restituisce `runId`.
- Dopo ogni item (success o errore) chiamo `enrichment-run` action `update_item` con sku, status, error, metafields_report. Aggiorno anche `done`/`failed` sul run.
- A fine batch (o cancel) action `finish` con status finale.

In `ProductEnrichmentPanel.tsx`:

- All'apertura del pannello carico l'ultimo run aperto (status `running`/`paused`) dell'utente corrente. Se esiste, mostro un riquadro **"Run del [data] interrotto: 23/100 completati, 4 falliti, 73 ancora da fare"** con due pulsanti:
  - **"Riprendi questi 73"** — popola la selezione con gli SKU `pending` e l'utente clicca "Genera" come al solito (ripresa manuale, come hai scelto).
  - **"Chiudi run"** — marca il run come `aborted` e libera lo slot.
- I `batchResults` in memoria vengono idratati dai `run_items` del run attivo, quindi anche dopo refresh vedi i pallini verdi/rossi per gli SKU già processati.

### 4. Edge function `enrichment-run`

`supabase/functions/enrichment-run/index.ts` con action su body:
- `start { skus, mode, options }` → crea run + items pending → ritorna `runId`.
- `update_item { runId, sku, status, error?, metafieldsReport? }` → update item + ricalcola counters sul run.
- `finish { runId, status }` → set status finale.
- `get_open_run {}` → ritorna l'ultimo run aperto dell'utente con items.
- `get_run { runId }` → ritorna run + items.

Usa `admin-auth.ts` per autorizzare, service role per scrivere.

### 5. UI report Metafields invariato

`MetafieldsReport` continua a leggere `metafieldsReport` dagli item: ora viene anche persistito nel DB, quindi al refresh non sparisce.

## File toccati

- **nuovo**: `supabase/functions/enrichment-run/index.ts`
- **nuovo**: `src/admin/components/EnrichmentCatalogStatus.tsx`
- **nuovo**: `src/admin/components/ResumeRunBanner.tsx`
- **migrazione DB**: crea `product_enrichment_runs` + `product_enrichment_run_items` con GRANT + RLS.
- `src/admin/hooks/useProductEnrichment.ts` — hook call alla edge function start/update/finish; idratazione da run aperto.
- `src/admin/components/ProductEnrichmentPanel.tsx` — innesto del banner di ripresa e del riquadro stato catalogo in cima.
- `src/admin/lib/aiWriterEngine.ts` — wrapper `startEnrichmentRun`, `updateEnrichmentItem`, `finishEnrichmentRun`, `getOpenEnrichmentRun`.

## Cosa NON tocco

- Logica di generazione AI (prompt, stili, Lovable AI gateway).
- Export CSV nativo Shopify (appena fatto).
- Pubblicazione diretta API e metafieldsSet (già in roadmap separata).
- Storefront, checkout, PDP.

## Verifica

1. Avvio un batch su 10 SKU, lo interrompo a 4/10 con refresh.
2. Riapro il pannello: vedo il banner **"Run interrotto: 4/10 fatti, 6 da fare"** + i 4 pallini verdi e i 6 grigi.
3. Riquadro "Stato catalogo" mostra il conteggio reale (es. 124/458 con AI).
4. Clicco "Riprendi questi 6": la selezione si riempie con i 6 SKU pending, click "Genera" e il run continua aggiornando lo stesso record.
5. A fine run, status `completed`, banner sparisce, stato catalogo aggiornato.
