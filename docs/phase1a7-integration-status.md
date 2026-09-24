# ONLINE GARDEN — Fase 1A.7: riallineamento sicuro

## Stato

**FASE 1B COMPLETATA PER FOUNDATION E MIGRATION; VERIFICHE LIVE FINALI ANCORA APERTE.**

## Stato cliente — Fase 1B.4

La PR #1 è stata mergiata su `main` con commit
`1f8f1bdb13948957641e39a31f3b5935b111d93f`. La foundation lossless usa
`products` come unica tabella canonica e non introduce
`product_catalog_entities`.

Lovable riferisce che la migration è stata applicata in produzione dopo backup
e collaudo staging, senza backfill. Codex ha verificato direttamente repository,
merge, migration registrata nei file Drizzle, tipi nullable, assenza di consumer
runtime obbligatori e test locali; non ha accesso autorizzato al progetto live
per confermare il registro migration del database o svolgere gli smoke test.
Un successivo report Lovable post-merge riferisce anche la corrispondenza del
registro Drizzle live e il superamento degli smoke test; tali due verifiche non
sono state ripetute direttamente da Codex.

Stato sintetico:

- foundation e merge: completati;
- migration live: applicata secondo il report Lovable;
- dati esistenti: 24.466 valori preservati secondo il report Lovable;
- backfill: non eseguito;
- registro migration live: verificato secondo il report Lovable post-merge,
  ancora da verificare direttamente da Codex;
- smoke test live Admin V2, catalogo e OG_393883: superati secondo il report
  Lovable post-merge, ancora da ripetere direttamente tramite canale autorizzato;
- prossima fase funzionale: Admin V2.

### Evidenze dirette e riferite

| Ambito | Stato | Fonte |
|---|---|---|
| Merge PR #1 su `main` | Completato, commit `1f8f1bd` | Verifica diretta Codex su Git/GitHub |
| Tipi delle tre colonne | Nullable nel codice e nei tipi generati | Verifica diretta Codex |
| Migration Drizzle nel repository | Presente e byte-identica alla migration Supabase | Verifica diretta Codex |
| Migration in produzione | Applicata; tre colonne ancora `NULL` | Report Lovable Fase 1B.2 |
| Backup privato e ripristino | Verificati | Report Lovable Fase 1B.2 |
| Collaudo staging | Superato | Report Lovable Fase 1B.1 |
| Valori esistenti | 24.466 invariati | Report Lovable Fase 1B.2 |
| Registro migration live | Registro Drizzle coerente | Report Lovable post-merge; non verificato direttamente da Codex |
| Smoke test live | Eseguiti con esito positivo | Report Lovable post-merge; non ripetuti direttamente da Codex |

### Dry-run backfill riferito da Lovable

| Classificazione | Conteggio |
|---|---:|
| `MATCH_READY` | 14.295 |
| `AMBIGUOUS_SOURCE` | 0 |
| `NO_MATCH` | 271 |
| `NOT_APPLICABLE` | 9.900 |
| Totale | 24.466 |

Questi numeri provengono dal report Lovable e non da una nuova interrogazione
Codex della produzione. Il backfill non è stato eseguito: tutti i collegamenti
restano `NULL` finché non sarà approvato un task separato.

### Verifica build e lockfile — Fase 1B.4

Codex ha riallineato `package-lock.json` alle tre dipendenze già dichiarate da
Lovable in `package.json`:

- `drizzle-kit` `^0.31.11`, risolta a `0.31.11`;
- `drizzle-orm` `^0.45.3`, risolta a `0.45.3`;
- `postgres` `^3.4.9`, risolta a `3.4.9`.

Il riallineamento aggiunge soltanto i tre pacchetti e le loro 29 dipendenze
transitive: nessun pacchetto già bloccato è stato aggiornato, rimosso o
risolto a una versione differente. `package.json` è invariato.

Verifiche eseguite da Codex in un worktree pulito creato da `origin/main`:

| Verifica | Esito |
|---|---|
| `npm ci --ignore-scripts` senza `node_modules` preesistente | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 44/44 |
| `npm run build` | PASS, 1.903 moduli |
| `git diff --check` | PASS |

La build mantiene i warning preesistenti sulle due classi Tailwind ambigue e sul
chunk JavaScript principale oltre 500 kB; non sono introdotti da questa
correzione del lockfile.

Il riallineamento è stato eseguito in un worktree separato e non sincronizzato
cloud, creato da `origin/main` (`273fdbf`). Il workspace storico sul branch
`codex/lossless-catalog-foundation` (`60188a1`) non è stato sottoposto a reset,
merge, rebase, clean o stash.

Il solo commit già esistente `60188a1` è stato esaminato e cherry-pickato senza
conflitti come `d96ff58`. La Fase 1A.8 autorizza il commit e il push del lavoro
d'integrazione sul solo branch dedicato, senza merge.

## Preservazione del workspace storico

Prima di creare il worktree è stato prodotto un inventario locale privato di
tutti i file tracciati, non tracciati e ignorati. L'inventario include metadati e
hash dei materiali critici, non il loro contenuto, ed è conservato fuori dal
repository con permessi `0600`.

Inventario: 267 file tracciati, 17 non tracciati e 40.735 ignorati
(41.019 voci totali); 49 artefatti critici sono stati hashati. Verifica finale:
zero file mancanti, zero variazioni di dimensione e zero variazioni di hash.

Sono stati verificati e lasciati esclusivamente nel workspace storico:

- gli otto CSV raw WordPress;
- i backup privati e gli inventari live;
- `scripts/snapshot-shopify-manual-metafields.mjs`;
- gli artefatti locali delle Fasi 1A precedenti;
- segreti, file ambiente ed eventuali link firmati.

Nessuno di questi elementi è stato copiato nel worktree d'integrazione.

## Analisi della divergenza

Il merge-base tra il vecchio branch e `origin/main` è `5f617d3`; il main remoto
contiene 96 commit successivi. L'analisi per file e contenuto ha rilevato lavoro
remoto rilevante per Admin V2, modello prodotto, field registry, migration e
documentazione. Non esiste però alcuna intersezione di path tra i file del commit
audit `60188a1` e quelli modificati dai 96 commit.

Il censimento ha individuato 25 file toccati nell'area Admin V2, 2 nell'area
catalogo, 3 relativi al field registry, 9 migration e 30 file documentali. Non
sono emerse sovrapposizioni di path nel commit audit né dipendenze runtime da
`product_catalog_entities`.

Decisioni d'integrazione:

| Area | Stato su `origin/main` | Decisione |
|---|---|---|
| Modello canonico | `products` e cinque tabelle lossless già presenti | Riusare; nessuna seconda anagrafica |
| Admin V2 | Tipi e accesso dati già basati su `products` | Estendere soltanto i tipi delle tre colonne nullable |
| Field registry live | Già presente nel modello Admin | Conservare; il registry offline è un adattatore di risoluzione sorgenti |
| Audit WordPress | Assente e senza sovrapposizioni di path | Cherry-pick del solo commit audit, completato senza conflitti |
| Resolver lossless | Assente | Recupero selettivo del modulo puro/offline |
| Test catalogo | Harness già presente | Aggiunti test sintetici, senza dipendenza dai CSV privati |
| Dry-run golden | Assente | Recuperato in modalità esclusivamente offline e senza Data API |
| Migration 1A.6 | Assente | Recuperata la sola differenza additiva a tre colonne |
| Shopify | Script e dati locali fuori scope | Nessuna copia, chiamata o modifica |

## Architettura definitiva

`products` resta l'unica tabella canonica. Le cinque tabelle lossless riutilizzate
sono:

1. `product_import_batches`;
2. `product_source_snapshots`;
3. `product_current_values`;
4. `product_ai_suggestions`;
5. `product_field_history`.

`product_catalog_entities` non viene creata e non è referenziata dal codice
runtime. La migration contiene unicamente un controllo difensivo di drift che
interrompe l'esecuzione qualora quella tabella inattesa fosse presente.

Il resolver e il field registry recuperati non costituiscono una nuova fonte
autorevole: trasformano snapshot WordPress in decisioni deterministiche e in un
contratto per Admin. La persistenza e l'identità restano quelle del modello live.

## Migration differenziale

La migration candidata è
`supabase/migrations/20260923155153_add_lossless_lineage_and_ai_versions.sql`.
Introduce soltanto colonne nullable e idempotenti:

| Tabella | Colonna | Tipo |
|---|---|---|
| `product_current_values` | `source_snapshot_id` | `uuid` |
| `product_ai_suggestions` | `base_version` | `integer` |
| `product_ai_suggestions` | `prompt_version` | `text` |

Non contiene DML e non altera dati, FK, indici, constraint, trigger, RLS, policy,
grant o privilegi. Alla chiusura della Fase 1A.7 non era ancora applicata; il
report Lovable Fase 1B.2 ne documenta ora l'applicazione in produzione. Codex ha
verificato il file e il registro Drizzle nel repository, ma non ancora la entry
nel registro migration del database live.

## Dry-run golden e dati privati

Il comando `npm run dryrun:lossless-golden` è deliberatamente offline:

- richiede `--dry-run` e `--golden-only`;
- non carica file `.env`;
- non crea client Supabase e non effettua richieste di rete;
- richiede esattamente otto CSV locali, senza tentarne il download;
- usa l'export legacy soltanto se fornito localmente e marcato esplicitamente
  come autorizzato, dopo verifica dello SHA256 atteso;
- scrive un report locale ignorato da Git;
- non importa dati, non invoca AI e non scrive su database o Shopify.

I test automatici usano otto fixture sintetiche con le stesse 46 intestazioni:
gli export privati non sono necessari in CI e non possono entrare accidentalmente
nel repository.

## Backfill

Nessun backfill è stato eseguito. La query
`docs/phase1a6-source-snapshot-backfill-dry-run.sql` è separata, apre una
transazione `READ ONLY` e termina con `ROLLBACK`.

Le sole classificazioni previste sono:

- `MATCH_READY`: identità certa, valore verificato e un solo snapshot candidato;
- `AMBIGUOUS_SOURCE`: più candidati verificati;
- `NO_MATCH`: nessun candidato esatto o valore non verificabile;
- `NOT_APPLICABLE`: valore manuale, AI legacy o campo senza comparatore sicuro.

Qualunque futura scrittura richiederà una seconda approvazione e dovrà limitarsi
ai soli `MATCH_READY`, senza modificare value, provenance, version, lock o stato
di approvazione. AI legacy rimane invariata.

## SKU con variation in revisione

Il tipo canonico non è stato modificato. Restano temporaneamente `simple`:

- `OG_152965`, con variation WordPress `OG_152965-01`;
- `OG_891874`, con variation `OG_891874-01` e `OG_891874-02`;
- `OG_758263`, con variation `OG_758263-01` e `OG_758263-02`.

Le relazioni sorgente restano conservate negli snapshot/CSV privati. La loro
eventuale materializzazione come varianti è un'attività dati separata e non viene
anticipata da questa integrazione.

## Impatto Admin V2

I tipi Admin espongono ora le tre proprietà nullable:

- `ProductCurrentValue.source_snapshot_id`;
- `ProductAiSuggestion.base_version`;
- `ProductAiSuggestion.prompt_version`.

`NULL` è uno stato valido per record legacy o provenance non determinabile. Admin
V2 non deve inventare un collegamento e non deve bloccare la lettura dei record
storici. Una suggestion nuova potrà essere marcata `superseded` quando la sua
`base_version` non coincide con la versione corrente; le suggestion legacy
richiedono review esplicita.

Il contratto offline è stato allineato agli stati live
`pending`, `accepted`, `discarded`, `superseded`. Il collegamento del resolver
alla UI o alle Edge Function resta lavoro successivo: in questa fase non è stata
aggiunta alcuna dipendenza runtime.

## Drift check e staging

Prima di qualsiasi applicazione:

1. rigenerare un inventario read-only dello schema live;
2. verificare esistenza, tipi e nullability delle tabelle/colonne prerequisito;
3. confrontare RLS, policy, grant, trigger, indici e FK prima/dopo;
4. eseguire la migration su clone/staging e una seconda volta per l'idempotenza;
5. rigenerare i tipi Supabase soltanto dopo l'applicazione approvata;
6. eseguire separatamente il dry-run read-only del backfill;
7. revisionare i conteggi delle quattro classificazioni;
8. richiedere approvazione distinta per un eventuale DML.

## Rollback

Il rollback raccomandato è applicativo: disabilitare i consumer delle tre colonne
e lasciare le colonne nullable. È immediato e non perde dati.

Il drop DDL è distruttivo e richiede autorizzazione separata, prova che le colonne
siano inutilizzate e backup verificato. Se in futuro esistesse un backfill, il
rollback dati dovrebbe usare un journal per azzerare esclusivamente le righe della
specifica esecuzione.

## Prossimo lavoro — Admin V2

Admin V2 è la prossima fase funzionale. Prima di abilitarne scritture o workflow:

- verificare direttamente registro migration e tre colonne tramite accesso
  read-only autorizzato;
- eseguire smoke test live di Admin V2, catalogo e OG_393883;
- adattatore esplicito tra registry offline e definizioni live;
- UI di provenance e stato legacy nullable;
- review separata dei tre SKU con variation;
- eventuale backfill soltanto dopo dry-run e approvazione dedicata.

## Vincoli operativi rispettati

Nessun merge, rebase, reset distruttivo, clean, stash indiscriminato, migration
live, backfill, import, chiamata Shopify, AI o deploy è stato eseguito. Commit,
push e apertura PR sono limitati al branch d'integrazione come autorizzato dalla
Fase 1A.8.

## Esito verifiche d'integrazione

| Verifica | Esito |
|---|---|
| Cherry-pick audit | PASS, nessun conflitto |
| Dipendenze runtime da `product_catalog_entities` | Nessuna |
| Migration su PostgreSQL temporaneo | PASS |
| Seconda applicazione/idempotenza | PASS |
| Solo tre colonne nullable | PASS |
| FK, RLS, policy, grant e permessi invariati | PASS |
| AI legacy e tre SKU `simple` invariati | PASS |
| Dry-run backfill read-only e classificazioni | PASS |
| Dry-run golden senza file privati | Arresto sicuro atteso, nessun accesso esterno |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 44/44 |
| `npm run build` | PASS, 1.903 moduli |
| `git diff --check` | PASS prima del controllo finale |

La build mantiene due warning Tailwind su classi arbitrarie ambigue e il warning
Vite per un chunk superiore a 500 kB. Sono preesistenti e non bloccanti.

## Fase 1A.8 — verifica finale e golden dry-run

### Sincronizzazione Git

Il fetch di `origin` del 23 settembre 2026 conferma `origin/main` invariato a
`273fdbf3256b6fa1a37842a421cdd6a80e437040`. Il branch d'integrazione non è
indietro rispetto a main; l'unico commit locale già presente prima del nuovo
commit è l'audit `d96ff58`. Non sono stati necessari merge, rebase o reset.

### Input privati

Il dry-run ha letto in sola lettura gli otto CSV e il golden export dal workspace
storico. Nessun input è stato copiato nel worktree. Il JSON golden:

- è presente e non tracciato grazie a `backups/`;
- contiene 20 SKU richiesti e 20 record `legacy_csv`;
- ha SHA256 osservato e atteso
  `3fd7eb29c5b9c873a3892e58374bbf5dce16306d309537f5bfa4accac2e5c258`;
- è stato accettato dal dry-run soltanto dopo la verifica del checksum.

Il report completo del dry-run è un artefatto privato temporaneo fuori dal
repository, con permessi `0600`. Non viene incluso nella PR.

### Risultati e confronto con la Fase 1A.3

Il resolver indipendente ha prodotto 1.075 confronti:

| Classificazione | Dry-run 1A.8 | Baseline completa 1A.3 | Differenza |
|---|---:|---:|---:|
| `SAME` | 560 | 577 | -17 |
| `LEGACY_VALUE_TO_PRESERVE` | 179 | 280 | -101 |
| `SOURCE_ONLY` | 336 | 316 | +20 |
| `CONFLICT` | 0 | 0 | 0 |
| Totale | 1.075 | 1.173 | -98 |

La differenza è attesa e non è stata corretta artificialmente. La baseline
completa 1A.3 integra tre insiemi: 912 confronti WordPress/canonico, 74 current
values senza equivalente WordPress e 187 campi legacy operativi, AI o Shopify.
Il dry-run del resolver confronta invece gli snapshot WordPress con i 20 record
`legacy_csv`; replica esattamente il controllo indipendente già documentato in
1A.3: 560, 179, 336, 0. I conteggi 577, 280, 316, 0 restano quindi il risultato
completo autorevole, mentre il nuovo dry-run ne costituisce il controllo
indipendente riproducibile.

### Verifica OG_393883

Il dry-run indipendente rileva 70 campi: 21 `SAME`, 30
`LEGACY_VALUE_TO_PRESERVE`, 19 `SOURCE_ONLY` e zero `CONFLICT`. Il report completo
1A.3 resta pari a 80 campi: 22, 40, 18, 0, perché include current values canonici
e stato operativo non rappresentati dal solo comparatore `legacy_csv`.

Verifiche sul golden export:

- scheda canonica, snapshot e record legacy presenti;
- 23 current values;
- cinque campi manuali completi, non vuoti, versione 1, origine manuale,
  approvati, locked e protetti dal reimport;
- 12 valori AI legacy, tutti versione 1, protetti e `legacy_unverified`;
- `seo_title`, `seo_description` e `optimized_description` presenti tra i valori
  AI legacy;
- descrizione baseline presente; `short_description` non materializzata come
  current value e quindi conservata come sorgente;
- prodotto Shopify identificato e sincronizzato, timestamp e modalità presenti,
  18 metafield scritti, zero falliti, nessun errore e nove campi operativi non
  vuoti da preservare.

Nessun valore privato è riportato in questo documento.

### Migration e runtime

- unica migration lossless presente:
  `20260923155153_add_lossless_lineage_and_ai_versions.sql`;
- vecchia migration `20260922101750_create_lossless_product_catalog_foundation.sql`
  assente dal filesystem e da tutta la storia Git conosciuta;
- esattamente tre `ADD COLUMN IF NOT EXISTS`;
- nessun DML, FK, indice, RLS, policy, grant o privilegio modificato;
- nessuna dipendenza runtime da `product_catalog_entities`.

### Checklist PR

- [x] `origin/main` verificato a `273fdbf` dopo `git fetch origin`.
- [x] Audit `d96ff58` presente.
- [x] Golden SHA256 verificato.
- [x] Otto CSV letti senza copia nel worktree.
- [x] Venti SKU confrontati; differenze metodologiche documentate.
- [x] OG_393883 verificato integralmente senza esporre valori.
- [x] Migration limitata alle tre colonne nullable.
- [x] Vecchia migration assente.
- [x] Nessuna dipendenza runtime da `product_catalog_entities`.
- [x] Nessun CSV, backup, snapshot Shopify, output privato o URL firmato in staging.
- [x] Typecheck, test catalogo, build e `git diff --check` finali.
- [x] Review esatta dello staging Git prima del commit: 13 file, nessun artefatto privato.
- [x] Push del branch e PR #1 completati; merge `1f8f1bd` verificato.
- [x] Nessun merge, migration live, backfill, deploy o modifica Shopify/storefront.
