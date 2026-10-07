# Smart Product Sync — architettura corrente

## Admin V2: sincronizzazione esplicita a campo singolo (6 ottobre 2026)

Questa sezione descrive codice in PR, non un deploy. Non sono state eseguite
scritture Shopify live.

Il percorso Admin V2 è separato dallo Smart Sync CSV descritto più avanti:

1. il browser invia `productId`, `fieldKey`, `expectedVersion` e una chiave di
   idempotenza; non può inviare target, namespace o chiavi metafield;
2. `product-admin-api` verifica JWT e ruoli dal database; la sync richiede
   `admin` o `tech_admin` e la feature flag dedicata;
3. la definizione viene caricata da `product_field_definitions`; il parser
   accetta soltanto target core, SEO, variant o namespace `custom` presenti
   nell’allowlist applicativa;
4. il prodotto Shopify viene risolto dalla corrispondenza SKU esatta nella
   fonte runtime canonica `product_sync_csv_products.shopify_product_id`; non
   esiste fallback runtime verso il ledger 3B.2/3B.4. Per un target variant
   serve inoltre una sola variante Shopify con quello SKU;
5. il valore corrente e `expectedVersion` vengono verificati prima della
   chiamata esterna; un salvataggio Admin di un campo pubblicabile imposta
   `publish_state=pending_publish` nella stessa transazione DB;
6. il backend legge il valore Shopify corrente e blocca la write se differisce
   dall’ultima baseline verificata (`STATE_DRIFT`);
7. viene costruita una mutation con un solo attributo o metafield; nessun altro
   campo prodotto è incluso;
8. il backend rilegge Shopify. Solo una corrispondenza deterministica porta a
   `published/SYNCED`; ogni esito inatteso produce `failed/SYNC_ERROR`;
9. `product_field_history` e `product_admin_command_log` registrano esito e
   idempotenza senza incrementare la versione editoriale durante la sola sync.

### Creazione controllata del primo valore

L’assenza di una riga in `product_current_values` non abilita una creazione
generica. Con `expectedVersion=0`, la RPC accetta soltanto `update_field` e una
delle chiavi server-side `periodo_di_fioritura`,
`periodo_di_messa_a_dimora`, `periodo_di_raccolta`,
`periodo_ottimale_di_potatura`, `difficolta_di_coltivazione`; il percorso
`manual_only` preesistente resta separato e riservato agli amministratori.

Ruolo, definizione editabile/applicabile, tipo nativo, enum, unicità dei mesi e
assenza della riga vengono ricontrollati nella transazione. L’insert usa il
vincolo univoco prodotto/campo: in una race una sola richiesta crea versione 1
e history 0→1, mentre le altre ricevono `VERSION_CONFLICT` senza overwrite.
Il trigger di stato imposta `pending_publish` soltanto per un campo pubblicabile
con mapping supportato; nessuna parte di questo salvataggio chiama Shopify.

Le letture live di handle, stato, ID prodotto, prezzo e prezzo barrato sono
best-effort: un errore Shopify non rende inutilizzabile la scheda Admin e non
sovrascrive i dati interni.

### Riconciliazione una tantum degli ID prodotto

`scripts/admin-shopify-id-backfill.sql` separa nettamente i due ruoli:

- `product_sync_csv_products.shopify_product_id` è la sorgente canonica usata
  da Admin V2 durante ogni richiesta runtime;
- `shopify_creation_ledger` è evidenza privata di creazione/pubblicazione e
  viene consultato solo dal controlled backfill o per audit;
- il browser, la API Admin e il percorso Shopify field sync non leggono il
  ledger come fallback e non possono fornire SKU o Product GID sostitutivi.

Il dry-run classifica ogni ID mancante in `SAFE_BACKFILL`, `CONFLICT` o
`UNMATCHED`. Sono ammessi soltanto GID `gid://shopify/Product/<numero>` con
prova verificata, SKU esatto e mapping univoco. Una variation deve avere
relazione canonica col parent, `parent_sku` coerente, evidenza
`CREATE_VARIANT` e un Product GID uguale a quello verificato del parent. Titolo,
handle e somiglianze testuali non partecipano mai alla risoluzione.

L'execute aggiorna esclusivamente ID nulli già classificati safe, non crea
righe, non produce history e non sovrascrive ID esistenti. La transazione
verifica hash e conteggi prima del commit; il replay non trova più target e
deve concludersi con zero write. Il codice non effettua chiamate Shopify e non
viene eseguito automaticamente da migration o deploy.

### Controlli operativi

- `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` è `false` per default;
- la migration aggiunge solo metadati di verifica ed RPC/trigger; non avvia job;
- nessun token, target Shopify o payload arbitrario è accettato dal client;
- merge, migration, deploy Edge, attivazione flag e smoke live sono gate distinti.

Aggiornato: 26 settembre 2026. Questo documento descrive il codice; non
attesta un deploy né operazioni su dati live.

## Componenti attivi

- UI: `src/admin/components/ProductSyncPanel.tsx`;
- client e parser locale: `src/admin/lib/productSyncEngine.ts`;
- ordinamento testabile del flusso: `src/admin/lib/smartSyncFlow.ts`;
- creazione job: `supabase/functions/start-product-sync/index.ts`;
- registrazione sorgente e batch: `supabase/functions/process-product-sync/index.ts`;
- persistenza: `_shared/job-repo.ts` e `_shared/product-catalog-repo.ts`.

Il precedente `_shared/product-sync-processor.ts` non era importato da alcuna
funzione ed è stato rimosso. Le variabili legacy `SYNC_CSV_BUCKET` e
`SYNC_CSV_PATH` non fanno più parte di questo flusso.

## Flusso Smart Sync

1. L'Admin seleziona un CSV; parsing e diagnostica avvengono sul `File`
   locale, senza upload anticipato.
2. `start-product-sync` crea un job con
   `report_json.source_state=awaiting_upload`.
3. Il browser carica il file con `upsert:false` nel bucket privato
   `csv-pipeline`, path `product-sync/jobs/<job-id>/input.csv`.
4. `process-product-sync`, azione `register_source`, accetta esclusivamente
   il path esatto derivato dal job e registra `source_path` nel report JSON.
5. Solo dopo la registrazione, il browser invia i batch ottenuti dal file
   locale. Un job nuovo ancora `awaiting_upload` è rifiutato con HTTP 409.
6. I report legacy senza `source_state` restano compatibili e non richiedono
   backfill.

Un errore di upload interrompe il flusso: non parte alcun batch e non esiste
fallback verso il bucket pubblico `sync`.

## Confini Storage

- `csv-pipeline/product-sync/jobs/**`: snapshot CSV privati, accesso secondo
  le policy Admin esistenti del bucket;
- `csv-pipeline/jobs/**`: pipeline Woo invariata;
- `sync/product-images/**`: immagini pubbliche invariate;
- ogni altro percorso `sync`: rifiutato dalle funzioni di firma/upload.

Nessuna migration o modifica alle policy è inclusa nell'implementazione.
Backup, deploy, smoke live ed eliminazione del vecchio oggetto pubblico sono
gate operativi separati descritti nella documentazione STORAGE-003.

## Live deploy Admin V2 client-safe sync — 2026-10-06 (main@889d6ce)
- Migration `20261006143000_admin_client_safe_field_sync` applicata una volta: 4 colonne `shopify_*` presenti, periodi = multiselect/array (12 mesi), difficoltà = select Facile/Media/Difficile, trigger PENDING_SYNC e RPC `admin_complete_product_field_sync` (solo service_role). 24.467 valori invariati (hash identico prima/dopo). PASS.
- Deploy della sola `product-admin-api`: PASS. `PRODUCT_ADMIN_SHOPIFY_SYNC_ENABLED` assente = OFF.
- Pubblicazione frontend richiesta dalla stessa revisione.
- Smoke test autenticato e canary: NON eseguiti — serve un account admin per la sessione di test e un prodotto canary approvato esplicitamente. Nessuna scrittura Shopify effettuata.
- Stato: STOPPED in attesa di account di test + prodotto canary.
