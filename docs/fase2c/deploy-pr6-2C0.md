# Fase 2C.0 — Rilascio prioritario PR #6 (2026-09-25)

## Gate
- PR #6 aperta, non mergiata, HEAD 7daca8d521fb875de297d3b0ed56b496c91c34fc, base 767c32d; compare: 1 solo commit (7daca8d5).
- main GitHub/Lovable 2adce3d: rispetto a 767c32d differisce solo per docs/fase2c/preflight-sicurezza-2C0.md. Nessun commit inatteso sul codice.
- Job prima del deploy: product_sync_jobs 36 (29 completed, 2 failed, 1 pending e 4 processing orfani di marzo), enrichment runs 11. Nessun job nuovo.

## Candidato di ripristino main@767c32d (SHA256)
| File | SHA256 |
|---|---|
| start-product-sync/index.ts | e913f9b8…ac092 |
| process-product-sync/index.ts | a792f7f0…95863 |
| get-product-sync-dashboard/index.ts | 0d7dfb40…67043 |
| _shared/product-catalog-repo.ts | 91bf4b3b…6d3 |
| _shared/admin-auth.ts | 8e4ba99f…8494 |
| _shared/cors.ts | 7791fb58…ca2 |
| _shared/job-repo.ts | 51c2f61f…b788 |
| _shared/product-sync-types.ts | 8bbce70d…ca35 |
Attenzione: questa versione contiene la vulnerabilità (manca `await`). Non va ripristinata automaticamente.

## Versione distribuita
Git blob identici al tree 7daca8d5 (8/8): start 4dfbf419, process c6290dc5, dashboard 6f99266b, product-catalog-repo cd9d14b5. Invariati: admin-auth c968ac07, cors 886efc65, job-repo 6d64af74, product-sync-types 430bb224.
Distribuite solo start-product-sync, process-product-sync e get-product-sync-dashboard. Nessun'altra funzione importa product-catalog-repo.

## Test (non distruttivi)
| Chiamante | start | process POST/GET | dashboard |
|---|---|---|---|
| Senza token | 400 Missing Authorization | 401 | 400 |
| Chiave anon come token | 400 invalid token | 401 | 400 |
| Admin | non chiamata (creerebbe un job) | 401 "Cannot coerce…" (job zero-uuid inesistente: l'autenticazione passa e la risposta arriva dal repository in sola lettura) | 200, totalProducts 2.706 |

- Utente non Admin reale: non disponibile (esiste un solo utente, Admin); crearne uno sarebbe una scrittura non autorizzata. Copertura tramite il test della PR `scripts/tests/admin-async-auth.test.ts`: 48/48 verdi, compresi il rifiuto dei non Admin prima dei repository, l'attesa della Promise e il rilevamento della regressione senza `await`.
- Log dopo il deploy: solo boot. Nessun "event loop error" (prima del deploy c'era, con risposta 503).

## Invarianti dopo il deploy
products 2.706, current values 24.466, product_sync_jobs 36 (invariato, nessun job creato), enrichment runs 11.

## Stato
- PR #6: codice distribuito, PR ancora aperta e non mergiata. Il merge allineerà main, con file identici.
- Non eseguito: PR #5, migration, modalità full, Shopify sync, AI, import, avvio di job.
