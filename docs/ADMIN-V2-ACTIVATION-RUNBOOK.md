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
