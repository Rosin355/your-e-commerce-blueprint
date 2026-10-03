# Fase 3B.1G — Live EXECUTE batch #1

Data: 2026-10-03 UTC · Funzione `shopify-stock20-batch` (revisione `916b6794`) · Batch `stock20-3b1g-batch-001` · Location `gid://shopify/Location/117678014804`
Manifest invariato (SHA-256 `53d44d24fc7d92408fa710bbecb10ec256190eb19b20475f29f85f01237aca22`). OG_152965-01 escluso.

## Sequenza
1. Pre-check DRY_RUN (una volta): 25 item, tutti tracked=true / DENY / available=0, drift 0, mismatch 0.
2. `SHOPIFY_STOCK20_EXECUTE_ENABLED=true` creato (presente nell'elenco secret).
3. EXECUTE unico con `confirm=STOCK20_EXECUTE`, 13:36:01Z, HTTP 200, report SHA-256 `dc414b37a7a1175890e8e062b10017cfd7e2b10f7781fe3fd8b25f8227113559`. Nessun retry.
4. Secret eliminato subito dopo; read-back: assente → EXECUTE disabilitato.
5. Post-verifica read-only (DRY_RUN): 25/25 ALREADY_AT_TARGET.

## Risultato per item
Tutti i 25 SKU: status UPDATED; appliedMutations `[SET_AVAILABLE_20]`; recoveryAttempted false; nessun failedStep.
before: tracked=true, DENY, available 0, on_hand 0 → after: tracked=true, DENY, available 20, on_hand 20.

SKU: OG_113165, OG_123411, OG_123928, OG_124436, OG_124436-01, OG_124436-02, OG_125937, OG_128815-01, OG_128815-02, OG_129881-02, OG_134564, OG_139828, OG_143783, OG_145376, OG_151499-01, OG_151499-02, OG_152798, OG_154569, OG_159857, OG_161222, OG_163159, OG_163159-01, OG_163159-02, OG_172978, OG_178428.

Totali: UPDATED 25 · ALREADY_AT_TARGET 0 · FAILED 0 · SKIPPED 0 · recovery 0 · available=20 verificati 25.

## Storefront (6 SKU)
OG_113165, OG_124436, OG_152798, OG_163159, OG_178428, OG_139828: acquistabili, titolo invariato, prezzo uguale al manifest 3B.1C (5,00 / 21,00 / 7,20 / 28,00 / 7,50 / 7,50 €), 1 immagine ciascuno come prima, un solo prodotto/variante per ID, quantità non mostrata nell'interfaccia. Nessun ordine. **PASS**.

## Scritture non correlate
Prodotti/varianti creati 0, eliminati 0, prezzi 0, contenuti 0, pubblicazioni 0, tracking 0, policy 0, DB 0, AI 0, Smart Sync 0. Uniche write: 25 `inventorySetQuantities` assolute idempotenti.

3B.1G LIVE EXECUTE BATCH #1 — PASS / READY TO SCALE
