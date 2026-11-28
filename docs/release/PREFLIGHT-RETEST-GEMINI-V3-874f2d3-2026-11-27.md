# Online Garden — preflight retest Gemini V3 corretta

Data: 27 novembre 2026. **PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.**

## Verdetto

**GO CONDIZIONATO per il deploy selettivo della sola `product-admin-ai` dal candidato `874f2d398bdb4c635955243ac2a3e1fc5546a254`.** Non è un'autorizzazione a eseguirlo. **NO-GO per attestare oggi lo SHA del runtime o dichiarare superato il retest reale.**

Il rilascio è tecnicamente isolabile, compatibile e reversibile a livello sorgente. L'identificazione proposta sotto distingue il comportamento dei due candidati, ma non certifica crittograficamente il runtime. Se l'accettazione richiede lo SHA runtime esatto prima della prova, il rilascio resta NO-GO: gli strumenti disponibili non lo espongono e questo preflight non modifica il codice per aggiungerlo.

## 1. Ramo e anteprima

- BRANCH: `codex/ai-product-editor-v3-20261127`.
- COMMIT verificato prima di qualsiasi documentazione: `874f2d398bdb4c635955243ac2a3e1fc5546a254`; checkout pulito.
- Anteprima: https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app/admin/products/new
- Aperta `/admin/products/new` su localhost con l'account del richiedente: Admin autenticato, Anteprima cliente e Genera scheda completa con AI visibili, nessun errore JavaScript. Nessuna generazione o modifica eseguita. Le richieste AI e i comandi non ammessi sono stati bloccati preventivamente; una lettura `catalog_categories` è stata bloccata dal filtro prudenziale, quindi non si attesta il caricamento delle categorie in questa visita.
- Il sito pubblico risponde HTTP 200. Non è stato pubblicato il frontend candidato.
- La documentazione di questo preflight aggiunge un commit documentale successivo; non cambia il codice del candidato identificato sopra.

## 2. Perimetro backend da distribuire

Nel grafo transitivo di `product-admin-ai` cambiano sei file rispetto a `fa2a079`:

| File | Correzione |
|---|---|
| `_shared/admin-ai-confirmed.ts` | Sezione suggerita per gli atomi sorgente, istruzioni complete solo sulla generazione iniziale |
| `_shared/admin-ai-description.ts` | Recupero locale circoscritto, conteggi `sectionAudit`, una sezione valida successiva non oscurata da uno scarto precedente |
| `_shared/admin-ai-evidence.ts` | Equivalenze, duplicati e copertura con controlli su organo, misura, colore e polarità |
| `_shared/admin-ai-revision.ts` | Istruzioni su indici originali e distribuzione delle informazioni |
| `_shared/admin-ai-sections.ts` | Origine derivata e instradamento suggerito |
| `product-admin-ai/draft-sheet.ts` | Candidati SEO/tag più ricchi ma verificati e validati dal registro |

Grafo: **31 file, 5 locali e 26 shared**, ricostruiti per entrambe le revisioni in area temporanea. Nessuna modifica a `product-admin-api`, migrazioni o configurazione tra le due revisioni.

Lo strumento di deploy accetta `function_names: ["product-admin-ai"]`. Solo quel nome deve essere passato, con le dipendenze del candidato. Includere file shared nel pacchetto non ridistribuisce le altre funzioni che li importano: esse conservano il proprio pacchetto. Vietati elenco esteso, deploy globale, Publish e sincronizzazione di dati.

## 3. Compatibilità precedente

Senza `article: true` resta il contratto `online-garden-editoriale-it@2`; il marcatore V3 è facoltativo. Azioni, autenticazione, provider e prenotazioni restano invariati. I recuperi locali e i nuovi candidati SEO sono subordinati a `article`.

Il comparatore di copertura condiviso cambia anche per il percorso precedente: compatibilità del trasporto non significa comportamento editoriale byte-per-byte identico. Le regressioni V2 e legacy passano. Non è stata effettuata una generazione sul frontend pubblico e non si attesta la qualità reale del modello.

## 4. Autenticazione ed effetti tecnici

Verifiche sul backend attualmente distribuito, senza provider:

- OPTIONS: **200**, marcatore `verified-editorial-20261126-r2`.
- `suggest_confirmed_field` senza token: **401**.
- Stessa azione con token invalido: **401**.
- Lettura `get_admin_context` con identità del richiedente: **200**, ruoli Admin ed Editor, AI e nuove bozze abilitate; grant descrizione e SEO presenti.
- `get_ai_suggestions` autenticato con ID intenzionalmente invalido: **422 VALIDATION_ERROR**, dopo il controllo di identità e prima della lettura delle proposte. Prova che l'identità viene accettata dalla funzione AI, senza prenotazione o modello. Non prova ancora l'autorizzazione della richiesta completa.

Nel sorgente il token viene verificato dal servizio auth e i ruoli sono letti server-side, senza fidarsi del body. Grant, registro e abilitazioni sono verificati prima della prenotazione e del provider. Nessuna modifica ai permessi.

La lettura delle definizioni delle routine live conferma la presenza di entrambe le prenotazioni. `reserve_new_draft_editorial_v1` richiama la prenotazione descrizione e inserisce lo scope autorizzato. Il test reale completo può scrivere soltanto:

1. `admin_confirmed_ai_requests`: prenotazione della richiesta;
2. `admin_draft_ai_request_scopes`: scope dei campi autorizzati, se percorso batch;
3. log tecnici della funzione e registrazioni del servizio AI.

Se batch non disponibile, fallback alla sola prenotazione descrizione; la selezione AI SEO non viene ampliata. Nessuna creazione di prodotto o bozza interna nell'azione scelta. Il grafo importa anche moduli Shopify, ma il ramo `suggest_confirmed_field` non esegue chiamate Shopify. Altre azioni della funzione possono mutare dati: sono escluse dal retest.

## 5. Identificazione del codice distribuito

Entrambi i candidati hanno **lo stesso entrypoint SHA-256** `843334e3ce883a1cad45798a34260c3a5e2f58ce7e3ea2e5859eba7561b201cb`, lo stesso header e `promptVersion=@3`. Nessuno di questi identifica la correzione.

Impronte del manifest sorgente completo, algoritmo riproducibile: array ordinato per percorso di oggetti `{path, sha256}` per ogni file transitivo; serializzazione JSON UTF-8 compatta, poi SHA-256:

- Candidato: `d6c02bbce3b9d7365a16278487ac32edfcfbcddadab0b08f196dd54b7e9ccf41`.
- Rollback: `8c867bad8767991a2d1826b36041bf0183bfcb587470b451b8d39c044647594e`.

Queste identificano i sorgenti preparati, NON il pacchetto interno di deploy né il runtime. Non sono confrontabili direttamente con la precedente impronta di pacchetto `a058fccd…2cff0a09`, calcolata con altra rappresentazione.

Per distinguere attendibilmente **i due comportamenti noti** durante l'unica generazione autorizzata:

- conservare ricevuta del deploy selettivo e manifest candidato;
- correlare orario e identificativo della richiesta con log funzione e servizio AI;
- controllare la risposta grezza, non solo la schermata: il nuovo validatore restituisce `sectionAudit` su una descrizione V3 riuscita, assente nel precedente;
- se disponibili nei log del servizio AI, controllare `suggestedHeading` negli atomi e la nuova istruzione «index di RIGA» del prompt iniziale;
- verificare `origin: derived` quando intervengono recuperi locali.

Se non arriva una descrizione valida o mancano queste evidenze, **identificazione inconclusiva: fermarsi, non ripetere la generazione**. `sectionAudit` distingue il percorso corretto da quello precedente, non certifica ogni byte del runtime. Per un'attestazione SHA esatta occorrerebbe un'attestazione della piattaforma o un marcatore sorgente univoco con modifica separatamente autorizzata; nessuno aggiunto qui.

## 6. Budget del retest reale

Una sola richiesta iniziale `suggest_confirmed_field`, `draftTitle: "Yucca filamentosa"`, `fieldKey: "description"`, `article: true`, `confirmed: true`, fatti originali verificati e un unico `requestKey` UUID:

- massimo **1 chiamata descrizione + 1 chiamata selezione SEO/tag = 2 chiamate applicative al servizio Gemini**;
- la seconda avviene soltanto con fatti utilizzabili, candidati eleggibili e campi prenotati;
- recuperi locali, sintesi, FAQ e curiosità derivate non chiamano il modello;
- provider e invocazione frontend non implementano retry automatici;
- nessun secondo clic, refresh con reinvio, Prepara revisione o Rivedi con AI durante il retest;
- un errore, timeout, 401, 403 o esito inconclusivo chiude la prova senza retry, anche se resta budget.

Il limite riguarda le chiamate applicative osservabili, non eventuali elaborazioni interne del servizio AI. L'uso del gateway e il relativo costo devono essere verificati dopo la prova. Nessuna chiamata Gemini eseguita in questo preflight.

## 7. Rollback preparato, non eseguito

1. Conservare il candidato e la ricevuta di deploy; sospendere ulteriori invocazioni.
2. Ricostruire da Git `fa2a0796a93cd2fe1d4ee7de1b80f9b0cf8dc0c1` l'intero grafo dei 31 file, non soltanto `index.ts`. I sorgenti sono recuperabili e sono stati preparati in area temporanea senza cambiare ramo.
3. Verificare il manifest rollback indicato sopra. Distribuire solo `product-admin-ai` con queste dipendenze, **esclusivamente dopo autorizzazione al rollback**.
4. Ripetere OPTIONS, 401 senza token, 401 token invalido e controllo autenticato non generativo. Non fare nuove chiamate Gemini salvo autorizzazione distinta.
5. Non modificare frontend, altre funzioni, database o permessi. Le prenotazioni/audit già registrati non vengono cancellati dal rollback. Non è un rollback runtime automatico né già collaudato.

## 8. Piano di confronto reale

Prima della prova: accesso fresco del titolare, controllo autenticato non generativo, registro/grant/opt-in di SEO e tag in sola lettura, ricevuta del deploy selettivo e disponibilità dei log. La presenza delle routine batch è già verificata; gli opt-in effettivi dei campi non sono stati attestati in questo preflight.

Acquisire una sola risposta iniziale e confrontare:

| Indicatore | Baseline osservata/ricostruita | Candidato simulato | Retest reale da compilare |
|---|---|---|---|
| Parole | 137 | 163 con recupero locale; 254 fixture completa | Conteggio prima di interventi manuali, obiettivo 250–450 con fonti sufficienti |
| Copertura | 5/15 precedente; 8/15 con solo comparatore corretto | 10/15 parziale recuperata; 15/15 completa | Righe coperte, equivalenze, duplicati, omissioni vere e falsi negativi |
| Esclusioni | 4 conflitti + 1 ambiguo | Conservate | Nessuna promozione automatica a fatto confermato |
| Sezioni | Fogliame, fioritura, portamento | Recupero locale di introduzione, botanica e coltivazione quando ammesso | Received/accepted/rejected/derived e avviso per ogni scarto |
| SEO | Titolo minimo, meta breve, tag solo nome | Nome + arbusto sempreverde, meta con terreno, due tag | Testo, limiti, origine modello/deterministica, scope prenotato |
| Complementari | FAQ e curiosità visibili | Derivati dalle sezioni verificate | Breve, caratteristiche, punti di forza, FAQ/curiosità senza claim inventati |

Controllare organo della misura di 3 metri (stelo floreale), famiglia e altezza della pianta senza risolvere arbitrariamente i conflitti. I conteggi di 15 mantengono il duplicato storico per confrontabilità; indicare anche le righe equivalenti raggruppate.

Il recupero locale non garantisce una scheda completa: nella fixture parziale restano **5 fatti mancanti e 163 parole**, quindi approvazione bloccata. La prova reale deve dimostrare la completezza al primo clic; non è già accettata dai test. Gli scarti preesistenti restano visibili anche dopo una frase derivata sostitutiva.

## 9. Origine e persistenza

- Estesa: sezioni modello e locali marcate separatamente; persistenza futura come descrizione sanificata dopo approvazione.
- Breve, SEO e tag: candidati derivati o selezionati dal modello, con registro/grant e destinazioni supportate.
- Caratteristiche, punti di forza e FAQ: derivate e applicabili/persistibili soltanto con supporto del backend e conferme individuali.
- Curiosità: sola anteprima autonoma nella nuova bozza; eventuale contenuto dentro l'estesa segue il corpo descrittivo.
- Modifiche manuali: distinguere l'origine da modello e derivato; nessuna modifica eseguita nel retest iniziale.
- Fonti, confronto e anteprima non applicata: dati della sessione, non un registro editoriale persistito.

**Nel retest nessun contenuto commerciale viene salvato:** non premere Approva/applica, Salva bozza interna, invia a Shopify o Pubblica. Le destinazioni sopra descrivono capacità previste, non persistenza verificata su produzione.

## 10. Prove eseguite e limiti

- `node ci/run-domain.mjs node`: **718/718 PASS**, rete disabilitata.
- `node ci/run-domain.mjs deno ci/deno-ci.lock`: **132/132 PASS**, lock congelato e nessun permesso di rete runtime.
- I test V2, V3, copertura, recuperi, SEO, polarità e organi sono inclusi nelle prove offline.
- Tentativo del comando generico `test:catalog`: inadatto ai file Deno; 718 passaggi e 8 errori di runtime/rilevamento. Nessuna regressione del candidato dedotta da questo comando. I runner nativi sopra passano integralmente.
- `npm run test:editor-browser -- scripts/browser/marco-delivery.spec.ts --grep "V3" --output /tmp/browser/preflight-v3-tests`: **5 test non eseguiti**, Chromium richiesto dalla versione JS di Playwright assente. Fallimento al lancio, non al flusso. Nessuna installazione o modifica di configurazione effettuata. I precedenti 40 PASS documentati dal candidato non sono nuove prove di questa sessione.
- Chromium Python disponibile: visita autenticata della pagina iniziale riuscita, senza provider, senza salvataggi e senza errori runtime; non sostituisce la suite completa V3.
- Ultimo segnale disponibile dell'anteprima: **build OK**.

Nessun deploy, Publish, merge, modifica del codice applicativo, migration, variazione permessi, scrittura Shopify/bozze/prodotti o chiamata Gemini. Soltanto controlli di lettura e documentazione del preflight.

Restano bloccati: attestazione SHA runtime esatta non esposta; retest reale e rollback eseguibili solo con autorizzazione; nuova esecuzione della suite browser JS impedita dal browser richiesto assente; UAT editoriale ancora da accettare. **PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.**