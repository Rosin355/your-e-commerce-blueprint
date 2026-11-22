# Consegna finale Online Garden · 22 novembre 2026

## A. Storico WooCommerce

**LEGACY_PURCHASE_COUNTS_ARCHIVED = PASS.** Il registro definitivo è un database SQLite privato. Per ognuno degli 858 account con acquisti sono stati confrontati ID originale, ruolo e numero di acquisti con entrambi i CSV. La somma riletta dal database e dalla vista destinata al personale è 953. Un secondo caricamento con le medesime fonti ha restituito `ALREADY_ARCHIVED`. Il journal contiene una sola acquisizione. Il controllo di integrità SQLite è superato. La copia in Google Drive è nella stessa cartella privata delle fonti, con il solo proprietario. Riletta dopo il caricamento, ha la stessa impronta SHA-256 del database sul Mac.

| Indicatore | Risultato |
|---|---:|
| Account caricati / account con acquisti | **858 / 858** |
| Acquisti rappresentati dalla somma dei contatori | **953 / 953** |
| Account con ruolo cliente | 857 |
| Candidati alla verifica individuale | 848 |
| Casi in quarantena | 8 |
| Corrispondenze email sospese | 1 |
| Autori separati | 1, con 1 acquisto |
| Associazioni Shopify verificate e registrate | **0** |
| Ordini Woo individuali disponibili / ordini Shopify importati | **0 / 0** |

**LEGACY_INDIVIDUAL_ORDERS = SOURCE_UNAVAILABLE.** Il committente ha chiuso definitivamente il recupero delle transazioni. Prodotti, importi, date e pagamenti dei singoli ordini non sono ricavabili dai contatori.

**Consultazione disponibile sul Mac.** L’operatore autorizzato apre *Consulta storico.html* e seleziona *conteggi.json* nella cartella privata *Online Garden / Storico WooCommerce* di Application Support. Può filtrare per ID Woo o stato e leggere il conteggio. Il visualizzatore è stato aperto con il registro autentico in Chromium offline. I filtri hanno restituito 8 quarantene, 1 autore, 1 corrispondenza email e 0 verificati, con zero richieste HTTP. Il database e la vista contengono identificativi, ruoli, conteggi e stato della verifica. I contatti usati nel preflight sono esclusi. La copia SQLite su Drive permette il ripristino della vista in caso di perdita del dispositivo. Chi accede a questi file deve essere un incaricato autorizzato.

**Consultazione staff predisposta per il sito.** La route aggiuntiva `/admin/storico-acquisti` usa la sessione esistente e il ruolo amministratore o amministratore tecnico. L’operatore seleziona un file privato sul proprio dispositivo. La lettura avviene in un frame a origine isolata e senza rete. Nel collaudo, ospite ed editor non hanno avuto accesso. I Customer Accounts non mostrano conteggi. Nessuna tabella o migrazione SQL in produzione, nessun dato incorporato nel frontend e nessuna modifica ai flussi di Admin V2 r2. Il rischio principale è la consegna del file a una persona non autorizzata. [Operazioni, verifiche delle identità e ripristino](../migration/woocommerce-history-2026-11-20.md#registro-definitivo-dei-conteggi)

## B. Spedizioni

**BLOCKED.** Confermato il piano Grow. Nell’elenco dei negozi accessibili alla sessione staff manca *Online Garden Shipping Test*. La connessione non consente di leggere le personalizzazioni delle consegne. Il campione pubblico di riferimento resta **42/69**. Per Portoferraio, Lido di Venezia, Pellestrina, Capri, Ischia, Procida, Ponza, Ventotene e Isole Tremiti risultano **27 scostamenti** nei tre carrelli A, B e misto. Nel checkout di Portoferraio sono stati letti 8,90 / 5,90 / 11,90 € dove il listino prevede 9,60 / 6,90 / 12,50 €. Il modello è già a 69/69. Non è stata ripetuta la matrice. Costo incrementale sostenuto **0 €**. La preparazione tecnica è conclusa fino all’accesso Dev. Per l’eventuale rilascio servono due opzioni prezzate nel negozio di prova, singola tariffa acquistabile, wallet, CAP condivisi ed eccezioni del vettore. Ripristino tramite disattivazione del selettore e configurazione salvata. [Matrice e checkout](SHIPPING-MINOR-ISLANDS-DECISION-2026-11-22.md)

## C. Visitor Analytics e consenso

| Controllo | Stato | Riscontro |
|---|---|---|
| `VISITOR_ANALYTICS_DISABLED` | **PENDING** | Nell’ultimo riscontro diretto sul progetto Lovable Online Garden risultano attivi Visitor Analytics, clic e Project monitoring. Fra i progetti accessibili è stato identificato solo quello pubblicato con la configurazione del negozio. La finestra per disattivare la sola Visitor Analytics attende autorizzazione. |
| `CONSENT_BEFORE_TRACKING_VERIFIED` | **BLOCKED** | Nel nuovo controllo, una sessione pulita ha ricevuto HTTP 202 a un evento Lovable in home prima di una scelta. La soppressione isolata del solo script ha già portato gli eventi osservati a zero, mantenendo il carrello, il checkout, l’ingresso clienti e il login staff. Resta il collaudo dell’interruttore reale e della sessione staff autenticata. |
| `SHOPIFY_PIXELS_REVIEWED` | **BLOCKED** | L’Admin nativo ha rifiutato l’accesso alla pagina Eventi cliente. Mancano gli scope per pixel e impostazioni privacy. Occorre inventariare pixel app e personalizzati, finalità e regioni del banner, inclusi gli strumenti del checkout. |

La procedura prevede la fotografia dei valori iniziali, disattivazione di Visitor Analytics, profili puliti desktop e Safari/iPhone ove disponibile, controllo rete prima di ogni scelta e prova carrello/checkout/account/sessione staff. Project monitoring è un controllo distinto. Se restano tecnologie facoltative, il blocco deve precedere la loro iniezione, anche sul checkout. Occorre provare rifiuto, consenso per finalità e revoca. Per un ripristino che riavvii la raccolta serve una decisione esplicita. [Inventario e criteri di accettazione](../legal/CANDIDATE-COOKIES-2026-11-22.md) · [Comando Lovable](https://docs.lovable.dev/features/analytics#enable-or-disable-visitor-analytics)

## D. Cinque informative

**5 candidate revisione 3, 0 approvate, 0 pubblicate nella nuova revisione.** Aggiornati i file originari. I Termini precisano gli ordini consultabili nel nuovo account. La Privacy descrive il registro aggregato e la provenienza dei dati. Per le Spedizioni è stata corretta la tabella delle fasce A e verificata la tabella B. I Resi richiedono una valutazione concreta della deperibilità della singola tipologia. La Cookie Policy descrive la richiesta pre-consenso osservata. Ricalcolate le cinque impronte SHA-256.

La sola policy rilevata via Shopify Admin è la Privacy italiana del 30 ottobre. Nel collaudo pubblico il link del footer raggiunge la risorsa, che risponde HTTP 200, e il checkout ospite apre il dialogo italiano. Il test si è fermato prima dell’ordine. Dopo la firma delle versioni definitive si potranno aggiornare i quattro spazi policy nativi e una pagina Cookie collegata dove manca un tipo dedicato. Prima del cambio salvare corpi e collegamenti esistenti, da ripristinare in caso di errore. [Manifesto delle candidate](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md#pacchetto-candidato-del-22-novembre-revisione-3)

## E. GitHub e produzione

Base `5e4f7a7`, successiva alla PR #67. Codice e cinque testi al commit `0e474b7`. [PR #68 e verbale di merge](https://github.com/Rosin355/your-e-commerce-blueprint/pull/68) Il branch `codex/consegna-registro-acquisti` contiene importatore offline, journal, consultazione protetta e collaudi sintetici. Il database e i file del personale rimangono fuori dal repository. Il controllo separato sui dati reali ha confrontato tutte le righe con i due CSV, verificato il replay e la copia privata. I test automatici coprono integrità, identità, replay, conflitti, isolamento dei ruoli e lettura del file senza trasmissione al sito. Il verbale della PR riporta i commit integrati, i controlli CI e il riscontro del bundle pubblico dopo il merge.

Il registro locale è operativo. Il Publish della pagina web richiede autorizzazione. L’operazione non crea clienti Shopify, ordini, spedizioni, movimenti di magazzino o pagamenti e non attiva notifiche. Nessun cambiamento a Sendcloud o ai servizi DNS.

## F. SAL

**SAL iniziale e ufficiale 57,75%.** La nuova funzione di conservazione aggregata raggiunge **100%, 858/858 account e 953/953 conteggi**. Non esiste un peso autonomo per tale funzione nella griglia originaria. Rimane registrata come consegna completata, separata dalla voce ponderata delle transazioni WooCommerce, con zero ordini individuali importati. [SAL e pesi originali](SAL-2026-11-21.md)

## G. Decisioni residue per Marco

| Ambito | Unico riscontro o intervento necessario | Effetto autorizzabile |
|---|---|---|
| Spedizioni | Il proprietario del Dev concede all’identità tecnica accesso al solo *Online Garden Shipping Test* per gestire spedizioni, tariffe e personalizzazioni. Fornire copertura contrattuale del vettore con CAP, località, alias ed eccezioni. | Collaudo Dev a costo incrementale zero. Solo dopo matrice positiva e snapshot, firma della precisa configurazione per il checkout pubblico. |
| Analytics e pixel | Concordare finestra, operatore e condizione di ripristino per la sola Visitor Analytics. Abilitare la lettura staff delle schermate Shopify *Eventi cliente* e *Privacy dei clienti*, oppure fornire l’inventario con stato, finalità e regioni. | Disattivazione delle nuove misurazioni Lovable, verifica dei servizi residui e dei percorsi reali. Il consenso è accettabile solo dopo prova di rete. |
| Termini e Spedizioni | Confermare recapito telefonico destinato al pubblico, messaggio che conclude il contratto e contenuto della conferma durevole, eventuale ADR applicabile. Indicare tempi di preparazione e transito, copertura e limiti del vettore. | Integrazione dei due testi con dati commerciali verificati. |
| Resi | Indicare destinatario e indirizzo fisico, chi paga il reso per ripensamento, costo o stima dei beni non restituibili per posta, eventuali articoli rapidamente deperibili e relativa motivazione. Collaudare il recesso elettronico con ricevuta per ospiti e clienti. | Informazioni di reso coerenti e distinte dalla garanzia per difetti. |
| Privacy e Cookie | Confermare finalità, basi, fornitori/ruoli, accessi, conservazione, trasferimenti e marketing per i servizi effettivi, incluso l’archivio aggregato. Dopo il collaudo del consenso approvare ciascuna versione finale o il pacchetto con le cinque impronte. | Pubblicazione delle sole versioni firmate e successivo collaudo del footer e del checkout. |
| Registro staff | Il visualizzatore locale è già disponibile. Per rendere raggiungibile la nuova pagina web approvare il Publish del commit collaudato. Per un eventuale singolo collegamento documentare in privato la titolarità indipendente di entrambe le identità e il mandato. | L’eventuale Publish abilita il lettore staff. L’eventuale decisione su un’identità aggiorna solo il registro privato. |

L’archiviazione dei conteggi è conclusa. La chiusura della ricerca delle singole transazioni è definitiva.


## Verifica indipendente del backup privato (22/11/2026)

Riletta direttamente una copia SQLite del registro aggregato sul Drive collegato, senza divulgare identificativi o contatti di singole persone. Controllo in **sola lettura**:

- File: `Registro-acquisti-aggregati-2026-11-22.sqlite`, 69.632 byte; SHA-256 della copia Drive verificata: `1c0211570f34196e995da5c4a75c5ad57fa979919391b15860b5e21da2d66282`.
- `PRAGMA integrity_check`: `ok`.
- Tabella `accounts`: **858 righe**, totale `SUM(purchases)` **953**. Ruoli: **857 customer (952 acquisti)**, **1 author (1 acquisto)**.
- `assessment`: **848 candidate**, **8 quarantine**, **1 email_review**, **1 author**.
- `verified_links`: **0**; metadati singoli dell'archiviazione: **1**.
- Il file non contiene ordini transazionali con articoli, prezzi o date; **0 ordini WooCommerce importati** in Shopify. Nessun dato di riga o backup contenente identificatori personali è stato aggiunto al repository.
- Questo controllo conferma il contenuto della copia disponibile su Drive, ma **non costituisce una seconda verifica dell'uguaglianza col file privato sul Mac**, attestata nel verbale precedente.

**Conseguenze per la consegna:** `LEGACY_PURCHASE_COUNTS_ARCHIVED=PASS`; la route riservata `/admin/storico-acquisti` è pronta su `main` ma non ancora pubblicata. Pubblicazione, collegamenti identità e dati cliente restano soggetti ai rispettivi controlli di autorizzazione. SAL ponderata originaria invariata: **57,75%**.
