# F4.6b — Dry-run definitivo current values (NON APPLICATO)

Data: 2026-08-17 · Nessun current value inserito · Nessuna proposta AI · Nessuna chiamata Shopify

## 1. Stato di partenza (verificato)

| Elemento | Valore |
|---|---|
| `product_field_definitions` | 68 |
| `product_import_batches` | 1 (`legacy_db_baseline`) |
| `product_source_snapshots` | 2.706 |
| `product_current_values` | **0** |
| `product_ai_suggestions` | 0 |

## 2. Classificazione delle celle proposte

| Classe | Celle | Campi | Origine proposta | Review status | Publish blocked | Protetto re-import |
|---|---:|---:|---|---|---|---|
| READY | 16.094 | 10 | `legacy_db_baseline` | `approved` | false | true |
| CURRENT_REVIEW_REQUIRED | 8.343 | 12 | `legacy_ai_unknown_approval` | `legacy_unverified` | **true** | true |
| PROTECTED_CURRENT | 29 | 5 | `manual` | `approved` | false | true |
| INVENTORY_PROTECTED | 920 | 2 | `legacy_shopify_export` | `approved` | **true** (non pubblicabile) | true |
| SHOPIFY_SYNC_ONLY | 11.143 | 11 | `legacy_shopify_export` | `approved` | **true** (non pubblicabile) | true |
| SOURCE_RAW_ONLY | 13.415 | 5 | `legacy_db_baseline` | `approved` | **true** (non pubblicabile) | true |
| MANUAL_REVIEW_REQUIRED | 0 | – | – | – | – | – |
| BLOCKED_NEEDS_DECISION | 0 | – | – | – | – | – |
| SKIP_EMPTY | celle vuote residue | – | non genera righe | – | – | – |
| INVALID | 0 | – | – | – | – | – |
| CONFLICT | 0 | – | – | – | – | – |
| **POTENTIAL_DATA_LOSS** | **0** | – | – | – | – | – |

Dettaglio READY: `sku` 2.706 · `title` 2.706 · `entity_type` 2.706 · `price` 1.648 · `image_urls` 1.517 · `description` 1.495 · `parent_sku` 1.188 · `product_category_raw` 1.059 · `short_description` 1.058 · `tags` 11.
Dettaglio INVENTORY_PROTECTED: `inventory_quantity` 460 · `weight_grams` 460.
Dettaglio SHOPIFY_SYNC_ONLY: `handle` 460 · `vendor` 460 · 9 campi `shopify_*` 10.223.

## 3. Struttura obbligatoria di ogni riga proposta

Ogni riga del dry-run definitivo espone: `product_id`, `sku`, `field_key`, valore, `value_origin`, `review_status`, `publish_blocked`, `protected_on_reimport`, pubblicabilità del campo (da `product_field_definitions.publishable`) e motivazione testuale della classe assegnata.

## 4. Regole applicate

- Nessun valore AI legacy può risultare `approved` (vincolo DB `chk_pcv_legacy_ai_unverified`).
- Ogni valore non `approved` è bloccato alla pubblicazione (`chk_pcv_publish_blocked_consistency`).
- Inventario, logistica, stato Shopify e dati di sistema non sono mai pubblicabili.
- Celle vuote → `SKIP_EMPTY`, nessuna riga creata (nessuna cancellazione implicita).

## 5. Verdetto

**NO-GO all'applicazione** — il backfill dei current values resta sospeso in attesa di nuova autorizzazione esplicita.
