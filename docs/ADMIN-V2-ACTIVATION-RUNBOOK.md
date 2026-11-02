# Admin V2 PR #42 — runbook di integrazione e attivazione

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
