# ONLINE GARDEN — Fase 2B: editing field-by-field Admin V2

Data: 24 settembre 2026

Branch: `codex/admin-v2-field-editing`

Base verificata: `origin/main` `7858f6cf662b539257fa46e3708362297b05a9e7`

Stato: **implementazione presente nella PR #4; merge sospeso in attesa della
conferma di un rilascio coordinato Edge Function/frontend**.

## 1. Esito

È stata implementata la tranche minima approvata dall'audit Fase 2A:

- capability per campo calcolate dalla Edge Function e consumate dalla UI senza
  ricostruire autorizzazioni dai ruoli;
- filtro `applies_to` distinto per prodotto `simple`, parent `variable` e
  `variation`;
- editor nativi per testo, textarea/rich text, numero, booleano, select, lista e
  FAQ strutturate;
- confronto affiancato tra valore corrente e originale WordPress, con lineage
  nullable esplicitamente qualificata;
- gestione del conflitto `expectedVersion` senza retry né overwrite automatico;
- fixture sintetiche e test per capability, tipi, FAQ, legacy opaco, lineage e
  conflitto di versione.

Non sono stati modificati funzione SQL atomica, schema, migration, dati,
backfill, AI, Shopify o storefront. Non sono stati eseguiti deploy.

## 2. Contratto capability server-side

Ogni campo restituito da `get_product` include `capabilities`, calcolato usando:

- feature flag `PRODUCT_ADMIN_WRITES_ENABLED` e modalità `canary|full`;
- ruoli autenticati ricavati dal server;
- `visible`, `editable`, gruppi e chiavi protetti del field registry;
- allowlist canary effettiva;
- `manual_only`, `ai_allowed`, `protected_on_reimport` e `applies_to`;
- presenza della riga in `product_current_values`;
- `is_locked` e stato `legacy_unverified` del current value.

Il contratto espone separatamente:

| Proprietà | Significato |
|---|---|
| `canUpdate` | La RPC può ricevere `update_field` per la riga esistente. |
| `canConfirmLegacy` | Il valore legacy può essere confermato; la RPC ammette questa azione anche su una riga locked. |
| `canRejectLegacy` | Il valore legacy può essere rifiutato; resta falso su riga locked perché la RPC la rifiuta. |
| `canSuggestAi` | Sempre falso in Fase 2B. |
| `updateBlockReason` | Motivazione tecnica stabile del blocco. |
| `manualOnly` | Il campo è esclusivamente manuale. |
| `isLocked` | Il current value è bloccato dalla RPC corrente. |
| `protectedOnReimport` | Il valore deve essere preservato dai re-import. |
| `aiAllowed` | Policy effettiva: falsa anche quando il campo è `manual_only`. |
| `appliesTo` / `applicable` | Coerenza field registry–tipo entità. |

La UI non offre **Salva** quando `canUpdate=false`. In particolare, i campi
manuali di `OG_393883` già rilevati come `is_locked=true` restano consultabili e
protetti, ma non vengono presentati come salvabili finché la RPC non avrà una
policy diversa approvata. Questo evita una promessa UI che il database
rifiuterebbe.

Le cinque chiavi verificate con fixture sintetiche sono `nome_comune`,
`ibridatore`, `colore_fiore`, `colore_foglia` e `curiosita`. La protezione
effettiva è conservativa: `protected_on_reimport` della definizione oppure della
riga corrente è sufficiente a mantenerla. Nessun valore del golden product è
copiato nella suite.

Le definizioni non applicabili sono escluse dalla scheda:

- `applies_to=product`: `simple` e parent `variable`;
- `applies_to=variant`: solo `variation`;
- `applies_to=both`: tutti e tre i tipi.

## 3. Contratto valori ed editor

La bozza UI resta `unknown` e viene validata dal codec prima del comando. Non
viene usato `String(value)` e non viene mostrata una textarea JSON generica.

| Tipo | Payload inviato |
|---|---|
| testo / textarea / rich text / select | `string` |
| numero | `number` finito |
| booleano | `boolean` |
| multiselect / array | `string[]` |
| FAQ | `{ question: string; answer: string }[]` |
| altro JSON | sola lettura in Fase 2B |

Una riga current esistente con valore `NULL` può iniziare una bozza tipizzata.
Una definizione senza riga current resta non modificabile: la RPC attuale
richiede una riga esistente e `expectedVersion >= 1`.

### FAQ: formati verificati

L'analisi dei formati runtime ha rilevato:

- formato canonico storefront: `[{ question, answer }]`;
- alias AI legacy noto: `[{ q, a }]`;
- stringa JSON contenente esattamente uno dei due formati;
- testo libero, oggetti incompleti e oggetti con proprietà aggiuntive non
  convertibili senza possibile perdita.

`FaqEditor` mostra soltanto campi domanda/risposta e invia sempre il formato
canonico. L'alias `q/a` e la sua stringa JSON sono normalizzati solo quando
l'utente apre l'editor e salva esplicitamente. Un valore non riconosciuto resta
immutato e read-only; proprietà aggiuntive non vengono scartate silenziosamente.

La validazione Edge Function accetta per `faq` soltanto una lista canonica con
domanda e risposta non vuote.

## 3.1 Compatibilità API

Il contratto `get_product` mantiene tutte le proprietà precedenti dei campi e
aggiunge soltanto metadati (`capabilities`, lineage, regole e `appliesTo`). Gli
endpoint e le action esistenti non vengono rinominati o rimossi;
`get_source_baseline` resta disponibile. Il percorso validate/command applica
ora anche `applies_to` e il lock già imposto dalla RPC, evitando che la
prevalidazione dichiari valido un comando che il database rifiuterebbe.

Non sono state modificate firma, implementazione o privilegi di
`admin_update_product_field`.

## 4. Originale WordPress e lineage nullable

`product_current_values.source_snapshot_id` è incluso nella lettura e può
restare `NULL`. Per ogni campo la risposta espone:

- `value`, `origin`, `reviewStatus` e `version` correnti;
- `sourceSnapshotId: string | null`;
- `baselineValue`;
- uno stato sorgente esplicito.

| Stato | Regola UI |
|---|---|
| `linked_snapshot` | Lo snapshot indicato dal current value è stato risolto sullo stesso prodotto. |
| `unlinked_baseline` | `source_snapshot_id` è `NULL`; viene mostrato l'ultimo snapshot prodotto solo come baseline non collegata. |
| `original_absent` | Snapshot puntuale non risolvibile o nessun originale disponibile. Nessun fallback viene presentato come lineage certa. |

La query degli snapshot puntuali verifica sia gli ID sia `product_id`. La
visualizzazione mostra corrente e originale affiancati anche quando coincidono,
così l'utente non deve dedurre l'assenza del confronto.

## 5. Concorrenza e conflitto versione

Il command conserva `expectedVersion` della lettura. In caso
`VERSION_CONFLICT`:

1. il server restituisce `currentVersion` nei dettagli dell'errore;
2. la UI conserva a schermo la bozza locale;
3. il pulsante Salva viene disabilitato per quella bozza;
4. nessun retry e nessuna sovrascrittura sono automatici;
5. l'utente può richiedere esplicitamente “Ricarica senza sovrascrivere”, poi
   confrontare il nuovo valore e riaprire l'editor.

Il salvataggio riuscito continua a invalidare dettaglio e lista tramite React
Query. La RPC rimane l'unico canale di scrittura.

## 6. File e responsabilità

| Area | Modifica |
|---|---|
| `product-admin-api/capabilities.ts` | Capability pure, ruoli, canary, lock e `applies_to`. |
| `queries.ts`, `types.ts`, `serializers.ts`, `index.ts` | Lineage nullable, snapshot puntuali e view model esteso. |
| `validation.ts` | Validazione strutturale FAQ canonica. |
| `adminApi.ts`, `AdminApiError.ts` | Contratto client e dettagli del conflitto. |
| `fieldValueCodecs.ts` | Tipizzazione, normalizzazione conservativa e riconoscimento FAQ. |
| `FieldEditor.tsx`, `FaqEditor.tsx`, `FieldCard.tsx` | Editor tipizzati, confronto e UX conflitto. |
| `ProductDetailPage.tsx` | Capability server-side e confronto per campo. |
| `AdminShell.tsx`, `DashboardPage.tsx` | Stato operativo coerente con il contesto server. |
| test catalogo | Fixture sintetiche senza dati cliente. |

## 7. Criteri di accettazione cliente Fase 2B

- ogni campo visualizzato è applicabile al tipo prodotto;
- il permesso di modifica proviene dalla capability server-side;
- un campo locked non espone Salva e riporta il motivo del blocco;
- `manual_only` resta protetto dal re-import e non abilita AI;
- numeri, booleani, array e FAQ arrivano al server nel tipo nativo;
- nessun JSON grezzo è richiesto al cliente;
- legacy FAQ non riconosciuto resta invariato e non editabile;
- corrente, originale, provenance, versione e stato lineage sono visibili;
- `source_snapshot_id=NULL` non genera errore né provenance inventata;
- un conflitto di versione non produce overwrite automatico;
- inventario, identità e stato Shopify restano read-only;
- nessun salvataggio attiva import, AI, Shopify o storefront.

## 8. Test eseguiti

| Controllo | Esito |
|---|---|
| fetch e confronto con `origin/main` | PASS — branch `1 ahead / 0 behind`, base/main `7858f6c`; nessuna sovrapposizione upstream |
| `npm ci` | PASS — installazione pulita da lockfile, 386 pacchetti |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS — 53/53; include capability, cinque manuali golden, `applies_to`, editor, FAQ, lineage e conflitto |
| `deno check supabase/functions/product-admin-api/index.ts` | PASS |
| `npm run build` | PASS — 1.907 moduli |
| `git diff --check` | PASS |

La build segnala i warning preesistenti sulle classi Tailwind arbitrarie e sul
chunk principale oltre 500 kB; non sono errori introdotti dalla capability.
`git diff --check` e il controllo finale del perimetro sono eseguiti prima della
consegna.

## 9. Scope proposto Fase 2C

La Fase 2C deve restare separata perché richiede modifiche al contratto atomico
e test PostgreSQL isolati:

1. chiarire e modificare la policy `is_locked` per consentire, se approvato,
   l'editing autorizzato dei campi `manual_only` senza perdere
   `protected_on_reimport`;
2. supportare creazione atomica di current value assente con
   `expectedVersion=0`, race handling e history;
3. correggere l'hash idempotente con canonicalizzazione ricorsiva per payload
   FAQ annidati;
4. integrare `product_ai_suggestions` come proposta separata, mai applicazione
   automatica, con `base_version` e `prompt_version`;
5. estendere la cronologia UI con valori/versioni precedenti e nuovi;
6. spostare i filtri incompleti della lista nel contratto server-side;
7. aggiungere test transazionali della RPC su PostgreSQL isolato e collaudo
   read-only iniziale sul golden product, senza riportarne valori privati.

Fino all'approvazione della Fase 2C non sono previsti SQL, migration, backfill,
AI, Shopify, deploy o attivazione generalizzata delle scritture.

## 10. Checklist cliente e rilascio

- [x] capability definitive prodotte dal server;
- [x] `applies_to` coerente per simple, parent `variable` e variation;
- [x] nessun Salva per current value locked;
- [x] cinque campi manuali golden protetti da re-import e da AI;
- [x] editor tipizzati senza serializzazione testuale impropria;
- [x] FAQ strutturate senza JSON manuale;
- [x] legacy FAQ opaco preservato senza trasformazioni;
- [x] `source_snapshot_id` nullable gestito esplicitamente;
- [x] conflitto `expectedVersion` senza overwrite automatico;
- [x] API retrocompatibile per action e proprietà esistenti;
- [x] nessuna modifica SQL, DB, AI, Shopify o storefront;
- [ ] collaudo cliente/deploy — fuori scope e subordinato ad approvazione;
- [ ] policy manual-only locked, insert dei campi assenti e AI proposal — Fase 2C.

## 11. Gate di rilascio Fase 2B.2

### 11.1 Stato GitHub verificato

Al 24 settembre 2026:

- PR #4 aperta, non draft, base `main` e head
  `codex/admin-v2-field-editing`;
- commit applicativo verificato:
  `a164e1916155477ff462361c268d7bbebfe1c8f9`;
- `origin/main` è ancora `7858f6cf662b539257fa46e3708362297b05a9e7`;
- il branch è un commit avanti e zero indietro rispetto a `origin/main`;
- mergeability GitHub `MERGEABLE`, stato `CLEAN` e controllo GitGuardian
  superato sul commit applicativo;
- nessuna modifica upstream sovrapposta alle API dalla baseline;
- nessuna migration e nessun backfill fanno parte della PR.

### 11.2 Verifica del modello di pubblicazione Lovable

La documentazione ufficiale distingue tre operazioni:

1. la sincronizzazione dei commit tra GitHub e il progetto Lovable;
2. il deploy delle Edge Functions tramite l'integrazione Supabase/Lovable;
3. la pubblicazione esplicita della versione frontend con **Publish changes**.

Riferimenti:

- [GitHub integration](https://docs.lovable.dev/integrations/github);
- [Supabase integration](https://docs.lovable.dev/integrations/supabase);
- [Edge Functions](https://docs.lovable.dev/features/edge-functions);
- [Publish your Lovable project](https://docs.lovable.dev/features/publish).

Le fonti non garantiscono che il merge GitHub renda disponibile la nuova Edge
Function e il nuovo frontend in modo atomico o nello stesso ordine. Il gate è
quindi **NO-GO al merge** finché il responsabile del rilascio non conferma un
flusso coordinato che renda disponibile il backend prima del frontend.

### 11.3 Matrice di compatibilità durante il rilascio

| Frontend | `product-admin-api` | Esito |
|---|---|---|
| precedente | precedente | baseline attuale |
| precedente | nuova | compatibile: la risposta API è additiva |
| nuovo | precedente | **non compatibile**: mancano `capabilities` e `sourceState` richiesti dalla nuova UI |
| nuovo | nuova | configurazione obiettivo |

Questa asimmetria impone una sequenza **Edge Function prima, frontend dopo**.
La PR non richiede migration o backfill preventivi: il campo
`source_snapshot_id` può restare `NULL` e viene gestito come lineage non
collegata o originale assente.

### 11.4 Procedura coordinata proposta

La seguente procedura è preparata ma non è stata eseguita:

1. confermare nel progetto Lovable il repository, il branch sincronizzato
   `main`, il progetto Supabase collegato e l'assenza di modifiche non
   pubblicate estranee alla PR;
2. dopo l'eventuale merge autorizzato, distribuire
   `supabase/functions/product-admin-api` dall'esatto merge commit tramite il
   canale Lovable/Supabase già autorizzato, senza eseguire migration;
3. prima di pubblicare il frontend, eseguire smoke test read-only della Edge
   Function autenticandosi come Admin: `get_admin_context`, lista prodotto,
   `get_product` per `OG_393883`, parent e variation;
4. verificare nelle risposte `capabilities`, `appliesTo`, `sourceState`,
   `sourceSnapshotId` nullable, provenance e version; non invocare action di
   comando;
5. solo dopo l'esito positivo, pubblicare esplicitamente il frontend Lovable
   dallo stesso merge commit;
6. eseguire gli smoke test UI read-only descritti sotto e controllare log
   frontend/Edge Function;
7. in caso di problema frontend, ripristinare la precedente versione
   pubblicata. La nuova API, essendo additiva, può restare attiva; un eventuale
   rollback della funzione deve usare esclusivamente il canale autorizzato e la
   versione precedente, senza rollback DB.

Il merge può procedere soltanto con evidenza preventiva che il punto 2 preceda
il punto 5, oppure con una garanzia esplicita della piattaforma equivalente.

### 11.5 Smoke test post-rilascio

- [ ] accesso Admin e caricamento lista senza errori browser o rete;
- [ ] apertura read-only di `OG_393883` senza modifica di dati live;
- [ ] corrente, originale, provenance, version e stato lineage visibili;
- [ ] `source_snapshot_id=NULL` gestito senza errore né origine inventata;
- [ ] cinque campi manuali locked senza pulsante Salva;
- [ ] `applies_to` coerente su simple, parent `variable` e variation;
- [ ] FAQ canoniche mostrate nell'editor domanda/risposta;
- [ ] FAQ legacy opache mostrate read-only e non trasformate;
- [ ] conflitto `expectedVersion` verificato successivamente solo in ambiente
  autorizzato, senza overwrite automatico;
- [ ] nessuna chiamata o attivazione di import, AI, Shopify o storefront;
- [ ] nessuna migration, backfill o scrittura DB eseguita dal rilascio.
