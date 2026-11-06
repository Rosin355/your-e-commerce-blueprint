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
