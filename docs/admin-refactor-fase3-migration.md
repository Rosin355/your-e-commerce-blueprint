# FASE 3 — Migration additiva (PREPARATA, NON APPLICATA)

Nessuna migration è stata eseguita. Nessun dato, nessuna tabella esistente, nessuna Edge Function, nessun oggetto Shopify è stato modificato. Nessun deploy, nessun commit, nessun push.

## 1. File creati

| File | Contenuto |
|---|---|
| `docs/fase3/001-app-role-additive.sql` | Estensione additiva enum `app_role`: `editor`, `publisher`, `tech_admin` |
| `docs/fase3/002-product-model-additive.sql` | 7 tabelle nuove, funzioni permessi, RLS, protezioni snapshot |
| `docs/fase3/rollback-f3.sql` | Rollback non distruttivo |
| `docs/fase3/verify-f3.sql` | Script di verifica in sola lettura |
| `src/admin/types/productModel.ts` | Definizioni TypeScript del modello |
| `docs/admin-refactor-fase3-migration.md` | Questo documento |

Le due migration vanno eseguite **in transazioni separate**: Postgres non consente di usare un valore di enum nella stessa transazione in cui viene aggiunto.

## 2. Le sette tabelle

| # | Tabella | Ruolo | Chiavi e vincoli principali |
|---|---|---|---|
| 1 | `product_field_definitions` | Registry campi: alias CSV, tipo editor, mapping Shopify, flag `ai_allowed` / `manual_only` / `publishable` / `protected_on_reimport`, `applies_to` (prodotto/variante) | PK `key`; CHECK su `editor_type`, `data_type`, `applies_to` |
| 2 | `product_import_batches` | Un batch per file importato | PK `id`; UNIQUE `checksum_sha256`, UNIQUE `idempotency_key`; CHECK stato; CHECK "non applicabile se `potential_data_loss > 0`" |
| 3 | `product_source_snapshots` | Riga sorgente immutabile (simple / parent / variation), inventario storico, categoria originale, dati variante | PK `id`; FK `batch_id → product_import_batches` (ON DELETE RESTRICT); UNIQUE `(batch_id,row_index)` e `(batch_id,sku,row_type,position)`; CHECK `variation ⇒ parent_sku NOT NULL` |
| 4 | `product_current_values` | Valore corrente approvato, modello EAV per `(sku, field_key)` | PK `id`; UNIQUE `(sku,field_key)`; FK `field_key → product_field_definitions`; FK `source_batch_id`; CHECK `variant ⇒ parent_sku NOT NULL`; CHECK su `origin` e `publish_state` |
| 5 | `product_ai_suggestions` | Proposte AI separate, richiedono "Accetta" | PK `id`; FK `field_key`; UNIQUE parziale: una sola proposta `pending` per `(sku,field_key)`; trigger che rifiuta campi con `ai_allowed = false` |
| 6 | `product_field_history` | Audit trail append-only di ogni transizione | PK `id`; FK `batch_id`; CHECK su `change_type`; UPDATE/DELETE bloccati |
| 7 | `product_publication_jobs` | Pubblicazione esplicita verso Shopify | PK `id`; UNIQUE `idempotency_key`; indice unico parziale su `lock_key` per stati `queued`/`running` (lock per prodotto); CHECK su `status` e `target` |

Timestamp: tutte le tabelle mutabili hanno `created_at`/`updated_at` con trigger `update_updated_at_column()`; snapshot e storico hanno solo `created_at` perché immutabili.

## 3. Indici

`product_field_definitions(field_group, sort_order)` · `product_import_batches(status, created_at DESC)` · `product_source_snapshots(sku)`, `(parent_sku) WHERE NOT NULL`, `(batch_id)`, `(row_type)` · `product_current_values(sku)`, `(parent_sku) WHERE NOT NULL`, `(publish_state) WHERE <> 'published'` · `product_ai_suggestions(sku,status)` + unico parziale pending · `product_field_history(sku, created_at DESC)`, `(change_type)` · `product_publication_jobs(status, created_at DESC)` + unico parziale sul lock.

## 4. RLS e permessi

- RLS abilitata su tutte e sette le tabelle.
- `GRANT SELECT` a `authenticated` solo dove serve alla UI; `GRANT ALL` a `service_role`. Nessun `GRANT` ad `anon`.
- Ogni lettura è filtrata da `public.can_edit_products(auth.uid())`: la protezione **non** dipende dal nascondere elementi nella UI.
- Scritture su batch, snapshot, valori correnti, proposte AI, storico e job: **solo via Edge Function con `service_role`**, che applica le regole di merge, lo storico e i permessi. Nessuna policy di scrittura per `authenticated`.
- Configurazione del registry campi: riservata ad `admin` / `tech_admin` via policy dedicata.
- `public.can_publish_products(uuid)` (SECURITY DEFINER, `search_path = public`) restituisce true per `admin`, `tech_admin`, `publisher`. È la permission server-side richiesta: l'editor senza `publisher` prepara le modifiche ma non può creare job di pubblicazione.
- Nessun token, credenziale o dato sensibile è memorizzato nelle nuove tabelle.

## 5. Protezione degli snapshot immutabili

Tre livelli, nessuno dei quali è la UI:

1. `REVOKE UPDATE, DELETE, TRUNCATE ... FROM authenticated` su `product_source_snapshots` e `product_field_history`.
2. Nessuna policy RLS di UPDATE/DELETE (con RLS attiva, l'assenza di policy nega l'operazione).
3. Trigger `BEFORE UPDATE OR DELETE` → `deny_snapshot_mutation()` che solleva errore `42501` anche per `service_role`.

Unica via tecnica controllata: una procedura di manutenzione eseguita da una sessione `postgres`/`service_role` che imposti `SET LOCAL app.allow_snapshot_maintenance = 'on'` all'interno della transazione. Il parametro non è impostabile dai client PostgREST, quindi non è raggiungibile dall'app; ogni intervento va comunque registrato manualmente in `product_field_history`.

## 6. Parent / variante

Rappresentati sia nello snapshot sia nei valori correnti:

- snapshot: `row_type` (`simple`/`parent`/`variation`), `parent_sku`, `source_id`, `source_parent_id`, `variant_options`, `variant_price`, `variant_compare_price`, `variant_image_url`, `variant_weight_grams`, `variant_dimensions`, `variant_status`, `position`, `shopify_variant_id`;
- valori correnti: `entity_type` (`product`/`variant`) + `parent_sku`, con CHECK che impedisce varianti orfane;
- il registry dichiara con `applies_to` quali campi valgono per prodotto, variante o entrambi.

Nessuna mutation Shopify sulle varianti è prevista o abilitata in F3.

## 7. Inventario

`inventory_in_stock`, `inventory_quantity`, `inventory_backorder` sono conservati **solo** nello snapshot come dato storico. Non esiste alcun campo inventario pubblicabile: nel seed del registry i campi inventario avranno `publishable = false` e `protected_on_reimport = true`, quindi il CSV Bulbi con `In stock? = 0` non può rendere esauriti i 118 prodotti. La scrittura dell'inventario verso Shopify non è implementata in F3; `change_type = 'inventory_proposal'` è già previsto nello storico per la fase futura con rilettura del valore Shopify e rilevazione conflitti.

## 8. Categorie / collezioni

Lo snapshot conserva `category_path_original`, `category_root`, `category_levels[]`, `category_leaf`. Il mapping verso le collezioni Shopify vive nei valori correnti come campo approvabile con stato (`da_verificare`, `approvato`, `non_mappato`, `errore`, vedi `CategoryMappingProposal`). Nessuna collezione viene creata automaticamente: la creazione resta un job separato con target `shopify_collections`, riservato ad admin, con anteprima e conferma.

## 9. Idempotenza e doppio inserimento

- Import: UNIQUE su `checksum_sha256` e su `idempotency_key` → reimportare lo stesso file non produce un secondo batch.
- Snapshot: UNIQUE `(batch_id, row_index)` → nessuna riga duplicata all'interno del batch.
- Valori correnti: UNIQUE `(sku, field_key)` → un solo valore corrente per campo.
- Proposte AI: indice unico parziale → una sola proposta pendente per campo.
- Pubblicazione: UNIQUE `idempotency_key` + indice unico parziale su `lock_key` per gli stati attivi → nessun doppio job concorrente sullo stesso prodotto.

## 10. Compatibilità con `product_sync_csv_products`

La migration non tocca la tabella legacy: nessun `ALTER`, nessuna rinomina, nessun `DROP`, nessuna colonna rimossa, nessun trigger aggiunto. Storefront ed Edge Function esistenti continuano a funzionare invariati. La sincronizzazione nuovo modello → legacy sarà una fase successiva, esplicita e unidirezionale.

## 11. Test statici eseguiti

- Typecheck TypeScript del progetto con i nuovi tipi: nessun errore.
- Revisione statica dell'SQL: ordine di creazione coerente con le FK, tutte le `CREATE TABLE` usano `IF NOT EXISTS`, ogni tabella ha `GRANT` + `ENABLE ROW LEVEL SECURITY` + policy, nessuna istruzione `ALTER DATABASE`, nessuna istruzione distruttiva.
- `docs/fase3/verify-f3.sql` è pronto per la verifica post-applicazione (sola lettura).
- Non è stata eseguita alcuna prova di esecuzione contro il database: sarebbe stata una scrittura.

## 12. Piano di rollback

`docs/fase3/rollback-f3.sql`: `DROP TABLE ... CASCADE` sulle sole 7 tabelle nuove, in ordine inverso alle FK, più il `DROP` delle 4 funzioni introdotte. Nessun oggetto preesistente viene toccato. I valori di enum aggiunti non sono rimovibili da Postgres: restano inerti se non assegnati (rollback logico opzionale documentato nel file).

## 13. Rischi residui

1. **Enum in due transazioni** — se `001` e `002` vengono eseguite insieme, `002` fallisce con "unsafe use of new value of enum type". Vanno lanciate separatamente.
2. **Volume snapshot** — con ~3.300 righe per batch e più batch, `raw_row` in JSONB cresce; prevedere una retention dei batch vecchi (nessun impatto in F3).
3. **Scritture solo service_role** — ogni operazione di modifica passa da Edge Function: senza quelle funzioni (F4) le tabelle restano leggibili ma vuote e inerti.
4. **`deny_snapshot_mutation` blocca anche gli automatismi** — un futuro job che dovesse correggere uno snapshot deve usare esplicitamente la procedura di manutenzione.
5. **Registry non ancora popolato** — il seed dei campi (inclusi i 19 metafield, i 4 manuali e `nome_comune`) è parte di F4: prima del seed, `product_current_values` non accetta inserimenti per via della FK su `field_key`. Comportamento voluto.
6. **`app_role` esteso** — funzioni o codice che assumano esattamente tre ruoli vanno riletti in F4; nessun consumo attuale si rompe perché i valori sono solo aggiuntivi.

## 14. Conferme

- La migration **non è stata applicata** al database remoto.
- Nessun dato modificato, nessun backfill, nessuna tabella o colonna esistente alterata.
- Nessuna Edge Function creata, modificata o deployata.
- Nessun import eseguito, nessuna chiamata AI, nessuna mutation Shopify.
- Nessun commit, nessun push.
