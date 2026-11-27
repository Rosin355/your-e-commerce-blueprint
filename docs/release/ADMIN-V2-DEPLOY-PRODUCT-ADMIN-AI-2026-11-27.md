# Deploy selettivo `product-admin-ai` — 27/11/2026

- DEPLOY: SUCCESS (11:19 UTC), solo `product-admin-ai`; nessun'altra funzione, Publish, merge, migration o scrittura Shopify/DB.
- DEPLOYED_SOURCE_SHA: `da553015e41b34d7f6a242fa6a32446c68ea1e5a` (checkout pulito); SHA-256 pacchetto inviato `15b9a106…dbc37c3ec`. Revisione runtime non esposta da Lovable Cloud.
- PROMPT_VERSION: `online-garden-editoriale-it@2` (letto nella risposta reale, campo `promptVersion`).
- AUTHENTICATION: PASS — OPTIONS 200; senza token 401; token non valido 401.
- AI_REAL_TEST: PASS — una sola chiamata, Yucca filamentosa testo originale (3 righe), account Admin: HTTP 200, `source=model`, 3 sezioni valide, sezione Introduzione esclusa con avviso `UNSUPPORTED_FACT`, avviso copertura; fatti contraddittori (Agavaceae/Asparagaceae, 150 cm/3 m) e "senza fusto a fiamma" segnalati da verificare. Nessun 502. Costo 0,003351 crediti (843/418 token). Nessun salvataggio o sync.
- FRONTEND_COMPATIBILITY: PASS — onlinegarden.it e /admin 200; nuovi parametri facoltativi, contratto risposta additivo.
- ROLLBACK_EXECUTED: NO. Riferimento rollback `c80e562` recuperabile (marker `verified-editorial-20261126-r2`).

## Rischi residui
- L'header `X-Admin-AI-Version` è invariato (`verified-editorial-20261126-r2`) anche nella nuova versione: il marker affidabile è `promptVersion` nella risposta.
- Copertura incompleta (11 informazioni da recuperare) finché le fonti contraddittorie non vengono corrette dall'editor.
- Admin pubblicato non mostra i nuovi stati per sezione (serve frontend PR #80, non pubblicato).
- Revisione runtime non attestabile.

Stato: `PENDING_CLIENT_ACCEPTANCE`, SAL 57,75%.
