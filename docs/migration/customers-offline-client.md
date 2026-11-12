# Online Garden — recupero clienti: guida per il proprietario

**12 novembre 2026 — preparazione offline. Nessun cliente importato o modificato.** Il lavoro è separato dal gestionale Admin, dalla PR #47 e dalle attività operative del sito.

## Cosa stiamo preparando

L'audit della [PR #48](https://github.com/Rosin355/your-e-commerce-blueprint/pull/48) ha individuato 5.453 vecchi account, dei quali **858 con ordini**, per un totale storico di **953 ordini associati**. Il foglio selezionato da 1.108 righe contiene tutti gli 858 acquirenti. La prima fase riguarda soltanto questi account: gli altri non saranno importati automaticamente.

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

Il responsabile dei dati dovrà predisporre, in un archivio privato esterno a GitHub, una copia con i soli campi necessari. Non inviare la scheda completa con password/hash/sessioni in chat, ticket o PR. Occorre inoltre un elenco completo e recente dei clienti Shopify, con email e telefono, e attestazione del negozio e della data di estrazione.

Il developer eseguirà il confronto **offline**, presenterà i conteggi aggregati e farà revisionare privatamente un campione e i casi dubbi. Il dettaglio tecnico, incluso lo schema minimo, è nel [runbook developer](customers-offline-developer.md).

## Autorizzazione della fase successiva

Prima di importare realmente serviranno:

1. Conferma della finalità e dei campi da trasferire, negozio corretto e numero finale dopo tutti i controlli.
2. Approvazione del campione privato, delle esclusioni e del piano di accesso agli account; le password WooCommerce non sono trasferibili con questa procedura.
3. Nuovo codice di importazione revisionato, backup, registro dei profili creati e prova del piano di recupero. Gli script preparati oggi non includono il comando di importazione.
4. Autorizzazione esplicita a un piccolo lotto pilota, verifica del risultato e successiva decisione sui lotti restanti. Nessuna campagna marketing o invito account implicito.

## Se qualcosa non torna

Oggi non ci sono dati remoti da ripristinare. In una futura importazione si fermeranno immediatamente i lotti e si controlleranno i soli profili creati, usando il registro privato. Eventuali cancellazioni richiederanno una decisione specifica e la verifica che nel frattempo non siano comparsi nuovi ordini o modifiche. I clienti già presenti non dovranno essere cancellati o sovrascritti.

Il recupero non è sempre automatico: attività successive e comunicazioni già inviate non possono essere annullate con un semplice rollback. Il lotto pilota e la verifica prima di proseguire riducono questo rischio.
