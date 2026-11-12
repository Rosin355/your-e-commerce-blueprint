# Admin V2 — consegna operativa richiesta

Aggiornamento: 10 novembre 2026, dopo il rilascio della PR #52.

## Stato vigente — distribuzione tecnica effettuata, consegna cliente aperta

Questa sezione aggiorna il brief preparatorio conservato sotto. Le richieste storiche di migration, upload o nuove finestre canary non sono nuove operazioni da ripetere.

- PR #52 verificata MERGED, candidato `e54d4d98ee09afac7bf79d3116074706370af11f`, merge `cb7fc573e2b8c8d4838bb49cec38b74961d39e78`. Il fix riguarda la preservazione della coppia titolo/descrizione SEO, non una nuova guardia TTL. Main prima di questa nota: `dab9154ff05b4c62ef08be070e8d4069c088321e`.
- Migration originale e delta già applicati e backend distribuito secondo il [report QA corrente](ADMIN-V2-QA-REPORT.md). Frontend pubblicato `admin-delivery-20261110-r1`; il deploy finale #52 riguarda soltanto `product-admin-api`. Non rieseguire migration o Publish per la sola registrazione cliente.
- Il percorso tecnico ha verificato upload/media READY, una bozza interna, una sola DRAFT Shopify, recupero senza ricreazione, modifica e sincronizzazione di una descrizione SEO. La protezione finale della coppia SEO è coperta dai test e dalla CI, non da un nuovo canary live. Nessun prodotto tecnico pubblicato.
- Ultimo stato documentato: master true/canary, scope e approvazione temporanei nulli, sync e nuove creazioni Shopify OFF, zero grant ordinari. Non è una nuova lettura runtime eseguita con questa nota; non chiamare il master OFF e non confondere master true con autorizzazione generale.
- Registrazione dell'account Marco rinviata; account/capability ordinari non abilitati e sessione cliente non collaudata. La consegna NON è completa. Non basta la registrazione per attribuire permessi catalogo.
- Categorie editoriali e pubblicazione presenti nel codice, ma assegnazioni e pubblicazione commerciale non collaudate live; zero mapping storici approvati. Safari/iOS e Admin mobile non attestati. `restoreVerified=false` rimane tale, con rischio residuo già accettato nel mandato.

## Prossima attività circoscritta — registrazione, abilitazione e accesso cliente

1. Marco completa personalmente registrazione e verifica dell'email concordata tramite `https://onlinegarden.it/auth`, secondo la [guida cliente vigente](ADMIN-V2-CLIENT-GUIDE.md). Non usare credenziali del tecnico, condividere password/codici, duplicare un account esistente o aggirare verifica email.
2. Dopo la conferma del proprietario, identificare l'account esatto e verificato; applicare solo i grant catalogo previsti dal modello ordinario già distribuito e dal mandato. Non attribuire automaticamente tech_admin o poteri su utenti, ordini, pagamenti, spedizioni, secret o infrastruttura. Se lo strumento richiede consenso puntuale, raccoglierlo per i soli valori/permessi necessari.
3. Seguire il percorso ordinario account-specifico documentato nel runbook corrente. Non riaprire le finestre canary scadute delle 17:40/18:30, non ricreare la DRAFT tecnica e non portare globalmente il sistema in full per comodità. Determinare dal codice distribuito quali interruttori restano necessari insieme ai grant, senza presumere che il solo login abiliti sync o bozze.
4. Verificare dalla sessione autentica del cliente accesso, capability effettive e azioni consentite. La consultazione o la presenza dei pulsanti non certificano le scritture: distinguere i test tecnici già eseguiti dall'accettazione del flusso ordinario del cliente. Usare una bozza non pubblicata soltanto se serve una verifica mirata autorizzata; non ripetere l'intera suite o creare prodotti commerciali di prova.
5. Aggiornare lo stato dopo l'abilitazione effettiva, indicando limiti residui e senza presentare prezzi, categorie o pubblicazione come collaudati se non lo sono. Nessun nuovo sviluppo o deploy salvo difetto riproducibile.

Questa nota è solo documentale: non crea account, non invia inviti, non cambia ruoli, grant, flag o dati. Checkout, spedizioni A/B, Sendcloud, catalogo commerciale e PR SEO #49 restano invariati.

## Dopo la registrazione — compiti del proprietario e chiusura della consegna

Chiarimento dell'11 novembre 2026, basato sullo stato documentato sopra; nessuna nuova verifica runtime o abilitazione eseguita.

Il proprietario deve confermare privatamente al responsabile tecnico l'indirizzo usato da Marco, che l'email sia verificata e quali operazioni catalogo autorizza: modifica/salvataggio, sincronizzazione esplicita, immagini, nuove bozze e, se previsto, categorie verificate e pubblicazione manuale. Non serve ricevere password o codici, fare Publish, cambiare secret a mano o attribuire un generico ruolo amministratore.

Il tecnico verifica l'UUID dell'account, applica le sole capability ordinarie autorizzate e gli interruttori strettamente necessari, poi rilegge le autorizzazioni effettive dal server. Non estende i diritti agli altri utenti e non sostituisce la sessione di Marco con quella del tecnico.

La registrazione chiude soltanto il requisito identità; l'abilitazione chiude quello di accesso. Per la consegna operativa verificare un percorso ordinario con Marco: apertura prodotto, campo consentito salvato/riletto e sincronizzato esplicitamente; nuova bozza con immagine ritrovabile dopo ricaricamento; categoria editoriale verificata quando richiesta. La pubblicazione commerciale resta da provare su un vero prodotto approvato dal proprietario: mai pubblicare la DRAFT tecnica. Registrare separatamente esiti tecnici precedenti, operazioni ordinarie cliente riuscite e azioni non provate. Non rifare indiscriminatamente i test di migration o tutte le suite.

La prova sulla sola descrizione SEO non dimostra prezzi, categorie o pubblicazione. Le 22 corrispondenze storiche ancora aperte non devono bloccare editing e bozze indipendenti, ma nessuna categoria ambigua va associata senza conferma. Il salvataggio interno non equivale a disponibilità sul sito.

La frase 'Admin consegnato' è corretta solo per il perimetro realmente abilitato e verificato con il cliente, con limiti espliciti. 'Progetto interamente concluso' è una decisione distinta: SEO/redirect/sitemap nel relativo rilascio, categorie storiche, eccezioni di spedizione e verifiche mobile/Safari mantengono il proprio stato e non diventano PASS per effetto della registrazione. Non riaprire in questa nota attività già completate né dichiarare chiusi i filoni non verificati.

<details>
<summary>Brief preparatorio del 10 novembre — storico precedente al rilascio</summary>

## Obiettivo del proprietario

Il proprietario richiede la consegna del gestionale personalizzato operativo nella giornata corrente: Marco deve modificare prodotti e aggiungerne di nuovi dall'Admin Online Garden. Il solo pannello in lettura e il rinvio a Shopify Admin non soddisfano la richiesta. Richiesto un unico incarico esecutivo, senza nuovi ambienti, abbonamenti, redesign o cicli ripetitivi di audit. La scadenza e un obiettivo, non una garanzia tecnica di consegna.

Questa nota documenta requisito e proposta di esecuzione: non applica migration, non assegna ruoli, non abilita flag e non attesta un deployment. Il prompt operativo proposto al proprietario deve esprimere chiaramente il perimetro autorizzato; i consensi obbligatori degli strumenti restano vincolanti.

## Ostacoli concreti verificati nel codice

Lettura di `supabase/functions/_shared/admin-operational-core.ts` su main:

- `parseOperationalApproval` accetta approvazioni da configurazione server, riferite a operationId/hash, con scadenza entro 24 ore. Una consegna autonoma non deve richiedere al tecnico di cambiare un secret per ogni nuovo prodotto. Serve conferma dell'operazione nella UI, registrata e validata dal backend, mantenendo idempotenza, scadenza pertinente, attore, versione/hash e audit.
- `validateDraft` ammette immagini HTTPS gia presenti su `cdn.shopify.com`. Marco non deve cercare o incollare URL CDN: riutilizzare o completare upload/selezione media autenticati nel gestionale, con validazione e attesa della disponibilita del media.
- Il manifest mantiene la build operativa, le capability e la migration disabilitate; pubblicare solo frontend non completa l'attivazione.

Non dichiarare queste lacune risolte senza codice e prova. Non e stata svolta una nuova review completa del repository.

## Perimetro della consegna richiesta

Dalla UI personalizzata: modifica dei campi commerciali supportati e sincronizzazione esplicita, creazione e rilettura di una bozza Shopify senza duplicati, immagini, SKU/varianti, categorie con identita verificata e pubblicazione soltanto con comando esplicito del cliente e canale corretto. Nessuna pubblicazione di prodotti di prova. Le categorie ambigue non devono bloccare salvataggio e lavoro su altri prodotti; non associare automaticamente le 22 proposte.

Marco deve essere identificato tramite account concordato e verificabile, mai dal solo nome o dal conteggio degli admin. Il ruolo Shopify non prova il ruolo applicativo. Servono capability server minime per il catalogo, senza elevazione indiscriminata o ruolo tech_admin. In mancanza dell'identificativo, chiedere una sola conferma privata dell'email/account, non password o token; continuare le attivita indipendenti.

I consensi di produzione vanno inclusi nel mandato esecutivo invece di chiedere ancora un piano che vieta qualunque attivazione. L'autorizzazione deve includere target, migration, backend, build frontend, capability circoscritte, prova DRAFT e merge/deploy dopo CI positiva. Non autorizza modifiche commerciali arbitrarie al catalogo.

## Recovery proporzionato proposto, non attestazione di restore

Migration prevista: `docs/release/pending/20261031184521_admin_operational_drafts.sql`, checksum `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`, target Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5` / Supabase `iekwvvihjwghosqdxrdi`.

La proposta distingue il rischio della migration additiva da quello delle successive scritture. Verificare snapshot gestito disponibile, transazione atomica/history e postcondizioni della sola migration, pacchetti backend/frontend precedenti recuperabili, journal e valori precedenti dei soli record coinvolti. Non richiedere un restore distruttivo della produzione per dimostrare il recupero.

Il ripristino completo produttivo resta NON DIMOSTRATO. Sostituire il precedente gate di restore riuscito e una decisione di rischio del proprietario, da dichiarare esplicitamente nel mandato: non aggiornare `restoreVerified` a true. Un rollback di applicazione/schema non e un backup completo. Nessun export auth/hash/password, nessun ripristino storico generale, nessun DROP CASCADE. Dopo nuove righe conservare schema e dati e disabilitare le sole azioni difettose; eventuali compensazioni per record richiedono controllo versione per non sovrascrivere cambiamenti concorrenti.

## Collaudo minimo richiesto

Riutilizzare prove precedenti; eseguire CI sul codice effettivamente modificato e un solo percorso integrato non commerciale: login autorizzato, una bozza dedicata, immagine, salvataggio/rilettura, retry idempotente senza duplicato, modifica/sync consentita, tentativo non autorizzato negato, navigazione desktop/mobile. Rilevare commit e versione effettivamente distribuiti.

Il test DRAFT non autorizza di per se scritture illimitate: verificare separatamente le capability dell'operativita ordinaria, mantenendole circoscritte all'account verificato e alle azioni catalogo previste. Non lasciare il cliente vincolato a uno SKU di prova o ad approvazioni tecniche quotidiane. Se Safari non viene provato, riportare il limite senza dichiararlo PASS.

## Protezioni e consegna

Preservare checkout, tariffe A/B, Sendcloud, stock reale, SKU/handle esistenti e collezioni logistiche. Nuove varianti e categorie non devono alterare implicitamente A/B. Nessun ordine, pagamento, app aggiuntiva, bypass di autorizzazione o attivazione AI non richiesta. Evitare scritture parallele di agenti sullo stesso ambiente.

Tenere separata la PR SEO #49: conservare il primo rilascio SEO gia autorizzato senza confonderlo con l'operativita Admin. Non usare redirect, recupero backup legacy o completamento di tutta la tassonomia come prerequisiti per ogni modifica prodotto.

Risultato da consegnare: URL, versione, account/capability attestati senza dati personali nel repository, operazioni effettivamente provate, guida breve per Marco, rollback e limiti rimasti. Nessuna percentuale o dichiarazione COMPLETATO basata sul solo merge o sui documenti.

</details>
