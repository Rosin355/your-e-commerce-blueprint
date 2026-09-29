# Fase 2C.1 — Backup, migration e deploy backend (28/09/2026)

PR #15 mergiata su `main` con merge commit
`3f674b48210908b115aa72f55bf692e4a3e85c35`. Commit applicativo:
`01b43137381cc19136a41e37d12c6bedfca48544`.

## Stato Git consolidato

Al fetch Codex del 28 settembre, `origin/main` è
`3f674b48210908b115aa72f55bf692e4a3e85c35` e contiene migration,
registrazione Drizzle, moduli runtime, test e documentazione 2C.1. Il merge
della PR non ha autorizzato né richiesto una seconda applicazione della
migration o un nuovo deploy.

Le verifiche Git, gli hash e il confronto dei file sono `CODEX VERIFIED`. I
risultati di preflight, backup, migration, deploy e smoke read-only riportati
nelle sezioni seguenti sono `LOVABLE REPORTED`, non interrogazioni live ripetute
direttamente da Codex.

## Preflight live
PASS completo (turno precedente), nessun drift. Ricontrollato prima della migration: 2.706 prodotti, 24.466 current values, 68 definizioni, 0 righe history, 0 righe command log; RPC SECURITY DEFINER, `search_path=""`, ACL `postgres, service_role, sandbox_exec` (nessun anon/authenticated/PUBLIC). md5 definizione pre: `2f8d2027…6082`.

## Backup privato
- Percorso: `csv-pipeline/backups/fase2c1/20260928/backup-2c1.json` (bucket privato; accesso anonimo → 400).
- 13.759 byte, SHA-256 `6ebdc349177cd0f0ba38704b80ad32d043f461cc4c06f19c2ddb115794d73fa6`.
- Contenuto: definizione completa RPC (SHA-256 testo `48a546bb…c1b4`), ACL/SECURITY DEFINER/search_path/firma, registry dei 5 manual_only (`colore_fiore, colore_foglia, curiosita, ibridatore, nome_comune`: botanical, both, editable, manual_only, ai_allowed=false, protected_on_reimport), righe current `OG_264361` nome_comune/colore_fiore, history del prodotto (vuota), conteggio command log (0). Nessun export del catalogo.

## Migration
- `20260926150609_allow_admin_manual_locked_field_edits.sql`, SHA-256 riverificato `b7f1fdaf…a2b898` (identico a GitHub e alla copia in `supabase/migrations/`).
- Applicata una sola volta con lo strumento Lovable → `drizzle/migrations/0002_allow_admin_manual_locked_field_edits.sql`; journal Drizzle con 3 voci, 1 sola per questa migration. Nessuna registrazione manuale altrove.
- Post: firma identica, SECURITY DEFINER true, `search_path=""`, ACL identici; md5 nuova definizione `7e0b4821…7f59`. Conteggi 2.706 / 24.466 / 68 invariati; 29 valori locked invariati; history e command log a 0. Nessun current value creato.

## Deploy product-admin-api
Solo questa funzione, file dalla stessa revisione: 6 modificati (capabilities, commands, index, permissions, serializers, validation), 3 invariati (auth, queries, types). Nessun altro deploy, frontend non pubblicato.

## Verifiche read-only post-deploy (sessione Admin)
- Anonimo/chiave pubblica: 401.
- Contesto: canary, write gate esistente attivo, azioni `update_field/confirm/reject` (nessun clear), campi editabili = 6 descrittivi + 5 manual_only.
- Dashboard 2.706 (404 simple, 1.114 variable, 1.188 variation).
- OG_393883 (solo lettura): 5 manual_only `isLocked=true`, `canUpdate=true` (allowed), versione 1, AI disabilitata.
- Strutturali (sku, handle, category_effective, inventory) `definition_readonly`; price `canary_field_not_allowed`; campi AI invariati (`phase_2c`, canSuggestAi=false).
- Validazione: `expectedVersion mancante` rifiutato; creazione di valore assente richiede `expectedVersion=0` (validation.ts e RPC).
- `sourceState=original_absent`, source_snapshot_id NULL.
- Nessuna scrittura: conteggi ancora 24.466 / 0 / 0.

Limite: ruolo editor non testabile live (unico utente Admin); comportamento solo Admin/Tech Admin coperto da RPC (`user_roles`) e test offline della PR.

## Fixture approvate originariamente

La prova A è stata successivamente eseguita e ripristinata come documentato in
fondo al report. La prova B non è stata eseguita.
Prodotto: `OG_264361` — Hemerocallis "Rosy", simple, attivo, non golden, non OG_393883, nessuna history.

| | A — UPDATE locked | B — CREATE assente |
|---|---|---|
| SKU / tipo | OG_264361 / simple | OG_264361 / simple |
| field_key | nome_comune | colore_fiore |
| valore corrente | `Hemerocallis "Rosy" - Giglio Diurno Rosa` (locked, approved) | ASSENTE |
| versione | 1 | 0 |
| valore test | `Hemerocallis "Rosy" - Giglio Diurno Rosa [test 2C.1]` | `rosa` |
| expectedVersion | 1 | 0 |
| esito atteso | v2, is_locked resta true | nuova riga v1, locked, manual/approved |

Rollback:
- A: `update_field` con valore originale esatto ed `expectedVersion=2` (→ v3, stesso testo, locked). History/command log restano come audit.
- B: nessun delete via API; rollback logico concordato = mantenere `rosa` (dato corretto per un emerocallide rosa) oppure rimozione manuale approvata della sola riga creata dopo verifica. Si consiglia di scegliere un valore veritiero.

Sicurezza: prodotto non pubblicato da questa pipeline (nessuna sync Shopify), valori testuali coerenti col prodotto, un solo campo per fixture, prodotto senza storico precedente, backup delle righe già salvato.

## Stato prima dello smoke

Migration applicata e backend distribuito; a questo punto del report le
scritture non erano ancora state eseguite. Nessun merge, AI, import o Shopify
sync.

## Smoke test live autorizzato — Prova A (UPDATE only) — 2026-09-28 14:38 UTC

Solo prova A su OG_264361 (`d6492fb1-…ff12`, simple), campo `nome_comune`.
Prova B (`colore_fiore`) NON eseguita; OG_393883 non toccato. La prova è
precedente al successivo merge documentale/applicativo della PR #15.

**Preflight (PASS)**: valore `Hemerocallis "Rosy" - Giglio Diurno Rosa`, version 1, manual_only, is_locked=true, manual/approved/protected, `source_snapshot_id` NULL, `source_batch_id` 1a44397e…; ruolo `admin`, writesEnabled, writeMode `canary`, `nome_comune` in allowlist. History/command log globali: 0.

| Passo | Richiesta | Esito |
|---|---|---|
| UPDATE | expectedVersion 1, key `smoke-2c1-A-e3166b…` | 200 APPLIED, version 2 |
| Replay stessa key | identica | 409 VERSION_CONFLICT (currentVersion 2); nessuna v3, nessuna history/log duplicata |
| Conflitto | nuova key, expectedVersion 1 | 409 VERSION_CONFLICT; nessun dato cambiato |
| Ripristino | expectedVersion 2, key `smoke-2c1-R-8818f7…` | 200 APPLIED, version 3 |

**Stato finale**: valore originale, version 3, is_locked=true, manual/approved/protected, lineage invariata (snapshot NULL, stesso batch). History: 2 righe `manual_update` 1→2 e 2→3. Command log: 2 righe APPLIED (A, R).

**Nota idempotenza live**: il replay viene fermato dal controllo
`expectedVersion` nella Edge Function prima di arrivare alla RPC, quindi
risponde 409 invece di restituire l'esito originale. Nessun effetto duplicato
(requisito rispettato), ma un retry client dopo timeout vede un conflitto
anziché un successo. La correzione 2C.1a descritta sotto è stata mergiata con
PR #17 ma non è mai stata distribuita.

**Integrità**: prodotti 2.706, values 24.466, AI suggestions 0, publication jobs 0, sync job 36, pipeline job 1, import batch 1; nessun altro current value aggiornato (max updated_at altri prodotti 2026-08-17). Nessuna chiamata AI/import/Shopify/storefront.

## Forward-fix 2C.1a — replay prima del version check

### Causa verificata da Codex

La RPC 2C.1 risolve già correttamente il replay all'inizio della transazione:
legge `product_admin_command_log` per coppia `(actor, idempotency_key)`, compara
`payload_hash` e restituisce `result_json` prima di leggere o bloccare il
current value. Il difetto end-to-end è nel router di `product-admin-api`: la
versione live legge il current value e restituisce `VERSION_CONFLICT` prima di
invocare la RPC, rendendo irraggiungibile quel ramo per un retry successivo a
un apply.

La correzione runtime 2C.1a:

1. autentica e autorizza normalmente il chiamante;
2. verifica prodotto, field registry, `applies_to`, editabilità e ruolo
   corrente richiesto dalla modalità canary;
3. calcola lo stesso hash SHA-256 sul payload JSON canonicalizzato usato dalla
   RPC;
4. consulta in sola lettura il command log dell'attore prima del controllo
   `expectedVersion`;
5. per hash uguale restituisce il `result_json` già applicato con
   `replayed=true`; per hash diverso risponde `IDEMPOTENCY_CONFLICT`;
6. se la key non esiste, applica write gate e allowlist canary, quindi prosegue
   con validazione versione e RPC esattamente come prima. La RPC mantiene il
   secondo controllo atomico per le richieste concorrenti.

Non serve una migration 2C.1a: firma, corpo, `SECURITY DEFINER`, `search_path`,
ACL e schema della RPC restano invariati. La migration 2C.1 già applicata non è
stata modificata.

### Test Codex offline

- `product-admin-api`: first lookup, exact replay, replay simulato dopo timeout,
  riuso key con payload diverso, nuova key, canonicalizzazione JSON annidata e
  ordine degli array FAQ;
- PostgreSQL isolato: 10/10, inclusi first apply, due replay identici, versione,
  history e command log invariati, conflitto idempotente, stale command distinta,
  create `expectedVersion=0`, manual-only locked, lineage e rollback atomico;
- `deno check`, typecheck, suite catalogo, build e `git diff --check` fanno parte
  del gate PR e non costituiscono verifica live.

### Rollout minimo e smoke richiesto

La 2C.1a non deve essere distribuita da sola: il test concorrente successivo ha
dimostrato il limite descritto nella sezione 2C.1b. Il rollout valido parte
dalla revisione 2C.1b completa.

1. verificare che il deploy corrente corrisponda ancora al codice 2C.1 e che la
   modalità resti `canary`;
2. distribuire soltanto `product-admin-api` dalla revisione 2C.1b approvata;
   nessuna migration, frontend o modifica dati;
3. eseguire un controllo read-only di Admin V2, catalogo e capability;
4. con una fixture nuovamente approvata e dopo aver riportato SKU, field key,
   valore corrente/proposto, `expectedVersion` e rollback, applicare un comando
   e ripetere la stessa richiesta: il replay deve rispondere 200 con l'esito
   precedente e `replayed=true`, senza incremento versione né nuove righe di
   history/command log;
5. riusare la stessa key con payload diverso: atteso
   `IDEMPOTENCY_CONFLICT`; usare una nuova key con versione stale: atteso
   `VERSION_CONFLICT`;
6. ripristinare con un nuovo comando versionato se la fixture è stata cambiata.

La prova create con `expectedVersion=0` resta un gate live separato. Non usare
`OG_393883` per lo smoke e non eseguire AI, import o Shopify sync.

## Forward-fix 2C.1b — riconciliazione del replay concorrente

### Stato ed evidenza

PR #17 / 2C.1a è presente su `main` tramite merge commit `98525eee`, ma non è
stata distribuita. Il bug originale sequenziale è stato osservato live sul
backend 2C.1; la race specifica della 2C.1a è invece una verifica esclusivamente
offline, riprodotta su PostgreSQL isolato senza dati cliente.

Nel caso concorrente, il retry iniziava prima del commit della prima request:
il lookup Edge e quello iniziale della RPC non vedevano ancora il command log.
Sono state riprodotte due finestre: se `getCurrentValue` leggeva la versione
nuova dopo il commit, il request handler restituiva `VERSION_CONFLICT` prima di
chiamare `executeCommand`; se leggeva ancora la versione precedente, la seconda
RPC attendeva il lock e restituiva poi lo stesso conflitto. Lo stato dati
restava corretto (`version=2`, una history, un command log), ma la risposta
dipendeva dal timing. Il primo fix della PR #18 copriva soltanto la seconda
finestra: il finding Codex P1 ha portato alla correzione anche del gate pre-RPC.

### Correzione runtime

Una helper condivisa riconcilia il command log per `(actor, idempotency_key)`
usando lo stesso hash canonico. Il request handler la richiama una sola volta
quando il controllo versione pre-RPC sta per restituire `VERSION_CONFLICT`;
`executeCommand` la richiama una sola volta se è invece la RPC a restituire il
conflitto. In entrambi i casi:

- hash uguale e command già applicata: restituisce il precedente `result_json`
  con `replayed=true`;
- stessa key e hash diverso: restituisce `IDEMPOTENCY_CONFLICT`;
- nessuna command: conserva il `VERSION_CONFLICT` originale.

Non esistono polling, sleep o retry automatici nel runtime. La pausa controllata
usata nel solo test è una barriera di fixture per forzare la sovrapposizione.
RPC, migration 2C.1, schema, ACL, frontend e contratto HTTP restano invariati.

### Test concorrente request-handler Codex

Il test carica ed esegue il request handler reale di `index.ts` e lo collega a
sessioni PostgreSQL isolate sincronizzate prima del commit della prima request.
Risultato:

- prima request: `APPLIED`, versione 2;
- retry sovrapposto fermato al gate pre-RPC: HTTP 200, `replayed=true`, nessuna
  invocazione della RPC dal retry;
- retry sovrapposto che arriva alla RPC: HTTP 200, `replayed=true`, un solo
  tentativo RPC e nessun retry write;
- stato finale: versione 2, una history, un command log;
- stessa key con payload differente: `IDEMPOTENCY_CONFLICT`;
- nuova key con `expectedVersion` stale: `VERSION_CONFLICT`;
- un solo re-check opportunistico nel ramo pre-RPC o post-RPC interessato.

I test sequenziali continuano a coprire manual-only locked, creazione con
`expectedVersion=0`, lineage, protezioni AI/re-import/strutturali, rollback
atomico, canonicalizzazione JSON ricorsiva e ordine degli array FAQ.

### Rollout minimo 2C.1b

1. review e merge della PR dedicata;
2. confronto della funzione live con la baseline 2C.1 e conferma `canary`;
3. deploy della sola `product-admin-api` dalla revisione 2C.1b;
4. smoke read-only su login Admin, catalogo e capability;
5. solo con fixture approvata, first apply + exact replay sequenziale e
   immediatamente sovrapposto; verificare 200, `replayed=true`, versione/history/
   command log non duplicati;
6. verificare payload diverso e nuova key stale; ripristinare con un nuovo
   comando versionato.

Nessuna prova create live e nessuna scrittura su `OG_393883` rientrano in
questo rollout.

---

## Fase 2C.1b — Deploy solo `product-admin-api` (2026-09-28, 19:15 UTC)

**Revisione distribuita:** `main@82f77933bc289043e223a7a48d9bd273e96bbc41` (merge PR #18, include `2695411f`). Checkout Lovable a HEAD `82f7793`, nessuna differenza locale nella cartella della funzione.
**Funzione distribuita:** soltanto `supabase/functions/product-admin-api` (9 file). Nessun frontend, altra Edge Function, migration, schema, Storage, AI, import o Shopify. Migration 2C.1 non riapplicata.

SHA-256 dei file distribuiti:
- auth.ts `9e849435…9f38` · capabilities.ts `7be863fb…b219` · commands.ts `3e2caeaa…05d` · index.ts `28ca2312…b358b450`
- permissions.ts `10811f31…299a` · queries.ts `ec75ee63…abe` · serializers.ts `c9202da2…d4a6` · types.ts `34c7a4df…22b960` · validation.ts `42d90c12…ffed`

### Preflight (prima del deploy) — PASS
- Progetto Online Garden corretto; funzione raggiungibile; modalità `canary`; nessuna migration richiesta.
- RPC `admin_update_product_field(uuid,text,uuid,text,jsonb,integer,text,text,text)`: SECURITY DEFINER, `search_path=""`, ACL solo postgres/service_role (+ ruolo interno sandbox), md5 corpo `fcc2fd75…222a`. Invariata dopo il deploy.

### Codice idempotenza presente (verifica sul codice distribuito, nessuna write)
`reconcileCommandReplay` (commands.ts), riconciliazione iniziale (index.ts ~282), pre-RPC (~323), post-RPC su VERSION_CONFLICT (commands.ts ~180), `IDEMPOTENCY_CONFLICT` (409), `replayed: true`.

### Smoke read-only post-deploy — PASS
- Auth: anonimo 401, chiave pubblica 401, token invalido 401, Admin 200 (`roles=[admin]`, `writeMode=canary`, azioni consentite solo update/confirm/reject).
- OG_393883 (solo capability, nessun salvataggio): i 5 manual_only (`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita`) `isLocked=true`, `canUpdate=true`, AI non consentita. `sku`, `gtin`, `handle`, `shopify_product_id` → `definition_readonly`; `price`, `compare_at_price`, `inventory_quantity` → non modificabili (`canary_field_not_allowed`). `sourceState=original_absent`, `sourceSnapshotId` NULL.
- Contratto versioni (solo `validate_field_update` e un comando rifiutato prima di qualsiasi write): versione errata → `VERSION_CONFLICT` con currentVersion; versione corretta → `VALID`; comando senza expectedVersion → 422 `expectedVersion mancante`. Il caso "create su campo assente con expectedVersion=0" non è verificabile su OG_393883 (nessun campo editabile assente); coperto dal codice (versione corrente 0 se riga assente) e dallo smoke 2C.1.
- Nota: `validate_field_update` non applica il filtro canary (su `price` risponde col controllo versione), ma ogni comando di scrittura lo applica e le capability espongono `canUpdate=false`. Nessun rischio di write; eventuale miglioramento cosmetico.

### Conteggi prima / dopo (identici)
products 2.706 · current values 24.466 (max updated_at `2026-09-28 14:38:03`) · definizioni 68 · locked 29 · history 2 · command log 2 · AI suggestions 0 · publication jobs 0 · sync jobs 36 (5 `processing` storici) · pipeline jobs 1 · import batches 1.

Nessuna nuova riga history/command/current value. Log funzione: solo boot, nessun errore. **Gate scritture ancora chiuso**: nessuna write live eseguita.

### Proposta fixture smoke WRITE (non eseguita, attende approvazione)
- SKU `OG_264361` (Hemerocallis "Rosy"), simple, attivo, non golden; field `nome_comune` (manual_only, locked).
- Valore corrente `Hemerocallis "Rosy" - Giglio Diurno Rosa`, versione 3.
- Temporaneo: stesso valore + ` [test 2C.1b]`, expectedVersion 3 → versione 4.
- Replay: stessa richiesta con stessa key → risposta `replayed=true`, versione resta 4, nessuna nuova history.
- Conflitto: stessa key con valore diverso → `IDEMPOTENCY_CONFLICT`, nessuna write.
- Rollback: salvataggio valore originale con expectedVersion 4 → versione 5, locked mantenuto, audit completo.
- Idempotency key: UUID v4 nuovo per ogni comando logico (una per apply, una per rollback), riusata solo per il test di replay/conflitto.

## Fase 2C.1b — Smoke WRITE live autorizzato (2026-09-28, 19:20 UTC)

Backend `main@82f77933`, modalità canary. Fixture: OG_264361 (Hemerocallis "Rosy", simple), field `nome_comune`.

**Preflight — PASS:** valore `Hemerocallis "Rosy" - Giglio Diurno Rosa`, versione 3, manual_only, `is_locked=true`, origine manual/approved, Admin autorizzato. Lineage: `source_snapshot_id` NULL, `source_batch_id` `1a44397e-44c4-4d8f-ada3-495b0965d710`. Conteggi: products 2.706, current values 24.466, history 2, command log 2.

| Passo | Richiesta | Esito | Versione | History | Command log |
|---|---|---|---|---|---|
| First apply | valore + ` [test 2C.1b]`, expectedVersion 3, key A (UUID v4 nuova) | 200 `APPLIED` | 4 | 3 | 3 |
| Exact replay | identica, key A | 200 `APPLIED`, `replayed=true` (log `APPLIED_REPLAY`) | 4 | 3 | 3 |
| Conflitto | key A, valore ` [payload diverso]` | 409 `IDEMPOTENCY_CONFLICT`, nulla applicato | 4 | 3 | 3 |
| Ripristino | valore originale, expectedVersion 4, key B (UUID v4 nuova) | 200 `APPLIED` | 5 | 4 | 4 |

History nuove: `3→4` (key A) e `4→5` (key B). Command log nuove: `update_field APPLIED v4` e `update_field APPLIED v5`.

**Stato finale:** valore originale, versione 5, `is_locked=true`, lineage identica al preflight.
**Conteggi finali:** products 2.706 · current values 24.466 · history 4 · command log 4 · AI suggestions 0 · pubblicazioni 0 · sync jobs 36 · pipeline jobs 1 · import 1. Una sola riga current value modificata dopo il 28/09 14:39 (la fixture); OG_393883 non modificato.
**Log:** tre righe (APPLIED, APPLIED_REPLAY, APPLIED); nessun errore, nessuna doppia write, nessun retry, nessun errore RPC.
Nessuna chiamata AI, Shopify, import, Smart Sync o Storage. Nessun create expectedVersion=0, nessun test concorrente live, canary mantenuto, frontend non toccato.


## Fase 2C.1c — Fixture CREATE expectedVersion=0 qualificata live (read-only, 2026-09-29)

Nessuna write eseguita. Fixture qualificata tramite ambiente live gestito:

- SKU `OG_365676`, product_id `84893e45-2ce8-4290-b5b6-8ae1df76973e`;
- Gladiolo "Violet Summer" - Confezione da 10 Bulbi da Fiore;
- entity_type `simple`, attivo, senza parent/varianti collegate;
- field `colore_fiore`: current value **ABSENT**, history 0, expectedVersion futuro 0;
- registry: `manual_only=true`, `editable=true`, `visible=true`, `ai_allowed=false`, `protected_on_reimport=true`, applicabile al simple;
- evidenza WordPress esplicita: descrizione originale con più riferimenti a "viola profondo/intenso" e "fiori viola intenso"; valore proposto `"viola"`, considerato permanente e non inventato;
- idempotency key riservata verificata assente prima della write;
- nuova riga attesa dal contratto: version 1, `is_locked=true`, origin/value_origin manual, review approved, publish_state draft, `source_snapshot_id=NULL`, `source_batch_id=NULL`;
- baseline live: products 2.706, current values 24.466, history 4, command log 4, AI suggestions 0, publication jobs 0, sync jobs 36, pipeline jobs 1, import batches 1.

**Gate:** fixture live qualificata; CREATE/replay/conflict non ancora eseguiti. Nessun cleanup previsto: il valore `viola` può restare come dato editoriale corretto se il test viene autorizzato e applicato.
