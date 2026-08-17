# Fase 3/4 — Report di chiusura “Fondazione dati Admin”

Data: 2026-08-17 · Nessuna mutation Shopify · Nessuna modifica inventario · Nessuna modifica storefront · Nessun deploy · Nessun commit/push

**Stato finale**

```
F3/F4 DATA FOUNDATION = COMPLETE
CURRENT VALUES        = 24.466
POTENTIAL_DATA_LOSS   = 0
SHOPIFY MUTATIONS     = 0
INVENTORY CHANGES     = 0
CATEGORY ASSIGNMENTS  = 0
```

## 1. Schema applicato e migration

| File | Contenuto | Stato |
|---|---|---|
| `docs/fase3/001-app-role-additive.sql` | ruoli `editor`, `publisher`, `tech_admin` | applicata |
| `docs/fase3/002-product-model-additive.sql` | 7 tabelle operative + trigger `deny_snapshot_mutation()` | applicata |
| `docs/fase3/003a-product-canonical-F3.1.sql` | `public.products` (UUID canonico, `sku_norm` STORED) | applicata |
| `docs/fase3/003b-product-identity-links-F3.1.sql` | `product_id` sulle tabelle F3 | applicata |
| `docs/fase3/003-taxonomy-additive-F3.1.sql` | tassonomia, limite `level 1..10`, anti-ciclo, `stable_key` immutabile | applicata |
| `docs/fase4/004-current-value-review-state-F4.6a.sql` | `review_policy`, `validation_rules`, `value_origin`, `review_status`, `publish_blocked`, `reviewed_by/at`, `protected_on_reimport` | applicata |
| `docs/fase4/seed-field-definitions-F4.5.sql` | 68 field definitions | applicata |
| `docs/fase4/backfill-current-values-F4.6c.sql` | backfill current values (24.466) | **applicata in questa fase** |

Hardening: `EXECUTE` su `public.has_role` revocato ad `anon`; snapshot e baseline protetti a livello DB contro UPDATE/DELETE.

## 2. Prodotti canonici e tassonomia

- `public.products`: **2.706** identità canoniche (simple / variable / variation), SKU immutabile via trigger.
- `public.product_categories`: **22** categorie (8 principali + 14 sottocategorie), `stable_key` immutabile, profondità massima 10, anti-ciclo attivo.
- `public.product_category_assignments`: **0** — nessuna categoria reale assegnata.

## 3. Field registry

68 definizioni · 11 gruppi · 28 AI allowed · 5 manual only · 25 non pubblicabili · 3 con `review_policy = legacy_unverified` (`seo_title`, `seo_description`, `optimized_description`).

## 4. Baseline immutabile

1 batch (`pre_admin_refactor_baseline`, `legacy_product_sync_db@2026-08-17`) e **2.706 snapshot** invariati. Legacy `product_sync_csv_products` invariata: **2.706 righe**.

## 5. Current values inseriti — 24.466

| Classe | Righe | `value_origin` | `review_status` | `publish_blocked` | `protected_on_reimport` |
|---|---:|---|---|---|---|
| READY | **16.094** | `legacy_db_baseline` | `approved` | false | da field ownership |
| CURRENT_REVIEW_REQUIRED (AI legacy) | **8.343** | `legacy_ai_unknown_approval` | `legacy_unverified` | true | true |
| PROTECTED_CURRENT (manuali) | **29** | `manual` | `approved` | false | true |

**Dettaglio READY:** `sku` 2.706 · `title` 2.706 · `entity_type` 2.706 · `price` 1.648 · `image_urls` 1.517 · `description` 1.495 · `parent_sku` 1.188 · `product_category_raw` 1.059 · `short_description` 1.058 · `tags` 11.

**Dettaglio AI legacy:** `seo_title` 2.706 · `seo_description` 2.706 · `optimized_description` 2.706 (= 8.118) + 225 metafield AI su 25 prodotti × 9 chiavi (`care_info`, `come_prendersene_cura`, `conosci_meglio_la_tua_pianta`, `difficolta_di_coltivazione`, `promo_text`, `short_intro`, `titolo_sezione_faq`, `key_features`, `special_bullets`).

**Dettaglio manuali:** `nome_comune` 25 · `ibridatore` 1 · `colore_fiore` 1 · `colore_foglia` 1 · `curiosita` 1.

Tutte le righe: `publish_state = draft`, `source_batch_id` = batch baseline, `is_locked = true` sui manuali. Nessuna proposta AI creata, nessuna approvazione automatica dei contenuti AI legacy.

## 6. Esclusioni (restano solo nel baseline)

`INVENTORY_PROTECTED` 920 · `SHOPIFY_SYNC_ONLY` 11.143 · `SOURCE_RAW_ONLY` 13.415 · `SKIP_EMPTY` (null, stringhe/array/oggetti vuoti). Verificato a DB: 0 righe inserite per queste classi.

## 7. Idempotenza

Seconda esecuzione del backfill: **INSERT 0 0**, nessun UPDATE, gate del totale verde. Confronto full-outer tra sorgente ricalcolata e DB: 0 righe mancanti, 0 righe in più, **0 conflitti** su valore e metadati.

## 8. Tipizzazione

`price` → `value_number` (0 anomalie) · `image_urls`, `tags`, `key_features`, `special_bullets` → `value_json` array (0 anomalie) · testi → `value_text` · 0 righe senza valore · 0 stringhe vuote · 0 `variant` senza `parent_sku`. Nessuna conversione indiscriminata a stringa.

## 9. Controllo OG_393883

23 current values. I 5 campi manuali (`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita`) risultano **identici al baseline**, `manual` / `approved` / non bloccati / protetti al re-import / AI vietata / pubblicabili. I contenuti AI legacy dello stesso SKU restano `legacy_unverified` e bloccati alla pubblicazione.

## 10. Simulazione Fase 0 (dry-run read-only, non applicato)

Campione: simple, variable, variation, prodotto da export Shopify, prodotto senza categoria, Rosa, Bulbo, OG_393883.

| Classe | Celle |
|---|---:|
| UPDATE_CANDIDATE | 36 |
| SKIP_EMPTY | 54 |
| PROTECTED (manuali) | 5 |
| PROTECTED (AI legacy) | 30 |
| INVENTORY_PROTECTED | 14 |
| SHOPIFY_SYNC_ONLY | 84 |
| SOURCE_RAW_ONLY | 42 |
| **POTENTIAL_DATA_LOSS** | **0** |

## 11. Test UPDATE F4.0 — limite documentato

Il canale SQL disponibile in questo ambiente ha privilegi di sola lettura/inserimento sulle tabelle del modello: ogni `UPDATE` in transazione con rollback su `products`, `product_categories` e `product_current_values` termina con `permission denied for table ...`. Non è stato cercato alcun bypass: nessuna Edge Function, nessuna RPC permanente, nessuna funzione di privilegio, nessuno strumento esposto ai client.

Restano quindi **non testati a runtime**: immutabilità SKU, immutabilità `stable_key`, cambio `entity_type` non autorizzato, cicli prodotto/categoria, spostamento categoria con figli, ricalcolo `level`/`path_keys`, blocco modifica AI legacy senza revisione. I trigger e i vincoli sono presenti e verificati staticamente. **NO-GO UI modificabile** finché questi test non saranno eseguiti dalla futura API Admin (F5).

## 12. Categorie aperte

- 612 prodotti nella coda **virtuale** “Da classificare” (nessuna categoria reale creata).
- Variation: categoria effettiva ereditata dal parent, nessuna duplicazione fisica.
- Piante da Interno: in revisione. Rose senza sottocategoria: in revisione. “Rose Profumate”: possibile filtro/metafield, non categoria.
- Bulbi: nessuna stagione assegnata automaticamente.

## 13. Verifiche finali a DB

current values 24.466 · READY approved 16.094 · legacy unverified 8.343 · manuali 29 · orfani 0 · duplicati `(product_id, field_key)` 0 · inventario 0 · Shopify sync-only 0 · raw-only 0 · proposte AI 0 · history 0 · publication job 0 · assegnazioni categoria 0 · legacy 2.706 invariata · baseline 2.706 snapshot invariati.

## 14. Rischi residui

1. Test UPDATE/trigger non eseguibili in questo canale (mitigazione: F5).
2. 8.343 valori AI legacy da revisionare manualmente prima di qualsiasi pubblicazione.
3. 612 prodotti privi di categoria sorgente, da classificare in Admin.
4. `entity_type` è derivato dall'identità canonica e non compare come colonna nel baseline legacy: differenza attesa, non una perdita.

## 15. Prossima fase (non autorizzata qui)

**F5 — API Admin sicura + test runtime UPDATE.**
