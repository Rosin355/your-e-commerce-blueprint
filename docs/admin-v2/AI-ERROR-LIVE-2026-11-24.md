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

## Proposta UX aggiuntiva — Compila scheda con AI (24/11/2026)

**Stato: PROPOSTA DEL TITOLARE/TEAM, NON IMPLEMENTATA E NON PUBBLICATA.** Da integrare, se approvata, nello stesso fix dell'errore AI per evitare due cicli di sviluppo e deploy.

### Attuale vs desiderato

Il modulo nuovo prodotto precompila SKU famiglia, EUR e fornitore; `productType`, tag, `seoTitle` e `seoDescription` sono attualmente campi manuali nel pannello `Opzioni avanzate`. L'assistente `ConfirmedAiAssistant` presente nella prima schermata interviene sulla `description`, non su tutti i metadati. Il proprietario desidera che l'editor compili pochi campi e riceva suggerimenti AI per gli altri, senza dover conoscere SEO o definire manualmente un tipo prodotto.

### Requisiti candidato

- Azione unica **"Completa scheda con AI"** dopo inserimento minimo di nome prodotto e fonti/fatti verificati; possibile supporto foto come contesto solo se la fonte è verificata e non come base per affermazioni non confermate.
- Un'unica chiamata o pipeline idempotente produce una **proposta non salvata**, con `description`, `seoTitle`, `seoDescription`, `tags`, `productType` (solo tipologie consentite e verificate), ciascuno con stato suggerito/applicato/escluso e motivazione se non generabile. I campi obbligatori non possono essere aggirati.
- Marco può **approvare tutti i valori compatibili o uno per uno**, correggere e annullare; la proposta non deve sovrascrivere campi già compilati manualmente senza conferma specifica. Nessun salvataggio prodotto o sincronizzazione Shopify automatica.
- I tag devono essere dedotti strettamente da nome, categoria e fatti confermati, senza keyword stuffing, certificazioni non dimostrate, prezzi o disponibilità presunti. I metadati SEO richiedono lunghezze adeguate e niente claim inventati. `productType` non deve essere inventato: risolverlo contro tassonomia/mapping approvati; se ambiguo, mostrare alternative e chiedere scelta.
- Nascondere sotto **"Dettagli avanzati (facoltativi)"** SKU, valuta, fornitore, tipo, tag, SEO; dare agli editor un riepilogo trasparente dei valori proposti. SKU resta automatico con controllo collisioni. I campi manuali devono restare accessibili al responsabile.
- Per stagionalità, irrigazione, esposizione, potatura, tossicità, resistenza, origine e altre proprietà botaniche non verificate, **non generare valori**: lasciare vuoto e contrassegnare per revisione.
- Errore AI del ticket precedente: usare stile rosso `text-destructive`, etichetta comprensibile e `role=alert`; distinguere input, output, timeout, provider, autorizzazione. Fatti e dati form devono persistere durante errori, step e ritorno da anteprima.
- Eseguire test unitari/integrazione/E2E delle proposte multiple e revisione parziale, due formati, duplicazioni, input scarso, override campo manuale, versione locale/salvataggio, validazione lato server e autorizzazioni Editor; documentare UX per designer, sviluppatore e guida Marco.
- Rilascio su PR dedicata e **GO separati** per backend e frontend; nessun deploy o Publish mentre è in corso il test della produzione. SAL invariata fino all'accettazione.

### Criterio di accettazione

Marco inserisce nome, almeno un fatto verificato, formati e prezzo; preme **Completa scheda con AI**, rivede descrizione/SEO/tag/tipo, approva solo i campi desiderati, salva una **bozza interna non pubblicata**, riapre e trova tutti i dati approvati. In caso di un solo campo non verificabile l'operazione resta utilizzabile e indica esattamente cosa compilare manualmente.
