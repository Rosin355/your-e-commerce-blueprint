# Online Garden · migrazione clienti e ordini del 20 novembre 2026

## Mandato archivio privato · 28 novembre 2026

La destinazione richiesta è esclusivamente l'archivio privato nel Lovable Cloud esistente: **nessun cliente WooCommerce va importato o associato a Shopify**. La ricostruzione di transazioni resta indisponibile; il contatore non è uno storico ordini. #84 `ce9514f` riconcilia 5.450 customer / 857 acquirenti / 952 acquisti dichiarati nelle prove precedenti. Oggi schema assente e 0 clienti importati; CSV originale non disponibile nel sandbox. Backup produttivo/recuperabilità e trattamento devono essere approvati nel verbale privato unico. La migrazione e il canale import della #84 richiedono compatibilità Cloud prima di applicazione; nessuna modifica automatica. [Vincoli, procedura e blocchi precisi](../release/CONSEGNA-FINALE-2026-11-28.md#6-archivio-privato-prerequisiti-ed-impedimenti-esatti). Le ipotesi di trasferimento/anagrafica Shopify sotto sono cronologia superata per il presente archivio. PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.

## Chiusura del ciclo · 21 novembre 2026

**`BLOCKED_SOURCE_UNAVAILABLE` — 0/953 ordini trasferiti.** Il proprietario ha confermato l’indisponibilità del vecchio WooCommerce. La parte leggibile del TAR troncato non contiene il database ordini. La ricerca si chiude qui. Si conservano privatamente i due CSV minimizzati e, per un eventuale futuro ritrovamento, il codice dell’importatore e il relativo journal. Il writer è rimasto inattivo.

Su 857 clienti storici con acquisti risultano **0 creati, 0 associati e 0 identità approvate**. I 14 profili Shopify censiti il 20/11 comprendono i profili nativi già esistenti. Fra i 857 record Woo risultano 848 candidati, 8 in quarantena e un match di email da confermare. Il solo ruolo author con acquisti, esterno alla coorte clienti, concorre al totale dei 953 con un ordine. I sette ordini già presenti su Shopify appartengono al nuovo canale. L’accesso volontario Shopify resta indipendente dalle liste storiche. [Esito dei controlli di rilascio](../release/SAL-2026-11-21.md).

## Risultati osservati il 20 novembre

| Indicatore | Evidenza |
| --- | --- |
| Fonte account | 5.453 contatori, 1.108 anagrafiche selezionate, 858 acquirenti, 953 ordini associati |
| Ruoli | 857 customer con acquisti. L’unico author con acquisti ha 1 ordine. Fuori dalla coorte ci sono 4.595 account senza ordini |
| Shopify al 20 novembre | 14 profili distinti, 12 con email e 2 senza. Conteggio EXACT prima e dopo, una pagina senza filtri fino alla fine |
| Riconciliazione dei 857 | 848 da revisionare, 8 in quarantena, 1 match email. Identità approvate per il trasferimento in questa sessione: 0 |
| Quarantene | 6 somiglianze telefoniche interne e 1 telefono malformato già osservati il 13/11. Si aggiunge 1 somiglianza telefonica con Shopify |
| Ordini | 0 transazioni storiche disponibili, 0 riconciliate individualmente, 0 importate su 953. I 7 ordini presenti in Shopify hanno date di novembre 2026, sorgente canale Shopify e nessun identificatore sorgente Woo |
| Effetti di questa esecuzione | 0 mutazioni clienti/ordini, 0 duplicati creati, addebiti, spedizioni, movimenti di stock o notifiche avviati |
| Accesso | Account Shopify di nuova generazione attivi. Modulo di login del negozio raggiunto in browser. Prova storico del cliente autenticato in produzione **BLOCKED** |
| Copertura transazionale effettiva | **0/953 = 0%**. Gli aggregati e il lavoro software hanno metriche distinte |

Sono stati riletti i due CSV privati Drive del preflight e riutilizzate le regole della #53 sullo snapshot aggiornato. L’esito aggregato è in [JSON](customers-reconciliation-2026-11-20.json). Il match per email evita una nuova creazione e richiede ancora una verifica indipendente per l’associazione. Un nuovo snapshot è obbligatorio al momento della scrittura perché i recapiti possono cambiare.

La ricerca ha coperto le cartelle Drive Onlinegarden e migrazione privata, gli archivi ed export locali identificati dal progetto, gli allegati di posta pertinenti individuabili per nome e i connettori commerciali già disponibili. L’integrazione Woo del repository ha un esempio di configurazione, senza un accesso legacy confermato. Il progetto Supabase configurato nel checkout non figura fra quelli visibili al relativo connettore. Il proprietario conferma di non disporre oggi di un export completo o di un accesso Woo verificato. Il TAR troncato della #48 è escluso. Le verifiche non stabiliscono che il fornitore hosting abbia perso il database.

## Controlli software eseguiti

TypeScript e build produzione superati. Risultano superati 20 test del protocollo e isolamento account, 46 del preflight recuperato, 18 del precedente modello pilota e 6 controlli mirati del nuovo importatore/estrattore. I nuovi controlli simulano una risposta persa dopo la creazione remota, l’assenza temporanea dai risultati di ricerca e la ripresa con un solo cliente e un solo ordine. Le operazioni Admin e Customer Account sono state validate contro lo schema 2026-10. Nessuna di queste prove attesta una transazione reale.

## Specifica d’archivio per un eventuale ritrovamento futuro

Questa specifica resta a disposizione per valutare un archivio che dovesse riemergere. Il formato di riferimento è un export privato ordine per ordine, preferibilmente WooCommerce REST v3 JSON, oppure un dump selettivo consistente convertibile nello stesso formato. Per stabilirne la provenienza occorrono negozio, intervallo, data di estrazione, fuso, valuta, revisione o checksum e versione Woo. L’originale resta cifrato con accesso limitato. Gli eventuali guest e gli ordini fuori dai 953 del censimento vanno identificati separatamente.

| Entità | Campi da recuperare dove presenti |
| --- | --- |
| Testata | ID immutabile, numero d’ordine visualizzato, ID account Woo, stato, date UTC di creazione, modifica, pagamento, completamento e annullamento, valuta, prezzi comprensivi di IVA |
| Righe | ID riga, ID prodotto/variante, descrizione e variante acquistata, SKU storico, quantità, unità di misura ove rilevante, prezzo dell’epoca, imponibile e IVA prima/dopo sconto, aliquote e arrotondamenti |
| Economia | Spedizione e metodo, imposte per riga e spedizione con ID, titolo e aliquota storica, coupon e allocazioni, fee, totale pagato e totale ordine, eventuali valute di presentazione |
| Pagamento ed evasione | Metodo, stato effettivo, importo e data incasso, accertamento del saldo, stato e data evasione, eventuali stati parziali e prove storiche. Se uno stato proviene da un plugin occorre la relativa estrazione selettiva |
| Eccezioni | Ogni rimborso con ID, data, importo, valuta, motivo, quantità e imposte per riga, eventuale cancellazione, note storiche pertinenti di ordine e assistenza |
| Identità e contatti | ID account, ruolo, email e telefono originali, nome e cognome, indirizzi storici di fatturazione e spedizione, collegamento stabile ordine → cliente. Un indirizzo attuale non sostituisce quello dell’ordine |

Un archivio **HPOS** completo comprende le tabelle Woo degli ordini, indirizzi, dati operativi, metadati pertinenti e righe. Per lo schema tradizionale servono i record ordine/rimborso di posts e i metadati pertinenti. In entrambi servono order items/itemmeta, note autorizzate e i dati delle aliquote storiche dove disponibili. La provenienza deve identificare l’archivio autorevole. Escludere hash WordPress, sessioni, chiavi ordine, dati carta, credenziali gateway e metadati plugin estranei. Per esportazioni SQL occorre verificare la corrispondenza campo per campo prima del caricamento.

[WooCommerce REST v3, ordini, note e rimborsi](https://woocommerce.github.io/woocommerce-rest-api-docs/#orders)

## Accesso clienti e rilascio

Il percorso predefinito di `/auth` e `/account` impiega l’URL ufficiale restituito da Shopify per questo negozio. Shopify gestisce OTP, callback, sessione, profilo, dettagli degli ordini e logout. Il vecchio client pubblico nel repository ha restituito HTTP 400 alla richiesta anonima con callback di produzione. L’account ospitato ha mostrato in browser il form corretto senza richiedere un OTP.

Il client SPA della branch `codex/shopify-customer-auth@36c75f7` è integrato per i canali con client pubblico registrato. Per usarlo configurare a build time `VITE_SHOPIFY_CUSTOMER_AUTH_ENABLED=true`, `VITE_SHOPIFY_CUSTOMER_STOREFRONT`, `VITE_SHOPIFY_CUSTOMER_ISSUER` e `VITE_SHOPIFY_CUSTOMER_CLIENT_ID`. Registrare presso Shopify l’origine HTTPS, `/account/callback` e il ritorno `/account/logout`. La discovery pubblica di Online Garden espone PKCE S256, firma RS256, refresh e Customer Account API 2026-10. I controlli verificano state, nonce, firma, issuer, audience, scadenza e identità Shopify prima di caricare lo storico paginato. Un ritorno in errore offre l’account ospitato. Il test privato del collegamento ordini richiede un’identità controllata e un ordine che le appartenga.

Supabase Auth è montato sulle route Admin. Il form staff conserva il recupero password e il pannello V2 verifica operatori e Admin tramite il contesto ruoli lato server. Solo le route staff e recupero possono consumare parametri di sessione Supabase. Il recupero password del personale ritorna a `/admin`. La vecchia Edge Function `get-customer-orders` nella PR risponde HTTP 410 senza interrogare Shopify. Il 21/11 il bundle pubblico contiene ancora la chiamata alla funzione. Il nuovo frontend può operare con la funzione remota precedente. Il Publish resta sospeso sul collaudo autenticato. Il ritiro dell’Edge richiede frontend sostituito, verifica del dominio pubblico e cessazione delle invocazioni dai vecchi client. Nessun deploy della 410 eseguito in questa attività.

## Procedura privata archiviata

Il runtime verificato è Node 22.22.3. Usare un’unica directory durevole esterna a Git, cifrata e privata (directory 0700, input 0600). I comandi seguenti usano la variabile di shell `OG_PRIVATE` per il percorso. I segreti provengono dal gestore già autorizzato. I file di esempio pubblici non sono approvazioni.

1. Riunire `sheet2-minimo.csv` e `id-orders.csv` con l’archivio `orders.json`, array delle transazioni Woo v3. Con accesso legacy si può eseguire `node sync/history/export-woo.mjs "$OG_PRIVATE"` con `WOOCOMMERCE_API_BASE` HTTPS terminante in `/wp-json/wc/v3`, consumer key e secret di sola lettura. L’estrattore verifica pagine, conteggio, univocità, revisioni, dettaglio rimborsi e copertura per acquirente. Registra gli ordini fuori coorte come conteggio separato. Pubblica il file privato soltanto dopo le verifiche. Conservare separatamente anche l’eventuale export originale del fornitore.
2. Eseguire `node sync/history/import.mjs prepare "$OG_PRIVATE"`. Il programma riconcilia tutti i 953 ID contro i conteggi per ID cliente e genera `review.json` con impronte e **zero approvazioni**. Dati assenti o contraddittori bloccano il relativo ordine. Un errore di censimento blocca tutto il caricamento.
3. Nel registro privato compilare `customers[ID]` con `action` (`create` o `existing`), `reviewer` ed `evidence` della titolarità verificata, inclusi recapiti alternativi e casi di email condivisa o riassegnata. Per `existing` servono anche `shopifyId` e `shopifyEvidence` indipendente. Ogni ordine deve avere billing email e telefono concordanti con l’account prescelto. Nessun prefisso viene dedotto. L’attestazione umana integra i controlli automatici. Occorrono verifiche e una procedura specifica per recuperare record che li falliscono.
4. Per `orders[ID]` compilare `financialStatus` e `fulfillmentStatus` con stati documentati, `evidence` con il riferimento privato alla fonte e l’eventuale `approvedNotes` con le sole note autorizzate presenti nella sorgente. Eseguire `node sync/history/import.mjs plan "$OG_PRIVATE"` con un token Admin offline già approvato in `SHOPIFY_ADMIN_ACCESS_TOKEN`. Il client verifica negozio, versione API effettiva, accesso ordini storici e riservatezza delle definizioni metafield. La modalità plan effettua letture remote e scrive le motivazioni locali in SQLite.
5. Registrare **una sola autorizzazione** in `authorization` con `shop`, `reference`, `archiveSha256`, `expiresAt` ISO UTC e lista `orderIds` di stringhe. Indicare `pilotOrderId` come stringa inclusa nella lista. In `checks` documentare i riscontri effettivi per `flow`, `messaging`, `logistics`, `invoicing`, `analytics`, `exclusiveWriter`. Registrare in `reviewSha256` l’impronta ottenuta con `node sync/history/import.mjs fingerprint "$OG_PRIVATE"` e associarla all’autorizzazione conservata dal responsabile. La selezione o la mappatura cambiata richiede un’autorizzazione coerente.
6. `node sync/history/import.mjs pilot "$OG_PRIVATE"` elabora un ordine autorizzato e al massimo il relativo cliente. Verificare stock, addebiti, ricevute cliente/staff, code Flow/Messaging/Sendcloud, fatture e assenza di spedizione fisica. Controllare in account con identità controllata sia la visibilità corretta sia l’isolamento di un secondo cliente. Riconciliare vendite/IVA/sconti nel periodo storico e l’eventuale registrazione dell’evento nel periodo corrente. Il token del connettore di questa sessione aveva gli scope necessari; non è esportato per il programma locale.
7. Registrare `pilotAcceptance` con `orderGid`, `archiveSha256` e riferimenti alle evidenze `stock`, `payments`, `notifications`, `fulfillment`, `customerVisibility`, `otherCustomerDenied`. `node sync/history/import.mjs batch "$OG_PRIVATE"` riprende soltanto la selezione autorizzata e verifica le scritture. Il registro privato `history.sqlite` contiene mapping cliente/ordine e motivazioni per ordine. Gli output pubblicabili sono solo aggregati.

## Fedeltà, effetti e ripresa

Il writer usa `customerCreate` per i profili mancanti verificati. I profili già presenti vengono collegati attraverso il GID dopo la revisione privata. Non invia password, consensi o inviti. Per gli ordini usa `orderCreate` con associazione per GID, data originaria in `processedAt`, numero identificabile, marker Woo, quantità, prezzi storici, imposte e spedizione. Shopify assegna il proprio ID e la data tecnica di creazione.

Il writer rappresenta nativamente importi EUR, quantità intere, aliquote e spedizione riconciliate, ordini pagati o pendenti ed evasi o inevasi documentati. Un coupon fisso riferito a una sola riga viene verificato al centesimo. Rimborsi, annullamenti, commissioni, sconti con allocazioni non rappresentabili, unità da arrotondare, altre valute e stati parziali vengono registrati con una causa specifica. Si estende il mapping sulla casistica reale prima di includerli. Nessuna operazione di incasso o rimborso viene usata per simulare uno stato storico.

Gli indirizzi originari sono conservati sul singolo ordine in metadati riservati perché i campi indirizzo nativi di `orderCreate` possono sostituire il predefinito del cliente. Gli articoli storici sono righe personalizzate con SKU, senza variante di magazzino, `requiresShipping=false`, inventory `BYPASS` e ricevute disabilitate. Il programma rilegge GID cliente, importi, date, stati, righe e metadati prima di chiudere il mapping.

Shopify può ricalcolare lo stato finanziario in caso di successive operazioni sull’ordine. I report di vendita possono incorporare i ricavi importati. I tag Woo e la data storica servono per attribuzione e controllo contabile. Flow, Messaging e Sendcloud risultano installati. Le regole effettive di queste app e dei sistemi di fatturazione non sono attestabili dal solo elenco: verificarle prima del pilota. I flag delle ricevute controllano le notifiche native coperte dalle opzioni di creazione. Il pilota resta indispensabile per gli effetti delle app.

SQLite prenota ogni ID con vincolo univoco e commit durevole prima della chiamata di rete. Dopo un timeout si ricerca il marker Shopify e si verifica il contenuto. Se la creazione è incerta e l’oggetto non è visibile, fermarsi e riconciliare privatamente il singolo intento anche dopo la finestra di indicizzazione. Conservare il journal con backup coerente e un solo writer per negozio. Non azzerare il journal per ritentare. Nessuna cancellazione o compensazione finanziaria automatica.

[Shopify Admin 2026-10, orderCreate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/orderCreate) · [Campi e comportamento indirizzi](https://shopify.dev/docs/api/admin-graphql/2026-10/input-objects/OrderCreateOrderInput) · [Shopify Customer Account API](https://shopify.dev/docs/api/customer/2026-10)
