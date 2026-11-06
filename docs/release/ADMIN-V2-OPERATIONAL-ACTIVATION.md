## Stato conclusivo: procedura definitiva, nessuna esecuzione live

La preparazione è chiusa con questa PR documentale; non restano nuove analisi o prove applicative da richiedere per chiuderla. Il solo livello read-only è consegnato. Il livello operativo resta BLOCKED: recovery completo non dimostrato, autorizzazione migration mancante, ruolo Marco/canary e decisioni commerciali non approvati. Le procedure sotto sono riferimenti per eventuali operazioni future, non un impegno ad avviarle dopo la sessione. Export completo vietato; nessun nuovo tool/ambiente/servizio proposto per oggi.

**Sequenza esatta già preparata:** autorizzazione concreta sul target/checksum e copertura recovery → transazione unica col SQL invariato e history/postcondizioni → lettura schema/RPC/RLS → backend compatibile ancora OFF → capability minima separatamente approvata → DRAFT/SKU approvato → verifica account Marco → altre capability per passi → eventuale frontend compatibile → lettura non distruttiva. Shopify sync non è implicita.

**Rollback nominativo, solo se autorizzato e tutte le quattro tabelle ancora vuote:** nella medesima transazione, funzioni `public.admin_finish_categories(uuid,uuid,uuid[])`, `public.admin_complete_draft(uuid,uuid,text,jsonb)`, `public.admin_claim_draft(uuid,uuid)`, `public.admin_save_new_draft(uuid,uuid,text,jsonb,jsonb)`; poi tabelle `public.admin_category_operations`, `public.admin_operation_events`, `public.admin_product_shopify_links`, `public.admin_product_operations`; infine la sola voce history della versione applicata. Rimozioni con RESTRICT, mai CASCADE. Errore/dipendenza o righe presenti: arresto, niente cancellazione automatica. Prima del COMMIT vale il rollback integrale; dopo scritture si conservano journal e dati, non si applica questo down-schema. Nessun rollback live eseguito ora.

# Admin V2 — recovery minimizzato e gate operativo vigente

**Revisione successiva a `40f5ba9`: nessun export indiscriminato autorizzato.** Questa sezione sostituisce il precedente invito all'export completo. PR #46 solo preparatoria; main, migration live, flag, ruoli, Shopify e versione pubblicata invariati. Non creare staging, progetti o servizi. [Manifest](ADMIN-V2-ACTIVATION-MANIFEST.json).

## 1. Recovery gestito Lovable: disponibile, non dimostrato qui

Il [provider documenta](https://docs.lovable.dev/features/database-backups) il ripristino di schema e dati da snapshot giornalieri **sullo stesso database**. Non fornisce un clone isolato tramite quel comando; il ripristino comporta indisponibilità e perdita dei cambiamenti successivi al punto scelto. Non è PITR e non ripristina file Storage o codice frontend/backend. La retention dichiarata è circa 14 giorni; l'osservazione precedente del progetto mostrava 15 punti, ultimo 6 novembre 05:25:08 UTC: dato storico, non nuova attestazione di retention garantita.

La funzionalità e i pulsanti di restore sono disponibili; **nessun ripristino effettivo di questo progetto è stato eseguito**. Non provare “Restore to this backup” sul live e non considerare l'esistenza dello snapshot una prova di recuperabilità. Il dump completo del provider include anche account/hash password: **non avviarlo**. Non richiediamo più quell'export.

## 2. Ambito realmente interessato: distinguere DDL e future scritture RPC

SQL unico invariato: `docs/release/pending/20261031184521_admin_operational_drafts.sql`, SHA-256 **`ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`**. Server del progetto PostgreSQL 17.6; target configurato `iekwvvihjwghosqdxrdi` nel progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`.

| Momento | Oggetti e dati coinvolti | Copertura necessaria |
|---|---|---|
| Applicazione del solo DDL | Crea `admin_product_operations`, `admin_product_shopify_links`, `admin_operation_events`, `admin_category_operations`; quattro RPC e relativi indici/grant/RLS. | Nessuna riga commerciale viene aggiornata/inserita: CREATE FUNCTION non invoca la funzione. I quattro oggetti dati nuovi risultavano assenti alla verifica precedente. Nessun export di righe esistenti è necessario per provare questo solo delta. |
| Chiamata futura a `admin_save_new_draft` | Scrive `products`, `product_current_values`, `product_category_assignments` e journal; legge `user_roles`, `product_field_definitions`, `product_categories`. | Questa è una diversa fase, non autorizzata. Dopo scritture la sola rimozione delle tabelle nuove non recupera i dati preesistenti. |
| Chiamata futura a `admin_claim_draft` / `admin_complete_draft` | Legge ruolo e prodotto; aggiorna journal, link e audit nuovi. | Non eliminare journal/link o ricreare il prodotto in caso di esito incerto. |
| Chiamata futura a `admin_finish_categories` | Legge ruolo; aggiorna assegnazioni interne e journal categorie. | Ripristino dei valori prima/dopo e riconciliazione Shopify richiedono un piano dei dati dedicato; il solo DDL non basta. |

### Dipendenze riscontrate leggendo soltanto nomi nei cataloghi PostgreSQL

Sei tabelle preesistenti direttamente referenziate dal SQL/RPC: `public.products`, `public.product_current_values`, `public.product_field_definitions`, `public.product_categories`, `public.product_category_assignments`, `public.user_roles`.

La chiusura FK aggiunge `public.product_import_batches`, `public.product_category_source_map` e il riferimento a **`auth.users(id)`**. Quest'ultimo è una dipendenza di integrità, **non un'autorizzazione a esportare auth.users**. Non servono i suoi account reali per una prova strutturale. La tabella mappe Shopify non è usata da questa migration: i flussi backend successivi hanno un perimetro più ampio di questo pacchetto DDL.

Tipo applicativo: `public.app_role`. Trigger delle otto tabelle public dipendono da `update_updated_at_column`, `enforce_product_parent`, `protect_product_identity`, `enforce_category_hierarchy`, `protect_category_stable_key`, `recalc_category_descendants`, `mark_admin_field_pending_shopify_sync`. Le policy referenziano `auth.uid`, `public.can_edit_products`, `public.can_manage_taxonomy`, `public.has_role`. Sono presenti anche funzioni builtin UUID/hash/lock e ruoli di piattaforma `anon`, `authenticated`, `service_role`.

[FK/trigger: solo nomi](../admin-v2-evidence/2026-11-06-activation/dependency-names.json) · [Dipendenze policy: solo nomi](../admin-v2-evidence/2026-11-06-activation/policy-dependency-names.json). Nessuna riga applicativa, UUID personale, definizione di funzione, token o secret estratti. La chiusura FK e i nomi di trigger/policy **non sono una chiusura completa delle dipendenze procedurali PL/pgSQL**.

## 3. Percorso raccomandato ora: zero dati reali esportati

1. Conservare gli snapshot nel provider senza ripristinarli o scaricarli.
2. Preparare la prova del delta DDL e del ritorno allo schema locale usando i file versionati e fixture sintetiche; nessun account reale. Le prove PostgreSQL 16 già PASS rimangono evidenze del SQL, non prove di ripristino del DB produttivo.
3. Durante una futura migration approvata, usare un'unica transazione con postcondizioni; prima di abilitare capability, un eventuale rollback dello schema richiede verifica delle quattro tabelle nuove vuote e rimozione dei soli nuovi oggetti, mai CASCADE. Non esportare dati commerciali per simulare una dipendenza che può essere sintetica.
4. **Non chiudere il gate di recupero completo** con questa prova: il restore gestito del progetto non è stato dimostrato; un restore locale parziale non copre utenti, dati reali, Storage, job, configurazioni provider o cambiamenti concorrenti. Dopo qualsiasi scrittura le procedure e la copertura vanno rivalutate prima di procedere.

## 4. Export reale opzionale: solo DDL minimizzato, non eseguito

Non è necessario per la prima prova sintetica del delta. Se si vuole un confronto strutturale con il live, occorrono autorizzazione specifica **allo schema delle otto tabelle qui elencate** e una connessione PostgreSQL read-only già autorizzata. Il connettore Lovable SQL e l'export nativo completo non equivalgono a una connessione pg_dump selettiva: non ne è stata verificata la disponibilità; non leggere secret per procurarsela e non aggirare il limite scaricando tutto e filtrando dopo.

**Elenco chiuso, zero righe:** `public.products`, `public.product_current_values`, `public.product_field_definitions`, `public.product_categories`, `public.product_category_assignments`, `public.user_roles`, `public.product_import_batches`, `public.product_category_source_map`.

**Esclusi:** tutto auth (inclusa auth.users), Storage/Vault, account, hash/password, sessioni/token, credenziali, righe di user_roles e qualsiasi riga delle altre tabelle; nessun `pg_dumpall` o dump globale di ruoli. Le quattro tabelle operative non esistono ancora: non inventarne dati da salvare. Eventuali metadati owner/commenti possono essere personali: evitarli, non considerarli pubblici per definizione.

Comando **solo preparato, non avviato**, con strumenti 17 e PGSERVICE preventivamente configurato dal titolare senza credenziali nella riga di comando. La directory è persistente, fuori dal repository e non in una cartella sincronizzata; prima dell'export verificarne protezione e cifratura. Non creare servizi o abbonamenti:

```sh
umask 077
OG_RECOVERY_ROOT="$HOME/Library/Application Support/OnlineGarden/Recovery/admin-v2-20261106"
mkdir -p "$OG_RECOVERY_ROOT"
chmod 700 "$OG_RECOVERY_ROOT"
# Non eseguire senza consenso e connessione read-only autorizzata.
PGSERVICE=og_admin_metadata_export pg_dump \
  --format=plain --schema-only --strict-names \
  --no-owner --no-comments --no-security-labels \
  --table=public.products \
  --table=public.product_current_values \
  --table=public.product_field_definitions \
  --table=public.product_categories \
  --table=public.product_category_assignments \
  --table=public.user_roles \
  --table=public.product_import_batches \
  --table=public.product_category_source_map \
  --file="$OG_RECOVERY_ROOT/admin-v2-tables-schema.sql" \
  2>"$OG_RECOVERY_ROOT/export-private.err"
chmod 600 "$OG_RECOVERY_ROOT/admin-v2-tables-schema.sql" "$OG_RECOVERY_ROOT/export-private.err"
```

Il formato è SQL plain: `--no-owner` opera sull’output, mentre in un archivio custom non elimina da solo i metadati owner. Verificare in privato assenza di COPY/INSERT di dati, account e metadati personali inattesi; nel report condivisibile soltanto checksum, dimensione, scope e risultato. Se emergono contenuti non consentiti, fermare l'uso e non caricarli in CI/chat/GitHub. Mantenere ACL nell'archivio (non usare `--no-privileges`); owner esclusi vanno dichiarati, non ricostruiti per supposizione. Policy/trigger possono contenere riferimenti che richiedono revisione privata. Nessun dato reale ottenuto con questo comando in questa fase.

**Limite essenziale:** `pg_dump -t` non include automaticamente tipi/funzioni/dipendenze esterne. Questo file di sole tabelle non è autonomamente ripristinabile e **non è un backup completo**, neppure dello strato applicativo. Non va etichettato “restore PASS” dopo aver rimosso FK, trigger o ACL che falliscono. Le dipendenze devono essere fornite da DDL revisionato; usare stand-in auth significa prova sintetica, non recupero autenticazione. [Limiti documentati PostgreSQL](https://www.postgresql.org/docs/17/app-pgdump.html).

Una copia eventuale deve restare in una posizione persistente protetta e avere una seconda copia cifrata in un supporto già disponibile concordato col titolare. `/private/tmp` è ammesso solo per scratch del cluster: **mai unica copia di backup**. Nessuna directory di backup/dump reale è stata creata ora.

## 5. Procedura locale preparata, PostgreSQL 17, senza dati sensibili

**Non eseguita:** non ripetere le suite applicative PASS. È una procedura mirata di prova strutturale futura, non uno staging aggiuntivo. Usare PostgreSQL 17 per server, pg_dump e psql; il solo pg_dump/pg_restore 16.15 osservato non basta contro un server 17. Non affermare compatibilità o successo finché non verificati.

1. Individuare binari 17 approvati; avviare un cluster locale temporaneo dedicato con `listen_addresses=''`, solo socket Unix in scratch e nomi DB `og_admin_test_*`. Nessun secret/provider/job/integrazione del live. Non installare o avviare estensioni che facciano chiamate esterne.
2. In un DB sorgente locale vuoto, applicare `scripts/fixtures/admin-operational/bootstrap.sql` e le cinque migration baseline già usate in `scripts/test-admin-operational-db.mjs` (`20260817090243`, `20260817092126`, `20260817092153`, `20260817092305`, `20260817103437`), **senza eseguire assertions.sql o suite applicative**. La fixture crea solo uno stand-in auth.users con colonna id e nessun account reale; non copiarlo dalla produzione.
3. Salvare lo schema **public di quella fixture locale** prima del nuovo DDL, in archivio schema-only persistente protetto, senza auth e senza righe:

```sh
# Variabili esplicite di cluster locale; non usare PGSERVICE del live.
pg_dump -h "$OG_LOCAL_SOCKET" -p "$OG_LOCAL_PORT" -d og_admin_test_recovery_source \
  --format=plain --schema-only --schema=public --no-owner --no-comments \
  --file="$OG_RECOVERY_ROOT/synthetic-baseline-public.sql"
```

4. Nel DB sorgente locale, applicare il file originale `docs/release/pending/20261031184521_admin_operational_drafts.sql` con psql `-X -v ON_ERROR_STOP=1 --single-transaction`. Verificare solo nuovi oggetti e RLS/ACL, quattro tabelle vuote e invarianza dello schema precedente. Provare il rollback transazionale/degli oggetti nuovi nel solo cluster locale; non presentarlo come restore di snapshot Lovable.
5. In un **secondo DB locale vuoto**, creare solo `auth` e gli stand-in indispensabili `auth.users(id uuid primary key)` e `auth.uid() returns uuid` con risultato nullo; i ruoli anon/authenticated/service_role esistono già nel cluster dalla fixture. Non caricare account o hash. Ripristinare il public sintetico:

```sh
psql -X -h "$OG_LOCAL_SOCKET" -p "$OG_LOCAL_PORT" -d og_admin_test_recovery_target \
  -v ON_ERROR_STOP=1 --single-transaction \
  -f "$OG_RECOVERY_ROOT/synthetic-baseline-public.sql"
```

6. Confrontare sorgente baseline e target per oggetti, colonne, constraint, definizioni di funzioni, grant e RLS; confermare assenza degli oggetti operativi nel baseline recuperato, zero righe reali ed esito senza errori. Gli owner rimappati e gli stand-in vanno riportati come differenze, non nascosti. Mantenere report e hash nella directory persistente; GitHub riceve soltanto esito sanificato e limiti. Arrestare solo il cluster locale creato.

Questa prova, se PASS, dimostra **soltanto il ripristino dello schema della fixture e la reversibilità del delta**. Non dimostra recupero di dati produttivi, utenti/ruoli effettivi, provider Auth, job, funzioni non presenti nella fixture, Storage o capacità di restore in-place del progetto. Il precedente PASS PostgreSQL 16 resta separato; il manifest mantiene `restoreVerified=false`.

## Gate separato: approvazione della sola migration

Solo dopo una valutazione esplicita delle coperture di recovery sotto (senza trasformare una prova strutturale in recupero completo), presentare al proprietario un'unica operazione concreta con target, versione e checksum sopra, manifest backup verificato e rollback qui definito. La frase di autorizzazione dovrà nominare `iekwvvihjwghosqdxrdi`, il progetto Lovable, `20261031184521` e il relativo SHA-256. **Non include deploy, flag ON, nuovi ruoli, mapping categorie o mutation Shopify.** Un eventuale consenso all'export DDL minimizzato non equivale ad approvazione della migration. Il precedente consenso richiesto per export completo è ritirato: quel percorso non è autorizzato.

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

**Stato finale di questa fase:** frontend già live in sola lettura; migration tecnicamente pronta ma **esecuzione BLOCKED** per recuperabilità completa non dimostrata e gate di autorizzazione non soddisfatto; la procedura limitata al DDL è preparata, non eseguita. Permessi live, editing, bozze e categorie operative non attivati. SEO/404/URL WooCommerce/301/GSC già collegata tramite Windsor restano TODO successivo.
