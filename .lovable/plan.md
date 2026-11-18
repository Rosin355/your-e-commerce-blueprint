# Step B — Deploy mirato product-admin-api + product-admin-ai

## Esito preparazione (sola lettura)
- Checkout: main `01fa0f1` (pulito), contiene `98ef90a` (Step M). Dopo 98ef90a solo commit documentali: nessuna differenza in `supabase/` né nei tipi generati.
- Ultimo commit che tocca le due funzioni o `_shared`: `8ed1454`.
- Dipendenze `_shared`: tutti i 27 file importati esistono; nessun import da `src/` o da altre funzioni.
- Compatibilità DB: product-admin-ai usa `product_ai_generation_reservations`, `product_ai_suggestions`, RPC `reserve_product_ai_generation` e `reserve_confirmed_ai_request` (quest'ultima da 0016/0017, presente live).
- Modello AI: gateway Lovable AI, default `google/gemini-3-flash-preview` (sovrascrivibile con `ADMIN_AI_MODEL`, non impostato). `LOVABLE_API_KEY` presente (gestito). Flag PRODUCT_ADMIN_* presenti; valori non letti.
- Nessun file di login, checkout Shopify, prodotti o permessi utenti verrà toccato: deploy solo di codice funzione.

## Esecuzione B (dopo autorizzazione)
1. Ricontrollo checkout pulito e SHA invariato `01fa0f1`; impronte SHA-256 di entrypoint e `_shared` registrate.
2. Deploy nativo di SOLO `["product-admin-api","product-admin-ai"]`.
3. Controlli post-deploy senza costi: chiamata non autenticata a entrambe → atteso 401/403 con CORS; OPTIONS → 200; log funzioni senza errori di avvio/import. Nessuna generazione AI, nessuna scrittura, nessuno Shopify.

## Rischi
- Runtime non rileggibile: le impronte provano il sorgente inviato, non il codice in esecuzione.
- Il nuovo codice entra subito in vigore per gli utenti Admin attuali (comportamento flag invariato).
- Errore di avvio di una funzione → Admin non operativo fino al recupero.

## Recupero
- Ridistribuzione mirata della singola funzione dal commit precedente noto (`cb7fc57` per product-admin-api, `096a435` per product-admin-ai) tramite checkout temporaneo dei soli file funzione, previa nuova autorizzazione. Database non coinvolto.
