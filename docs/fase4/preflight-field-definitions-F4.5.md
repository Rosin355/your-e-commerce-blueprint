# F4.5 — Preflight field definitions — ESITO: GO (applicato)

Data: 2026-08-17 · Seed applicato dopo la migration F4.6a

## 1. Conteggi ufficiali (decisione cliente approvata)

| Metrica | Valore ufficiale | Verificato a DB |
|---|---|---|
| Field definitions | 68 | 68 ✓ |
| Gruppi | 11 | 11 ✓ |
| AI allowed | 28 | 28 ✓ |
| Manual only | 5 | 5 ✓ |
| Non pubblicabili | 25 | 25 ✓ |
| `review_policy = legacy_unverified` | 3 | 3 ✓ |

I conteggi obsoleti 62/26/24 non sono più validi e sono stati rimossi dalla documentazione.
Le sei definizioni aggiuntive `shopify_state`/`system` sono mantenute: rappresentano dati reali
delle 460 righe di origine Shopify, sono consultabili, non pubblicabili e non confondibili con
dati sorgente WordPress. Rimuoverle violerebbe il requisito lossless.

## 2. Adeguamenti tecnici applicati al seed

Il file SQL è stato allineato ai vincoli reali delle tabelle F3:

- `applies_to`: `all` → `both`, `variation` → `variant` (valori ammessi: product/variant/both);
- `editor_type`: `list` → `multiselect` (8 campi lista, `data_type` invariato `json`);
- aggiunta assegnazione idempotente di `review_policy = 'legacy_unverified'` ai tre campi editoriali legacy.

Nessuna definizione è stata rimossa o rinominata.

## 3. Campi AI allowed (28)

1. title · 2. commercial_title · 3. description · 4. short_description · 5. optimized_description ·
6. key_benefits · 7. key_features · 8. special_bullets · 9. short_intro · 10. promo_text · 11. faq ·
12. titolo_sezione_faq · 13. care_guide · 14. care_info · 15. come_prendersene_cura ·
16. conosci_meglio_la_tua_pianta · 17. nome_botanico · 18. origini_e_habitat · 19. periodo_di_fioritura ·
20. periodo_di_messa_a_dimora · 21. periodo_di_raccolta · 22. periodo_ottimale_di_potatura ·
23. difficolta_di_coltivazione · 24. image_alt_texts · 25. seo_title · 26. seo_description ·
27. keywords_suggested · 28. internal_links_suggestions

## 4. Lista di blocco AI — verifica automatica

Query di controllo su 21 chiavi vietate (sku, woo_product_id, gtin, price, compare_at_price,
inventory_quantity, stock_status, backorder, weight_grams, dimensions, shipping_class, image_urls,
category_effective, product_category_raw, parent_sku, entity_type, handle, publication_status,
shopify_product_id, shopify_sync_status, shopify_synced_at): **0 violazioni**.

## 5. `image_alt_texts` — confermato AI allowed

È contenuto editoriale e di accessibilità, non l'immagine. Vincoli operativi:
l'AI produce solo una proposta per singola immagine; non modifica URL, file, ordine gallery o immagine
principale; non pubblica automaticamente; il valore corrente è conservato; servono Accetta / Scarta /
Ripristina espliciti. L'Admin userà un editor strutturato per immagine (anteprima, identità media,
alt text corrente, «Migliora con AI», proposta, azioni), mai un testo unico per l'intera gallery.

## 6. Campi manuali (5)

`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita` —
tutti con `ai_allowed = false`, `editable = true`, `protected_on_reimport = true`, `publishable = true`. **0 anomalie**.

## 7. Campi legacy da revisionare (3)

`seo_title`, `seo_description`, `optimized_description`:
ownership AI_ASSISTED, `review_policy = legacy_unverified`, conservati esattamente, mostrati con badge
«Da verificare», mai trasformati in `product_ai_suggestions`, mai ripubblicati automaticamente,
protetti dai re-import.
