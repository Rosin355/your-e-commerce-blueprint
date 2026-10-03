# Fase 3B.1D — Shopify Canary Write

Data: 2026-10-03. Esito: **BLOCKED prima di qualsiasi write**.

## Gate stock non soddisfacibile
- Strumenti Shopify disponibili (account ricollegato): create/update prodotto e variante permettono `inventory_management=shopify` e `inventory_policy=deny`, ma **nessuno imposta la quantità** (nessun inventory set/adjust, nessuna location).
- Tabella `shopify_connections` vuota: nessun token Admin con scope `write_inventory` nel progetto; nessuna Edge Function di inventory write.
- Attivare tracking+deny senza poter impostare 20 porterebbe le varianti canary a quantità 0 → SOLD OUT: regressione, non un canary valido.
- Ulteriori limiti: immagini creabili solo da file (non da URL esistenti); conversione in-place da variante singola a multi-variante non verificabile con gli strumenti → caso C sarebbe MANUAL_RESTRUCTURE_REQUIRED.

## Esito
SKU canary non selezionati in modo operativo; simple update / variable create / restructure / standalone / stock / storefront: NOT EXECUTED.
Duplicati 0, esclusi toccati 0, write DB 0, write Shopify 0, AI 0, canary attivo.

## Sblocco proposto
Edge Function Admin-only (assertAdmin prima di tutto) con token Admin API scope `read_locations, read_inventory, write_inventory, write_products`, che esegua `inventorySetQuantities` (quantità 20, location unica verificata) e `productOptionsCreate`/`productVariantsBulkCreate` per ristrutturare in-place. Richiede approvazione owner e credenziali.
