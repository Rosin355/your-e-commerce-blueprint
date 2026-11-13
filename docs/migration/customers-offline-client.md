# Online Garden — recupero clienti: guida per il proprietario

**13 novembre 2026 — preparazione offline. Nessun cliente importato o modificato.** Il lavoro è separato dal gestionale Admin, dalla PR #47 e dalle attività operative del sito.

## Cosa stiamo preparando

L'audit della [PR #48](https://github.com/Rosin355/your-e-commerce-blueprint/pull/48), consultabile nel [documento storico al commit originale](https://github.com/Rosin355/your-e-commerce-blueprint/blob/6deae03f46a89222f68037f33e28755df13f0cf7/docs/migration/legacy-customers-seo-2026-11-09.md), ha individuato 5.453 vecchi account, dei quali **858 con ordini**, per un totale storico di **953 ordini associati**. Il foglio selezionato da 1.108 righe contiene tutti gli 858 acquirenti. La prima fase riguarda soltanto questi account: gli altri non saranno importati automaticamente.

La #48 è ancora aperta e in bozza al 13/11/2026: l'audit non è ancora in `main`. Il collegamento sopra resta consultabile indipendentemente dal suo merge. La #53 prepara gli strumenti offline; il responsabile dovrà coordinare le due integrazioni e aggiornare i riferimenti quando l'audit sarà integrato. Questa attività non esegue alcun merge o deploy e non modifica la #48.

858 è il numero iniziale da verificare. Dopo esclusione delle utenze di servizio, controlli dei dati, duplicati e confronto con Shopify, il numero di nuovi profili potrebbe essere inferiore. I 953 ordini rimangono nell'archivio storico: questa procedura non li crea in Shopify e non modifica la spesa totale dei clienti.

## Protezioni predisposte

- Gli script non possono creare o aggiornare clienti Shopify: producono solo conteggi e motivi di blocco.
- Gli account amministratore/autore sono esclusi. Email duplicate, dati discordanti e recapiti non validi richiedono verifica privata.
- Un cliente già presente su Shopify viene saltato, anche in caso di corrispondenza per telefono. Nessuna sovrascrittura automatica.
- Marketing email, SMS e WhatsApp restano disattivati. L'acquisto passato non costituisce consenso; eventuali prove documentali saranno valutate separatamente.
- Password, hash WordPress, sessioni e dati di sicurezza non entrano nel processo. Gli originali restano su Drive con accesso ristretto.
- Nessuna email, nome, numero di telefono o indirizzo cliente compare nel report GitHub. Non vengono inviate comunicazioni agli utenti.

## Risultato disponibile e limite attuale

I test usano **soltanto dati inventati**. Il [report dimostrativo](customers-synthetic-dry-run.json) simula 1.108 righe, 858 acquirenti e 953 ordini; un cliente simulato risulta già presente e 857 sono proposte simulate. **857 non è una stima dei clienti reali da importare.**

Non abbiamo acquisito in questa preparazione il file clienti privato né un elenco Shopify aggiornato. Pertanto la qualità dei dati veri, i duplicati e il numero finale da creare restano da determinare. Un esito tecnico positivo non autorizza automaticamente l'importazione.

## Cosa serve per il controllo reale

Il responsabile dei dati dovrà predisporre in un archivio privato, cifrato ed esterno a ogni repository:

1. **Anagrafica minima di Sheet2:** estrarre alla fonte soltanto ID storico, ruolo ed email e gli eventuali campi anagrafici opzionali approvati. Conservare le 1.108 righe per verificare gli esclusi. Sheet2 **non contiene il numero degli ordini**.
2. **File separato ID/ordini:** dalla scheda originale estrarre soltanto `ID,orders`, senza scaricare l'intera scheda. Le 5.453 coppie minime consentono di verificare anche i record fuori Sheet2. Il programma collega i due file per ID, senza esportare un nuovo elenco clienti: ID duplicati, mancanti o contatori dubbi bloccano il confronto. Vanno riconfermati 858 acquirenti/953 ordini, distinguendo 248 clienti senza ordini e due utenze non cliente nella selezione. I 4.345 record fuori selezione non vengono proposti per l'importazione.
3. **Verifica privata dei casi dubbi:** non sostituire automaticamente il testo `null` con vuoto o zero e non aggiungere `+39` ai telefoni nazionali. I campi opzionali realmente vuoti restano assenti; valori `null`, telefoni non validi e dati discordanti richiedono revisione. Il report conteggia separatamente questi problemi, ma oggi non ne conosciamo l'incidenza reale.
4. **Snapshot Shopify completo e recente:** un operatore autorizzato verifica il negozio corretto, legge tutti i clienti senza filtri e segue tutte le pagine fino alla fine. Controlla ID univoci e conteggi esatti prima/dopo, quindi prepara solo `Email,Phone` e il manifest v2 descritto nel runbook. Non omettere clienti senza email: anche i record con solo telefono contano. Record senza entrambi o malformati richiedono una soluzione revisionata, non la loro cancellazione dal file.
5. **Evidenze riservate:** conservare data UTC di inizio/fine, controllo dei cursori e conteggi delle pagine, dominio, numero di clienti e checksum. All'esecuzione l'estrazione deve essere iniziata e terminata da non più di 24 ore. Una spunta `complete:true` o un checksum **non dimostrano da soli la completezza**: il developer controlla la coerenza locale, il responsabile verifica privatamente la fonte. L'assenza di variazioni di conteggio non garantisce che i recapiti non siano cambiati.

Non inviare schede complete, password/hash/sessioni, token, file minimizzati o tracce con ID/cursori in chat, ticket, PR o CI. Non usare il backup TAR. L'accesso ai dati privati e le estrazioni live non sono stati eseguiti in questo lavoro. Nel repository entrano soltanto fixture inventate, documentazione e conteggi aggregati.

Il developer eseguirà il confronto **offline**, presenterà i conteggi aggregati e farà revisionare privatamente un campione e i casi dubbi. Il dettaglio tecnico, incluso lo schema minimo, è nel [runbook developer](customers-offline-developer.md).

Restano quindi da predisporre i due CSV minimizzati reali, la riconciliazione delle fonti e la review di null/telefoni, lo snapshot con evidenze di completezza e il coordinamento documentale della #48. **857 rimane soltanto il risultato della simulazione**, mai un preventivo del numero da importare. La suite aggiornata contiene 32 test sintetici, tutti superati; questi test non certificano i dati reali.

## Autorizzazione della fase successiva

Prima di importare realmente serviranno:

1. Conferma della finalità e dei campi da trasferire, negozio corretto e numero finale dopo tutti i controlli.
2. Approvazione del campione privato, delle esclusioni e del piano di accesso agli account; le password WooCommerce non sono trasferibili con questa procedura.
3. Nuovo codice di importazione revisionato, backup, registro dei profili creati e prova del piano di recupero. Gli script preparati oggi non includono il comando di importazione.
4. Autorizzazione esplicita a un piccolo lotto pilota, verifica del risultato e successiva decisione sui lotti restanti. Nessuna campagna marketing o invito account implicito.

## Se qualcosa non torna

Oggi non ci sono dati remoti da ripristinare. In una futura importazione si fermeranno immediatamente i lotti e si controlleranno i soli profili creati, usando il registro privato. Eventuali cancellazioni richiederanno una decisione specifica e la verifica che nel frattempo non siano comparsi nuovi ordini o modifiche. I clienti già presenti non dovranno essere cancellati o sovrascritti.

Il recupero non è sempre automatico: attività successive e comunicazioni già inviate non possono essere annullate con un semplice rollback. Il lotto pilota e la verifica prima di proseguire riducono questo rischio.
