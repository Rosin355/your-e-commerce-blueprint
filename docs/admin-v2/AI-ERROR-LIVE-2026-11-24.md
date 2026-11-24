# Online Garden — Admin V2 / errore AI sulla nuova bozza (24 novembre 2026)

**Stato al termine dell’intervento — FIX IN PR, PASS tecnico, collaudo live aperto.** La versione pubblicata di riferimento è `index-jqOemgjy.js`. SAL **57,75%**.

## Qualità SEO · candidato corrente della PR #73

**PASS tecnico isolato. Attivazione della selezione AI per SEO e tag in attesa di autorizzazione.** Il pulsante e la revisione introdotti a `c623b001` rimangono il punto di ingresso. Il modello può scegliere fra titoli preparati dal nome e da nomi esplicitamente confermati, fra estratti interi della scheda e fra etichette verificabili. In produzione il registro consente AI su descrizione e campi SEO, mentre `tags.ai_allowed` è falso. Il contratto di prenotazione attivo nel sorgente approvato autorizza la descrizione ed esclude tutti e tre i metadati dall’inferenza. Il candidato parte con lo stesso perimetro.

| Campo | Con autorizzazione per quel campo | Fallback e revisione |
| --- | --- | --- |
| Descrizione | Il modello ordina le righe confermate. La Edge verifica che ogni riga compaia una volta. | Se l’ordine è invalido si ricompongono tutte le righe originali. Restano distinti gli errori di input, provider e validazione. |
| Titolo SEO | Il modello seleziona un titolo entro 70 caratteri. Se Marco conferma «Nome comune: Farnia» può scegliere fra «Quercus robur», «Quercus robur (Farnia)» e «Farnia (Quercus robur)». | Prima variante valida secondo le regole del campo. Una sostituzione manuale è segnalata in anteprima. |
| Meta description | Il modello sceglie un estratto integro, anche con il nome prodotto, entro 320 caratteri. L’insieme dei candidati conserva le righe di precisazione riconosciute. | Primo estratto valido. Se nessun testo intero rispetta il limite, Marco può compilare il campo. La revisione umana controlla anche eventuali dipendenze di significato fra frasi. |
| Tag | Il modello seleziona fino a cinque etichette da nome e dichiarazioni esplicite di nome comune, nome botanico o cultivar. Il server verifica indici, unicità, forma, dimensione e registro. | Etichette verificate, deduplicate, più le categorie selezionate nel modulo. |
| Tipo prodotto | La classificazione usa il registro approvato dal responsabile. | Con il registro attuale il tipo resta manuale. Si possono approvare e salvare gli altri quattro campi. |

Il provider riceve una sola richiesta per tentativo. La risposta strutturata contiene indici, con budget di 256 token in uscita. Una selezione invalida attiva il fallback del solo campo interessato. La provenienza visualizzata distingue modello, compilazione deterministica e revisione manuale. Il budget condiviso resta cinque prenotazioni al minuto per operatore. Non è stato misurato un costo reale.

### Tipi Shopify · proposta per Marco

Lettura completa in sola lettura sul negozio `ecom-blueprint-gen-6ud1s.myshopify.com`. L’Admin API ha restituito una pagina con quattro stringhe distinte e `hasNextPage=false`. La query restituisce tipi già assegnati a prodotti. [Documentazione Shopify](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/productTypes)

| Valore Shopify esatto | Decisione proposta per le nuove schede |
| --- | --- |
| `simple` | Escludere dal selettore commerciale. Identifica la struttura semplice importata. |
| `variable` | Escludere. Il numero di formati è già gestito dal modulo. |
| `variation` | Escludere. È una distinzione tecnica delle varianti. |
| `wgm_gift_card, virtual` | Escludere dalle schede delle piante. Shopify lo restituisce come un unico valore. |

**Lista iniziale sottoposta a Marco:** «Alberi» e «Arbusti», già presenti nel menu commerciale del progetto. Marco può approvare entrambe le voci, una sola, indicare nomi diversi o mantenere il campo manuale. Occorre poi autorizzare separatamente il mapping del registro a `productType`. Il documento costituisce la proposta e non abilita alcuna voce. [Terminologia del catalogo](../../src/config/categories.ts)

### Verifiche sul candidato SEO

- Typecheck, build operativa e Deno check della Edge superati. Entry frontend `index-BVKTmXhO.js`, SHA-256 `53138a4151354cd8f8e750d2903d9d38cb70bd805e2695ff7d1857113b6ed2d0`.
- 84 test Node di dominio e permessi, quattro test sul vero handler HTTP con provider sintetico. Coperti grant mancanti, opt-in parziali, registro negativo, output inventato, indice fuori intervallo, risposta duplicata, rate limit, campo negato e una sola chiamata esterna per richiesta ammessa.
- PostgreSQL 16 temporaneo su socket locale. Eseguiti la prenotazione originale e il contratto proposto. Verificate cinque prenotazioni registrate, sesta rifiutata, replay rifiutato, account e campi limitati, ACL del servizio e assenza di esecuzione dai ruoli browser. La proposta SQL è in `docs/release/pending`, fuori dalle migrazioni.
- 11 test Chromium con traffico esterno bloccato. Desktop e mobile, fallback, errore provider e riprova, annullamento della sovrascrittura, modifica manuale, approvazione parziale e cumulativa, due formati, salvataggio e riapertura della bozza interna. Invii a Shopify pari a zero. Prova con il provider e la sessione autentica di Marco da eseguire.
- [Piano definitivo per merge, snapshot, deploy, anteprima, Publish e rollback](../release/ADMIN-V2-MARCO-RELEASE-2026-11-24.md#piano-definitivo-pr-73--qualità-seo).

## Storico a c623b001 · cinque campi in anteprima

Implementati sulla base isolata i requisiti aggiunti al verbale del titolare. **PASS tecnico** per l’anteprima con cinque righe, le approvazioni parziali o cumulative, gli errori e la riapertura interna simulata. **BLOCKED in produzione** per il suggerimento automatico del tipo finché il registro non fornisce un dominio approvato. Collaudo autentico con Marco da eseguire.

| Campo | Origine e condizione di applicazione |
| --- | --- |
| Descrizione obbligatoria | Una richiesta alla Edge già corretta in questa PR. L’anteprima indica se il risultato deriva dal modello o dalla ricomposizione delle righe originali. Si può correggere o escludere la proposta. |
| Titolo SEO | Copia del nome confermato, massimo 70 caratteri e vincoli del registro. Richiede il campo modificabile per l’account. |
| Meta description SEO | Prima riga confermata che rispetta integralmente i vincoli, massimo 320 caratteri. Se manca, la riga resta da compilare. |
| Tag | Copia letterale del nome e delle categorie selezionate nella bozza. Si verificano registro, duplicati, lunghezza e prefissi logistici. I tag presenti vengono sostituiti solo dopo conferma specifica. |
| Tipo prodotto | Dominio chiuso della definizione mappata al tipo Shopify. In caso di corrispondenza univoca si propone il valore. Se occorre una scelta compare l’elenco consentito. Un registro privo di dominio produce una motivazione e lascia proseguire. |

Il 24 novembre una lettura delle sole definizioni di Lovable Cloud ha confermato `description`, `seo_title` e `seo_description` modificabili con AI abilitata nel registro, e `tags` modificabile con AI disabilitata. La policy per l’invio al modello consente la descrizione. Il frontend copia localmente nome, etichette e righe verificate nei metadati della bozza su approvazione dell’Editor. La lettura non ha trovato una definizione mappata a `productType`. L’unica colonna denominata `product_type` nello schema pubblico appartiene allo staging CSV. I valori importati e le collezioni, da soli, non attestano tipi approvati.

**Prove sull’estensione**

- Typecheck, build operativa e lint mirato superati. Entry locale `index-BuUb1t_n.js`, SHA-256 `9f7dc7f1b8a09f81114ca110199b955f3c5307e8c7855f3ae17e2ce77fbada35`. Deno check superato sulla Edge della PR.
- 83 test Node su composizione, validazione, permessi esistenti, proposta da fatti e assistente su prodotto esistente. Un ulteriore test del vero handler HTTP con sette scenari e servizi simulati. Verificati prenotazione, rifiuto permessi, provider, fallback e limiti di campo.
- 10 test Chromium con servizi simulati e rete esterna bloccata. Compresi tastiera, 390 e 1280 px, due formati, SKU, EUR, fornitore e prezzi, approvazione singola e cumulativa, esclusione, conferma annullata, modifica manuale durante la revisione, errore provider, riprova, risposta in ritardo dopo cambio nome, salvataggio e riapertura dopo ricarica. Verificata l’assenza di invii a Shopify.
- Ripetizione browser dalla radice: `npm run test:editor-browser -- --workers=1 -g 'AI descrizione|Scheda AI Editor|AI da fatti confermati: campo vuoto|scheda reale: proposta immediata'`. La suite usa dati sintetici e intercetta le richieste dell’Admin. Il collaudo registrato ha inoltre bloccato il traffico esterno di Chromium.

**Decisione di rilascio**. GO tecnico per la sola Edge già corretta in `8fb057f`. Prima del deploy occorrono snapshot verificato della funzione attiva e autorizzazione. GO tecnico alla preparazione dell’anteprima autenticata sullo SHA approvato. Eseguire il collaudo autentico con un Editor autorizzato e la Edge verificata. NO-GO al Publish fino al suo esito e al successivo GO del responsabile. Per i passi e il rollback consultare il [registro del rilascio](../release/ADMIN-V2-MARCO-RELEASE-2026-11-24.md#estensione-della-pr-73--scheda-assistita). SAL **57,75%**.

## Esito della diagnosi

Ho riprodotto il rifiuto sul sorgente distribuito `5a37f71`: un paragrafo con due frasi confermate passa quando il provider lo restituisce identico. Cambiare soltanto il punto finale in un punto esclamativo fa fallire il confronto estrattivo. Prima della correzione lo stesso HTTP 422 `VALIDATION_ERROR` copriva fatti non validi, testo riformulato e vincoli del campo. La chiamata dell’assistente invia fatti, chiave del campo, conferma e chiave della richiesta. Può partire con la descrizione vuota.

La lettura aggregata su Lovable Cloud ha confermato che `description` è un campo testo/richtext visibile, modificabile, abilitato all’AI e senza limiti espliciti minLength/maxLength nel registro. Il journal mostra tre prenotazioni per descrizioni nella finestra consultata del 24 novembre. Non registra l’esito del modello. L’accesso ai log delle invocazioni è stato negato. Senza correlazione con la richiesta dell’operatore, la causa di **quello specifico** 422 resta indeterminata.

## Comportamento della correzione

- L’editor può inserire un paragrafo con più frasi o righe indipendenti. Il controllo locale segnala la riga fuori limite. I fatti restano disponibili durante un errore e il successivo tentativo.
- Per `description` l’ordine proposto è valido se contiene tutte le righe confermate, ciascuna una sola volta e senza riscritture. In caso di parafrasi, omissioni o duplicati, il server scarta il testo generato e ricompone le righe originali in ordine. Il risultato passa attraverso gli stessi controlli del campo, compresa la validazione dell’HTML editoriale. La UI identifica questa alternativa nella proposta.
- Un output illeggibile, un errore del provider, un limite di frequenza o un diniego dei permessi producono un errore specifico. La revisione del testo rimane esplicita. **Applica alla compilazione** aggiorna la descrizione locale. **Salva bozza nell’Admin** è una seconda azione.
- Un avviso con ruolo accessibile, testo rosso, bordo e icona identifica gli errori nelle schede AI di creazione e di modifica. Un errore con riferimento permette al gestore di cercare la fase. La nuova diagnostica registra azione, ID della richiesta, campo, fase e codice. Fatti, proposte, token e identità restano esclusi dalle tracce.

## Verifiche e rilascio

Prove storiche del solo fix descrizione a `8fb057f`. Per i risultati e l’asset correnti vedere la sezione sulla scheda assistita sopra.

| Verifica | Esito sul candidato |
| --- | --- |
| TypeScript, Vite operativa, Deno check della Edge | PASS. Entry candidata `index-BhswdZ_d.js`, SHA-256 `b2270fa3131b748aeb91343d134f16272d93529bb5e633fbe31c5affa19710e2`. |
| Test mirati Node | 71 passati, più un test sul vero handler HTTP con sette scenari e dipendenze simulate. Verificati permessi Editor, prenotazione, errori distinti, nessuna mutazione Shopify e assenza dei testi nei log. |
| Chromium locale, rete esterna bloccata | 6 test passati. Nuova bozza a 390 e 1280 px, tastiera, input rifiutato prima della rete, disconnessione e retry, errore modello, approvazione annullata e poi confermata, salvataggio e riapertura interna. Coperti campo mancante su scheda esistente, proposta preesistente e Editor senza grant AI. |
| **A · Deploy Edge** | **GO tecnico, NO-GO esecutivo.** Solo `product-admin-ai` con il suo grafo di 24 sorgenti. Prima della sostituzione acquisire e verificare la revisione attiva di **questa funzione** e la configurazione di deploy. L’archivio locale di riferimento `5a37f71` ha SHA-256 `eadb0c006a3360a3d6d05c12f19067dbc5dc7ea55779e7ad78f443ccbc2012f2`, il candidato `e7d8ac2df87671fff69ee2c0f00e9cbc498cedc244f438dc4556cff6f966dfcc`. Se la revisione attiva differisce, il rollback deve usare quella versione. Richiesto GO specifico. |
| **B · Publish Lovable** | **Candidato pronto, NO-GO esecutivo.** Dopo A verificare dall’anteprima autorizzata su quale fase ricade un errore e che il fallback sia etichettato prima di applicarlo. Verificare branch, SHA approvato e asset, poi richiedere GO. Per rollback ripubblicare la versione con `index-jqOemgjy.js` e verificare SHA-256 `74449f1d0f5cf1f834a076535f8e04681e9598160486ab81c2144b8ab3a10c4e`. Se anche la Edge è coinvolta, ripristinare il suo snapshot verificato. |

**Collaudo Marco dopo il rilascio autorizzato.** In una bozza tecnica, lasciare vuota la descrizione e inserire soltanto le proprie informazioni verificate. Confermare e richiedere la proposta. Annotare se arriva dal modello o dai fatti originali, controllare che il campo resti vuoto fino ad **Applica**, salvare internamente e riaprire la bozza. In caso di errore conservare solo ora, codice o riferimento. La prova autentica e l’accettazione restano pendenti.

## Segnalazione originale prima del fix

## Riproduzione reale osservata

- L'operatore apre il modulo nuovo prodotto semplificato pubblicato.
- Nome prodotto: `Quercus robur`, descrizione obbligatoria vuota. Il campo aiuto AI contiene un testo verificato sulla farnia, con più frasi nello stesso paragrafo. Casella di conferma selezionata.
- Clic su `Organizza le informazioni con AI` restituisce errore testuale poco distinguibile:
  `La proposta o i fatti non superano la verifica del campo. Controlla le frasi confermate oppure compila a mano.`
- La bozza resta modificabile. Non è disponibile il codice HTTP preciso, un request/correlation ID di log, né il payload della proposta AI. **Non attribuire la causa al provider senza tracce.**

## Analisi tecnica basata su sorgenti effettivi

Verificato dal codice attuale di Lovable e dal commit isolato `5a37f71`:

- `src/adminv2/components/ConfirmedAiAssistant.tsx` divide le informazioni per **newline** `text.split('\n')` e usa `confirmedFacts`: tra 1–12 righe, da 12 a 500 caratteri per riga, niente HTML/link/email. Più frasi nella stessa riga *non sono automaticamente un errore* se la riga rispetta i limiti.
- Lo stesso componente intercetta `AdminApiError('VALIDATION_ERROR')` e mostra il messaggio generico sopracitato, in `<p role="alert">` privo di classi `text-destructive`/border/bg. Quindi **UX error styling carente verificata dal codice**.
- `supabase/functions/_shared/admin-ai-confirmed.ts` usa `generateConfirmedProposal` con strategia **estrattiva**: la risposta del modello deve essere un array di stringhe identiche a elementi di `facts`, senza duplicazioni. Se il modello riformula, la richiesta fallisce senza proporre contenuto. Altri motivi di `VALIDATION_ERROR` sono possibili (validazione campo, validazione richiesta, output non conforme). **La causa puntuale del singolo errore live resta non dimostrata**.
- `src/adminv2/lib/adminApi.ts` mappa `VALIDATION_ERROR` al messaggio generico `MESSAGES[code]` o, per il componente, alla frase visibile; non esiste distinzione utente input-vs-output su questa schermata.

## Obiettivo del fix

1. **UX:** tutti gli errori della scheda AI con `role=alert`, `aria-live=assertive` (se non ridondante), colori accessibili `text-destructive`, bordo/sfondo neutro-rosso e icona/label "Errore AI". Il feedback deve scomparire dopo una correzione dell'input o nuova richiesta; preservare sempre i fatti durante l'errore.
2. **Diagnosi:** distinguere almeno `INVALID_CONFIRMED_FACTS` (input), `INVALID_MODEL_PROPOSAL` (output non estraibile), `INVALID_FIELD_VALUE` (validazione campo), `AI_PROVIDER_ERROR`, `AI_TIMEOUT`, `FORBIDDEN` e `RATE_LIMITED`, con messaggi italiani chiari e suggerimenti realistici. Usare codici strutturati con log non sensibili (request ID, codice, campo, fase), senza loggare prompt, testo completo, email o credenziali.
3. **Resilienza:** evitare che una variazione innocua di punteggiatura del modello renda impossibile creare una descrizione da fatti verificati. Soluzione preferita da valutare: **fallback estrattivo deterministico** dai fatti confermati, sanitizzazione HTML lato server, anteprima modificabile e accettazione esplicita, senza inventare dati. Non rimuovere le protezioni contro allucinazioni, numeri non verificati, HTML arbitrario, prezzi, disponibilità, certificazioni e pubblicazione automatica. Se la policy richiede output identico, non allentare il vincolo: usare i fatti in fallback invece di affidarsi alla riproduzione testuale del modello.
4. **Usabilità:** spiegare che la descrizione può essere generata a partire da righe indipendenti e aggiungere un esempio pronto all'uso. Non imporre frasi inventate. Messaggi di campo obbligatorio separati dai problemi AI.
5. **Test:** nuovi casi per una riga valida con più frasi, tre righe separate, modello che introduce parola/claim inventato, output identico, duplicati, fallback, errore di provider, permessi Editor, nuova bozza e scheda esistente, persistenza della proposta, stile visuale desktop/mobile e keyboard, nessuna modifica Shopify.
6. **Rilascio:** realizzare fix su un **ramo dedicato** dal codice pubblicato, test e PR. Dopo merge, deploy mirato dell'Edge eventualmente modificata e Publish Lovable solo con GO separati e rollback. Non fare Publish direttamente durante il collaudo. Fino al fix, provare manualmente input una frase verificata per riga e, se fallisce ancora, conservare errore e proseguire senza AI.

**Accettazione**: il tester può inserire fatti verificati sulla farnia, ottenere anteprima (o fallback estrattivo sicuro), scegliere esplicitamente "Applica" per la descrizione obbligatoria, salvarla solo nella bozza interna, riaprirla e verificare contenuto; un errore è visivamente rosso, leggibile e distinto dal testo descrittivo.
