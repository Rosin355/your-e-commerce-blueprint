# Rilascio product-admin-api — 26/11/2026

## Aggiornamento collaudo reale — correzioni candidate, NON distribuite

**Stato: PENDING_CLIENT_ACCEPTANCE · NO-GO rilascio delle correzioni.** Base controllata `1423a9c0241925e6d1115a4cac47f53c6a493255`. Nessuna migration, cambio grant/ruoli/flag/secret, scrittura prodotti, deploy Edge o Publish in questo intervento.

### BUG IMMAGINI / BUG FORMATI
- Flusso: `ProductAssetEditor` → `product-admin-api` → `handleCatalogCommerce` → `mappedCatalogProduct` → `readAssetState`; nessuna dipendenza da `shopify-admin-proxy`.
- Difetti confermati nel sorgente: lettura subordinata a snapshot commerciale comprensivo di inventario e delivery profile; limiti 30 media/50 varianti bloccavano anche la consultazione. Non è dimostrato che questo sia l'errore del Pero in produzione: log recenti senza stack; account Admin disponibile restituisce **403 FORBIDDEN** su entrambe le letture perché non ha i field keys nominali asset. Nessuna impersonificazione o espansione permessi.
- Candidato: query minimale paginata per le sole letture, preceduta dagli stessi grant `sync + images/prices + product_gallery/product_formats` e verifica SKU/famiglia. Snapshot e limiti di scrittura invariati. Famiglie oltre i limiti di modifica restano consultabili con avviso esplicito di gestione staff Shopify. Errori lettura sanitizzati.
- File: `_shared/admin-catalog-assets.ts`, `_shared/admin-catalog-commerce.ts`, `src/adminv2/components/ProductAssetEditor.tsx`.
- Test: Editor sintetico legge immagini e varianti attraverso handler commerce reale; capability mancanti negate prima del provider; 101 varianti paginate; zero mutation Shopify; snapshot scrittura incompleto negato.
- **Verifica live Editor equivalente: BLOCCATA**, serve una sessione autorizzata con scope asset o evidenza di rete del collaudo. Non dichiarare bug produzione risolto.

### BUG AI
- Root cause accertata: `generateConfirmedProposal` imponeva copia integrale/riordino, mentre `callDraftSheetProvider` generava esclusivamente indici. Validator sostituiva output non estrattivo con originali e restituiva successo. Log runtime confermano due `fallback / INVALID_MODEL_PROPOSAL` alle 16:26 e 16:31 UTC.
- Candidato: descrizione generativa separata dalle selezioni SEO/tag, contratto `sections + factIndices + missingInformation`; controlli su copertura, copia, numeri, negazioni e alcuni claim; conversione Markdown limitato (grassetto/liste) in HTML sanitizzato per richtext; output senza markup per plain text. Nessun fallback descrizione presentato come AI riuscita. Errori provider espliciti con status upstream e messaggio sicuro; modello `google/gemini-3-flash-preview`, endpoint, timer e cap 2.000 token preservati. Selezioni aggiuntive restano autorizzate individualmente e usano una seconda chiamata, solo quando prenotate.
- File: `_shared/admin-ai-description.ts` (nuovo), `_shared/admin-ai-confirmed.ts`, `product-admin-ai/{provider,draft-sheet,index}.ts`, `src/adminv2/{lib/adminApi,components/DraftSheetAssistant}.tsx/ts`.
- Prove reali autorizzate: **2 richieste gateway HTTP 200**, nessuna scrittura DB/Shopify. Primo input breve sintetico Yucca: testo realmente rielaborato, 773 caratteri HTML, due sezioni, ma osservati giudizi/utilizzi non attestati; rafforzati prompt e guardie. Secondo input esteso sintetico: rifiutato dal validator per proprietà/utilizzo non confermato, nessuna copia sostitutiva. **Factual fidelity reale NON PASS**: nessun deploy. Non ripetute richieste fallite. Test originale esteso Yucca non disponibile, richiesto upload.
- I controlli sintattici/citazioni non sono una prova semantica completa: revisione umana indispensabile; nessuna garanzia generale di assenza di invenzioni.
- Browser autenticato Admin, provider mock: sezioni/grassetto renderizzati; confronto originale; applicazione alla sola bozza in memoria dopo conferma; zero salvataggi e zero scritture backend. Persistenza bozza intenzionalmente non provata.

### Test e rilascio
- Suite Node Admin: **265 PASS / 0 FAIL** prima dell'ultima fixture estesa aggiunta; suite mirata AI con fixture estesa rieseguita separatamente.
- Suite Deno asset/servizio/lifecycle: **31 PASS / 0 FAIL**; capability negative aggiuntive rieseguite.
- `deno check` delle due entrypoint: PASS. Build preview automatica: ultimo esito osservato **build OK**. Nessun cambiamento storefront/checkout/clienti/cookie.
- Deploy effettuati: **NESSUNO**. Funzioni coinvolte nel candidato: solo `product-admin-api` e `product-admin-ai`; non distribuire altre funzioni.
- Publish frontend necessario per messaggi/guardie aggiornati: **SÌ, solo dopo verifiche bloccanti**, non effettuato.
- Recovery: nessun rollback necessario; produzione invariata. Recupero codice candidato/precedente tramite Git.

### Retest Marco / gate
1. Raccogliere status/codice delle due chiamate asset sul Pero con scope Editor legittimo; distinguere connessione/scope Shopify da mapping/limiti.
2. Verificare lettura completa immagini e varianti senza mutation e senza aumentare capability.
3. Confrontare descrizioni AI breve ed esatta Yucca estesa con tutti i fatti; nessun claim non supportato, errori espliciti.
4. Solo dopo PASS, distribuire esclusivamente funzioni coinvolte; controlli OPTIONS/no-auth/Editor read-only e verifica output AI.
5. Publish mirato necessario, quindi anteprima/confronto/accetta-scarta/salvataggio di sola bozza autorizzata; sincronizzazione Shopify sempre separata e NON eseguita durante i test.
6. Nuovo test reale di Marco obbligatorio prima di accettazione. SAL ufficiale invariata **57,75%**.

Le sezioni sotto conservano il verbale del rilascio precedente, non attestano il candidato di correzione.

## Tecnico
- Funzione: `product-admin-api` (solo questa), backend Lovable Cloud esistente.
- Commit sorgente: `f32989d` (branch `codex/rilascio-admin-v2-isolato-20261124`), deploy 26/11/2026 ~15:45 UTC.
- Impronta inviata: `04c778bd3ab3c9a847fe971c68e0e2770397b947258c426fae3e1a34d39692cd`; entrypoint `523f825e…ae0d`.
- Marker runtime verificato: `backendVersion=admin-editor-20261125`, `supportsDistinctDescriptions=true`.
- Revisione runtime non esposta da Lovable Cloud: l'attestazione si basa su marker + impronta inviata.
- Descrizione breve: `short_description` → metafield `custom.short_intro`, nessuna ulteriore migration necessaria.
- DB invariato dal deploy: 2 grant attivi, 3 opt-in AI, 24 migration registrate.

## Verifiche
| Controllo | Esito |
|---|---|
| Token non valido | 401 PASS |
| Admin `get_admin_context` | 200, ruoli admin/editor, capability preservate PASS |
| Ricerca SKU `OG_111899` | 200 PASS |
| Sessione Editor Marco | NON TESTATO (richiede il suo dispositivo) |
| Customer Shopify su API Admin | coperto da test automatici; non testato live |
| Test Node Admin/permessi | 311 PASS (3 file Deno-only) |
| Test Deno (lifecycle, descrizioni, servizio) | 28 PASS |
| Typecheck funzione | PASS |
| Scritture Shopify | NESSUNA |

## Rollback
Nuovo deploy mirato di `product-admin-api` dal commit precedente `5a37f71` (o r2 `ca9050d`).

## Checklist collaudo Marco (dispositivo personale)
1. Login Editor su onlinegarden.it/admin.
2. Dashboard e catalogo visibili.
3. Ricerca di un prodotto/SKU esistente.
4. Apertura editor.
5. Modifica su bozza autorizzata `TEST-OG-AI-001` soltanto.
6. Descrizione breve separata dalla descrizione estesa.
7. AI su vantaggi/caratteristiche/punti speciali disponibile.
8. Azioni negate: cancellazione definitiva prodotto non disponibile.
9. Logout e nuovo login.
Nessuna pubblicazione/sincronizzazione Shopify senza conferma specifica.

## Per il cliente
Il pannello Admin è aggiornato. Marco può fare il collaudo dal suo dispositivo. Nessun prodotto, prezzo o ordine è stato modificato.

## Residui
- Collaudo Marco — responsabile Marco — priorità alta.
- Test restore snapshot — responsabile tecnico — media.
- Deploy `product-admin-ai` aggiornato se richiesto — tecnico — media.
