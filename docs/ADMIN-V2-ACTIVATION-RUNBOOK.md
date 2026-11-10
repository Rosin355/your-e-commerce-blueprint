## Stato corrente — canary revocato, caricamento in attesa del permesso file

Il master `PRODUCT_ADMIN_WRITES_ENABLED=true` è stato salvato dopo conferma puntuale e letto live alle **16:32:54 CET del 10/11/2026**. Durante il blocco degli input è stato revocato **il solo scope temporaneo**, impostando `PRODUCT_ADMIN_CANARY_SCOPE=null` tramite il normale aggiornamento Lovable. La diagnostica autenticata delle **17:04:03 CET** conferma **true / canary / false** e, separatamente, **“modifica campi non abilitata” / “Modifiche non autorizzate per questo account o perimetro di collaudo”**. Il master ON non equivale quindi ad autorizzazione effettiva. Shopify create/sync, categorie e approvazione operazione restano OFF/null; zero grant ordinari.

Il proprietario ha confermato l’abilitazione del controllo Chrome, ma il canale desktop nativo non risponde ancora. Gli input dell’estensione sono poi tornati funzionanti: il form locale della sola bozza tecnica è compilato, senza salvataggio. Il file chooser ha però rifiutato la selezione perché l’estensione ChatGPT richiede **“Consenti l’accesso agli URL dei file”**. Richiesta al proprietario la sola opzione prevista dal browser; nessun aggiramento, token o sessione esportati. Il ripristino dello scope esatto upload/save fino alle 17:40 CET è predisposto ma **non salvato**, in attesa della conferma puntuale. Non riutilizzarlo dopo la scadenza.

Lettura SQL successiva al rifiuto del file chooser: **0 prodotti per lo SKU tecnico, 0 operazioni per la request key approvata, 0 media caricati, 0 grant ordinari abilitati**. Nessuna pubblicazione o scrittura Shopify eseguita. **Accettazione integrata NON PASS; consegna operativa al cliente NON conclusa.** La registrazione del cliente resta rinviata dal proprietario. Migration, backend e frontend già distribuiti restano disponibili; nessun nuovo deploy per questo aggiornamento documentale. `restoreVerified=false`.

Controllo pubblico già eseguito sulla nuova build: homepage desktop 1512×771 e mobile 390×844, menu mobile, collezione e scheda pubblica caricati senza overflow osservato; nessuna azione carrello/checkout. Safari/iOS non attestati. Le sezioni successive conservano la cronologia del rilascio e non descrivono lo stato dei flag successivo a questa sezione.

---

## Stato live dopo il Publish — 10 novembre 2026, canary non ancora eseguito

**Migration e backend distribuiti; frontend pubblicato. Consegna operativa al cliente NON conclusa.** PR [#50](https://github.com/Rosin355/your-e-commerce-blueprint/pull/50) MERGED con commit di integrazione `096a435f0c0f6ba9722c67fbba2d1b8508678bc3`. CI applicativa, PostgreSQL 17.6 e GitGuardian SUCCESS sul candidato `5fbab624c60e81f7f90e72cbe3a740e3d97c662f` ([run](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42837086444)). Non esiste CI push su main: non attribuire al merge un check non eseguito.

- **Migration PASS:** originale e delta applicati in una sola transazione nativa Lovable, dopo consenso puntuale del proprietario. Le due history Supabase contengono gli SHA-256 esatti `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328` e `793fdc18a9c34e8575af3f9d74daac5ce0d04e666efccdaf733a3af202ba5d7c`. Sette tabelle RLS attiva/zero policy client, sei RPC service-only/search_path vuoto, nessun EXECUTE anon/authenticated. Nessun DELETE/TRUNCATE service_role sui nuovi journal. Il vecchio SECURITY DEFINER della sola RPC sync è preservato con ACL ristrette; nessun nuovo bypass RLS client.
- **File generati dal provider:** `drizzle/migrations/0015_admin_catalog_atomic_delivery.sql`, snapshot/journal Drizzle e tipi Supabase, integrati automaticamente sopra il merge, ultimo riferimento osservato `d9ad4902afeaae954bef56d1da0281cd2f17da57`. Il corpo applicato coincide con la proposta approvata salvo l’a capo finale; SHA file nativo `ee58531550b7e27c4003be80b5c9c43bbca7f689bc24f07d7f881669fceaa2b6`. Mantenerli come storico già applicato, non rieseguire il pacchetto. I sorgenti pending restano invariati.
- **Backend:** deploy mirato `product-admin-api` e guard `product-admin-ai` completato dal provider; codice funzioni identico alla revisione approvata. Impronte dei pacchetti inviati: API `b5b28ad35801dbf53de92d78997e157a5e26a36386635a11f18acb83727ed352`, AI `a52a2ac830a5e108421b4926b7a3bf4cfd93fb9b9055094bb89f7f78a24c73b0`. Non sono hash del bytecode riletto dal runtime. Prova live negativa dell’API: singola richiesta senza sessione rifiutata con `401 UNAUTHENTICATED / Token mancante`, prima dell’azione. Nessuna scrittura eseguita dalla prova. Il guard AI autenticato non è ancora collaudato live.
- **Frontend:** Publish Lovable `885640f0-b94e-4220-989c-dff4677b8125`; `onlinegarden.it/admin/settings` serve il marker DOM **`admin-delivery-20261110-r1`**. Diagnostica autenticata **16:07:40 CET: false / canary / false, READ-ONLY**. Dopo i soli file generati, typecheck/build PASS e tutti i 68 asset locali identici alla build del codice revisionato. Il tentativo opzionale di confrontare un asset con un client HTTP esterno al browser è stato rifiutato 403: non è usato come prova del contenuto live; vale il marker letto nel browser autenticato.
- **Configurazione canary parziale:** creati tramite strumento nativo i sei flag preparatori, inclusi scope esatto a scadenza, DRAFT interno ON richiesto, Shopify create/sync e categorie OFF, approvazione operazione nulla. Valori salvati write-only: non dedotti dall’inventario dei nomi. Il master esistente non è aggiornabile dal connettore; il suo passaggio a true è predisposto in UI e attende consenso al momento dell’azione. Ultimo runtime verificato master/sync OFF. Nessun prodotto o file caricato, nessun grant ordinario assegnato.
- **Account cliente:** assente in Auth al lookup esatto; registrazione rinviata dal proprietario. Nessun ruolo, account, password o capability attribuiti ad altri. Lo scope tecnico non è una sessione Marco. Unico DRAFT tecnico previsto, ancora non creato; nessuna pubblicazione commerciale provata o eseguita.
- **Recovery:** snapshot gestito `2026-11-10T05:26:11Z`, sorgente precedente archiviato, journal conservati. Rischio senza restore distruttivo accettato esplicitamente; **restoreVerified=false**. Nessun restore generale, export account o modifica a checkout/pagamenti, A/B, Sendcloud, inventario commerciale, SEO/redirect/GSC, clienti/ordini.

Le sezioni successive conservano la cronologia e non annullano questo stato più recente. Il salvataggio del master e il percorso DRAFT non sono attestati finché non vengono osservati.

---

## Consegna operativa Admin V2 — esecuzione 10 novembre 2026

Gate prima del master ON: distribuire esclusivamente `product-admin-api` e il guard `product-admin-ai` già integrato, che rifiuta le operazioni AI in modo canary. Il precedente sorgente AI noto permetteva agli admin alcune operazioni con master ON; lasciarlo invariato allargherebbe il perimetro. Nessuna feature AI aggiunta o abilitata; mantenere `PRODUCT_ADMIN_WRITE_MODE=canary` globale. Backend catalogo ordinario deriva dal grant utente esatto, non dal passaggio globale a full.

PR di completamento [#50](https://github.com/Rosin355/your-e-commerce-blueprint/pull/50) **MERGED** il 10/11/2026 alle 14:46:08 UTC, main `096a435f0c0f6ba9722c67fbba2d1b8508678bc3`. [CI applicativa/PostgreSQL 17.6](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42837086444) e GitGuardian SUCCESS su HEAD `5fbab624c60e81f7f90e72cbe3a740e3d97c662f`; codice integrato identico. Nessun bypass; repository senza branch protection/ruleset applicati al momento della verifica. Il workflow non esegue CI push/deploy su main: nessun PASS CI del merge dedotto. Operatività live ancora non dichiarata.

**Stato corrente: codice di completamento implementato; rilascio produttivo e accettazione NON conclusi.** Questo mandato autorizza migration additiva, backend, build operativa, un solo DRAFT tecnico e capability catalogo minime; supera i precedenti vincoli “solo preparazione” nel solo perimetro dichiarato. Le sezioni successive sono cronologia, salvo evidenze più recenti registrate esplicitamente.

- Partenza dal main effettivo `1324f0536eef3ff33ce43b8d74d84ba5307244a7`; PR #42/#46/#47 già integrate. Una sola PR di completamento; SEO #49 separata.
- Runtime live autenticato riletto il **10/11/2026 alle 15:18:56 CET**, origine `https://onlinegarden.it`: **false / canary / false**, stato **READ-ONLY**. Sessione tecnica, non sessione Marco. Nessuna attivazione deriva da questa lettura.
- L’account cliente indicato privatamente non esiste in Auth. Il proprietario ha rinviato registrazione/verifica: nessun account creato, nessuna password/codice richiesti, nessuna capability attribuita ad altri utenti. L’abilitazione cliente resta da eseguire sull’identità verificata.
- Implementati conferma UI + approvazione server persistita, actor/action/hash/versione/scadenza, claim singolo/audit, immagini da computer e READY, prezzi per variante, categorie editoriali manuali con identità verificata, pubblicazione separata sul canale Headless con controllo A/B. Salvataggio/invio iniziale sempre DRAFT; prodotto tecnico escluso dalla pubblicazione.
- Nessuna migration applicata, nessun deploy/Publish o flag produttivo modificato, nessun prodotto tecnico/commerciale scritto in questa fase. Il flag Vite nel codice prepara la futura build operativa; il default del codice resta fail-closed se manca l’esatto valore `true`. Merge, editor e sito pubblicato sono verifiche separate.
- Snapshot gestito osservato **2026-11-10T05:26:11Z**. Il proprietario accetta il rischio senza restore distruttivo di prova; **restoreVerified=false**. Sorgente backend precedente nota conservata e frontend precedente recuperabile; non è disponibile uno SHA attestabile del bundle backend attualmente in esecuzione.

### Change autorizzato e preflight

Riferimento: `OWNER-ADMIN-DELIVERY-20261110`. Target esclusivo Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5` → Supabase `iekwvvihjwghosqdxrdi`, database `postgres`, server 17.6. Verificati tramite connettore del progetto: dipendenze presenti, zero collisioni delle sette nuove tabelle/cinque nuove RPC, zero righe history per le due versioni. La RPC di sync preesistente ha impronta MD5 `31ed209facb8c8f31b1778460f85b7b3`, identica alla definizione originaria ricostruita nella fixture; nessun EXECUTE client e nessuna policy client sul command log.

Migration originale invariata: `20261031184521_admin_operational_drafts.sql`, SHA-256 `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`. Delta minimo: `20261110135043_admin_catalog_client_delivery.sql`, SHA-256 `793fdc18a9c34e8575af3f9d74daac5ce0d04e666efccdaf733a3af202ba5d7c`. Entrambe rimangono in `docs/release/pending`, fuori dalle migration automatiche. Il generatore offline `scripts/prepare-admin-catalog-delivery.mjs` produce un unico pacchetto BEGIN/COMMIT: lock, identità/versione, collisioni/history, DDL originale, delta, ACL/RLS/RPC/search_path, history solo dopo postcondizioni. Nessun metacomando psql o autocommit parziale equivalente ammesso. Il trasporto produttivo deve garantire la stessa transazione prima dell’applicazione; il connettore SQL generico non è ancora provato per questo batch.

### Decisione recovery del proprietario

Accettato esplicitamente il rischio di procedere senza restore distruttivo dimostrato, con snapshot identificato, DDL atomico, sorgenti precedenti recuperabili e journal per i soli campi scritti. Archivio protetto del backend noto `4f5bdefdd5e4f482f8fc3d6f5cb8662f2276a666`, SHA-256 archivio `844f6cde25299e678931eff0cc34c118222955168dc464d244a936b602e966ad`: solo codice, nessun ambiente/secret/riga. È l’ultimo sorgente noto da un precedente deploy, non prova dello SHA runtime corrente. Frontend precedente: contenuto `1ad61826c01ade2821f6c1577a3bd1555d0ab899`, deployment `00a243b8-240f-48bf-8507-202d352fc4f4`.

Rollback: revocare solo capability difettose o master in emergenza, ripubblicare pacchetti compatibili, conservare journal/dati; compensazioni solo con confronto delle versioni correnti. Nessun DROP CASCADE, restore storico generale, cancellazione automatica DRAFT o compensazione cieca. Snapshot e fixture non dimostrano ripristino completo: `restoreVerified=false`.

### Capability e sequenza di attivazione

Account ordinario: ruolo reale `editor` più grant service-only su `admin_catalog_capabilities`; intersezione con allowlist server dei campi. Nessun grant per ruolo aggregato, email dal browser, user_metadata, tech_admin o altro account. Ogni comando ordinario richiede conferma UI e `admin_catalog_approvals`: actor, azione, target derivato dal comando, hash, versione/snapshot, scadenza 10 minuti, chiave idempotente, claim atomico e risultato. Revoca capability ricontrollata al claim. Scritture incerte bloccano nuovi invii; recovery DRAFT non ricrea Shopify, usa la stessa operazione ed è distinto dal lock della creazione incerta. Immagini possedute dal medesimo attore, JPEG/PNG <=5 MB, limiti dimensionali, upload server-side e attesa READY; nessuna credenziale inviata al browser.

Il modo globale resta canary per il tecnico, limitato a identità/SKU/ID effettivi. Il modo ordinario deriva solo dal grant esatto e consente il lavoro oltre il canary senza modificare secret per ogni prodotto. Nessun grant attuale: account cliente non ancora registrato. La pubblicazione verifica dati reali, immagini, profilo logistico e classi A/B per variante, canale Headless `338862113108` e lettura Storefront dopo la mutation; ACTIVE da solo non è PASS. Non sono stati pubblicati prodotti reali o tecnici. Nuovi prodotti tracciati, quantità non assegnate e inventoryPolicy DENY; eventuale pubblicazione esaurita richiede conferma esplicita.

Ordine restante: CI/GitGuardian sullo SHA integrabile → applicazione atomica verificata → deploy della sola API catalogo e del guard AI indicato sopra, con capability ordinarie assenti → Publish della build `admin-delivery-20261110-r1` → unico percorso DRAFT tecnico → rimozione sola autorizzazione canary → abilitazione del cliente dopo registrazione verificata. Nessun workflow GitHub pubblica frontend/backend o applica DDL automaticamente.

### Stato connettore Lovable

La verifica read-only del provider non espone lo SHA runtime. Il tool di deploy interno può limitarsi a `product-admin-api`, ma usa il checkout del progetto: verificare SHA/diff prima di distribuirlo. Il riepilogo `plan--show` con `{"path":".lovable/plan.md"}` è stato approvato dal proprietario **solo come riepilogo tecnico**, senza operazioni produttive. Durante la verifica Lovable ha scritto il proprio file di piano e aggiornato file generati di auth preview/tipi. Gli aggiornamenti di main sono conservati; il broker preview non si applica all’host onlinegarden.it. Due dipendenze di sviluppo aggiunte automaticamente ma non usate sono rimosse nel completamento per mantenere package.json coerente con il lockfile, senza nuove dipendenze applicative. Ogni nuovo consenso obbligatorio dello strumento resta distinto dal mandato generale.

---

## Integrazione sicura PR #47 — attestazione proprietario del 9 novembre 2026

Il proprietario attesta uno screenshot autenticato di `https://onlinegarden.it/admin/settings`, letto il **09/11/2026 alle 19:16:37 CET**: `writesEnabled=false`, `writeMode=canary`, `shopifySyncEnabled=false`, stato **READ-ONLY**. Fonte: dichiarazione esplicita del proprietario in chat; immagine non allegata a questo registro né ispezionata dall’agent. Nessuna email o credenziale registrata. Questa attestazione aggiornata sostituisce il blocco dovuto alla precedente impossibilità di rileggere Chrome; non dimostra una cronologia completa dei secret.

È autorizzata l’integrazione del solo codice tramite [PR #47](https://github.com/Rosin355/your-e-commerce-blueprint/pull/47), senza pubblicazione. **Stato MERGED e commit main effettivo fanno fede nel registro GitHub della PR**; prima del merge questa nota è preparatoria. Il nuovo commit documentale non modifica codice, configurazioni o migration. CI/GitGuardian devono essere verdi sull’HEAD effettivamente integrato.

Dopo l’integrazione, Livello B presente nel codice ma disabilitato; Livello A resta la versione pubblicata `admin-readonly-20261106-r1`. Frontend operativo solo con build esplicita e valore esatto `true`; default read-only, nessuna preferenza locale lo abilita. Migration `20261031184521` invariata e fuori dal percorso automatico; nessun nuovo SQL nel percorso migrations. Workflow GitHub limitato ai check pull_request, senza job deploy. La sincronizzazione del codice Lovable non equivale a pubblicazione, deploy Edge o applicazione SQL; nessuna di queste azioni è autorizzata o eseguita da questa integrazione.

L’ultima lettura attestata mantiene scritture e sync **OFF**. Recovery produttivo **non dimostrato**, identità/ruolo Marco **non verificati**, zero mapping categorie approvati; nessun canary autorizzato. L’attivazione operativa resta BLOCKED dal change operativo e dai suoi prerequisiti; il merge non li chiude. Payments, checkout, spedizioni A/B, Sendcloud, inventario, prodotti e SEO invariati.

# Admin V2 Livello B — gate finali e change definitivo, 9 novembre 2026

**Livello A già live. Livello B implementato nel branch, ancora non operativo in produzione.** Nessuna migration, distribuzione, abilitazione o assegnazione di ruolo eseguita. Il lavoro locale preesistente è preservato: sviluppo in copia separata da `main@885420429986fb2dba739c75d55fe4e8da844ab9`.

| Stato | Contenuto |
|---|---|
| Già live | `admin-readonly-20261106-r1`, consultazione. Diagnostica riconfermata 9/11 ore 16:19:57 CET: master `false`, modo `canary`, sync `false`. |
| Pronto nel codice | Endpoint operativi e query già collegate, form bozze, accesso “Nuovo prodotto”, categorie non mappate visibili, azioni secondo ruolo, canary server su identità esatta, generatore SQL atomico. |
| Da attivare | Schema, backend compatibile, build frontend operativa e una capability alla volta, soltanto nel change approvato. |
| Bloccato da autorizzazioni/evidenze | Recovery effettivo non dimostrato; consenso migration assente; account/ruolo Marco e SKU/operazioni canary non confermati; zero mapping commerciali approvati. |

## Scheda change definitiva — evidenze e autorizzazioni ancora bloccanti

Il titolare approva un solo change con le fasi elencate e i rispettivi punti di arresto. **Decisione definitiva: codice candidabile al merge con CI/GitGuardian sul nuovo HEAD; rilascio operativo BLOCKED. Scheda NON approvabile per esecuzione: recovery e identificativi mancanti.** Nessun consenso generico può trasformare una voce mancante in PASS.

- Target: Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5` → Supabase `iekwvvihjwghosqdxrdi`, DB `postgres`, PostgreSQL 17.6. Identità corroborata dal `config.toml` letto tramite il progetto; il solo nome postgres non identifica il target.
- SQL originale: `docs/release/pending/20261031184521_admin_operational_drafts.sql`; versione `20261031184521`; SHA-256 **`ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`**. File e logica invariati.
- Recupero: ultimo snapshot visibile `2026-11-09T05:25:16Z`, **ripristino non dimostrato**. Da compilare: riferimento a prova di recupero realmente riuscita, perimetro coperto/escluso, RPO/RTO e responsabile; accettazione del downtime e dei dati successivi eventualmente persi. Non avviare un restore sul live per “provare” il gate e non esportare account/hash/token.
- Marco: **identità NON VERIFICATA; ruolo NON VERIFICATO**. Mancano identificativo confermato privatamente dal titolare e attestazione tramite la sua sessione. Non inserirlo nel repository. Nessuna attribuzione automatica di editor/admin/tech_admin.
- Canary: **SKU NON AUTORIZZATO; operationId NON AUTORIZZATO; attore NON AUTORIZZATO**. Non è stato scelto alcuno SKU. Per l’esecuzione servono SKU nuovo o DRAFT esistente esplicitamente approvato, varianti esatte, attore, azioni/campi, requestKey UUID, scadenza UTC entro 24 ore, riferimento approvazione. Per modifica di un DRAFT esistente anche ID interno e Product GID. Nessun prodotto commerciale o pubblicazione inclusi.
- Rilascio: SHA finale di questa PR e CI/GitGuardian; approvazione delle fasi distribuzione e capability specificate; pacchetto backend precedente e relativo identificativo di deployment recuperabili dal provider prima della distribuzione (l'attuale UI mostra 178 deployment, non uno SHA attestato).
- Categorie: righe della [tabella commerciale](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md) esplicitamente decise. Attualmente 22 residue, zero mapping: l'attivazione delle categorie resta esclusa finché mancano le approvazioni.

Formula di consenso alla **sola migration**, utilizzabile solo dopo la compilazione delle evidenze: «Autorizzo su Lovable 95cad199-55fd-4870-9d5c-a2653edf88f5 / Supabase iekwvvihjwghosqdxrdi la sola migration 20261031184521 con SHA-256 ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328, nel change [riferimento], con piano di recupero [evidenza verificata] e rollback delle sole strutture nuove ancora vuote. Nessuna capability, ruolo o distribuzione è autorizzata da questa frase». Le altre fasi, se richieste nello stesso change, devono essere indicate esplicitamente e restano subordinate ai gate.

## Esito recovery e confini della decisione

**RECOVERY NON DIMOSTRATO.** UI del progetto riconfermata: 15 snapshot visibili, ultimo **9 novembre 2026, 05:25:16 UTC**. Percorso ufficiale: **Altro/More → Database → Manage → Backups → Restore to this backup**; comando non premuto.

Il provider ripristina struttura e dati nello stesso database, con indisponibilità temporanea e perdita delle modifiche successive; il ripristino non si annulla. Storage resta separato. Il codice non viene riportato automaticamente alla versione compatibile. L’export include account/hash, ma esclude codice Edge, secret, API key e impostazioni dei provider di accesso: resta vietato. La documentazione non dimostra qui recupero operativo di Auth/sessioni/configurazioni. Il restore ordinario è self-service per chi ha accesso di modifica; dopo il recupero è prevista verifica tecnica dell’app e degli eventuali disallineamenti. Non risulta necessaria una richiesta di assistenza per il normale comando; per attestazioni non disponibili servirebbe evidenza del provider, non un altro tentativo sul live. [Fonte ufficiale Lovable](https://docs.lovable.dev/features/database-backups).

Non esiste negli strumenti accessibili una prova read-only di restore riuscito: il solo percorso osservato sostituisce la produzione. Nessun restore, export o contatto all’assistenza eseguito. Questo gate si riapre soltanto con una prova di recupero già riuscita e pertinente al progetto; un consenso generico non è la prova.

| Gate definitivo | Stato reale / evidenza |
|---|---|
| Codice PR #47 | Ambito Admin V2, documenti e check pertinenti; nessuna modifica pubblica, dipendenza o migration originale. Compatibilità Livello A preservata dal default read-only. Nuova correzione limitata al Product GID nel recupero/creazione. |
| Merge del codice | Tecnicamente separabile dal deploy: nessun job di pubblicazione nel workflow; default frontend read-only; SQL fuori dal percorso automatico. Ammissibile soltanto con check finali verdi e master/sync ancora OFF. **Non eseguito da questa verifica**; nessun ulteriore blocco applicativo presunto. |
| Deploy operativo | **BLOCKED**, distinto dal merge; nessun deploy o flag modificato. |
| Capability live | 9/11 16:19:57 CET: writesEnabled=false, writeMode=canary, shopifySyncEnabled=false. Flag specifici non esposti dalla vecchia API: non verificati singolarmente, non dedotti. |
| Recovery | NON DIMOSTRATO; snapshot disponibile non è restore riuscito. |
| Marco | Identità e ruolo NON VERIFICATI; lette solo definizioni delle colonne profiles/user_roles, zero righe account. |
| Canary | Codice pronto; esecuzione **NON AUTORIZZATA**, SKU/attore/operationId assenti. Nessuna mutation o sync. |
| Categorie | 22 decisioni commerciali residue, zero mapping approvati/applicati; capability categorie non attivabile. |

**Unico riscontro richiesto al titolare:** restituire la scheda decisione con riferimento a una prova recovery già riuscita pertinente a questo progetto, conferma privata dell’account Marco e approvazione nominativa di SKU/attore/operazioni canary. Fino a quel riscontro, niente DDL, grant, flag ON o deploy operativo. Non occorre autorizzare nuovi audit o ambienti. Il consenso DDL resta una decisione successiva espressa con la formula specifica sopra e non nasce da questa verifica.

**Criteri STOP vincolanti:** recovery non dimostrato; identità/ruolo o SKU/operationId non attestati; approvazione assente/scaduta; checksum/target/history discordanti; GID diverso dallo scope o stato non DRAFT/non verificabile; campi/varianti fuori allowlist; capability non autorizzata; mapping categorie non approvato; CI/GitGuardian non verdi sullo SHA corrente; trasporto SQL non atomico. Nessun retry automatico di una create incerta. Sequenza e rollback sotto sono già completi: non serve ulteriore progettazione.

## Sequenza eseguibile dopo approvazione

1. Confermare solo identità volatile, checksum, recovery, master/sync OFF e assenza collisioni/history. Generare offline: `node scripts/prepare-admin-v2-activation.mjs /percorso/protetto/change-admin-b`. Lo script non apre connessioni, non applica SQL, non contiene credenziali e non sovrascrive file. Produce `preflight.sql`, `migration.sql`, `postflight.sql`, `rollback-empty.sql`.
2. Con il canale PostgreSQL autorizzato dal provider, eseguire preflight read-only. Se non esiste un trasporto autorizzato che mantenga una singola connessione/transazione, fermarsi: non suddividere il payload in chiamate autocommit.
3. Solo con **nuovo consenso esplicito**, usare `psql -X -v ON_ERROR_STOP=1 -v og_approval=RIF_CHANGE -v og_target=iekwvvihjwghosqdxrdi -v og_recovery=RIF_RECOVERY_VERIFICATO -f migration.sql` sulla connessione target preventivamente attestata. Le variabili sono riferimenti al change, non una prova automatica di approvazione o identità. Il file contiene BEGIN, lock timeout, lock cooperativo, collision checks, SQL originale, postcondizioni ACL/RLS/RPC, tabelle vuote e history nella stessa transazione, infine COMMIT. Non usare anche un secondo registratore migration del provider su questo payload.
4. Eseguire `postflight.sql` read-only: quattro tabelle con RLS senza policy client, quattro RPC invoker/search_path vuoto, privilegi client negati e privilegi service richiesti presenti. Il provider ha default grant service_role più ampi del minimo GRANT: non cambiare default globali o permessi di ruoli. Qualunque errore prima di COMMIT annulla DDL e history; dopo un esito incerto rileggere entrambi prima di agire.
5. Solo con fasi di deploy approvate e gate completi, distribuire backend `product-admin-api` e la chiusura canary di `product-admin-ai`, con master, sync, drafts, draft-Shopify e categories OFF. Contesto backend atteso: `backendVersion=admin-operational-b-20261109-r1`. I sorgenti sono già collegati: la vecchia patch è ritirata; non serve un'altra fase di progettazione.
6. Preparare/pubblicare frontend con `VITE_ADMIN_OPERATIONAL_RELEASE=true` solo dopo backend compatibile e approvazione. Il default rimane sola lettura; flag runtime/localStorage non possono cambiare la build. Una build locale di entrambe le modalità non equivale a deploy. Annotare SHA/versione/deployment effettivi.
7. Verificare Marco con la procedura minima sotto. In canary editor non scrive: usare solo l'operatore admin/tech_admin **esplicitamente approvato**, senza promuovere Marco. Un successivo accesso editor in modo full richiede approvazione dell'ampliamento del perimetro.
8. Attivare soltanto la fase canary approvata. Per una nuova bozza: master + drafts e scope esatto save/requestKey → una bozza interna → approvazione operativa per operationId/scadenza → flag draft-Shopify per una sola creazione DRAFT → pin degli ID risultanti nello scope → editing dei soli campi autorizzati. Gli altri flag restano OFF. Non modificare il payload salvato prima dell'invio; gli esiti incerti si recuperano sulla stessa operazione senza una seconda creazione.
9. Categorie solo dopo mapping commercialmente approvati e scope/hash specifici. Sync a campo singolo è separata e rimane OFF salvo esplicita inclusione nel change. Nessuna sync massiva, pubblicazione, modifica varianti esistenti, A/B, checkout, pagamenti o Sendcloud.
10. Dopo il solo canary autorizzato, master e flag aperti tornano OFF; registrare esito e audit sanificati. Mancata accettazione o scadenza interrompono il passaggio successivo.

## Configurazione server canary: formato esatto

`PRODUCT_ADMIN_CANARY_SCOPE` usa il seguente schema. I valori segnaposto sono volutamente invalidi: compilazione privata nel change, nessuna configurazione live effettuata. Il primo passo può autorizzare soltanto il salvataggio interno; non aggiungere tutte le azioni per comodità.

```json
{
  "projectRef": "iekwvvihjwghosqdxrdi",
  "approvalRef": "RIFERIMENTO_CHANGE_APPROVATO",
  "actorId": "UUID_OPERATORE_VERIFICATO",
  "sku": "SKU_APPROVATO",
  "variantSkus": ["SKU_VARIANTE_APPROVATO"],
  "requestKey": "UUID_RICHIESTA_APPROVATA",
  "productId": null,
  "shopifyProductId": null,
  "actions": ["save_new_product"],
  "fieldKeys": [],
  "expiresAt": "SCADENZA_ISO_UTC_ENTRO_24_ORE"
}
```

Per prodotto a formato unico, SKU famiglia e variante coincidono. Per più formati restano i controlli già esistenti: SKU distinti, una opzione Formato, massimo 50 varianti e nessun duplicato case-insensitive. Per create/recover conservare requestKey/SKU/varianti del save, autorizzare solo l'azione prevista e impostare anche l'approvazione operativa esistente `{"action":"create_shopify_draft","target":"UUID_OPERATION_ID_SALVATA","expiresAt":"SCADENZA_UTC"}`. Per editing successivo compilare productId e shopifyProductId con gli ID verificati, actions con i soli comandi approvati e fieldKeys con i soli campi approvati. La sola allowlist non abilita un flag e non approva un mapping.

Le capability booleane effettive sono esposte dal nuovo get_admin_context in `operationalCapabilities`; nessun valore di secret o scope completo viene restituito. Scadenza o master OFF bloccano nuovi comandi; una riconciliazione successiva richiede una nuova finestra approvata della stessa operazione.

## Verifica minima di Marco mediante la sua sessione autenticata

Lo schema applicativo identifica gli utenti tramite UUID (`profiles.id`, `user_roles.user_id`), ma non abbiamo una corrispondenza autorizzata persona Marco ↔ UUID. Questo non dimostra che Marco non abbia un account: impedisce soltanto di attribuirgli un ruolo senza il dato confermato. Nessun valore di nome, email, telefono o ruolo di altri utenti è stato letto.

Metodo minimo, già compatibile con l’API disponibile: Marco apre `https://onlinegarden.it/admin/settings` in un profilo browser dedicato e accede personalmente; il titolare conferma privatamente che l’account mostrato è quello concordato. Nella risposta della sua richiesta `get_admin_context`, leggere solo `roles`, `canWrite`, `writesEnabled`, `writeMode` e `shopifySyncEnabled`. Il server verifica il JWT con `auth.getUser()` e legge `user_roles` per il solo utente autenticato; il body non può scegliere identità o ruolo. Registrare nel change soltanto account confermato sì/no, ruolo restituito, ambiente, orario ed esito; non esportare risposta completa, header, token, cookie o HAR. Una sessione admin dell’operatore non vale come sessione di Marco. Accesso negato o risposta incompleta mantiene BLOCKED e non autorizza grant.

Se serve la corroborazione SQL, il titolare identifica privatamente l'account corretto. Con quell'unico UUID, l'operatore autorizzato esegue soltanto `SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = :account_uuid) AS account_exists` e `SELECT role::text FROM public.user_roles WHERE user_id = :account_uuid`. Parametro SQL tipizzato UUID e fornito fuori da Git; nessuna ricerca per nome, lista account o lettura email/hash/sessioni. Marco accede con il proprio account e confronta le azioni con il ruolo restituito dal server. Registrare solo esistenza, ruolo, esito e riferimento al change; non salvare l'UUID nei report condivisi. Se assente o ambiguo, fermarsi senza grant.

## Rollback e verifica conclusiva

Prima del COMMIT: rollback integrale della transazione. Dopo COMMIT e prima di ogni scrittura: solo con consenso, `rollback-empty.sql` verifica la history del medesimo pacchetto, blocca le quattro tabelle, controlla che siano vuote, rimuove quattro funzioni e quattro tabelle con RESTRICT e la sola history 20261031184521. Dati presenti, history divergente o dipendenze inattese causano arresto; nessun CASCADE. Se il provider ha registrato statements con forma diversa, non forzare il controllo: usare la history realmente attestata in una revisione autorizzata.

Dopo una scrittura: capability OFF; preservare journal/link/audit e conservare i valori prima/dopo. Il down-schema non è recupero dati. Un eventuale annullamento usa compensazione esplicita della stessa operazione, nuova verifica versione/identità e rilettura; un timeout Shopify non autorizza reinvio o cancellazione. Restore gestito soltanto con piano già verificato e consenso a downtime/perdita dei dati successivi. Per il codice, chiudere prima i flag, poi ripristinare pacchetto backend precedente e frontend `1ad6182` / deployment `00a243b8-240f-48bf-8507-202d352fc4f4`, verificando consultazione. Nessun rollback eseguito in questa sessione.

- [ ] Recovery realmente dimostrato e change completo/approvato; assenza di dati personali nei report.
- [ ] Hash originale, target, preflight, transazione/history e postflight coerenti.
- [ ] Backend e frontend identificati; versione e capability reali rilette, nessun ON involontario.
- [ ] Account Marco verificato senza nuovi ruoli; azioni UI coerenti con ruolo.
- [ ] Canary limitato allo SKU/operazione approvati; audit e idempotenza preservati, DRAFT non pubblicato.
- [ ] Categorie prive di decisione restano non applicabili; journal conservati; nessun duplicato.

GSC, analisi 404 e redirect 301 restano TODO successivi. I precedenti PASS SQL/PostgreSQL/browser restano evidenze riutilizzate; non sono una prova di restore Lovable né una nuova accettazione Safari/cliente.

---

## Archivio precedente al completamento tecnico del 9 novembre

Le sezioni sottostanti conservano le evidenze storiche. Per stato, sequenza e autorizzazioni vigenti prevale la sezione del 9 novembre sopra. I riferimenti a staging aggiuntivo, export completo o applicazione della patch differita non sono istruzioni attuali.

## Chiusura definitiva della preparazione — 6 novembre 2026

**Ciclo tecnico/documentale CHIUSO. Livello A CONSEGNATO; Livello B BLOCKED.** La chiusura non equivale ad attivazione completa. Nessun nuovo audit, ambiente, strumento, servizio o test applicativo manuale; nessuna migration, export, modifica di dati/flag/permessi o pubblicazione eseguita in questa chiusura.

| Livello | Stato verificabile e consegna |
|---|---|
| A — consultazione | Già pubblicato: dashboard, catalogo, ricerca nome/SKU, tipo prodotto, filtro valori da verificare, paginazione, navigazione e dettaglio. Consultabile dagli account autorizzati; accesso personale Marco non ancora attestato. Filtri avanzati categoria/completezza/sincronizzazione/non classificati disabilitati, non consegnati come funzionanti. |
| B — operatività | SQL e codice differito preparati e testati nelle fasi precedenti; migration/nuove tabelle/RPC non attivate, editing e bozze/recovery/categorie/sync non operativi. Nessuna capability accesa. |

**Versione live attestata:** `admin-readonly-20261106-r1`, contenuto `1ad6182`, deployment `00a243b8-240f-48bf-8507-202d352fc4f4`; riferimento alla verifica live del 6 novembre ore 18:00:09 CET, con `writesEnabled=false / writeMode=canary / shopifySyncEnabled=false`. Non è un nuovo smoke: le evidenze già PASS sono riutilizzate, nessun codice live cambiato.

**Coerenza finale:** base PR #46 `3296a7669216ff1082ff74f5c52cec396af27acf`, ripresa da `f369ca5`; migration invariata con SHA-256 `ce63ea211dd7b5f08e222f7b462afc5719a276782a80bca52c1b69abd29cf328`. L'HEAD conclusivo/check/merge effettivi sono registrati nella descrizione della PR per evitare un riferimento circolare al commit documentale. È autorizzato soltanto il merge documentale dopo CI/GitGuardian PASS; nessun deploy Lovable incluso.

**Tre limiti operativi residui, senza nuovi filoni:** (1) recovery produttivo completo non dimostrato e specifica approvazione migration assente; (2) account/ruolo Marco non collegabili univocamente alle fonti accessibili, senza un identificativo confermato dal proprietario; non inferire dal nome o dal conteggio admin; (3) decisioni commerciali categorie e attivazione controllata delle capability/canary DRAFT non approvati. La tabella delle 22 decisioni è finalizzata, zero mapping applicati. WebKit resta non certificato secondo il limite già registrato, senza nuovi tentativi.

**Indicazione conclusiva al proprietario:** consegnare il Livello A come versione di consultazione, usando la guida Marco; il Livello B rimane separatamente bloccato, senza richieste di audit/test ripetitivi o consenso all'export completo. Shopify/Payments/checkout/A+B/Sendcloud/inventario invariati. SEO, GSC già collegata e redirect 301 rimangono TODO successivi, non eseguiti. Le sezioni sottostanti sono cronologia o procedure condizionate, non attività promesse dopo questa sessione.

## Recovery minimizzato — decisione vigente successiva a `40f5ba9`

**Export completo ritirato e non autorizzato.** Nessun account, hash password, token, secret o dato personale va esportato. La proposta precedente di download completo non è più il percorso da seguire. Nessuna nuova risorsa o modifica produttiva eseguita.

Il recupero gestito Lovable è disponibile ma sostituisce lo stesso DB; non è stato provato sul progetto. Il solo DDL della migration crea quattro tabelle/quattro RPC senza modificare righe preesistenti: prova e rollback limitati a quel delta sono preparabili con fixture sintetiche. Questo **non** equivale al recupero completo di dati/Auth/Storage e non chiude automaticamente il gate migration o scritture.

[Piano aggiornato: scope, snapshot, comando opzionale schema-only di otto tabelle, dipendenze, procedura PG17](release/ADMIN-V2-OPERATIONAL-ACTIVATION.md) · [Manifest](release/ADMIN-V2-ACTIVATION-MANIFEST.json). Export reale non eseguito e non autorizzato; nessuna prova applicativa ripetuta. L'eventuale archivio deve avere copie persistenti protette, non la sola `/private/tmp`. Il codice/migration originali, main, frontend live, flag e permessi restano invariati.

## Preparazione attivazione operativa — 6 novembre 2026, non eseguita

Main e versione live restano stabili: frontend `1ad6182` / `admin-readonly-20261106-r1`, scritture e sync OFF secondo l'ultima diagnostica live verificata. Questa nuova PR prepara soltanto l'attivazione; non pubblica codice o dati.

Migration unica già testata `20261031184521`, hash `ce63ea21…d29cf328`, invariata e ancora fuori dal percorso automatico. Verifica SELECT finale: prerequisiti presenti, migration/nuove RPC/tabelle assenti, 22 categorie e 0 mapping, una sola assegnazione admin aggregata; identità Marco non verificata.

**Backup NON VERIFICATO:** disponibili punti giornalieri (ultimo 6/11 05:25:08 UTC), ma nessun export/restore dimostrato. La revisione automatica ha bloccato l'avvio dell'export completo perché richiede consenso esplicito per dati account/hash password. Serve prima il consenso all'export e alla prova locale protetta; non è ancora il momento di approvare l'applicazione della migration. Database server 17.6, pg_restore locale 16.15: non dichiarare compatibilità o restore PASS.

[Piano unico con target, checksum, recupero, transazione, permessi, capability e rollback](release/ADMIN-V2-OPERATIONAL-ACTIVATION.md) · [Manifest](release/ADMIN-V2-ACTIVATION-MANIFEST.json). Nessun nuovo progetto/staging/abbonamento; nessun SQL di modifica, flag, ruolo o dato Shopify modificato. Test già PASS riutilizzati, nessuna suite manuale ripetuta. Il canary esistente limita ruoli/campi, non impone uno SKU singolo: questa limitazione è esplicita nel piano.

## Rilascio effettivo verificato — 6 novembre 2026, Admin in sola lettura

**PUBBLICATO, solo consultazione.** PR #42 integrata con merge `1ad61826c01ade2821f6c1577a3bd1555d0ab899`, HEAD revisionato `c35c53ba004bd425c371c369621938bd2f607ffe`; [CI Storefront SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/42256971612) e GitGuardian SUCCESS prima del merge ordinario. Nessuna modifica alla PR #45 o ai servizi shipping.

**Deployment Lovable** `00a243b8-240f-48bf-8507-202d352fc4f4`, contenuto `1ad6182`. Lovable conferma “Il tuo sito web è stato aggiornato”; il dominio `onlinegarden.it/admin/settings` serve il marker DOM **`admin-readonly-20261106-r1`**. Commit editor verificato prima e dopo la pubblicazione: `1ad6182`. Il successivo commit di sola documentazione non va confuso con un nuovo deploy. [Registro sanificato](admin-v2-evidence/2026-11-06-readonly/deployment.json).

**Controllo minimo live:** dashboard caricata (2706 righe interne), catalogo (25 risultati), navigazione, scheda OG_113165 aperta con Modifica disabilitato, categorie isolate con spiegazione; nessuna regressione evidente nel perimetro controllato. Diagnostica autenticata **6 novembre 18:00:09 CET**: `writesEnabled=false`, `writeMode=canary`, `shopifySyncEnabled=false`, valori reali senza override frontend. Nessuna scrittura di prova. Non è una nuova certificazione completa Safari/QA o un'accettazione di Marco.

**Disponibile:** consultazione dashboard, ricerca/paginazione e dettaglio tramite backend esistente. **Non operativo:** editing/salvataggio, sync, AI, nuove bozze/recovery, assegnazione categorie e filtri avanzati che richiedono il nuovo backend. Migration fuori dal percorso automatico, endpoint attivo preservato, nessuna migration o attivazione server eseguita. Il codice differito e le relative prove non sono backend distribuito. Account/ruolo Marco non verificati da questa sessione di altro Admin, nessun permesso aggiunto.

**Rollback:** nessun rollback eseguito. Conservare deployment ID e commit di contenuto; per eventuale ripristino frontend usare snapshot precedente verificato o revert mirato/pubblicazione. Base main precedente nota `8ad26ba` non attestata come precedente SHA servito: non dedurlo. Nessun DROP/down-migration, reset o force-push. Scritture e sync devono restare OFF anche dopo un ripristino.

**Limite per l'Admin modificabile:** attivazione operativa separatamente autorizzata (backup/rollback verificato, migration, ACL/RLS, backend compatibile, categorie/identità approvate, ruolo Marco e canary DRAFT concordato), con rimozione revisionata del vincolo frontend. Procedura futura conservata; nessun nuovo progetto, staging aggiuntivo o ciclo di test richiesto adesso. Le sezioni sottostanti sono cronologia/preparazione e non annullano lo stato pubblicato di sola consultazione.

## Esecuzione e rollback della sola versione di consultazione

1. Verificare CI/GitGuardian sul nuovo HEAD e assenza conflitti; merge ordinario autorizzato della sola #42, senza bypass.
2. Attendere Git Sync e verificare il commit editor Lovable. Pubblicare solo lo snapshot sicuro, senza richieste di migration o modifica dati; non avviare l'agente Lovable per attivare backend/flag.
3. Dopo deploy, annotare deployment ID, SHA contenuto e versione realmente servita dal dominio. Fare solo controllo minimo autenticato di dashboard/catalogo/dettaglio, navigazione, pagine non operative e diagnostica OFF. Nessuna scrittura di prova.
4. Rollback frontend: ripubblicare lo snapshot precedentemente live, se disponibile, oppure revert mirato dei soli cambi frontend del rilascio e pubblicazione dopo verifica. Base di codice main prima dell'integrazione `8ad26ba66e8c3b49987544934bbcc8c1a0915aa0`; non presumere che sia lo SHA pubblicato prima del deploy senza attestazione. Backend e database non richiedono down-migration: non sono stati attivati nuovi oggetti. Non fare reset/force-push o DROP.

### Scritture future — solo procedura conservata, non attività di adesso

Serve approvazione specifica per backup verificato/rollback, SQL pendente, ACL/RLS effettive, backend compatibile, mapping categorie e canary DRAFT concordato. Ripristinare il servizio proposto da `admin-v2-queries-deferred.ts` e dalla patch endpoint (formato senza contesto, applicazione con `git apply --unidiff-zero` dopo revisione) soltanto con tale approvazione; il materiale differito non è codice backend già distribuito. Una successiva modifica revisionata deve rimuovere il vincolo frontend di sola lettura, senza consentire scritture se le capability server sono OFF. Verificare il ruolo reale Marco prima di qualsiasi canary e conservare checklist UI/UX. Nessuna assegnazione implicita, attivazione generale o proposta di nuove risorse in questo passaggio.

I comandi PostgreSQL sotto restano disponibili per uso futuro: il runner ora usa il SQL in `docs/release/pending/`; le evidenze locali già PASS non sono state ripetute.

## Decisione operativa vigente — rilascio Admin in sola lettura, 6 novembre 2026

Il proprietario autorizza merge della PR #42 e pubblicazione del **solo frontend compatibile**, senza staging aggiuntivi, migrazioni, prodotti nuovi o scritture. Questa decisione sostituisce i precedenti blocchi di rilascio riferiti all'Admin completamente modificabile; le funzioni operative future restano disabilitate. Non richiedere nuovi progetti o staging per consegnare questa versione.

| Funzione | Perimetro di questa versione |
|---|---|
| Dashboard, ricerca nome/SKU, tipo, paginazione | Disponibili tramite azioni già supportate dal backend attuale; limiti di ricerca/volumi del servizio attuale conservati, non dichiarati risolti dal solo frontend. |
| Scheda prodotto, valori e storico editoriale esistente | Consultazione, senza editor/sync/AI operativi. Gli stati di sincronizzazione non certificano la pubblicazione Shopify. |
| Categorie, nuove bozze e storico nuove operazioni | Isolati: nessuna chiamata a catalog_categories/get_product_operations o RPC nuove; pagina esplicativa sulle route dirette. |
| Filtri categoria/completezza/sincronizzazione/non classificati | Disabilitati con motivazione: il backend attuale non li supporta. Nessun filtro locale sui soli 25 risultati presentato come globale. |
| Legacy tecnico | Collegamenti nascosti e route legacy reindirizzate alle impostazioni protette nel frontend; autorizzazioni backend legacy non cambiate. |
| Permessi | Login e ruolo server esistenti; nessun nuovo ruolo a Marco. Identità personale Marco non certificata da una sessione di altro amministratore. |

**Confine fail-closed:** `ADMIN_READ_ONLY_RELEASE=true` è un vincolo nel codice, non una preferenza locale. Il canale Admin ammette soltanto le letture note e blocca le altre azioni prima del trasporto; canale AI bloccato, nessuna generazione. Capability dei campi disabilitate. Diagnostica continua a mostrare i flag reali del server senza forzarli a false. Lettura pre-release autenticata: `writesEnabled=false / writeMode=canary / shopifySyncEnabled=false`, ore 17:48:30 CET. Nessun secret o flag modificato.

**Separazione del backend:** entrypoint product-admin-api identico a main precedente; query attive con sole annotazioni TypeScript, nessuna nuova lettura di tabelle. Query future conservate in `admin-v2-queries-deferred.ts`, non importate dal percorso attivo; endpoint futuro nella patch `docs/release/ADMIN-V2-DEFERRED-ENDPOINT.patch`. Migration spostata in `docs/release/pending/20261031184521_admin_operational_drafts.sql`, fuori dal percorso di migration automatiche. I test offline conservano i controlli sul materiale differito. Nessun SQL applicato, nessun deploy Edge esplicitamente eseguito.

CI/GitGuardian e SHA effettivi sono registrati nella PR #42. Lo stato del deployment sarà attestato solo dalla risposta Lovable e dalla verifica della versione servita; merge e commit editor non equivalgono a pubblicazione. [Registro](https://github.com/Rosin355/your-e-commerce-blueprint/pull/42) · [Preflight](admin-v2-evidence/2026-11-06-readonly/preflight.json).

## Percorso unico di attivazione — chiusura residui, 6 novembre 2026

Questa sezione sostituisce le precedenti sequenze di rilascio; le evidenze storiche PASS restano valide. Base di questa ripresa `0d3f404`, nessun cambiamento ai flag.

**Staging: NON DISPONIBILE negli accessi identificati/autorizzati.** Il backend letto via connettore Lovable è operativo; Preview non è un secondo ambiente. La [documentazione Lovable](https://docs.lovable.dev/features/environments) indica il ritiro Test/Live il 23 ottobre 2026 e specifica che le bozze non forniscono un secondo database. Il metadata del progetto espone una Preview e un backend Supabase, nessuno staging attestato. Non è una dichiarazione sull'eventuale esistenza di risorse non accessibili. Nessun progetto o risorsa creati. [Evidenza](admin-v2-evidence/2026-11-06-final/staging.json).

| Passo, nell'ordine | Evidenza necessaria / punto di arresto |
|---|---|
| 1. Codice definitivo | HEAD PR #42, CI/GitGuardian PASS, review e diff pertinenti; tenere Draft finché mancano i gate. |
| 2. Backup | Identificare database target e backup completo protetto, inclusi ruoli/schema/dati necessari e riferimento a storage/auth; verificare un ripristino su target isolato. Un export presente senza prova di restore non è un backup verificato. Nessun dump di dati reali in Git. |
| 3. Migration controllata | Prima target isolato identificato e autorizzato, poi eventuale produzione soltanto con ulteriore approvazione. Verificare hash SQL, baseline e registro; applicare esclusivamente la migration operativa prevista, non un push indiscriminato di tutte le migration storiche. |
| 4. ACL/RLS | Verificare quattro tabelle e quattro RPC nuove, ACL service-only, RLS e test negativi anon/authenticated/publisher; prove dei ruoli applicativi e audit. Fermarsi in caso di divergenza. |
| 5. Backend | Distribuire product-admin-api compatibile mantenendo i flag OFF; controllare contesto, ricerca/filtri e risposte al tentativo non autorizzato nell'ambiente di collaudo. Il backend precedente ignora i filtri nuovi. |
| 6. Frontend Lovable | Dopo review/approvazione integrazione e pubblicazione, annotare commit effettivamente distribuito. Il commit editor Lovable o il merge GitHub non dimostrano pubblicazione. Verificare consultazione e tre flag senza attivazioni generali. |
| 7. Capability graduali | Iniziare dal solo salvataggio interno su canary approvato, poi approvazione della specifica operazione DRAFT e categoria. Shopify sync a campo singolo ha il suo flag separato. Mai abilitare modalità full o tutti i permessi per comodità. |
| 8. Canary DRAFT | SKU, operationId, campi, categorie e finestra approvati; claim, esito, mapping, rilettura e recovery senza duplicazione. Non pubblicare il prodotto; nessun prodotto commerciale casuale. |
| 9. Marco | Identità Supabase e ruolo effettivo verificati senza nuove assegnazioni implicite. Checklist A–I e Safari/device con Marco/designer; screenshot senza dati personali. |
| 10. Rollback | Fermare i nuovi comandi e riportare le capability abilitate allo stato concordato; conservare journal/GID per recovery. Ripristinare backend/frontend precedenti e verificare letture. Restore database solo da backup già provato, con autorizzazione e riconciliazione delle operazioni successive; non perdere nuovi dati o creare duplicati Shopify. |

I passi 2–10 sono **preparati, non eseguiti**; nessuna autorizzazione produttiva implicita. Il gate di staging non è chiuso da una simulazione locale. L'assenza di staging non impedisce le correzioni UI indipendenti già effettuate.

### Ripetere la prova PostgreSQL temporanea (solo quando serve)

Prerequisiti già usati: PostgreSQL 16, Node e dipendenze repository. Il SQL non è cambiato: **non serve rieseguire ora** la prova già PASS. Il comando crea solo fixture sintetiche, non scarica dati live e non avvia Edge Functions con credenziali produttive.

```sh
set -eu
OG_ADMIN_TEST_DIR=$(mktemp -d /tmp/og-admin42.XXXXXX)
mkdir "$OG_ADMIN_TEST_DIR/socket"
initdb -D "$OG_ADMIN_TEST_DIR/data" -A trust --no-locale --encoding=UTF8
trap 'pg_ctl -D "$OG_ADMIN_TEST_DIR/data" stop -m fast >/dev/null 2>&1 || true' EXIT
pg_ctl -D "$OG_ADMIN_TEST_DIR/data" -l "$OG_ADMIN_TEST_DIR/server.log" \
  -o "-k $OG_ADMIN_TEST_DIR/socket -p 55442 -c listen_addresses=''" start
createdb -h "$OG_ADMIN_TEST_DIR/socket" -p 55442 og_admin_test_release
OG_TEST_PG_SOCKET="$OG_ADMIN_TEST_DIR/socket" \
OG_TEST_PG_PORT=55442 OG_TEST_PG_DATABASE=og_admin_test_release \
  node scripts/test-admin-operational-db.mjs
psql -h "$OG_ADMIN_TEST_DIR/socket" -p 55442 -d og_admin_test_release \
  -v ON_ERROR_STOP=1 -f scripts/fixtures/admin-operational/rollback-roles.sql
```

`listen_addresses=''` esclude TCP; socket nel percorso temporaneo, nessun account reale. Lo script rifiuta socket non temporanei e nomi DB fuori `og_admin_test_*`. Su host che richiedono permessi per IPC, usare l'autorizzazione locale appropriata: non spostare il test sul database operativo. Conservare output e directory fino a revisione, arrestare solo il cluster creato. Questa è una prova del SQL/RPC/ACL su fixture, non di Supabase Auth o restore di backup live. [PASS già conservato](admin-v2-evidence/2026-11-06/postgres-local.json).

# Stato eseguibile e prossimi gate — 6 novembre 2026

**Aggiornamento 6 novembre 2026 — PR #42; questa sezione prevale sugli stati storici sottostanti.**

1. **Codice/CI:** allineamento del branch a main `8ad26ba`, correzioni filtri globali, etichette e focus; risultati esatti di CI/GitGuardian sull'HEAD finale nella PR #42, che rimane Draft.
2. **Runtime iniziale PASS:** diagnostica autenticata live `false / canary / false`, [evidenza](admin-v2-evidence/2026-11-06/runtime.json). Non cambiare flag per facilitare il collaudo.
3. **Migrazione STAGING NON ESEGUITA:** SQL invariato, PostgreSQL 16 locale e rollback PASS. SELECT reale tramite Lovable conferma migration `20261031184521` assente e quattro nuove tabelle assenti. Non applicare live. Servono ambiente staging isolato autorizzato e accesso: snapshot/backup verificato, migration, verifica RPC/RLS/ACL, ripristino, test con identità effettive. Nessun servizio a pagamento da creare automaticamente.
4. **Categorie:** attualmente 22 interne, zero mapping e zero assegnazioni. Riutilizzare matrice esistente; 13 corrispondenze tecniche non equivalgono ad approvazione semantica. Nessuna scrittura automatica o modifiche collezioni/logistica.
5. **Permessi:** suite server e SQL locale PASS; confermare identità/ruolo Supabase di Marco (non ricavarlo dal ruolo Shopify), accesso negativo anon/publisher e capability in staging. Percorsi legacy valutati a parte sotto.
6. **QA:** Chromium simulato PASS; WebKit crash tecnico, device Safari e accettazione Marco/designer mancanti. Usare [checklist](ADMIN-V2-CLIENT-GUIDE.md).
7. **Canary DRAFT:** dopo staging e approvazione specifica di SKU/operationId/campi/ruolo, eseguire A–I della guida, rilettura Shopify, conflitto e recovery senza duplicare. Mai scegliere un prodotto commerciale casuale né pubblicare il DRAFT.
8. **Pubblicazione:** ulteriore approvazione esplicita; merge #42 non equivale a pubblicazione Lovable. Distribuire il backend compatibile **prima** del nuovo frontend: un backend precedente ignora i nuovi filtri e renderebbe ingannevole la UI. Verificare versione distribuita, tre flag e ricerca; tenere sincronizzazione e scritture generali OFF. Nessuna attivazione eseguita ora.

**Rollback preparato:** conservare SHA frontend/backend precedenti e backup verificato. Su anomalia riattivare il blocco dei percorsi pertinenti con autorizzazione, fermare nuove operazioni e ripristinare frontend/backend precedenti. La migration additiva non va rimossa alla cieca se contiene journal/link: esportare e riconciliare prima le operazioni. Il test `scripts/fixtures/admin-operational/rollback-roles.sql` prova il rollback transazionale locale, non un ripristino di backup live. Nessun DROP o rollback produttivo autorizzato.

**Perimetro legacy:** sync di campo usa `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED`, indipendente dal master; diagnostica ora conferma entrambi OFF. Gli strumenti legacy tech_admin, visibili secondo `VITE_ADMIN_LEGACY_TOOLS` (default attivo), hanno autorizzazione autonoma e non sono tutti governati dal master V2. Non invocarli per una prova negativa live e non affermare sicurezza globale dalla scritta READ-ONLY. Necessaria accettazione separata dei permessi prima di consegna operativa.

**Unico passo richiesto adesso:** rendere disponibile/indicare uno staging Supabase isolato già autorizzato con accesso sufficiente per migration, rollback e test ruoli. Non equivale ad autorizzare la produzione. Mapping, canary e approvazione finale saranno gate successivi, con il materiale già preparato.

# Admin V2 PR #42 — runbook di integrazione e attivazione

## 2 novembre 2026 — master sostituito con `false`, verifica runtime ancora aperta

Il proprietario ha autorizzato esplicitamente la sostituzione del **solo** `PRODUCT_ADMIN_WRITES_ENABLED` nei Project secrets del progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`. Nel modulo Lovable è stato inserito il nome esatto e il valore `false`; il modulo ha indicato che avrebbe sostituito il valore esistente. Dopo **Save**, Lovable ha mostrato «Secret created successfully» e la riga del medesimo nome risulta aggiornata al **2 novembre 2026**. Lovable non consente di rileggere il valore del secret: il successo del salvataggio e la data non equivalgono a una risposta runtime. Nessun altro secret o flag è stato modificato; nessun codice, frontend, Edge Function o migration è stato distribuito e nessun dato del catalogo, Shopify o Supabase è stato mutato. Il dominio pubblico ha continuato a servire la homepage e il frontend `e26d6f4`.

**Verifica successiva:** la Preview incorporata nell'editor, la Preview aperta direttamente e `https://onlinegarden.it/admin/settings` mostrano il login nella sessione browser disponibile; non è presente una sessione Admin utilizzabile per chiamare `get_admin_context`. Pertanto `writesEnabled`, `writeMode` e `shopifySyncEnabled` **dopo il cambio non sono verificati** né in Preview né in produzione. La precedente lettura Preview `true/canary/false` delle 18:58 è storica e non prova lo stato successivo. **PR #42 e gate read-only produzione: BLOCKED.** Passo minimo: un Admin già autorizzato legge i tre campi sulla Preview e soprattutto su `onlinegarden.it/admin/settings`, registra solo origine e ora; solo una risposta completa `writesEnabled=false` e `shopifySyncEnabled=false` sul dominio di produzione può soddisfare il gate specifico. Il master OFF non sostituisce la verifica separata della sync Shopify e dei percorsi legacy descritta sotto.

La sezione seguente conserva la preparazione e lo stato **prima** del salvataggio del secret.

## 2 novembre 2026 — gate runtime: master ON in Preview, disattivazione preparata

**Evidenza ricevuta dal proprietario, lettura Admin autenticata alle 18:58 (Europe/Rome):** sull'origine `https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app`, `get_admin_context` ha restituito `writesEnabled=true`, `writeMode=canary`, `shopifySyncEnabled=false`; la UI ha mostrato correttamente **SCRITTURE ABILITATE**. Questa è una lettura **Preview**, non una misura diretta su `https://onlinegarden.it`. Nessun valore di secret è stato letto. La [PR #44](https://github.com/Rosin355/your-e-commerce-blueprint/pull/44) diagnostica è già stata integrata e pubblicata come solo frontend; la PR #42 resta Draft, non integrata.

**Ambiente e raggio della modifica proposta.** Preview e sito pubblicato appartengono allo stesso progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`; il client in `.env`, `src/integrations/supabase/client.ts` e `supabase/config.toml` punta al medesimo backend `iekwvvihjwghosqdxrdi`. Lovable [documenta](https://docs.lovable.dev/features/secrets) i secret backend come valori di **progetto**, iniettati nelle Edge Functions a runtime, e `.env` come fonte delle variabili Vite per Preview e build pubblicate. Quindi sostituire `PRODUCT_ADMIN_WRITES_ENABLED` nel Project secrets di questo progetto interessa **Preview e produzione**; non è disponibile qui un interruttore Preview isolato. La condivisione della configurazione è verificata; lo stato effettivo del contesto Admin su `onlinegarden.it` resta **NON VERIFICATO** finché non viene letto con una sessione Admin di produzione.

**Impatto statico di `PRODUCT_ADMIN_WRITES_ENABLED=false`:** `writesEnabled()` confronta il valore con la stringa `true`. Il contesto Admin espone `writesEnabled=false`, `canWrite=false`, azioni/campi editabili vuoti; le nuove command `update_field`, `clear_field`, `confirm_legacy_value`, `reject_legacy_value` sono rifiutate. `product-admin-ai` rifiuta `generate_ai_suggestion`, `accept_ai_suggestion` e `reject_ai_suggestion`; lettura di proposte, catalogo, dettaglio e storico resta disponibile. Nella PR #42, ancora non distribuita, la stessa impostazione bloccherebbe save di nuove bozze, invio DRAFT Shopify, recovery che completa mapping e applicazione categorie, anche con i flag specifici ON. `writeMode=canary` rimane informativo e invariato.

**Limite del master:** `sync_field` usa `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` e controlli autonomi, non questo master. Anche gli strumenti legacy `/admin/import` e `shopify-admin-proxy` non lo consultano. Pertanto master OFF non certifica da solo assenza di qualunque scrittura Admin. La lettura Preview mostra sync OFF; per il gate produzione servono `writesEnabled=false` **e** `shopifySyncEnabled=false` letti su `onlinegarden.it`, oltre alla valutazione separata dei flussi legacy.

**Metodo di modifica verificato, non eseguito:** in Lovable → progetto Online Garden → Altro → Impostazioni → Secrets, la riga `PRODUCT_ADMIN_WRITES_ENABLED` è presente. Il modulo **Add secret**, inserendo il medesimo nome, avvisa che il salvataggio **sostituisce** il valore esistente. Il modulo è stato chiuso senza inserire valore e senza salvare. Con autorizzazione esplicita per **entrambi** gli ambienti, inserire soltanto `false` per quel nome; non eliminare il secret, non toccare altri flag e non abilitare deploy o migration. Dopo il salvataggio, rileggere `get_admin_context` con un Admin autorizzato in Preview e su `onlinegarden.it`. Se una lettura manca o fallisce, il gate resta BLOCCATO; non ripristinare automaticamente il precedente valore `true`, che riabiliterebbe le scritture.

**Stato attuale:** modifica non autorizzata né eseguita; Preview **SCRITTURE ABILITATE**, produzione **NON VERIFICATA**, PR #42 **BLOCKED**. I paragrafi storici sottostanti conservano le evidenze anteriori alla lettura delle 18:58.

## 2 novembre 2026 — diagnostica flag Admin V2 nel branch della PR #42

In `/admin/settings` è stata aggiunta una sezione **Diagnostica Admin V2** in sola lettura. La pagina Admin richiede una sessione Supabase valida e il contesto ottenuto da `product-admin-api`; la sezione è mostrata soltanto se i ruoli restituiti dal server includono `admin` o `tech_admin`. Usa una nuova lettura della **stessa** azione `get_admin_context` e visualizza esclusivamente `writesEnabled`, `writeMode` e `shopifySyncEnabled`, insieme all'origine della pagina e all'ora della lettura. Non sono stati aggiunti endpoint, controlli per cambiare flag, né letture di secret. L'API esistente continua ad applicare autenticazione e autorizzazione sul server; come già prima di questa modifica, il contesto di base può essere richiesto anche dai ruoli Admin V2 `editor` e `publisher`, ma la nuova sezione UI non è mostrata loro. La limitazione della UI non sostituisce i controlli server sulle mutation.

**Interpretazione:** `READ-ONLY` appare solo dopo una risposta autenticata, completa e valida in cui `writesEnabled=false` e `shopifySyncEnabled=false`. `SCRITTURE ABILITATE` appare se almeno uno dei due è `true`. `writeMode` mostra `canary` o `full` ed è informativo: da solo non spegne le scritture. Caricamento, errore, risposta parziale, tipo inatteso o ruolo non autorizzato producono `NON VERIFICATO`; una nuova lettura fallita non mantiene sullo schermo un precedente `false`. Il pulsante **Aggiorna stato** ripete soltanto la lettura. Questi stati descrivono le due capability Admin V2 esposte da `get_admin_context`, non certificano tutte le integrazioni del sito.

**Gate runtime ancora BLOCCATO.** Il pannello esiste solo nel codice del branch: i test locali con API simulate non attestano l'ambiente Lovable/produzione e non confermano il valore dei secret write-only. Dopo un rilascio separatamente autorizzato, un `admin` o `tech_admin` reale deve aprire l'URL esatto dell'ambiente destinatario, autenticarsi, leggere la sezione, premere **Aggiorna stato** e registrare solo ambiente, data/ora, ruolo, tre valori e stato. La lettura deve restituire `writesEnabled=false` e `shopifySyncEnabled=false` per chiudere il gate read-only; qualunque `NON VERIFICATO` o valore `true` mantiene il blocco e richiede indagine, non una modifica automatica dei flag. Non condividere token, cookie, HAR o risposta completa. Prima del rilascio della UI, resta valida solo la procedura manuale sanificata sotto riportata; essa non è stata eseguita in questa attività.

Verifiche di questo change: typecheck, lint mirato, build, 365 test Node e 103 test Deno PASS; nove scenari browser con API esclusivamente simulate (admin/tech_admin, editor/publisher, read-only, scritture, sync, risposta incompleta, errore iniziale e refresh fallito) PASS a 1440 e 390 px, zero page error. **CI e GitGuardian sull'HEAD finale della PR devono essere confermati separatamente.** Nessun merge, migration, deploy, modifica Shopify/Supabase o cambio flag.

## Aggiornamento post-PR #43 — 1 novembre 2026

La PR #43 è stata integrata in `main@04ae6d4` e il footer è già online tramite deploy Lovable separato. Il merge locale conservativo `a00a800` porta quel `main` nel branch Admin V2: footer, Contatti, Privacy, header, workflow e funzionalità Admin sono presenti; la #40 non è importata. QA locale sull'albero integrato PASS (361 Node, 103 Deno, typecheck, lint, build, compilazione Edge e smoke browser pubblico desktop/mobile). CI/GitGuardian devono riferirsi al nuovo HEAD pubblicato della PR #42. La PR resta Draft; nessuna migration o Edge Function della #42 è stata distribuita. La sezione pre-merge sottostante che descrive la #43 come Draft conserva l'audit storico precedente alla sua integrazione; l'ordine di merge lì proposto non è più operativo.

**Attestazione runtime precedente al pannello, senza credenziali:** se la nuova UI non è ancora stata distribuita con autorizzazione separata, il proprietario accede con il proprio account autorizzato a `https://onlinegarden.it/admin`, apre gli strumenti sviluppatore del browser nella scheda Network/Rete, filtra la richiesta `product-admin-api` con azione `get_admin_context`, ricarica la pagina e legge solo tre campi della risposta JSON: `writesEnabled`, `writeMode`, `shopifySyncEnabled`. Deve riferire esclusivamente quei tre valori, ambiente, data/ora e account/ruolo usato. Non esportare HAR, non usare «Copy as cURL», non condividere header, cookie, token, request completa o screenshot che li contengano. `writeMode` è `canary` oppure `full`, non un interruttore OFF: per il gate read-only devono risultare `writesEnabled=false` e `shopifySyncEnabled=false`, mentre il modo va registrato. Se la funzione live non espone i campi o non è disponibile, il gate resta bloccato; non modificare secret per ottenere un esito.

**Stato attuale:** i tre campi sono NON VERIFICATI per conferma del proprietario. I secret `PRODUCT_ADMIN_WRITES_ENABLED` e `PRODUCT_ADMIN_WRITE_MODE` sono presenti ma write-only; i cinque flag operativi assenti restano OFF/null solo per il comportamento statico del codice. Nessun reviewer indipendente è disponibile; `main` non impone una review distinta dall'autore secondo branch metadata/ruleset accessibili. I check automatici non equivalgono ad approvazione GitHub. Nessun merge o deploy prima della decisione esplicita successiva al gate runtime.

**Preparato il 1 novembre 2026; nessuna fase eseguita con questo documento.** La PR #42 può essere integrata come codice soltanto dopo i gate di review; l'integrazione non autorizza migration, deploy, scritture, pubblicazione o modifica del catalogo. Baseline tecnica: [compatibilità Supabase](ADMIN-V2-LIVE-SUPABASE-COMPATIBILITY.md) e [matrice categorie](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md). Registrare per ogni gate operatore, approvatore, ambiente, SHA, UTC, esito ed evidenze in un ticket di change.

## Verifica operativa pre-merge — 1 novembre 2026

**GitHub.** Sul controllo di `99d2f1c` la PR #42 è Draft verso `main@b5cbe57`, CI e GitGuardian PASS, senza review inviate o richieste. `main` risulta non protetto; endpoint di branch protection: 404 «Branch not protected»; ruleset: elenco vuoto. Pertanto GitHub non impone automaticamente check o review. L'inventario collaboratori accessibile mostra soltanto l'autore `Rosin355`: nessun reviewer indipendente con autorizzazione verificata. Preparare una richiesta di review a un tecnico indipendente **dopo** che il proprietario gli avrà concesso l'accesso appropriato; non usare auto-review né trattare i check come approvazione. La richiesta deve includere migration/RLS/RPC, kill switch, idempotenza, categorie e fallback con migration assente.

**Ambiente destinatario.** Progetto Lovable Online Garden `95cad199-55fd-4870-9d5c-a2653edf88f5`, backend `iekwvvihjwghosqdxrdi`, repository `Rosin355/your-e-commerce-blueprint`, branch attivo `main`, stato «In sync with GitHub» su `b5cbe57`; sito pubblicato collegato a `onlinegarden.it`. La tabella **Project secrets** del progetto elenca i nomi ma non i valori. Lovable documenta che i secret backend sono iniettati nelle Edge Functions e che i valori salvati sono write-only: [Secrets](https://docs.lovable.dev/features/secrets).

| Variabile | Inventario Project secrets | Effetto del codice se assente | Rischio/azione prima di deploy read-only |
| --- | --- | --- | --- |
| `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` | Assente | OFF: `shopifySyncEnabled()` confronta con `true` | Rileggere inventario nel change; la sync preesistente è indipendente dal master. |
| `PRODUCT_ADMIN_DRAFTS_ENABLED` | Assente | OFF: bozza interna rifiutata | Conservare OFF fino al canary autorizzato. |
| `PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED` | Assente | OFF: invio DRAFT rifiutato | Conservare OFF fino al canary autorizzato. |
| `PRODUCT_ADMIN_CATEGORIES_ENABLED` | Assente | OFF: assegnazione rifiutata | Conservare OFF fino a mapping approvato. |
| `PRODUCT_ADMIN_OPERATIONAL_APPROVAL` | Assente | Nessuna approvazione valida | Non creare un'approvazione generica o persistente. |
| `PRODUCT_ADMIN_WRITES_ENABLED` | **Presente; valore non verificabile** | OFF solo **se** assente o diverso da `true` | **Gate aperto:** attestare tramite contesto Admin autenticato o procedura operatore sanificata che sia effettivamente OFF; non dedurlo dalla presenza del secret. |
| `PRODUCT_ADMIN_WRITE_MODE` | **Presente; valore non verificabile** | `canary` solo **se** assente o diverso da `full` | Attestare il modo effettivo; se master fosse ON e modo `full`, le scritture Admin preesistenti potrebbero essere più ampie. |

**Separazione merge/deploy.** Nel repository l'unico workflow GitHub Actions è `pull_request` con permesso `contents:read`; non esiste trigger `push` o job di deploy. Il progetto Lovable sincronizza automaticamente il codice di `main` nell'editor/anteprima, ma la [documentazione Git sync](https://docs.lovable.dev/integrations/git-sync-overview) specifica che un commit sincronizzato non pubblica il sito, non distribuisce una Edge Function modificata e non applica migration SQL. Una pubblicazione o distribuzione backend richiede un'azione separata autorizzata. Prima del deploy va comunque ripetuta la verifica dei flag e dei fallback per le tabelle nuove assenti.

**Coordinamento PR #43.** Anche la Draft #43 nasce da `main@b5cbe57`. Il confronto a tre vie delle due HEAD trova conflitti reali in `docs/PROJECT_STATUS.md` e `docs/CLIENT-ECOMMERCE-STATUS.md`; `src/App.tsx`, `.github/workflows/storefront-checks.yml` e `docs/release/FINAL-RELEASE-READINESS.md` sono modificati da entrambe ma il merge-tree li combina senza marker. Ordine proposto: review e, solo dopo autorizzazione, merge #42; aggiornare poi il branch #43 alla nuova `main`, risolvere i due documenti mantenendo entrambe le cronologie e rieseguire CI/GitGuardian e review del diff combinato. Non aggiornare automaticamente nessuna delle PR in questo gate.

## Gate 1 — merge del solo codice, scritture OFF

- **Prerequisiti:** PR #42 su base corretta, CI/GitGuardian verdi sul suo HEAD finale, review GitHub adeguata, diff finale limitato ad Admin V2/migration/documenti. Verificare che `PRODUCT_ADMIN_WRITES_ENABLED`, `PRODUCT_ADMIN_DRAFTS_ENABLED`, `PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED` e `PRODUCT_ADMIN_CATEGORIES_ENABLED` siano assenti o `false` nell'ambiente di destinazione. Nessuna configurazione di approvazione operativa attiva. Per dichiarare *tutto* l'Admin read-only verificare separatamente anche `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED=false`: la sync a campo singolo preesistente ha un interruttore indipendente, che questo merge non cambia.
- **Operazione proposta:** merge tramite normale processo del repository, senza eseguire migration o deploy automaticamente. Per il rilascio frontend/backend successivo, distribuire prima la funzione API compatibile con le nuove letture e poi il frontend, mantenendo i flag OFF.
- **Rischio e test di accettazione:** con migration assente, le letture delle tabelle esistenti devono funzionare; la pagina dettaglio può mostrare il messaggio gestito «Storico nuove bozze non disponibile» perché il journal non esiste ancora, senza crash del prodotto. Le pagine nuove devono mostrare empty/error state e nessuna CTA di scrittura abilitata. Richieste costruite manualmente a save/create/apply/recover devono fallire prima di scrivere. Nessuna regressione alle pagine Admin V2 già attive o allo storefront.
- **Rollback/recupero:** revert del codice/deploy al precedente SHA se il read-only degrada; non eliminare tabelle o dati. Se esistono operazioni `IN_FLIGHT` da una fase successiva, non ripetere Shopify e non cancellare journal: passare alla riconciliazione tecnica.
- **Evidenza obbligatoria:** SHA e check GitHub, review, snapshot flag senza valori sensibili, smoke read-only Admin V2 desktop/mobile, prova negativa delle mutation.

## Gate 2 — backup e migration autorizzata, preferibilmente in staging

- **Prerequisiti:** Gate 1 accettato; progetto Supabase `iekwvvihjwghosqdxrdi` confermato nel contesto di deployment; finestra e approvazione esplicita; backup/snapshot verificabile e piano di restore; staging con schema e dataset rappresentativi. Nessun comando di migration viene eseguito in questa review.
- **Operazione proposta:** applicare solo `20261031184521_admin_operational_drafts.sql` nello staging concordato; confrontare schema prima/dopo, owner, PK/FK, UNIQUE, CHECK, indici, trigger, `search_path`, RLS, policy e grant/EXECUTE per `anon`, `authenticated`, `service_role`.
- **Rischio e test di accettazione:** la migration deve essere additiva, senza variazione di righe/DDL preesistenti. Test negativi: ruoli client non leggono journal né eseguono le RPC; test positivi: service role con attore/ruolo corretto, idempotenza e SKU duplicato. Verificare che il frontend read-only continui a funzionare con flag OFF.
- **Rollback/recupero:** fermare l'attivazione se DDL/ACL divergono; preferire una migration correttiva in avanti. Non fare `DROP` automatico dei journal e non ripristinare il DB senza valutare operazioni registrate. Restore solo con procedura autorizzata.
- **Evidenza obbligatoria:** backup testato, hash migration, diff cataloghi prima/dopo, risultati ACL/RLS/RPC, test di regressione, approvazione change.

## Gate 3 — approvazione del mapping categorie, solo letture

- **Prerequisiti:** Gate 2 verificato; snapshot aggiornato delle 22 categorie interne, 23 handle canonici e collezioni Shopify; responsabile prodotto/tassonomia identificato. La [matrice](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md) è una proposta, non un mapping già approvato.
- **Operazione proposta:** rileggere handle/GID/tipo e conteggi Shopify; confrontare gerarchia e contenuti; decidere per ogni categoria se un match è esatto sul piano semantico, plausibile, multiplo o assente. Generare anteprima del diff con categorie prive di match, collezioni legacy e impatto potenziale su prodotti già pubblicati.
- **Rischio e test di accettazione:** nessuna inferenza da titolo/descrizione prodotto; nessuna equivalenza automatica 22↔23. Ogni riga approvata deve avere ID interno, GID Shopify unico, handle, tipo `custom/manual`, fonte, approvatore e timestamp; i conflitti bloccano.
- **Rollback/recupero:** revocare la proposta prima di qualunque write; conservare decisioni e motivazioni. Nessun prodotto o collezione cambia in questo gate.
- **Evidenza obbligatoria:** manifest versionato, diff read-only, firma di Marco o del responsabile delegato, elenco esplicito delle righe sospese.

## Gate 4 — applicazione controllata del solo mapping approvato

- **Prerequisiti:** Gate 3 approvato e distinta autorizzazione di scrittura sul database; backup recente; manifest immutabile con hash; nessun drift di handle/GID/tipo rispetto allo snapshot approvato.
- **Operazione proposta:** transazione idempotente per `product_category_shopify_map` soltanto sulle righe approvate; nessuna associazione prodotto e nessuna mutation Shopify implicita. Registrare actor, fonte, stato e timestamp. Rileggere il mapping e confrontarlo riga per riga con il manifest.
- **Rischio e test di accettazione:** UNIQUE su GID/handle e foreign key rispettate; nessuna categoria ambigua o collezione smart ammessa; nessuna modifica a prodotti, prezzi o inventory. L'Admin V2 deve mostrare solo categorie con mapping verificato.
- **Rollback/recupero:** fermare al primo conflitto e non ritentare in massa; eventuale correzione in avanti con nuova approvazione, preservando l'audit. Un mapping registrato non dimostra che le membership Shopify dei prodotti siano allineate.
- **Evidenza obbligatoria:** transazione e conteggi prima/dopo, hash manifest, audit dell'operatore, verifica post-write e diff zero sulle tabelle prodotto.

## Gate 5 — un solo prodotto Shopify DRAFT canary

- **Prerequisiti:** Gate 4 e verifica Shopify Admin degli SKU/GID; SKU nuovo concordato e ricerca esatta senza collisioni; product/variant GID legacy non in conflitto; prezzo/valuta/immagini/testi approvati; autorizzazione scritta per una sola bozza. Pubblicazione e canali restano fuori scope.
- **Operazione proposta:** abilitare temporaneamente master write e flag bozza pertinenti, con `PRODUCT_ADMIN_OPERATIONAL_APPROVAL` limitata all'`operationId` e con scadenza; creare bozza interna, poi una sola DRAFT Shopify. Verificare marker, status DRAFT, SKU parent/varianti, prezzi, GID e link atomici; riportare i flag OFF alla fine.
- **Rischio e test di accettazione:** timeout o esito incerto non autorizzano una seconda `productSet`. Il recupero è una scrittura Supabase: con master OFF ora è bloccato; per completarlo serve riabilitazione esplicita e temporanea, approvata, dello stesso gate. Nessuna vendita, ordine o pubblicazione reale.
- **Rollback/recupero:** se l'esito è incerto, lasciare `NEEDS_RECONCILIATION`, cercare per marker/handle e riconciliare senza ricreare. Non cancellare automaticamente Shopify DRAFT o journal. Tornare ai flag OFF e conservare l'evidenza.
- **Evidenza obbligatoria:** approvazione, snapshot flag, operationId/hash non segreto, esito Shopify read-after-write, GID verificati, stato journal, assenza di pubblicazione e report di recovery.

## Gate 6 — account Marco, Safari/iOS e errori

- **Prerequisiti:** Gate 5 completato o recuperato; account reale di Marco con ruolo concesso tramite processo esistente; ambiente staging e dispositivi/browser concordati.
- **Operazione proposta:** provare letture, ricerca, categorie approvate, form manuale senza AI, anteprima e messaggi di errore con flag OFF; poi solo se autorizzato il canary con ruolo previsto. Testare Safari desktop/iOS, viewport compatti, focus, annunci screen reader, scadenza approvazione, perdita rete, timeout e drift categorie.
- **Rischio e test di accettazione:** nessuna escalation di ruolo dal client o da richiesta manuale; nessuna CTA per azioni non autorizzate; nessuna ripetizione delle mutation dopo esito incerto; recovery esplicito. Non dichiarare WCAG AA completa senza audit completo.
- **Rollback/recupero:** disattivare flag, bloccare nuovi invii e conservare journal; correggere in codice o con forward fix approvato, poi ripetere i test falliti.
- **Evidenza obbligatoria:** matrice browser/device/ruolo, screenshot, log sanificati, esiti error/timeout, firma QA e cliente.

## Gate 7 — decisione capabilities e pubblicazione

- **Prerequisiti:** Gate 6 approvato; catalogo e mapping riconciliati; decisioni commerciali su prezzi, disponibilità, canali, email e responsabilità del cliente documentate.
- **Operazione proposta:** definire in una modifica separata chi può salvare, inviare DRAFT, associare categorie e pubblicare; riesaminare permessi Shopify/Scope, controlli di approvazione e audit. Nessuna capability di pubblicazione nasce dal merge della PR #42.
- **Rischio e test di accettazione:** verificare checkout sandbox autorizzato, pubblicazioni Headless, notifiche, rollback e tutela dei prodotti già pubblicati; ottenere approvazione commerciale esplicita.
- **Rollback/recupero:** mantenere DRAFT e flag OFF se un gate fallisce; non rimuovere dati canonici né riutilizzare SKU/GID in esiti incerti.
- **Evidenza obbligatoria:** decisione firmata sulle capability, QA staging, report commerciale e security review finale prima di qualsiasi produzione.
