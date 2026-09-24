# FASE 1B.1 — Collaudo migration PR #1 in staging isolato

Data: 2026-09-24. Nessuna scrittura su produzione, nessun merge, deploy, AI, Shopify o import.

## File collaudati (non modificati)
| File | SHA256 |
|---|---|
| 20260923155153_add_lossless_lineage_and_ai_versions.sql | 6c2f3e4068c34a8515b048dbe77d709a8bde0c68645fd3bc8d58b781fca376fd |
| phase1a6-source-snapshot-backfill-dry-run.sql | 226ca58362a0cab5713f4e220167a5cfaf49a6fc0dffb1c6a78ccefff3c608c6 |

## Isolamento
- PostgreSQL 17 locale e temporaneo nel sandbox (`og_staging`), avviato da un utente di sistema dedicato.
- Accesso solo tramite socket locale (`listen_addresses=''`): nessuna porta di rete, credenziali separate, nessuna connessione di ritorno verso produzione.
- Nessuna Edge Function, chiave Shopify, AI o import collegati. La produzione è stata letta solo con il ruolo read-only (schema tramite catalogo, dati tramite export CSV di tabelle specifiche). Le copie sono solo nella cartella temporanea del sandbox.
- Scartata una draft Lovable: le sue migration vengono messe in coda e applicate alla produzione quando la draft viene accettata. Non è quindi un luogo sicuro per questo collaudo.

## Riproduzione
11 tabelle (products, batches, field_definitions, snapshots, current_values, ai_suggestions, field_history, publication_jobs, command_log, legacy csv, user_roles), con vincoli, indici, trigger, funzioni, RLS, policy e grant.
Conteggi staging = produzione: 2.706 / 1 / 68 / 2.706 / 24.466 / 0 / 0 / 0 / 0 / 2.706.
Impronte md5 di dati (products, snapshots, current_values, legacy, field_defs, campi manuali), policy, RLS, grant, vincoli, trigger e indici: **identiche alla produzione** prima della migration.

## Risultati
| Test | Esito |
|---|---|
| 1ª applicazione | OK, 3 colonne nullable: source_snapshot_id uuid, base_version int4, prompt_version text |
| 2ª applicazione | OK, solo NOTICE "already exists, skipping". Impronte identiche alla 1ª: idempotente |
| Dati current_values (colonne originali) | md5 identico al pre (4e10be97…) |
| Snapshot, prodotti, legacy, campi manuali (OG_393883 incl.) | invariati |
| RLS / policy / grant / vincoli / FK / trigger / indici | invariati |
| source_snapshot_id valorizzati | 0 (nessun backfill) |
| Rollback fisico in staging (DROP delle 3 colonne) | impronte tornate identiche al pre; riapplicazione OK |
| Produzione dopo tutti i test | impronte invariate, colonne assenti |

## Dry-run read-only (file allegato, transazione READ ONLY + rollback)
Su copia completa dei dati (24.466 celle). Output SHA256 b0820acd3750f183108dd3f3d34fc783786af5416504295bd88195b9539764ac.

| Categoria | Motivo | Celle |
|---|---|---|
| MATCH_READY | EXACT_IDENTITY_VALUE_AND_CARDINALITY | 14.295 |
| AMBIGUOUS_SOURCE | — | **0** |
| NO_MATCH | VALUE_NOT_VERIFIED (tutti sul campo entity_type) | 271 |
| NOT_APPLICABLE | AI_LEGACY_PRESERVED | 8.343 |
| NOT_APPLICABLE | NON_SOURCE_ORIGIN (manuali) | 29 |
| NOT_APPLICABLE | NO_SAFE_COMPARATOR | 1.528 |

MATCH_READY copre tutti i 2.706 snapshot. OG_393883: 5 MATCH_READY, 12 AI legacy e 5 manuali esclusi, 1 senza comparatore.

## Blocchi / da decidere
1. 271 NO_MATCH su `entity_type`: il valore corrente non coincide con la riga sorgente. Serve una decisione: lasciare NULL oppure definire un comparatore specifico.
2. Il rollback fisico richiede autorizzazione esplicita in produzione. Il rollback logico (lasciare le colonne vuote) non ha impatto.
3. In produzione la migration va applicata con lo strumento di migration, prima del merge del codice che usa le colonne.
