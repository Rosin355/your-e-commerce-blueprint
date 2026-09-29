# Online Garden — stato consolidato del progetto

Data di consolidamento: 29 settembre 2026
Baseline runtime approvata: `main@82f77933bc289043e223a7a48d9bd273e96bbc41`

## Stato operativo corrente — 29 settembre 2026

> Questa sezione è autoritativa per il gate di go-live. Le sezioni storiche successive restano utili come tracciabilità delle fasi precedenti.

- PR #18 / Fase 2C.1b: **MERGED e DEPLOYED** sulla sola `product-admin-api` da `main@82f77933`.
- Smoke read-only post-deploy: **PASS**; canary ancora attivo; RPC/migration/schema invariati.
- Smoke write live su `OG_264361.nome_comune`: **PASS**. First apply, exact replay con `replayed=true`, `IDEMPOTENCY_CONFLICT` e ripristino tutti corretti; valore finale originale, versione 5, lock/lineage preservati.
- Conteggi dopo lo smoke: 2.706 prodotti, 24.466 current values, history 4, command log 4, AI suggestions 0, publication jobs 0, sync jobs 36, pipeline jobs 1, import batch 1.
- Fixture CREATE `expectedVersion=0`: **QUALIFICATA LIVE READ-ONLY, WRITE NON ESEGUITA**. Candidata: `OG_365676.colore_fiore = "viola"`, prodotto simple/attivo, current ABSENT, history 0, key idempotenza assente, evidenza WordPress esplicita, valore permanente accettabile.
- `OG_393883`: continua a essere escluso dalle scritture senza approvazione esplicita.

### Gate mancanti per il go-live

1. Eseguire il CREATE live `expectedVersion=0` sulla fixture qualificata e verificare version 1, lock, history 0→1, command log, replay e conflitto idempotente.
2. QA finale Admin V2/UX cliente, incluso comportamento dei messaggi e capability.
3. QA commerciale Shopify/storefront: pubblicazione prodotti/varianti, prezzi, immagini, disponibilità, spedizioni, checkout, email ordine e mobile.
4. Ordine end-to-end controllato.
5. Verifica/anomalia entity type su `OG_152965`, `OG_891874`, `OG_758263` prima di qualunque modifica strutturale.
6. Decisione esplicita di uscita dal canary e go-live.

### Non bloccanti

Backfill lineage 14.295 `MATCH_READY`, AI field-by-field e miglioramenti cosmetici possono essere pianificati dopo il primo go-live, purché non cambino i gate commerciali sopra.

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

La prova live di update e ripristino di un campo `manual_only` locked è stata
eseguita su una fixture approvata e ha conservato lock, lineage e integrità. La
creazione di un current value assente non è stata eseguita. Il replay non ha
duplicato dati, ma viene esposto come `VERSION_CONFLICT`: è un gap applicativo
confermato sul backend live. La 2C.1a è stata mergiata con PR #17 ma non
distribuita; un test concorrente ha individuato una race nella risposta del
retry. La 2C.1b riconcilia sia il `VERSION_CONFLICT` pre-RPC sia quello restituito
dalla RPC con un solo re-check opportunistico per ramo; il finding P1 è coperto
da un test concorrente sul request handler completo. La verifica resta offline
e non modifica RPC, migration, schema o frontend.
`OG_393883` resta escluso dalle modifiche senza approvazione esplicita.

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
| Admin V2 backend 2C.1 | **LIVE, SMOKE PARZIALE** | Update locked e ripristino superati su fixture. Create con versione 0 non eseguita; il live restituisce conflitto sul replay. 2C.1a mergiata ma non distribuita; 2C.1b offline pronta per review. |
| Sicurezza legacy | **CLOSED / MITIGATED** | PR #5, #6, #8 e #9 integrate e riportate come distribuite/collaudate. Restano documentati i limiti dei test non Admin dove non eseguiti live. |
| Storage firmato | **CLOSED** | Autorizzazione caller e limiti bucket/percorso introdotti; non ripristinare la versione vulnerabile. |
| Smart Sync | **LIVE / GATE A-B-C PASS** | PR #12 integrata; CSV nuovi in `csv-pipeline`, immagini ancora pubbliche in `sync/product-images/**`; CSV pubblico rimosso. |
| Shopify | **SEPARATO** | Nessun salvataggio Admin V2 attiva Shopify. Sync e pubblicazione commerciale richiedono task e approvazione separati. |
| AI | **NON COLLEGATA AD ADMIN V2** | AI legacy preservata; `product_ai_suggestions` non è ancora un flusso cliente field-by-field. Nessuna applicazione automatica. |
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
| 2C.1 manual locked backend | BACKEND LIVE; SMOKE PARZIALE | PR #15, merge `3f674b4`; Lovable `9b6ed9f`–`6db554d` | Sì, secondo report Lovable | PostgreSQL isolato 10/10; update/rollback live PASS, create non eseguita, replay semantico da correggere. |
| 2C.1a replay idempotente | MERGED, NON DEPLOYATA | PR #17, merge `98525ee`; commit `29adddb` | No | Replay sequenziale corretto; race concorrente riprodotta offline, quindi non distribuire da sola. |
| 2C.1b race idempotente | READY FOR RE-REVIEW | PR #18, branch `codex/admin-idempotent-race-fix` | No | Finding P1 pre-RPC corretto; test request-handler/PostgreSQL concorrente PASS. Nessuna migration, nessun deploy. |

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
- replay della stessa richiesta: nessun duplicato, ma risposta
  `VERSION_CONFLICT` anziché replay di successo perché la Edge Function verifica
  la versione prima di consultare il command log.

### Non eseguito live

- creazione al primo salvataggio con `expectedVersion=0`;
- collaudo live con ruolo editor/non Admin;
- qualsiasi scrittura su `OG_393883`.

## 7. Open items reali

1. Revisionare e rilasciare la 2C.1b completa; non distribuire la 2C.1a da sola.
   Dopo il deploy verificare replay sequenziale e concorrente, riuso della key
   con payload diverso e nuova command stale.
2. Approvare separatamente lo smoke di creazione con `expectedVersion=0` e il
   relativo rollback; non usare `OG_393883` senza autorizzazione esplicita.
3. Valutare l'esperienza UI finale del Salva sui manual-only locked dopo lo
   smoke backend; evitare attivazioni generali prima del collaudo cliente.
4. Decidere separatamente se eseguire il backfill lineage dei soli 14.295
   `MATCH_READY`; oggi resta opzionale e non eseguito.
5. Progettare AI field-by-field come proposta versionata, mai overwrite.
6. Eseguire collaudo commerciale Shopify/storefront/checkout separato.
7. Riesaminare le variation WordPress di `OG_152965`, `OG_891874` e
   `OG_758263` prima di cambiare l'attuale `entity_type` simple.

## 8. Prossimi passi, in ordine

1. Review, merge, deploy controllato e smoke live della 2C.1b.
2. Gate separato per lo smoke create con versione 0.
3. Collaudo UX cliente Admin V2 sul comportamento aggiornato.
4. Decisione sul backfill lineage.
5. Disegno AI proposal per campo.
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
