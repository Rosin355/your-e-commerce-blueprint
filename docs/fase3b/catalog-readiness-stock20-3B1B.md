# Fase 3B.1B — Catalog readiness + Stock-20 dry run

Data: 3 ottobre 2026
Stato: **CATALOG READINESS AUDIT COMPLETE · NO SHOPIFY WRITE · STOCK-20 POLICY PROPOSED · WAITING FOR OWNER APPROVAL**

Solo letture SQL sul DB interno (query versionata in `catalog-readiness-3B1B.sql`). Shopify writes 0, DB writes 0, canary attivo.

## Regole applicate
- Bloccanti: inattivo, SKU mancante/duplicato, titolo mancante, prezzo ≤0 (simple/variation; variable: almeno un child con prezzo >0), descrizione WordPress <30 caratteri (variation: ammessa quella del parent), parent non valido, `publish_blocked` sui soli campi core.
- `publish_blocked` presente solo su campi AI legacy (`seo_*`, `optimized_description`, 25 campi editoriali): **non blocca la vendita**, ma quei campi vanno esclusi dalla pubblicazione finché non revisionati.
- Struttura non modificata. OG_891874 / OG_758263 → STRUCTURAL_REVIEW; OG_152965 → NOT_READY (prezzo mancante).
- Immagine: non bloccante, conteggiata a parte. Le variation non hanno immagine propria (ereditano dal parent).

## Risultati
| Classe | simple | variable | variation | Totale |
|---|---:|---:|---:|---:|
| READY_FOR_SALE | 313 | 1.088 | 1.159 | 2.560 |
| NEEDS_REVIEW | 0 | 26 | 29 | 55 |
| NOT_READY | 89 | 0 | 0 | 89 |
| STRUCTURAL_REVIEW | 2 | 0 | 0 | 2 |

Totali: immagine 1.517 / senza 1.189 · prezzo 1.648 / senza 1.058 (variable senza prezzo proprio per natura) · descrizione 2.650 / senza 56 · mapping Shopify 421 / senza 2.285.

Motivi: MISSING_PRICE 88 · MISSING_DESCRIPTION 55 · STRUCTURAL_CONFLICT+MISSING_PRICE 2 · MISSING_PRICE+MISSING_DESCRIPTION 1.

## Shopify
- Mapping solo da `product_sync_csv_products.shopify_product_id` (421, tutti READY). Variant ID non salvati internamente e non letti da Shopify: colonna vuota nel manifest. Storefront live ha 461 prodotti (29 senza match CSV, vedi piano).
- Prodotti Shopify teorici READY: 313 simple + 1.088 variable = 1.401; già mappati 421 → **980 da creare**. Nota: 165 variation oggi live come prodotti separati vanno riconciliati prima di qualsiasi write.

## Stock-20 (proposta, non applicata)
Target 20 per variante vendibile: **1.472** (313 simple + 1.159 variation), tracking attivo, `inventoryPolicy=DENY`, quantità non mostrata. READY senza immagine: 1.160 righe (1.159 variation senza immagine propria + 1 simple); a livello prodotto 3 (1 simple, 2 variable).

## Manifest
`/mnt/documents/manifest-3B1B-stock20-dryrun.csv` (2.706 righe, colonne richieste).

**3B.1B CATALOG READINESS — READY FOR OWNER APPROVAL**
