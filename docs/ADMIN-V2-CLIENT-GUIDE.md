# Admin Online Garden — guida cliente

**Stato al 12 novembre 2026:** il tuo account esistente è verificato e ha ricevuto i permessi per lavorare sul catalogo. L'abilitazione delle funzioni sul servizio è ancora da completare: sincronizzazione, invio delle nuove bozze e categorie non sono ancora confermati disponibili. **Account configurato; accesso dalla tua sessione non ancora verificato.** Non occorre registrarsi di nuovo. Le istruzioni qui sotto descrivono il percorso previsto; usa soltanto le azioni disponibili, senza aggirare eventuali blocchi. Il prodotto tecnico di collaudo resta escluso dalla pubblicazione.

1. **Accedi con il tuo account già verificato.** Apri https://onlinegarden.it/admin e usa le tue credenziali nella tua sessione personale. Se serve, accedi da https://onlinegarden.it/auth e poi riapri l’Admin. In Impostazioni verifica i permessi del tuo account. Non condividere password o codici e non creare un secondo account. Un accesso Shopify non attribuisce automaticamente accesso all’Admin.
2. **Cerca e modifica.** In Prodotti cerca lo SKU o il nome e apri la scheda corretta. Usa Modifica soltanto sui campi disponibili. Salva nell’Admin; il salvataggio non modifica automaticamente Shopify. Se i dati sono cambiati, ricarica e confronta prima di confermare.
3. **Sincronizza esplicitamente.** Confronta il valore Shopify live e usa Sincronizza sul singolo campo. Conferma l’operazione e attendi la verifica. Per i prezzi apri Prezzi e formati, modifica gli importi delle varianti interessate e usa Conferma e sincronizza prezzi. SKU e inventario non vengono cambiati.
4. **Crea una bozza.** Apri Nuovo prodotto; inserisci titolo, SKU univoci, dati reali, varianti/formati e prezzi consentiti. Le informazioni botaniche e SEO si compilano manualmente, senza dati inventati. Verifica l’anteprima, conferma i dati e salva la bozza nell’Admin. Apri la scheda salvata per ritrovarla. Usa poi Crea bozza Shopify: il prodotto resta DRAFT, non pubblicato.
5. **Carica immagini dal computer.** Nel passaggio Immagini e formati scegli un JPEG o PNG fino a 5 MB, inserisci un testo alternativo e premi Carica immagine. Attendi che l’immagine appaia disponibile; puoi anche scegliere fra le tue immagini già caricate. Non occorre incollare URL. Rimuovi dalla bozza non elimina il file dalla libreria.
6. **Scegli la categoria.** Seleziona una collezione editoriale verificata nell’elenco. È possibile salvare la bozza senza categoria. Nella scheda, Categorie editoriali permette una scelta esplicita e mantiene le altre associazioni protette. Le categorie interne storiche possono restare da classificare: non sostituire una categoria ambigua con un nome simile. Le categorie editoriali non cambiano le classi di spedizione.
7. **Pubblica separatamente.** Quando il prodotto reale è pronto, usa Verifica pubblicazione. Il sistema controlla dati, immagine disponibile, varianti, classe A/B e canale del sito. Conferma solo dati reali e premi Pubblica sul sito. Se è esaurito, serve una conferma aggiuntiva; nessuna quantità viene inventata. ACTIVE da solo non prova visibilità: attendi la conferma di lettura sul sito. Il prodotto tecnico di collaudo non può essere pubblicato.
8. **Gestisci un esito incerto.** Non ricompilare lo stesso prodotto e non creare un nuovo SKU per ritentare. Usa la stessa richiesta di salvataggio o Recupera stato senza ricreare. Se compare Da riconciliare, conserva la scheda e segnala l’operazione. Per un conflitto confronta i dati aggiornati; non sovrascrivere modifiche recenti.

Le conferme delle normali operazioni vengono registrate dall’Admin: non devi richiedere un’autorizzazione tecnica per ogni prodotto. Il ruolo cliente comprende solo le operazioni catalogo assegnate; pagamenti, spedizioni, Sendcloud, inventario, clienti, ordini e amministrazione generale restano fuori da questo flusso. La pubblicazione di un prodotto commerciale non è stata provata durante il collaudo tecnico.

## Accettazione da completare

- [x] Account esistente e verifica email ricontrollati; permessi catalogo assegnati.
- [ ] Accesso dalla tua sessione personale e disponibilità effettiva delle funzioni.
- [ ] Ricerca, apertura prodotto e comprensione di salvataggio/sincronizzazione.
- [ ] Bozza unica con immagine, salvataggio e rilettura, recupero senza duplicati.
- [ ] Categoria verificata o bozza volutamente da classificare.
- [ ] Controllo desktop/mobile; Safari/iOS resta da attestare su dispositivo reale.
- [ ] Pubblicazione di un prodotto reale solo su incarico esplicito, mai sul DRAFT tecnico.

<details>
<summary>Cronologia delle guide precedenti — non descrive l’abilitazione corrente</summary>

**Stato al 10 novembre 2026:** l’interfaccia `admin-delivery-20261110-r1` è pubblicata su https://onlinegarden.it/admin; migration e backend sono distribuiti. Il collaudo tecnico ha verificato immagine, bozza unica, collegamento DRAFT Shopify e modifica/sync di una descrizione SEO. È stata distribuita anche la protezione che conserva e verifica insieme titolo e descrizione SEO, con test automatici e CI positivi. Il prodotto tecnico è rimasto non pubblicato. La registrazione del tuo account è stata rinviata: la tua sessione e le tue capability non sono ancora abilitate o collaudate. Le istruzioni sotto valgono dopo tale abilitazione; il solo Publish non la assegna.

## Decisione finale per Marco — 9 novembre 2026

Il catalogo resta consultabile. Le funzioni del Livello B sono predisposte nel codice, ma **non ancora attivate**: mancano una prova reale di recupero e la conferma del tuo account e del prodotto DRAFT autorizzato. Il proprietario deve restituire un’unica scheda decisione; il consenso generale non basta ad accendere le scritture.

Per confermare l’accesso usa personalmente `https://onlinegarden.it/admin/settings`, con il tuo account e un profilo browser dedicato. Il proprietario conferma privatamente che sia l’account concordato; il tecnico legge soltanto i ruoli e lo stato delle capability della tua sessione. Non condividere password, token o schermate con dati personali. Un accesso negato viene registrato e non provoca assegnazioni automatiche di ruoli. Le 22 scelte categorie restano aperte. [Scheda definitiva](ADMIN-V2-ACTIVATION-RUNBOOK.md).

# Aggiornamento per Marco — 9 novembre 2026

**Oggi puoi ancora consultare il catalogo. Il Livello B è pronto nel codice, ma modifiche, bozze e categorie non sono attivate sul sito.** Non occorre ripetere i controlli già svolti o creare altri ambienti. Prima dell'attivazione servono recupero dei dati dimostrato, conferma del tuo account/ruolo e approvazione del prodotto di prova.

Dopo l'attivazione autorizzata, il percorso sarà Prodotti → scheda → Modifica del campo consentito → Salva e rilettura. Il salvataggio interno non sincronizza automaticamente Shopify. Nuovo prodotto apre il modulo guidato già predisposto; l'invio crea solo una DRAFT e non la pubblica. Un errore incerto richiede il recupero della stessa operazione, senza reinserire il prodotto. I pulsanti dipendono dal tuo ruolo; un editor non riceve automaticamente invio Shopify o gestione delle associazioni categorie.

Per il primo collaudo il server ammetterà soltanto lo SKU/operazione approvati e rifiuterà gli altri prodotti. Non devi configurare ID o strumenti: il responsabile prepara il change. Non riceverai privilegi aggiuntivi automaticamente.

**Categorie: 22 decisioni ancora da esprimere.** Usa la [tabella unica per Marco](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md): per ciascuna riga indica la proposta, l'alternativa o “mantieni senza associazione”; aggiungi data e conferma commerciale. Le 13 corrispondenze tecniche non sono approvazioni. Le categorie senza associazione restano leggibili con il motivo del blocco; non saranno collegate automaticamente. Le scelte commerciali e la loro applicazione tecnica sono fasi distinte.

Il titolare può usare la [scheda unica di attivazione](ADMIN-V2-ACTIVATION-RUNBOOK.md). Il ripristino non è ancora dimostrato: la sola esistenza di snapshot non autorizza ad accendere le scritture. Nessun export completo contenente dati personali è richiesto. GSC, analisi 404 e redirect 301 rimangono attività successive.

---

## Archivio precedente al completamento tecnico del 9 novembre

Le sezioni sottostanti conservano le evidenze storiche. Per stato, sequenza e autorizzazioni vigenti prevale la sezione del 9 novembre sopra. I riferimenti a staging aggiuntivo, export completo o applicazione della patch differita non sono istruzioni attuali.

# Guida rapida per Marco — disponibile oggi, in sola lettura

Il pannello è pronto per **consultare** il catalogo. Non è ancora abilitato a modificare o pubblicare prodotti.

1. Apri [Admin Online Garden](https://onlinegarden.it/admin) e accedi con il tuo account abituale, se già autorizzato. Se l'accesso è negato, segnala il problema al proprietario: non devi configurare strumenti o permessi. L'accesso personale di Marco non è ancora stato attestato dal team.
2. **Dashboard:** consulta il riepilogo del catalogo. I conteggi interni non sono una certificazione delle pubblicazioni Shopify.
3. **Prodotti:** cerca per nome o, per individuare un prodotto preciso, usa il suo codice SKU. Puoi usare il tipo prodotto e il filtro dei valori da verificare. Usa Pagina successiva/precedente per gli altri risultati: il numero mostrato riguarda la pagina corrente.
4. **Dettaglio:** apri il prodotto e consulta le sezioni e lo storico esistente. “Sincronizzazione non verificata” significa che manca uno storico interno certo, non che il prodotto sia assente dal negozio.
5. **Funzioni disabilitate:** Modifica, salvataggio, nuove bozze/recupero, categorie e sincronizzazione richiedono un'attivazione separata. Anche i filtri avanzati categoria/completezza/sincronizzazione/non classificati sono disabilitati: non dipende da una tua operazione errata. Non usare strumenti tecnici alternativi e non reinserire prodotti per aggirare il blocco.
6. **Categorie:** nella [scheda unica delle 22 decisioni](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md) scegli la proposta commerciale, un'alternativa indicata oppure lascia la categoria senza associazione. Nessuna scelta è già approvata e la scheda non applica modifiche. Non devi verificare ID o configurare Shopify.

Non sono richiesti nuovi test o attività tecniche al cliente. La checklist UI/UX e le istruzioni future restano conservate sotto: le voci di modifica/salvataggio/canary non sono da eseguire ora. Stato consegna: **Livello A disponibile agli account autorizzati; Livello B non operativo.**

---

## Recovery: protezione dei dati prima di ogni attivazione

Non verrà richiesto un export completo contenente account o password. La consultazione resta disponibile; modifiche, bozze e categorie non sono attivate. Il piano distingue il ripristino di strutture di prova dal recupero dei dati reali: una prova parziale non viene presentata come recupero completo. Non cambia alcun permesso o dato del catalogo.

## Attivazione futura: cosa cambia per Marco

La consultazione già pubblicata rimane disponibile; non sono state abilitate modifiche, nuove bozze o assegnazioni categorie. Il responsabile deve prima rendere verificabile il recupero del database e autorizzare separatamente la migrazione e le capability necessarie. Non occorre creare nuovi progetti.

Il tuo account e ruolo devono essere verificati prima di cambiare permessi; non riceverai automaticamente privilegi amministrativi. Le categorie non approvate restano escluse: [le 22 decisioni sono raccolte in un'unica tabella](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md). La guida e la checklist sotto restano valide per le rispettive fasi; non effettuare prove di scrittura adesso.

# Admin Online Garden — versione pubblicata il 6 novembre 2026

**Puoi consultare il catalogo:** dashboard, ricerca per nome o SKU, pagine dei risultati e schede prodotto. Il controllo dopo la pubblicazione ha confermato il caricamento e la navigazione.

**Le modifiche sono disabilitate.** Salvataggio, sincronizzazione Shopify, nuove bozze, recupero bozze, AI e assegnazione categorie non sono attivi. I filtri avanzati non ancora supportati mostrano il motivo del blocco. Aprire una pagina non disponibile non modifica alcun dato.

Accedi con l'account già assegnato dal responsabile: questo rilascio non aggiunge permessi. L'accesso personale di Marco deve ancora essere confermato. Non usare gli strumenti tecnici per aggirare un blocco.

Le istruzioni operative e la checklist conservate sotto descrivono anche funzioni future: le prove di modifica non sono da svolgere ora. Il responsabile dovrà autorizzare separatamente la loro attivazione. [Stato tecnico e registrazione del rilascio](ADMIN-V2-QA-REPORT.md).

## Versione consegnabile ora: consultazione del catalogo

Puoi usare dashboard, ricerca per nome/SKU, tipo prodotto, paginazione e apertura della scheda con i dati già disponibili. La versione è **in sola lettura**: nessun salvataggio, sincronizzazione, generazione AI, nuova bozza o assegnazione categoria. Le funzioni non operative spiegano il motivo; aprirle non modifica dati.

I filtri categoria, completezza e sincronizzazione sono disabilitati perché richiedono un aggiornamento separato del servizio. Non indicano una mancanza del prodotto o della categoria. La ricerca usa il servizio attuale: per identificare un prodotto preferire lo SKU preciso. La checklist sotto è conservata: le prove di scrittura A–I non sono da svolgere ora. Le autorizzazioni del tuo account restano quelle assegnate dal responsabile; la pubblicazione frontend non assegna nuovi permessi.

Le istruzioni di modifica/bozze nelle sezioni storiche descrivono la fase futura, non funzioni abilitate da questo rilascio. La conferma della pubblicazione effettiva si trova nel registro della PR #42.

## Aggiornamento per Marco — cosa significano le azioni bloccate

Le azioni “Crea bozza Shopify” e “Recupera stato senza ricreare”, quando esiste una bozza interna o un'operazione incerta, ora restano visibili ma disabilitate con una spiegazione se manca l'abilitazione del server. Questo non indica una creazione fallita e non richiede di reinserire lo stesso prodotto. Il recupero serve a verificare la stessa operazione: non crea una seconda bozza.

Se un campo richiede assistenza o una categoria non ha una corrispondenza approvata, segnalarlo al responsabile senza usare funzioni tecniche alternative. La Preview del progetto usa il database operativo: non è un posto sicuro dove fare modifiche di prova.

Consultazione disponibile, scritture e sincronizzazione ancora OFF. Rimangono da svolgere con il proprio account la checklist sotto e la prova Safari; i risultati locali simulati non sono accettazione cliente.

# Admin Online Garden — guida per Marco e accettazione

Stato 6 novembre 2026: consultazione verificata; **modifiche e sincronizzazione sono disabilitate**. Nuove bozze/categorie non ancora rilasciate: manca il collaudo staging, il canary autorizzato e l'approvazione finale. Non richiedere l'attivazione generale per provare un pulsante.

## Uso quotidiano

1. **Accesso:** aprire https://onlinegarden.it/admin con l'account assegnato. Non condividere password o codici; per accesso negato contattare il responsabile. Il ruolo Shopify non garantisce accesso al gestionale.
2. **Ricerca:** aprire Prodotti, cercare nome o SKU e aprire la scheda. Dopo il rilascio della correzione #42, i filtri vengono applicati all'intero catalogo; il numero mostrato indica i risultati di questa pagina. È possibile filtrare categoria, tipo, completamento e sincronizzazione; la disponibilità non è promessa da questo pannello.
3. **Modifica:** verificare SKU e prodotto prima di operare. Solo i campi abilitati sono modificabili; inventario e campi di sistema restano fuori da questo flusso. Un pulsante disabilitato indica una protezione o una funzione non ancora attivata. Al momento le modifiche non sono abilitate.
4. **Salvataggio, dopo attivazione controllata:** salvare il campo consentito e attendere l'esito. Il salvataggio interno non aggiorna da solo Shopify. In caso di conflitto, ricaricare, confrontare il valore e ripetere solo la modifica voluta; non sovrascrivere il lavoro altrui alla cieca.
5. **Sincronizzazione, se autorizzata:** usare l'azione esplicita per il campo supportato e verificare l'esito. Non attiva automaticamente tutti i campi o la pubblicazione del prodotto. Un blocco richiede correzione/approvazione, non tentativi ripetuti.
6. **Nuova bozza, dopo attivazione:** inserire SKU univoco, dati consentiti e Formato (una opzione, massimo 50 varianti). Controllare anteprima, salvare internamente e inviare come DRAFT solo se consentito. Il DRAFT non va pubblicato durante il collaudo. Se l'invio ha esito incerto, usare il recupero della stessa operazione quando disponibile: non creare un secondo prodotto.
7. **Categorie:** usare soltanto categorie con associazione approvata. Anteprima, conferma e rilettura fanno parte del flusso; Annulla non deve salvare. Oggi i mapping approvati sono zero: una categoria non disponibile va segnalata, non sostituita con un nome simile.
8. **Varianti:** verificare ogni SKU/Formato e il legame con il prodotto. Non cambiare o separare prodotti per aggirare i controlli logistici. Prezzi/inventario non si inventano e una variante non diventa un nuovo prodotto automaticamente.

## Stati e problemi frequenti

| Messaggio | Significato / azione |
|---|---|
| Completo / Da completare | Completezza editoriale minima; non certifica disponibilità commerciale. |
| Da verificare / Da classificare | Serve revisione del contenuto / classificazione approvata. |
| Aggiornato | Esito positivo registrato della sincronizzazione; non prova di pubblicazione su tutti i canali. |
| Sincronizzazione non verificata | Manca uno storico interno certo; non significa che il prodotto sia assente da Shopify. |
| Sincronizzazione in attesa / Errore | Attendere o leggere il messaggio; segnalare SKU e operazione senza credenziali. |
| Modifiche temporaneamente disabilitate | Protezione attiva: consultazione disponibile, scrittura non consentita. |
| Categoria/storico non disponibile | Mapping o backend non ancora attivati; chiedere assistenza, non duplicare. |
| Operazione da riconciliare | Attendere verifica/recupero della stessa operazione prima di riprovare la creazione. |

Non gestire da questi flussi pagamenti, tariffe di spedizione, Sendcloud, redirect, permessi, credenziali o flag tecnici. Le vecchie funzioni tecniche non sono strumenti di lavoro quotidiano del cliente.

## Checklist cliente e designer (da compilare insieme)

Le prove locali simulate non sostituiscono questa accettazione. Stato iniziale: tutte le voci seguenti **da eseguire con Marco**; scritture B–I solo dopo staging e autorizzazione del canary DRAFT.

- [ ] A. Account/ruolo Marco verificato; cercare SKU e nome, aprire il prodotto corretto.
- [ ] B–D. Sul solo canary approvato, modificare un campo consentito, salvare e rileggere lo stato senza perdita di dati.
- [ ] E. Sincronizzare il solo campo autorizzato, se previsto dal ruolo; rileggere Shopify, senza pubblicare.
- [ ] F. Salvare e inviare una bozza autorizzata; recovery senza duplicazione se l'esito è incerto.
- [ ] G. Assegnare categoria già approvata: Annulla non scrive, Conferma aggiorna una sola volta.
- [ ] H. Controllare SKU, Formato e relazione delle varianti; campi vietati restano bloccati.
- [ ] I. Provare un conflitto controllato e comprendere come ricaricare/recuperare.
- [ ] Designer: desktop 1440, tablet 768, mobile 390 e 320 px, nessun overflow o contenuto irraggiungibile.
- [ ] Tastiera: menu, filtri, pulsanti e conferme raggiungibili con focus visibile; uscita sicura da dialog/conferme.
- [ ] Stati caricamento/vuoto/successo/errore e funzioni disabilitate comprensibili senza JSON o ID tecnici inutili.
- [ ] Safari/iOS reale o WebKit funzionante; il crash locale del 6 novembre non è un PASS.

Registrare data, dispositivo, ruolo, SKU canary e risultato; segnalare solo informazioni necessarie, senza dati personali o secret. Il responsabile tecnico autorizza il passaggio al gate successivo, non la selezione casuale di altri prodotti.

</details>
