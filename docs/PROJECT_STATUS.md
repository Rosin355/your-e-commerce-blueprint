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

## 6 novembre 2026 — chiusura residui Admin V2, nessuna attivazione

- **Backend PARTIAL:** nessuna nuova incompatibilità nei metadata/grant mirati rispetto alla baseline; database operativo 25 tabelle, nuove RPC/migration ancora da attivare secondo gate. Non è uno staging. Un solo ruolo admin assegnato nell'aggregato letto: ruolo personale Marco **NON VERIFICATO**.
- **Staging NON DISPONIBILE negli accessi identificati/autorizzati.** Preview/bozze non isolano il database; fonte ufficiale e identità nel runbook. Non creato alcun progetto. Procedura locale temporanea documentata, SQL e prove PASS precedenti conservati senza ripetizioni.
- **UI/UX PARTIAL:** spiegazioni per invio/recupero disabilitati e linguaggio cliente; quattro nuovi casi Chromium PASS a 320/1440 px, typecheck/lint/build PASS. Un solo tentativo WebKit, ancora crash 139 prima della prova; Safari e accettazione Marco/designer aperti.
- Matrice categorie trasformata in tabella decisionale per Marco: 13 tecniche univoche, 3 plausibili, 2 ambigue e 4 assenti; zero mapping applicati. Le 194 famiglie non sono automaticamente prodotti Shopify mancanti.
- Percorso unico preparato: codice, backup provato, migration controllata, ACL/RLS, backend, frontend, capability limitate, canary DRAFT, account Marco, rollback. Pubblicazione **BLOCKED** finché non superati i gate e autorizzata la produzione. CI/GitGuardian e SHA finali nella PR #42, mantenuta Draft.
- PR #45, Shopify live, A/B, Sendcloud, checkout e pagamenti invariati; niente merge, deploy, migration o flag produttivi. GSC già collegata tramite Windsor.ai; 404/URL WooCommerce/mapping/301/monitoraggio restano TODO successivi, non eseguiti.

[Runbook](ADMIN-V2-ACTIVATION-RUNBOOK.md) · [Guida cliente](ADMIN-V2-CLIENT-GUIDE.md) · [QA](ADMIN-V2-QA-REPORT.md).

## 6 novembre 2026 — Admin V2 completamento mirato, rilascio BLOCKED

**Aggiornamento 6 novembre 2026 — PR #42; questa sezione prevale sugli stati storici sottostanti.**

- Runtime autenticato live **PASS**: scritture OFF, modo canary, sync Shopify OFF; dashboard/ricerca SKU/dettaglio letti senza write.
- Correzioni PR #42: filtri sul catalogo prima della paginazione, nessun troncamento silenzioso, stato sync non confuso con pubblicazione, focus visibile e responsive. Typecheck/lint/build, 370 Node e 103 Deno PASS; SQL locale/rollback PASS; Chromium simulato 11 scenari PASS.
- **UI/UX PARTIAL:** WebKit crash tecnico, Safari/device e accettazione Marco/designer non conclusi. **Sicurezza operativa BLOCKED:** ruoli reali Marco e RLS gestita post-migration non collaudati, legacy separati.
- SELECT backend Lovable conferma migration non applicata, 22 categorie e zero mapping/assegnazioni. **Staging NON ESEGUITA**. Nessun canary commerciale o write live.
- PR #42 Draft; risoluzione conflitti con main sul branch, nessun merge in main/deploy. SHA, CI e GitGuardian dell'HEAD finale nella PR. PR #45, tariffe A/B, Sendcloud e checkout indipendenti e invariati.
- **Progresso indicativo per gate, non misura del codice:** consultazione 75% (3/4: lettura live, filtri locali, UI; manca accettazione Marco); modifica/bozze 60% (3/5: server, SQL locale, UI; mancano staging e canary); categorie 50% (2/4: codice e QA locale; mancano mapping approvati e canary); UI 67% (4/6: responsive, tastiera/focus, conferme, stati; mancano Safari e accettazione); rilascio 25% (2/8: codice/CI e runtime; restanti gate nel runbook). Non è pronto all'uso completo del cliente.
- Prossima azione unica: ambiente staging Supabase isolato autorizzato e accessibile, prima di ogni decisione produttiva. [Guida Marco](ADMIN-V2-CLIENT-GUIDE.md), [runbook](ADMIN-V2-ACTIVATION-RUNBOOK.md), [QA](ADMIN-V2-QA-REPORT.md).

**TODO SEO post-rilascio, non eseguito:** Google Search Console **già collegata tramite Windsor.ai**; analisi 404, recupero URL WordPress/WooCommerce, mapping vecchio URL → pagina nuova, redirect permanenti HTTP 301 e monitoraggio indicizzazione. Le vecchie note “collegare GSC” sono superate. Nessun redirect o credenziale Google modificati.

## 5 novembre 2026 — Priorità: completare Admin V2 e UI/UX prima di SEO/redirect

**Decisione del proprietario:** concentrare il lavoro corrente sulla consegna di un Admin V2 utilizzabile dal cliente Marco e sulla chiusura dei controlli UI/UX dello storefront. **Google Search Console, inventario URL legacy WooCommerce, mappatura redirect HTTP 301 e monitoraggio 404 sono rinviati a TODO POST-ADMIN/UIUX.** Non avviare ora configurazioni Search Console, redirect o deploy SEO; l'attività futura dovrà identificare l'hosting che termina la richiesta HTTP, creare mapping URL vecchio→nuovo canonico e verificare HTTP 301 reali, senza redirect indiscriminati alla homepage. Valutare Search Console per priorità errori 404 e indicizzazione.

**Stato verificato da GitHub:** storefront pubblico già pubblicato, con homepage, catalogo, PDP, header, footer, Privacy, Contatti e carrello verificati nei rilasci #43/#44; Shopify checkout e spedizioni A/B LIVE risultano collaudati separatamente nella PR #45 (Draft). **Non dichiarare tutta la UI/UX completa:** mancano un'accettazione finale del cliente su desktop/mobile/Safari e revisione mirata di edge case, accessibilità e messaggi carrello/checkout. Nessun nuovo redesign autorizzato; conservare il design Header Only approvato.

**Admin V2:** PR #42 Draft, non integrata o pubblicata. Funzioni categorie e nuove bozze preparate e testate localmente; migrazione Supabase della PR #42 non applicata; 22 categorie interne non riconciliate con le collezioni Shopify, 194 famiglie interne senza GID nel mapping storico. Il secret Lovable `PRODUCT_ADMIN_WRITES_ENABLED` è stato salvato come `false` il 2 novembre, ma manca la lettura runtime autenticata dopo il cambio di `writesEnabled`, `writeMode`, `shopifySyncEnabled` su `https://onlinegarden.it/admin/settings` (e Preview se utile). **Nessun merge/deploy, attivazione di scritture, migrazione o sync Shopify implicito.** Passi successivi: attestazione runtime con un admin autorizzato; review e CI correnti PR #42; pianificare staging/migration e riconciliazione; canary DRAFT e QA reale con Marco su desktop/mobile/Safari prima della consegna. Le limitazioni di UI rispetto alle capacità backend vanno esplicitate al cliente.

**Prossima azione minima:** far leggere la diagnostica Admin V2 a un account admin già autorizzato su `onlinegarden.it/admin/settings`, riportando solo i tre stati, senza password né DevTools. Se non verificabile, non abilitare scritture e registrare BLOCKED. Nessuna modifica alla produzione in questo aggiornamento documentale.

## 2 novembre 2026 — master Admin V2 impostato a false; runtime non attestato

Con autorizzazione esplicita del proprietario, nel progetto Lovable Online Garden è stato sostituito soltanto `PRODUCT_ADMIN_WRITES_ENABLED` con `false`. Lovable ha confermato il salvataggio e la riga del secret mostra la data 2 novembre 2026; il valore è write-only e non è stato letto indietro. Nessun altro flag, secret, codice, Edge o migration è stato cambiato; nessun dato Shopify o Supabase è stato mutato. La homepage di `onlinegarden.it` resta navigabile e serve il frontend `e26d6f4`. Le sessioni browser disponibili in Preview e produzione mostrano il login Admin, quindi manca la risposta autenticata post-cambio di `get_admin_context`. **Stato runtime post-cambio: NON VERIFICATO; PR #42: BLOCKED.** La precedente misura Preview `true/canary/false` era antecedente alla sostituzione. [Dettagli e gate](ADMIN-V2-ACTIVATION-RUNBOOK.md). La sezione seguente conserva il preflight prima del cambio.

## 2 novembre 2026 — master Admin V2 ON in Preview; cambio OFF preparato

Lettura autenticata comunicata dal proprietario alle 18:58 Europe/Rome su Lovable Preview del progetto `95cad199-55fd-4870-9d5c-a2653edf88f5`: `writesEnabled=true`, `writeMode=canary`, `shopifySyncEnabled=false`, stato UI **SCRITTURE ABILITATE**. La PR #44 è pubblicata; PR #42 resta Draft e non integrata. Configurazione del client e secret Lovable sono di progetto e indicano backend condiviso con `onlinegarden.it`; nessuna lettura Admin autenticata sul dominio produzione è ancora disponibile. Il master `PRODUCT_ADMIN_WRITES_ENABLED` è presente e può essere sostituito esplicitamente con `false` nel Project secrets; il modulo è stato chiuso senza salvare. La modifica richiede autorizzazione specifica perché interessa Preview e produzione e bloccherebbe le scritture Admin V2 prodotto/AI. La sync Shopify a campo singolo e gli strumenti legacy hanno gate separati. **Gate produzione e PR #42: BLOCKED.** Nessun flag, dato, codice o deploy modificato. [Impatto e procedura](ADMIN-V2-ACTIVATION-RUNBOOK.md). La sezione seguente descrive lo stato precedente a questa lettura.

## 2 novembre 2026 — PR #42, diagnostica sicura dei flag Admin V2

La sezione `/admin/settings` mostra a `admin` e `tech_admin` autorizzati i soli tre campi già restituiti da `get_admin_context`: `writesEnabled`, `writeMode`, `shopifySyncEnabled`. Lo stato **READ-ONLY** richiede una risposta completa con entrambi gli interruttori di scrittura a `false`; se uno è `true`, **SCRITTURE ABILITATE**. In caso di errore, lettura in corso o dato mancante: **NON VERIFICATO**, senza interpretare un secret assente/sconosciuto come OFF. Il pulsante aggiorna soltanto la lettura. Nessun endpoint, mutation, secret o controllo di modifica è stato aggiunto. La cache del contesto è distinta per utente; la nuova diagnostica esegue una lettura fresca e non presenta un vecchio `false` dopo un refresh fallito.

QA locale PASS: typecheck, lint mirato, build, 365 test Node e 103 Deno; nove scenari browser con API simulate e rete esterna bloccata, inclusi esclusione `editor`/`publisher`, `tech_admin` mobile, risposta incompleta, errore iniziale e refresh fallito. Nessun test ha letto flag o credenziali live. **Il gate runtime produzione resta BLOCCATO:** il pannello nel branch non è evidenza dell'ambiente pubblicato; serve lettura autenticata nell'ambiente corretto dopo rilascio autorizzato, con valori registrati senza credenziali. CI/GitGuardian sull'HEAD finale della PR #42 vanno verificati separatamente. La PR resta Draft; nessun merge, migration, deploy o modifica live. [Procedura](ADMIN-V2-ACTIVATION-RUNBOOK.md).

## 1 novembre 2026 — PR #42 riallineata al footer pubblicato; gate runtime aperto

`main@04ae6d4` include la PR #43 e il report del footer già online. Il branch Admin V2 ha integrato `main` con merge locale conservativo `a00a800`: Contatti, Privacy Policy, footer, header e workflow CI sono preservati; nessun file Admin è stato sovrascritto e nessun redesign della #40 è stato importato. Il diff finale della PR richiede i check del nuovo HEAD dopo la pubblicazione del branch.

QA locale dell'albero integrato: typecheck, lint mirato, build, **361 Node** e **103 Deno** PASS; entrypoint `product-admin-api` compilato con Deno e import npm consentiti. Browser locale a 1440/390 px: homepage, catalogo con dati Storefront read-only, PDP reale, Contatti e footer navigabili senza overflow; Privacy Policy conduce alla policy Shopify verificata; `/admin` non autenticato mostra il login. QA Admin con API simulate PASS a sei larghezze 320–1440 px, zero page error e 23 richieste esterne bloccate ([JSON](admin-v2-evidence/2026-11-01-post-footer/browser-qa.json)). Checkout verificato dai test di contratto simulati, senza ordine. La CTA di recupero nella nuova pagina prodotto, rimasta visibile dopo errore anche con scritture OFF, ora richiede la capability Admin; test di regressione aggiunto. Browser Admin con account reale, Marco e Safari/iOS non provati in questo passaggio.

**Gate runtime BLOCCATO:** l'inventario Lovable precedente mostra `PRODUCT_ADMIN_WRITES_ENABLED` e `PRODUCT_ADMIN_WRITE_MODE` presenti ma con valori write-only; nessuna sessione Admin propria autorizzata è disponibile per attestare `writesEnabled`, `writeMode` e `shopifySyncEnabled`. Le cinque variabili operative assenti hanno default fail-closed nel codice, ma la loro assenza non attesta lo stato dei due secret presenti. L'utente conferma che i tre campi runtime sono NON VERIFICATI. PR Draft; nessun merge/deploy/migration/flag o scrittura live. [Procedura di attestazione](ADMIN-V2-ACTIVATION-RUNBOOK.md).

## 1 novembre 2026 — review finale PR #42 e piano di riconciliazione

HEAD iniziale `7b92a5e`, remoto allineato dopo fetch; CI e GitGuardian SUCCESS, PR Draft senza review formali. La review ha corretto R42-6 nel commit `c9329ca`: il recupero di una bozza incerta poteva scrivere il mapping Supabase con master write OFF. Ora backend e CTA richiedono `PRODUCT_ADMIN_WRITES_ENABLED=true`; nessuna seconda mutation Shopify viene introdotta. QA locale dopo fix: 360 Node, 103 Deno, typecheck, lint mirato, Deno check e build PASS; warning build noti. Sul commit `c9329ca`, [CI applicativa SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41321729729) e GitGuardian PASS; il successivo HEAD documentale ha check propri.

Audit read-only: 22 categorie Supabase, 55 collezioni Shopify (tutte le 23 canoniche presenti), zero mapping approvato. [Matrice candidati](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md): 13 handle identici, 3 plausibili, 2 ambigui, 4 senza match; nessuna assegnazione automatica. Le 194 famiglie senza Product GID legacy sono 112 simple e 82 variable WooCommerce; non equivalgono automaticamente agli 82 storici NEEDS_REVIEW. [Runbook a sette gate](ADMIN-V2-ACTIVATION-RUNBOOK.md) per merge con scritture OFF, staging migration, approvazione/applicazione mapping, canary DRAFT, QA Marco/Safari e decisione capability. Nessuna migration, deploy, mutation Shopify o modifica a dati/flag live.

## 1 novembre 2026 — gate Supabase live PR #42

Il database Supabase collegato al progetto Lovable Online Garden è stato interrogato **solo in lettura**. Reference configurato `iekwvvihjwghosqdxrdi`, coerente fra repository, URL frontend, Edge Functions e progetto Lovable (`b5cbe57`); Management API diretto ancora non autorizzato. Struttura reale di sette tabelle, vincoli, trigger, RLS, grant, registro campi e mapping legacy esaminati. Migration `20261031184521_admin_operational_drafts.sql` **compatibile strutturalmente**, non applicata: i quattro nuovi journal e le RPC sono assenti live come previsto. `products.sku_norm` è generato e UNIQUE. Review mirata delle correzioni `829eeb0..d9f0d39` senza nuovo blocco; [CI su `d9f0d39` SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41236633321). Il commit che aggiunge questo report deve avere una run propria prima del verdetto finale.

Il catalogo letto ha 1.518 famiglie interne, di cui 1.324 con Product GID nel mapping legacy e 194 senza. Le 22 categorie interne attive non hanno ancora mapping Shopify né assegnazioni approvate: il flusso categorie è **non attivabile** finché tassonomia e collezioni non sono riconciliate con autorizzazione. Nessuna migration/deploy, modifica dati, flag o mutation Shopify. Il codice resta separato dal gate di staging/produzione. [Report completo](ADMIN-V2-LIVE-SUPABASE-COMPATIBILITY.md) · [QA PR #42](ADMIN-V2-QA-REPORT.md).

## 31 ottobre 2026 — review indipendente sicurezza e integrità PR #42

Draft PR #42 verificata sulla base `main@b5cbe57`, HEAD iniziale `829eeb0`. Il diff tocca Admin V2, API Admin, migration, test, CI e documentazione; storefront/checkout non sono stati modificati. La review ha individuato cinque difetti nelle autorizzazioni operative e nella coerenza delle categorie/SKU; corretti sul branch della PR con regressioni Node, Deno e PostgreSQL locale. In particolare l’approvazione è ora legata a una sola bozza o all’hash esatto di una proposta categorie, scade entro 24 ore e il flag generale OFF prevale sulle nuove scritture. Drift Shopify/Supabase blocca le mutation; rimozioni Shopify asincrone richiedono job completato e rilettura prima della finalizzazione interna.

QA locale dopo le correzioni: typecheck frontend+Edge, lint mirato, build PASS; 360 Node e 102 Deno PASS; PostgreSQL 16 locale PASS. Warning bundle Vite già noto. Il Supabase effettivo non è accessibile con la connessione corrente: compatibilità con schema/registro reali e migrazione live non sono attestati. Nessuna scrittura Shopify/Supabase o attivazione flag. La CI e GitGuardian precedenti riguardano `829eeb0`; nuovo HEAD da verificare separatamente. **CHANGES REQUIRED fino alla verifica remota delle correzioni e review del nuovo diff; staging e produzione restano bloccati da gate autonomi.** [Finding, scenari e prove](ADMIN-V2-QA-REPORT.md) · [Contratto di approvazione aggiornato](ADMIN-V2-NEW-PRODUCT-PLAN.md).

Aggiornamento GitHub: il commit di review `d6a89bb` ha [CI applicativa SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41236000206) e GitGuardian SUCCESS. Il nuovo commit documentale che registra questa prova richiede un check separato. La PR è ancora Draft, priva di review approvata; il gate schema reale e il canary restano aperti.

Smoke browser finale con sole API simulate: sei viewport 320–1440 px, percorsi Admin V2 e stati vuoto/errore PASS, senza page error; [evidenza](admin-v2-evidence/2026-10-31/browser-qa-review.json). Nessuna connessione a servizi live.

---

## 2 novembre 2026 — secret master Admin aggiornato, gate runtime ancora aperto

Il proprietario ha autorizzato la sostituzione del solo `PRODUCT_ADMIN_WRITES_ENABLED` con `false` nei Project secrets Lovable di Online Garden. Lovable ha confermato il salvataggio e la riga del secret mostra la data 2 novembre; il valore non è rileggibile dal pannello. La precedente lettura Admin autenticata in **Preview** alle 18:58 Europe/Rome era `writesEnabled=true`, `writeMode=canary`, `shopifySyncEnabled=false` e precede il cambio. Dopo il cambio, le sessioni disponibili sia in Preview sia su `onlinegarden.it/admin/settings` mostrano il login: nessuna risposta autenticata `get_admin_context` post-cambio è stata acquisita. **Runtime Preview/produzione NON VERIFICATO; PR #42 BLOCKED.** Nessun altro flag, deploy o dato Shopify/Supabase modificato; homepage pubblica ancora disponibile sul frontend `e26d6f4`. [Runbook aggiornato nel branch Draft #42](https://github.com/Rosin355/your-e-commerce-blueprint/blob/c05f58775e3fa9fb2299311cfc4dd520e8a26027/docs/ADMIN-V2-ACTIVATION-RUNBOOK.md). La sezione seguente registra il precedente rilascio UI della PR #44.

## 2 novembre 2026 — PR #44 pubblicata, gate runtime Admin V2 ancora bloccato

PR #44 `6804447d18c16255e2714c5e5677e5dbed54b23f` integrata con merge normale `e26d6f4d453ab3d959b9f9f670f9d707fda57202` dopo CI e GitGuardian SUCCESS e mergeability clean. Deploy Lovable del solo frontend `251548b2-46c2-4842-85a7-16f9c1cdfa6f`; [onlinegarden.it](https://onlinegarden.it/) serve il merge SHA verificato nel DOM. Smoke live PASS per homepage, catalogo, PDP, footer, carrello vuoto e login anonimo `/admin/settings`; nessun checkout, ordine o mutation. Nessun deploy Edge, migration, secret o flag modificati. La sessione disponibile non è Admin autenticata: `writesEnabled`, `writeMode`, `shopifySyncEnabled` **NON VERIFICATI** e PR #42 **BLOCKED**. [Evidenze e rollback](ADMIN-RUNTIME-DIAGNOSTICS-ONLY.md). La sezione seguente conserva il preflight anteriore al rilascio.

## 2 novembre 2026 — diagnostica Admin V2 isolata dalla PR #42

Branch da `main@04ae6d4`: sola vista read-only in `/admin/settings`, con test di ruoli/stati e nessuna modifica backend, migration, Shopify, checkout o flag. Il registro Lovable attesta la distribuzione di `product-admin-api` da `main@4f5bdef` il 10 ottobre; il file della funzione è identico a quello di `main@04ae6d4` e restituisce i tre campi richiesti tramite `get_admin_context`. Il connettore Supabase non autorizza il progetto Online Garden: il bundle Edge in esecuzione e i valori runtime **non sono stati letti direttamente**. La nuova UI fallisce in **NON VERIFICATO** se il contratto non corrisponde. La PR #42 resta invariata e il suo gate runtime resta **BLOCCATO** finché un Admin autorizzato non legge la vista sull'ambiente corretto dopo un'eventuale pubblicazione separatamente autorizzata. [Ambito, evidenze, piano e rollback](ADMIN-RUNTIME-DIAGNOSTICS-ONLY.md).

QA locale: `npm ci --offline`, typecheck, lint mirato, build, **343 Node + 92 Deno PASS**; dieci scenari browser con API simulate e rete esterna bloccata PASS a 1440/390 px. Sul commit implementativo `ef87ee8`, [CI applicativa](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41460497600) e [GitGuardian](https://github.com/Rosin355/your-e-commerce-blueprint/runs/125328292812) SUCCESS. Draft [PR #44](https://github.com/Rosin355/your-e-commerce-blueprint/pull/44) senza conflitti; il preflight pubblico ha rilevato il frontend `04ae6d4`, login Admin anonimo, homepage/catalogo/PDP/footer e carrello vuoto navigabili. Nessuna lettura autenticata dei flag; review, autorizzazione di merge e pubblicazione restano aperte. Ogni nuovo HEAD richiede check propri.

## 30 ottobre 2026 — CI minima reale, preservando la base #39

Introdotto workflow pull_request verso main e codex/storefront-main-integration con runtime e Action fissati, npm ci senza lifecycle script, typecheck, lint pertinente, build e test Node/Deno con lock frozen. Solo contents:read, nessun segreto applicativo o permesso di scrittura, nessun sync/import/backup/deploy; test Node con blocco rete e Deno senza permessi runtime rete/run/write. Codice dello storefront e test esistenti invariati.

Scelta esplicita dell’utente: aggiornare soltanto la #41 e validare nel suo job technical-base anche l’HEAD esatto #39 aa7e6ae, senza muovere la base. I check sono collegati alla #41; non si dichiarano check diretti nuovi sulla #39. QA locale: #41 339 Node + 92 Deno, #39 336 Node + 92 Deno; typecheck/lint/build positivi. [Run GitHub 41072668699](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699) SUCCESS su 6957184: entrambi gli SHA verificati con gli stessi conteggi, typecheck/lint/build e lock positivi; GitGuardian SUCCESS. Nessuna modifica alle protezioni branch. La #39 non ha un nuovo check applicativo direttamente collegato; il suo codice è validato dal job technical-base della #41. Il successivo commit delle evidenze genera una nuova run da controllare sull’HEAD finale. Review adeguate e staging/commerciale restano gate aperti: nessun READY FOR MERGE.

[Implementazione CI e bootstrap](CI-INTEGRATION.md) · [Release readiness corrente](release/FINAL-RELEASE-READINESS.md). I paragrafi successivi conservano lo stato precedente; i loro riferimenti a CI assente descrivono la situazione prima di questo intervento.

---

## 30 ottobre 2026 — integrazione finale Header Only, nuova Draft PR separata

La decisione cliente sostituisce UX 2.0 completa: homepage, catalogo e PDP con grafica precedente, soltanto navbar recente. Branch `codex/customer-experience-header-final` creato direttamente da #39 `aa7e6ae`, selezionando dieci file applicativi e il test monetario da `99fb008`; src identico al risultato approvato, nessuna ancestry/serie di commit importata dalla #40. HomepageV3 e HomeHero identici alla base.

QA locale positiva: typecheck/lint/build, 339 Node + 92 Deno, checkout di contratto simulato con fetch stub e browser desktop/mobile a sei larghezze. Mega-menu, ricerca, account non autenticato e carrello vuoto verificati; nessun checkout o ordine reale. 14 screenshot essenziali, senza duplicare l’archivio UX 2.0. GitGuardian #39/#40 risultava positivo alla verifica iniziale, ma restano mancanti CI applicativa e review adeguate: **BLOCKED al merge**. Staging/produzione e validazione commerciale separati.

Pubblicato soltanto il nuovo branch senza force push e aperta la **[Draft PR #41](https://github.com/Rosin355/your-e-commerce-blueprint/pull/41)** verso `codex/storefront-main-integration`, collegata a #39 e #40. GitGuardian #41 SUCCESS sul primo HEAD pubblicato `f4164ed`, mergeability clean e diff conforme al manifest; zero workflow applicativi e review: **BLOCKED al merge**. I check finali vanno confermati sul relativo HEAD. PR esistenti (inclusa #40 aperta) e worktree preservati. Nessun merge, deploy o cambiamento live. [Report corrente e gate](HEADER-ONLY-FINAL-INTEGRATION.md) · [Confronti essenziali](header-only-integration-evidence/2026-10-30/comparison.html). Le sezioni sotto sono storico della base.

---

## Safe storefront integration — 28 ottobre 2026

**READY FOR PR locale, non rilascio.** Nuovo worktree/branch `codex/storefront-main-integration` da `origin/main` esatto `0d1bf639d7fb0c8cd5c47b2dc222ea86c5b1bab3`; port selettivo dei tre commit storefront, senza vecchio Admin/backend. Contratti main per discovery/home/correlati/date e filtro prodotti test conservati. Catalogo senza cap 1.000, varianti complete, errori/checkout protetti, payload adattato, a11y e SEO/JSON-LD DOM.

QA: typecheck/build/lint mirato, **336 test Node + 92 Deno**, 15 scenari UX, 6 scala/SEO production, 4 safe production e 3 integrazione production; checker Edge main PASS. Lo script npm principale include file Deno incompatibili con Node già nella baseline: runner separato fornito, tutti i test eseguiti nel runtime corretto. Fixture 10k complete, JSON per prodotto circa −60,2% rispetto a main, senza equivalenza della latenza sul main troncato a 1k. Nessuna prova live o di indicizzazione.

Admin/auth/RLS/Supabase/Edge/sync/package e lockfile invariati; mutation cartCreate identica. Tutti i 39 file dirty/untracked originali e i 18 protetti verificati via SHA-256. Nessun push/merge/PR/deploy. [Report, matrice e gate](STOREFRONT-MAIN-INTEGRATION.md). La cronologia main seguente è preservata.

---

# Online Garden — stato consolidato del progetto

## 1 novembre 2026 — stato corrente del rilascio footer PR #43

**Footer pubblicato e verificato su https://onlinegarden.it.** PR [#43](https://github.com/Rosin355/your-e-commerce-blueprint/pull/43) unita senza bypass. HEAD sorgente `e617c05ad9afcaf2c22ad5faac0da06e8bd9ad1d`; merge e commit effettivamente servito in produzione `8d2a160917895735658e34a37d6b337733a32649`. Deploy Lovable esplicito `0ae71161-a4cc-407e-ae36-b2202f381981`, confermato dal DOM del footer e dal `data-commit-sha` dell'HTML pubblico, non dal solo merge.

Footer senza placeholder/social/newsletter inattivi; cinque destinazioni catalogo reali, `/contatti` con `mailto:info@onlinegarden.it`, privacy collegata al documento Shopify ufficiale italiano. Le quattro policy assenti non sono pubblicate: fallback 404 UI/noindex client-side, HTTP 200 SPA ancora da migliorare. Nessun dato societario storico riutilizzato.

Preflight: main senza review/protezioni obbligatorie, CI e GitGuardian SUCCESS sull'HEAD sorgente, review tecnica COMMENT registrata; main → Lovable → dominio primario confermati. Nessuna parte delle PR #40/#42 integrata. Typecheck/lint mirato/build ripetuti PASS; precedente CI 339 Node + 92 Deno e QA offline preservata, codice applicativo del merge identico all'HEAD validato. Post-deploy: **16 controlli browser PASS**, categorie/Contatti/PDP desktop-mobile, tastiera/focus e carrello vuoto; 16 URL HTTP e 5 risorse iniziali verificati. Zero errori console inattesi; warning Radix della descrizione del drawer mobile preesistente, non bloccante. Nessun cartCreate o ordine live.

**Rilascio tecnico footer: ONLINE. Abilitazione commerciale/conformità privacy: NON approvate né certificate.** Mancano Cookie Policy, termini, spedizioni/resi e dati societari approvati. Visitor analytics Lovable ancora ON, script hosting invariati; disattivazione disponibile nelle impostazioni ma non autorizzata/eseguita. Safari/iOS reale, checkout completo e strategia HTTP/SEO restano da verificare.

Rollback disponibile a `b5cbe57`: revert del merge tramite processo di review, sincronizzazione e ripubblicazione; nessun force push o rollback dati. Nessuna modifica Shopify/Supabase/DNS, Admin V2 o flag. Le note footer sono collocate in questa sezione autonoma per non sovrapporsi agli aggiornamenti di apertura/chiusura documenti della PR #42, che resta separata.

[Report corrente](legal/FOOTER-AND-POLICY-INTEGRATION.md) · [QA e screenshot reali](legal/release-evidence/2026-11-01/README.md) · [Checklist approvazioni](legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md).

### Storico precedente alla pubblicazione del footer

## FINAL MOBILE STOREFRONT QA — 10 ottobre 2026

`CODEX VERIFIED / OFFLINE TESTED ONLY`: completato il pass finale sullo
storefront senza modificare dati Shopify, Admin V2, schema Supabase, checkout o
configurazione live.

- Mobile: announcement compatto con copia breve dedicata, header ridotto ma con
  ricerca sempre visibile, breadcrumb PDP contenuto, gallery con altezza massima
  e `object-contain`, calendario con scroll interno isolato, contenuti lunghi
  wrappabili e sticky add-to-cart ancorata al fondo con safe-area.
- Ricerca: ranking deterministico per titolo, tassonomia canonica di
  `src/config/categories.ts`, product type/tag/vendor e descrizione; supportati
  accenti e variazioni singolare/plurale conservative.
- Homepage: una sola lettura Storefront ordinata per creazione e tre selezioni
  stabili (novità, outdoor, botanica), massimo quattro prodotti ciascuna e zero
  duplicati tra sezioni.
- PDP: prodotti suggeriti prima dalla stessa collezione canonica, poi da
  collezioni sibling della stessa categoria e infine dal catalogo pubblico;
  prodotto corrente, duplicati e record senza immagine sono esclusi.
- Breakpoint verificati: 320x568, 375x812, 390x844, 430x932, 768px e 1440px.

Non bloccante: le selezioni editoriali dipendono dalla copertura immagini e
dalle associazioni alle collezioni già pubblicate nello Storefront API; in caso
di set idoneo ridotto, la UI mostra meno prodotti senza introdurre duplicati.

## Aggiornamento 10 ottobre 2026 — Admin → Shopify sync canary chiuso

`LOVABLE REPORTED / LIVE CANARY PASS`: il flusso Admin V2 → Shopify a campo singolo è stato validato end-to-end su `OG_111899`.

- Migration una tantum `0014_one_time_shopify_id_safe_backfill` applicata una sola volta: 1.833 `SAFE_BACKFILL` compilati, ID Shopify presenti da 421 a 2.254 su 2.706 righe; 452 `UNMATCHED` invariati; 0 overwrite di ID esistenti.
- `OG_111899` risolve a `gid://shopify/Product/15836694249812`.
- `periodo_di_fioritura` interno = Marzo, Aprile, Maggio; sync Shopify PASS come `single_line_text_field` con valore `Marzo, Aprile, Maggio`.
- Verifica post-write Admin PASS: stato `SYNCED`, una sola operazione, nessun altro prodotto/campo sincronizzato.
- `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` è stato rimosso al termine del canary e verificato OFF.
- Admin V2 client-safe sync: **READY PER IL CLIENTE** per i campi supportati e solo tramite azione esplicita.

Nota di evidenza: il valore Shopify è stato riletto dall'Admin immediatamente dopo la mutation; la verifica diretta nell'account Shopify non è stata ripetuta perché la sessione del connettore era scaduta.

## Aggiornamento 7 ottobre 2026 — riconciliazione ID prodotto Shopify

`CODEX VERIFIED / OFFLINE TESTED ONLY`: è disponibile il controlled script
`scripts/admin-shopify-id-backfill.sql` per riconciliare in modo deterministico
gli ID prodotto Shopify mancanti nel catalogo operativo Admin. La sorgente
runtime canonica resta `product_sync_csv_products.shopify_product_id`; il
ledger storico 3B.2/3B.4 viene letto esclusivamente durante la riconciliazione
come evidenza privata e non è mai consultato come fallback da Admin V2.

Il dry-run è obbligatorio e produce `TOTAL_MISSING`, `SAFE_BACKFILL`,
`CONFLICT`, `UNMATCHED`, l'elenco esatto delle righe target e le anomalie. Una
riga è `SAFE_BACKFILL` solo con SKU esatto, Product GID valido, prova verificata
univoca e struttura parent/variation coerente. Per una variation sono richieste
sia la prova `CREATE_VARIANT` sia la prova del parent sul medesimo Product GID.
Gli ID Admin non null non vengono mai sovrascritti.

Il percorso `execute` è esplicito, transazionale e idempotente. Prima e dopo
confronta numero righe e hash di `product_current_values`, history e colonne
catalogo non autorizzate; `updated_at` è l'unica colonna tecnica aggiuntiva
aggiornata dal trigger storico della tabella. La seconda esecuzione deve avere
zero write. Il gate finale richiede inoltre che `OG_111899` risolva esattamente
`gid://shopify/Product/15836694249812`.

`NOT EXECUTED LIVE`: Codex non ha eseguito né dry-run SQL privilegiato né
execute sul database effettivo. Il project reference pubblico presente nel
checkout non espone i dati operativi e il connettore disponibile non è
autorizzato sul progetto; i conteggi reali restano pertanto da acquisire con il
dry-run tramite un accesso DB approvato. Nessun deploy, write DB live o write
Shopify è stato eseguito.

## Aggiornamento 6 ottobre 2026 — creazione controllata valori mancanti

`CODEX VERIFIED / OFFLINE TESTED ONLY`: l’Admin V2 può creare il primo valore
soltanto per `periodo_di_fioritura`, `periodo_di_messa_a_dimora`,
`periodo_di_raccolta`, `periodo_ottimale_di_potatura` e
`difficolta_di_coltivazione`, oltre al percorso `manual_only` già esistente.
La policy è server-side, usa `expectedVersion=0`, validazione tipizzata e RPC
atomica; il risultato è versione 1 con history 0→1. Per campi pubblicabili con
mapping supportato lo stato interno diventa `PENDING_SYNC`, senza chiamate
Shopify automatiche.

Se un campo stagionale è vuoto, puoi compilarlo normalmente. Non devi
conoscere o inserire il formato tecnico Shopify.

`NOT EXECUTED LIVE`: nessuna migration, deploy, scrittura DB live o scrittura
Shopify è stata eseguita per questo follow-up.

## Aggiornamento 6 ottobre 2026 — Admin client-safe + field sync

`CODEX VERIFIED / OFFLINE TESTED ONLY`: è stata preparata l’integrazione Admin
V2 per editor stagionali vincolati, enum difficoltà, stati di sincronizzazione,
confronto con valori Shopify live e sync esplicita a campo singolo. Il target
Shopify è derivato dal registro server-side; permessi, `expectedVersion`, SKU
esatto, idempotenza, drift e verifica post-write sono obbligatori.

`NOT EXECUTED LIVE`: migration, deploy frontend/Edge, attivazione
`PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED`, chiamate di scrittura Shopify e merge.
La feature flag resta disabilitata per default. Prima del lancio servono review,
applicazione migration, deploy coordinato e smoke controllato su uno SKU
esplicitamente approvato. Dettagli in `docs/admin-v2-client-editing.md` e nella
sezione Admin V2 di `docs/product-sync-architecture.md`.

### Chiarimento migration Admin client-safe

Il progetto live corrente dispone già dello schema base del catalogo Admin
(`products`, registro dei campi, valori correnti, history e command log), creato
dalla catena storica e già utilizzato dall'Admin V2. La migration
`20261006143000_admin_client_safe_field_sync.sql` è intenzionalmente additiva:
estende quello schema esistente con lo stato e le primitive necessarie alla
sincronizzazione Shopify a campo singolo e non ricrea né sostituisce le tabelle
base.

Una catena bootstrap/clean-room autosufficiente che ricostruisca da zero tutto
lo schema Admin storico resta debito tecnico esplicito. Questo limite riguarda
la creazione di un ambiente nuovo e vuoto; non blocca l'ambiente live esistente,
nel quale le dipendenze base sono già presenti. Non è stata introdotta una
migration distruttiva o retroattiva per mascherare tale debito.

Data di consolidamento: 2 ottobre 2026
Baseline runtime approvata: `main@82f77933bc289043e223a7a48d9bd273e96bbc41`
Baseline Git 2D.4A: `origin/main@0959f95202824cb2a005a6f140282995579a3895`

## Stato operativo corrente — 1 ottobre 2026

> Questa sezione è autoritativa per il gate di go-live.

- Backend 2C.1: **CLOSED lato server**.
- 2C.1b live PASS: update, replay `replayed=true`, `IDEMPOTENCY_CONFLICT`, restore e race handling.
- 2C.1c live PASS: CREATE `expectedVersion=0` su `OG_365676.colore_fiore = "viola"`; version 1, locked/manual/approved/protected, lineage NULL/NULL, history 0→1, replay PASS, conflict PASS.
- Conteggi correnti: 2.706 products, 24.467 current values, history 5, command log 5, AI suggestions 0, publication jobs 0, sync jobs 36, pipeline jobs 1, import batch 1.
- Admin V2 UX: **GO-LIVE READY**. QA read-only PASS su navigazione, fixture, campi strutturali, responsive 1440/820/390, loading/error/empty state.
- Due P3 UI corretti: Salva solo su dirty state; "Valore non ancora inserito" al posto di "Versione: 0". Messaggi tecnici ripuliti e errori collegati ai field.
- Non bloccanti: cronologia con nomi tecnici, ruolo Editor non provato live, mismatch cosmetico di `validate_field_update`.
- `OG_393883` non modificato. Modalità `canary` ancora attiva.
- Fase 2D Admin AI field-by-field: **BACKEND DATABASE READY / EDGE DEPLOY
  BLOCCATO FINO AL MERGE 2D.6 / AI NON LIVE**. Le migration 2D.2, 2D.4A e
  2D.4B risultano applicate una sola volta secondo Lovable; ACL verificate a
  SELECT/INSERT/UPDATE del solo `service_role`. Il deploy Edge si è fermato al
  packaging prima della distribuzione per import tra cartelle sibling. Nessuna
  call AI live, write prodotto o Shopify.
- Fase 3A Shopify/storefront: **BLOCKED**. Shopify espone 461 prodotti; 458 risultano esauriti. Solo `OG_257799`, `OG_426481`, `OG_797988` sono acquistabili e tutti e tre sono senza immagini. Checkout tecnico PASS; spedizioni/tasse/totale finale ed email ordine non ancora verificati. Mobile FAIL per overflow orizzontale su catalogo e prodotto. `OG_152965` safe; `OG_891874` e `OG_758263` richiedono review strutturale.
- Fase 3B diagnosi: **COMPLETATA READ-ONLY**. 462/462 varianti Shopify hanno `quantityAvailable=0`; le sorgenti raw hanno quantità esplicite solo su 56/2.626 righe SKU (13 positive, 43 zero) e i normalizzatori legacy portano i mancanti a zero. Le pipeline legacy non impostano in modo completo quantity/tracking/location. I 461 prodotti live derivano da sync parziali, non da un manifest commerciale riproducibile. WordPress raw: 1.151 prodotti senza immagini, 493 con una, 982 con gallery; Shopify live: 3 senza immagini, 458 con una, 0 con gallery. Root cause mobile: `HomeAnnouncementBar.tsx` con `whitespace-nowrap`. Checkout EN perché il mercato/domain pubblica solo EN.
- Fase 3B.1A inventory preflight: **STOP conservativo / BLOCKED BY SHOPIFY CONFIG ACCESS**. Account Shopify ricollegato; lettura prodotto disponibile solo per SKU/prezzo/status/ID. Non sono leggibili location, `inventoryItem.tracked`, `inventoryPolicy` o inventory levels, quindi non è possibile spiegare in modo affidabile perché i tre SKU acquistabili siano vendibili né costruire un manifest old→new. Nessuna write eseguita; canary invariato.

### Gate mancanti per il go-live

1. Integrare il packaging fix 2D.6, poi eseguire rilascio coordinato e smoke
   read-only della Fase 2D.
2. Caricare/verificare giacenze reali su Shopify.
3. Decidere il perimetro di pubblicazione e portare online i prodotti previsti per il lancio.
4. Aggiungere foto ai prodotti acquistabili e verificare la copertura immagini.
5. Verificare le regole di spedizione Italia.
6. Correggere l'overflow mobile su catalogo/prodotto.
7. Riesaminare `OG_891874` e `OG_758263`; preservare `OG_152965` come simple.
8. Completare un ordine E2E controllato, includendo totale, tasse, spedizione, email e lingua checkout.
9. Uscire dal canary solo dopo PASS del rerun QA commerciale.

### Non bloccanti

Backfill lineage 14.295 `MATCH_READY`, ruolo Editor live e miglioramenti cosmetici possono essere pianificati dopo il primo go-live. L'AI field-by-field è invece un requisito di handoff: il codice è pronto ma non è ancora live.

## 1. Executive summary

Online Garden dispone oggi di una fondazione catalogo lossless, Admin V2
pubblicato, controlli di sicurezza sulle funzioni legacy e una pipeline Smart
Sync che conserva i CSV di lavoro in Storage privato. `products` è l'unica
anagrafica canonica; snapshot, valori correnti, suggerimenti, history e log dei
comandi rimangono separati e tracciabili.

La Fase 2C.1 è presente su `main` tramite commit Lovable successivi alla base
della PR #15. Il report Lovable versionato dichiara backup privato completato,
migration applicata una sola volta e `product-admin-api` distribuita dalla
stessa revisione. Codex ha verificato direttamente codice, hash e cronologia
Git, ma non ha interrogato autonomamente il database o il deployment live.

Le prove live 2C.1–2C.1c hanno confermato update/ripristino di un campo
`manual_only` locked, replay idempotente, conflitto con payload diverso e
creazione con `expectedVersion=0`. Lock, lineage e audit sono rimasti integri.
La 2C.1b è live tramite la baseline runtime `main@82f7793`; la 2C.1a non è stata
distribuita autonomamente. `OG_393883` resta escluso dalle modifiche senza
approvazione esplicita.

## 2. Come leggere le evidenze

| Etichetta | Significato |
|---|---|
| `CODEX VERIFIED` | Verifica diretta su repository, GitHub, codice o test locale/isolato. |
| `LOVABLE REPORTED` | Evidenza live riportata da Lovable e conservata nei report versionati; non ripetuta direttamente da Codex. |
| `OFFLINE TESTED ONLY` | Comportamento provato con fixture sintetiche o PostgreSQL isolato, non con scritture live. |
| `NOT EXECUTED LIVE` | Attività intenzionalmente non eseguita in produzione. |

Una voce `LOVABLE REPORTED` non deve essere reinterpretata come verifica live
diretta Codex.

## 3. Stato per area

| Area | Stato | Evidenza e limite attuale |
|---|---|---|
| Catalogo lossless | **LIVE / STABILE** | PR #1–#3 integrate; 2.706 prodotti e 24.466 current values preservati secondo i report live. `CODEX VERIFIED` per codice e merge; conteggi `LOVABLE REPORTED`. |
| WordPress lineage | **PARZIALE** | Snapshot presenti; `source_snapshot_id` nullable. Backfill non eseguito: dry-run 14.295 `MATCH_READY`, 271 `NO_MATCH`, 9.900 `NOT_APPLICABLE`, 0 ambigui (`LOVABLE REPORTED`). |
| Golden SKU | **VERIFICATO** | Riconciliazione 20 SKU senza conflitti nel dry-run offline; `OG_393883` usato solo per letture e controlli di protezione. |
| Admin V2 frontend | **LIVE** | PR #4 e pubblicazione 2B.6 completate; editor tipizzati, FAQ strutturate, capability server-side, lineage nullable e conflitti versione disponibili. |
| Admin V2 backend 2C.1 | **LIVE / CLOSED** | Update, restore, replay `replayed=true`, `IDEMPOTENCY_CONFLICT` e create `expectedVersion=0` superati live; canary ancora attivo. |
| Sicurezza legacy | **CLOSED / MITIGATED** | PR #5, #6, #8 e #9 integrate e riportate come distribuite/collaudate. Restano documentati i limiti dei test non Admin dove non eseguiti live. |
| Storage firmato | **CLOSED** | Autorizzazione caller e limiti bucket/percorso introdotti; non ripristinare la versione vulnerabile. |
| Smart Sync | **LIVE / GATE A-B-C PASS** | PR #12 integrata; CSV nuovi in `csv-pipeline`, immagini ancora pubbliche in `sync/product-images/**`; CSV pubblico rimosso. |
| Shopify | **SEPARATO** | Nessun salvataggio Admin V2 attiva Shopify. Sync e pubblicazione commerciale richiedono task e approvazione separati. |
| AI | **DATABASE READY / PACKAGING 2D.6 IN REVIEW / RUNTIME NON LIVE** | 2D.2, 2D.4A e 2D.4B applicate una volta e ACL SIU verificate secondo Lovable. Edge deploy fallito prima della distribuzione per import sibling; AI legacy preservata, nessuna call AI o Shopify. |
| Storefront/checkout | **FUORI DALLE MODIFICHE 2C.1** | Nessun cambiamento intenzionale. Collaudo commerciale end-to-end ancora da pianificare. |

## 4. Fasi, PR e stato live

| Fase | Stato | PR / commit principale | Live | Test / evidenza |
|---|---|---|---|---|
| 1A–1B, lossless foundation | COMPLETATA | PR #1, merge `1f8f1bd` | Sì | Test catalogo/build Codex; migration e 24.466 valori preservati `LOVABLE REPORTED`. |
| 1B.4, lockfile | COMPLETATA | PR #2 `78fb458`, PR #3 `7858f6c` | N/A | `npm ci`, typecheck, catalogo e build verdi. |
| 2A, audit Admin V2 | COMPLETATA | report audit | No deploy autonomo | Inventario funzionale `CODEX VERIFIED`. |
| 2B, editor sicuri | COMPLETATA | PR #4 `b129489` | Sì | Edge-first e frontend pubblicato; smoke read-only `LOVABLE REPORTED`. |
| 2C.0, RLS enrichment | CLOSED | PR #5 `dd3bcf7` | Sì | PostgreSQL isolato + applicazione live riferita. |
| 2C.0, async auth | CLOSED | PR #6 `29725e3` | Sì | Test autorizzazione e deploy live riferito. |
| Chiusura documentale | COMPLETATA | PR #7 `afccee2` | N/A | Docs-only. |
| Signed URL | CLOSED | PR #8 `9a66d2c` | Sì | Test Storage; test live non Admin non eseguito. |
| STORAGE-004 auth pipeline | CLOSED | PR #9 `85feb23` | Sì | Test auth/deno/build e deploy riferito. |
| STORAGE-003 progetto | COMPLETATA | PR #10 `a3650d6`, #11 `003a4a4` | N/A | Piano e preflight read-only. |
| STORAGE-003 Smart Sync | CLOSED | PR #12 `2d8b993` | Sì | Gate B superato; flusso job → upload privato → `source_path` → batch. |
| STORAGE-003 Gate B docs | COMPLETATA | PR #13 `9979d96` | N/A | Docs-only. |
| STORAGE-003 Gate C docs | COMPLETATA | PR #14, merge `4bd6115` | Sì | Report Gate C e tracciabilità delle verifiche integrati su `main`. |
| 2C.1 manual locked backend | BACKEND LIVE / CLOSED | PR #15, merge `3f674b4`; Lovable `9b6ed9f`–`6db554d` | Sì, secondo report Lovable | PostgreSQL isolato 10/10; update/rollback live PASS. |
| 2C.1a replay idempotente | INTEGRATA IN 2C.1b | PR #17, merge `98525ee`; commit `29adddb` | Non autonomamente | Fix sequenziale preservato; la release standalone non è stata eseguita. |
| 2C.1b race idempotente | LIVE / CLOSED | PR #18; runtime `main@82f7793` | Sì | Replay sequenziale e concorrente, key diversa/payload diverso e stale command PASS; nessuna migration. |
| 2C.1c create version zero | LIVE SMOKE PASS | fixture approvata `OG_365676.colore_fiore` | Sì | Create v1, replay e `IDEMPOTENCY_CONFLICT` PASS; valore editoriale mantenuto. |
| 2D Admin AI field-by-field | 2D.6 PACKAGING FIX IN REVIEW | PR #22–#24; baseline 2D.6 `436d048` | No | DB/ACL ready secondo Lovable; Edge deploy non distribuito. Test AI 34/34, catalogo 249/249, PostgreSQL e grafi packaging PASS offline; Edge/frontend non pubblicati. |

Le PR #14 e #15 sono state mergiate su `main`. Il merge ha integrato report,
test e documentazione già revisionati; non costituisce una nuova applicazione
della migration né un nuovo deploy della Edge Function.

## 5. Stato sicurezza consolidato

| Finding | Stato | Verifica |
|---|---|---|
| `LEGACY-001/002` — accesso eccessivo a enrichment runs/items | **CLOSED — LIVE VERIFIED BY LOVABLE** | RLS/GRANT ristretti con PR #5; test PostgreSQL isolato Codex. |
| Auth asincrona non attesa in tre Edge Functions | **CLOSED — LIVE VERIFIED BY LOVABLE** | `await assertAdminRequest` con PR #6; vecchia versione non va ripristinata. |
| `storage-signed-url` autorizzazione caller | **MITIGATED — LIVE VERIFIED BY LOVABLE** | PR #8; test live non Admin non eseguito e mantenuto come limite esplicito. |
| STORAGE-004 — funzioni pipeline senza gate Admin completo | **CLOSED — LIVE VERIFIED BY LOVABLE** | PR #9; auth prima delle operazioni privilegiate. |
| STORAGE-003 — CSV cliente nel bucket pubblico `sync` | **CLOSED — LIVE VERIFIED BY LOVABLE** | Gate A/B/C PASS; backup privato, Smart Sync privato e rimozione oggetto pubblico. |
| Immagini prodotto pubbliche | **NOT APPLICABLE AS VULNERABILITY** | Accesso pubblico intenzionale limitato a `sync/product-images/**`. |
| Campi manuali protetti non salvabili | **MITIGATED, LIVE UPDATE VERIFIED BY LOVABLE** | Update e rollback riusciti; create versione 0 e replay di successo restano aperti. |
| Reservation AI ACL | **CLOSED / LIVE VERIFIED BY LOVABLE** | 2D.4A applicata una volta: PUBLIC/anon/authenticated none; service role SELECT/INSERT/UPDATE. |
| Suggestion AI ACL | **CLOSED / LIVE VERIFIED BY LOVABLE** | 2D.4B applicata una volta: PUBLIC/anon/authenticated none; service role SELECT/INSERT/UPDATE; RLS e policy invariate. |
| Import Edge tra cartelle sibling | **FIX 2D.6 IN REVIEW** | Deploy fermato prima della distribuzione. Primitive condivise estratte in `_shared`; zero import sibling verificati offline. |

## 6. Fase 2C.1 — stato effettivo

### Verificato direttamente da Codex

- `origin/main@3f674b4` contiene la migration Supabase, la corrispondente
  migration Drizzle, il journal e i sei moduli modificati di
  `product-admin-api`;
- la migration Supabase ha SHA-256
  `b7f1fdafcced766f2f9443d9faa53cef769d3e9d48b3a35194ea2c0304b2a898`;
- i file runtime su `main` coincidono con l'implementazione applicativa della
  PR #15;
- PR #15 è mergiata con merge commit
  `3f674b48210908b115aa72f55bf692e4a3e85c35`; il suo commit applicativo è
  `01b43137381cc19136a41e37d12c6bedfca48544`.

### Evidenza live riferita da Lovable

- preflight live read-only PASS e nessun drift incompatibile;
- backup privato di RPC, ACL e sole righe fixture completato;
- migration applicata e registrata una sola volta;
- `product-admin-api` distribuita dalla stessa revisione;
- 2.706 prodotti, 24.466 current values e 68 definizioni invariati;
- 29 current values manuali restano locked/protected;
- i cinque campi golden sono `manual_only`, AI disabilitata e protetti;
- 13.501 combinazioni manuali applicabili non hanno ancora un current value;
- history e command log risultavano vuoti prima dello smoke test;
- `OG_393883` è stato controllato esclusivamente in lettura.

### Smoke live riferito da Lovable

- update di `OG_264361.nome_comune` da versione 1 a 2: PASS;
- ripristino del valore iniziale da versione 2 a 3: PASS;
- `is_locked`, protezione, provenance e lineage: preservate;
- conflitto con versione stale: PASS, nessun dato aggiuntivo;
- due modifiche applicate, due history e due command log: coerenti;
- lo smoke iniziale aveva evidenziato `VERSION_CONFLICT` sul replay; dopo il
  forward-fix 2C.1b il replay live restituisce `replayed=true` senza duplicati;
- create `expectedVersion=0` su `OG_365676.colore_fiore`: PASS, con replay e
  `IDEMPOTENCY_CONFLICT` corretti.

### Non eseguito live

- collaudo live con ruolo editor/non Admin;
- qualsiasi scrittura su `OG_393883`.

## 7. Open items reali

1. Revisionare e integrare il packaging fix 2D.6.
2. Rilasciare in modo coordinato le due Edge Functions dalla stessa revisione;
   eseguire prima lo smoke read-only e
   fermarsi prima di ogni accettazione non autorizzata.
3. Collaudare, se necessario, il ruolo Editor/non Admin senza usare
   `OG_393883` per scritture.
4. Decidere separatamente se eseguire il backfill lineage dei soli 14.295
   `MATCH_READY`; oggi resta opzionale e non eseguito.
5. Eseguire il piano di remediation e collaudo commerciale Shopify/storefront.
6. Riesaminare le variation WordPress di `OG_152965`, `OG_891874` e
   `OG_758263` prima di cambiare l'attuale `entity_type` simple.

## 8. Prossimi passi, in ordine

1. Review e merge del packaging fix 2D.6, senza deploy automatico.
2. Rilascio coordinato Edge/API dalla stessa revisione e smoke read-only.
3. Pubblicazione frontend e smoke AI controllato solo dopo il gate Edge.
4. Decisione sul backfill lineage.
5. Remediation inventario/pubblicazione/immagini/spedizioni Shopify.
6. Collaudo commerciale Shopify e storefront.

## 9. Vincoli permanenti

- nessun export privato, token o URL firmato in Git;
- nessuna seconda anagrafica: la tabella canonica resta `products`;
- nessuna scrittura browser diretta sulle tabelle lossless;
- `is_locked` non va rimosso per rendere editabile un campo manuale;
- AI, import e Shopify non possono sovrascrivere i cinque campi manuali;
- migration già applicate non vanno rieseguite o registrate manualmente;
- rollback tramite nuova modifica versionata o release precedente, mai tramite
  cancellazione di history o riduzione della versione.

## Aggiornamento 29/09/2026 — 2C.1c

Smoke live CREATE su OG_365676/`colore_fiore` = `viola` (v1, locked, lineage NULL) superato, con replay e IDEMPOTENCY_CONFLICT corretti. Backend 2C.1 chiuso; canary attivo. Dettagli in `docs/fase2c/backend-release-2C1.md`.


## Fase 2C.2 — QA finale Admin V2 (2026-09-29)
ADMIN V2 UX — GO-LIVE READY (canary attivo). Backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore="viola" permanente; current values 24.467, history 5, command log 5. Due fix UX P3 (Salva solo con modifiche, niente "versione 0"). Dettagli: `docs/fase2c/qa-finale-admin-2C2.md`.

## Fase 2D.4A — privilegi AI (2026-10-01)

`CODEX VERIFIED`: forward migration minimale per restringere
`product_ai_generation_reservations` a SELECT/INSERT/UPDATE del solo
`service_role`; PostgreSQL isolato PASS con default ACL live-like, RPC e
concorrenza invariati. `NOT EXECUTED LIVE`: migration, Edge, frontend e AI.

Audit repository `product_ai_suggestions`: solo il backend 2D usa
SELECT/INSERT/UPDATE; frontend e AI Writer legacy non dipendono direttamente
dalla tabella. L'ACL live riferita `authenticated=ALL` resta un gate bloccante,
perché RLS non copre TRUNCATE/REFERENCES/TRIGGER. Preflight live read-only da
eseguire tramite Lovable; nessun progetto Online Garden accessibile al
connettore Codex.


## Fase 2D.7 (2026-10-02)
2D EDGE BACKEND LIVE · READ-ONLY SMOKE PASS · FRONTEND NOT PUBLISHED · AI PROVIDER NOT CALLED · AI GENERATION NOT YET TESTED · CANARY ACTIVE. Dettagli: `docs/fase2d/edge-live-2D7.md`.

## Fase 2D.8 — AI generation smoke (2026-10-02)
Frontend AI pubblicato; una generazione su OG_264361 `seo_title` → suggestion pending `72d271c6`, valore prodotto invariato, accept/reject non testati, canary attivo. Dettagli: `docs/fase2d/ai-generation-smoke-2D8.md`.


## 2D.8S — Post-publish security (2026-10-02)
POST-PUBLISH SECURITY PASS (read-only), nessun P1/P2; suggestion OG_264361/seo_title ancora pending; CONTROLLED ACCEPT NOT YET TESTED; canary attivo. Dettagli: `docs/fase2d/post-publish-security-2D8S.md`.


## 2D.9 — Controlled accept (2026-10-02)
Accept live su OG_264361/seo_title v1→v2, history/command +1, replay idempotente e conflict 409 verificati, Shopify non toccato, provider 0, canary attivo, restore non eseguito. Dettagli: `docs/fase2d/ai-controlled-accept-2D9.md`.

## Live deploy Admin V2 client-safe sync — 2026-10-06 (main@889d6ce)
- Migration `20261006143000_admin_client_safe_field_sync` applicata una volta: 4 colonne `shopify_*` presenti, periodi = multiselect/array (12 mesi), difficoltà = select Facile/Media/Difficile, trigger PENDING_SYNC e RPC `admin_complete_product_field_sync` (solo service_role). 24.467 valori invariati (hash identico prima/dopo). PASS.
- Deploy della sola `product-admin-api`: PASS. `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` assente = OFF.
- Pubblicazione frontend richiesta dalla stessa revisione.
- Smoke test autenticato e canary: NON eseguiti — serve un account admin per la sessione di test e un prodotto canary approvato esplicitamente. Nessuna scrittura Shopify effettuata.
- Stato: STOPPED in attesa di account di test + prodotto canary.

## Handoff cliente (2026-10-10)

- Admin V2 pronto; cliente con ruolo `editor` (istruzioni in `docs/admin-v2-client-editing.md`).
- Sync Shopify da Admin: solo admin/tech_admin, flag `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` OFF.
- Catalogo: 887 prodotti pubblicati, 16 in bozza (14 descrizioni bloccate, 2 media), 0 prodotti in collection.
- Negozio Shopify ancora protetto da password; Shopify Payments da attivare prima degli ordini reali.
- Drift migration: `drizzle/migrations/0012` e `0013` identiche (stesso SHA-256); DB sicuro, solo contabilità del repository.

## Final store cleanup + nav hotfix (2026-10-10)
- Rose subcategories hidden from mega menu/mobile drawer until a real classification exists; only `/collections/rose` is linked.
- Conifere confirmed live; "in arrivo" copy removed.
- 2 test products (TEST-001, TEST-002) hidden from all storefront listings, search, homepage, related, collections and PDP via a frontend ID filter in `src/lib/shopify.ts`. Their Shopify status is still ACTIVE (the agent's tools cannot change status); set them to DRAFT in Shopify Admin for a full backend-level removal.


## Admin V2 operativo + notifiche — 31 ottobre 2026

Base verificata `main@b5cbe57` con PR #39/#41 integrate; #40 esclusa. Implementati in branch isolato: categorie reali interne, anteprima/assegnazione controllata, nuovo prodotto manuale, journal idempotente, mapping e recupero DRAFT. QA locale e simulata positiva; nuove mutation OFF per default. Nessuna migrazione/deploy/live write. Il collaudo live di schema, ruoli, scope, canary e ricezione email resta aperto.

Riferimenti: [Piano Admin](./ADMIN-V2-NEW-PRODUCT-PLAN.md), [QA](./ADMIN-V2-QA-REPORT.md), [Notifiche Shopify](./SHOPIFY-EMAIL-NOTIFICATIONS-AUDIT.md).

Draft PR [#42](https://github.com/Rosin355/your-e-commerce-blueprint/pull/42) pubblicata. CI applicativa e GitGuardian verificati SUCCESS sul codice `38b6324`; [esecuzione](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41232830219). Esito tecnico distinto dai gate live ancora aperti: nessuna attivazione del negozio.


**Addendum finale, connessione Shopify resa disponibile:** sola lettura sullo store corretto conferma EUR, italiano principale pubblicato, nuovi account cliente facoltativi, 1.348 prodotti ACTIVE, 16 DRAFT e 55 collezioni. Nessuna scrittura effettuata. Mapping Supabase, riconciliazione storica, autorizzazioni Marco, template/mittente/staff e recapito email restano non verificati. I gate di attivazione non cambiano.
