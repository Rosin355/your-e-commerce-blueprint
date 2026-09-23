# FASE 1B — Drift check read-only vs inventario 1A.4

Data: 2026-09-23. Nessuna scrittura, migration, merge, deploy, AI, Shopify o import eseguiti.

## 1. Conteggi live (invariati rispetto a 1A.4)

| Tabella | 1A.4 | Live 1B |
|---|---|---|
| products | 2.706 | 2.706 |
| product_source_snapshots | 2.706 | 2.706 |
| product_current_values | 24.466 | 24.466 |
| product_ai_suggestions | 0 | 0 |
| product_field_history | 0 | 0 |
| product_publication_jobs | 0 | 0 |
| product_admin_command_log | 0 | 0 |
| product_field_definitions | 68 | 68 |
| product_categories | 22 | 22 |
| product_import_batches | 1 | 1 |
| product_sync_csv_products (legacy) | 2.706 | 2.706 |

Drift conteggi: **0**.

## 2. Colonne attese dalla PR #1

Ricerca su tutto lo schema `public`:

- `source_snapshot_id` — **assente**
- `base_version` — **assente**
- `prompt_version` — **assente**

Nessuna delle tre esiste: la migration della PR #1 è ancora interamente da applicare (nessuna applicazione parziale, nessun conflitto di colonna).

## 3. Schema live delle 4 tabelle

- `products`: id, sku, sku_norm, entity_type (CHECK simple/variable/variation), parent_product_id (FK self), legacy_source, is_active, created_at, updated_at. 3 trigger (identità immutabile, vincolo parent, updated_at).
- `product_current_values`: 24 colonne incl. `version` (CHECK > 0), `value_origin`, `review_status`, `publish_blocked`, `protected_on_reimport`. UNIQUE `(product_id, field_key)` e `(sku, field_key)`. CHECK: coerenza publish_blocked, legacy_ai_unverified, review_meta, variant⇒parent_sku. 1 trigger updated_at.
- `product_source_snapshots`: UNIQUE `(batch_id,row_index)` e `(batch_id,sku,row_type,position)`, CHECK row_type e variation⇒parent_sku, FK batch/product ON DELETE RESTRICT. 2 trigger di immutabilità (UPDATE/DELETE negati). `service_role` ha solo `arxtm` (nessun UPDATE/DELETE).
- `product_ai_suggestions`: CHECK status pending/accepted/discarded/superseded, FK field_key e product_id, trigger `assert_ai_field_allowed`.

RLS attiva su tutte e quattro, una policy SELECT ciascuna filtrata da `can_edit_products(auth.uid())`. Nessun grant ad `anon`. Nessuna policy di scrittura per `authenticated`.

Drift schema rispetto a 1A.4: **0** (nessuna colonna, vincolo, policy o trigger aggiunto o rimosso).

## 4. Comportamento del merge GitHub

- `.github/workflows/` non esiste: nessuna CI che applichi SQL.
- `supabase/migrations/` contiene 30 file storici, ma sono un archivio: nella pipeline Lovable le migration vengono applicate **solo** dallo strumento di migration, non dal sync del repository.
- Conseguenza: **il merge della PR #1 non applica automaticamente alcuna migration**. Lo schema resta invariato.
- Attenzione: il merge sincronizza il codice e può comportare il rideploy delle Edge Function (incl. `product-admin-api`). Codice che assume `source_snapshot_id` / `base_version` / `prompt_version` fallirebbe a runtime su schema non migrato.

## 5. Staging isolato

Non esiste oggi alcuna draft/staging attiva. È disponibile la creazione di una **draft con backend isolato**: schema e dati separati dalla produzione, migration staged e applicate solo all'accettazione. È la sede corretta per provare la migration PR #1 e il dry-run del backfill.

## 6. Piano proposto (da autorizzare, non eseguito)

### 6.1 Backup pre-migration
1. Export read-only JSON+CSV di `products`, `product_current_values`, `product_source_snapshots`, `product_field_definitions`, `product_sync_csv_products` nel bucket privato `csv-pipeline/backups/pre-1b-<data>/`.
2. SHA256 per file + manifest con conteggi.
3. Verifica di rilettura del manifest prima di procedere.

### 6.2 Applicazione migration (additiva)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS source_snapshot_id uuid` su `product_current_values` (+ FK `product_source_snapshots(id)` ON DELETE RESTRICT, indice, NULLABLE).
- `base_version integer NULL` e `prompt_version text NULL` su `product_ai_suggestions`.
- Nessun NOT NULL, nessun DROP, nessun RENAME, nessun cambio di tipo. Grant e RLS invariati.

### 6.3 Idempotenza
`IF NOT EXISTS` su colonne e indici; nomi vincoli espliciti; riesecuzione sicura. Verifica post: le tre colonne esistono, conteggi invariati, trigger e policy invariati.

### 6.4 Rollback
- Rollback logico preferito: lasciare le colonne NULL e non usarle (nessun impatto, nessuna perdita dati).
- Rollback fisico solo su autorizzazione esplicita: `DROP COLUMN` delle tre colonne aggiunte + indice/FK, con backup 6.1 come rete.
- Rollback codice: revert del merge, redeploy `product-admin-api` alla versione precedente.

### 6.5 Dry-run backfill `source_snapshot_id` (sola lettura)
Join `product_current_values` → `product_source_snapshots` su `product_id` (+ `batch_id` più recente, `row_type`/`position` per le varianti). Classificazione per cella:

| Categoria | Definizione |
|---|---|
| MATCH_READY | esattamente uno snapshot candidato |
| AMBIGUOUS_SOURCE | più snapshot candidati (più batch o più righe variante) |
| NO_MATCH | nessuno snapshot per il prodotto |
| NOT_APPLICABLE | valore con `value_origin` manuale / ai_accepted / system_migration, cioè non riconducibile a una riga sorgente |

Output atteso: conteggi per categoria, campione di 20 righe per categoria, elenco SKU AMBIGUOUS/NO_MATCH. Il backfill vero si esegue **solo** se AMBIGUOUS_SOURCE = 0 o dopo risoluzione caso per caso, e comunque mai sui valori NOT_APPLICABLE.

## 7. Condizioni per autorizzare il deploy

1. Backup 6.1 completato e verificato (SHA256 + conteggi).
2. Migration provata su draft isolata, con verifica post positiva.
3. Dry-run backfill eseguito e AMBIGUOUS_SOURCE/NO_MATCH accettati esplicitamente.
4. Migration applicata **prima** del merge del codice che usa le nuove colonne (o codice tollerante a colonne assenti).
5. Scritture Admin in canary invariate; nessuna pubblicazione Shopify nello stesso passo.
6. Conteggi post-migration identici: 2.706 / 2.706 / 24.466 / 0 / 0.
