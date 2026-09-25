# Fase 2C.0 — Rilascio PR #5 (2026-09-25)

## Gate
- PR #5 aperta, HEAD 6685a0b0ed562eefa4173547383f9d4da1666225, base 767c32d; 6 file. main = 29725e3 (merge PR #6), Lovable HEAD identico.
- Migration `20260925075756_restrict_legacy_enrichment_access.sql`: blob 318725c5, SHA256 7e861597…2903 (uguale al preflight).
- Preflight live read-only (script della PR, sessione read-only): nessun drift. 6 policy attese (`USING true`/`CHECK true`, authenticated), RLS attiva, anon/authenticated/service_role con SELECT/INSERT/UPDATE/DELETE effettivi, nessuna ACL di colonna. Dati: runs 11, items 3.082 (ultima modifica 2026-07-21).
- Backup `csv-pipeline/backups/pre-2c0-enrichment-20260925.tar.gz`: scaricato con link firmato temporaneo, SHA256 fc1d9c60…0491 invariato, SHA256SUMS interni OK, export CSV live identici byte per byte a runs.csv/items.csv. Dati invariati: backup non rigenerato.
- Applicazione sul merge: il merge GitHub NON applica migration (nessun CI; precedente PR #1: file in supabase/migrations entrato col merge, mai rieseguito). Unico canale: strumento migration Lovable → registro Drizzle.

## Applicazione (una sola volta)
- Registrata come `drizzle/migrations/0001_restrict_legacy_enrichment_access.sql` (journal idx 1). Contenuto identico all'originale salvo il newline finale (SHA256 file registrato 777a4280…7b51).
- Nessun dato modificato.

## Verifiche post
| Test | Esito |
|---|---|
| Privilegi effettivi anon/authenticated | nessuno (S/I/U/D = false) |
| service_role | S/I/U/D = true |
| Policy | 0; RLS attiva (default deny) |
| REST anon lettura | 401 `42501 permission denied` |
| REST authenticated lettura/insert | 403 `42501` |
| enrichment-run senza token / chiave anon | 401 |
| enrichment-run Admin get_open_run / get_run / get_catalog_status | 200 (run completed, 104 elementi) |
| Dati legacy | CSV post identici al backup |
| Invarianti | products 2.706, current values 24.466, product_sync_jobs 36, history 0, command_log 0 |

## Allineamento PR #5 / main
- Copiati nel progetto i 6 file esatti della PR (blob identici 6/6). Test PR `enrichment-run-security`: 9/9 verdi; build OK.
- enrichment-run ridistribuita (cambio solo di tipo) e ritestata: 401/401/200.
- Al merge della PR #5 i file coincidono: nessuna duplicazione; il file in supabase/migrations non viene rieseguito. Non riapplicare la migration.

## Rollback
- Logico, solo con nuova approvazione: GRANT mirati e policy ristrette ad Admin (`has_role`). Le policy `USING true` NON vanno ripristinate.
- Dati: backup sopra, ripristinabile (prova già eseguita).

## Note
- storage-signed-url non mostra un controllo Admin esplicito: da verificare in fase dedicata.
- Non eseguiti: ridistribuzione PR #6, modifiche product-admin-api, full, AI, import, Shopify sync, backfill.
