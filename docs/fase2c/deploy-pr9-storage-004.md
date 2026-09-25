# Deploy PR #9 — STORAGE-004 (2026-09-25)

PR: https://github.com/Rosin355/your-e-commerce-blueprint/pull/9 — commit `2bc68e24e3061327c1fe4d5c2f66ced510c637cd`, aperta, non mergiata. Base = main `9a66d2c` (= HEAD Lovable). PR #10 non toccata.

## Preflight
- Chiamanti: solo `src/admin/components/WooPipelinePanel.tsx` via `supabase.functions.invoke` (JWT utente Admin). Nessun chiamante esterno, script `sync/` o altra funzione.
- Nessun pg_cron/pg_net, nessuna schedule/webhook. `pipeline_jobs`: 1 job `processing` orfano del 2026-03-07, nessun processo lo riprende.
- Gateway: funzioni con verify_jwt predefinito Lovable; autenticazione in codice (`assertAdminRequest`: getUser + `user_roles` admin via service_role).
- Ordine: in tutte e tre `await assertAdminRequest(req)` è la prima operazione dopo OPTIONS, prima di `req.json()`, client service_role, DB, Storage o AI.

## File (git blob SHA, identici alla PR 3/3)
| File | SHA PR = distribuito |
|---|---|
| csv-upload-url/index.ts | 84db72f4… |
| woo-enrichment-pipeline/index.ts | 19eddf56… |
| process-woo-job/index.ts | f899721e… |
| _shared/admin-auth.ts (invariato) | c968ac07… |

Test offline `scripts/tests/storage-pipeline-auth.test.ts`: 18/18 verdi (non Admin, Promise auth pendente, nessun accesso anticipato, scritture).

## Smoke test post-deploy (nessuna scrittura)
| Funzione | senza JWT | chiave pubblica | JWT invalido | CORS OPTIONS |
|---|---|---|---|---|
| csv-upload-url | 401 | 401 | 401 | 200 |
| woo-enrichment-pipeline | 401 | 401 | 401 | 200 |
| process-woo-job | 401 | 401 | 401 | 200 |

Admin: woo-enrichment-pipeline body vuoto → 400 "jobId e inputPath richiesti"; process-woo-job job inesistente → 404 "Job non trovato". csv-upload-url non chiamata come Admin (genererebbe un URL di upload).

Invarianti: 2.706 prodotti, 24.466 valori, pipeline_jobs 1, product_sync_jobs 36, storage.objects 15.

## Rollback
Versione precedente (vulnerabile) salvata solo fuori progetto, SHA256: csv-upload-url 43f7b994…, woo-enrichment-pipeline ab1574f6…, process-woo-job 57ad2ca5…. **Non va ripristinata automaticamente.** In regressione: forward-fix o disabilitazione dell'endpoint (usato solo dal pannello Woo).

## Stato
PR #9 aperta: il merge allinea main con file identici. Nessun job, import, AI, Shopify sync, migration o modifica PR #10.
