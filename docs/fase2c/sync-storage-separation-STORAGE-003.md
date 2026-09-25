# Fase 2C — STORAGE-003: separazione asset pubblici e CSV privati

Data: 25 settembre 2026. Baseline: `9a66d2c0ba131c3101eb12851d0c4cff60a431bf`.
Branch: `codex/sync-storage-separation`.
Stato: proposta documentale e preflight read-only; nessuna modifica runtime,
bucket, policy, oggetto o dato.

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

La PR corrente non realizza il trasferimento. Prima servono inventario live,
conferma dei chiamanti, finestra operativa, copia verificata, rilascio
coordinato dei riferimenti e rimozione esplicita dell'originale pubblico.

## Evidenze disponibili

### Evidenze Codex dal repository

- la migration `20260311162908_4722081e-de83-44cb-802c-93af49fc2514.sql`
  imposta `storage.buckets.public = true` per `sync`;
- la stessa migration crea una policy SELECT per
  `sync/product-images/**`, ma tale policy non limita il download pubblico di
  un bucket già pubblico;
- `src/admin/lib/productSyncEngine.ts` carica `shopify-ready.csv` nella
  radice di `sync` tramite la sessione Admin;
- `_shared/product-sync-processor.ts` usa per default bucket `sync` e path
  `shopify-ready.csv` con service role;
- il flusso frontend corrente analizza lo stesso `File` localmente e invia i
  batch a `process-product-sync`; il valore restituito dall'upload Storage non
  è usato dal pannello. Il processor Storage resta però una dipendenza legacy
  da validare, non da eliminare per supposizione;
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

Per il developer, un'implementazione successiva dovrà aggiornare in modo
atomico i due riferimenti noti: upload browser in `productSyncEngine.ts` e
lettura service-to-server in `_shared/product-sync-processor.ts`. Dovrà inoltre
verificare eventuali chiamanti Lovable non versionati prima di rimuovere il
file pubblico. Nessun fallback deve riscrivere il CSV in `sync`.

Per il designer e il cliente il comportamento visuale non cambia: upload,
progress e messaggi del pannello restano identici; gli URL delle immagini
prodotto non cambiano. Gli errori di trasferimento devono essere mostrati come
blocco dell'import, mai compensati pubblicando di nuovo il file. La privacy
del CSV non deve dipendere da un nome poco prevedibile.

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

## Piano di rollout proposto

1. Congelare temporaneamente i nuovi upload CSV durante la finestra.
2. Creare il nuovo record/path privato per il file attivo usando un'operazione
   amministrativa approvata; verificare hash/dimensione senza esporre dati.
3. Distribuire una modifica runtime dedicata che scriva e legga soltanto il
   path privato e persista il path per job; nessuna modalità full automatica.
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

Gate Codex eseguiti nel worktree isolato il 25 settembre 2026:

| Gate | Esito |
|---|---|
| `npm ci` | PASS, 386 pacchetti; lockfile invariato |
| `deno check` delle tre funzioni pipeline baseline | PASS |
| `npm run typecheck` | PASS |
| `npm run test:catalog` | PASS, 172/172 |
| `npm run build` | PASS, 1.907 moduli |
| `git diff --check` | PASS |

Non esiste codice Storage da eseguire in questa PR. Avvisi preesistenti e non
bloccanti: due dipendenze `@esbuild-kit` deprecate, due classi Tailwind
arbitrarie ambigue e chunk principale superiore a 500 kB.

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

Il rischio è compreso e la soluzione è definita senza interrompere le immagini
pubbliche. Nessun sistema live è stato modificato. La separazione sarà pronta
per l'esecuzione solo dopo il preflight read-only e l'approvazione del piano;
fino alla rimozione controllata del CSV dal bucket pubblico, STORAGE-003 deve
restare indicato come aperto.
