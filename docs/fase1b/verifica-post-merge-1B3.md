# FASE 1B — Verifica post-merge PR #1

Data: 2026-09-24, 16:58 ora di Roma. Tutte le verifiche sono state fatte in sola lettura. Non sono stati eseguiti AI, scritture sui prodotti, sync Shopify, migration o backfill.

## Registro migration
| Controllo | Esito |
|---|---|
| `drizzle.__drizzle_migrations` (DB live) | 1 riga: id 1, hash `6c2f3e40…a376fd`, created_at 1790259571973 |
| `drizzle/migrations/_journal.json` | 1 voce, tag `0000_add_lossless_lineage_and_ai_versions`, when 1790259571973 (coincide con il DB) |
| SHA256 di `drizzle/migrations/0000_…sql` | `6c2f3e40…a376fd` |
| SHA256 di `supabase/migrations/20260923155153_…sql` (entrato con il merge) | `6c2f3e40…a376fd`, identico al file applicato |
| `supabase_migrations.schema_migrations` | nessuna voce per 20260923155153: la migration è registrata solo nel registro Drizzle, cioè dove è stata applicata |

Nessuna riapplicazione e nessuna correzione manuale del registro. Il file SQL usa `IF NOT EXISTS`, quindi un'eventuale riesecuzione sarebbe un no-op, come già provato nel collaudo 1B.1.

## Colonne
- `product_current_values.source_snapshot_id`: uuid, nullable, senza default. Valori presenti: 0 su 24.466.
- `product_ai_suggestions.base_version`: integer, nullable, senza default.
- `product_ai_suggestions.prompt_version`: text, nullable, senza default.

## Conteggi
products 2.706 · snapshot 2.706 · current_values 24.466 · legacy_unverified 8.343 (su 2.706 prodotti, tutti con publish_blocked) · field_definitions 68 · categories 22 · batches 1 · ai_suggestions 0 · history 0 · publication_jobs 0 · command_log 0. I conteggi sono identici a quelli rilevati dopo la 1B.2.

## OG_393883
- 23 current values, tutti alla version 1.
- Cinque metafield manuali, tutti `approved/manual`: ibridatore "Schaum & Van Tol", colore_fiore "rosso porpora", colore_foglia "verde intenso", curiosita e nome_comune presenti.
- SEO: seo_title e seo_description sono presenti. Risultano `legacy_unverified` con publish_blocked, come previsto.
- AI legacy: 13 campi in stato `legacy_ai_unknown_approval`, tutti bloccati alla pubblicazione.
- Shopify: `synced`, product id presente, ultima sync 2026-07-10 09:58 UTC (nessuna nuova sync). Metafield legacy: 20 chiavi, md5 `3dc21496…7fbca`.

## Pipeline dopo il merge
- Merge `1f8f1bd`: 19 file, solo aggiunte. Il merge non tocca `supabase/functions/`, quindi il codice delle Edge Function non è cambiato.
- Build di produzione Vite: riuscita (exit 0).
- Edge Function, chiamate senza credenziali: product-admin-api risponde 401 (e VALIDATION_ERROR a un'azione non riconosciuta); shopify-admin-proxy rifiuta la chiamata con "Missing or invalid Authorization header"; get-products (pubblica) risponde 200.
- Sito: `/admin` risponde 200 in anteprima e 302 sul sito pubblicato (rimanda al login).
- Il merge non ha applicato migration: il registro contiene solo la voce della 1B.2.

## Note
- Con un payload vuoto, shopify-admin-proxy risponde con HTTP 500 anziché 401. La chiamata viene comunque rifiutata, ma il codice di stato andrebbe corretto in una fase dedicata.
- L'md5 dei valori correnti è stato calcolato con una formula diversa da quella della 1B.2 (`f235dfa0…`), quindi non si confronta con `4e10be97…`. I conteggi e i campi campione sono invariati.
- Il rollback resta soltanto logico.
