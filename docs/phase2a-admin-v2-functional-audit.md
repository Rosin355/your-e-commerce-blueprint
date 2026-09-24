# ONLINE GARDEN — Fase 2A: audit funzionale Admin V2

Data audit: 24 settembre 2026

Branch di lavoro: `codex/admin-v2-field-editing`

Base verificata: `origin/main` `7858f6cf662b539257fa46e3708362297b05a9e7`

## 1. Esito sintetico

L'Admin V2 possiede già una fondazione valida per consultazione, autenticazione,
autorizzazione, lettura del catalogo canonico e modifica atomica di valori
**già esistenti**. Il versioning ottimistico è presente sia nell'API sia nella
funzione database, la cronologia è append-only e Shopify non viene chiamato dal
canale Admin V2.

L'editing non è però pronto per l'attivazione cliente. I principali blocker sono:

1. l'editor UI tratta sostanzialmente ogni valore come testo e non supporta FAQ,
   array, booleani, numeri, select o multiselect in modo tipizzato;
2. i campi manuali golden risultano protetti dal re-import ma anche `is_locked`:
   UI e funzione atomica li rendono non modificabili, pur essendo definiti
   `manual_only` ed editabili;
3. un campo definito ma senza riga in `product_current_values` non può essere
   creato dalla scheda prodotto;
4. il confronto con l'originale usa lo snapshot più recente del prodotto e non
   la lineage opzionale `source_snapshot_id` del singolo valore;
5. `product_ai_suggestions` non è ancora letto né gestito dall'Admin V2;
6. alcuni filtri della lista sono applicati soltanto ai 25 elementi della pagina
   corrente e possono produrre risultati incompleti.

Decisione: **NO-GO all'abilitazione generale delle scritture**. È possibile
procedere con una tranche minima e isolata, previa approvazione, senza backfill e
senza integrare Shopify.

## 2. Perimetro e metodo

Sono stati verificati staticamente:

- routing, guard, dashboard, lista e dettaglio prodotto in `src/adminv2/`;
- componenti `FieldCard` e `ValueDisplay`;
- hook React Query e client `product-admin-api`;
- Edge Function `supabase/functions/product-admin-api/`;
- funzione atomica `admin_update_product_field(...)` e migration correlate;
- tipi Supabase generati e integrazione con le sei tabelle richieste;
- moduli legacy di import, AI enrichment e Shopify sync, limitatamente alle
  dipendenze e ai confini con Admin V2;
- test catalogo esistenti e documentazione delle precedenti verifiche read-only.

Non sono stati interrogati o modificati dati live. Il controllo di `OG_393883`
usa esclusivamente struttura, conteggi e stati già documentati nei report
read-only del repository; nessun valore privato è riportato qui.

Il changelog Supabase corrente è stato controllato. La modifica futura
sull'esposizione automatica delle tabelle alla Data API non invalida il disegno:
il browser deve continuare a usare esclusivamente l'Edge Function e non ottenere
nuovi grant diretti.

## 3. Legenda

| Stato | Significato |
|---|---|
| `IMPLEMENTATO` | Flusso presente e coerente con il requisito nel perimetro verificato. |
| `PARZIALE` | Fondazione presente, ma mancano capacità o copertura necessarie al cliente. |
| `MANCANTE` | Nessun flusso Admin V2 utilizzabile per il requisito. |
| `DIFETTOSO` | Codice presente, ma comportamento errato o fuorviante nel caso reale. |

## 4. Matrice funzionale

| Area | Stato | Evidenza e limite |
|---|---|---|
| Autenticazione e ruoli | `IMPLEMENTATO` | JWT verificato con `auth.getUser`; ruoli caricati server-side; nessun ruolo accettato dal payload. |
| Caricamento lista prodotti | `PARZIALE` | Legge `products` e riepiloghi da `product_current_values`; cursor su SKU presente. Ricerca e filtri con limiti fissi possono troncare risultati. |
| Filtri categoria, origine, completezza | `DIFETTOSO` | Applicati nel browser soltanto sulla pagina corrente; opzioni categoria derivate dagli stessi 25 elementi. |
| Scheda prodotto | `PARZIALE` | Sezioni generate dal field registry e current values. `applies_to` non è applicato, quindi possono comparire campi non pertinenti al tipo entità. |
| Editing testuale di valori esistenti | `PARZIALE` | Comando, idempotenza e invalidazione cache presenti; dipende da feature flag e canary allowlist. Banner e commenti UI dichiarano ancora sempre sola lettura. |
| Editing tipizzato | `DIFETTOSO` | `FieldCard` invia stringhe; numero, boolean, array e JSON vengono rifiutati dal server. Ogni `data_type=text` viene inoltre trattato come testo lungo, ignorando gran parte di `editor_type`. |
| Creazione di un campo corrente assente | `MANCANTE` | `version=null` disabilita la UI e l'API restituisce `NOT_FOUND`; non esiste insert atomico con concorrenza. |
| Validazione | `PARZIALE` | Regole server-side per tipo, lunghezza, pattern ed enum presenti. L'azione read-only `validate_field_update` non è usata dalla UI e i metadati di validazione non sono serializzati al client. |
| FAQ strutturate | `MANCANTE` | La definizione `faq` è JSON, ma non esiste un repeater domanda/risposta; l'utente dovrebbe manipolare una stringa non accettata dal server. |
| Originale WordPress | `PARZIALE` | Snapshot immutabile leggibile e pannello baseline presenti; selezione basata sull'ultimo snapshot del prodotto, non sulla lineage puntuale del campo. |
| Confronto originale/corrente | `PARZIALE` | Il valore baseline appare quando differisce e l'intero normalized è consultabile; mancano stato lineage, provenienza puntuale e confronto affiancato coerente per campo. |
| Cronologia | `PARZIALE` | Query e tabella append-only presenti; UI mostra solo field key, tipo, attore e data, non valori/versioni precedenti e nuovi né filtro per campo. |
| Versioning anti-sovrascrittura | `IMPLEMENTATO` | `expectedVersion` verificata prima e dentro la RPC con lock `FOR UPDATE`; conflitto HTTP 409; history registra versioni. Vale per righe esistenti. |
| Idempotenza command | `PARZIALE` | Log e chiave per attore presenti. L'hash JSON usa una whitelist non ricorsiva e non è affidabile per oggetti FAQ annidati. |
| Campi strutturali protetti | `IMPLEMENTATO` | Gruppi/chiavi protetti controllati nell'Edge Function e nuovamente nella funzione DB; scritture browser revocate. |
| Coerenza pulsanti UI con protezioni | `DIFETTOSO` | In modalità `full` il client non include `field.editable` nella decisione e può mostrare “Modifica” su campi che il server rifiuterà. |
| Campi manuali protetti | `DIFETTOSO` | `protected_on_reimport` è corretto, ma `is_locked=true` blocca anche la modifica manuale. Il problema è visibile sul profilo golden di `OG_393883`. |
| Revisione AI legacy | `PARZIALE` | Badge, blocco pubblicazione e azioni conferma/scarta presenti; la copertura canary non include tutti i campi legacy e non esiste confronto con una suggestion separata. |
| Nuove proposte AI field-by-field | `MANCANTE` | `product_ai_suggestions`, `base_version` e `prompt_version` non sono interrogati. Il pulsante AI è disabilitato. |
| AI come sola proposta | `MANCANTE` | Le funzioni AI legacy operano su modelli separati e alcune possono arrivare a Shopify; non sono riusabili direttamente nel flusso Admin V2. |
| Stato Shopify in scheda/lista | `PARZIALE` | Stato letto come current value e protetto; nessun dettaglio operativo o cronologia sync Admin V2. |
| Shopify sync da Admin V2 | `MANCANTE` | La sezione pubblicazioni è placeholder. I tool legacy restano separati e accessibili al solo `tech_admin`; non vanno collegati alla tranche editing. |
| Import in Admin V2 | `MANCANTE` | La pagina è placeholder; gli strumenti legacy esistono fuori dal flusso V2. Non sono necessari per il primo editing field-by-field. |

## 5. Inventario componenti

### Frontend Admin V2

| Componente | Ruolo attuale | Valutazione |
|---|---|---|
| `AdminV2Guard.tsx` | Sessione e verifica contesto Admin | Solido; conserva il controllo server-side. |
| `AdminShell.tsx` | Navigazione e link tecnico legacy | Banner hardcoded “consultazione” non coerente con `canWrite`; il flag legacy è attivo per default. |
| `ProductsPage.tsx` | Ricerca, cursor e filtri | Base utile; i filtri client-side vanno spostati nel contratto API. |
| `ProductDetailPage.tsx` | Sezioni, baseline e history | Base corretta; capacità per campo calcolata in parte dal client e non completamente dal server. |
| `FieldCard.tsx` | Visualizzazione e comando campo | Riutilizzabile come contenitore; editor testuale monolitico da sostituire con editor tipizzati. |
| `ValueDisplay.tsx` | Rendering leggibile di scalari, liste e oggetti | Adeguato alla sola lettura; non è un editor strutturato. |
| `useAdminData.ts` | Query, mutation e cache invalidation | Buona base; manca prevalidazione e gestione mirata del conflitto con refetch/merge visuale. |
| `adminApi.ts` | Contratto client unico verso Edge Function | Corretto confine architetturale; tipi da estendere con lineage, regole, capability e suggestion. |

### API ed Edge Function

| Modulo | Ruolo attuale | Valutazione |
|---|---|---|
| `auth.ts` | JWT e ruoli server-side | `IMPLEMENTATO`. |
| `permissions.ts` | Whitelist azioni e ruoli | `IMPLEMENTATO`; mantenere deny-by-default. |
| `queries.ts` | Prodotti, current, snapshot, history, dashboard | `PARZIALE`; manca lineage per campo, AI suggestion e filtri completi. |
| `serializers.ts` | View model sezioni e riepiloghi | `PARZIALE`; non espone `applies_to`, regole, `source_snapshot_id`, suggestion o capability finale. |
| `validation.ts` | Regole pure e campi protetti | `PARZIALE`; buona base server, ma manca il caso versione 0/insert e la validazione strutturale FAQ. |
| `commands.ts` | Flag, idempotenza e RPC | `PARZIALE`; RPC corretta per valori esistenti, hash da rendere canonico e ricorsivo. |
| `admin_update_product_field(...)` | Update atomico, history, versioning | `PARZIALE`; non crea valori assenti e confonde lock applicativo con protezione da re-import. |

### Moduli legacy confinanti

- `create-product-ai`, `ai-enrich-products` e i pannelli legacy non scrivono
  `product_ai_suggestions`; non soddisfano il requisito “AI solo proposta”.
- `create-product-ai` include anche un percorso di creazione Shopify: non deve
  essere importato o invocato dalla nuova scheda campo.
- i moduli di sync/import legacy sono raggiungibili soltanto dalla sezione tecnica,
  ma `VITE_ADMIN_LEGACY_TOOLS` ha fallback `true`. Per il rollout cliente va
  impostato esplicitamente a `false`, senza rimuovere il codice in questa fase.

## 6. Integrazione con il modello lossless

| Tabella | Uso attuale Admin V2 | Stato | Modifica minima proposta |
|---|---|---|---|
| `products` | Identità, SKU, tipo, parent, stato attivo | `IMPLEMENTATO` | Nessuna modifica schema; resta la tabella canonica. |
| `product_current_values` | Valore, origine, review, lock e versione | `PARZIALE` | Esporre lineage nullable; supportare insert atomico a versione 0; distinguere lock da protezione re-import. |
| `product_source_snapshots` | Ultimo snapshot per prodotto | `PARZIALE` | Risolvere prima lo snapshot puntuale quando presente; fallback esplicitamente etichettato, mai spacciato per lineage certa. |
| `product_field_definitions` | Etichette, gruppi e policy base | `PARZIALE` | Applicare `applies_to`; esporre regole/opzioni e mappare `editor_type` a componenti reali. |
| `product_ai_suggestions` | Nessun uso runtime Admin V2 | `MANCANTE` | Leggere la pending suggestion per campo; creare/accettare/scartare solo con version check e senza aggiornamento automatico. |
| `product_field_history` | Ultimi 20 eventi prodotto | `PARZIALE` | Esporre diff, versioni e origine; filtro/espansione per campo. |

### Regola obbligatoria per `source_snapshot_id`

`source_snapshot_id = NULL` è uno stato valido e non deve bloccare lista,
dettaglio, editing manuale, history o visualizzazione di suggestion.

Il view model proposto deve esporre:

- `sourceSnapshotId: string | null`;
- `baselineStatus: linked | product_fallback | unavailable`;
- `baselineValue: unknown | null`;
- un'etichetta esplicita che non inventi provenance.

Risoluzione:

1. se `source_snapshot_id` è valorizzato, leggere esattamente quello snapshot e
   verificare che appartenga allo stesso prodotto;
2. se è `NULL`, è consentito mostrare l'ultimo snapshot del prodotto soltanto
   come “baseline prodotto non collegata al campo”;
3. se non esiste snapshot, mostrare “originale non disponibile” senza errore;
4. ogni update manuale deve lasciare invariato `source_snapshot_id`, incluso
   quando è `NULL`.

## 7. Proposta minima di implementazione

### 7.1 Contratto di lettura per campo

Estendere `AdminField` e `serializeField` con i soli metadati necessari:

- `appliesTo`, `required`, `validationRules` e opzioni enum;
- `canEdit`, `lockReason` e `allowedActions` calcolati server-side;
- `sourceSnapshotId` e `baselineStatus` nullable;
- `pendingAiSuggestion` con id, valore, modello, `baseVersion`,
  `promptVersion` e stato;
- history sintetica per il campo o endpoint paginato dedicato.

Il client non deve ricostruire autorizzazioni partendo dal ruolo: deve solo
renderizzare le capability restituite dal server.

### 7.2 Editor tipizzati

Sostituire il ramo unico di `FieldCard` con `FieldEditor`:

| `editor_type` / `data_type` | Editor minimo |
|---|---|
| `text` | input singola riga |
| `textarea`, `richtext` | textarea controllata; rich text avanzato rinviabile |
| `number` | input numerico con conversione esplicita |
| `boolean` | switch/checkbox |
| `select` | select da enum del registry |
| `multiselect`, `array` | lista/chip editor, mai stringa JSON |
| `json` con key `faq` | `FaqEditor` dedicato |
| `readonly`, image e gruppi protetti | sola visualizzazione |

`FaqEditor` gestisce una lista ordinata di `{ question, answer }`, con azioni
aggiungi, rimuovi e riordina. Il payload è un array tipizzato; nessuna textarea
JSON viene esposta al cliente.

### 7.3 Update di un valore esistente

Mantenere il flusso già valido:

1. fetch del campo con `version=N`;
2. prevalidazione read-only opzionale;
3. command con `expectedVersion=N` e idempotency key;
4. lock DB, confronto versione, update di un solo campo e history nella stessa
   transazione;
5. in caso `VERSION_CONFLICT`, refetch del campo e confronto visuale senza
   sovrascrittura automatica.

### 7.4 Creazione di un valore mancante

Estendere lo stesso command con `expectedVersion=0` soltanto quando non esiste
una riga `(product_id, field_key)`:

- verificare definizione, `applies_to`, editabilità, ruolo e tipo;
- eseguire `INSERT` atomico con versione 1 e unique constraint già esistente;
- se un'altra sessione crea la riga, restituire `VERSION_CONFLICT` con la
  versione corrente;
- creare history con precedente `NULL`, nuova versione 1;
- non valorizzare artificialmente `source_snapshot_id`.

Non è necessario alcun backfill per abilitare questo caso.

### 7.5 Campi manuali e lock

`protected_on_reimport=true` deve continuare a impedire sovrascritture da import.
Non deve impedire la modifica manuale autorizzata.

Modifica minima futura della funzione atomica:

- mantenere il blocco di `is_locked` per campi strutturali o realmente congelati;
- consentire `update_field` sui campi `manual_only=true` a ruoli autorizzati,
  senza togliere `protected_on_reimport` e senza aggiornare in massa i dati;
- mantenere AI vietata sui campi manual-only, salvo eventuali eccezioni future
  deliberate campo per campo.

La correzione va provata su PostgreSQL isolato e distribuita con migration
dedicata soltanto dopo approvazione. Nessun flag dati va corretto in massa.

### 7.6 AI esclusivamente come proposta

Il primo slice non deve richiamare i moduli AI legacy. Il contratto sicuro è:

1. “Migliora con AI” crea una riga `pending` in
   `product_ai_suggestions`, senza aggiornare il current value;
2. ogni nuova suggestion registra obbligatoriamente `base_version` uguale alla
   versione corrente e una `prompt_version` identificabile;
3. UI mostra originale, corrente e proposta in tre aree distinte;
4. “Accetta” controlla atomicamente che `base_version` coincida ancora con la
   versione corrente, aggiorna un solo campo, aggiunge history e marca la
   suggestion `accepted`;
5. in caso di versione diversa la suggestion diventa `superseded` o viene
   presentata come obsoleta, senza applicazione;
6. “Scarta” cambia solo lo stato della suggestion e registra la decisione;
7. una suggestion legacy con `base_version=NULL` può essere mostrata, ma non
   accettata automaticamente: richiede rigenerazione o revisione esplicita.

Generazione, accettazione e scarto devono essere azioni separate. Nessuna di
esse pubblica o sincronizza con Shopify.

### 7.7 Shopify

Per la tranche field editing:

- mostrare soltanto stato e ultimo esito già disponibili;
- mantenere il gruppo `shopify_state` non modificabile;
- non aggiungere pulsanti sync/pubblicazione;
- non importare client Shopify nella nuova Edge Function;
- tenere gli strumenti legacy fuori dalla navigazione cliente tramite flag
  esplicito.

## 8. Golden product `OG_393883`

Il prodotto è il caso di accettazione principale perché combina identità
parent/variation, campi manuali protetti, contenuti SEO/AI legacy, baseline e
stato Shopify.

Evidenze repository già disponibili, senza nuova lettura live:

- identità canonica e current values presenti;
- cinque campi manuali protetti e AI vietata;
- contenuti SEO/AI legacy in revisione e bloccati alla pubblicazione;
- stato Shopify disponibile in sola lettura;
- snapshot e baseline già verificati nelle fasi precedenti.

Gap golden attuale: i campi manuali protetti risultano `is_locked` e quindi non
sono modificabili dal flusso UI/RPC, in contrasto con l'obiettivo field-by-field.

Scenario di collaudo futuro, inizialmente su fixture/clone isolato:

1. ricerca esatta SKU e scelta esplicita tra prodotto principale e variation;
2. caricamento scheda anche con `source_snapshot_id=NULL`;
3. visualizzazione affiancata di originale, corrente, provenance e versione;
4. modifica di un campo manuale autorizzato, preservando protezione re-import e
   lasciando invariati tutti gli altri campi;
5. simulazione di due editor: il secondo riceve `VERSION_CONFLICT` e nessun dato
   viene sovrascritto;
6. modifica di FAQ con repeater senza JSON manuale, inclusa creazione quando il
   current value è assente;
7. proposta AI separata, nessun cambio corrente prima di “Accetta”;
8. suggestion stale non applicabile;
9. SKU, tipo, parent, inventario e stato Shopify sempre non modificabili;
10. nessuna chiamata Shopify, import o backfill durante il test.

I test non devono contenere i valori privati del prodotto: bastano chiavi,
classificazioni e fixture sintetiche equivalenti.

## 9. Criteri di accettazione cliente

### Lettura e confronto

- il cliente trova un prodotto per SKU senza falsi negativi dovuti alla pagina;
- parent e variation sono distinguibili chiaramente;
- ogni campo applicabile mostra etichetta comprensibile, corrente, originale o
  stato “non disponibile”, origine e stato review;
- `source_snapshot_id=NULL` non causa errori e non produce provenance inventata;
- la cronologia mostra chi, quando, valore precedente/nuovo e versioni.

### Editing

- il pulsante “Modifica” compare soltanto se il server autorizza quel campo;
- text, numero, booleano, enum, lista e FAQ inviano valori tipizzati;
- FAQ è modificabile come elenco domanda/risposta, mai come JSON grezzo;
- campi manual-only sono editabili manualmente ma restano protetti da re-import
  e non disponibili all'AI;
- campi strutturali, inventory e Shopify restano read-only;
- un campo assente può essere creato senza backfill e parte da versione 1;
- due modifiche concorrenti non causano last-write-wins silenzioso.

### AI

- l'AI non aggiorna mai direttamente `product_current_values`;
- proposta e valore corrente sono visivamente separati;
- accettazione/scarto sono espliciti, auditati e limitati a un solo campo;
- `base_version` diversa dalla corrente impedisce l'accettazione;
- `base_version=NULL` è gestita come legacy/non verificabile, non come consenso.

### Sicurezza e operazioni

- browser senza accesso diretto di scrittura alle tabelle;
- controlli ripetuti in Edge Function e funzione DB;
- nessuna chiamata Shopify o deploy implicito dal salvataggio campo;
- feature flag server-side disabilitato per default e canary limitato ad
  Admin/Tech Admin;
- test transazionali su PostgreSQL isolato prima di qualsiasi attivazione live;
- smoke test live iniziale esclusivamente read-only sul golden product.

## 10. Piano di test della futura implementazione

1. unit test per capability server, `applies_to`, editor/value codec e FAQ;
2. unit test per canonical hash ricorsivo di payload strutturati;
3. test API per `source_snapshot_id` valorizzato, `NULL` e snapshot assente;
4. test RPC isolati per update versione corretta, conflitto, no-op, insert con
   versione 0, race su insert e rollback completo;
5. test campi manual-only bloccati al re-import ma editabili a mano;
6. test history precedente/nuovo, origine e versioni;
7. test suggestion pending/accepted/discarded/superseded e base version `NULL`;
8. test UI del `FaqEditor` senza serializzazione manuale visibile;
9. test che nessun bundle/modulo Admin V2 importi client Shopify o invocatori AI
   legacy;
10. typecheck, intera suite catalogo, build e `git diff --check`.

## 11. Verifiche eseguite in questa fase

| Verifica | Esito |
|---|---|
| PR #3 mergiata prima dell'audit | PASS — merge `7858f6c` |
| Branch creato dall'ultimo `origin/main` | PASS |
| `npm ci` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS — 44/44 |
| `npm run build` | PASS — 1.903 moduli |

La build conserva warning preesistenti su due classi Tailwind ambigue e sul
chunk principale oltre 500 kB. Non sono state rilevate regressioni di build.

## 12. Vincoli rispettati e gate successivo

In Fase 2A non sono stati modificati runtime, Edge Function, migration, schema,
dati, feature flag, AI, Shopify o storefront. Non sono stati eseguiti backfill,
deploy, commit o push.

Il passo successivo richiede approvazione esplicita del piano. La prima tranche
consigliata è: contratto di lettura esteso, capability server-side, editor
tipizzati/FAQ e test puri. La modifica della funzione atomica per campi assenti
e manual-only deve restare una tranche separata, provata su PostgreSQL isolato
prima di qualunque migration live.

## 13. Addendum finale — verifica Fase 2B.1

La tranche minima proposta dall'audit è stata implementata e revisionata sullo
stesso branch, senza modificare schema o funzione SQL atomica.

| Gap Fase 2A | Stato dopo Fase 2B.1 |
|---|---|
| Capability ricostruite parzialmente dal client | **RISOLTO** — calcolate dalla Edge Function per campo. |
| `applies_to` non applicato | **RISOLTO** — filtrato in lettura e verificato nel percorso validate/command per simple, parent e variation. |
| Valori tipizzati trasformati in testo | **RISOLTO** — codec e componenti preservano number, boolean e array. |
| FAQ senza editor strutturato | **RISOLTO** — repeater domanda/risposta; legacy opaco resta invariato. |
| Lineage campo ignorata | **RISOLTO** — snapshot puntuale, fallback esplicitamente non collegato o originale assente; `NULL` valido. |
| UI incoerente con `is_locked` | **RISOLTO PER LA RPC ATTUALE** — nessun Salva; conferma legacy rimane disponibile solo dove la RPC la consente. |
| Conflitto versione con solo errore generico | **RISOLTO** — bozza preservata, versione server mostrata, reload esplicito. |
| Current value assente | **RINVIATO A 2C** — richiede insert atomico/versione 0. |
| Manual-only locked editabile a mano | **RINVIATO A 2C** — richiede decisione di policy e modifica SQL separata. |
| AI come proposta | **RINVIATO A 2C** — nessuna AI è stata collegata in questa tranche. |

Verifica specifica del golden product: le cinque chiavi manuali
`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia` e `curiosita`
sono coperte da fixture sintetiche. La capability mantiene
`manualOnly=true`, AI vietata e protezione re-import conservativa anche se il
flag della singola riga fosse incoerentemente falso. Con `is_locked=true`
restano non salvabili, in conformità alla RPC esistente. Nessun valore privato
del prodotto è incluso nei test.

Checklist cliente conclusiva della tranche:

- [x] corrente e originale sono confrontabili per campo;
- [x] provenance, versione e stato lineage sono visibili;
- [x] `source_snapshot_id=NULL` non blocca la scheda;
- [x] campi non applicabili al tipo prodotto non sono esposti né accettati;
- [x] campi locked non presentano Salva;
- [x] number, boolean, array e FAQ mantengono il tipo nativo;
- [x] FAQ legacy non interpretabili non vengono convertite;
- [x] il conflitto versione non effettua overwrite automatico;
- [x] nessun flusso Admin V2 attiva import, AI, Shopify o storefront;
- [ ] editing dei manual-only locked — Fase 2C, previa nuova policy RPC;
- [ ] creazione di current value assente — Fase 2C;
- [ ] proposta AI separata — Fase 2C.

Verifiche finali Fase 2B.1: `deno check` Edge Function, typecheck,
`test:catalog` (**53/53**), build e `git diff --check` tutti superati. Il
changelog Supabase del 24 settembre 2026 non evidenzia breaking change
pertinenti al contratto Edge Function/Data API usato da questa tranche.
