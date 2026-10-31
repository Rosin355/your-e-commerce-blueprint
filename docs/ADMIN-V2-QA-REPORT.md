# Admin V2 operativo — report QA

31 ottobre 2026. Branch `codex/admin-v2-operational`, base `main@b5cbe57`. Solo sviluppo locale e futura Draft PR; nessun deploy o write live.

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
| Configurazione Shopify/Supabase/Marco live | NON LIVE VERIFIED |
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
