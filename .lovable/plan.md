

## Piano: Sistema Asincrono a Job Batch per Pipeline WooCommerce

### Problema
La Edge Function `woo-enrichment-pipeline` processa tutto il CSV in una singola esecuzione, superando i limiti WORKER_LIMIT di Supabase (tempo, memoria, CPU).

### Architettura

```text
┌─────────┐    upload CSV     ┌──────────────────────┐   crea job    ┌──────────────┐
│ Frontend │ ────────────────► │ woo-enrichment-      │ ────────────► │ pipeline_jobs│
│ (Panel)  │ ◄──── job_id ─── │ pipeline (refactored)│               │ (DB table)   │
└────┬─────┘                  └──────────────────────┘               └──────────────┘
     │                                                                      │
     │  polling ogni 3s                                                     │
     │  (SELECT su pipeline_jobs)                                           │
     │                                                                      │
     │  chiama process-woo-job                                              │
     │  con job_id + batch_size=15    ┌──────────────────┐                  │
     └──────────────────────────────► │ process-woo-job  │ ◄───────────────┘
                                      │ (nuova EF)       │   legge/aggiorna
                                      │ processa 15 righe│
                                      │ salva progresso  │
                                      └──────────────────┘
```

**Flusso:**
1. Upload CSV → `woo-enrichment-pipeline` valida, salva su Storage, crea record `pipeline_jobs` con `status=pending`, ritorna `job_id`
2. Frontend inizia polling: legge `pipeline_jobs` via Supabase client
3. Frontend chiama `process-woo-job` con `job_id` ripetutamente
4. `process-woo-job` legge il CSV da Storage, processa un batch di 15 prodotti, aggiorna il record, salva output parziale
5. Quando tutti i prodotti sono processati → genera CSV finale, status=completed
6. Frontend mostra link download

### Modifiche

**1. Migrazione DB — tabella `pipeline_jobs`**

```sql
CREATE TABLE public.pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  total_rows int DEFAULT 0,
  processed_rows int DEFAULT 0,
  created_rows int DEFAULT 0,
  skipped_rows int DEFAULT 0,
  warning_count int DEFAULT 0,
  error_count int DEFAULT 0,
  ai_enriched_count int DEFAULT 0,
  fallback_count int DEFAULT 0,
  input_file_path text,
  output_file_path text,
  report_json jsonb,
  error_message text,
  dry_run boolean DEFAULT false,
  use_ai boolean DEFAULT true,
  default_vendor text DEFAULT 'Online Garden',
  row_limit int,
  warnings jsonb DEFAULT '[]',
  errors jsonb DEFAULT '[]',
  partial_rows jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica: solo service_role accede (Edge Functions)
```

**2. Refactor `woo-enrichment-pipeline/index.ts`** — diventa "job creator":
- Valida CSV e MIME type
- Salva CSV su Storage (`csv-pipeline/jobs/{job_id}/input.csv`)
- Conta le righe sorgente (solo parent/simple, esclude variations come righe autonome nel conteggio)
- Crea record in `pipeline_jobs` con `status=pending`, `total_rows=N`
- Ritorna `{ success: true, jobId: "..." }`
- Mantiene la modalità dry-run: se `dryRun=true`, processa subito max 5 righe in-place (come ora) senza creare job

**3. Nuova Edge Function `process-woo-job/index.ts`**:
- Riceve `{ jobId, batchSize?: number }` (default 15)
- Legge job da DB, verifica `status` in `[pending, processing]`
- Legge CSV da Storage
- Usa `processed_rows` come offset per sapere dove riprendere
- Processa il batch: normalizza, arricchisce con AI (concurrency 1), costruisce righe Shopify
- Aggiorna `pipeline_jobs`: incrementa contatori, appende warnings/errors, salva `partial_rows` accumulando le righe Shopify come JSON
- Se `processed_rows >= total_rows` → genera CSV finale da `partial_rows`, upload su Storage, imposta `status=completed`, `output_file_path`, `report_json`
- Se errore grave → `status=failed`, `error_message`
- Ritorna stato corrente del job

**4. Aggiornamento `supabase/config.toml`** — aggiungere la nuova funzione:
```toml
[functions.process-woo-job]
verify_jwt = false
```

**5. Refactor frontend `WooPipelinePanel.tsx`**:
- Upload → chiama `woo-enrichment-pipeline`, riceve `jobId`
- Avvia loop polling:
  - Legge `pipeline_jobs` via `supabase.from('pipeline_jobs').select('*').eq('id', jobId).single()`
  - Chiama `process-woo-job` con `jobId` se status è `pending` o `processing`
  - Aggiorna progress bar con `processed_rows / total_rows`
  - Mostra contatori live (warnings, errors, AI enriched)
- Quando `status=completed`: genera signed URL per download, mostra report
- Quando `status=failed`: mostra errore
- Bottone "Annulla" per fermare il polling

### Sicurezza
- Tabella `pipeline_jobs` ha RLS abilitato senza policy pubbliche → solo `service_role` (Edge Functions) può accedere
- Il frontend legge i job tramite la Edge Function `process-woo-job` che ritorna lo stato, non accede direttamente alla tabella
- Nessuna API key esposta lato client
- Validazione MIME type e dimensione file mantenuta

### Performance
- Ogni chiamata a `process-woo-job` processa 15 righe in ~2-3 secondi
- AI concurrency = 1 per evitare rate limiting
- 200 prodotti = ~14 chiamate batch, ~40 secondi totali
- Nessun rischio WORKER_LIMIT

