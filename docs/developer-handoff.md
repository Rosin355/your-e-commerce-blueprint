# Online Garden — developer handoff

## Chiusura AI della nuova bozza · 24 novembre 2026

La migrazione 0020 è registrata nel Cloud e la Edge è distribuita dal merge e11995c. La prenotazione server usa opt-in per attore e chiave. La Edge accetta il contratto storico della descrizione. Il frontend pubblicato serve index-BcqOotvz.js. Una bozza salvata dall’anteprima con la Edge attiva è stata riletta sul dominio pubblico. I pacchetti per il ripristino, le impronte e i limiti del collaudo sono nel registro operativo. [Stato di rilascio e rollback](release/PR73-CHIUSURA-AI.md)

## PR #73 · selezione editoriale della nuova bozza

Il payload di `suggest_confirmed_field` per la nuova scheda contiene campo description, nome, fatti, conferma e requestKey. La Edge rifiuta chiavi aggiuntive. La routine `reserve_new_draft_editorial_v1` usa l’identità autenticata e controlla il grant corrente. La prenotazione consuma la quota condivisa e registra le chiavi autorizzate per quella richiesta. Il flag esplicito `PRODUCT_ADMIN_DRAFT_AI_EDITORIAL_ENABLED=false` riporta la generazione al percorso precedente per la descrizione. Anche l’errore PostgREST PGRST202 per routine mancante consente il ripiego sulla prenotazione storica. Gli altri errori di prenotazione bloccano la generazione.

La selezione del modello su SEO richiede grant di modifica, campo idoneo nel registro e opt-in nominativo. Per i tag nativi serve un opt-in specifico per nuova bozza e una definizione core compatibile. Le abilitazioni sono verificate a ogni nuova richiesta. Il ruolo della Edge non può assegnarle. [Migrazione 0020](../drizzle/migrations/0020_admin_new_draft_editorial.sql)

`admin-draft-editorial.ts` costruisce alternative verificabili. `draft-sheet.ts` controlla la risposta e ogni valore contro la definizione server. Il provider riceve indici e fatti, con un limite di 256 token in uscita. `source=model` identifica la scelta editoriale del modello, `deterministic` il fallback. Il retry esplicito della descrizione conserva le revisioni degli altri campi. La UI usa le categorie selezionate nel modulo soltanto per la variante locale dei tag. [Evidenze, limiti e collaudo](admin-v2/AI-ERROR-LIVE-2026-11-24.md)

## Storico a c623b001 · scheda assistita

La nuova pagina usa il contratto di `suggest_confirmed_field` del commit `8fb057f`. Il payload comprende azione, campo `description`, fatti confermati, conferma e UUID. La Edge verifica grant, campo e limite di frequenza. Il fallback estrattivo e i suoi codici diagnostici appartengono già a quel commit. Questa estensione cambia solo il frontend e i test. L’estensione non introduce un nuovo contratto di rete.

`src/adminv2/lib/draftSheet.ts` compone i metadati nel browser usando il registro restituito da `get_field_definitions`. Per copiare i metadati occorrono assistenza abilitata e capacità effettiva di salvare bozze ordinarie. I campi SEO richiedono anche la rispettiva chiave modificabile. I tag riprendono valori letterali con il permesso della bozza, con filtro dei tag logistici. Il codice esercita il permesso di inferenza solo per la descrizione. I comandi di modifica di prodotti esistenti e le relative policy restano quelli del servizio.

Il tipo richiede il collegamento univoco del registro al campo core Shopify e un `validation_rules.enum` di etichette valide. Una corrispondenza esatta su nome, categoria selezionata o fatto confermato genera una proposta. Il formato esplicito «Tipo prodotto: Alberi» è riconosciuto solo se il valore esiste nel dominio. Valori discordanti, assenti o multipli richiedono una scelta. La riga risulta esclusa quando manca il dominio. Il registro letto in produzione il 24 novembre contiene i due campi SEO, i tag e la descrizione, senza una definizione mappata per il tipo. Serve un elenco convalidato dal responsabile per abilitare la quinta riga in produzione.

La UI conserva la revisione fra i due passaggi della creazione. Dopo un cambio di nome, categoria, fatti o permessi invalida le proposte precedenti. Ogni approvazione confronta i valori correnti e aggiorna soltanto le cinque chiavi editoriali. Il server conserva il controllo finale durante anteprima e salvataggio. [Collaudo, limiti e rollback](admin-v2/AI-ERROR-LIVE-2026-11-24.md)

## Correzione AI da fatti confermati · candidata del 24 novembre

Il backend da rilasciare è `product-admin-ai`. Il browser invia lo stesso payload di prima. L’API mantiene `ok` e `value` e aggiunge `source` (`model` o `confirmed_facts`), letto come opzionale per compatibilità. Con la precedente Edge il frontend può ancora ricevere `VALIDATION_ERROR`; la distinzione tra input, modello e campo richiede il nuovo handler. I codici dedicati sono `INVALID_CONFIRMED_FACTS`, `INVALID_MODEL_PROPOSAL` e `INVALID_FIELD_VALUE`. Il riferimento mostrato negli errori della richiesta corrisponde al campo `requestId` del log.

Il fallback riguarda esclusivamente la descrizione generata a partire da fatti confermati. Il flusso dei suggerimenti salvati su campi già compilati conserva le proprie regole. La revisione distribuita del frontend per il ritorno è `index-jqOemgjy.js`. [Diagnosi, prove, gate e ripristino](admin-v2/AI-ERROR-LIVE-2026-11-24.md#verifiche-e-rilascio)


## Consegna tecnica Admin V2 · 21 novembre 2026

Il contratto additivo admin-delivery-20261121-r2 riguarda product-admin-api e il frontend Admin. La bozza locale, la bozza su Shopify e la pubblicazione sul canale hanno verifiche distinte. Il collegamento Shopify per modifiche native richiede accesso staff separato. [Versioni, riscontri e rollback](admin-v2/RELEASE-REPORT.md) · [Criteri di accettazione](admin-v2/FINAL-ACCEPTANCE.md).

## Area clienti e chiusura del ciclo legacy · 21 novembre 2026

Il candidato Lovable `ba257cb` include la [PR #60](https://github.com/Rosin355/your-e-commerce-blueprint/pull/60), merge `054f85c`. `/auth` e `/account` utilizzano il Customer Account ospitato e lasciano l’adesione al cliente. Supabase autentica gli operatori su `/admin`. Il recupero staff valido ritorna a `/admin` nel codice. In preview è stato osservato anche il ritorno a questa route dal messaggio per link privo di sessione.

Il chunk pubblico `Account-siNMq2aN.js` contiene ancora un chiamante di `get-customer-orders`. La candidata elimina la dipendenza. **Distribuire prima il solo frontend dopo il collaudo autenticato** e verificare su entrambe le route pubbliche l’arrivo su Shopify. Per ritirare l’Edge attendere anche il riscontro che i bundle precedenti e le sessioni ancora aperte abbiano cessato di usarla, tramite telemetria aggregata delle invocazioni. Finché questo riscontro manca, conservare la funzione remota. In questo ciclo nessun Publish o deploy Edge. Il [registro di rilascio](release/SAL-2026-11-21.md) dettaglia versione pubblica e prove.

Il recupero WooCommerce è chiuso come `BLOCKED_SOURCE_UNAVAILABLE`, con 0/953 ordini e 0/857 clienti trasferiti. Mantenere i due CSV nel deposito privato e conservare importatore e journal. Ogni associazione futura richiede identità verificata e copertura nell’autorizzazione documentata. [Registro di riconciliazione e specifica d’archivio](migration/woocommerce-history-2026-11-20.md).

Aggiornamento: 2 ottobre 2026
Baseline runtime approvata: `main@82f77933bc289043e223a7a48d9bd273e96bbc41`
Baseline Git 2D.4A: `origin/main@0959f95202824cb2a005a6f140282995579a3895`

## 0. Release snapshot corrente

- Backend 2C.1: **CLOSED lato server**; canary ancora attivo.
- Smoke live update/replay/conflict/restore su `OG_264361.nome_comune`: PASS.
- CREATE live `expectedVersion=0` su `OG_365676.colore_fiore = "viola"`: PASS; version 1, lock manual/approved/protected, lineage NULL/NULL, history 0→1.
- Conteggi correnti: 24.467 current values, history 5, command log 5.
- Admin V2 UX: **GO-LIVE READY**; due P3 corretti (dirty-save e label valore assente).
- Non bloccanti: cronologia con field_key tecnici, ruolo Editor non provato live, mismatch cosmetico validate.
- Fase 2D: **BACKEND DATABASE READY / EDGE NON DEPLOYATE**. Le migration 2D.2,
  2D.4A e 2D.4B risultano applicate una volta secondo Lovable, con ACL SIU
  verificate. Il deploy si è fermato al bundling prima della distribuzione per
  import cross-function. La 2D.6 sposta le primitive condivise in `_shared`
  senza cambiare runtime; nessuna call AI live o write Shopify.
- Fase 3A Shopify/storefront: **BLOCKED**. 461 published, 458 sold-out; only 3 purchasable and all without images; shipping not verified; mobile overflow present; checkout technical PASS.
- Fase 3B read-only: root cause inventory = assenza di feed quantità completo + legacy normalization missing→0; 462/462 Shopify variants quantityAvailable=0. Publication = legacy partial sync, nessun manifest commerciale. Images = legacy sync crea mediaInputs ma non li invia. Mobile overflow = `HomeAnnouncementBar.tsx` / `whitespace-nowrap`. Checkout EN = locale Shopify pubblicato solo EN.
- Fase 3B.1A: Shopify access corrente non espone inventory Admin fields (locations, tracked, inventoryPolicy, per-location levels). Stato = BLOCKED BY SHOPIFY CONFIG ACCESS, non prova di misconfiguration. Prossimo gate raccomandato: endpoint Admin read-only dedicato o export Inventory CSV.
- Entity type: `OG_152965` safe; `OG_891874` and `OG_758263` require structural review.
- Prossimi gate: review/rilascio 2D → inventory → publication scope → images → shipping → mobile fix → structural review → order E2E → exit canary.

## 1. Architettura

Il sistema separa catalogo canonico, fonti immutabili, valori correnti,
suggerimenti e audit. Il browser Admin non scrive direttamente le tabelle:
autenticazione, capability, validazione e comandi passano attraverso Edge
Functions, con una RPC atomica per il salvataggio field-by-field.

```text
WordPress / CSV
      │
      ▼
product_source_snapshots ──► product_current_values ──► Admin V2
      │                              │                     │
      │                              ├─► product_field_history
      │                              └─► command log       ▼
      └────────────────────────────────────────── product-admin-api

products = identità canonica
product_field_definitions = contratto dei campi
product_ai_suggestions = proposte separate, non applicazioni automatiche
product_ai_generation_reservations = slot provider atomici, solo server-side
product-admin-ai = generate/reject/accept senza side effect Shopify
```

Non creare `product_catalog_entities`: `products` è l'unica tabella canonica.

## 2. Tabelle principali

| Tabella | Responsabilità |
|---|---|
| `products` | Identità SKU, tipo entità, parent e stato canonico. |
| `product_import_batches` | Provenienza e confine di un'acquisizione. |
| `product_source_snapshots` | Originali immutabili e payload normalizzato. |
| `product_field_definitions` | Registry: tipo, editor, applicabilità e policy. |
| `product_current_values` | Valore effettivo, provenance, lock, review e versione. |
| `product_ai_suggestions` | Proposte AI separate con versione di base e prompt. |
| `product_ai_generation_reservations` | Audit minimo degli slot provider; limite concorrente e deduplica target. |
| `product_field_history` | Audit append-only delle modifiche. |
| `product_admin_command_log` | Idempotenza e risultato dei comandi Admin. |
| `product_sync_jobs` | Stato Smart Sync e riferimento privato `source_path`. |

`product_current_values.source_snapshot_id` è nullable. `NULL` significa che
la lineage puntuale non è ancora stabilita; non autorizza fallback presentati
come origine certa.

## 3. Admin V2

Frontend: `src/adminv2/`.

- `AdminV2Guard.tsx`: sessione e contesto autorizzativo;
- `pages/ProductsPage.tsx`: lista prodotti;
- `pages/ProductDetailPage.tsx`: dettaglio e sezioni field-by-field;
- `components/FieldCard.tsx`: capability, editing e conflitto;
- `components/FieldEditor.tsx`: editor tipizzati;
- `components/FaqEditor.tsx`: FAQ domanda/risposta;
- `lib/fieldValueCodecs.ts`: conversioni conservative;
- `lib/adminApi.ts`: unico contratto browser verso la Edge Function.

Backend: `supabase/functions/product-admin-api/`, con primitive condivise
Admin V2/AI in `supabase/functions/_shared/admin-v2-*.ts` e
`admin-ai-core.ts`.

- `auth.ts`: facade compatibile verso auth V2 condivisa;
- `permissions.ts`: facade compatibile verso matrice action/ruolo condivisa;
- `queries.ts`: facade compatibile verso query condivise;
- `capabilities.ts`: decisione server-side per campo;
- `serializers.ts`: view model Admin;
- `validation.ts`: facade compatibile verso tipo, applicabilità e vincoli;
- `commands.ts`: facade compatibile verso idempotenza e invocazione RPC;
- `index.ts`: router delle action.

Le capability sono autoritative. Il frontend non deve dedurre `canUpdate` dal
ruolo, da `manual_only` o dal lock.

## 4. Regole per i salvataggi manuali

La RPC è
`public.admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)`.

Regole:

- solo Admin/Tech Admin può superare un lock per un campo `manual_only`;
- `is_locked` resta `true` dopo l'update;
- AI, re-import, publisher e campi non manuali restano bloccati;
- riga esistente: `expectedVersion` deve coincidere;
- riga mancante: solo `update_field`, Admin, manual-only e
  `expectedVersion=0`;
- insert/update, history e command log sono nella stessa transazione;
- `source_snapshot_id` e riferimenti originali non vengono riscritti;
- l'hash idempotente canonicalizza ricorsivamente gli oggetti e conserva
  l'ordine degli array;
- nella RPC, stesso idempotency key e stesso payload restituiscono replay senza
  nuova history; payload diverso produce `IDEMPOTENCY_CONFLICT`;
- la 2C.1b live usa la stessa helper in entrambi i gate: un solo re-check
  read-only prima di restituire il conflitto pre-RPC oppure, nell'altra finestra,
  dopo il `VERSION_CONFLICT` RPC. Exact replay restituisce l'esito applicato,
  hash diverso diventa `IDEMPOTENCY_CONFLICT`, command assente conserva il vero
  conflitto versione. Nessun polling, sleep runtime o retry write;
- lo smoke live ha confermato `replayed=true`, nessun duplicato e create con
  `expectedVersion=0`; la 2C.1a non è stata distribuita autonomamente;
- una versione stale produce `VERSION_CONFLICT`, mai overwrite.

I cinque campi manuali protetti sono `nome_comune`, `ibridatore`,
`colore_fiore`, `colore_foglia` e `curiosita`.

## 5. AI field-by-field — Fase 2D

Admin V2 non invoca le pipeline AI legacy. L'endpoint dedicato è:

Endpoint: `supabase/functions/product-admin-ai/`.

Azioni:

- `get_ai_suggestions`: legge le pending e deriva `stale` confrontando
  `base_version` con la versione corrente;
- `generate_ai_suggestion`: ricostruisce contesto trusted server-side, chiama
  una sola volta il provider e inserisce una proposta separata;
- `reject_ai_suggestion`: risolve la proposta come `discarded` senza history
  prodotto;
- `accept_ai_suggestion`: usa `executeCommand` con action `update_field`,
  `expectedVersion=base_version` e idempotency key; solo dopo il successo marca
  la proposta `accepted`.

La capability `canSuggestAi` è calcolata da `product-admin-api`: richiede campo
visibile/editabile, `ai_allowed`, non `manual_only`, non strutturale,
applicabile all'entity, strategia supportata, current value non locked e formato
sicuro. Per `products.is_active=false` restituisce `canSuggestAi=false` e
`product_inactive`. In canary valgono anche ruolo Admin/Tech Admin e allowlist
corrente.

Il provider usa `LOVABLE_API_KEY` soltanto server-side, timeout 12 secondi,
output strutturato e limite atomico di cinque generazioni/minuto per attore. La
RPC `reserve_product_ai_generation` prenota lo slot prima del provider e
deduplica richieste concorrenti per prodotto/campo/base version. Il browser
non invia prompt, modello o contesto. Prompt completi e segreti non sono loggati.

`create-product-ai`, AI Writer, `shopify-admin-proxy` e pipeline bulk non sono
importati. Non esiste fallback mock in produzione e non è presente alcuna
chiamata Shopify.

La migration incrementale
`20260930152426_harden_product_admin_ai_concurrency.sql` aggiunge esclusivamente
tabella reservation, indici e RPC `SECURITY INVOKER`. RLS è attiva; tabella e
funzione sono negate a `anon/authenticated` e concesse solo a `service_role`.
È stata applicata live una sola volta tramite Lovable. Il default ACL live ha
però ampliato il grant tabella a `service_role=arwdDxtm`: la forward migration
`20261001130202_restrict_product_admin_ai_reservation_privileges.sql` esegue
`REVOKE ALL` per-oggetto e riassegna soltanto SELECT/INSERT/UPDATE. Non modifica
la RPC o i default ACL; risulta applicata una sola volta e verificata live
secondo Lovable. Gli stati DB
`discarded`/`superseded` sono
presentati all'UI come `rejected`/`stale`; il campo `model` registra
`provider/model`, `prompt_hint` la strategia e `prompt_version` la versione del
prompt.

Il runtime `product-admin-ai` accede a `product_ai_suggestions` soltanto con
`SELECT`, `INSERT` e `UPDATE` tramite `service_role`; la RPC reservation usa
solo `SELECT`. Il browser non interroga la tabella direttamente. La remediation
2D.4B della PR #24 revoca ogni privilegio a `PUBLIC`, `anon` e `authenticated`
e limita `service_role` a SIU. Risolve il finding live riferito
`authenticated=arwdDxtm`, che la sola RLS non copre per
TRUNCATE/REFERENCES/TRIGGER. La policy SELECT `ai_suggestions_read` resta
presente ma non concede accesso senza ACL. La migration risulta applicata una
sola volta e verificata live secondo Lovable. Dettagli in
`docs/fase2d/product-ai-suggestions-acl-2D4B.md`.

Tutte le transizioni suggestion sono conditional update da `pending`. Un
accept concorrente perdente non può sovrascrivere `accepted`; gli stati risolti
non vengono riaperti. Dopo un `VERSION_CONFLICT` post-RPC il loser non marca il
pending come `superseded`: lascia al winner la transizione `accepted`, evitando
la finestra apply→status. L'exact replay viene consultato subito dopo il lookup
minimo della suggestion e prima dei gate AI mutabili, ma dopo autenticazione e
autorizzazione. Non richiama né RPC write né provider.

## 6. Shopify e storefront

Shopify è un canale separato. Lo stato Shopify può essere letto, ma non è
modificabile dalla scheda field-by-field. Un salvataggio Admin non deve avviare
sync, pubblicazione o modifica storefront.

Le utility e i pannelli legacy sotto `src/admin/` restano strumenti tecnici e
richiedono autorizzazione specifica. Non abilitarli per default al cliente e non
usare il loro service access nel browser.

## 7. Smart Sync e Storage

Flusso corrente:

1. creazione del job;
2. upload CSV in
   `csv-pipeline/product-sync/jobs/<job-id>/input.csv`;
3. registrazione del percorso sul job;
4. abilitazione dei batch.

Se l'upload fallisce, l'import non parte. Non esiste fallback nel bucket
pubblico `sync`.

`sync` è riservato alle immagini prodotto pubbliche sotto
`sync/product-images/**`. CSV, backup e manifest sono privati in
`csv-pipeline`. Non ampliare policy o capability di firma per comodità.

## 8. Sicurezza

- verificare sempre JWT con il gateway e l'utente server-side;
- attendere (`await`) ogni controllo asincrono prima di accedere a service role;
- non accettare ruoli o privilegi dal payload;
- limitare bucket e prefissi anche dopo l'autenticazione;
- `service_role` resta server-to-server e non entra nel bundle frontend;
- enrichment runs/items sono protetti da RLS/GRANT;
- non ripristinare versioni precedenti vulnerabili di `storage-signed-url` o
  delle funzioni sync;
- mantenere traccia esplicita dei test live non eseguiti.

## 9. Strategia migration

- una migration per modifica logica;
- file Supabase e, quando applicato da Lovable, registrazione Drizzle coerente;
- preflight read-only e backup privato prima dell'applicazione;
- applicazione una sola volta tramite il canale autorizzato;
- mai manipolare manualmente il registro live;
- mai considerare la presenza del file Git come prova dell'applicazione live;
- dopo l'applicazione verificare firma, ACL, `search_path`, conteggi e hash;
- una migration già applicata si corregge con una nuova migration approvata,
  non modificando la cronologia.

La copia Supabase della migration 2C.1 ha SHA-256
`b7f1fdafcced766f2f9443d9faa53cef769d3e9d48b3a35194ea2c0304b2a898`;
il file Drizzle effettivamente registrato ha SHA-256
`5ee7341bc5ce13e30dc6092bedac1c3635076c7db9bb2763e9a4cba21bcaae37`.
Lovable la riporta applicata una sola volta; Codex ha verificato file e Git, non
il registro live direttamente. Lo smoke live riferito ha applicato update e
ripristino su una fixture, preservando lock e lineage; la creazione con versione
0 è stata poi validata su `OG_365676.colore_fiore`, con replay e conflitto
idempotente corretti.

## 10. Rilascio e rollback

### Preflight

1. fetch e confronto con `origin/main`;
2. diff effettivo e check GitHub;
3. preflight live read-only;
4. backup di definizione/ACL e sole righe della fixture;
5. assenza di job/import/sync attivi;
6. approvazione esplicita di ogni scrittura smoke.

### Ordine

Per cambi DB/API/UI coordinati: migration retrocompatibile, Edge Function,
smoke read-only, frontend, smoke UI. Non pubblicare un frontend che richiede un
contratto backend non ancora disponibile.

Per 2C.1b non esiste modifica DB o frontend: distribuire soltanto
`product-admin-api` dalla revisione approvata, mantenere `canary`, quindi
verificare replay sequenziale e sovrapposto in entrambe le finestre, conflitto
idempotente e nuova command stale. La RPC resta il gate atomico; ogni ramo
concorrente esegue al massimo un re-check read-only e nessun retry della write.

Per 2D il rilascio deve essere coordinato: (1) merge del packaging fix 2D.6;
(2) non riapplicare le migration 2D.2/2D.4A/2D.4B già registrate; (3) deploy di
`product-admin-ai` e `product-admin-api` dalla stessa revisione; (4) smoke
read-only; (5) frontend; (6) generazione canary su fixture approvata; (7) STOP
prima di “Accetta” finché la write non è autorizzata.

### Rollback

- frontend: ripubblicare l'ultima versione compatibile;
- Edge Function: ripristinare il codice precedente solo se non reintroduce una
  vulnerabilità nota;
- RPC: nuova migration approvata basata sul backup della definizione;
- dati: nuovo comando versionato, non UPDATE diretto, delete di history o
  decremento versione;
- Storage: ripristino solo nel bucket privato, mai ricreare il CSV pubblico.

## 11. Test

Comandi standard:

```text
npm ci
npm run typecheck
npm run test:catalog
npm run build
git diff --check
```

Per le Edge Functions usare `deno check` sugli entry point interessati. Per SQL
atomico usare PostgreSQL isolato con fixture sintetiche: non puntare mai il
runner a un URL live.

Per la race 2C.1b eseguire inoltre:

```text
node --import tsx scripts/test-admin-idempotent-race.mjs
```

Il runner attraversa il request handler completo e forza separatamente il ramo
pre-RPC e quello post-RPC. La barriera temporale è confinata alla fixture
PostgreSQL; il runtime non usa sleep, polling o retry automatici della write.

Per l'hardening concorrente 2D.2 eseguire inoltre:

```text
node scripts/test-admin-ai-generation-concurrency.mjs
```

Il runner avvia PostgreSQL effimero, riproduce il default ACL ampio osservato
live, applica migration 2D.2 e forward 2D.4A, verifica ACL esatta SIU e assenza
di drift su dati/RLS/indici/vincoli/RPC/default ACL, poi lancia sei reservation
simultanee e un doppio target equivalente. Valida anche il preflight read-only e
dimostra che RLS non governa TRUNCATE. Non conosce URL o credenziali live.

Gate offline 2D.6: test AI mirati **34/34**, catalogo **249/249** inclusi cinque
regression test packaging, runner PostgreSQL reservation concurrency e runner
ACL suggestion PASS. I due grafi Edge risolvono rispettivamente 16 e 11 moduli
locali con zero import sibling. Questi risultati non costituiscono deploy né
prova su dati live.

## 12. File chiave

- `docs/PROJECT_STATUS.md`: stato operativo corrente;
- `docs/client-status.md`: sintesi cliente;
- `docs/admin-ux-notes.md`: contratto UX;
- `docs/phase1a7-integration-status.md`: fondazione lossless;
- `docs/phase2a-admin-v2-functional-audit.md`: audit originario;
- `docs/phase2b-admin-v2-field-editing.md`: editor e capability;
- `docs/fase2b/publish-frontend-2B6.md`: rilascio frontend;
- `docs/fase2c/backend-release-2C1.md`: release backend 2C.1;
- `docs/fase2d/admin-ai-field-suggestions.md`: architettura, test e rollout 2D;
- `docs/fase2d/admin-edge-packaging-2D6.md`: grafo import, moduli shared,
  verifica packaging e gate di rilascio;
- `docs/fase2d/product-ai-privilege-audit-2D4A.sql`: preflight ACL/RLS/default
  ACL esclusivamente read-only;
- `docs/fase2d/product-ai-suggestions-acl-2D4B.md`: dipendenze, ACL target,
  test, rollout e rollback della remediation suggestion;
- `supabase/migrations/20260930152426_harden_product_admin_ai_concurrency.sql`:
  reservation atomica 2D.2, applicata una volta secondo Lovable;
- `supabase/migrations/20261001130202_restrict_product_admin_ai_reservation_privileges.sql`:
  forward-fix per-oggetto SIU, applicata una volta secondo Lovable;
- `supabase/migrations/20261001131926_restrict_product_ai_suggestion_privileges.sql`:
  ACL SIU `service_role`, applicata una volta secondo Lovable;
- `docs/fase2c/gate-c-removal-STORAGE-003.md`: chiusura Storage;
- `supabase/functions/product-admin-api/`: API Admin;
- `supabase/migrations/20260926150609_allow_admin_manual_locked_field_edits.sql`:
  RPC 2C.1.

## 13. Cosa non fare

- non creare una seconda tabella canonica prodotti;
- non togliere indiscriminatamente `is_locked`;
- non collegare snapshot per somiglianza o multipli candidati;
- non serializzare numeri, booleani, array o FAQ come stringhe;
- non convertire valori legacy opachi senza scelta utente;
- non fare retry automatici sui conflitti versione;
- non classificare un exact replay come conflitto versione: prima consultare il
  command log dell'attore e confrontare l'hash canonico;
- non introdurre export, backup, token o URL firmati nel repository;
- non eseguire migration, import, AI o Shopify per collaudare una modifica UI;
- non usare `OG_393883` per scritture senza autorizzazione esplicita.

## Aggiornamento 29/09/2026 — 2C.1c

Smoke live CREATE su OG_365676/`colore_fiore` = `viola` (v1, locked, lineage NULL) superato, con replay e IDEMPOTENCY_CONFLICT corretti. Backend 2C.1 chiuso; canary attivo. Dettagli in `docs/fase2c/backend-release-2C1.md`.


## Fase 2C.2 — QA finale Admin V2 (2026-09-29)
ADMIN V2 UX — GO-LIVE READY (canary attivo). Backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore="viola" permanente; current values 24.467, history 5, command log 5. Due fix UX P3 (Salva solo con modifiche, niente "versione 0"). Dettagli: `docs/fase2c/qa-finale-admin-2C2.md`.


## Fase 2D.7 (2026-10-02)
2D EDGE BACKEND LIVE · READ-ONLY SMOKE PASS · FRONTEND NOT PUBLISHED · AI PROVIDER NOT CALLED · AI GENERATION NOT YET TESTED · CANARY ACTIVE. Dettagli: `docs/fase2d/edge-live-2D7.md`.

## Fase 2D.8 — AI generation smoke (2026-10-02)
Frontend AI pubblicato; una generazione su OG_264361 `seo_title` → suggestion pending `72d271c6`, valore prodotto invariato, accept/reject non testati, canary attivo. Dettagli: `docs/fase2d/ai-generation-smoke-2D8.md`.


## 2D.9 — Controlled accept (2026-10-02)
Accept live su OG_264361/seo_title v1→v2, history/command +1, replay idempotente e conflict 409 verificati, Shopify non toccato, provider 0, canary attivo, restore non eseguito. Dettagli: `docs/fase2d/ai-controlled-accept-2D9.md`.
