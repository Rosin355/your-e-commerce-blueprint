# F4.6 — Dry-run backfill `product_current_values` (SIMULAZIONE, NESSUNA SCRITTURA)

Data: 2026-08-17 · 0 righe inserite · 0 proposte AI create · Nessuna chiamata AI/Shopify

## 1. Regole di classificazione applicate

| Condizione | Stato |
|---|---|
| stringa vuota / solo spazi | `SKIP_EMPTY` |
| `NULL` / chiave assente | `SKIP_EMPTY` |
| array JSON vuoto (`[]`) | `SKIP_EMPTY` (lista tecnica vuota, non è un valore) |
| oggetto JSON vuoto (`{}`) | `SKIP_EMPTY` — **non cancella** eventuali valori esistenti |
| campo `manual_only` valorizzato | `PROTECTED` (`is_locked = true`) |
| campo inventario/spedizione | `PROTECTED` con proprietà `INVENTORY_PROTECTED`, `publish_state = 'never'` |
| campo `SHOPIFY_SYNC` | non genera current value editoriale: resta stato tecnico + baseline |
| origine AI non verificabile | `AMBIGUOUS` (`UNKNOWN_REVIEW_REQUIRED`) |
| valore non convertibile al `data_type` | `INVALID` |
| valore diverso da un current value già presente | `CONFLICT` (nessuno oggi: tabella vuota) |

Nessuna sovrascrittura è prevista in nessun ramo. `POTENTIAL_DATA_LOSS` resta **0**.

## 2. Esito per field key (2.706 prodotti)

| Field key | Proprietà | READY | SKIP_EMPTY | PROTECTED | AMBIGUOUS | INVALID | CONFLICT |
|---|---|---:|---:|---:|---:|---:|---:|
| `title` | SC | 2.706 | 0 | 0 | 0 | 0 | 0 |
| `description` | SC | 1.495 | 1.211 | 0 | 0 | 0 | 0 |
| `short_description` | SC | 1.058 | 1.648 | 0 | 0 | 0 | 0 |
| `price` | SC | 1.648 | 1.058 | 0 | 0 | 0 | 0 |
| `compare_at_price` | SC | 0 | 2.706 | 0 | 0 | 0 | 0 |
| `gtin` | SC | 0 | 2.706 | 0 | 0 | 0 | 0 |
| `product_category_raw` | SC | 1.059 | 1.647 | 0 | 0 | 0 | 0 |
| `tags` | SC | 11 | 2.695 | 0 | 0 | 0 | 0 |
| `image_urls` | SC | 1.517 | 1.189 | 0 | 0 | 0 | 0 |
| `handle` | SHOP | 460 | 2.246 | 0 | 0 | 0 | 0 |
| `vendor` | SHOP | 460 | 2.246 | 0 | 0 | 0 | 0 |
| `entity_type` | SYS | 2.706 | 0 | 0 | 0 | 0 | 0 |
| `parent_sku` | SC | 1.188 | 1.518 | 0 | 0 | 0 | 0 |
| `inventory_quantity` | INV | 0 | 2.246 | **460** | 0 | 0 | 0 |
| `weight_grams` | INV | 0 | 2.246 | **460** | 0 | 0 | 0 |
| `nome_comune` | MANUAL | 0 | 2.681 | **25** | 0 | 0 | 0 |
| `ibridatore` | MANUAL | 0 | 2.705 | **1** | 0 | 0 | 0 |
| `colore_fiore` | MANUAL | 0 | 2.705 | **1** | 0 | 0 | 0 |
| `colore_foglia` | MANUAL | 0 | 2.705 | **1** | 0 | 0 | 0 |
| `curiosita` | MANUAL | 0 | 2.705 | **1** | 0 | 0 | 0 |
| `seo_title` | AI/UNK | 0 | 0 | 0 | **2.706** | 0 | 0 |
| `seo_description` | AI/UNK | 0 | 0 | 0 | **2.706** | 0 | 0 |
| `optimized_description` | AI/UNK | 0 | 0 | 0 | **2.706** | 0 | 0 |
| 15 chiavi editoriali/botaniche in `metafields` (AI) | AI | 0 | ~150 (stringhe vuote) | 0 | ~225 | 0 | 0 |
| campi `shopify_*` (9) | SHOP | 0 | – | – | – | – | – |

### Totali dry-run

| Metrica | Valore |
|---|---|
| Righe current value proposte (READY) | **13.118** |
| PROTECTED (manuali) | **29** |
| PROTECTED (inventario/spedizione) | **920** |
| AMBIGUOUS (AI non verificabile) | **8.343** |
| INVALID | **0** |
| CONFLICT | **0** |
| SKIP_EMPTY | 39.5xx (celle campo/prodotto non valorizzate) |
| Righe orfane (senza `product_id`) | **0** |
| **POTENTIAL_DATA_LOSS** | **0** |

Nota: le righe `AMBIGUOUS` **non vengono inserite** come current value in un futuro backfill senza una decisione esplicita del cliente (vedi §3). Le righe `PROTECTED` sarebbero inserite con `is_locked = true` e `origin = 'manual'`.

## 3. Dati AI legacy — classificazione separata

| Dato legacy | Righe | Interpretazione | Destinazione proposta |
|---|---|---|---|
| `ai_enrichment_json` | 2.706 | payload grezzo di generazione | **dato tecnico** → solo baseline + gruppo “Storico”, mai current value |
| `ai_enriched_at` | 2.706 | timestamp | dato tecnico |
| `ai_seed_style` | 2.591 (2 valori distinti) | impostazione di tono | dato tecnico |
| `seo_title` | 2.706 | coincide con output AI, nessun flag di approvazione | `UNKNOWN_REVIEW_REQUIRED` |
| `seo_description` | 2.706 | idem | `UNKNOWN_REVIEW_REQUIRED` |
| `optimized_description` | 2.706 | idem | `UNKNOWN_REVIEW_REQUIRED` |
| `product_enrichment_runs` / `_run_items` | 11 / 3.082 | esiti di run e sync | storico tecnico, mai current value |
| 421 prodotti con `shopify_sync_status = 'synced'` | 421 | contenuto **già pubblicato** su Shopify | unico sottoinsieme per cui l'origine editoriale è di fatto accettata dal cliente |

Regole rispettate:
- nessun valore AI legacy è trasformato automaticamente in `product_ai_suggestions` (0 righe);
- nessun contenuto corrente viene sovrascritto;
- lo stato `AMBIGUOUS` non equivale a “proposta pending”.

**Proposta di presentazione in Admin (Revisione legacy):** una scheda “Contenuti da rivedere” per prodotto, con il valore legacy in sola lettura, il badge “Origine non verificata”, la data di generazione, lo stile usato, e tre azioni esplicite dell'editor — *Conferma come valore corrente*, *Modifica e conferma*, *Scarta*. Solo la conferma umana crea un current value. Per i 421 già pubblicati si propone il pre-flag “già online su Shopify” per accelerare la revisione, senza conferma automatica.

## 4. Campi manuali — verifica

| Campo | Righe valorizzate | Stato dry-run | Re-import | AI | Pubblicabile |
|---|---|---|---|---|---|
| `nome_comune` | 25 | PROTECTED | protetto | **vietata** | sì |
| `ibridatore` | 1 | PROTECTED | protetto | **vietata** | sì |
| `colore_fiore` | 1 | PROTECTED | protetto | **vietata** | sì |
| `colore_foglia` | 1 | PROTECTED | protetto | **vietata** | sì |
| `curiosita` | 1 | PROTECTED | protetto | **vietata** | sì |

Provenienza e data: `imported_at` e, dove disponibile, il report di sync Shopify; conservate nel baseline.

### Controllo SKU `OG_393883`

| Field key | Valore legacy (estratto) | Proprietà | Current value proposto | Stato | Re-import | AI | Pubblicabile |
|---|---|---|---|---|---|---|---|
| `ibridatore` | `Schaum & Van Tol` | MANUAL | identico | PROTECTED | protetto | vietata | sì |
| `colore_fiore` | `rosso porpora` | MANUAL | identico | PROTECTED | protetto | vietata | sì |
| `colore_foglia` | `verde intenso` | MANUAL | identico | PROTECTED | protetto | vietata | sì |
| `curiosita` | `La Rosa rugosa 'Hansa' è una varietà storica…` | MANUAL | identico | PROTECTED | protetto | vietata | sì |
| `nome_comune` | `Rosa Rugosa Hansa: L'Arbusto…` | MANUAL | identico | PROTECTED | protetto | vietata | sì |
| `seo_title` | `Rosa Rugosa Hansa… \| Online Garden` | AI/UNK | nessuno | AMBIGUOUS | protetto | consentita su richiesta | dopo conferma |
| `optimized_description` | `<h2>Scopri la Rosa Rugosa Hansa…` | AI/UNK | nessuno | AMBIGUOUS | protetto | consentita su richiesta | dopo conferma |
| `price` | `16.00` | SC | `16.00` | READY | protetto | vietata | sì |
| `inventory_quantity` | `0` | INV | nessuno (solo baseline) | PROTECTED | protetto | vietata | **no** |
| `shopify_product_id` | `15357635428692` | SHOP | stato tecnico | – | protetto | vietata | no |

I quattro campi manuali risultano **invariati** rispetto al backfill della Fase 0.5.

## 5. Prezzi, immagini, inventario

**Prezzi** — 1.648 valorizzati, 1.058 assenti (in prevalenza righe `variable` che ereditano dalle varianti), **0 valori ≤ 0**, 0 non numerici → 0 `INVALID`, 0 `AMBIGUOUS`. Normalizzazione: `numeric(10,2)`, nessuna AI, nessun aggiornamento Shopify.

**Immagini** — 1.517 prodotti con almeno un URL, 1.189 con array **tecnicamente vuoto** (`[]`, distinto da assente: 0 valori `NULL`, 0 valori non-array). Ordine e URL conservati byte-per-byte; nessun download, nessun upload, nessuna riscrittura di URL. 0 immagini invalide rilevate.

**Inventario** — 460 righe con `inventory_quantity` (tutte a `0`, provenienti dall'export Shopify) e 460 con `weight_grams`. Classificate `INVENTORY_PROTECTED`, `publishable = false`, conservate nel baseline. Nessun current value pubblicabile: il DB legacy/CSV **non può esaurire** prodotti su Shopify, che resta il registro transazionale.

## 6. Verdetto F4.6

Tutti i gate del dry-run sono verdi: `POTENTIAL_DATA_LOSS = 0`, 0 orfani, 0 conflitti, manuali protetti, AI legacy separata, inventario non pubblicabile. **Nessuna riga scritta.** Il backfill resta in attesa di autorizzazione, subordinato alla decisione sul trattamento delle 8.343 celle `AMBIGUOUS`.
