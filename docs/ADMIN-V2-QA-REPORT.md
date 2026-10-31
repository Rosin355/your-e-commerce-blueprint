# Admin V2 operativo — report QA

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
