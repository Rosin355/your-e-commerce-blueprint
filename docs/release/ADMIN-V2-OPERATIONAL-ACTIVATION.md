# Admin V2 — pacchetto definitivo di attivazione operativa

**Preparato, non eseguito.** Base main `3296a7669216ff1082ff74f5c52cec396af27acf`; frontend live ancora `1ad6182` / `admin-readonly-20261106-r1`. Questo piano usa esclusivamente l'infrastruttura esistente. Nessun nuovo progetto, staging Cloud o abbonamento. [Manifest vincolante](ADMIN-V2-ACTIVATION-MANIFEST.json).

## Stato e perimetro esatto

- Target: progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`, configurazione `supabase/config.toml` con project ref `iekwvvihjwghosqdxrdi`; database operativo `postgres`, PostgreSQL **17.6**, Europe (Frankfurt). Il nome `postgres` non identifica da solo il progetto: occorre la catena progetto/configurazione/connessione verificata. Management API Supabase non è un secondo riscontro disponibile.
- Ultima migration registrata: `20260817125535`. La `20261031184521` non è applicata; quattro nuove tabelle e quattro nuove RPC assenti, nessuna collisione. Le dipendenze auth/users, catalogo, registro campi, ruoli e categorie esistono; RLS delle dipendenze esaminate attiva. [Ultima verifica SELECT](../admin-v2-evidence/2026-11-06-activation/prerequisites.json).
- SQL unico, già testato nella #42: `docs/release/pending/20261031184521_admin_operational_drafts.sql`, **SHA-256 `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`**. Invariato; non ricopiato in nuove migration. La migrazione crea solo journal/link/RPC: non invoca RPC, non inserisce prodotti o categorie, non modifica dati commerciali o flag.
- Backup provider osservati: 15 punti giornalieri, il più recente **6 novembre 2026 05:25:08 UTC**. Database mostrato: 0,35 GB. Sono punti disponibili, **non una prova di recuperabilità**.
- L'avvio dell'export completo è stato respinto dalla revisione automatica perché richiede consenso esplicito al trattamento del payload sensibile; export non avviato, nessun archivio scaricato e nessun restore tentato. Nessun dato utente o hash incluso in Git.

## Primo gate: backup effettivamente recuperabile

**Unica autorizzazione da richiedere ora:** export completo del database del progetto sopra, download privato sul computer locale e prova di ripristino esclusivamente locale. Il dump può comprendere account e hash delle password; non include secret/API key/Edge code e file Storage, secondo la [documentazione del provider](https://docs.lovable.dev/features/database-backups). Non chiedere ancora l'applicazione della migration: questo gate non è soddisfatto.

Dopo consenso specifico, sequenza senza interventi sui dati live:

1. Avviare un solo export nativo Lovable, senza alterare permessi dei bucket. Attendere che sia pronto; non creare progetti o servizi. Mai inviare l'archivio in chat, GitHub, servizi esterni o log.
2. Scaricare in `/private/tmp/og-admin-recovery-20261106`, directory `0700`, file `0600`, fuori dal repository. Conservare hash SHA-256, dimensione, data, versione formato e riferimento al progetto in un manifest sanificato. Il percorso proposto non è un backup già creato; `/private/tmp` è locale e temporaneo, quindi prima della finestra produttiva concordare anche una copia protetta persistente fuori dal database e la durata di conservazione. Non cancellare automaticamente copie utili.
3. Verificare archivio con `pg_restore --list` e ripristinarlo in un cluster PostgreSQL **17** temporaneo locale con solo socket Unix e dati non esposti in rete. Il `pg_restore 16.15` disponibile **non è attestato compatibile** con il dump del server 17: usare toolchain compatibile, senza avviare un servizio Cloud o ripetere il test sintetico già PASS.
4. Conservare log protetto e verificare integrità di strutture, FK, dati interessati, RLS, ACL e RPC preesistenti rispetto alla baseline di export. Nessun collegamento Shopify o chiamata esterna nel clone. Disabilitare nel clone l'esecuzione di eventuali job/integrazioni prima di consentirne l'avvio; non attivare estensioni di scheduling/HTTP con credenziali reali. Non stampare password hash, token, dati account o payload catalogo nei report.
5. Un restore con errori, dipendenze Cloud non ripristinate, tabelle mancanti o grant esclusi non vale PASS. Non usare `--no-privileges` o stub per dichiarare recuperata la sicurezza reale. Il report deve indicare esattamente cosa è ripristinato e cosa manca. Se non si ottiene recupero affidabile, fermarsi prima di qualsiasi modifica produttiva.
6. Le esportazioni non includono codice Edge, secret, configurazione provider auth o file Storage: per questa migration il recupero del database è il gate pertinente; frontend/backend hanno il loro rollback di codice, configurazioni e Storage rimangono invariati. Un restore giornaliero in-place può perdere tutte le modifiche successive al punto scelto ed è una diversa operazione distruttiva, da approvare separatamente: non avviarlo come prova.

**Non affermare “backup recuperabile” finché non esistono archivio e report di restore verificato.** Non è richiesto uno staging aggiuntivo; è una prova di recupero locale del backup reale, non una ripetizione delle suite sintetiche.

## Secondo gate: approvazione della sola migration

Solo dopo il gate backup, presentare al proprietario un'unica operazione concreta con target, versione e checksum sopra, manifest backup verificato e rollback qui definito. La frase di autorizzazione dovrà nominare `iekwvvihjwghosqdxrdi`, il progetto Lovable, `20261031184521` e il relativo SHA-256. **Non include deploy, flag ON, nuovi ruoli, mapping categorie o mutation Shopify.** L'approvazione dell'export non equivale ad approvazione della migration.

Esecuzione futura autorizzata:

1. Ripetere soltanto il controllo volatile immediato di identità, assenza collisioni/history e hash SQL; verificare che frontend sia ancora in consultazione e i master/Shopify sync siano OFF. Non effettuare un nuovo audit catalogo.
2. Eseguire l'intero SQL originale in **una sola transazione** (`BEGIN`, lock timeout limitato, error-stop, SQL originale, postcondizioni, registrazione della stessa versione, `COMMIT`). Nessun `CREATE INDEX CONCURRENTLY` o DDL non transazionale nel file. Il trasporto deve mantenere la stessa connessione/transazione per l'intero payload; se non lo garantisce, non spezzare il lavoro in chiamate con autocommit.
3. Preferire il meccanismo migration del provider che registra la versione. Se si usa SQL diretto autorizzato, includere nella stessa transazione una sola registrazione coerente in `supabase_migrations.schema_migrations` (version, name, statements dal file originale), dopo le verifiche e senza riapplicare le migration storiche. Schema del registro verificato: version/text NOT NULL, statements/array, name/text, created_by/text, idempotency_key/text, rollback/array. Non inventare valori di identità/approvazione.
4. Prima di COMMIT verificare quattro tabelle/RLS, quattro RPC `SECURITY INVOKER`, `search_path` vuoto e ACL previste dal file: EXECUTE solo a service_role, negato PUBLIC/anon/authenticated; nessun accesso diretto client alle nuove tabelle. Le nuove tabelle devono essere vuote. Se una postcondizione fallisce, abortire e rollback; non registrare il successo.
5. Dopo COMMIT rileggere schema/history e grant in sola lettura; mantenere tutti i flag OFF e annotare esito. Non eseguire nuove suite o scritture di prova su prodotti.

### Migrazione parziale e rollback

- Errore prima di COMMIT: rollback dell'unica transazione, nessun avanzamento history; verificare che i quattro oggetti non esistano. Non ripetere alla cieca.
- Esito/connessione incerti: rileggere history e tutti gli oggetti, distinguere successo atomico da stato precedente; non inferire successo da una sola tabella. Se viene rilevato uno stato parziale fuori transazione, fermarsi e conservare evidenza per intervento autorizzato, senza `IF NOT EXISTS` usato per nascondere divergenze.
- Dopo COMMIT ma **prima di ogni capability/scrittura**: rollback di schema solo con approvazione esplicita e verifica delle quattro tabelle ancora vuote; rimuovere esclusivamente le quattro funzioni nuove e le quattro tabelle nuove in ordine inverso alle dipendenze, poi la relativa riga history nella stessa transazione. **Mai CASCADE.** Una dipendenza inattesa deve fermare il rollback.
- Se una tabella nuova contiene dati o un canary è partito: niente DROP automatici. Capability OFF, journal/link preservati, snapshot corrente protetto e riconciliazione della stessa operazione; una creazione Shopify incerta non autorizza una seconda creazione o la cancellazione del prodotto.
- Restore dal backup reale: soltanto dal manifest verificato, con approvazione separata di downtime e perdita dati successivi. Nessun ripristino giornaliero indiscriminato, nessun reset del DB o backfill.

## Backend, frontend e capability: sequenza preparata, non eseguita

1. **Schema autorizzato**, verifica RPC/ACL/RLS appena descritta, flag ancora OFF.
2. **Backend compatibile:** promuovere le query da `supabase/functions/_shared/admin-v2-queries-deferred.ts` alle query attive e applicare, dopo revisione, `docs/release/ADMIN-V2-DEFERRED-ENDPOINT.patch` con formato `--unidiff-zero`. Controllare l'integrazione completa, non applicare la sola patch a query vecchie. Deploy backend separato solo dopo relativa autorizzazione, con master e capability OFF.
3. **Frontend compatibile:** futura revisione del vincolo `ADMIN_READ_ONLY_RELEASE=true` e della allowlist, dopo disponibilità del backend; non sostituire il vincolo con una preferenza locale. Le route legacy rimangono escluse. Nessuna pubblicazione Lovable in questa preparazione.
4. **Prima capability, solo editing canary:** dopo approvazione di prodotto Shopify DRAFT/SKU/field/ruolo/finestra, mantenere writeMode=canary e attivare soltanto il master necessario, con Shopify sync, drafts, draft-Shopify e categories OFF. I campi consentiti sono quelli già nel codice; nessun inventario/pubblicazione/pagamento. **Il canary attuale limita ruoli e campi, non gli SKU:** la scelta DRAFT/SKU richiede approvazione e controllo dell'operatore, non va dichiarata allowlist prodotto server inesistente. Se occorre isolamento automatico a un solo prodotto, preparare un controllo dedicato prima di aprire il master.
5. **Canary DRAFT approvato:** usare una sola identità concordata; nessuna pubblicazione, nessun prodotto commerciale scelto casualmente. Una richiesta che includa modifica, bozza e sincronizzazione non autorizza tutte le capability insieme.
6. **Marco:** identificare l'account effettivo con il proprietario prima di assegnare ruoli. L'aggregato letto mostra una sola riga admin, non prova l'identità di Marco. Il ruolo editor è candidato per contenuti interni, non admin/tech_admin. In canary editor non scrive: l'eventuale passaggio a full e l'ambito degli editor devono essere approvati separatamente dopo il canary. Non modificare ruoli da questa PR.
7. **Bozze e categorie, una alla volta:** master + drafts solo per il salvataggio interno; creazione Shopify richiede draft-Shopify e approvazione per operationId con scadenza massima 24 ore. Claim prima della mutation, controllo SKU parent/varianti, journal e recovery senza seconda create rimangono obbligatori. Categorie richiedono master + categories e approvazione del relativo snapshot/hash; solo mapping verificati e commercialmente approvati. Zero mapping oggi: non abilitare assegnazioni. [Unica tabella delle 22 decisioni per Marco](../ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md).
8. **Sync Shopify:** flag indipendente `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` rimane OFF. Una sua eventuale attivazione richiede approvazione distinta per campo e DRAFT; niente sync massiva. Shopify Payments, checkout/A+B, inventario, Sendcloud e prodotti in vendita non vengono toccati.
9. **Frontend e controllo minimo finale:** pubblicare soltanto se serve a rendere visibili le capability realmente distribuite; registrare SHA/deployment/versione live. Nessuna nuova certificazione Safari o accettazione Marco dichiarata senza prova.

### Rollback codice e configurazione

Conservare SHA backend effettivamente distribuito prima della futura attivazione e il relativo pacchetto dal provider: main non attesta da solo la versione Edge live. Frontend di ritorno già verificato: `1ad6182` / `admin-readonly-20261106-r1`, deployment `00a243b8-240f-48bf-8507-202d352fc4f4`. Su anomalia: richiudere prima le sole capability aperte, confermare master/sync OFF, poi ripristinare backend/frontend compatibili senza toccare le altre configurazioni. Non eliminare i journal per semplificare il rollback. Non leggere, copiare o pubblicare secret.

## Verifiche riutilizzate e limiti attuali

SQL immutato: PostgreSQL locale/rollback/RLS PASS già conservati; Node/Deno/Chromium e CI/GitGuardian della versione rilasciata riutilizzati. Nessuna suite manuale ripetuta, nessuna nuova migration sviluppata. Questa PR è di sola preparazione/documentazione: l'eventuale CI GitHub automatica non è un test di backup o un'autorizzazione produttiva.

**Stato finale di questa fase:** frontend già live in sola lettura; migration tecnicamente pronta ma **esecuzione BLOCKED** per recuperabilità non dimostrata e gate di autorizzazione non soddisfatto. Permessi live, editing, bozze e categorie operative non attivati. SEO/404/URL WooCommerce/301/GSC già collegata tramite Windsor restano TODO successivo.
