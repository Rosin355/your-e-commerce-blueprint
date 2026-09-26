# Smart Product Sync — architettura corrente

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
