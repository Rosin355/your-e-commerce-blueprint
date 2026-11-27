# Deploy product-admin-ai V3 — 27/11/2026

Stato: PENDING_CLIENT_ACCEPTANCE — SAL 57,75%

## Deploy
- Esito: SUCCESS, sola funzione `product-admin-ai` (nessun'altra funzione, Publish, merge, migration, grant o scrittura Shopify).
- Sorgente: `fa2a0796a93cd2fe1d4ee7de1b80f9b0cf8dc0c1`, checkout pulito; entrypoint SHA-256 `843334e3…b201cb`; grafo 31 file (5 locali + 26 shared).
- Impronta pacchetto inviato: `a058fccdc03996824a7e5c0c4ef1e767ea7be759d696557944d376712cff0a09`. Revisione runtime non attestabile da Lovable Cloud.
- Rollback: sorgente @2 `da553015…6e5a` recuperabile (30 file). Rollback NON eseguito.

## Verifiche post-deploy (reali)
- OPTIONS 200.
- POST senza token 401; token invalido 401 (azioni `suggest_confirmed_field`, `get_ai_suggestions`).
- Azione sconosciuta 422 prima dell'autenticazione, senza dati (comportamento preesistente).
- Log runtime: solo boot, nessun errore.

## Test simulati (offline)
- 38/38 PASS: confirmed, regressione editor, V2 legacy (@2 senza `article`), V3 (@3 con `article: true`).

## Test Gemini reale
- NON ESEGUITO. La richiesta autenticata identica al pulsante è stata respinta con 401 (token di sessione preview non valido/scaduto) prima di qualsiasi chiamata al modello.
- Chiamate AI eseguite: 0 (AI Gateway: nessuna richiesta). Costo: 0. Nessun retry.
- Contratto @3 a runtime, copertura fatti, parole, FAQ/curiosità: da verificare con la generazione autorizzata.
- Limite due chiamate verificato nel codice: descrizione + selezione SEO/tag, nessun retry nel provider.
