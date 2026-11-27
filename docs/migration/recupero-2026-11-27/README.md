# Clienti storici e migrazione · 27 novembre 2026

**READY_FOR_APPROVAL per il progetto della pagina. Associazioni reali BLOCKED.** Stato progetto PENDING_CLIENT_ACCEPTANCE, SAL 57,75%.

## Registro privato e risultati

Lettura locale dell'export originario di febbraio e confronto con la pagina terminale Shopify del 27 novembre (17 GID distinti, conteggio EXACT). Sono stati controllati 5.453 ID Woo unici. Dei 5.450 customer, 5.444 non condividono l'email di account con Shopify, 4 hanno un candidato univoco per email e 2 richiedono verifica per email condivisa. Tre profili esclusi per ruolo. Zero associazioni di titolarità approvate. La ricerca copre l'email di account, quindi un indirizzo cambiato può impedire un riscontro. I controlli di quarantena telefonica già documentati il 20 novembre restano un'evidenza distinta, su una coorte diversa.

858 account hanno un contatore positivo, inclusi 857 customer. Somma dei contatori 953, di cui 952 riferiti a customer. Copertura transazionale documentata 0/953. Il numero di ordini Shopify non è stato acquisito per il nuovo dataset. [Storico del preflight e delle quarantene](../woocommerce-history-2026-11-20.md)

Il confronto usa email ripulite degli spazi esterni e in minuscolo, HMAC-SHA-256 con chiave monouso e controllo duplicati su entrambe le fonti. Nessun criterio fuzzy o match per nome. Lo script locale riceve CSV Woo, directory temporanea privata (key e shop.json, array di coppie GID/HMAC) e directory privata di destinazione. Scrive un nuovo file con soli ID Woo, conteggio, stato, flag duplicato, eventuale GID candidato e GID verificato nullo. Il censimento Shopify è una lista autonoma di GID. Gli ID sono dati personali pseudonimi. Output su filesystem locale fuori da sincronizzazione, directory 0700 e file 0600. Nessun log nominativo, recapito, hash WordPress, token di sessione, ruolo o consenso nel dataset. Accesso limitato all'incaricato. Titolare e incaricato devono definire conservazione e cancellazione prima dell'utilizzo operativo.

## Proposta Admin V2

Aprire il [prototipo locale con sette casi sintetici](proposta.html). Filtri combinabili, ricerca per ID, dashboard, elenco, export della selezione e audit dimostrativo. La riga Shopify nativa mostra il suo identificatore fonte, senza collegamento Woo. Il contatore Woo distingue zero e dato mancante. Il pannello di riepilogo conteggia separatamente le due popolazioni.

| Entità logica proposta | Chiave e attributi | Regola |
| --- | --- | --- |
| Account Woo | ID Woo, conteggio storico, idoneità derivata | Conservare la fonte e la data dello snapshot |
| Profilo Shopify | GID, data snapshot, eventuale numero ordini Shopify | Censire anche i profili senza riscontro Woo |
| Riconciliazione | ID Woo, GID candidato, GID verificato, stato, conflitto | Collegamento uno a uno solo dopo doppia prova indipendente di titolarità e revisione nominativa privata |
| Evento audit | ID evento, timestamp UTC, ID operatore, azione, esito, riferimento interno e quantità | Nessuna email, nessun termine di ricerca o contenuto esportato nei log |

La futura voce può estendere il visualizzatore staff esistente. Prima della lettura, ricerca, dettaglio, esportazione o decisione, il server deve verificare identità e ruolo admin con il controllo esistente. Un claim frontend o la sola visibilità del menu non autorizzano l'accesso. Negare agli operatori privi del ruolo/grant Admin, ai clienti storefront e agli anonimi anche via URL/API diretta. **Marco deve poter accedere alla stessa sezione del responsabile soltanto dopo aver verificato e autorizzato il suo ruolo/grant Admin effettivo**: il requisito funzionale del titolare non prova che i grant correnti siano già allineati. Non promuovere automaticamente il ruolo Editor e non ampliare permessi in questa PR. Esportazione limitata alle righe filtrate e ai campi consentiti, con motivazione, controllo server e registrazione dell'esito. I dettagli delle prove d'identità restano in area privata. La proposta usa uno schema logico senza DDL.

## Decisione di prodotto e perimetro operativo (27 novembre 2026)

- **Marco:** il titolare richiede parità di accesso amministrativo con il proprio account; l'implementazione deve verificare identità e grant lato server prima di concedere visibilità, ricerca, dettaglio o export. L'adeguamento dei grant, se necessario, richiede un'autorizzazione separata e test di non regressione.
- **Solo archivio WooCommerce:** non importare questi account in Shopify, non creare Customer Accounts, non migrare password o token. Gli eventuali 4 candidati per email rimangono *non verificati* e non autorizzano associazioni.
- **Stato attuale:** la PR contiene una dimostrazione offline con 7 record sintetici e nessuna route applicativa, schema DDL o import dati reali. **Non** descriverla come archivio consultabile in produzione.
- **Prossimo gate:** definire campi storici strettamente necessari (es. nome, email, telefono, città, contatore ordini), minimizzazione, base giuridica e tempi di conservazione con il titolare; preparare storage privato e backend Admin-only con audit effettivo; collaudare autorizzazione, paginazione, export e import idempotente su fixture prima di chiedere un GO distinto per scrittura nel DB di produzione. Il file originale con hash WordPress/token non deve essere consegnato a Git o ai log.

## Collaudo prima della fase operativa

Provare responsabile Admin, Marco con grant Admin verificato, Editor privo di grant, cliente autenticato e anonimo su elenco, dettaglio e download. Attesi 200 solo per identità Admin autorizzate e 401/403 per tutti gli altri, anche con ID e URL conosciuti. Finché Marco non ha un grant verificato, il suo accesso ai dati reali rimane bloccato. Provare ruolo revocato e sessione scaduta, export con zero righe, conflitti molti-a-uno, conteggio zero/nullo ed errore del servizio audit. Bloccare export e associazione se l'audit obbligatorio fallisce. Servono decisioni successive per autorizzazione operativa, custodia del dataset, audit persistente e rilascio. Il prototipo è fuori dalle route e usa esclusivamente fixture. Nessuna modifica ad applicazione, tabelle, RLS o ruoli.
