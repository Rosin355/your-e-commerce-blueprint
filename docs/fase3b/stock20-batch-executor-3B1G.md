# Fase 3B.1G — STOCK-20 batch executor

Data: 3 ottobre 2026
Stato: **STOCK-20 BATCH EXECUTOR CODE READY / LIVE BATCH NOT YET EXECUTED**

## Esito e confini

È stato preparato un executor server-side per portare un batch massimo di 25 inventory item a questa configurazione esatta:

- `inventoryItem.tracked = true`;
- `productVariant.inventoryPolicy = DENY`;
- quantità `available = 20` come valore assoluto, mai come incremento `+20`;
- location unica approvata `gid://shopify/Location/117678014804`.

Non sono stati eseguiti deploy, chiamate Shopify live, scritture DB, import, AI, Smart Sync, modifiche contenuto/prezzo/immagini/handle/pubblicazione o variazioni strutturali.

## Audit dell'architettura esistente

L'integrazione riusa:

- il client Admin GraphQL server-side `supabase/functions/_shared/shopify-admin-client.ts`, inclusa la risoluzione centralizzata delle credenziali;
- l'autenticazione Admin V2 con verifica JWT e caricamento ruoli dal DB;
- il gate canary `admin` / `tech_admin`;
- le evidenze del canary OG_257799 e la location già validata.

Non usa Storefront API per scrivere, non espone token al frontend e non accetta location, SKU o ID Shopify dal body HTTP. Il vecchio proxy e le pipeline legacy non vengono modificati né richiamati.

Il client condiviso mantiene invariato il proprio comportamento preesistente. È stata aggiunta solo una variante compatibile che permette a questo executor di fissare esplicitamente Admin GraphQL `2026-01`. La scelta evita il fall-forward opaco del default legacy `2025-07`, oggi non più supportato. `2026-01` supporta `@idempotent` e `changeFromQuantity`.

Riferimenti ufficiali:

- [Shopify API versioning](https://shopify.dev/docs/api/usage/versioning)
- [Shopify idempotent requests](https://shopify.dev/docs/api/usage/idempotent-requests)
- [Shopify inventory concurrency protection](https://shopify.dev/changelog/posts/concurrency-protection-features)
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)

## Manifest e selezione target

Il manifest completo 3B.1C non è versionato nel repository: la documentazione ne registra il percorso esterno e lo SHA-256, ma non i record. Perciò questo lavoro non inventa i 25 SKU e non include export privati.

È disponibile l'importatore `scripts/build-stock20-batch-manifest.mjs`. Richiede:

1. il CSV finale 3B.1C verificato;
2. un export JSON read-only prodotto da Lovable con mapping e stato inventory live;
3. un `batch-id` approvato;
4. un output locale privato, mai da aggiungere a Git.

L'importatore considera soltanto righe:

- `action=UPDATE_EXISTING`;
- `entity_type=simple`;
- `stock_target=20`;
- `content_ready=YES`;
- prezzo positivo;
- nessun `block_reason`;
- mapping prodotto/variante/inventory item completo e coerente.

Sono esclusi esplicitamente `OG_393883`, `OG_891874`, `OG_758263`, `OG_152965`. Le due variation standalone, i 147 variable-as-simple e le 300 righe di ristrutturazione restano escluse perché non sono `simple + UPDATE_EXISTING`. Il limite massimo è 25.

Schema di ogni elemento:

```json
{
  "sku": "OG_...",
  "shopifyProductId": "gid://shopify/Product/...",
  "shopifyVariantId": "gid://shopify/ProductVariant/...",
  "inventoryItemId": "gid://shopify/InventoryItem/...",
  "locationId": "gid://shopify/Location/117678014804",
  "currentTracked": false,
  "currentPolicy": "DENY",
  "currentAvailable": 0,
  "targetAvailable": 20,
  "readiness": "READY_FOR_SALE",
  "structureStatus": "UPDATE_EXISTING"
}
```

Il JSON approvato va installato da Lovable come secret/configurazione server-side `SHOPIFY_STOCK20_BATCH_MANIFEST_JSON`; non viene inviato dal browser. Finché manca, la funzione risponde `MANIFEST_NOT_CONFIGURED` e non contatta Shopify.

## Contratto endpoint

Edge Function: `shopify-stock20-batch`.

Body minimo:

```json
{ "batchId": "stock20-...", "mode": "DRY_RUN" }
```

`DRY_RUN` è il default e non esegue mutation. `EXECUTE` richiede contemporaneamente:

- ruolo `admin` o `tech_admin` verificato server-side;
- `mode=EXECUTE`;
- `confirm=STOCK20_EXECUTE`;
- gate server-side `SHOPIFY_STOCK20_EXECUTE_ENABLED=true`;
- `batchId` identico al manifest approvato.

Non è stata aggiunta un'azione frontend. Il primo rilascio deve essere pilotato da Lovable/server con finestra controllata; solo dopo il collaudo si potrà valutare un comando Admin UI dedicato.

## Validazioni fail-fast

Prima di ogni mutation l'intero manifest viene verificato:

- schema/versione e origine 3B.1C;
- 1–25 elementi;
- SKU e inventory item univoci;
- GID Shopify formalmente validi;
- location esatta server-approved;
- target esatto 20;
- `READY_FOR_SALE` e `UPDATE_EXISTING`;
- denylist commerciale/strutturale.

Per ogni elemento una lettura live verifica SKU, product ID, variant ID, inventory item ID e location. Se i valori `current*` del manifest sono valorizzati e differiscono dallo stato live, l'elemento fallisce con `MANIFEST_STATE_DRIFT` senza write. I valori `null` sono ammessi solo quando il preflight deve essere completato dalla lettura live; non vengono inventati.

## Ordine, idempotenza e concorrenza

Ordine per elemento:

1. read-before;
2. `inventoryItemUpdate(tracked:true)` solo se necessario;
3. `productVariantsBulkUpdate(inventoryPolicy:DENY)` solo se necessario;
4. `inventorySetQuantities(available=20)` solo se necessario;
5. read-after con verifica di tutte le postcondizioni.

Chiave stabile: `stock20:<batch-id>:<inventoryItemId>:20`.

La quantità usa `inventorySetQuantities` in versione `2026-01` con:

- direttiva nativa Shopify `@idempotent`;
- `changeFromQuantity` uguale all'`available` letto prima della write;
- `referenceDocumentUri` derivato dalla stessa chiave;
- nessun `ignoreCompareQuantity`;
- nessun retry automatico della mutation.

Se una richiesta concorrente ottiene un errore ma una singola rilettura mostra già `tracked=true`, `DENY`, `available=20`, il risultato viene riconciliato come `ALREADY_AT_TARGET`. Se il target non è completo, l'errore resta tale. Un item già conforme non genera write.

## Report ed error handling

Il report usa solo gli stati:

- `UPDATED`;
- `ALREADY_AT_TARGET`;
- `SKIPPED`;
- `FAILED`.

Contiene before/after, mutation pianificate/applicate e chiave idempotente, ma non token né credenziali. Un errore item-specific permette di continuare; errori sistemici di autenticazione, scope, location, schema API o rate limit persistente arrestano il batch e marcano i successivi `BATCH_STOPPED`.

## Test offline

Copertura dedicata con client mock e zero rete live:

- limite 25;
- denylist;
- SKU e inventory item duplicati;
- location e struttura errate;
- ruoli Admin/Tech Admin;
- dry-run con zero mutation;
- `0→20`, `5→20`, `20→20` senza write;
- retry idempotente;
- tracking `false→true`;
- policy `CONTINUE→DENY`;
- drift manifest;
- errore item isolato;
- stop su errore sistemico;
- riconciliazione concorrente;
- assenza di segreti e chiamate Storefront/content.

## Rollout Lovable

1. Verificare hash del CSV 3B.1C già approvato.
2. Generare in sola lettura il JSON inventory con product/variant/item/location e stato corrente.
3. Eseguire l'importatore in area privata e revisionare massimo 25 record.
4. Salvare il manifest come configurazione server-side; nessun file cliente in Git.
5. Distribuire la sola Edge Function e il client shared della stessa revisione.
6. Lasciare `SHOPIFY_STOCK20_EXECUTE_ENABLED` assente/false.
7. Invocare `DRY_RUN`; archiviare report e verificare zero mutation.
8. Approvazione owner sul diff old→new.
9. Abilitare temporaneamente il gate, invocare una sola volta `EXECUTE`, disabilitare subito il gate.
10. Verificare report e read-after per tutti gli item; nessun test con dati non approvati.

## Rollback sicuro

Non esiste rollback automatico: potrebbe sovrascrivere vendite avvenute dopo l'esecuzione. In caso di errore:

1. disabilitare immediatamente `SHOPIFY_STOCK20_EXECUTE_ENABLED`;
2. non ripetere il batch alla cieca;
3. conservare report before/after e verificare lo stato corrente;
4. preparare un nuovo manifest di rollback per i soli item realmente modificati;
5. applicarlo solo con nuova approvazione, compare-and-swap e idempotency key nuova.

Tracking e policy vanno ripristinati soltanto se il valore precedente è certo e se non ci sono ordini/variazioni inventory intervenuti.

## Gate residui

- manifest privato di massimo 25 target non ancora prodotto;
- export read-only inventory Lovable non ancora fornito;
- `read_locations` non concesso: l'executor non elenca location e non legge `level.location`; interroga direttamente il livello della location fissa già validata. Il dry-run deve comunque confermare `read_inventory` per ogni item;
- Edge Function non distribuita;
- dry-run live non eseguito;
- batch live non autorizzato né eseguito.

**STOCK-20 BATCH EXECUTOR CODE READY / LIVE BATCH NOT YET EXECUTED**
