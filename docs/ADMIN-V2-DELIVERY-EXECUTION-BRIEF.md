# Admin V2 — consegna operativa richiesta

Data: 10 novembre 2026.

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
