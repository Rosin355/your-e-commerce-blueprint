# Fase 3B.1C — Shopify Structure Reconciliation (read-only)

Data: 2026-10-03. Fonti: DB Lovable Cloud (SELECT), Storefront API pubblica (query GraphQL di sola lettura, 461 prodotti / 462 varianti pubblicati), manifest 3B.1B.
Nessuna write Shopify/DB/inventory/prezzi/pubblicazioni; nessun Smart Sync, AI o migration.

## Correzione del finding "165 variant-as-product"
Ricostruzione per SKU su tutte le 462 varianti live: 313 = simple, 147 = variable (parent), **2 = variation**. Il dato 165 di 3B.1B non è riproducibile per SKU.
Il problema strutturale reale è diverso: **147 parent variable sono live come prodotti a variante singola** (Default Title), senza le figlie. Le 151 variation READY di questi parent mancano su Shopify.

Classificazione variation-as-product (2): A LEGACY_STANDALONE_TO_MERGE 2; B 0; C 0; D 0; E 0. Dettaglio: `/mnt/documents/variant-as-product-3B1C.csv` (SHA-256 `93dfaaed68c95063ab3b5cb2e88b3f298b1b5233330c6b203b6dd9b167cc0a05`).

## Summary
| Voce | Valore |
|---|---|
| Prodotti commerciali | 1.401 (313 simple + 1.088 variable) |
| Unità inventario | 1.472 |
| Esistenti coerenti → UPDATE_EXISTING | 313 (simple) |
| Esistenti KEEP_EXISTING | 0 (contenuti/stock da allineare) |
| Nuovi simple CREATE_SIMPLE | 0 (tutti i 313 già live per SKU) |
| Nuovi parent CREATE_VARIABLE_PARENT | 941 |
| Nuove varianti CREATE_VARIANT | 1.006 |
| RESTRUCTURE_REQUIRED | 300 = 146 parent a variante singola + 1 parent con figlie standalone + 151 variation mancanti sotto parent esistente + 2 variation standalone |
| SKIP | 146 (88+1+2 senza prezzo incl. OG_891874/OG_758263, 55 NEEDS_REVIEW) |
| Stock-20 target | 1.472 |
| Prodotti READY senza immagine | 3: OG_257799, OG_426481, OG_797988 |
| Shopify ID non risolti | 0 su 462 righe live (product+variant ID ricostruiti); DB mappa 421, 41 ulteriori trovati per SKU |

OG_152965: SKIP, stato attuale invariato (NOT_READY per prezzo). Nessun STRUCTURAL_REVIEW pubblicato.

## Contenuti
seo_title (2.705/2.706), seo_description e optimized_description (2.706/2.706) sono `publish_blocked` → esclusi. Pubblicabili solo title/description legacy/manual approvati.

## Stock policy (non applicata)
tracked YES, quantità 20, continue selling NO, a zero sold out, quantità non mostrata.

## Limiti
- La Storefront API vede solo prodotti pubblicati: draft/archiviati e status Admin non verificabili (scope Admin inventory assente, vedi 3B.1A). Eventuali duplicati non pubblicati non rilevabili.
- Lo stato tracked/inventoryPolicy attuale resta non verificato.

## Artefatti
- Manifest `/mnt/documents/manifest-3B1C-shopify-final.csv` (2.706 righe) SHA-256 `15e386d0c9f5f71a47691673c347f05fe6f0c2adc349282c2576c7531ba47c71`
- Script: `docs/fase3b/storefront-pull-3B1C.py`, `docs/fase3b/build-manifest-3B1C.py`

Stato: FINAL SHOPIFY MANIFEST READY — NO WRITE EXECUTED — WAITING FOR OWNER APPROVAL
