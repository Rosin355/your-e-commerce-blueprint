# F4.5 — Audit field registry (READ-ONLY)

Data: 2026-08-17 · Nessuna scrittura eseguita · Nessun deploy · Nessuna chiamata AI/Shopify

## 1. Contesto misurato

| Tabella | Righe |
|---|---|
| `product_sync_csv_products` (legacy) | 2.706 |
| `products` (canonica) | 2.706 |
| `product_categories` | 22 |
| `product_field_definitions` | 0 |
| `product_current_values` | 0 |
| `product_source_snapshots` | 0 |
| `product_import_batches` | 0 |
| `product_ai_suggestions` | 0 |
| `product_field_history` | 0 |
| `product_publication_jobs` | 0 |
| `product_category_assignments` | 0 |
| `bulbi_classification_matrix` | 0 |
| `product_enrichment_runs` / `_run_items` (legacy AI) | 11 / 3.082 |
| `pipeline_jobs` (legacy import) | 1 |

Copertura identità: **2.706 / 2.706 righe legacy hanno un `products.id`** (join su `sku_norm`, 0 orfani).

### Provenienza reale delle righe legacy

| `source_file` | Righe | Natura |
|---|---|---|
| `Prodotti wp import - wc-product-export-28-2-2026-…csv` | 2.246 | export WooCommerce |
| `products_export_1-2.csv` | 460 | export **Shopify**, non WordPress |

Conseguenza: le colonne `handle`, `vendor`, `inventory_quantity`, `weight_grams` (460 valorizzate) NON sono dati sorgente WordPress ma dati Shopify re-importati. Sono classificate `SHOPIFY_SYNC` / `INVENTORY_PROTECTED`, non `SOURCE_CONTROLLED`.

## 2. Inventario colonne `product_sync_csv_products` (36 colonne)

Legenda proprietà: SC=SOURCE_CONTROLLED, MAN=MANUAL, AI=AI_ASSISTED, SYS=SYSTEM, SHOP=SHOPIFY_SYNC, INV=INVENTORY_PROTECTED, RAW=SOURCE_RAW_ONLY, UNK=UNKNOWN_REVIEW_REQUIRED.

| Colonna | Tipo PG | Null | Valorizzati | Vuoti | Distinti | Proprietà | Categoria campo | Esempio (redatto) |
|---|---|---|---|---|---|---|---|---|
| `sku` | text | NO | 2.706 | 0 | 2.706 | SC | sorgente / identità | `OG_3938xx` |
| `title` | text | YES | 2.706 | 0 | 2.649 | SC→AI | sorgente | `Rosa Rugosa Hansa: …` |
| `description` | text | YES | 1.495 | 1.211 | – | SC→AI | sorgente | HTML descrittivo |
| `short_description` | text | YES | 1.058 | 1.648 | – | SC→AI | sorgente | testo breve |
| `price` | numeric | YES | 1.648 | 1.058 | – | SC | sorgente | `16.00` (0 valori ≤ 0) |
| `compare_at_price` | numeric | YES | **0** | 2.706 | 0 | SC | sorgente non usato | – |
| `barcode` | text | YES | **0** | 2.706 | 0 | SC | EAN/GTIN non popolato | – |
| `weight_grams` | integer | YES | 460 | 2.246 | – | SHOP/INV | derivato Shopify | `0` |
| `inventory_quantity` | integer | YES | 460 (tutti `0`) | 2.246 | 1 | INV | inventario | `0` |
| `tags` | jsonb (array) | YES | 11 | 2.695 (`[]`) | – | SC | sorgente | `["…"]` |
| `product_category` | text | YES | 1.059 | 1.647 | 28 | SC | sorgente | `Piante da Esterno > Arbusti` |
| `product_category_id` | text | YES | **0** | 2.706 | 0 | SC | non usato | – |
| `image_urls` | jsonb (array) | YES | 1.517 | 1.189 (`[]`) | – | SC | sorgente | `["https://…"]` |
| `source_file` | text | NO | 2.706 | 0 | 2 | SYS | tecnico | vedi §1 |
| `imported_at` | timestamptz | NO | 2.706 | 0 | – | SYS | tecnico | – |
| `handle` | text | YES | 460 | 2.246 | 460 | SHOP | identità Shopify | `rosa-rugosa-hansa-…` |
| `vendor` | text | YES | 460 | 2.246 | 1 | SHOP | derivato | `Online Garden` |
| `product_type` | text | YES | 2.704 | 2 | 4 | SC | sorgente | `variable`/`variation`/`simple`/`wgm_gift_card, virtual` |
| `parent_sku` | text | YES | 1.188 | 1.518 | – | SC | identità gerarchia | `OG_xxxxx` |
| `metafields` | jsonb | YES | 25 | 2.681 | – | MAN + AI (misto) | metafield/ACF | vedi §3 |
| `seo_title` | text | YES | 2.706 | 0 | – | AI / UNK | editoriale | `… \| Online Garden` |
| `seo_description` | text | YES | 2.706 | 0 | – | AI / UNK | editoriale | – |
| `optimized_description` | text | YES | 2.706 | 0 | – | AI / UNK | editoriale | HTML `<h2>…` |
| `ai_enrichment_json` | jsonb | YES | 2.706 | 0 | – | AI | payload AI | vedi §4 |
| `ai_enriched_at` | timestamptz | YES | 2.706 | 0 | – | SYS | tecnico AI | – |
| `ai_seed_style` | text | YES | 2.591 | 115 | 2 | SYS | tecnico AI | `Pratico e tecnico` |
| `shopify_product_id` | text | YES | 421 | 2.285 | 421 | SHOP | stato | `1535763…` |
| `shopify_synced_at` | timestamptz | YES | 421 | 2.285 | – | SHOP | stato | – |
| `shopify_sync_status` | text | YES | 421 | 2.285 | – | SHOP | stato | `synced` (421) |
| `shopify_sync_error` | text | YES | **0** | 2.706 | 0 | SHOP | stato | – |
| `shopify_resolved_by` | text | YES | 421 | 2.285 | – | SHOP | stato | – |
| `shopify_metafields_written` | integer | NO | 421 > 0 | – | – | SHOP | contatore | – |
| `shopify_metafields_skipped` | integer | NO | 421 > 0 | – | – | SHOP | contatore | – |
| `shopify_metafields_failed` | integer | NO | **0 > 0** | – | – | SHOP | contatore | – |
| `shopify_metafields_report` | jsonb | YES | 421 | 2.285 | – | SHOP | diagnostica | – |
| `shopify_last_sync_mode` | text | YES | 421 | 2.285 | – | SHOP | stato | – |

Colonne **non più utilizzate / mai popolate**: `compare_at_price`, `barcode`, `product_category_id`, `shopify_sync_error`.
Colonne **la cui proprietà non è determinabile**: `seo_title`, `seo_description`, `optimized_description` (vedi §4) → `UNKNOWN_REVIEW_REQUIRED`.
Campi richiesti dal brief ma **assenti nella tabella legacy**: ID WooCommerce, EAN/GTIN reale, backorder, dimensioni, classe di spedizione, stato pubblicazione. Sono previsti nel registry come definizioni con alias CSV, valorizzabili solo da import futuri.

## 3. `metafields` — struttura chiavi (25 righe, 20 chiavi)

| Chiave | Righe | Proprietà | Note |
|---|---|---|---|
| `nome_comune` | 25 | MANUAL | manuale confermato |
| `ibridatore` | 1 | MANUAL | solo `OG_393883` |
| `colore_fiore` | 1 | MANUAL | solo `OG_393883` |
| `colore_foglia` | 1 | MANUAL | solo `OG_393883` |
| `curiosita` | 1 | MANUAL | solo `OG_393883` |
| `nome_botanico`, `origini_e_habitat`, `periodo_di_fioritura`, `periodo_di_messa_a_dimora`, `periodo_di_raccolta`, `periodo_ottimale_di_potatura`, `difficolta_di_coltivazione` | 25 cad. | AI_ASSISTED | dati botanici, spesso stringa vuota |
| `key_features`, `special_bullets` | 25 cad. | AI_ASSISTED | **stringa contenente JSON array** — normalizzazione richiesta |
| `care_info`, `come_prendersene_cura`, `conosci_meglio_la_tua_pianta`, `short_intro`, `promo_text`, `titolo_sezione_faq` | 25 cad. | AI_ASSISTED | testo editoriale |

## 4. `ai_enrichment_json` — struttura chiavi

| Chiave | Righe |
|---|---|
| `seo_title`, `seo_description` | 2.706 |
| `optimized_description`, `short_description`, `h1_title`, `key_benefits`, `care_guide`, `faq`, `keywords_suggested`, `image_alt_texts`, `internal_links_suggestions` | 2.679 |
| `body_html`, `metafields`, `seed_style`, `generated_at`, `input_title`, `input_handle` | 27 (prodotti creati da zero via AI writer) |

Non esiste in legacy alcun flag di approvazione editoriale. Le colonne `seo_title`, `seo_description`, `optimized_description` coincidono per costruzione con l'output AI: **non è determinabile se siano state riviste da un umano** → `UNKNOWN_REVIEW_REQUIRED`.

## 5. Matrice registry proposta (field definitions)

Colonne: Field key · Label Admin · Sorgente · Proprietà · Editor · Visibile · Modificabile · AI · Pubblicabile · Re-import · Note

### Gruppo `main` — Informazioni principali
| Field key | Label | Sorgente | Proprietà | Editor | Vis | Mod | AI | Pub | Re-import | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| `sku` | SKU | legacy/CSV | SC | text | ✔ | ✖ | ✖ | ✔ | protetto | identità canonica |
| `woo_product_id` | ID WooCommerce | CSV | SC | text | ✔ | ✖ | ✖ | ✖ | sovrascrivibile | non presente in legacy |
| `gtin` | EAN / GTIN | CSV (`barcode`,`GTIN`,`EAN`) | SC | text | ✔ | ✔ | ✖ | ✔ | protetto | 0 valori oggi |
| `title` | Titolo prodotto | legacy | SC | text | ✔ | ✔ | ✔ | ✔ | protetto se editato | – |
| `commercial_title` | Titolo commerciale | AI | AI | text | ✔ | ✔ | ✔ | ✔ | protetto | da `h1_title` |
| `handle` | Handle | Shopify | SHOP | text | ✔ | ✖ | ✖ | ✔ | protetto | mai AI |
| `entity_type` | Tipo prodotto | derivato | SYS | select | ✔ | ✖ | ✖ | ✔ | protetto | simple/variable/variation |
| `parent_sku` | Prodotto padre | legacy | SC | text | ✔ | ✖ | ✖ | ✔ | protetto | – |
| `vendor` | Fornitore | Shopify | SHOP | text | ✔ | ✔ | ✖ | ✔ | sovrascrivibile | – |
| `publication_status` | Stato pubblicazione | Shopify | SHOP | select | ✔ | ✔ | ✖ | ✔ | protetto | active/draft |

### Gruppo `content` — Contenuti
`description` (Descrizione estesa, SC→AI, ✔AI, pubblicabile), `short_description` (Descrizione breve, SC→AI, ✔AI), `optimized_description` (Descrizione ottimizzata, AI/UNK, ✔AI), `key_benefits` (Punti di forza, AI), `key_features` (Caratteristiche chiave, AI, lista), `special_bullets` (Bullet speciali, AI, lista), `short_intro` (Introduzione, AI), `promo_text` (Testo promozionale, AI), `faq` (FAQ, AI, JSON), `titolo_sezione_faq` (Titolo sezione FAQ, AI), `care_guide` / `care_info` / `come_prendersene_cura` (Cura, AI), `conosci_meglio_la_tua_pianta` (Approfondimento, AI). Tutti: visibili ✔, modificabili ✔, pubblicabili ✔, re-import protetto.

### Gruppo `botanical` — Dati botanici
`nome_comune` (**MANUAL**, AI ✖, protetto), `nome_botanico` (AI), `ibridatore` (**MANUAL**, AI ✖, protetto), `colore_fiore` (**MANUAL**, AI ✖, protetto), `colore_foglia` (**MANUAL**, AI ✖, protetto), `curiosita` (**MANUAL**, AI ✖, protetto), `origini_e_habitat` (AI), `periodo_di_fioritura`, `periodo_di_messa_a_dimora`, `periodo_di_raccolta`, `periodo_ottimale_di_potatura`, `difficolta_di_coltivazione` (AI).

### Gruppo `categories` — Categorie
`product_category_raw` (Categoria importata, SC, non modificabile, non pubblicabile, AI ✖), `tags` (Tag, SC, modificabile, AI ✖), `category_effective` (Categoria effettiva, SYS derivata da assignments/ereditarietà, AI ✖).

### Gruppo `pricing` — Prezzi
`price` (Prezzo, SC, AI ✖, pubblicabile, protetto), `compare_at_price` (Prezzo barrato, SC, AI ✖).

### Gruppo `inventory` — Inventario e spedizione
`inventory_quantity` (**INVENTORY_PROTECTED**, visibile ✔, modificabile ✖, AI ✖, **publishable = false**), `stock_status`, `backorder`, `weight_grams`, `dimensions`, `shipping_class` — tutti AI ✖ e `publishable = false`. Shopify resta registro autorevole.

### Gruppo `images` — Immagini
`image_urls` (SC, ordine conservato, AI ✖, pubblicabile, protetto), `image_alt_texts` (AI ✔, pubblicabile).

### Gruppo `seo` — SEO
`seo_title`, `seo_description` (AI ✔, pubblicabili, protetti), `keywords_suggested` (AI, non pubblicabile), `internal_links_suggestions` (AI, non pubblicabile).

### Gruppo `shopify_state` — Stato Shopify
`shopify_product_id`, `shopify_sync_status`, `shopify_synced_at`, `shopify_resolved_by`, `shopify_last_sync_mode`, `shopify_metafields_written/skipped/failed`, `shopify_metafields_report` — SHOP/SYS, visibili ✔, modificabili ✖, AI ✖, **publishable = false**.

### Gruppo `other_imported` — Altri dati importati
`raw_unmapped` (RAW, visibile ✔, modificabile ✖, AI ✖, non pubblicabile): contenitore JSON per ogni colonna CSV sconosciuta (inclusi i suffissi `*_acf`), mai scartata.

### Gruppo `system` / `history` — Storico
`source_file`, `imported_at`, `ai_enriched_at`, `ai_seed_style`, `ai_enrichment_json` — SYS, visibili ✔, modificabili ✖, AI ✖, non pubblicabili.

## 6. Compatibilità profili CSV

- Profilo **69 colonne** (WooCommerce) e **42 colonne** (Bulbi): gli alias sono elencati in `source_aliases` per ogni definizione.
- Alias supportati: `name` / `Nome` / `Title` → `title`; `EAN` / `GTIN` / `barcode` → `gtin`; `Prezzo` / `regular_price` / `price` → `price`; `Categorie` / `product_cat` → `product_category_raw`.
- Colonne `*_acf`: mappate per nome quando riconosciute, altrimenti confluiscono in `raw_unmapped`.
- Colonne sconosciute: **mai scartate**, sempre in `raw_unmapped` + snapshot baseline.

## 7. Output quantitativo F4.5 (conteggi ufficiali, allineati al SQL applicato)

| Metrica | Valore |
|---|---|
| Field definitions | **68** |
| Gruppi | **11** |
| main | 10 |
| content | 14 |
| botanical | 12 |
| categories | 3 |
| pricing | 2 |
| inventory | 6 |
| images | 2 |
| seo | 4 |
| shopify_state | 9 |
| other_imported | 1 |
| system | 5 |
| Campi `ai_allowed = true` | **28** |
| Campi `manual_only = true` | **5** (`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita`) |
| Campi `publishable = false` | **25** |
| Campi `review_policy = legacy_unverified` | **3** (`seo_title`, `seo_description`, `optimized_description`) |
| Colonne legacy mai popolate | 4 |
| Colonne legacy senza definizione dedicata | 0 |

I conteggi 62 / 26 / 24 citati in versioni precedenti sono **obsoleti** e non vanno più usati.
Le sei definizioni aggiuntive dei gruppi `shopify_state` e `system` sono parte integrante del registry:
conservano dati realmente presenti nelle 460 righe di origine Shopify, restano consultabili e non sono
mai pubblicabili automaticamente.

## 8. Ownership e review policy dei campi editoriali legacy

| Campo | Ownership | Review policy | Stato valori legacy |
|---|---|---|---|
| `seo_title` | AI_ASSISTED | `legacy_unverified` | conservato, badge «Da verificare», publish bloccato |
| `seo_description` | AI_ASSISTED | `legacy_unverified` | conservato, badge «Da verificare», publish bloccato |
| `optimized_description` | AI_ASSISTED | `legacy_unverified` | conservato, badge «Da verificare», publish bloccato |

Tutti gli altri campi hanno `review_policy = 'none'`.

## 9. Scomposizione delle 8.343 celle ambigue

| Origine | Celle | Classificazione |
|---|---:|---|
| `seo_title` (2.706) + `seo_description` (2.706) + `optimized_description` (2.706) | **8.118** | AI_ASSISTED · `legacy_ai_unknown_approval` · `legacy_unverified` · publish bloccato · protetto |
| 9 chiavi metafield AI valorizzate su 25 prodotti (`care_info`, `come_prendersene_cura`, `conosci_meglio_la_tua_pianta`, `difficolta_di_coltivazione`, `key_features`, `promo_text`, `short_intro`, `special_bullets`, `titolo_sezione_faq`) | **225** | AI_ASSISTED · `legacy_ai_unknown_approval` · `legacy_unverified` · publish bloccato · protetto |
| **Totale** | **8.343** | nessun valore resta genericamente AMBIGUOUS |

Escluse perché non ambigue: `nome_comune` (25) e i 4 metafield manuali su `OG_393883` → MANUAL, `approved`, protetti.
Le 6 chiavi metafield AI presenti ma vuote (`nome_botanico`, `origini_e_habitat`, `periodo_di_*`) → `SKIP_EMPTY`.
