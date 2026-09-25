# Fase 2C.0 — Rilascio PR #5 (2026-09-25)

## Stato definitivo — chiusura verificata da Codex

PR #5 **MERGED** con merge ordinario GitHub il 25 settembre 2026 alle
09:10:13 UTC (11:10:13 Europe/Rome). Merge commit e `origin/main` verificato:
`dd3bcf7101aa4207837b7012e08659af79394ddd`.
Head PR: `6685a0b0ed562eefa4173547383f9d4da1666225`.
Le sezioni successive descrivono il rilascio Lovable precedente al merge;
le indicazioni storiche «PR aperta» non rappresentano lo stato attuale.

### Evidenze dirette Codex

- Fetch prima e dopo il merge. Esaminati i commit successivi alla baseline
  `29725e330e61c587836483bb3c2ff29ee148a1df`: `377674b`, `e8ded24`,
  `e3fe069`, `e90aedb`. Introducono la registrazione Drizzle, i sei file
  identici della PR e il presente report. Nessuna modifica inattesa.
- Gate GitHub: PR aperta, head atteso, `MERGEABLE`/`CLEAN`, GitGuardian
  `SUCCESS`. Nessun bypass o merge forzato.
- I sei file della PR coincidono byte per byte con main pre-merge.
  L'albero del merge finale coincide esattamente con quello testato su
  `e90aedbe4cd49eda6b1f2e83248ca0fb45dc94b8`: il merge non aggiunge né
  cambia file e non duplica la migration.
- SHA256 SQL originale in `supabase/migrations`:
  `7e861597b5a34c5ce360008924fc704aae8472ac4aaeecc3f43bb1595c422903`.
  SHA256 SQL registrato in `drizzle/migrations`:
  `777a4280a4932d0c586710938d1077abd4fd6ffb4a4213165c826b57451c7b51`.
  Differenza esatta: un solo byte LF finale, presente nell'originale
  (5.128 byte), assente nella copia Drizzle (5.127 byte). Il contenuto SQL
  restante è identico.
- Il journal Drizzle **versionato** contiene una sola voce
  `0001_restrict_legacy_enrichment_access`, indice 1. Nessuna modifica
  Codex al journal o agli altri file migration.
- Le tre Edge Functions corrette dalla PR #6, `product-admin-api` e tutti
  i moduli condivisi sono invariati rispetto alla baseline `29725e3`.
  L'unica differenza Edge è l'annotazione TypeScript di `enrichment-run`
  già presente nella PR #5.

### Test di chiusura

Eseguiti in worktree isolato sull'albero poi incorporato nel merge:

| Controllo | Esito Codex |
|---|---|
| `npm ci` | PASS, 386 pacchetti |
| PostgreSQL 16.15 isolato, fixture sintetiche, TCP disabilitato | PASS, 68 verifiche; cluster arrestato |
| Autorizzazioni SQL | anon/utente/Admin diretto negati; service_role consentito; RLS e dati preservati |
| Idempotenza, rollback transazionale e drift | PASS, solo nel cluster sintetico |
| `deno check` | PASS: enrichment-run, product-admin-api e tre funzioni PR #6 |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 110/110; inclusi 48 test auth PR #6 e 9 enrichment-run |
| `npm run build` | PASS, 1.907 moduli |
| `git diff --check` | PASS, anche sul delta rispetto alla baseline |
| Verifica main dopo merge | PASS, albero identico alla versione testata |

Warning non bloccanti già presenti: dipendenze esbuild-kit deprecate,
classi Tailwind arbitrarie ambigue e bundle maggiore di 500 kB.

### Provenienza live e stato cliente

L'applicazione e la registrazione **una sola volta nel database live**, il
backup verificato, i test REST/Admin e l'invarianza dei dati riportati sotto
sono evidenze **Lovable**, confermate dall'utente. Codex ha confrontato i
file e il journal versionati; non ha interrogato o modificato il registro
live e non presenta i test isolati come nuovi smoke test di produzione.

Chiusura Git completata: hardening legacy e protezioni asincrone PR #6
incorporati in main; applicazione live già riferita come completata da
Lovable. Nessuna riapplicazione SQL, ridistribuzione Edge, AI, import,
Shopify sync, backfill o modalità full eseguita da Codex. Non ripristinare
automaticamente né le policy permissive né le funzioni prive di `await`.
Il finding `storage-signed-url` resta separato e richiede un audit dedicato,
senza ampliare questa chiusura.

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
