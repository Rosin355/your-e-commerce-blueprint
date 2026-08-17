# FASE 2 — Proposta tecnica Admin prodotti Online Garden

Documento di progettazione. Nessuna migration eseguita, nessun deploy, nessuna mutation Shopify.
Riferimento audit: `.lovable/plan/fase-1-audit-admin-prodotti-online-garden-2026-08-17.md`.

---

## 1. Principio architetturale

Tre livelli separati per ogni campo, mai sovrapposti sulla stessa colonna:

```text
product_source_snapshots   -> VALORE ORIGINALE (immutabile, per import batch)
product_current_values     -> VALORE CORRENTE  (approvato, modificabile a mano)
product_ai_suggestions     -> PROPOSTA AI      (separata, richiede Accetta)
product_field_history      -> ogni transizione, con autore e data
```

`product_sync_csv_products` resta **invariata e operativa**: continua a servire lo storefront e le funzioni esistenti. Il nuovo modello le sta accanto; la sincronizzazione avviene in una sola direzione controllata (nuovo modello → tabella legacy) solo al momento della pubblicazione, in una fase successiva. Nessuna colonna esistente viene rinominata o rimossa.

---

## 2. Modello dati definitivo (tutte tabelle nuove, additive)

### 2.1 `product_import_batches`
| colonna | tipo | note |
|---|---|---|
| id | uuid pk | |
| file_name | text | nome originale |
| storage_path | text | bucket privato `csv-pipeline` |
| checksum_sha256 | text unique | garantisce idempotenza |
| profile_key | text | `woo_full`, `woo_bulbi`, … |
| detected_headers | jsonb | header esatti, ordine incluso |
| header_mapping | jsonb | header → field key risolto |
| unmapped_headers | jsonb | colonne senza destinazione |
| total_rows / parent_rows / variation_rows | int | |
| status | text | `analyzing` `report_ready` `blocked` `applied` `failed` |
| report_json | jsonb | conteggi KEEP/UPDATE/PROTECTED/SKIP_EMPTY/CREATE/POTENTIAL_DATA_LOSS |
| potential_data_loss | int not null default 0 | se > 0 → status `blocked`, applicazione impedita |
| created_by / created_at / applied_at | | |

### 2.2 `product_source_snapshots`
Una riga per (batch, riga sorgente). Immutabile: nessuna UPDATE, mai.
`id, batch_id fk, sku, woo_id, row_index, raw_row jsonb (riga completa, tutte le colonne), normalized jsonb (copia normalizzata), row_type ('simple'|'parent'|'variation'), parent_sku, created_at`
Indici: `(sku)`, `(batch_id)`, unique `(batch_id, row_index)`.

### 2.3 `product_current_values`
Una riga per (sku, field_key) — modello EAV controllato dal registry dei campi.
`id, sku, field_key, value_text, value_json, value_number, origin ('import'|'manual'|'ai_accepted'|'shopify_backfill'), source_batch_id, is_locked bool, updated_by, updated_at`
Unique `(sku, field_key)`. `is_locked = true` = campo manuale protetto: un import non lo tocca mai.

### 2.4 `product_ai_suggestions`
`id, sku, field_key, suggestion_text, suggestion_json, model, prompt_hint, status ('pending'|'accepted'|'discarded'|'superseded'), based_on_value, created_by, created_at, resolved_at`
Unique parziale: una sola `pending` per (sku, field_key).

### 2.5 `product_field_history`
`id, sku, field_key, previous_value jsonb, new_value jsonb, change_type ('import'|'manual'|'ai_accepted'|'restore_original'|'publish'), actor, batch_id, created_at`. Append-only.

### 2.6 `product_field_definitions`
Registry configurabile: `key, label, group, source_aliases text[], editor_type, data_type, shopify_mapping jsonb, visible, editable, ai_allowed, manual_only, publishable, required, protected_on_reimport, sort_order, help_text`.
Il seed iniziale copre: campi principali, i 19 metafield già esistenti, i 4 manuali (`ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita`) più `nome_comune`, e i campi ACF rilevati.

### 2.7 `product_publication_jobs`
`id, sku[], scope jsonb (field keys), status, requested_by, summary_json, error_json, started_at, finished_at, lock_key`. Lock per SKU per impedire doppie pubblicazioni concorrenti.

Per tutte: `GRANT` espliciti (`service_role` sempre; `authenticated` in sola lettura dove serve), RLS abilitata, policy basate su `has_role()`.

---

## 3. Ruoli

Estensione dell'enum `app_role` con `editor` e `tech_admin` (additiva, nessun valore rimosso):
- `editor` — modifica prodotti, chiede proposte AI, accetta/scarta, salva, pubblica se abilitato.
- `admin` — configura campi e mapping, gestisce categorie e importazioni.
- `tech_admin` — diagnostica, log, mapping Shopify, retry, strumenti avanzati.
La UI legge i ruoli e nasconde interamente i moduli tecnici; il controllo reale resta lato Edge Function.

---

## 4. Mapping CSV configurabile

Risoluzione header in tre passaggi: normalizzazione (trim, lowercase, rimozione accenti e punteggiatura) → match esatto sugli alias → match per prefisso/suffisso per le colonne `*_acf`. Nessun header rigido nel codice: gli alias vivono in `product_field_definitions.source_aliases`.
Profili riconosciuti: `woo_full` (69 colonne, parent/variation, ACF), `woo_bulbi` (42 colonne, simple, categorie gerarchiche). Un profilo sconosciuto non blocca l'import: le colonne non risolte finiscono in `unmapped_headers` e restano visibili in "Altri dati importati".

Categorie: `Bulbi > Tulipani` viene scomposta in `category_path_original`, `category_root`, `category_leaf`, `collection_handles[]`.

Inventario: `stock_status` e `quantity` marcati `protected_on_reimport = true` e `publishable = false` finché non è definita la sorgente ufficiale. Nessun valore di stock viene inviato a Shopify.

Immagini: verifica read-only (HTTPS equivalente, redirect, 200, content-type) che salva solo uno stato accanto all'URL originale, senza mai sostituirlo.

---

## 5. Flusso di import

```text
upload -> storage privato -> checksum
  -> se checksum già presente: batch idempotente, nessuna riscrittura
  -> parsing + snapshot immutabile di ogni riga
  -> classificazione per campo (regole Fase 0, modulo product-catalog-merge.ts riusato)
  -> report_json con i conteggi
  -> se POTENTIAL_DATA_LOSS > 0 -> status 'blocked', errore leggibile, nessuna scrittura sui valori correnti
  -> altrimenti l'utente conferma -> applicazione ai product_current_values (solo CREATE e UPDATE ammessi)
```
Nessuna AI, nessuna pubblicazione Shopify automatica in nessun punto del flusso.

---

## 6. Riuso, correzione, rimozione

**Riutilizzabile così com'è:** `product-catalog-merge.ts` (regole Fase 0, già validate end-to-end), `csv-parser.ts`, `shopify-graphql.ts`, il layer metafield di `shopify-admin-proxy` (normalizzazione tipi, retry, chunk), `inspect-woo-source-csv` come base per l'analisi header.

**Da correggere:** mapping header rigido nel percorso di import reale; `process-woo-job` che scarta le colonne sconosciute; assenza di lock in pubblicazione; `ProductEnrichmentPanel` che rigenera 19 campi in blocco.

**Da nascondere (non rimuovere):** AI Writer, Catalogo DB, Import Clienti, checker collezioni, config metafield → tutti dietro il ruolo `tech_admin`.

**Rimovibile solo in F11, dopo validazione:** `AiWriterPanel`, la pipeline `importEngine` generica, le tab legacy di `AdminImport`.

---

## 7. Errori, rollback, test

Errori: ogni fallimento di pubblicazione lascia intatti i valori correnti salvati e viene mostrato in linguaggio semplice ("Non pubblicato — riprova"), con dettaglio tecnico visibile solo a `tech_admin`.
Rollback: ogni campo può tornare al valore originale dallo snapshot o a un valore precedente dallo storico; le migration sono additive quindi il rollback strutturale è un semplice `DROP` delle nuove tabelle.
Test: unit sul merge e sul mapping multi-profilo; test di idempotenza (stesso checksum → nessuna modifica); test di protezione dei campi manuali/AI/Shopify; e2e importa → modifica → AI → accetta → salva → pubblica.

---

## 8. Prossimo passo

F3 — migration additive delle 7 tabelle con GRANT e RLS. Da eseguire solo dopo approvazione esplicita e dopo le risposte alle 4 domande bloccanti dell'audit (inventario, permesso di pubblicazione, varianti, creazione automatica collezioni).
