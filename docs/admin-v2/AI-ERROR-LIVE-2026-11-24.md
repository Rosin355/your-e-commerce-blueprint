# Online Garden — Admin V2 / errore AI sulla nuova bozza (24 novembre 2026)

**Stato al termine dell’intervento — FIX IN PR, PASS tecnico, collaudo live aperto.** La versione pubblicata di riferimento è `index-jqOemgjy.js`. SAL **57,75%**.

## Esito della diagnosi

Ho riprodotto il rifiuto sul sorgente distribuito `5a37f71`: un paragrafo con due frasi confermate passa quando il provider lo restituisce identico. Cambiare soltanto il punto finale in un punto esclamativo fa fallire il confronto estrattivo. Prima della correzione lo stesso HTTP 422 `VALIDATION_ERROR` copriva fatti non validi, testo riformulato e vincoli del campo. La chiamata dell’assistente invia fatti, chiave del campo, conferma e chiave della richiesta. Può partire con la descrizione vuota.

La lettura aggregata su Lovable Cloud ha confermato che `description` è un campo testo/richtext visibile, modificabile, abilitato all’AI e senza limiti espliciti minLength/maxLength nel registro. Il journal mostra tre prenotazioni per descrizioni nella finestra consultata del 24 novembre. Non registra l’esito del modello. L’accesso ai log delle invocazioni è stato negato. Senza correlazione con la richiesta dell’operatore, la causa di **quello specifico** 422 resta indeterminata.

## Comportamento della correzione

- L’editor può inserire un paragrafo con più frasi o righe indipendenti. Il controllo locale segnala la riga fuori limite. I fatti restano disponibili durante un errore e il successivo tentativo.
- Per `description` l’ordine proposto è valido se contiene tutte le righe confermate, ciascuna una sola volta e senza riscritture. In caso di parafrasi, omissioni o duplicati, il server scarta il testo generato e ricompone le righe originali in ordine. Il risultato passa attraverso gli stessi controlli del campo, compresa la validazione dell’HTML editoriale. La UI identifica questa alternativa nella proposta.
- Un output illeggibile, un errore del provider, un limite di frequenza o un diniego dei permessi producono un errore specifico. La revisione del testo rimane esplicita. **Applica alla compilazione** aggiorna la descrizione locale. **Salva bozza nell’Admin** è una seconda azione.
- Un avviso con ruolo accessibile, testo rosso, bordo e icona identifica gli errori nelle schede AI di creazione e di modifica. Un errore con riferimento permette al gestore di cercare la fase. La nuova diagnostica registra azione, ID della richiesta, campo, fase e codice. Fatti, proposte, token e identità restano esclusi dalle tracce.

## Verifiche e rilascio

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
