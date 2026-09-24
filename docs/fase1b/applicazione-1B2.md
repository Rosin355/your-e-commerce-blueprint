# FASE 1B.2 — Applicazione controllata migration 1A.6 (PR #1 non mergiata)

Data: 2026-09-24. Nessun UPDATE/backfill, merge, deploy, Shopify, import, AI o DROP COLUMN.

## Gate
| Gate | Esito |
|---|---|
| Drift check live read-only rispetto al collaudo 1B.1 | 0 differenze (dati, policy, RLS, grant, vincoli, trigger, indici) |
| Checksum del file originale | `6c2f3e4068c34a8515b048dbe77d709a8bde0c68645fd3bc8d58b781fca376fd` (identico al collaudo e al file registrato `drizzle/migrations/0000_add_lossless_lineage_and_ai_versions.sql`) |
| Backup completo | OK |
| Prova di ripristino | OK, identico alla produzione |

## Backup
- Bucket privato `csv-pipeline` (accesso pubblico rifiutato, HTTP 400):
  - `backups/pre-1b2-20260924T141832Z.tar.gz`, 14,5 MB, SHA256 `11e55f804f27e6e091a5e6e6a9cd184d1bf5ed8378e7eb02dfab4be4ee0457f8`
  - `backups/pre-1b2-20260924T141832Z.manifest.json`, SHA256 `db999b420812e4407509f4ac66ab52097dc636ddfbaf0a2d62b8ff6cdd4ff506`
- Contenuto: CSV di 11 tabelle (products, import_batches, field_definitions, source_snapshots, current_values, ai_suggestions, field_history, publication_jobs, admin_command_log, product_sync_csv_products, user_roles), DDL completo, grant, impronte di produzione, SHA256 per ogni file.
- Riscaricato tramite link firmato: SHA256 identico.
- Ripristino in un DB vuoto isolato: impronte identiche alla produzione. Conteggi 2.706 / 2.706 / 24.466 / 2.706 / 68; OG_393883 con i campi manuali intatti.

## Applicazione
Applicato soltanto il file originale, tramite lo strumento di migration. Aggiunte 3 colonne nullable, senza default: `product_current_values.source_snapshot_id` (uuid), `product_ai_suggestions.base_version` (int4), `product_ai_suggestions.prompt_version` (text).

## Verifiche post
- Impronte strutturali (policy, RLS, grant, vincoli/FK, trigger, indici): invariate. L'intero set di impronte è identico a quello dello staging post-migration.
- Valori correnti, colonne originali: md5 invariato (`4e10be97…`). `source_snapshot_id` valorizzati: 0/24.466.
- Conteggi: products 2.706, snapshot 2.706, current_values 24.466, legacy 2.706, ai_suggestions 0, history 0, publication_jobs 0, command_log 0.
- OG_393883: ibridatore, colore fiore, colore foglia, curiosità e nome comune invariati; 23 current values.

## Dry-run read-only (file originale, `226ca583…`)
| Categoria | Atteso | Live |
|---|---|---|
| MATCH_READY | 14.295 | 14.295 |
| AMBIGUOUS_SOURCE | 0 | 0 |
| NO_MATCH | 271 | 271 (tutti su entity_type, restano NULL per decisione) |
| NOT_APPLICABLE | 9.900 | 9.900 |

Identico riga per riga allo staging. Output SHA256 `4ccde9d1…7f18`.

## Rollback
- **Logico (unico autorizzato):** le colonne restano NULL e non vengono usate dal codice. Nessun impatto sui dati.
- **Fisico:** non eseguito e mai automatico. Richiede un'autorizzazione esplicita separata, con il backup qui sopra come rete di sicurezza.
