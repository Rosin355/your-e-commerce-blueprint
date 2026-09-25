# Fase 2C.0 — Preflight sicurezza read-only (2026-09-25)

Nessuna migration, deploy, merge, import, AI o Shopify sync eseguiti. PR #5 (HEAD 6685a0b0) e PR #6 (HEAD 7daca8d5) aperte, base 767c32d = HEAD Lovable.

## 1. Tabelle legacy in produzione
| | product_enrichment_runs | product_enrichment_run_items |
|---|---|---|
| Righe | 11 (6 completed/generate, 3 completed/generate_and_publish, 2 aborted) | 3.082 (tutte `pending`) |
| Ultima modifica | 2026-07-21 | 2026-07-21 |
| PK/vincoli | PK id | PK id, UNIQUE(run_id,sku), FK run_id → runs ON DELETE CASCADE |
| Indici | idx_per_status, idx_per_initiator | idx_per_items_run |
| Trigger | trg_product_enrichment_runs_updated | trg_per_items_updated |
| RLS | attiva, non forzata | attiva, non forzata |
| Policy (authenticated) | SELECT true, INSERT check true, UPDATE true/true | idem |
| GRANT tabella | anon, authenticated, service_role: tutti i privilegi | idem |
| ACL colonna | nessuna | nessuna |

Dipendenze: nessuna vista, funzione DB, publication realtime o altra FK. Unico utilizzatore: Edge Function `enrichment-run` (il frontend passa sempre dalla funzione). service_role ha BYPASSRLS.

**Drift rispetto alla PR #5: nessuno.** Tutti i guard della migration `20260925075756_restrict_legacy_enrichment_access.sql` (SHA256 7e861597…2903) corrispondono allo stato live: 6 policy con nomi/espressioni attesi, nessuna ACL di colonna, RLS attiva, grant service_role completi.

## 2. enrichment-run (distribuita)
- Codice main 767c32d: `await assertAdminRequest(req)` prima di leggere il body e prima di qualsiasi accesso ai dati.
- Client privilegiato: `createClient(URL, SERVICE_ROLE_KEY)` senza header Authorization dell'utente. Il JWT utente è usato solo nel client anon per `auth.getUser()`.
- Prova live senza token: 401 "Missing or invalid Authorization header".
- PR #5 cambia solo un'annotazione di tipo in enrichment-run.

## 3. start/process/get-product-sync-dashboard — vulnerabilità attiva
In produzione `assertAdminRequest` viene chiamata **senza await**: la Promise non blocca l'esecuzione.
- Prova live senza token su get-product-sync-dashboard: 503; log "event loop error: Missing or invalid Authorization header" (rifiuto non gestito che fa cadere il worker).
- Il codice prosegue in parallelo con il client service_role: un utente autenticato non admin (dove il rifiuto arriva dopo una chiamata di rete) può potenzialmente leggere la dashboard, creare job o eseguire upsert su product_sync_csv_products prima del crash. Non testato per non scrivere.
- PR #6 aggiunge `await` nelle tre funzioni e un cast solo di tipo in `_shared/product-catalog-repo.ts` (importato solo da get-product-sync-dashboard e process-product-sync).

### Deploy separato
Fattibile: modificare solo i 4 file della PR #6 e distribuire le 3 funzioni; nessuna migration/RPC. Nessun'altra funzione importa product-catalog-repo; admin-auth.ts non cambia. Il frontend (productSyncEngine.ts) resta compatibile: contratto invariato, cambiano solo i rifiuti (401/400 invece di 503).

### Rollback
Il bundle distribuito non è scaricabile. Candidato: file di main 767c32d (git blob):
- start-product-sync df6fb9a8, process-product-sync 67085381, get-product-sync-dashboard 4266965d
- _shared: admin-auth c968ac07, cors 886efc65, job-repo 6d64af74, product-catalog-repo 0353be9c, product-sync-types 430bb224
Impronta comportamentale pre-deploy: senza token → 503 + log "event loop error". Nota: il rollback reintroduce la vulnerabilità; in emergenza preferire correzione in avanti.

## 4. Job automatici
- Nessuna estensione pg_cron/pg_net; nessuna schedule in config.toml. Esecuzione solo da pannello admin (polling client).
- Job orfani storici, nessun worker li riprende: product_sync_jobs 1 pending + 4 processing (marzo 2026), pipeline_jobs 1 processing (marzo 2026).
- enrichment runs aperti (running/paused): 0 → il banner di ripresa non si attiva.

## 5. Backup amministrativo
- Snapshot repeatable read read-only via accesso DB amministrativo (nessuna chiave pubblica).
- `csv-pipeline/backups/pre-2c0-enrichment-20260925.tar.gz` (182.685 byte, privato: URL pubblico → 400), SHA256 fc1d9c60…0491, eTag = md5 locale.
- Contenuto: runs.csv (fcabc198…), items.csv (0a586bca…), schema.sql (eba23f05…), manifest.json, hash codice, SHA256SUMS.
- Restore: PostgreSQL 17 isolato (solo socket unix, utente dedicato): 11/3.082 righe, md5 per riga identici alla produzione (94b41dc6…, e2127d79…), 0 orfani.

## 6. Dati invariati
runs 11, items 3.082, products 2.706, current values 24.466.
