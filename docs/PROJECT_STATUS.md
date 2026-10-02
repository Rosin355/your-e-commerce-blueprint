# Online Garden — stato consolidato del progetto

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
