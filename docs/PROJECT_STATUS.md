## 29 ottobre 2026 — Fase 8 implementata, READY FOR REVIEW locale

**Customer Experience Task 1–5 completati sul branch isolato `codex/customer-experience-implementation`, derivato dall’HEAD verificato `aa7e6ae` della Draft PR #39.** Direzione approvata: sans attuali, crema/verde, fotografie Online Garden; Silver Garden per home/catalogo e Plantella per la gerarchia PDP. Hero compatta, card arrotondate, categorie/pillole reali, acquisto PDP anticipato e sticky coerente con la variante.

Prezzi centralizzati con importo/valuta Shopify; massimo aggiunto alle query per “Da” solo su intervallo reale. Rimossa la voce “Più venduti” priva di dati; sort e filtri globali preservati. Varianti con stato esplicito, focus e annunci; target principali 44px, errore checkout a 8,13:1. Testo lungo catalogo conservato dopo i prodotti; moduli inattivi home ridotti.

QA finale: typecheck, lint mirato e build PASS; **339 Node + 92 Deno**, **38 scenari browser** tra dev e build production. Sei larghezze 320–1440px, viewport compatti, catalogo da 10.000 prodotti, varianti complete, SEO e checkout simulato. A 390×900: primo prodotto catalogo 625→409, titolo PDP 1507→193. Nessuna regressione rilevata; non è una certificazione WCAG completa o un test live.

Quattro commit applicativi locali più consegna documentale. Store/handler/mutation checkout e configurazione Shopify invariati; nessun diff Admin/auth/RLS/Supabase/Edge/sync/package. 391 file originali e worktree PR preservati. Nessun push, merge, PR nuova, deploy o modifica live. PR #39 ancora Draft/aperta alla medesima revisione.

[Report implementazione](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md) · [Confronti React prima/dopo](customer-experience-implementation-evidence/2026-10-29/README.md) · [Design system](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md) · [Roadmap e gate aperti](CUSTOMER-EXPERIENCE-ROADMAP.md). Approvazione visuale completata; i gate commerciali/Shopify live/SEO/AA completo restano separati. Le sezioni seguenti sono cronologia e non descrivono lo stato attuale.

---

## Fase 8 — proposta visuale dopo ricezione reference — 29 ottobre 2026

**READY FOR VISUAL REVIEW; SVILUPPO APPLICATIVO NON AVVIATO.** Letti dal worktree originale `docs/design/references/silver-garden-home-reference.png` e `plantella-pdp-reference.png`, senza modificarli. PR #39 riconfermata Draft/aperta/non unita, HEAD `aa7e6aeb9aa0eafc01f655976f342733562bb824` invariato. Nuovo branch `codex/customer-experience-implementation` ancora a tale HEAD.

Completata l'[analisi visuale](CUSTOMER-EXPERIENCE-VISUAL-DIRECTION.md): sintesi originale, elementi da mantenere, token/layout/tipografia/responsive, sei viste home/catalogo/PDP desktop/mobile e sei confronti con gli screenshot PR. [Indice delle immagini e QA prototipo](design/proposals/2026-10-29/README.md). Nessuna fotografia o identità delle reference usata come asset applicativo; niente dati commerciali o botanici generati.

Aggiornati design system, roadmap, stato cliente e [documento implementazione](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md), distinguendo proposta e interventi realizzati. Il solo prototipo è stato controllato in Chrome; i risultati applicativi Fase 7 restano storici. Non eseguiti nuovi typecheck/lint/build/test React/checkout perché nessun codice applicativo è stato modificato.

Approvazione della direzione ancora pendente, come richiesto dall'addendum e dall'ultimo messaggio utente. Nessun commit implementativo, push, merge, nuova PR, deploy o scrittura live; servizi, dipendenze, token dell'app e contratti storefront invariati. [Integrità finale](design/proposals/2026-10-29/visual-review-integrity.json). La cronologia preliminare sotto rimane conservata: la mancanza iniziale delle immagini è ora risolta.

---

## Fase 8 — Customer Experience — 29 ottobre 2026

**PREPARAZIONE COMPLETATA / IMPLEMENTAZIONE BLOCKED DAL GATE VISUALE.** PR #39 riletta via GitHub: aperta, Draft, non unita; branch `codex/storefront-main-integration`, HEAD invariato `aa7e6aeb9aa0eafc01f655976f342733562bb824`. Creato nuovo worktree `/private/tmp/online-garden-customer-experience-implementation` e branch `codex/customer-experience-implementation` dalla revisione esatta.

Importati selettivamente audit/design system/roadmap/stati ed evidenze direttamente collegate della consegna Fase 7. Letti i documenti e consultati gli screenshot e l'anteprima precedenti. Nessuna delle due immagini Silver Garden/Plantella è disponibile negli input locali: l'analisi e il confronto visuale specifici non sono stati inventati. L'addendum richiede presentazione e approvazione della nuova direzione prima dell'implementazione React.

[Brief visuale preliminare](CUSTOMER-EXPERIENCE-VISUAL-DIRECTION.md), [piano e stato implementazione](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md) e [roadmap aggiornata](CUSTOMER-EXPERIENCE-ROADMAP.md). Chiarita regola prezzi: “Da” solo con intervallo min/max reale, non per il solo prezzo minimo o numero di opzioni. Nessun task applicativo risolto ancora; nessun nuovo risultato di typecheck/lint/build/test/browser dichiarato. Gli esiti Fase 7 sotto rimangono storici.

Codice applicativo identico alla PR; niente Admin V2, auth/RLS, Supabase/migration, Edge, sync, checkout o configurazioni live modificati. Nessuna dipendenza installata, nessun commit implementativo, push, merge, nuova PR o deploy. File e stato del workspace originale preservati; verifica in [preflight](customer-experience-phase8-evidence/2026-10-29/preflight.json). La cronologia Fase 7 e PR seguente è conservata.

---

## Fase 7 — Premium Customer Experience 2.0 — 28 ottobre 2026

**AUDIT E PROGETTAZIONE COMPLETATI; IMPLEMENTAZIONE IN ATTESA DI SUCCESSIVA APPROVAZIONE.** Verifica GitHub read-only: Draft PR #39 aperta, non unita, branch `codex/storefront-main-integration`, HEAD `aa7e6aeb9aa0eafc01f655976f342733562bb824`, base `main` `0d1bf639d7fb0c8cd5c47b2dc222ea86c5b1bab3`. Il workspace originale resta sul ramo `codex/storefront-performance-seo-safe-fixes` a `7a7ed51`, con lavoro locale preesistente. Audit su esportazione isolata della revisione PR, senza spostare o aggiornare i worktree originali.

Consegna: [audit UX e benchmark](CUSTOMER-EXPERIENCE-AUDIT.md), [design system e proposte desktop/mobile](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md), [roadmap P0/P1/P2/P3](CUSTOMER-EXPERIENCE-ROADMAP.md), anteprima concettuale di home/catalogo/PDP. Priorità: sequenza PDP mobile, chiarezza prezzo minimo/valuta/sort, semantica variante/menu, contrasto errore checkout; mantenere ricerca globale, paginazione, esclusione prodotti test e `cartCreate → checkoutUrl`.

Ripetuta esclusivamente la suite browser UX esistente: **15/15 scenari PASS offline**, sei larghezze 320–1440; sonda dedicata con misure, screenshot e 0 eccezioni JS. Dati sintetici e traffico applicativo esterno intercettato; nessun test live né nuova certificazione di accessibilità/prestazioni/SEO. Test di dominio/build/lint/benchmark precedenti non rieseguiti e conservati come cronologia. Campi botanici PDP presenti non provano copertura globale: nuovi filtri subordinati a censimento e Marco. Pagamenti, policy, imposte e promesse commerciali ancora da confermare.

Aggiornati solo documenti/evidenze nella copia isolata, cronologia seguente preservata integralmente dalla PR. Stato Git e SHA-256 dell'originale verificati in [evidenze finali](customer-experience-evidence/2026-10-28/safety.json). Nessuna modifica a codice applicativo, PR #39, Shopify, Supabase, Admin V2, Edge Functions, auth/RLS o sync; nessuna dipendenza aggiunta, commit, push, merge o deploy. Gli stati “READY FOR PR” e “nessuna PR creata” riportati sotto descrivono la fase precedente e sono superati dalla verifica PR qui sopra.

---

## Safe storefront integration — 28 ottobre 2026

**READY FOR PR locale, non rilascio.** Nuovo worktree/branch `codex/storefront-main-integration` da `origin/main` esatto `0d1bf639d7fb0c8cd5c47b2dc222ea86c5b1bab3`; port selettivo dei tre commit storefront, senza vecchio Admin/backend. Contratti main per discovery/home/correlati/date e filtro prodotti test conservati. Catalogo senza cap 1.000, varianti complete, errori/checkout protetti, payload adattato, a11y e SEO/JSON-LD DOM.

QA: typecheck/build/lint mirato, **336 test Node + 92 Deno**, 15 scenari UX, 6 scala/SEO production, 4 safe production e 3 integrazione production; checker Edge main PASS. Lo script npm principale include file Deno incompatibili con Node già nella baseline: runner separato fornito, tutti i test eseguiti nel runtime corretto. Fixture 10k complete, JSON per prodotto circa −60,2% rispetto a main, senza equivalenza della latenza sul main troncato a 1k. Nessuna prova live o di indicizzazione.

Admin/auth/RLS/Supabase/Edge/sync/package e lockfile invariati; mutation cartCreate identica. Tutti i 39 file dirty/untracked originali e i 18 protetti verificati via SHA-256. Nessun push/merge/PR/deploy. [Report, matrice e gate](STOREFRONT-MAIN-INTEGRATION.md). La cronologia main seguente è preservata.

---

# Online Garden — stato consolidato del progetto

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
