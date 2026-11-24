# Online Garden — Admin V2 / errore AI sulla nuova bozza (24 novembre 2026)

**Stato:** `REPRODUCED_BY_OPERATOR` nello screenshot del 24/11 (pomeriggio), **FIX NOT YET IMPLEMENTED / NOT DEPLOYED**. Perimetro: `/admin/products/new`, componente `ConfirmedAiAssistant`; il prodotto di prova non è stato pubblicato su Shopify. **SAL ufficiale invariata 57,75%** fino a collaudo dei criteri ponderati.

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
