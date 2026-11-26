# Rilascio product-admin-api — 26/11/2026

## Correzione definitiva AI editor — rilascio coordinato 26/11/2026

**Stato: PENDING_CLIENT_ACCEPTANCE.** Autorizzazione coordinata ricevuta alle 17:05 UTC. Commit applicativo `d25292501a0d65aff5f28a6820f487836683bb78`; base del candidato `c4eaf74`, integrazione intermedia `ada4861`. Solo backend Lovable Cloud esistente. Nessuna nuova funzione/funzionalità “Genera scheda completa con AI”.

### Regola e verifica dei percorsi
Una proposta deve rielaborare soltanto fatti verificati, non dichiarare riuscito un fallback, mostrare la formattazione corretta e rimanere separata dalla bozza fino alla conferma.
- Nuova scheda: `NewProductPage` → `DraftSheetAssistant` → `suggestDraftEditorial` → `generateDraftSheet` → `generateConfirmedProposal`: codice letto e regressioni PASS; nessun salvataggio automatico.
- Prodotto esistente: fonti confermate in `DraftSheetAssistant`, campo vuoto in `FieldCard` → `ConfirmedAiAssistant` → `suggestConfirmedField`: codice letto; entrambi mostrano avvisi di sezione e aggiornano l’editor alla nuova risposta, senza perdere il controllo manuale.
- Suggerimenti persistenti: `AiSuggestionCard` → `generate_ai_suggestion` → `service.generateAiSuggestion`: codice letto; percorso separato, senza fallback estrattivo, con versione/prenotazione e conferma. Non modificate proposte pregresse o record approvati.
- Formattazione: contratto `sections/text/factIndices`; Markdown limitato convertito in HTML dal renderer, poi sanitizer condiviso; `RichTextEditor`/`EditorialText` sanitizzano anche nel browser. Nessun HTML arbitrario accettato dal modello.
- Selezioni SEO/tag: `admin-draft-editorial` mantiene scelte con origine deterministica esplicita e grant per campo; non presentate come prosa AI. Nessuna nuova capability.
- RPC: `reserve_confirmed_ai_request`/`reserve_new_draft_editorial_v1` sono prenotazioni autorizzative, non generatori o fallback; codice chiamante letto, RPC non modificate né eseguite durante questi test. Nessun job background o altra Edge aggiunta a questo flusso.
- Bozza/Shopify: funzioni di approvazione e invio esistenti invariate; test sintetici coprono il comportamento, nessuna scrittura di produzione. Asset API candidate ancora NON distribuite.

### Correzioni
- Riutilizzato il candidato, senza doppio motore. Corretto anche il conflitto residuo tra prompt generico (valore testuale/niente Markdown) e schema editoriale: ora prompt dedicato con fatti indicizzati e formato coerente.
- Validator: sezioni invalide escluse con codici `UNSUPPORTED_FACT`, `INCOMPLETE_RESPONSE`, `FORMAT_ERROR`, `EXTRACTIVE_COPY`; sezioni valide conservate. Se nulla è utilizzabile, errore esplicito; mai sostituzione con originali. Numeri, negazioni, citazioni e guardie sui claim preservati/estesi.
- UI: avvisi visibili in entrambi gli assistenti; retry aggiornato realmente nell’editor, vecchi avvisi rimossi con la nuova risposta; applicazione e salvataggio restano separati.
- I controlli automatici NON certificano semanticamente ogni possibile proposizione: revisionare tutte le affermazioni contro i fatti è obbligatorio. Nessuna promessa generale di assenza di allucinazioni.

### Test eseguiti
- Node Admin: **272 PASS / 0 FAIL**; ultime regressioni handler+AI dopo il marker **64 PASS / 0 FAIL** (riesecuzione, non da sommare).
- Deno descrizioni/asset/servizio: **27 PASS / 0 FAIL**; `deno check product-admin-ai/index.ts` PASS; compilazione automatica preview `build OK`.
- Input originali conservati nei test: Yucca rostrata (11 righe/2696 caratteri), arbusto Agavaceae (1 riga). Provider SIMULATO: prosa rielaborata fedele alle fixture, sezioni/lista/grassetto, risposta incompleta, misure/claim inventati, HTML arbitrario, copie e provider indisponibile. Nessuna chiamata AI a consumo in questo intervento.
- Browser Admin autenticato prima del rilascio: dashboard/new-product read-only; AI simulata, avvisi/anteprima/scarto PASS, bozza vuota, zero scritture.
- Retry/mobile: fixture Editor sintetica isolata con tutti i provider remoti bloccati, Python Playwright PASS; nuova risposta visibile, avvisi precedenti rimossi, scarto, zero mutazioni/errori pagina. Il runner JS Playwright non parte perché il browser della sua versione non è installato: usato il browser Python già disponibile, senza installazioni. Test JS di regressione mantenuto nel progetto.
- Nuova sessione Admin post-autorizzazione non disponibile: il percorso nativo `--self` rifiuta l’associazione corrente; nessun account creato/impersonato. Non confondere i test sintetici con un nuovo collaudo autenticato di produzione.

### Perimetro e distribuzione
- Diff frontend rispetto a `f32989d`: soltanto `ConfirmedAiAssistant.tsx`, `DraftSheetAssistant.tsx`, `ProductAssetEditor.tsx`, `adminApi.ts`. Asset editor: avviso `canModify=false` e disabilitazione dei comandi non eseguibili, nessuna modifica API/grant. Zero file homepage/catalogo/PDP/navbar/checkout/pagamenti/clienti/cookie.
- Deploy nativo effettuato: **solo `product-admin-ai`** dal commit verificato. `product-admin-api` NON ridistribuita.
- 27 moduli locali, zero import mancanti/sibling. Entrypoint SHA-256 `29f1dcd692938ed64274f80a965c84340f9c6130f9bed3d76b2ccaa21ece6618`.
- Impronta locale del manifest ordinato path/hash: `46cdf26c88a269bb4d153d092fec10bfc500fc165252cd44ac6f3107e93f1866`. Impronta nativa sorgenti+impostazioni inviate: `c9e642028af58be0d4be92e49521e3dac8825af4a99656ed25acff2071193dab`; formati distinti, non da confrontare come hash equivalenti.
- Runtime: OPTIONS **200**, POST senza autenticazione **401**, entrambi con `X-Admin-AI-Version=verified-editorial-20261126-r2`. Versione applicativa attestata; ID/revisione/download runtime non esposti, checksum runtime binario non attestabile.
- Publish frontend **completato e verificato sul dominio pubblico** dopo una sola richiesta: nuovo asset `index-kMoBF-yp.js`, precedente `index-DwN3gNmM.js`. ID deploy frontend non esposto dallo strumento. `/admin`, homepage e `/products` HTTP 200; login Admin visibile, zero errori pagina. Il frontend LIVE è stato inoltre collaudato con provider/identità interamente sintetici e isolati: anteprima formattata, avviso sezione esclusa, Riprova con nuova risposta, avvisi eliminati, bozza vuota e Scarta PASS, zero mutazioni. Questo NON attesta una nuova sessione Admin reale o una generazione Gemini reale post-rilascio.
- Nessun cambio DB/RLS/ACL/ruoli/opt-in/secret/flag/Shopify/inventario/prezzi/ordini/DNS.

### Recovery e retest Marco
Recovery tecnico: precedente sorgente AI recuperabile dal commit `f32989def1fc4d3593744d60c83836a46f247329`, entrypoint SHA `a8a6621d21babc237a926d3689e98d6bc75b489c70c165a9a2d4243fdcacd625`; solo nuovo deploy mirato previa decisione, nessun rollback/restore eseguito. Frontend precedente identificato dall’asset `index-DwN3gNmM.js`; non è una prova di restore eseguito.

### Collaudo manuale di Marco del 26 novembre

| Caso | Riscontro prima del rilascio r2 | Esito sulla versione pubblicata |
|---|---|---|
| Descrizione estesa · Yucca rostrata | Dopo la conferma dei fatti e «Completa scheda con AI», l’anteprima mostrava «Descrizione ricomposta con le righe originali confermate». Il testo era quasi identico all’input, senza sezioni editoriali e con il Markdown visibile letteralmente. | Retest con Marco e Gemini reale da documentare. |
| Descrizione estesa · testo breve sull’arbusto Agavaceae | Il resoconto del collaudo riferisce lo stesso comportamento anche con l’input breve. | Retest con Marco e Gemini reale da documentare. |
| Pero · immagini | Segnalato un errore nell’apertura della galleria. Manca lo stato HTTP della lettura eseguita con l’Editor di Marco. | **APERTO.** Da verificare la chiamata `get_product_gallery` nella sua sessione. |
| Pero · formati | Segnalato un errore nella lettura dei formati. Manca lo stato HTTP della lettura eseguita con l’Editor di Marco. | **APERTO.** Da verificare la chiamata `get_product_formats` nella sua sessione. |

La segnalazione AI è registrata nel progetto Lovable alle 16:50 UTC, prima dell’autorizzazione al rilascio delle 17:05 UTC. I log precedenti registrano due risposte del provider HTTP 200 e l’attivazione del fallback. I log non conservano i testi delle risposte e quindi non permettono di abbinare le due chiamate ai singoli input. [Testo originale Yucca](../../scripts/tests/fixtures/yucca-rostrata-uat-20261126.txt) · [Testo originale breve](../../scripts/tests/fixtures/evergreen-uat-20261126.txt)

Per immagini e formati è stato osservato HTTP 403 `FORBIDDEN` su entrambe le letture con l’account Admin tecnico, privo delle chiavi personali necessarie. La causa dell’errore sul dispositivo di Marco resta da identificare. La correzione delle letture paginate in `product-admin-api` è stata provata con un Editor simulato e resta da distribuire.

**Riscontro tecnico sulla r2.** La lettura di `/admin` punta a `index-kMoBF-yp.js`. La richiesta OPTIONS a `product-admin-ai` restituisce HTTP 200 e l’intestazione `X-Admin-AI-Version: verified-editorial-20261126-r2`. Il commit applicativo è `d252925`. Il verbale di rilascio registra **272 test Node e 27 Deno PASS**, zero fallimenti. I 64 casi dell’handler rieseguiti sono già inclusi. Sul bundle pubblico, anteprima, avvisi, nuovo tentativo e scarto sono stati provati con identità e provider simulati.

**Accettazione cliente · `PENDING_CLIENT_ACCEPTANCE`.** Per completare il verbale servono l’esito di Marco sui due testi con Gemini reale, il riscontro separato su galleria e formati e la sua decisione esplicita. Per ogni anomalia annotare azione, messaggio visibile e, se disponibile, codice HTTP. La prova editoriale può concludersi con «Scarta» o con l’applicazione alla sola bozza autorizzata. SAL **57,75%**.

---

### Esito finale richiesto
| Voce | Esito |
|---|---|
| Root cause risolta | YES nel codice distribuito: niente prompt estrattivo/fallback descrizione |
| Validator corretto | YES, sezioni escluse e avvisi, errore se nessuna proposta utilizzabile |
| Prompt corretto | YES, fatti indicizzati e schema coerente |
| Rendering corretto | YES, preview e bundle LIVE testati con risposte sintetiche |
| Test | Node 272 PASS; Deno 27 PASS; handler finale 64 PASS; browser Python PASS |
| Deploy effettuato | YES, solo product-admin-ai |
| Publish frontend necessario | YES, autorizzato/completato; asset index-kMoBF-yp.js |
| Versione runtime verificata | verified-editorial-20261126-r2 tramite header live; hash binario non recuperabile |
| Retest Marco | REQUIRED; login reale e generazioni Gemini sui due input originali non eseguiti dopo il rilascio |

**GO rilascio tecnico completato; NO-GO accettazione definitiva prima del collaudo Marco.** Nessuna scrittura prodotti/Shopify o modifica catalogo pubblico. Le prove AI reali precedenti restano nel verbale storico e NON sono presentate come PASS del nuovo candidato.

## Verbale storico del candidato precedente (non sostituisce lo stato corrente)

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
