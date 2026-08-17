# F4.5 — Preflight field definitions (FASE A) — ESITO: NO-GO

Data: 2026-08-17 · Nessuna scrittura sul database · Seed NON applicato

## 1. Confronto atteso / reale

| Metrica | Dichiarato | Reale nel file | Esito |
|---|---|---|---|
| Field definitions | 62 | **68** | ✗ |
| Gruppi | 11 | 11 | ✓ |
| AI allowed | 26 | **28** | ✗ |
| Manual only | 5 | 5 | ✓ |
| Non pubblicabili | 24 | **25** | ✗ |
| UNKNOWN_REVIEW_REQUIRED | 3 | **0** (nessun marcatore presente) | ✗ |

Ogni riga ha 17 attributi: `key, label, field_group, source_aliases, editor_type, data_type, shopify_mapping, visible, editable, ai_allowed, manual_only, publishable, required, protected_on_reimport, applies_to, sort_order, help_text`. Tutte e 68 le righe sono complete su tutti i 17 attributi, con label italiana e help text.

**Metadati di validazione: assenti.** Né il file né la tabella `product_field_definitions` prevedono una colonna di regole di validazione (min/max, pattern, enum ammessi) né un campo per lo stato `UNKNOWN_REVIEW_REQUIRED`. Richiederebbero una migration additiva.

## 2. Distribuzione per gruppo (reale)

| Gruppo | Campi |
|---|---|
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
| **Totale** | **68** |

## 3. Elenco completo dei campi AI allowed (28 reali)

1. title
2. commercial_title
3. description
4. short_description
5. optimized_description
6. key_benefits
7. key_features
8. special_bullets
9. short_intro
10. promo_text
11. faq
12. titolo_sezione_faq
13. care_guide
14. care_info
15. come_prendersene_cura
16. conosci_meglio_la_tua_pianta
17. nome_botanico
18. origini_e_habitat
19. periodo_di_fioritura
20. periodo_di_messa_a_dimora
21. periodo_di_raccolta
22. periodo_ottimale_di_potatura
23. difficolta_di_coltivazione
24. image_alt_texts
25. seo_title
26. seo_description
27. keywords_suggested
28. internal_links_suggestions

## 4. Lista di blocco — verifica

Nessuno dei campi vietati risulta AI allowed:

sku ✓ · woo_product_id ✓ · gtin/EAN ✓ · price ✓ · compare_at_price ✓ · inventory_quantity ✓ · stock_status ✓ · backorder ✓ · weight_grams ✓ · dimensions ✓ · shipping_class ✓ · image_urls ✓ · category_effective ✓ · product_category_raw ✓ · parent_sku ✓ · entity_type ✓ · handle ✓ · publication_status ✓ · shopify_product_id ✓ · shopify_sync_status ✓ · shopify_synced_at ✓ · tutti i restanti `shopify_*` ✓ · nessun campo fiscale o di data promozionale è AI allowed ✓

**Nota (non bloccante, richiede decisione):** `image_alt_texts` è AI allowed. Non è un'immagine ma il testo alternativo; se la voce "immagini" della lista di blocco va letta in senso stretto (solo i file/URL), la configurazione è conforme. Se va letta in senso esteso, va disattivata.

## 5. Campi manuali — verifica

I 5 `manual_only` sono esattamente: `nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita`.
Tutti e 5 hanno `ai_allowed = false`, `editable = true`, `protected_on_reimport = true`, `publishable = true`. Protezione corretta.

## 6. Campi non pubblicabili (25 reali)

woo_product_id, product_category_raw, inventory_quantity, stock_status, backorder, weight_grams, dimensions, shipping_class, keywords_suggested, internal_links_suggestions, shopify_product_id, shopify_sync_status, shopify_synced_at, shopify_resolved_by, shopify_last_sync_mode, shopify_metafields_written, shopify_metafields_skipped, shopify_metafields_failed, shopify_metafields_report, raw_unmapped, source_file, imported_at, ai_enrichment_json, ai_enriched_at, ai_seed_style.

Tutto l'inventario e la logistica sono non pubblicabili: il gate "inventario non può arrivare a Shopify" è rispettato.

## 7. Origine dello scostamento numerico

Il conteggio 62/26/24 del documento `field-registry-F4.5.md` è antecedente all'estensione del registry con i campi `shopify_state` e `system` derivati dalle 460 righe di origine Shopify export. Il file SQL è più completo del conteggio dichiarato; il documento di registry non è stato riallineato.

## 8. Verdetto

**NO-GO — seed non applicato.** Come da istruzione, nessuna correzione automatica applicata. Servono tre decisioni:

1. Accettare 68 definizioni (riallineando il documento di registry) oppure ridurre a 62 indicando quali escludere.
2. Confermare o negare `image_alt_texts` come AI allowed (26 vs 28).
3. Indicare quali 3 campi devono portare lo stato `UNKNOWN_REVIEW_REQUIRED` e se autorizzare una migration additiva per rappresentarlo (la tabella oggi non ha né questo stato né metadati di validazione).

Le fasi B, C, D, E ed F restano sospese in attesa di questa decisione.
