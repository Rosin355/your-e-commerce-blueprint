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
4. il prodotto Shopify viene risolto dalla corrispondenza SKU esatta in
   `product_sync_csv_products`; per un target variant serve inoltre una sola
   variante Shopify con quello SKU;
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

Le letture live di handle, stato, ID prodotto, prezzo e prezzo barrato sono
best-effort: un errore Shopify non rende inutilizzabile la scheda Admin e non
sovrascrive i dati interni.

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
