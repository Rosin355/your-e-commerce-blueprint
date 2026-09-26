# Fase 2C — STORAGE-003: separazione asset pubblici e CSV privati

Data: 26 settembre 2026. Baseline di implementazione: `fa87c83a` (`origin/main`).
Branch: `codex/storage-003-smart-sync`.
Stato: implementazione locale pronta per revisione; nessun deploy, job,
import, modifica bucket/policy, copia o eliminazione di oggetti live.

## Decisione proposta

Mantenere `sync` pubblico esclusivamente per le immagini prodotto in
`product-images/**` e trasferire i CSV operativi, incluso
`shopify-ready.csv`, nel bucket privato già esistente `csv-pipeline`, sotto
un namespace dedicato `product-sync/**`.

Il flag `public` di Supabase Storage si applica al bucket, non a una singola
cartella. Finché `sync` è pubblico, un oggetto noto al suo interno è servibile
dal canale pubblico anche se le policy SELECT nominano soltanto
`product-images/**`. Per questo non è sufficiente aggiungere un'altra policy
su `shopify-ready.csv`. Rendere immediatamente privato l'intero bucket è
altrettanto scorretto: interromperebbe gli URL pubblici delle immagini
prodotto. La separazione fisica dei tipi di file è quindi necessaria.

La PR #10 non realizza il trasferimento. Prima servono inventario live,
conferma dei chiamanti, finestra operativa, copia verificata, rilascio
coordinato dei riferimenti e rimozione esplicita dell'originale pubblico.

## Evidenze disponibili

### Evidenze Codex dal repository

- la migration `20260311162908_4722081e-de83-44cb-802c-93af49fc2514.sql`
  imposta `storage.buckets.public = true` per `sync`;
- la stessa migration crea una policy SELECT per
  `sync/product-images/**`, ma tale policy non limita il download pubblico di
  un bucket già pubblico;
- prima di questa implementazione, `src/admin/lib/productSyncEngine.ts`
  caricava un CSV nella radice di `sync`; ora crea prima il job e carica uno
  snapshot univoco in `csv-pipeline/product-sync/jobs/<job-id>/input.csv`;
- `_shared/product-sync-processor.ts` non aveva chiamanti runtime ed è stato
  rimosso; non restano default applicativi verso il vecchio CSV pubblico;
- il flusso frontend analizza il `File` localmente, crea il job, carica lo
  snapshot privato, registra il path e solo dopo invia i batch a
  `process-product-sync`;
- `WooPipelinePanel` e le tre funzioni STORAGE-004 usano già il bucket
  privato `csv-pipeline` per input e output dei job;
- nessun codice versionato richiede che i CSV siano pubblici.

### Verifiche precedentemente riportate, non ripetute da Codex

`docs/fase2c/preflight-pr8-storage-signed-url.md` registra che, al preflight
Lovable del 25 settembre 2026, `sync` risultava pubblico e conteneva sei
oggetti sotto `product-images` e un `shopify-ready.csv` in radice; il bucket
`csv-pipeline` risultava privato. Questa è evidenza riportata dal preflight,
non una nuova lettura live in questo task. Il file non contiene URL firmati o
contenuti degli oggetti.

## Rischio

Classificazione: **Alta** per riservatezza, condizionata alla sensibilità del
CSV e alla conoscibilità del percorso. Un visitatore non deve autenticarsi
per scaricare un oggetto da un bucket pubblico conoscendone l'URL. Un CSV di
sincronizzazione può contenere catalogo non ancora pubblicato, prezzi, stato,
identificatori o metadati operativi. La patch di `storage-signed-url` e
l'autorizzazione Admin delle funzioni non chiudono questo canale pubblico.

Non è stato scaricato alcun CSV, generato alcun URL o verificato alcun dato
privato. Il contenuto effettivo e l'eventuale accesso storico vanno trattati
con il processo privacy/incident appropriato, senza copiare dati nei report.

## Architettura target minima

| Contenuto | Bucket/path target | Accesso |
|---|---|---|
| immagini prodotto pubbliche | `sync/product-images/**` | pubblico invariato |
| input sincronizzazione catalogo | `csv-pipeline/product-sync/**` | Admin e service role |
| input/output pipeline Woo | `csv-pipeline/jobs/**` | Admin e service role, invariato |
| backup o export riservati | bucket privato dedicato, non `sync` | solo ruoli esplicitamente autorizzati |

Il riuso di `csv-pipeline` è l'opzione minima perché bucket e policy Admin
esistono già. Un nuovo bucket `sync-private` è giustificato solo se retention,
ownership, audit o dimensioni richiedono separazione operativa ulteriore;
richiederebbe una migration e un'approvazione distinta.

Per evitare collisioni e sovrascritture si raccomanda un path per esecuzione,
ad esempio `product-sync/jobs/<job-id>/input.csv`, con riferimento persistito
nel job. Conservare per sempre un unico path `product-sync/shopify-ready.csv`
è compatibile con il comportamento attuale ma mantiene il rischio di race e
riduce la tracciabilità; non è la scelta target.

## Impatto developer e designer

Per il developer, il flusso implementato è: creazione job, upload privato,
registrazione del path in `product_sync_jobs.report_json`, quindi invio dei
batch letti dal `File` locale. `source_state=awaiting_upload` impedisce al
server di elaborare un nuovo job prima della registrazione; i job legacy che
non hanno tale proprietà restano processabili. Nessun fallback riscrive CSV
in `sync`.

Per il designer e il cliente il flusso resta nello stesso pannello: la
selezione è ora esplicitamente indicata come verifica locale e l'upload parte
solo dopo la creazione del job. Gli URL delle immagini prodotto non cambiano.
Gli errori di trasferimento bloccano l'import e non sono compensati
pubblicando di nuovo il file. La privacy del CSV non dipende dal nome.

## Preflight read-only

Il file `sync-storage-preflight-readonly.sql` inventaria metadati aggregati,
policy e grant per `sync` e `csv-pipeline` dentro una transazione read-only.
Non legge il contenuto degli oggetti, non crea URL e non modifica lo stato.

- [ ] Eseguire le query con un ruolo autorizzato e salvare solo conteggi
  aggregati, mai nomi completi o metadata privati.
- [ ] Confermare flag pubblico, MIME consentiti, limiti, policy e grant live.
- [ ] Confermare tutti i namespace presenti in `sync`; classificare ogni
  oggetto non immagine prima della migrazione.
- [ ] Cercare chiamanti esterni, cron, webhook e configurazioni
  `SYNC_CSV_BUCKET`/`SYNC_CSV_PATH` nel canale Lovable autorizzato.
- [ ] Confermare retention, ownership e cancellazione per `csv-pipeline`.
- [ ] Verificare che le immagini pubbliche siano referenziate solo sotto
  `product-images/**` e che nessun CSV sia un asset storefront legittimo.

## Piano di rollout controllato

1. Congelare temporaneamente i nuovi upload CSV durante la finestra.
2. Creare il nuovo record/path privato per il file attivo usando un'operazione
   amministrativa approvata; verificare hash/dimensione senza esporre dati.
3. Distribuire in modo coordinato frontend, `start-product-sync`,
   `process-product-sync`, `csv-upload-url` e `storage-signed-url`; nessuna
   modalità full automatica.
4. Eseguire dry-run con fixture sintetica, poi smoke Admin autorizzato senza
   AI, import live o Shopify sync.
5. Verificare che le immagini pubbliche continuino a rispondere e che il CSV
   privato sia negato ad anon e non Admin.
6. Eliminare l'originale `sync/shopify-ready.csv` solo con approvazione
   esplicita, backup verificato e finestra di rollback; confermare che in
   `sync` restino esclusivamente asset pubblici previsti.
7. Monitorare errori aggregati senza loggare path, JWT, CSV o URL firmati.

La chiusura di STORAGE-003 avviene al punto 6, non al solo deploy del codice:
finché l'originale rimane nel bucket pubblico, l'esposizione resta attiva.

## Test di accettazione della futura implementazione

- anon: immagine prodotto pubblica disponibile; CSV privato non disponibile;
- non Admin: stesso comportamento, senza accesso trasversale ai CSV;
- Admin: upload e dry-run consentiti sul path privato;
- service-to-server autorizzato: lettura del solo path persistito nel job;
- path/bucket vietato e file assente: fail closed senza dettagli sensibili;
- concorrenza: due job usano path distinti e non si sovrascrivono;
- regressione: nessun riferimento runtime a `sync/shopify-ready.csv`;
- invarianti: nessun cambio agli URL `sync/product-images/**`, nessun import,
  AI o Shopify sync provocato dal rilascio.

I risultati finali dei gate Codex per questa implementazione sono registrati
in `implementation-STORAGE-003.md`.

| Gate | Esito |
|---|---|
| `npm ci` | PASS, 386 pacchetti; lockfile invariato |
| `deno check` delle tre funzioni pipeline baseline | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 200/200 |
| `npm run build` | PASS, 1.908 moduli |
| `git diff --check` | PASS |

Questa PR contiene codice runtime ma non esegue operazioni live. Gli avvisi
preesistenti di build non autorizzano interventi fuori scope.

## Rollback sicuro

Non ripristinare il CSV nel bucket pubblico. Se il nuovo percorso privato non
funziona, sospendere upload/import e applicare un forward-fix sul lettore o
sul riferimento del job. Conservare temporaneamente la copia privata
verificata e gli identificatori necessari al recupero. Le immagini restano
in `sync`, quindi non richiedono rollback.

Qualunque cancellazione dell'originale deve essere preceduta da backup e hash
verificati. Questa PR non autorizza né esegue copie, delete, policy, migration
o deploy.

## Stato per il cliente

La modifica applicativa è pronta per revisione e mantiene pubbliche le foto
prodotto. Nessun sistema live è stato modificato. STORAGE-003 resta aperto:
serve completare gate A, gate B e infine la rimozione esplicita del solo CSV
pubblico al gate C.
