# Online Garden — recupero clienti: guida per il proprietario

**13 novembre 2026 — preparazione offline. Nessun cliente importato o modificato.** Il lavoro è separato dal gestionale Admin, dalla PR #47 e dalle attività operative del sito.

## Cosa stiamo preparando

L'audit della [PR #48](https://github.com/Rosin355/your-e-commerce-blueprint/pull/48), consultabile nel [documento storico al commit originale](https://github.com/Rosin355/your-e-commerce-blueprint/blob/6deae03f46a89222f68037f33e28755df13f0cf7/docs/migration/legacy-customers-seo-2026-11-09.md), ha individuato 5.453 vecchi account, dei quali **858 con ordini**, per un totale storico di **953 ordini associati**. Il foglio selezionato da 1.108 righe contiene tutti gli 858 acquirenti. La prima fase riguarda soltanto questi account: gli altri non saranno importati automaticamente.

La #48 è ancora aperta e in bozza al 13/11/2026: l'audit non è ancora in `main`. Il collegamento sopra resta consultabile indipendentemente dal suo merge. La #53 prepara gli strumenti offline; il responsabile dovrà coordinare le due integrazioni e aggiornare i riferimenti quando l'audit sarà integrato. Questa attività non esegue alcun merge o deploy e non modifica la #48.

858 è il numero iniziale da verificare. Dopo esclusione delle utenze di servizio, controlli dei dati, duplicati e confronto con Shopify, il numero di nuovi profili potrebbe essere inferiore. I 953 ordini rimangono nell'archivio storico: questa procedura non li crea in Shopify e non modifica la spesa totale dei clienti.

## Protezioni predisposte

- Gli script non possono creare o aggiornare clienti Shopify: producono solo conteggi e motivi di blocco.
- Gli account amministratore/autore sono esclusi. Email duplicate e dati discordanti richiedono verifica privata. La nuova modalità email-only separa i telefoni nazionali dalle anomalie che bloccano l’identificazione; le collisioni dubbie restano bloccanti.
- Un cliente già presente su Shopify viene saltato, anche in caso di corrispondenza per telefono. Nessuna sovrascrittura automatica.
- Marketing email, SMS e WhatsApp restano disattivati. L'acquisto passato non costituisce consenso; eventuali prove documentali saranno valutate separatamente.
- Password, hash WordPress, sessioni e dati di sicurezza non entrano nel processo. Gli originali restano su Drive con accesso ristretto.
- Nessuna email, nome, numero di telefono o indirizzo cliente compare nel report GitHub. Non vengono inviate comunicazioni agli utenti.

## Risultato disponibile e limite attuale

I test usano **soltanto dati inventati**. Il [report strict precedente](customers-synthetic-dry-run.json) rimane una prova di regressione generica. Il [nuovo report email-only](customers-email-only-synthetic-dry-run.json) riproduce la distribuzione aggiornata: 858 account con ordini, dei quali 857 customer e un author escluso, 953 ordini, 12 clienti Shopify simulati e un match email. Le 856 righe residue sono **soltanto da revisionare**, con zero proposte di creazione. Nessuno dei due report certifica dati reali.

Per questo aggiornamento email-only non abbiamo acquisito file clienti privati o eseguito nuove letture live. Il precheck aggregato precedente è riportato sotto; non è un preflight privato con questa nuova modalità. Pertanto la qualità dei dati veri, i duplicati e il numero finale da creare restano da determinare. Un esito tecnico positivo non autorizza automaticamente l'importazione.

## Riscontro aggregato sulle fonti reali — 13 novembre 2026

Un controllo **soltanto in lettura**, effettuato sui campi necessari e senza salvare elenchi di clienti, ha confermato 858 account con ordini e 953 ordini storici. Tra i primi vi sono **857 customer e 1 author**: l'author è escluso, anche se ha acquistato. I 250 account senza ordini nella selezione sono **249 customer e 1 administrator**.

Il negozio Shopify Online Garden presenta **12 clienti totali** al momento del controllo (conteggio esatto); **11 hanno un'email**. Tra i 857 customer storici con ordini, **1 email risulta già presente** e **856 non corrispondono per email**. Questa verifica **non include una riconciliazione per telefono o un certificato di completezza dello snapshot** e non autorizza importazioni.

Fra gli 858 account storici con ordini, **768 recapiti telefonici non sono nel formato internazionale richiesto dal programma**; 90 sono in quel formato. Non è corretto aggiungere automaticamente un prefisso, cancellare il telefono o considerare tali account persi: la modalità email-only ora predisposta li valuta senza riscriverli, mantenendo obbligatoria la verifica privata. In sintesi, **856 non equivale al numero di nuovi clienti pronti da creare**.

Nessun dato personale è stato copiato su GitHub, nessun cliente o negozio è stato modificato e nessun import/deploy è stato avviato.

## Come funziona la nuova modalità email-only

Il developer deve selezionare esplicitamente `--email-only`; il programma conserva anche la modalità rigorosa precedente. Un telefono nazionale riconoscibile, oppure un telefono davvero assente, non esclude automaticamente un account con email valida. Il numero originale non viene cambiato, completato con prefissi, cancellato o esportato.

Il telefono continua però a servire come indizio contro i duplicati:

- Un numero internazionale uguale a quello di un solo cliente Shopify fa saltare il record, anche se quel cliente non ha email.
- Un numero nazionale simile a un recapito Shopify, un numero condiviso tra account o un conflitto tra la persona individuata dall'email e quella individuata dal telefono blocca il record per revisione privata. Nessuna unione automatica.
- Dati malformati, testo `null`, email/ID duplicati, ruoli non ammessi e anagrafiche discordanti continuano a richiedere correzione o chiarimento. Author e administrator sono sempre esclusi, anche se hanno ordini.

Il risultato positivo di questa analisi si chiama **“revisione privata richiesta”**: il comando restituisce codice 2 e il report non autorizza importazioni. Marketing email, SMS e WhatsApp restano disattivati.

La ricerca di somiglianze è prudente, ma non può dimostrare chi possiede un numero né rilevare ogni equivalenza fra formati. Alcuni blocchi potrebbero essere falsi allarmi; altri casi restano non verificabili se manca il telefono. Serve quindi una revisione riservata dei 12 clienti Shopify, incluso quello senza email, e dei casi legacy rilevanti. Non considerare le 856 email non abbinate come 856 clienti pronti da creare.

La fixture nuova assegna per scelta inventata un telefono nazionale all'author e usa 90 numeri internazionali/768 nazionali senza collisioni nello scenario base. Non sappiamo dal precheck quanti telefoni reali dei customer siano nazionali riconoscibili o problematici: quel dettaglio resta da verificare. I test separati introducono appositamente collisioni e casi errati.

## Cosa serve per il controllo reale

Il responsabile dei dati dovrà predisporre in un archivio privato, cifrato ed esterno a ogni repository:

1. **Anagrafica minima di Sheet2:** estrarre alla fonte ID storico, ruolo, email e il telefono originale approvato per il confronto; aggiungere soltanto gli altri campi opzionali necessari. Non togliere telefoni disponibili per evitare un controllo, né modificare i numeri. Conservare le 1.108 righe per verificare gli esclusi. Sheet2 **non contiene il numero degli ordini**.
2. **File separato ID/ordini:** dalla scheda originale estrarre soltanto `ID,orders`, senza scaricare l'intera scheda. Le 5.453 coppie minime consentono di verificare anche i record fuori Sheet2. Il programma collega i due file per ID, senza esportare un nuovo elenco clienti: ID duplicati, mancanti o contatori dubbi bloccano il confronto. Vanno riconfermati 858 account con ordini/953 ordini, distinguendo 857 clienti customer con ordini, un author con ordini (escluso), 249 clienti customer senza ordini e un administrator senza ordini. I 4.345 record fuori selezione non vengono proposti per l'importazione.
3. **Verifica privata dei casi dubbi:** non sostituire automaticamente il testo `null` con vuoto o zero e non aggiungere `+39` ai telefoni nazionali. I campi opzionali realmente vuoti restano assenti. In email-only un telefono nazionale riconoscibile è una segnalazione separata; `null`, dati malformati e collisioni bloccano il record. Conosciamo il totale di 768 telefoni non E.164, ma non la loro ripartizione finale per queste categorie.
4. **Snapshot Shopify completo e recente:** un operatore autorizzato verifica il negozio corretto, legge tutti i clienti senza filtri e segue tutte le pagine fino alla fine. Controlla ID univoci e conteggi esatti prima/dopo, quindi prepara solo `Email,Phone` e il manifest v2 descritto nel runbook. Non omettere clienti senza email: anche i record con solo telefono contano. Record senza entrambi o malformati richiedono una soluzione revisionata, non la loro cancellazione dal file.
5. **Evidenze riservate:** conservare data UTC di inizio/fine, controllo dei cursori e conteggi delle pagine, dominio, numero di clienti e checksum. All'esecuzione l'estrazione deve essere iniziata e terminata da non più di 24 ore. Una spunta `complete:true` o un checksum **non dimostrano da soli la completezza**: il developer controlla la coerenza locale, il responsabile verifica privatamente la fonte. L'assenza di variazioni di conteggio non garantisce che i recapiti non siano cambiati.

Non inviare schede complete, password/hash/sessioni, token, file minimizzati o tracce con ID/cursori in chat, ticket, PR o CI. Non usare il backup TAR. Questo aggiornamento del codice non esegue nuove estrazioni live; il precedente controllo read-only ha prodotto soltanto gli aggregati riportati sopra. Nel repository entrano soltanto fixture inventate, documentazione e conteggi aggregati.

Il developer eseguirà il confronto **offline con `--email-only`**, presenterà i conteggi aggregati distinti per ruoli, qualità telefonica ed esiti, e farà revisionare privatamente la coorte residua e i casi dubbi. Gli originali resteranno invariati; il report conterrà zero proposte di creazione e richiederà review anche in assenza di errori tecnici. Il dettaglio tecnico, incluso lo schema minimo, è nel [runbook developer](customers-offline-developer.md).

Restano da predisporre i CSV minimizzati reali, riconciliare le fonti, controllare privatamente telefoni e identità, costruire lo snapshot con manifest v2 e verificare le evidenze di copertura. La suite ora contiene **46 test sintetici superati**, compresi i 32 precedenti. I dati reali verificati restano: **857 customer con ordini, un match email e 856 senza match email**; l'author è escluso. Il nuovo report sintetico riporta 856 casi da revisionare per costruzione, non una previsione del risultato reale.

## Autorizzazione della fase successiva

Prima di importare realmente serviranno:

1. Conferma della finalità e dei campi da trasferire, negozio corretto e numero finale dopo tutti i controlli.
2. Approvazione del campione privato, delle esclusioni e del piano di accesso agli account; le password WooCommerce non sono trasferibili con questa procedura.
3. Nuovo codice di importazione revisionato, backup, registro dei profili creati e prova del piano di recupero. Gli script preparati oggi non includono il comando di importazione.
4. Autorizzazione esplicita a un piccolo lotto pilota, verifica del risultato e successiva decisione sui lotti restanti. Nessuna campagna marketing o invito account implicito.

## Se qualcosa non torna

Oggi non ci sono dati remoti da ripristinare. In una futura importazione si fermeranno immediatamente i lotti e si controlleranno i soli profili creati, usando il registro privato. Eventuali cancellazioni richiederanno una decisione specifica e la verifica che nel frattempo non siano comparsi nuovi ordini o modifiche. I clienti già presenti non dovranno essere cancellati o sovrascritti.

Il recupero non è sempre automatico: attività successive e comunicazioni già inviate non possono essere annullate con un semplice rollback. Il lotto pilota e la verifica prima di proseguire riducono questo rischio.
