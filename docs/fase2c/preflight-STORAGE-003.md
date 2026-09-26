# STORAGE-003 — Preflight live read-only e piano di implementazione

Data: 26 settembre 2026. Base richiesta `a3650d66`; HEAD locale `d1a6ad6`
(contiene `a3650d6`; differenze successive solo docs e file Lovable
auto-generato, nessun codice Storage). Nessuna modifica live, copia, delete,
job, import, AI, Shopify, migration o deploy.

## 1. Risultati preflight (query di `sync-storage-preflight-readonly.sql`)

Eseguite come SELECT singole; nessun contenuto letto, nessun URL creato,
nessun nome completo di oggetto privato registrato.

### Bucket
| Bucket | public | file_size_limit | allowed_mime_types |
|---|---|---|---|
| csv-pipeline | false | ereditato | nessun vincolo |
| sync | **true** | ereditato | nessun vincolo |

### Inventario aggregato
| Bucket | Namespace | Est. | Oggetti | Byte |
|---|---|---|---|---|
| csv-pipeline | backups/ | gz | 2 | 15.065.574 |
| csv-pipeline | backups/ | json | 3 | 1.281.824 |
| csv-pipeline | backups/ | md | 1 | 15.007 |
| csv-pipeline | jobs/ | csv | 2 | 23.713.323 |
| sync | `<root>` | **csv** | **1** | 1.336.246 |
| sync | product-images/ | png | 6 | 8.493.941 |

Conclusione: in `sync` esiste esattamente un CSV fuori da `product-images/`
(il noto `shopify-ready.csv`, ~1,3 MB). Nessun altro namespace o tipo.
Poiché il bucket è pubblico, il file resta scaricabile da chi conosce il
percorso: **esposizione attiva confermata**.

### Policy su storage.objects
- csv-pipeline: SELECT/INSERT/DELETE solo `authenticated` + `has_role admin`.
  Nessuna UPDATE (gli upsert su path esistenti fallirebbero: usare path
  univoci per job, coerente con il target).
- sync: SELECT/INSERT/UPDATE/DELETE Admin; `service_role` ALL; SELECT
  `public` limitato a `product-images/**`. La policy pubblica non limita il
  canale pubblico del bucket (flag bucket-level).

### GRANT
`information_schema.role_table_grants` non restituisce righe al ruolo
esecutore; `has_table_privilege` conferma SELECT per anon e INSERT per
authenticated (grant standard Storage, filtrati dalle policy RLS).

### Invarianti
products 2.706, current values 24.466, product_sync_jobs 36 (5
pending/processing orfani di marzo, nessun processo li riprende),
pipeline_jobs 1. Nessuna estensione cron (verificato in 2C.0).

## 2. Chiamanti ricostruiti

| Chiamante | Operazione | Stato |
|---|---|---|
| `src/admin/lib/productSyncEngine.ts` `uploadSyncCsv` | upload `sync/shopify-ready.csv` upsert, sessione Admin | **attivo**, unico scrittore |
| `ProductSyncPanel` | analizza il `File` in locale e invia batch a `process-product-sync`; ignora il path restituito | attivo, non legge dallo Storage |
| `process-product-sync` | usa `source_file` solo come etichetta (default `shopify-ready.csv`) | nessun download |
| `_shared/product-sync-processor.ts` | download `SYNC_CSV_BUCKET`/`SYNC_CSV_PATH` (default `sync`/`shopify-ready.csv`) | **non importato da nessuna funzione**: codice morto |
| `csv-upload-url`, `storage-signed-url` | accettano `sync` e `csv-pipeline`, Admin-only dopo PR #8/#9 | da restringere `sync` alle immagini |
| `generate-product-images` | scrive `sync/product-images/**` | legittimo, invariato |

Secret `SYNC_CSV_BUCKET` e `SYNC_CSV_PATH`: **non configurati** (i default
valgono solo nel processor non importato). Nessun cron, webhook o chiamante
esterno versionato; nessun job attivo.

## 3. Implementazione proposta (PR dedicata, non eseguita)

1. `uploadSyncCsv(file, jobId)` scrive in
   `csv-pipeline/product-sync/jobs/<job-id>/input.csv`, `upsert: false`;
   in caso di errore blocca l'import, **mai** fallback su `sync`.
2. Ordine nel pannello: `start-product-sync` crea il job → upload con il
   `job_id` → path salvato in `report_json.source_path` (nessuna migration).
3. `process-product-sync`: `source_file` diventa etichetta derivata dal job,
   non dal body.
4. Processor legacy: rimuovere o allineare a `csv-pipeline` + path del job,
   con validazione prefisso `product-sync/jobs/<uuid>/`; eliminare i default
   `sync`/`shopify-ready.csv`.
5. `csv-upload-url` e `storage-signed-url`: per `sync` consentire solo
   `product-images/**`.
6. Test offline: path per job, nessun riferimento runtime a
   `shopify-ready.csv` o CSV su `sync`, prefissi vietati respinti.

Nessuna policy nuova: le policy Admin di `csv-pipeline` coprono già
INSERT/SELECT/DELETE sul nuovo namespace.

## 4. Backup, hash e trasferimento del file esistente (gate A)

- Copia amministrativa (service role, lato server) di `sync/shopify-ready.csv`
  in `csv-pipeline/backups/storage-003/<data>/shopify-ready.csv` +
  `manifest.json` con SHA256 e dimensione (attesa 1.336.246 byte).
- Rilettura della copia e confronto SHA256; nel report solo hash abbreviato.
- Nessuna stampa del contenuto, nessun URL firmato o pubblico.

## 5. Smoke test post-deploy (gate B)

- anon: immagine `product-images/` risponde 200; path CSV in
  `csv-pipeline` negato; firma per `sync/<non immagine>` respinta.
- JWT invalido / chiave pubblica: 401.
- Admin: upload CSV sintetico in path di un job di test in dry-run, senza
  AI, import live o Shopify (richiede autorizzazione specifica).
- Non Admin: coperto da test offline (unico utente reale è Admin).
- Invarianti: 2.706 / 24.466 / job invariati salvo job di test autorizzato.

## 6. Eliminazione dell'originale (gate C, separato)

Richiede approvazione esplicita dopo: backup verificato, deploy e smoke
test verdi, nessun chiamante residuo. Delete del solo oggetto
`sync/shopify-ready.csv`; verifica che `sync` contenga soltanto
`product-images/**` (6 png) e che l'URL pubblico del CSV risponda 404/400.
STORAGE-003 si chiude solo qui.

## 7. Rollback

- Codice: forward-fix; non ripristinare mai scritture CSV su `sync`.
- Dati: prima del gate C l'originale esiste ancora; dopo, restore solo in
  `csv-pipeline` dalla copia con SHA256 verificato.
- Immagini: nessun rollback necessario, non toccate.

## Per il cliente

Oggi un file di catalogo (~1,3 MB) è raggiungibile pubblicamente da chi ne
conosce l'indirizzo. Le foto prodotto sono separate e restano pubbliche. Il
piano sposta il file in un'area privata, un file per ogni sincronizzazione,
senza cambiare l'aspetto del pannello. Il rischio si chiude solo quando,
con tua approvazione, cancelliamo il file pubblico originale.

## Stato

Preflight completato, pronto per: PR di implementazione → gate A (backup)
→ gate B (deploy + smoke) → gate C (delete). Nessuno eseguito.
