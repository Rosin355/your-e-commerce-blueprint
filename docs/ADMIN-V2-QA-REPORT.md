## QA consegna operativa — 10 novembre 2026

PR di completamento: [#50](https://github.com/Rosin355/your-e-commerce-blueprint/pull/50), branch `codex/admin-v2-operational-delivery`. CI/GitGuardian e merge da confermare sull’HEAD finale; nessuna operatività live dichiarata.

**Stato corrente: prove locali del codice, non accettazione produttiva.** Frontend/backend TypeScript e lint mirato PASS; build operativa locale PASS. Test HTTP/policy mirati: 30 PASS (approvazioni persistite, revoca/scadenza, payload alterato, replay, prezzi esatti, drift, blocco pubblicazione tecnica, upload server-side e retry senza doppio file). Servizio bozze: 11 test di creazione/recovery/categorie aggiornati per i nuovi grant PASS. La CI verificherà lo SHA finale. Fixture SQL isolata PostgreSQL 16.15: atomicità con errore intermedio, ACL/RLS, claim singolo e grant editor PASS; aggiunto job CI PostgreSQL 17.6 per il target corretto. Nessuna fixture equivale a Supabase Auth o restore gestito.

Validatore ufficiale Shopify: query/mutation nuove validate su Admin 2026-01/2026-10; nuove letture Storefront pin 2026-01, mantenendo il default degli altri chiamanti. Dipendenze applicative invariate. Il codice sorgente della RPC di sync precedente corrisponde all’impronta letta sul backend del progetto.

Live: sola lettura diagnostica autenticata 10/11 15:18:56 CET false/canary/false. Non eseguiti: migration, deploy, percorso integrato DRAFT, browser del nuovo rilascio, login Marco, pubblicazione commerciale. Nessun PASS live derivato da test simulati, pulsanti o merge. Registrazione cliente rinviata dal proprietario.

CI/GitGuardian e risultati sullo SHA finale da registrare nella PR di completamento. Snapshot 10/11 05:26:11 UTC disponibile, restore non dimostrato; accettazione rischio del proprietario registrata nel runbook. SEO #49 separata; nessuna modifica a checkout, A/B, Sendcloud, inventario commerciale o ordini.

---

## Gate finali PR #47 — 9 novembre 2026

Riesaminato solo il perimetro richiesto: check già SUCCESS su `4fe94d1` riutilizzati, nessuna suite precedente rilanciata manualmente. Una lacuna concreta è stata corretta nella stessa PR: recovery confronta anche il Product GID eventualmente fissato; una create nuova viene rifiutata se lo scope identifica già un prodotto Shopify. **Due nuovi test HTTP mirati PASS**, lint dei soli file modificati e check del servizio eseguiti. CI/GitGuardian finali riferiti al nuovo HEAD nella PR; i vecchi successi non vengono attribuiti al nuovo commit.

Snapshot e percorso restore riconfermati senza esecuzione. **RECOVERY NON DIMOSTRATO**; Auth, Storage e codice non dichiarati recuperati. Solo metadati profiles/user_roles letti, identità/ruolo Marco non attestati. Canary pronto nel codice ma non autorizzato. Runtime letto il 9/11 alle 16:19:57 CET: false/canary/false; non è una suite browser. Nessuna scrittura, DDL, grant, sync, merge o deploy. [Scheda definitiva e criteri STOP](ADMIN-V2-ACTIVATION-RUNBOOK.md).

# QA del completamento Livello B — 9 novembre 2026

**Esito tecnico del delta separato dall'attivazione produttiva.** Le prove del SQL originale e i precedenti smoke sono riutilizzati; nessuna suite PostgreSQL precedente, ripristino Lovable o canary live ripetuti.

| Verifica | Esito / limite |
|---|---|
| Protezione HTTP canary | 17 nuovi test offline PASS: approvazione invalida, account/ruolo/SKU/ID/campo/azione errati, stato ACTIVE/ARCHIVED, mapping divergente, master OFF, richiesta di bozza diversa, AI esclusa; il caso DRAFT autorizzato raggiunge la RPC atomica simulata. Zero mutation reali. |
| Pacchetto attivazione | Test generatore offline PASS: hash originale, transazione, postcondizioni prima della history, rollback solo vuoto/RESTRICT e nessun accesso DB. SQL wrapper non eseguito sul DB. |
| Servizio operativo modificato | 11 test Deno PASS: claim, unica create, replay, timeout/recovery senza duplicazione, SKU parent/varianti, valuta e categorie. Fixture esplicite full per verificare i flussi preesistenti; nuova suite HTTP verifica il canary ristretto. |
| Contratti/compilazione | Typecheck frontend, check entrypoint API/AI e server operativo, lint mirato e build read-only PASS; build operativa locale separata, non pubblicata. I check finali e le suite pertinenti definitive sono registrati nella PR e nel risultato locale allegato. |
| Live read-only | Solo diagnostica flag: 9/11 14:57:44 CET, false/canary/false. Nessun nuovo audit catalogo/browser; evidenze Livello A riutilizzate. |
| Recovery | Snapshot 9/11 05:25:16 UTC visibile, quindici punti; nessun restore riuscito dimostrato. NON PASS. |
| Marco/categorie | Identità Marco non verificata; nessuna modifica ruoli. Matrice precedente riutilizzata: 22 decisioni, zero approvazioni. |
| CI/GitGuardian | Verificare l'HEAD finale della singola PR dedicata; i successi storici non certificano questo commit. |

[Risultati mirati (105 Node, 11 Deno)](admin-v2-evidence/2026-11-09-level-b/validation.json) · [Prerequisiti sanificati](admin-v2-evidence/2026-11-09-level-b/prerequisites.json) · [Runbook e checklist di attivazione](ADMIN-V2-ACTIVATION-RUNBOOK.md). Nessuna nuova certificazione Safari/iOS o accettazione cliente. Gli avvisi build già presenti su Browserslist, classi Tailwind e dimensione chunk non sono errori del delta e restano fuori scope.

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

## Validazione limitata al rilascio di consultazione

Riutilizzati i precedenti PASS PostgreSQL/rollback/RLS, Chromium e suite sul vecchio HEAD; non rieseguite manualmente le suite già superate. Nessun nuovo ciclo Safari/WebKit. Typecheck e lint dei componenti modificati verificati; nuova regressione nella CI: azioni mutanti/non disponibili bloccate prima del trasporto, parametri non supportati esclusi, dati dei campi preservati con capability OFF. La CI obbligatoria sull'HEAD finale esegue i controlli applicativi, senza trasferire artificialmente i PASS precedenti.

Compatibilità: letture esistenti get_admin_context/get_dashboard_stats/list_products/get_product/get_source_baseline; nuove operazioni isolate e nessuna tabella nuova richiesta. Stato finale live e controllo minimo post-deploy registrati nella PR. Non dichiarare backend operativo, mapping, scritture o Safari PASS.

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

## Chiusura tecnica dei soli residui — 6 novembre 2026

Ripresa da `0d3f404`: non ripetuti i 370 Node, 103 Deno, SQL/rollback e Chromium a sei larghezze già PASS. Nessun SQL/migration/controllo server cambiato.

- **Nuova prova mirata Chromium PASS, 4 casi:** bozza interna e operazione da riconciliare a 320/1440 px. Invio/recupero disabilitati e motivo visibile quando il server nega la capability; zero overflow e zero page error. API/auth simulate, non prova live. [Report](admin-v2-evidence/2026-11-06-final/chromium/browser-qa.json).
- Due testi semplificati: niente codice di stato tecnico nella pagina Categorie e niente “JSON/editor tipizzato” per un campo non modificabile.
- Typecheck, lint dei tre componenti modificati e build PASS. La CI sull'HEAD finale esegue i check obbligatori e viene attestata nella PR; i PASS sul commit precedente non sono trasferiti automaticamente.
- **WebKit BLOCKED dopo un unico tentativo:** browser già installato, exit 139 prima della navigazione. Nessuna reinstallazione o retry; Safari/device restano aperti. [Evidenza](admin-v2-evidence/2026-11-06-final/webkit-blocked.json).
- Backend: nessuna incompatibilità nuova nei metadata/grant mirati. Staging isolato non identificato/autorizzato; nessuna prova di write reale. Ruolo Marco non verificato dall'aggregato admin esistente.

UI/UX complessiva **PARTIAL** per Safari e accettazione reale. Funzioni di scrittura **non dichiarate operative**. Guida/checklist già esistenti conservate; percorso di rilascio ora unico e con rollback/backup distinti dalle prove SQL locali. Nessuna modifica produttiva.

# Completamento mirato Admin V2 — 6 novembre 2026

**Aggiornamento 6 novembre 2026 — PR #42; questa sezione prevale sugli stati storici sottostanti.**

| Prova | Esito e limite |
|---|---|
| Runtime live autenticato | PASS: `writesEnabled=false`, `writeMode=canary`, `shopifySyncEnabled=false`, 10:58:30 CET. [Screenshot](admin-v2-evidence/2026-11-06/runtime-diagnostics.jpg), [JSON](admin-v2-evidence/2026-11-06/runtime.json). Il modo canary non sostituisce gli interruttori OFF. |
| Consultazione live | PASS: dashboard 2706 righe interne, ricerca SKU OG_113165 e apertura dettaglio; avviso scritture disabilitate. Nessuna scrittura. Sessione autorizzata esistente, non attestata come account Marco. [Prova](admin-v2-evidence/2026-11-06/live-read-smoke.json). |
| Lettura schema reale | PASS tramite backend Lovable: migration non applicata, quattro oggetti nuovi assenti, 22 categorie, zero mapping/assegnazioni. Management API Supabase nega accesso; il connettore Lovable consente SELECT. [Evidenza](admin-v2-evidence/2026-11-06/supabase-readonly.json). |
| Test Node / Deno | 370 / 103 PASS; include regressioni paginazione/filtri e stato sincronizzazione. |
| Typecheck, lint pertinente, build | PASS; warning bundle Vite e dipendenze dati browser già noti, non errori. Check Edge completo locale PASS; CI frozen/no-npm verifica servizio operativo e query senza introdurre dipendenze. |
| PostgreSQL 16 isolato | PASS migration, RLS/ACL, claim idempotente, recovery, concorrenza; nuova prova transazionale rollback con tech_admin ammesso e publisher negato. Auth bootstrap simulato: **non STAGING PASS**. [Risultato](admin-v2-evidence/2026-11-06/postgres-local.json). |
| Chromium locale | PASS 11 scenari con API/autenticazione simulate; 320/375/390/430/768/1440 px, filtri server, assenza overflow, tastiera/focus, annulla conferma=zero write simulate, conferma=una write simulata. [Report](admin-v2-evidence/2026-11-06/chromium/browser-qa.json). |
| WebKit | BLOCKED: binario ufficiale v2388 termina con segmentation fault prima del test. Nessun tentativo ripetitivo, nessun PASS Safari/iOS. [Limite](admin-v2-evidence/2026-11-06/webkit-blocked.json). |
| Marco, staging gestito, canary DRAFT | NON ESEGUITI; nessun canary approvato o ambiente staging identificato con accesso disponibile. |

**Difetti corretti:** i filtri categoria/completamento/sincronizzazione/non classificati operavano soltanto sui 25 risultati della pagina; ora il backend applica tutti i filtri prima della paginazione, senza troncamento silenzioso a 500 ID/righe. Ricerca per nome/SKU e combinazione delle condizioni verificate su fixture oltre i limiti precedenti. La UI usa “Sincronizzazione” invece di dedurre la provenienza. “Mai sincronizzato” ora appare come “Sincronizzazione non verificata”, senza dichiarare il prodotto non pubblicato. Nessun filtro disponibilità inventato: inventario non governato da questo modulo.

**Integrazione:** main `8ad26ba` incorporato nel branch operativo, preservando diagnostica #44 e pubblicazioni precedenti; quattro conflitti pertinenti risolti. Nessun file shipping #45 o controllo varianti modificato. CI/GitGuardian dell'HEAD finale sono registrati nella descrizione PR per evitare riferimenti circolari a un commit documentale.

**Ruoli:** test server locali admin/tech_admin, editor interno secondo capability, publisher sola lettura e non autorizzati negati PASS; RPC service-only e RLS provati in PostgreSQL isolato. Ruolo effettivo Marco, RLS post-migration gestita e percorsi legacy reali restano NON VERIFICATI: sicurezza operativa complessiva BLOCKED. Nessun nuovo privilegio assegnato.

**UI/UX PARTIAL, pubblicazione BLOCKED.** Non equiparare QA simulata a collaudo operativo live. Nessun merge PR, deploy, migration produttiva, sincronizzazione, cambiamento flag o ordine.

# Admin V2 operativo — report QA

## Integrazione main post-footer e gate runtime — 1 novembre 2026

`main@04ae6d4` incorporato nel branch PR #42 con merge conservativo locale `a00a800`. Risoluzione automatica senza marker o file unmerged; `src/App.tsx` contiene entrambe le rotte Admin V2 e Contatti/Privacy. I file del footer e delle pagine legali coincidono con `main`; i moduli Admin sono invariati dal merge. Nessun cambio al contratto checkout.

| Verifica sull'albero integrato | Esito |
| --- | --- |
| Typecheck, lint mirato, build | PASS; warning Vite/Tailwind/Browserslist già noti |
| Node offline / Deno senza rete runtime | 361 / 103 PASS |
| Compilazione Edge | PASS per `admin-operational-service` con lock CI; PASS per entrypoint `product-admin-api` con `deno check --no-config --no-lock --node-modules-dir=manual` (l'import `npm:` rende improprio `--no-npm` per l'entrypoint) |
| Browser locale 1440/390 px | Homepage, catalogo Storefront read-only, PDP reale, Contatti, footer e login Admin non autenticato navigabili, zero overflow; menu mobile aperto/chiuso con tastiera |
| Browser Admin simulato post-merge | PASS su 320/375/390/430/768/1440 px: categorie, filtro non classificati, anteprima, nuovo prodotto manuale, storico, stati vuoto/errore e focus; 23 richieste esterne bloccate, zero page error. [JSON](admin-v2-evidence/2026-11-01-post-footer/browser-qa.json) |
| Checkout | Test di contratto con `cartCreate` simulato PASS; nessun carrello o ordine reale |
| Backend Admin autenticato e flag runtime | NON VERIFICATI: nessuna sessione Admin propria disponibile; nessuna prova di scrittura eseguita live |
| Migration | Non applicata; prova PostgreSQL locale precedente resta riferita al SQL invariato |

**Lacuna concreta e regressione:** `NewProductPage` mostrava il pulsante «Recupera stato» dopo un errore anche se il master write era OFF; il server rifiutava già il recupero. La UI ora richiede `writesEnabled`, ruolo `admin`/`tech_admin` e operazione salvata. Il retry del salvataggio è mostrato solo se `canSaveDraft` è attivo. Test Node aggiunto per stato OFF, ruolo insufficiente, operazione assente ed esito senza errore. Il backend resta l'autorità: `recover_shopify_draft` rifiuta con master OFF prima del mapping; `sync_field` usa il flag indipendente Shopify e deve essere verificato separatamente. Le nuove tabelle assenti producono lo stato gestito «Storico nuove bozze non disponibile» nella UI, non un crash.

**Limite di conclusione:** non è una prova runtime read-only sull'ambiente Lovable. `writesEnabled`, `writeMode` e `shopifySyncEnabled` sono NON VERIFICATI; CI/GitGuardian del nuovo HEAD vanno controllati dopo push. PR Draft, verdict operativo BLOCKED.

## Review finale e riconciliazione — 1 novembre 2026

Su HEAD iniziale `7b92a5e` CI e GitGuardian erano SUCCESS; PR #42 ancora Draft e senza review GitHub formali. La review mirata ha rilevato **R42-6 (Alta, kill switch):** `recover_shopify_draft` poteva completare il mapping Supabase anche con `PRODUCT_ADMIN_WRITES_ENABLED=false`. Scenario: dopo un timeout Shopify, un admin usa la CTA o una richiesta manuale mentre il master è OFF; nessuna seconda mutation Shopify, ma una scrittura interna contraria al gate read-only. Correzione minima sul branch: la funzione rifiuta il recupero prima di leggere l'operazione quando il master è OFF e la UI nasconde la CTA; il recupero successivo richiede riabilitazione esplicita e temporanea. Test Deno di regressione: stato `NEEDS_RECONCILIATION` invariato e zero mutation. Nessun flag live cambiato.

**QA locale dopo R42-6:** 360 Node e 103 Deno PASS; typecheck React/TypeScript, Deno check con lock frozen, lint mirato e build PASS. La build conserva i warning già noti su bundle Vite, classi Tailwind e database Browserslist. Non sono state rieseguite migration PostgreSQL locali perché il SQL non è cambiato; la prova precedente PostgreSQL 16 resta riferita a `d9f0d39`. Con migration assente, `catalog_categories` usa solo tabelle esistenti e mostra l'empty state; `get_product_operations` riceve errore di tabella assente e il componente mostra un messaggio di disponibilità gestito, senza far fallire la scheda prodotto. Questa verifica è statica/test di dominio, non prova browser live dell'account Marco.

**Perimetro del kill switch:** la correzione copre le nuove operazioni della PR #42. La sync a campo singolo già presente usa il flag separato `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED`; il master `PRODUCT_ADMIN_WRITES_ENABLED` non ne governa da solo l'esecuzione. Per attestare un Admin interamente read-only occorre verificare che anche quel flag sia OFF nell'ambiente target, senza cambiarlo in questa review. Questo comportamento preesistente non è stato modificato.

Le [22 categorie interne e 55 collezioni Shopify](ADMIN-V2-CATEGORY-RECONCILIATION-PLAN.md) sono state lette senza scritture; 13 handle coincidono, 3 candidati sono plausibili, 2 ambigui e 4 senza match. Tutte le 23 collezioni dell'allowlist esistono; zero mapping è approvato. Le 194 famiglie senza Product GID sono 112 simple e 82 variable WooCommerce, senza status sync o ledger parent applicato; la coincidenza numerica con gli 82 storici non dimostra identità. [Runbook a sette gate](ADMIN-V2-ACTIVATION-RUNBOOK.md). Sul commit correttivo `c9329ca`, [CI applicativa SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41321729729) e GitGuardian PASS. Il commit documentale finale richiede i propri check; review GitHub formale e attivazione rimangono gate distinti. Le sezioni sotto conservano la cronologia delle review precedenti.

## Addendum gate Supabase live — 1 novembre 2026

La lettura **SELECT/cataloghi PostgreSQL** sul backend Supabase collegato al progetto Lovable Online Garden ha chiuso il precedente limite «schema reale non verificato». Il project reference `iekwvvihjwghosqdxrdi` è coerente con repository, ambiente frontend, `supabase/config.toml` del progetto Lovable e commit di base `b5cbe57`; il connettore Supabase Management API resta non autorizzato, ma il database del progetto Lovable è stato interrogato in sola lettura. [Evidenza strutturale, RLS, aggregati e limiti](ADMIN-V2-LIVE-SUPABASE-COMPATIBILITY.md).

La migration è **compatibile per struttura** con tabelle, tipi, vincoli e trigger live; non è stata applicata. `sku_norm` è una colonna generata e UNIQUE, quindi non richiede un valore esplicito nella RPC. Le nuove tabelle/RPC non esistono ancora e non presentano collisioni. I 68 field key live comprendono quelli necessari al form. RLS è attiva sulle sette tabelle esistenti esaminate; le ACL delle nuove tabelle/RPC sono verificate sul SQL e nel test PostgreSQL locale, e richiederanno verifica post-migration live. Il diff correttivo `829eeb0..d9f0d39` è stato riesaminato sui sei meccanismi di approvazione, drift, SKU, primaria, job asincrono e recupero; nessun nuovo blocco di codice rilevato. CI GitHub sul commit `d9f0d39` [SUCCESS](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41236633321); GitGuardian SUCCESS già verificato sulla PR prima di questo addendum. Il successivo commit documentale va controllato separatamente.

**Gate operativo:** 22 categorie interne attive ma zero mapping `product_category_shopify_map` e zero assegnazioni; 194 delle 1.518 famiglie interne non hanno Product GID nel mapping legacy. Il canary categorie, la riconciliazione catalogo, account Marco, migration/deploy, Safari/email e validazione commerciale rimangono chiusi. Nessuna scrittura live o flag attivato. Le affermazioni datate 31 ottobre più sotto descrivono lo stato precedente al presente addendum e restano come cronologia.

## Review indipendente PR #42 — 31 ottobre 2026

Baseline verificata: Draft PR #42 su `main@b5cbe57`, HEAD iniziale `829eeb0`, worktree pulito prima della review. Il diff della PR è circoscritto ad Admin V2, API Admin, migration, test, CI e documenti; storefront pubblico, checkout, inventory e sincronizzazioni storiche non sono stati modificati. Le correzioni sotto sono solo sul branch della PR e non sono state applicate a servizi live.

| ID / gravità | Causa e scenario riproducibile | Correzione minima / prova |
| --- | --- | --- |
| R42-1 **Alta** | `admin-operational-service.ts`: `PRODUCT_ADMIN_OPERATIONAL_APPROVAL` accettava ogni stringa non vuota; con flag Shopify acceso, un admin poteva inviare una richiesta costruita manualmente per una bozza diversa da quella approvata. Anche `"false"` era truthy. | Approvazione JSON server-side con azione, target UUID/hash esatto e scadenza UTC entro 24 ore; verifica anche nel servizio immediatamente prima della mutation. Il flag generale delle scritture governa ora anche Shopify e categorie. Test Node/Deno con target diverso e interruttore generale OFF. |
| R42-2 **Alta** | `admin-operational-service.ts`: una membership canonica presente in Shopify ma assente nelle categorie interne poteva essere rimossa pur mostrando zero categorie interne da rimuovere; una categoria interna non più verificata poteva restare approvata. | Preflight fail-closed su assegnazioni non canoniche/non verificate e uguaglianza esatta delle membership canoniche interne/Shopify. Anteprima non eseguibile sul drift; richiesta forgiata respinta prima di qualunque mutation. Test Node/Deno. |
| R42-3 **Media** | `admin-operational-service.ts`: per un prodotto variabile il preflight Shopify cercava solo gli SKU delle varianti; uno SKU famiglia già usato da altra variante passava. | Ricerca Shopify anche dello SKU famiglia; test Deno prova che il conflitto blocca `productSet`. Rimane una finestra di concorrenza tra ricerca e creazione, da verificare nel canary. |
| R42-4 **Media** | `admin_operational_drafts.sql`: togliendo la categoria primaria, nessuna delle categorie approvate sostitutive diventava primaria. | RPC sceglie la prima categoria proposta solo se non esiste più una primaria approvata; assert PostgreSQL sul rimpiazzo. |
| R42-5 **Media** | `admin-operational-service.ts`: `collectionRemoveProducts` restituisce un job asincrono; la sola rilettura immediata non attestava che il job fosse concluso. | Controllo `job{id done}`, polling limitato e successiva rilettura membership; incertezza → `NEEDS_RECONCILIATION`, mai successo presunto o retry della mutation. Test Deno con job inizialmente pendente. [Contratto Shopify Job](https://shopify.dev/docs/api/admin-graphql/2026-01/objects/Job). |

**Controlli positivi con perimetro limitato:** JWT verificato tramite Supabase Auth e ruoli caricati dal DB, senza fidarsi di ruolo/attore nel body; RPC `SECURITY INVOKER` e revoca `EXECUTE` ad anon/authenticated; RLS e revoca accesso diretto ai nuovi journal; claim persistente prima di `productSet`, recovery per handle+metafield+status `DRAFT` senza seconda creazione; SKU case-insensitive unico nel DB; mapping parent/varianti verificato; operazioni categoria serializzate per prodotto e fallimenti parziali bloccati in riconciliazione. Il test SQL locale usa bootstrap Auth simulato, quindi non dimostra le policy del progetto reale.

**Limiti non coperti da test offline:** il connettore Supabase rifiuta l’accesso al progetto Online Garden, quindi schema reale, migrazioni già applicate, registro campi e privilegi effettivi non sono attestati. Shopify Admin è stato consultato solo in lettura nella fase precedente; nessuna mutation della PR è stata eseguita. Un operatore Shopify esterno può cambiare SKU, mapping o collezioni tra preflight e mutation; la catena non è transazionale. L’approvazione di un hash riferito a un prodotto già pubblicato autorizzerebbe una modifica live delle sue collezioni: scegliere per il primo canary solo una bozza esplicitamente autorizzata. La rimozione asincrona non conclusa nel tempo limite richiede riconciliazione tecnica manuale prima di nuove scritture. Nessun test offline equivale a convalida commerciale o di produzione.

**Esito locale della review:** typecheck frontend e Deno, lint mirato e build PASS (warning bundle preesistente); 360 test Node e 102 test Deno PASS; PostgreSQL 16 isolato PASS con test ACL/RLS, mapping, concorrenza e categoria primaria. La CI e GitGuardian su `829eeb0` erano SUCCESS prima delle correzioni; gli esiti del nuovo HEAD vanno verificati su GitHub e non sono dedotti dai test locali. Stato di integrazione: **CHANGES REQUIRED finché il nuovo HEAD non è pubblicato, verificato in CI/GitGuardian e sottoposto a review del diff corretto**. Attivazione live separata e ancora bloccata.

**Evidenza GitHub successiva:** sul commit corretto `d6a89bb` [workflow 41236000206](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41236000206) SUCCESS: typecheck, lint storefront/Admin, Deno check, build e test Node/Deno; GitGuardian SUCCESS nella PR. Il commit che registra questa evidenza è solo documentale e richiede il proprio check. La PR resta Draft e senza `reviewDecision` positivo; nessuna verifica sul Supabase reale o canary Shopify.

**Smoke browser ripetuto dopo le correzioni:** [risultato JSON simulato](admin-v2-evidence/2026-10-31/browser-qa-review.json) PASS su 320/375/390/430/768/1440 px, navigazione Admin V2, anteprima categorie, bozza senza AI, stato vuoto/errore e focus; zero page error, 23 richieste esterne bloccate. Runner copiato in `/private/tmp` per non sovrascrivere le evidenze visuali originarie. Questa prova non valida un account Marco né il backend live.

Report precedente alla review indipendente: 31 ottobre 2026. Branch `codex/admin-v2-operational`, base `main@b5cbe57`. Nessun deploy o write live. I conteggi di test e i riferimenti HEAD sottostanti descrivono l'esecuzione precedente su `829eeb0`; l'addendum sopra riporta le verifiche successive.

## Matrice evidenze

| Controllo | Esito / perimetro |
| --- | --- |
| Typecheck frontend | PASS, `npm run typecheck` |
| Typecheck servizio Edge | PASS, Deno check con lock CI frozen; controllo dell'entrypoint API eseguito anche localmente |
| Lint mirato | PASS, frontend modificato e backend con `--no-ignore` |
| Build | PASS; warning preesistente bundle maggiore di 500 kB, non nascosto |
| Node | 358 PASS: 339 esistenti + 19 nuovi test |
| Deno | 97 PASS: 92 esistenti + 5 test del servizio con Shopify simulato |
| Migration SQL | PASS in PostgreSQL 16 locale isolato su socket Unix; baseline pertinente ricostruita da migration reali, auth plumbing simulato |
| ACL/RLS nuove tabelle e RPC | PASS locale: anon/authenticated senza accesso diretto, service-only e controlli attore; non è audit completo delle policy live |
| Idempotenza e recovery | PASS: replay stesso UUID, SKU duplicato rifiutato, claim una volta, mapping incompleto rifiutato, successo Shopify/fallimento DB recuperato senza ricreazione |
| Categorie | PASS test differenze/ruoli, lock operazioni concorrenti e finalizzazione SQL; esecuzione Shopify reale non effettuata |
| Browser Chromium | PASS simulato: 320, 375, 390, 430, 768, 1440 px; nessun overflow o pageerror; vuoti/errori, filtro non classificati, anteprima e salvataggio senza AI |
| Accessibilità mirata | Etichette, focus tastiera, checkbox mesi, errori/status e controlli primari; corretto nome accessibile del filtro Mostra. Nessuna attestazione WCAG completa |
| Safari/iOS e lettore schermo reale | NON ESEGUITI; gate staging |
| Configurazione live | Shopify: store/EUR/lingua/account e conteggi limitati verificati a fine sessione; Supabase/Marco/flag non verificati |
| Email e ordine sandbox | NON ESEGUITI; procedura pronta, autorizzazione necessaria |

Il primo browser test ha fallito sul nome accessibile ambiguo del filtro categorie: corretto con etichetta esplicita e ripetuto con successo. Il primo controllo Deno ha rilevato tipi incompleti nei read model, corretti prima del commit. Il lint esplicito ha rilevato quattro `any` preesistenti nei conteggi della query modificata: sostituiti con il tipo derivato del query builder. Nessun test disabilitato.

## Riproducibilità

- `npm run typecheck`; `npm run build`.
- `node ci/run-domain.mjs node`.
- `node ci/run-domain.mjs deno ci/deno-ci.lock` (runner Deno con runtime network negato).
- `deno check --no-config --no-npm --frozen --lock=ci/deno-ci.lock supabase/functions/_shared/admin-operational-service.ts`.
- Lint: elenco esplicito nel workflow `.github/workflows/storefront-checks.yml`; aggiunto scope Admin senza modificare i controlli storefront.
- SQL: creare **solo** un database locale vuoto `og_admin_test_<nome>` su socket sotto `/tmp` o `/private/tmp`, impostare `OG_TEST_PG_SOCKET`, `OG_TEST_PG_PORT`, `OG_TEST_PG_DATABASE`, opzionalmente `OG_TEST_PSQL`, ed eseguire `node scripts/test-admin-operational-db.mjs`. Lo script rifiuta host remoti e nomi fuori dal prefisso. Non applica migration live.
- Browser: due server Vite locali 5188 (base UI precedente) e 5189 (nuovo branch), `OG_PLAYWRIGHT_MODULE` verso il runtime Playwright disponibile, `node scripts/qa-admin-operational.mjs`. Tutte le API sono simulate e le altre richieste esterne bloccate; nessuna credenziale reale.

## Confronti visivi

[Evidenze e report browser](admin-v2-evidence/2026-10-31/README.md): categorie prima/dopo 1440 e 390 px; formati e anteprima nuovo prodotto desktop/mobile. I prodotti QA sono fixture dichiarate, non contenuti del negozio. Non sono stati modificati homepage, catalogo pubblico, PDP, navbar o checkout.

## Gate e limiti

Review SQL/backend e CI GitHub sul commit della PR; verifica schema reale/registro campi; migrazione e deploy autorizzati separatamente; canary creazione e assegnazione; test timeout con servizi reali; capabilities account Marco; concorrenza con modifiche Shopify esterne; approvazione canali/pubblicazione; Safari/mobile; ricezione email cliente/staff. Nessun gate viene considerato superato grazie ai soli mock.

Le assegnazioni Shopify asincrone non ancora confermate restano da riconciliare. Le richieste di creazione salvate sono immutabili: revisione prima dell'invio ancora tecnica. Upload immagini, più assi di opzioni e import inverso automatico sono rinviati. Questi limiti sono dichiarati anche nelle guide cliente.


## Evidenze GitHub — Draft PR #42

[PR #42](https://github.com/Rosin355/your-e-commerce-blueprint/pull/42), base `main@b5cbe57aa1f7e674ce7caca106d359f8977c800a`. Tre commit implementativi/documentali iniziali: `8be1316`, `ad02abe`, `38b6324`.

Sul codice `38b6324ecdcb705979e5b3a62b4fd3dbc7c71cfd`: **CI SUCCESS** nel [run 41232830219](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41232830219), tutti gli step completati, inclusi lint Admin e typecheck server frozen; **GitGuardian SUCCESS**, verificato nei check della PR. Il commit successivo registra queste evidenze documentali: il suo check deve essere verificato separatamente, senza attribuirgli automaticamente l'esito precedente.

Valutazione: **pronto per review tecnica come Draft; attivazione live BLOCKED dai gate descritti**. Non è un'autorizzazione al merge o al soft launch. I 17 worktree preesistenti risultano invariati nel confronto HEAD/status/hash delle modifiche originali. Scan mirato sulle nuove righe: nessun riscontro di token Shopify privati, JWT letterali o chiavi private; non sostituisce l'audit integrale della cronologia.


Addendum: [lettura Shopify Admin sanificata](admin-v2-evidence/2026-10-31/shopify-read-only-summary.json) disponibile a fine sessione. Nessuna write, email o verifica di mapping/categorie individuali. CI e GitGuardian verificati SUCCESS anche su `5d43b41`: [run 41232967229](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41232967229). L’ulteriore commit documentale registra questa nuova evidenza live limitata.
