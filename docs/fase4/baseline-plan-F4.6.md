# F4.6 — Piano baseline immutabile del DB legacy (PROPOSTA, NON APPLICATA)

Data: 2026-08-17 · Nessun batch creato · Nessuno snapshot inserito · Tabella legacy non modificata

## 1. Natura del baseline

Il baseline **non è un CSV originale**: deriva da `public.product_sync_csv_products`, già normalizzata da import precedenti. Va etichettato in modo inequivocabile per non essere confuso con futuri snapshot WordPress/Bulbi.

Provenienza obbligatoria:

| Campo | Valore |
|---|---|
| source system | `legacy_product_sync_db` |
| source profile | `pre_admin_refactor_baseline` |
| snapshot type | `legacy_db_baseline` |
| data di acquisizione | timestamp di esecuzione (UTC) |
| chiave batch | `legacy_db_baseline:<data_acquisizione_utc_date>` |

## 2. Mappatura sulle tabelle F3

### `product_import_batches` — 1 riga
| Colonna | Valore proposto |
|---|---|
| `file_name` | `legacy_product_sync_db@2026-08-17` (nome logico, non un file reale) |
| `storage_path` | `internal://postgres/public.product_sync_csv_products` |
| `profile_key` | `pre_admin_refactor_baseline` |
| `idempotency_key` | `legacy_db_baseline:2026-08-17:<checksum_batch>` |
| `checksum_sha256` | checksum aggregato (vedi §3) |
| `detected_headers` | 36 colonne reali della tabella legacy |
| `header_mapping` | mapping colonna → `field_key` del registry F4.5 |
| `unmapped_headers` | `[]` (nessuna colonna legacy priva di definizione) |
| `total_rows` / `parent_rows` / `variation_rows` | 2.706 / 1.518 / 1.188 |
| `status` | `baseline_captured` |
| `potential_data_loss` | 0 |

### `product_source_snapshots` — 2.706 righe attese
Una riga per SKU legacy:
- `batch_id` → batch sopra
- `row_index` → ordine deterministico `ORDER BY sku_norm`
- `sku`, `parent_sku`, `product_id` (già disponibile per il 100% delle righe)
- `row_type` → `simple` / `variable` / `variation` da `products.entity_type` (404 / 1.114 / 1.188)
- `category_path_original` → `product_category` grezzo
- `raw_row` → **JSON completo e integrale della riga legacy** (36 colonne, nessuna esclusione)
- `normalized` → valori normalizzati per field key (numerici, liste, ecc.)

Le tabelle snapshot sono già protette a livello DB da `deny_snapshot_mutation()` contro UPDATE/DELETE.

## 3. Strategia checksum e serializzazione deterministica

Serializzazione riga:
1. costruzione oggetto JSON con **chiavi ordinate alfabeticamente**;
2. `NULL` conservati esplicitamente come `null` (non omessi, per distinguere “assente” da “vuoto”);
3. numerici serializzati in forma canonica (`numeric` → stringa senza zeri finali superflui);
4. timestamp in UTC ISO-8601 con precisione al millisecondo;
5. array JSONB conservati nell'ordine originale (fondamentale per `image_urls`).

Checksum:
- riga: `sha256(row_canonical_json)` → salvato in `normalized->>'_row_checksum'`;
- batch: `sha256(concat(row_checksum ORDER BY sku_norm))` → `product_import_batches.checksum_sha256`.

Il checksum è **deterministico e riproducibile**: rieseguire la cattura sugli stessi dati produce lo stesso valore.

## 4. Idempotenza

- `idempotency_key` contiene il checksum del batch: se i dati legacy non sono cambiati, un secondo tentativo trova il batch esistente e non crea nulla.
- Se i dati legacy fossero cambiati, il checksum cambia e nasce un **nuovo** batch: gli snapshot precedenti restano intatti (immutabilità garantita dai trigger).
- Nessuna UPDATE su snapshot esistenti in nessuno scenario.

## 5. Conteggi attesi e dimensioni

| Metrica | Valore |
|---|---|
| Batch attesi | 1 |
| Snapshot attesi | 2.706 |
| Dimensione media riga legacy | ~6,9 KB |
| Dimensione totale righe legacy | ~18,6 MB |
| Stima `raw_row` + `normalized` + overhead | ~30–35 MB (JSONB compresso TOAST: ~15–22 MB reali) |
| Righe attese in altre tabelle F3 | 0 |

## 6. Rollback logico

Gli snapshot sono immutabili: il rollback **non** è una DELETE.
- Rollback logico = marcare il batch con `status = 'baseline_superseded'` e ignorarlo a valle.
- Il ripristino dei dati legacy resta possibile leggendo `raw_row` e ricostruendo la riga originale (round-trip verificabile confrontando il checksum).
- Purga fisica: solo tramite intervento tecnico diretto come `postgres` (bypass esplicito dei trigger), fuori dal flusso applicativo.

## 7. Report di cattura previsto

Alla futura esecuzione il report deve contenere: righe legacy lette, snapshot creati, checksum batch, distribuzione per `row_type`, colonne mappate/non mappate, righe con `raw_row` non ricostruibile (atteso 0), `potential_data_loss` (atteso 0), durata, e conferma che `product_sync_csv_products` conserva 2.706 righe invariate.

## 8. Gate pre-esecuzione (tutti verdi oggi)

- [x] 100% righe legacy con `product_id`
- [x] 0 SKU duplicati/vuoti
- [x] `product_source_snapshots` vuota (nessun conflitto)
- [x] Nessuna colonna legacy priva di definizione nel registry F4.5
- [ ] Autorizzazione esplicita all'esecuzione — **non concessa in questa fase**
