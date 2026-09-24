# ONLINE GARDEN — Fase 1A.6

## Stato cliente

**READY FOR APPROVAL — nessuna esecuzione live.**

La migration differenziale e il dry-run del backfill sono finalizzati e testati
localmente. Nessuna migration o query di backfill e' stata eseguita su Lovable
Cloud. Prima del deploy servono approvazione, nuovo controllo read-only del drift
e revisione dei conteggi prodotti dal dry-run.

## Decisione architetturale

L'architettura riutilizza:

- `products` come unica anagrafica canonica;
- `product_import_batches`;
- `product_source_snapshots`;
- `product_current_values`;
- `product_ai_suggestions`;
- `product_field_history`.

`product_catalog_entities` non viene creata. Introdurla produrrebbe una seconda
identita' prodotto e romperebbe il modello di FK gia' adottato dal live.

## Sostituzione della migration precedente

La precedente migration locale
`20260922101750_create_lossless_product_catalog_foundation.sql` era:

- non tracciata da Git;
- assente dall'indice;
- assente da `git log --all --diff-filter=A`;
- quindi mai inclusa nella storia dei branch o delle remote ref conosciute.

E' stata rimossa e sostituita dalla migration generata tramite Supabase CLI:

`supabase/migrations/20260923155153_add_lossless_lineage_and_ai_versions.sql`

## Contenuto della migration finale

La migration aggiunge soltanto colonne nullable e idempotenti:

| Tabella | Colonna | Tipo | Default | Vincoli nuovi |
|---|---|---|---|---|
| `product_current_values` | `source_snapshot_id` | `uuid` | nessuno | nessuno |
| `product_ai_suggestions` | `base_version` | `integer` | nessuno | nessuno |
| `product_ai_suggestions` | `prompt_version` | `text` | nessuno | nessuno |

Non contiene DML e non modifica FK, indici, check, trigger, RLS, policy, grant o
privilegi. Non riscrive dati esistenti e lascia `NULL` tutti i record legacy.

La nullability e' intenzionale:

- i current value manuali, AI o legacy possono non avere uno snapshot sorgente;
- le suggestion AI legacy possono non avere una versione current value o prompt
  ricostruibile con certezza;
- nessuna provenance viene inventata per soddisfare un vincolo tecnico.

## Mapping Admin V2

| Concetto Admin V2 | Implementazione live/finale |
|---|---|
| Identita' prodotto | `products.id` |
| SKU e tipo canonico | `products.sku`, `products.entity_type` |
| Parent variation | `products.parent_product_id` |
| Batch sorgente | `product_current_values.source_batch_id` |
| Snapshot puntuale verificato | `product_current_values.source_snapshot_id` |
| Valore corrente | `value_text`, `value_json` o `value_number` |
| Provenienza | `origin` e `value_origin`, invariati |
| Versione current value | `product_current_values.version`, invariata |
| Versione usata dalla proposta AI | `product_ai_suggestions.base_version` |
| Versione prompt | `product_ai_suggestions.prompt_version` |
| AI legacy | colonne nuove `NULL`, valore e stato invariati |
| Storia | `product_field_history`, invariata e append-only |

Admin V2 dovra' trattare una suggestion come stale/superseded quando
`base_version` e' valorizzata e differisce dalla versione corrente. Un valore
`NULL` identifica una suggestion legacy o senza provenance sufficiente e richiede
review; non autorizza accettazione automatica.

## Backfill: solo dry-run read-only

Il file `docs/phase1a6-source-snapshot-backfill-dry-run.sql` apre una transazione
`READ ONLY`, non contiene INSERT/UPDATE/DELETE e termina con `ROLLBACK`.

Un current value e' `MATCH_READY` soltanto quando tutte le condizioni sono vere:

1. `origin = 'import'`;
2. `value_origin` e' `source_csv` oppure `legacy_db_baseline`;
3. `products.id`, `product_id`, batch e SKU coincidono esattamente;
4. tipo canonico, tipo current value e `row_type` snapshot sono coerenti;
5. `product_field_definitions.source_aliases` individua il campo sorgente;
6. esiste un comparatore conservativo per il tipo;
7. il valore corrente coincide con il valore dello snapshot;
8. esiste un solo snapshot verificato.

La query non espone valori prodotto. Restituisce identificativi tecnici,
classificazione, motivazione e conteggi.

### Classificazioni

| Classe | Regola | Azione futura |
|---|---|---|
| `MATCH_READY` | Identita', valore e cardinalita' verificati; un solo snapshot. | Ammissibile a un backfill DML separato dopo approvazione. |
| `AMBIGUOUS_SOURCE` | Piu' snapshot superano tutte le verifiche. | Lasciare `NULL`, review manuale. |
| `NO_MATCH` | Nessun candidato esatto o nessun valore verificato. | Lasciare `NULL`, analizzare mapping o sorgente. |
| `NOT_APPLICABLE` | Origine non sorgente, AI legacy, manuale, campo senza alias o comparatore sicuro. | Lasciare `NULL`; nessun backfill. |

`legacy_ai_unknown_approval`, valori manuali e valori AI accettati non sono mai
candidati. Questo preserva integralmente AI legacy, lock, review, approvazioni,
versioni e provenance esistente.

### Backfill DML futuro

Non e' stato creato un UPDATE eseguibile in questa fase. Dopo l'approvazione del
dry-run, il DML dovra':

- utilizzare esattamente l'insieme `MATCH_READY` approvato;
- aggiornare solo `source_snapshot_id is null`;
- non modificare alcun'altra colonna;
- usare un journal degli ID e conteggi prima/dopo;
- essere eseguito in batch e interrompersi se il numero atteso cambia;
- lasciare invariati `AMBIGUOUS_SOURCE`, `NO_MATCH` e `NOT_APPLICABLE`.

## Tre SKU temporaneamente simple

Restano invariati:

- `OG_152965` (`OG_152965-01` nel CSV WordPress);
- `OG_891874` (`OG_891874-01`, `OG_891874-02`);
- `OG_758263` (`OG_758263-01`, `OG_758263-02`).

La migration non aggiorna `products.entity_type`, parent o snapshot. Le variation
WordPress restano conservate negli otto CSV lossless e nella documentazione di
riconciliazione; non vengono eliminate, materializzate o pubblicate. La decisione
simple/variable rimane una review dati separata.

## Rollback

### Rollback applicativo raccomandato

1. disabilitare il codice Admin V2 che usa le tre colonne;
2. lasciare le colonne nullable nel database;
3. correggere in avanti il consumer.

Questa strategia non perde dati e ripristina immediatamente il comportamento
precedente.

### Rollback DDL, solo con approvazione separata

Il drop delle colonne e' distruttivo e non fa parte della migration. Puo' essere
valutato solo dopo aver verificato che siano tutte `NULL`, che non esistano
consumer e che sia disponibile un backup valido:

```sql
alter table public.product_current_values
  drop column source_snapshot_id;

alter table public.product_ai_suggestions
  drop column base_version,
  drop column prompt_version;
```

Se un futuro backfill viene eseguito, il rollback dati deve usare il journal degli
ID della specifica esecuzione e impostare a `NULL` solo quelle righe.

## Checklist deploy futura

- [ ] Approvazione formale della migration 1A.6.
- [ ] Conferma SHA256 dell'inventario 1A.4 o produzione di un nuovo inventario.
- [ ] Read-only drift check: tabelle, colonne, tipi, RLS, policy e grant.
- [ ] Conferma che `product_catalog_entities` non esista.
- [ ] Backup verificato e finestra operativa concordata.
- [ ] Applicazione migration prima in staging/clone.
- [ ] Confronto RLS, policy e grant prima/dopo: differenza zero.
- [ ] Rigenerazione tipi Supabase dopo l'applicazione approvata.
- [ ] Esecuzione del solo dry-run backfill.
- [ ] Revisione conteggi `MATCH_READY`, `AMBIGUOUS_SOURCE`, `NO_MATCH`, `NOT_APPLICABLE`.
- [ ] Approvazione separata del DML di backfill.
- [ ] Test Admin V2 con suggestion legacy e nuova suggestion versionata.
- [ ] Verifica esplicita dei tre SKU mantenuti `simple`.
- [ ] Monitoraggio errori e piano di rollback applicativo.

## Vincoli rispettati

Nessuna migration o backfill live, import, Shopify, AI, storefront, deploy,
commit o push. Nessun export privato e nessun valore prodotto e' stato aggiunto
alla documentazione o alla migration.

## Esito verifiche locali

| Verifica | Esito |
|---|---|
| Migration su PostgreSQL isolato | PASS |
| Seconda applicazione idempotente | PASS |
| Solo tre colonne nullable aggiunte | PASS |
| FK, indici, RLS, policy e grant invariati | PASS |
| Permessi effettivi `authenticated` invariati | PASS |
| AI legacy e relativi stati invariati | PASS |
| Tre SKU protetti ancora `simple` | PASS |
| Dry-run senza scritture | PASS |
| `MATCH_READY` con un solo candidato verificato | PASS |
| `AMBIGUOUS_SOURCE` con candidati multipli | PASS |
| `NO_MATCH` senza valore verificato | PASS |
| `NOT_APPLICABLE` per manuale e AI legacy | PASS |
| Rollback atomico con prerequisito mancante | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 28/28 |
| `npm run build` | PASS, 1.888 moduli |

La build conserva due warning Tailwind su classi arbitrarie ambigue e il warning
Vite relativo a un chunk JavaScript superiore a 500 kB. Sono warning non
bloccanti e non derivano dalle modifiche SQL/documentali della Fase 1A.6.
