# Online Garden — preflight clienti offline (13 novembre 2026)

**Stato: preparazione tecnica, nessuna importazione autorizzata.** Questa procedura è separata dalle operazioni Admin, dalla PR #47 e dai gate runtime. Non interagisce con Supabase, Lovable, Shopify, Drive o servizi di marketing. Non richiede credenziali.

## Evidenza e limiti

Fonte: [PR #48](https://github.com/Rosin355/your-e-commerce-blueprint/pull/48) e [audit storico al commit immutabile `6deae03`](https://github.com/Rosin355/your-e-commerce-blueprint/blob/6deae03f46a89222f68037f33e28755df13f0cf7/docs/migration/legacy-customers-seo-2026-11-09.md). Il 13/11/2026 la #48 risulta ancora **aperta e draft**, non integrata in `main`. Il link al commit resta navigabile anche se il file manca nel checkout della #53 o il branch viene eliminato. Il tooling parte dalla `main` remota `b5f3793` e non richiede il codice della #48 per funzionare; i conteggi storici restano evidenze di quell'audit, da riconciliare privatamente.

Il precedente aggiornamento risponde ai quattro punti della [review della PR #53](https://github.com/Rosin355/your-e-commerce-blueprint/pull/53#pullrequestreview-5880356904): estrazione e join minimizzati, qualità dei recapiti, copertura Shopify e coordinamento documentale. Non sono stati eseguiti merge o deploy.

L'audit documenta 5.453 account, 858 account con ordini e 953 ordini associati. Il sottoinsieme di 1.108 righe contiene tutti gli 858 account con ordini. Una rilettura aggregata del 13/11/2026 ha corretto la distribuzione dei ruoli: **857 account con ruolo customer e ordini, 1 con ruolo author e ordini; 249 customer senza ordini e 1 administrator senza ordini**. I 858 non sono quindi tutti candidati all'import. Le metriche sono contatori storici, non ordini Shopify, clienti guest o consensi marketing.

**In questo aggiornamento email-only non sono stati acquisiti né aperti file clienti privati.** Il precheck aggregato già documentato sotto proviene dalla precedente verifica autorizzata in sola lettura. Non sono disponibili in questa copia di lavoro un CSV minimizzato verificato e uno snapshot Shopify recente. Il report pubblicato è interamente sintetico: riproduce le dimensioni documentate, ma non prova la qualità dei dati reali né il numero finale da creare.

## Tentativo di avvio del preflight privato — 13/11/2026: fermato prima della CLI

**Esito: INPUT PRIVATI NON REPERITI; PREFLIGHT REALE NON ESEGUITO.** Verifica documentale sul [precheck reale](customers-live-precheck-2026-11-13.md), introdotto dal commit `e58f69a`, e sul relativo commento della PR #53. Nessuna nuova lettura live di Google Sheets/Shopify e nessun accesso a workbook, password, hash o sessioni.

Il precheck distingue 857 customer con ordini e un author escluso (858 account/953 ordini), 12 clienti Shopify/11 email, un match email customer, sei customer coinvolti in somiglianze telefoniche **interne legacy**, un telefono malformato e zero match/somiglianze telefoniche verso Shopify. Sui soli 857 customer: 90 E.164, 766 nazionali riconoscibili, un malformato, zero assenti. Sono dati già osservati nel precheck, non misure ripetute oggi con la CLI. I sei casi non sono sei duplicati confermati né necessariamente sei coppie. Il residuo esplorativo di 849 non certifica clienti importabili.

La ricerca ha enumerato soltanto nomi di file mirati nelle aree di lavoro autorizzate: checkout originale, copia isolata della PR, area temporanea consultabile e workspace visualizzazioni. Non ha letto il contenuto di CSV clienti. Una parte dell'area temporanea di sessione non è interamente consultabile: non si attesta l'assenza globale sul computer né si estende la ricerca ad archivi privati non indicati.

| Prerequisito | Evidenza di questa verifica |
| --- | --- |
| `sheet2-minimo.csv` | Non reperito nelle aree consultabili |
| `id-orders.csv` | Non reperito nelle aree consultabili |
| Snapshot Shopify `Email,Phone` e manifest v2 | Nessun insieme di input disponibile attestato; validazione non eseguita, controllo interrotto per i due input mancanti |
| Provenienza/revisioni, SHA-256, copertura, età e riservatezza degli input | Non verificabili senza il pacchetto privato |
| CLI email-only e report aggregato reale | Non eseguiti/non prodotto |

Nessuna fixture è stata eseguita o usata in sostituzione dei dati reali in questo tentativo. I report sintetici e i test documentati nelle sezioni successive rimangono evidenze del precedente sviluppo; l'eventuale CI di questa modifica documentale verifica il codice, non i dati reali. Non viene fabbricato un report CLI con i conteggi del precheck.

### Preparazione privata necessaria prima di riprendere

1. **Responsabile dei dati:** predisporre una directory su archivio cifrato, esterna a ogni repository e alla CI, con accesso nominativo, directory `0700` e file `0600`. Verificare proprietario, ACL/condivisioni e conservazione; i permessi POSIX da soli non attestano cifratura. Rendere disponibili all'operatore soltanto il percorso autorizzato e i file minimizzati, senza allegarli a chat/PR/ticket.
2. **Sorgente legacy:** tramite lettura selettiva alla fonte, preparare `sheet2-minimo.csv` con `ID,role,email,billing_phone` originali (1.108 righe attese), più gli eventuali campi opzionali approvati. Preparare separatamente `id-orders.csv` con **sole** colonne `ID,orders` (5.453 coppie attese). Usare revisioni e ordinamento coerenti alla fonte; registrare privatamente revisioni/date, intervalli e operatore. Non scaricare workbook completi per ripulirli dopo; non leggere `user_pass`/`session_tokens`. Non cambiare telefoni, null o contatori, non togliere l'author dalla fonte per far tornare gli esiti: sarà escluso dallo script. Il join è per ID, mai per posizione/email.
3. **Responsabile Shopify:** predisporre `shopify-minimo.csv`, colonne esatte `Email,Phone`, includendo tutti i profili, anche quello senza email. La lettura completa e autorizzata deve registrare negozio, inizio/fine UTC, conteggio EXACT prima/dopo, ID distinti e catena di tutte le pagine fino a `hasNextPage=false`. Conservare ID/cursori soltanto nella prova privata. I 12 profili sono il dato storico del precheck, non un numero da forzare in un nuovo export.
4. **Manifest v2:** compilare `snapshot.json` con le chiavi del contratto riportato sotto, conteggi coerenti e SHA-256 dei byte finali del CSV. Inizio e termine devono essere entro 24 ore al momento dell'esecuzione; negozio e `--shop` devono coincidere. Calcolare anche i digest dei due input legacy nel registro di provenienza privato, confrontandoli con quelli consegnati dall'estrattore: la CLI non ne riceve né certifica il manifest di provenienza. Non pubblicare digest o percorsi privati. Un manifest compilato non sostituisce la verifica della fonte e delle pagine.
5. **Operatore del preflight:** verificare prima disponibilità di tutti e quattro i file, schema minimizzato, autorizzazione/provenienza, integrità, età, copertura e riservatezza. Se uno manca o non è verificabile, fermarsi nuovamente. Soltanto dopo questi controlli eseguire il comando seguente dalla copia aggiornata della branch della PR #53, sostituendo i percorsi d'esempio. Il comando non è stato eseguito in questo tentativo.

```sh
node --require ./ci/offline-network.cjs ./sync/customers-convert.mjs --email-only \
  --input /archivio-privato/sheet2-minimo.csv \
  --orders /archivio-privato/id-orders.csv \
  --snapshot /archivio-privato/shopify-minimo.csv \
  --snapshot-metadata /archivio-privato/snapshot.json \
  --shop ecom-blueprint-gen-6ud1s.myshopify.com \
  --report /archivio-privato/preflight-reale-email-only-nuovo.json
```

Il dominio proviene dal precheck, da riconfermare nelle evidenze private del nuovo snapshot. Il guard Node blocca chiamate di rete accidentali, ma non è un sandbox OS. Non aggiungere `--synthetic` o variabili di credenziali. L'output richiesto è solo aggregato e il file report deve essere nuovo; nessun CSV importabile.

Dopo un'esecuzione reale, verificare `dataKind: private-unverified` (designazione intenzionale della provenienza non certificabile dal programma), `assessmentMode: email-only`, `proposedNew: 0`, `productionAuthorized: false`, `privateIdentityReviewRequired: true` e marketing disattivato. Atteso exit 2 sia con `BLOCKED` sia con `OFFLINE_EMAIL_ONLY_REVIEW_REQUIRED`; distinguere le cause nel JSON e non dichiarare completata la review solo perché il processo è terminato. Non pretendere 849 o 856 candidati: gli esiti effettivi devono derivare dai file e possono cambiare.

**Prima del pilota:** verificare privatamente i sei sospetti e il telefono malformato, riconciliare le eventuali nuove anomalie e le identità rispetto ai profili Shopify (incluso quello senza email), approvare finalità/campi e piano di accesso clienti. Servono inoltre un writer separato revisionato, ricontrollo aggiornato delle collisioni, backup/journal, prova di recupero e autorizzazione puntuale. Questo blocco documentale non autorizza alcuna creazione, invio, importazione o modifica ai provider.

## Analisi degli script precedenti e decisione

| Script precedente | Rischio rilevato | Comportamento dopo questa PR |
| --- | --- | --- |
| `customers-convert.mjs` | Caricamento `.env`, CSV importabile generato implicitamente, nessuna coorte/ruolo/deduplica, `email` non supportata | Preflight senza rete, solo report aggregato; nessun file clienti |
| `customers-sync-shopify.mjs` | Write predefinita, lookup non verificato `first:1`, aggiornamento profili esistenti, email ed errori API nei log | Stesso preflight offline; client e mutazioni rimossi |

È una **rottura intenzionale della compatibilità operativa**: variabili `WOO_CUSTOMERS_CSV_PATH`, `SHOPIFY_*`, `CUSTOMER_SYNC_LIMIT` e `SHOPIFY_CUSTOMERS_CSV_OUTPUT` non sono lette. `--write`, `--apply`, `--execute`, flag sconosciuti e argomenti duplicati falliscono prima della lettura degli input. Senza input esplicito il comando fallisce, senza scrivere. Nessun flag sblocca le importazioni.

Il parser clienti è dedicato: non modifica `sync/lib/csv-utils.mjs` o le pipeline catalogo/prodotti. Non viene creato un payload PII recuperabile dal report. Il futuro esportatore/importatore dovrà essere implementato e revisionato separatamente.

### Precheck aggregato su fonti reali, sola lettura (13/11/2026)

- Fonte storica: range minimizzati letti da Google Sheets con accesso autorizzato; nessun download dell'intero workbook, nessun export o file PII creato.
- Riconciliazione per ID: **1.108 account selezionati, 858 con ordini, somma 953**; ruoli degli account con ordini: **857 customer + 1 author**. Nella selezione, i 250 account senza ordini sono **249 customer + 1 administrator**. Il ruolo author va escluso anche se `orders > 0`.
- Shopify connesso verificato come Online Garden: `customersCount(limit:null)` = **12, precision EXACT**; elenco read-only di **12 clienti**, **11 con email** e **1 senza email**.
- Sovrapposizione sulle email (normalizzazione trim/lowercase): **1 match** tra i 857 customer con ordini; **856 customer con ordini senza match email**. L'author con ordini non corrisponde a un'email Shopify. Non sono stati verificati match telefonici o di identità, né eseguito un preflight conforme al manifest v2.
- Qualità telefoni nella coorte di 858 account con ordini: **90 in formato internazionale E.164**, **768 non in E.164**, **0 vuoti**. Nella modalità strict questi 768 formati attiverebbero il controllo telefonico sulle righe che arrivano alla validazione dopo gli scarti per ruolo. In email-only la loro classificazione dipende dalla sintassi effettiva e dalle collisioni: il dato aggregato non dimostra che siano tutti telefoni nazionali utilizzabili. Non anteporre automaticamente `+39`, non sovrascrivere né scartare dati senza una decisione approvata.
- Nessun dato personale, email, telefono, ID cliente, checksum o manifest privato è stato pubblicato. Nessuna API di scrittura chiamata, nessuna modifica Shopify/Drive, nessun import, merge o deploy.
- **Interpretazione:** 856 è un numero di *customer* senza match email, **non** il numero finale di importabili. Mancano convalida completa dello snapshot, confronto telefonico/identitario, schema minimizzato definitivo, review delle anomalie e autorizzazione.
- **Decisione implementata in questo aggiornamento:** modalità opt-in `--email-only`, fixture con author avente ordini e totali 858/953 invariati, nessuna riscrittura dei telefoni. La revisione privata dei 12 profili Shopify e degli account legacy resta necessaria; nessun preflight reale è stato eseguito con questa modalità.

## Contratto della copia di lavoro privata

Un operatore autorizzato deve preparare una **copia minimizzata**, esterna a qualsiasi checkout Git, dal foglio Drive corretto. Non scaricare o passare allo script la scheda originale con `user_pass`, `session_tokens` o altri segreti. Non usare il TAR troncato. Non includere il file nei log, allegati PR, CI o ticket.

### Estrazione privata di Sheet2 e join con il contatore ordini

`Sheet2` contiene 1.108 account ma **non contiene `orders`**. Il contatore va letto nella scheda originale `onlinegardecustomer`; non può essere ricostruito dall'email, dalla posizione della riga o dalla presenza in Sheet2. Procedura da predisporre alla fonte, senza scaricare il workbook:

1. Il responsabile apre il documento originale con accesso ristretto e identifica le due schede. Legge soltanto le intestazioni e registra in un manifest **privato** revisioni/date, intervalli esatti, mappatura intestazioni e operatore. I nomi reali delle colonne vanno verificati; non presumere coordinate fisse. Assicurare una revisione stabile durante entrambe le estrazioni, senza ordinamenti o modifiche concorrenti.
2. Da `Sheet2` estrarre **solo** `ID`, `role` ed `email` nel file `sheet2-minimo.csv`. Per email-only includere `billing_phone` originale se disponibile e approvato per il confronto; non omettere numeri disponibili per evitare collisioni. Aggiungere soltanto gli altri campi opzionali della tabella sotto effettivamente approvati e necessari. Preservare tutte le 1.108 righe, comprese quelle senza ordini e le utenze di servizio, per rendere verificabili gli scarti. Non esportare fogli interi per eliminare le colonne in seguito.
3. Dalla scheda originale estrarre **esclusivamente** le colonne `ID` e `orders` nel file `id-orders.csv`, mantenendo l'associazione della stessa riga alla fonte. L'estrattore deve richiedere soltanto i due intervalli di colonna autorizzati: niente lettura dell'intero range, XLSX/TAR/ZIP o CSV originale. Il contratto preferito include tutte le 5.453 coppie minimizzate per controllare anche l'assenza di acquirenti fuori Sheet2. Copiare separatamente colonne dopo ordinamenti diversi compromette il join: in quel caso fermarsi e ripetere l'estrazione coerente.
4. Esportare i due risultati già minimizzati in UTF-8, virgola, quoting standard, mantenendo ID come testo e `orders` come intero esplicito. Conservare `null` letterali e vuoti per la review: non convertirli in `0`, stringa vuota o telefono dedotto. Non inserire formule nel CSV. Tenere file e manifest fuori da Git, directory `0700` e file `0600`, in archivio cifrato con accesso nominativo; nessun contenuto o URL privato in log/conversazioni/CI.
5. Passare i due file al preflight con `--input .../sheet2-minimo.csv --orders .../id-orders.csv`. Il join avviene **in memoria** sull'ID storico esatto (intero positivo testuale, senza zeri iniziali); `customer_id` è un alias ammesso, ma nei due file di join deve esserci una sola colonna identificativa. Nessun CSV combinato viene scritto. Un `orders` già presente nell'anagrafica insieme a `--orders` viene rifiutato: non esistono priorità implicite tra due contatori.
6. Revisionare gli aggregati `extraction`: 1.108 selezionati/abbinati, 5.453 coppie ordini, 4.345 coppie esterne alla selezione e **zero acquirenti fuori selezione**, se l'audit è riconfermato. `orderSourceBuyers/orderSourceHistoricalOrders` e `observed.accountsWithOrders/historicalOrders` devono riconciliare entrambi **858/953**, prima degli scarti. I 4.345 fuori selezione non sono proposte di importazione; l'audit li distingue in 4.344 clienti senza ordini e una utenza non cliente, ma il file ID/orders non ne attesta il ruolo.
7. Ogni match assente, ID invalido/duplicato in uno dei due file, contatore invalido o acquirente esterno blocca il join (`SOURCE_JOIN_REQUIRES_REVIEW`), azzera `proposedNew` e mantiene le altre righe valide in `unmatchedAwaitingSourceReview`. Non fare somme dei duplicati, non scegliere la prima riga e non usare `IFERROR(...,0)`. Registrare solo conteggi nel report pubblico; i casi per ID restano nella review privata alla fonte.

Sono attesi nella selezione 858 account con ordini (857 customer, 1 author), 249 customer senza ordini e 1 administrator senza ordini. I relativi `outcomes` restano disgiunti; eventuali differenze vanno spiegate, mai corrette artificialmente per raggiungere i totali. È ancora accettato un CSV già unito con `orders`, riportato come `extraction.mode: prejoined-input`: in tal caso lo script **non verifica il join originario** e l'operatore deve conservarne privatamente la prova. Non fornire Sheet2 senza `orders` omettendo `--orders`.

CSV UTF-8, virgola, BOM opzionale, quoting CSV standard; intestazioni case-insensitive, univoche; larghezza costante. File regolari fino a 32 MiB, nessun symlink finale. Il parser rifiuta colonne sconosciute, duplicati, byte invalidi e quoting ambiguo. Non corregge silenziosamente input malformati. Il rifiuto di un file non è uno strumento per ripulire archivi con segreti: la minimizzazione deve avvenire **prima**.

| Campi ammessi | Regola |
| --- | --- |
| `ID` o `customer_id` | ID storico obbligatorio, intero positivo, univoco; mai nel report |
| `role` o `roles` | Obbligatorio; solo `customer` passa; `administrator`/`author` sempre esclusi anche insieme ad altri ruoli |
| `orders` | Obbligatorio nel CSV già unito o nel secondo file `--orders`; intero non negativo, selezione `> 0` |
| `email`, `user_email`, `billing_email` | Almeno una colonna; trim e lowercase; valori non vuoti multipli devono concordare |
| `first_name`, `last_name`, `billing_first_name`, `billing_last_name` | Opzionali; alias discordanti richiedono revisione, nessuna priorità arbitraria |
| `billing_phone` | Opzionale; originale conservato. Strict richiede E.164 se presente; email-only separa formato nazionale, assenza, dati malformati e collisioni. Separatori eliminati solo nelle chiavi di confronto in memoria, mai nel file; nessun prefisso dedotto |
| `billing_company`, `billing_address_1`, `billing_address_2`, `billing_city`, `billing_state`, `billing_country`, `billing_postcode` | Opzionali; se un indirizzo è presente servono via, città, paese ISO alpha-2 e CAP; per IT, CAP di 5 cifre e provincia eventuale di 2 lettere |

Non sono ammessi note libere, password, hash, token, sessioni, capacità WP, dati fiscali o consensi. Testo anagrafico massimo 255 caratteri, senza controlli o prefissi formula. La verifica indirizzi è **strutturale**, non certifica recapito, provincia effettiva o corrispondenza CAP/città; email sintatticamente valida non prova titolarità o deliverability. Non normalizzare punti/alias `+` o domini di provider per fondere persone diverse.

Le colonne reali della fonte vanno ancora verificate: non si presume che i nomi nel contratto coincidano con ogni scheda Drive. Ogni adattamento di schema va revisionato con fixture sintetiche.

### Valori null, vuoti e telefoni nazionali

- Un campo opzionale realmente vuoto rimane assente. ID, ruolo, email e contatore ordini mancanti non diventano valori validi. Un indirizzo parziale continua a richiedere revisione.
- Il testo esatto `null`, con spazi esterni rimossi e senza distinzione maiuscole/minuscole, **non è equiparato a vuoto**: su un acquirente impedisce una proposta, anche se compare in nome, azienda o indirizzo opzionale. Non scartare un alias `null` a favore di un altro alias valido. Anche un valore potenzialmente legittimo omonimo richiede verifica privata; non viene riscritto automaticamente.
- `333…`, `0039…`, testi o numeri malformati non diventano `+39…`; il paese dell'indirizzo non autorizza a dedurre il prefisso. Si rimuovono solo separatori visuali da numeri già esplicitamente internazionali. La sintassi E.164 non certifica l'esistenza o la titolarità del numero.
- `sourceQuality` distingue righe con `null` nell'intera selezione, acquirenti con `null`, acquirenti con telefono non E.164 (escluso il segnaposto `null`) e acquirenti con telefono vuoto. Sono conteggi **prima degli scarti per ruolo**: non si sommano tra loro e non stimano automaticamente clienti recuperabili. `reasons.nullLiteral/nonE164Phone/invalidPhone` descrivono invece le cause di quarantena delle righe arrivate ai controlli anagrafici, con possibili sovrapposizioni. In email-only un formato nazionale riconoscibile non incrementa le cause invalidPhone/nonE164Phone; i suoi eventuali conflitti telefonici hanno cause dedicate.

Il primo precheck ha misurato 768 telefoni non E.164 e 90 E.164 su tutti gli 858 account con ordini. Il [precheck esplorativo successivo](customers-live-precheck-2026-11-13.md) dettaglia, sui soli 857 customer, 90 E.164, 766 nazionali riconoscibili, un malformato e sei customer coinvolti in somiglianze interne. Non è ancora una classificazione prodotta dal preflight CLI con input e manifest verificati. Gli originali non vengono modificati, cancellati o completati: eventuali correzioni richiedono un processo distinto con evidenze e responsabilità, mai un bypass della quarantena.

### Regole di classificazione

1. Riconciliare righe con `orders > 0` e somma ordini con **858 e 953**, prima degli scarti; un mismatch blocca. Sono controlli aritmetici, non una certificazione della provenienza.
2. Escludere amministratori/autori, ruoli diversi e account senza ordini. Ruoli sconosciuti e mancanti richiedono review; nessuna seconda/terza coorte automatica.
3. Quarantena per ID invalido/duplicato, email invalida/discordante/duplicata o anagrafica incompleta/ambigua. Strict mantiene il blocco per telefono non E.164; email-only applica la matrice telefonica sotto. Duplicati E.164 restano bloccanti in entrambe le modalità. Tutte le righe con la stessa email sono scartate dalla proposta: **nessun vincitore arbitrario**. Le collisioni includono anche le righe fuori coorte e lo staff per evitare aggiramenti. Non sommare gli ordini dei duplicati.
4. Se lo snapshot è valido, saltare i profili con email già presente; saltare anche i match per telefono. Non aggiornare nomi, indirizzi, tag o consensi esistenti. Le collisioni da risolvere richiedono review privata, non un merge automatico.
5. Senza snapshot valido, tutti i candidati rimangono `unmatchedAwaitingSnapshot`, mai `proposedNew`.
6. Marketing email, SMS e WhatsApp sempre disattivato per i nuovi profili. Nessun acquisto, ruolo, presenza email o selezione in Sheet2 vale come opt-in. Un eventuale consenso con prova esplicita, aggiornata e verificabile per canale richiederà un processo separato; questo preflight non offre override.

Gli `outcomes` sono categorie disgiunte e sommano alle righe sorgente; i `reasons` possono sovrapporsi sulla stessa riga. `proposedNew` significa solo proposta offline strict dopo controlli, mai creazione effettuata. In email-only è sempre zero: le righe residue si contano solo in `emailOnlyReviewCandidates`. Gli esclusi privilegiati/non acquirenti non sono errori da recuperare automaticamente. Eventuali esclusioni tra gli 858 devono essere spiegate nella review finale.

## Modalità prudente email-only — opt-in del 13/11/2026

`--email-only` valuta account identificabili tramite email senza trasformare automaticamente un telefono nazionale opzionale in un errore di identità. **Non significa ignorare il telefono**, né trasformare tutte le righe senza match email in profili importabili. Senza flag resta attiva la modalità `strict` precedente; non esiste fallback automatico.

I dati originali, inclusi telefoni, spazi e prefissi, restano nei file privati invariati byte per byte. Le chiavi numeriche sono derivate **solo in memoria per cercare collisioni**: non vengono salvate, esportate o usate per produrre un numero corretto. Non viene aggiunto `+39` o altro prefisso, né convertito un numero `00...` in `+...`. Per tutta la modalità `phoneExportAllowed: false`; anche un eventuale futuro esportatore email-only dovrà omettere il telefono con decisione separata, preservando l'originale nell'archivio privato.

| Caso sulla riga customer con ordini | Trattamento email-only |
| --- | --- |
| Telefono realmente assente | Nessun errore di formato; conteggio qualità separato, verifica telefonica non possibile |
| Sequenza nazionale riconoscibile, senza collisioni rilevate | Segnalazione qualità, non quarantena per il solo formato; resta candidato a review privata |
| Testo `null`, formato malformato, formula, controlli o numero troppo corto | Quarantena; non viene trasformato in assenza |
| Telefono E.164 uguale a un solo profilo Shopify | Skip, anche se il profilo Shopify non ha email; nessun aggiornamento |
| E.164 ripetuto tra account legacy | Quarantena dei customer coinvolti; nessun vincitore |
| Somiglianza nazionale/internazionale o numero nazionale condiviso | Quarantena per identità dubbia, sia contro la fonte sia contro Shopify |
| E.164 condiviso da più profili Shopify | Quarantena della riga legacy, non scelta del primo profilo |
| Email associata al profilo Shopify A e telefono al profilo B | Quarantena per conflitto di identità |
| Email già presente senza altri conflitti | Skip; nessuna modifica al profilo o ai consensi esistenti |

Una sequenza nazionale riconoscibile contiene solo cifre e separatori visuali (spazi, parentesi, punti, trattini), 7–15 cifre, oppure `00` seguito da 7–15 cifre. È una categoria tecnica **non una validazione del piano telefonico nazionale**. Valori più corti/lunghi o testi inattesi restano bloccanti. Zeri iniziali non rimossi.

Le somiglianze si valutano conservativamente: se almeno uno dei due numeri non è E.164, l'uguaglianza delle cifre o una relazione di suffisso sull'intera sequenza confrontata, lunga almeno 7 cifre, segnala un caso dubbio. Anche la forma con `00` può fornire evidenza di conflitto; **non viene promossa a numero canonico o match certo**. Due numeri esplicitamente internazionali diversi non vengono uniti per suffisso. Il confronto comprende le righe fuori coorte e lo staff; questi ultimi rimangono esclusi, ma possono segnalare una collisione.

Questa euristica può produrre falsi positivi e non rilevare tutte le equivalenze (prefissi/trunk nazionali, interni, numeri cambiati o condivisi, recapiti mancanti). Non dedurre automaticamente paese, titolare o equivalenza da indirizzo/email. La mancata collisione **non prova unicità**: la review privata resta obbligatoria, in particolare contro il cliente Shopify senza email. Nessun flag permette di accettare automaticamente un dubbio o aggirare la quarantena.

### Lettura del report ed exit code

Il report passa a **schemaVersion 3**; il manifest dello snapshot resta **versione 2**. `assessmentMode` distingue strict/email-only. `cohortRoles` espone i conteggi customer/privilegiati/altri tra gli acquirenti; `sourceQuality` mantiene i contatori prima degli scarti. `phoneAssessment` separa E.164 totali e numeri nazionali/assenti/malformati dei soli customer con ordini. `sourcePhoneColumnSupplied` distingue una colonna inclusa da una colonna non fornita: in quest’ultimo caso i conteggi di assenza indicano indisponibilità nell’input, non certificano assenza alla fonte. La review privata di identità rimane richiesta anche in strict (`privateIdentityReviewRequired: true`). Questi contatori di qualità non sono categorie di esito e non vanno sommati agli `outcomes`.

Le cause `ambiguousSourcePhone`, `ambiguousShopifyPhone` e `conflictingShopifyIdentity` sono bloccanti per il record. Tutti i controlli precedenti su email, ID, ruolo, `null`, nome/indirizzo, join ID/orders, totali e manifest restano operativi. Author/administrator sono esclusi anche con ordini e anche se un altro alias di ruolo dichiara customer.

Senza errori tecnici, email-only restituisce `OFFLINE_EMAIL_ONLY_REVIEW_REQUIRED`, `privateIdentityReviewRequired: true` ed **exit 2**. Con anomalie bloccanti restituisce `BLOCKED`, sempre exit 2: leggere lo stato e le cause nel JSON. `emailOnlyReviewCandidates` è solo il conteggio residuo da revisionare, **non un'autorizzazione e non un certificato di identità**; `proposedNew` resta zero. In un report bloccato eventuali candidati residui non possono passare alla fase successiva. `productionAuthorized` e `liveCompletenessProven` restano false; tutti i consensi restano disattivati. Nessun writer, CSV importabile, chiamata API o nuova lettura live.

### Fixture ed evidenze sintetiche

- Il report strict storico resta una fixture generica di regressione, con 857 proposte simulate e ruoli diversi dalla distribuzione reale aggiornata. Non descrive lo stato corrente della coorte.
- La [nuova fixture email-only](customers-email-only-synthetic-dry-run.json) riproduce 1.108 righe, join con 5.453 coppie, 858 account con ordini/953 ordini, **857 customer + 1 author con ordini**, 249 customer e un administrator senza ordini, snapshot di 12 profili/11 email, un match email customer, 90 telefoni E.164 e 768 non E.164.
- Nella fixture l'author ha intenzionalmente un telefono nazionale; i 767 telefoni nazionali dei customer sono quindi **una scelta sintetica, non un dato reale verificato**. Tutti i recapiti e le identità sono inventati. Lo scenario base non introduce collisioni, che vengono coperte dai test negativi.
- Risultato della fixture: 856 `emailOnlyReviewCandidates`, zero `proposedNew`, zero scritture, review obbligatoria. L'uguaglianza con il conteggio reale delle email non abbinate non prevede l'esito del futuro preflight privato.

## Snapshot Shopify: file locale e prova privata di copertura

Un responsabile deve predisporre con procedura separata e autorizzata una lettura **completa** dei clienti del negozio destinatario, senza segmenti, selezioni o filtri. Questa PR non esegue quella lettura e non include un esportatore live. Non usare lo snapshot prodotti di marzo come elenco clienti.

Procedura per l'operatore in ambiente privato:

1. Verificare dominio canonico `*.myshopify.com`, identità del negozio e permesso di sola lettura clienti. Conservare le credenziali nel gestore segreti dell'ambiente autorizzato; non inserirle nei CSV, metadati, comandi condivisi o log. Non fornire credenziali a questi script offline.
2. Registrare l'inizio UTC e il conteggio **esatto** di tutti i clienti prima dell'estrazione. La [query ufficiale customersCount](https://shopify.dev/docs/api/admin-graphql/latest/queries/customersCount) ha un limite predefinito di 10.000: rimuovere il limite nella lettura autorizzata e controllare `precision: EXACT`, senza filtri. Conteggio approssimato o indisponibile = stop; non attestarlo come esatto.
3. Con un lettore autorizzato e revisionato percorrere la [connessione customers](https://shopify.dev/docs/api/admin-graphql/latest/queries/customers) dalla prima pagina senza cursore fino all'ultima. Richiedere soltanto ID e recapiti necessari al matching, oltre a `pageInfo`; niente nomi, indirizzi, note, ordini o consensi. Seguire `endCursor` come `after` della pagina seguente e proseguire finché `hasNextPage` è **false**. Non interrompere alla prima pagina, a un limite locale o a un certo numero di email. Ripetizioni di cursore, pagina mancante, errore HTTP/GraphQL, dati parziali, permesso insufficiente o errore di retry rendono l'estrazione inutilizzabile finché non viene ricostruita coerentemente. Rispettare i [limiti della paginazione](https://shopify.dev/docs/api/usage/pagination-graphql); se non è possibile coprire tutto, fermarsi e revisionare un diverso estrattore, senza aggirare il gate.
4. Verificare gli ID univoci sull'intera sequenza, senza eliminare righe per far tornare i numeri. Conservare una traccia privata di catena dei cursori e controlli per ID; non pubblicare ID/cursori né risposte API. Il JSON consumato dal preflight contiene solo il riepilogo di pagine/conteggi, non la traccia dettagliata. Scrivere il CSV finale con **soltanto `Email,Phone`**, una riga per cliente. Conservare i clienti senza email se hanno telefono; non eliminare clienti senza entrambi per ottenere un file apparentemente valido: tali righe, recapiti malformati, `null` letterali o email duplicate bloccano lo snapshot e richiedono una soluzione revisionata.
5. Registrare conteggio esatto dopo l'estrazione, termine UTC, numero di ID distinti e righe di ogni pagina. Prima = dopo = ID distinti = righe CSV = somma righe pagine. Se il negozio cambia durante la raccolta, ripetere in una finestra coerente. L'uguaglianza dei conteggi non esclude modifiche ai recapiti o una creazione/cancellazione compensativa: verificare anche le evidenze private e le modifiche concorrenti, senza dichiarare consistenza transazionale.
6. Calcolare SHA-256 sui **byte finali** del CSV; qualunque risalvataggio richiede nuovo digest. CSV, metadati e traccia privata restano fuori dal repository/CI/allegati, con accessi ristretti e conservazione concordata. Controllare l'età prima di ogni esecuzione; ripetere l'estrazione dopo 24 ore e ricontrollare live le collisioni prima di un eventuale futuro lotto, previa autorizzazione separata.

Accompagnarlo con un JSON privato con **esattamente** questi campi:

```json
{
  "schemaVersion": 2,
  "complete": true,
  "exportedAt": "2026-11-12T11:00:00Z",
  "rowCount": 0,
  "sha256": "<sha256 dei byte esatti del CSV minimizzato>",
  "shopDomain": "<negozio-destinatario>.myshopify.com",
  "coverage": {
    "scope": "all-customers",
    "filtersApplied": false,
    "startedAt": "2026-11-12T10:59:00Z",
    "countBefore": 0,
    "countAfter": 0,
    "countPrecision": "EXACT",
    "uniqueCustomerIds": 0,
    "cursorChainVerified": true,
    "pages": [{ "rowCount": 0, "hasNextPage": false }]
  }
}
```

I valori sopra sono uno schema **per un negozio realmente vuoto**, non uno snapshot utilizzabile. Il JSON ha esattamente le chiavi mostrate, incluse quelle di `coverage` e di ogni pagina; la versione 1 viene bloccata. `pages` deve contenere tutte le pagine in ordine, con `hasNextPage: true` su ogni pagina intermedia e `false` soltanto sull'ultima; la somma deve coincidere con i tre conteggi esatti e `rowCount`. Una pagina vuota è ammessa soltanto come unica pagina di un negozio con tutti i conteggi a zero. `cursorChainVerified` richiede la verifica privata effettiva, non la sola compilazione del campo.

Inizio e fine devono essere UTC e coerenti; nessuna estrazione iniziata o conclusa da oltre 24 ore è accettata, con tolleranza futura di 5 minuti sul termine. `--shop` deve concordare esattamente con il dominio attestato. Il report non espone dominio, checksum, identificativi o percorsi. **Anche il manifest v2 è un'attestazione dell'operatore**, sottoposta a controlli di coerenza: `complete: true`, SHA-256 e metadati compilati non provano che le letture live siano state complete o corrette. `shopifySnapshot.verified` significa che i controlli locali passano; `liveCompletenessProven` resta sempre **false**. Serve review privata delle evidenze alla fonte. I 12 clienti/11 email descrivono il precheck del 13/11: al futuro preflight registrare i conteggi effettivi aggiornati, senza forzarli a 12. Senza snapshot valido nessuna riga è classificata nuova.

## Esecuzione e test

Requisito: Node 22; nessuna installazione di pacchetti o credenziale. I percorsi sono esempi e devono puntare a file privati minimizzati.

```sh
# Fixture incorporata; non legge file clienti privati
npm run sync:customers:preflight -- --synthetic
# Email-only: exit 2 previsto, review obbligatoria
npm run sync:customers:preflight -- --synthetic --email-only
npm run test:customers

# Dry-run reale senza snapshot: exit 2 e nessuna proposta nuova
node sync/customers-convert.mjs --input /archivio-privato/clienti-minimi.csv

# Sheet2 senza orders: join soltanto con l'estratto ID/orders già minimizzato
node sync/customers-convert.mjs \
  --input /archivio-privato/sheet2-minimo.csv \
  --orders /archivio-privato/id-orders.csv

# Valutazione email-only privata; solo report aggregato, exit 2 previsto
node sync/customers-convert.mjs --dry-run --email-only \
  --input /archivio-privato/sheet2-minimo.csv \
  --orders /archivio-privato/id-orders.csv \
  --snapshot /archivio-privato/shopify-minimo.csv \
  --snapshot-metadata /archivio-privato/snapshot.json \
  --shop negozio-destinatario.myshopify.com \
  --report /archivio-privato/report-aggregato-nuovo.json
```

`--report` è facoltativo, scrive esclusivamente aggregati con permessi `0600` e apertura esclusiva: niente sovrascritture, neppure di input o symlink. Nessun file viene scritto per impostazione predefinita. Gli errori espongono solo codici fissi, mai percorsi, dati, messaggi del parser o stack. Exit **0** = controlli strict completi, **2** = report bloccato o email-only da revisionare, **1** = input/argomenti/IO invalidi. Non convertire exit 2 in successo: distinguere stato e cause nel report. `productionAuthorized` resta sempre `false`, anche con exit 0.

La CI dedicata esegue solo fixture e test con rete Node bloccata e nessun secret. Il report [sintetico versionato](customers-synthetic-dry-run.json) è riproducibile. Il guard di rete Node è una protezione aggiuntiva dei test, non un sandbox OS. Nessun test richiede servizi live.

## Verifica di questa preparazione

Eseguita localmente con Node `v22.22.3`, il 13/11/2026:

- `npm run test:customers`: **46 test PASS**, zero fallimenti; tutti sintetici, con rete Node bloccata anche nei sottoprocessi CLI.
- Casi coperti: forme 5.453/1.108/858 righe; coorte e contatori; ruoli; alias email; duplicati email/telefono/ID; dati e CSV invalidi; sicurezza/consensi; snapshot assente, obsoleto, alterato o di altro negozio; errori sanitizzati; flag write negati; output esclusivo `0600`.
- `node --check` sui sei moduli JavaScript nuovi/modificati: PASS.
- Rigenerazione dei due report sintetici strict/email-only e confronto byte per byte: PASS.
- `git diff --check`: PASS. Nessuna modifica a frontend, backend, schema DB, file di segreti o dipendenze. Non è stato eseguito un collaudo runtime/live o un dry-run con dati reali.
- Regressioni della review: join ID su estratti disordinati, match mancanti/ambigui, duplicati anche fuori selezione, contatori null, `null` anagrafici, telefoni nazionali, pagine parziali, filtri, conteggi approssimati/variabili, ID non univoci attestati e negozio vuoto. La demo strict mantiene il join 1.108/5.453 e 857 proposte simulate come regressione. La nuova demo email-only esercita la distribuzione aggiornata dei ruoli e dà 856 righe soltanto da revisionare. I 14 nuovi test coprono author con ordini, telefoni nazionali/assenti, originali invariati, collisioni nella fonte e contro Shopify (anche senza email), conflitti tra identità e CLI. Questi numeri simulati non certificano i dati reali.

## Coordinamento documentale con la PR #48

La #48 mantiene l'audit storico e il piano SEO; la #53 modifica il tooling clienti. Non copiare l'audit in questa PR e non assumere che sia in `main`. Le descrizioni degli script nell'audit fotografano il codice **precedente** alla #53: questo runbook documenta la sostituzione offline; non eseguire le vecchie istruzioni come alternativa.

Per il responsabile dell'integrazione, in una fase distinta da questa attività:

1. Revisionare la #48 e decidere l'integrazione dell'audit, mantenendolo separato dai gate runtime. La sequenza documentale consigliata è #48 prima di #53; nessuna delle due autorizza dati reali o importazioni.
2. Se si integra prima la #53, mantenere il riferimento immutabile qui e nella guida cliente: il tooling resta autonomo, ma la dipendenza documentale va indicata come pendente. Non creare un collegamento relativo a un file ancora assente in `main`.
3. Dopo l'eventuale merge della #48, verificare il percorso dell'audit e aggiornare lo stato dei riferimenti in entrambi i documenti con una modifica documentale dedicata, conservando il permalink per la provenienza dei conteggi. Se l'audit cambia 858/953 o la selezione, revisionare anche contratto, fixture e aspettative, senza adattare i dati per far passare i test.

**Stato residuo:** coordinamento del merge della #48 pendente; nessun merge, aggiornamento alla #48, deploy o modifica ai gate eseguito qui.

## Procedura futura di importazione — non eseguibile da questa PR

1. Il proprietario approva finalità, campo minimo, destinatario, responsabilità, tempi di conservazione e campione tramite canale privato. Definire l'esperienza di accesso coerente con gli account Shopify attivi; nessuna password WP o invito inviato automaticamente.
2. Acquisire copia minimizzata e snapshot completo recente. Verificare origine, foglio, selezione, conteggi e corrispondenza della coorte; risolvere ogni blocco/quarantena senza modificare il contatore per far tornare i totali. Ripetere il preflight e approvare i conteggi finali, inclusi gli esclusi.
3. In **una nuova modifica revisionata**, implementare il generatore del CSV minimo o il writer create-only. Nessun ripristino del vecchio upsert. Se si usa CSV, verificare il modello Shopify vigente: `First Name`, `Last Name`, `Email`, `Phone`, campi `Default Address ...`, tre colonne marketing `no`. Niente note libere, ordini storici, totale speso, credenziali, hash o metadata WP.
4. Preparare un backup privato pre-import e un journal identificativo del lotto, con ID Shopify di ogni profilo effettivamente creato, origine approvata e risultato. Il solo tag lotto non basta come registro di rollback. Non pubblicare journal/CSV su GitHub.
5. Subito prima di ogni lotto ricontrollare live email e telefono e registrare i match: lo snapshot può diventare obsoleto durante il tempo di review. Una collisione deve causare skip/stop, mai update. Con CSV lasciare **deselezionata** la sovrascrittura dei profili esistenti. L'import CSV non offre una transazione o un controllo applicativo equivalente a un writer: valutarne i limiti prima dell'autorizzazione.
6. Il proprietario autorizza esplicitamente negozio, numero finale, campi, lotto pilota ridotto, finestra e rollback. L'approvazione/merge di questa PR non autorizza alcuna importazione. Preparare prima codice e file revisionabili; nessun consenso generico sostituisce questa decisione.
7. Dopo l'autorizzazione, eseguire il pilota; verificare profili creati, marketing disattivato, assenza di modifiche a preesistenti e di comunicazioni indesiderate. Fermarsi su ogni discrepanza. Proseguire per lotti solo dopo accettazione del pilota; riconciliare tentativi, creati, skip, errori e ID nel journal. Rerun con nuovo snapshot, senza ricreare profili già importati.

## Rollback e stop

**Oggi:** nessun dato remoto scritto, quindi nessun rollback dati necessario; eliminare solo file locali sintetici/di review secondo la conservazione concordata. Chiudere la PR o ritirare la branch se non approvata. Non ripristinare gli script legacy come scorciatoia: reintrodurrebbe le write implicite.

**In una futura migrazione:** fermare subito i lotti, conservare journal ed evidenze private, verificare il delta per ID. Eventuale eliminazione solo dei profili effettivamente creati da quel lotto, dopo verifica che non abbiano nuovi ordini, attività, associazioni o modifiche successive e previa autorizzazione puntuale. Non eliminare i preesistenti; se il profilo ha nuova attività, preferire correzione manuale concordata. Non fare restore globale o cancellazioni basate soltanto sul tag.

Un import non è atomicamente reversibile: email/inviti eventualmente inviati non si possono ritirare e nuove attività possono impedire la rimozione. Per questo i messaggi automatici devono essere valutati prima del pilota. Qualsiasi modifica accidentale a un preesistente richiede confronto col backup e ripristino selettivo, considerando le modifiche concorrenti; mai overwrite massivo come rollback. Testare il piano di recovery su dati sintetici prima di autorizzare il writer reale.

## Verifiche ancora necessarie

- CSV reale minimizzato, schema effettivo, provenienza e qualità ancora non verificati.
- Duplicati reali, confronto telefonico, categorie dei 768 telefoni non E.164, caratteri e consensi non determinabili dal report sintetico.
- File snapshot Shopify con manifest v2 e traccia privata di copertura non disponibile qui; il conteggio 12/11 del precheck non lo sostituisce. Numero finale dei nuovi profili sconosciuto.
- Validazione strutturale non equivale a recapito corretto o verifica dell'identità.
- Futuro writer/esportatore, journal, campione privato e prova di rollback da realizzare e approvare.
- Nessun cambiamento a PR #47, Supabase/Lovable, Admin, configurazioni runtime o deploy.

Riferimento ufficiale verificato il 12/11/2026: [Shopify — importazione ed esportazione clienti](https://help.shopify.com/it/manual/customers/import-export-customers), incluse collisioni email/telefono, colonne del CSV, consenso per canale e limiti su ordini/password.
