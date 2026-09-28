# Online Garden — developer handoff

Aggiornamento: 28 settembre 2026
Baseline: `origin/main@98525eee7e4c60badf1953caa3036462541587e0`

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

Backend: `supabase/functions/product-admin-api/`.

- `auth.ts`: verifica JWT e ruoli;
- `permissions.ts`: matrice action/ruolo;
- `queries.ts`: prodotti, valori, snapshot e history;
- `capabilities.ts`: decisione server-side per campo;
- `serializers.ts`: view model Admin;
- `validation.ts`: tipo, applicabilità e vincoli;
- `commands.ts`: idempotenza e invocazione RPC;
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
- limite del backend attualmente live: la Edge Function verifica
  `expectedVersion` prima che la RPC possa risolvere il replay. Dopo un
  successo, un retry identico riceve quindi `VERSION_CONFLICT`; non duplica
  dati ma non offre ancora semantica di successo idempotente end-to-end;
- il forward-fix 2C.1a, ancora non distribuito, esegue un lookup read-only del
  command log dopo i gate di autenticazione/autorizzazione/canary e prima del
  version check. Hash uguale restituisce il precedente `result_json` con
  `replayed=true`; hash diverso produce `IDEMPOTENCY_CONFLICT`; key nuova segue
  il normale controllo `expectedVersion` e la RPC atomica;
- la 2C.1a è mergiata ma non va distribuita isolatamente: se il retry si
  sovrappone alla prima transazione, entrambi i lookup iniziali possono non
  vedere il command log e la RPC del retry può ancora restituire
  `VERSION_CONFLICT` dopo aver atteso il lock;
- la 2C.1b riconcilia esclusivamente quel risultato: dopo un
  `VERSION_CONFLICT` RPC esegue un solo secondo lookup. Exact replay restituisce
  l'esito applicato, hash diverso diventa `IDEMPOTENCY_CONFLICT`, assenza del
  command log conserva il conflitto versione. Nessun polling o retry write;
- una versione stale produce `VERSION_CONFLICT`, mai overwrite.

I cinque campi manuali protetti sono `nome_comune`, `ibridatore`,
`colore_fiore`, `colore_foglia` e `curiosita`.

## 5. AI

Admin V2 non deve invocare le pipeline AI legacy. Un'integrazione futura deve:

1. creare una riga in `product_ai_suggestions`;
2. registrare `base_version` e `prompt_version`;
3. mostrare confronto proposta/corrente;
4. richiedere approvazione umana;
5. applicare tramite lo stesso comando versionato;
6. non proporre AI per `manual_only` o campi strutturali.

Non copiare nel nuovo flusso funzioni legacy che pubblicano direttamente su
Shopify.

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
0 non è stata eseguita.

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
verificare replay sequenziale e sovrapposto, conflitto idempotente e nuova
command stale. La RPC resta il gate atomico; il secondo lookup è read-only e
avviene solo dopo un suo `VERSION_CONFLICT`.

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

La barriera temporale è confinata alla fixture PostgreSQL; il runtime non usa
sleep, polling o retry automatici della write.

## 12. File chiave

- `docs/PROJECT_STATUS.md`: stato operativo corrente;
- `docs/client-status.md`: sintesi cliente;
- `docs/admin-ux-notes.md`: contratto UX;
- `docs/phase1a7-integration-status.md`: fondazione lossless;
- `docs/phase2a-admin-v2-functional-audit.md`: audit originario;
- `docs/phase2b-admin-v2-field-editing.md`: editor e capability;
- `docs/fase2b/publish-frontend-2B6.md`: rilascio frontend;
- `docs/fase2c/backend-release-2C1.md`: release backend 2C.1;
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
