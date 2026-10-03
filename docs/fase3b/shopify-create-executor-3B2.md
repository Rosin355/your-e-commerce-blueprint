# Fase 3B.2 — Executor sicuro per creazione prodotti Shopify

Data: 3 ottobre 2026
Stato: **CANARY LIVE PASS — STORAGE SCALE-OUT CODE READY; FORWARD-FIX NON DEPLOYATA**

Baseline storica: PR #27 integrata con merge `c6fc3b199e5e8dca21f0debb235677abb10e6be0`; il successivo canary `OG_111899` è PASS. La procedura docs-only della PR #28, basata sul vecchio secret manifest, è superata dalla forward-fix Storage di questa PR e non deve essere eseguita. La nuova migration e la nuova revisione Edge descritte sotto non sono state applicate o distribuite da Codex.

## Obiettivo e confini

La fase introduce un executor Admin-only per creare in Shopify famiglie commerciali già classificate `CREATE_VARIABLE_PARENT` + `CREATE_VARIANT` nel manifest privato 3B.1C. Non modifica l'executor stock-20, non pubblica prodotti e non accetta payload prodotto dal frontend.

Lo scale-out stock è concluso: batch 001–013, **306 inventory item verificati a available=20**, tracking attivo e policy `DENY`; zero errori e zero recovery. Le famiglie strutturali escluse sono rimaste intenzionalmente intatte. Il gate EXECUTE stock non è presente e il secret del relativo manifest può essere rimosso dopo la verifica operativa finale.

## Fonte e conteggi

Il repository contiene lo script di ricostruzione 3B.1C e i report, non gli export privati. Il ricalcolo owner-approved eseguito fuori da Git ha classificato 903 famiglie `SAFE_CREATE` sulle 941 `CREATE_VARIABLE_PARENT`; 36 sono state escluse per opzioni ambigue e 2 per media. Gli input privati non sono disponibili nel worktree Codex, quindi il numero reale di varianti delle 903 famiglie deve essere ricalcolato dal builder durante il rilascio e non viene inventato in questa PR.

Per ricomputare e produrre il canary servono in locale, senza versionarli:

1. `manifest-3B1C-shopify-final.csv`, con le colonne prodotte da `build-manifest-3B1C.py`;
2. un export JSON editoriale approvato con `internalProductId`, SKU, titolo, descrizione HTML, fonte `ORIGINAL|MANUAL`, handle, nomi/valori opzione, media HTTPS approvati e campi publish-blocked.

Comando locale:

```bash
node scripts/build-shopify-create-manifest.mjs \
  --manifest /percorso/privato/manifest-3B1C-shopify-final.csv \
  --content /percorso/privato/shopify-create-content.json \
  --output /percorso/privato/shopify-create-canary.json \
  --batch-id shopify-create-3b2-canary-001 \
  --limit 1
```

L'output canary è creato con permessi `0600` e `wx`: non sovrascrive file esistenti. Per lo scale-out, `build-shopify-create-scaleout.mjs` genera directory privata, batch da massimo 10, SHA-256 e `index.json`; `--expected-families 903` rende il conteggio approvato fail-fast. Lo script riporta esattamente parent, varianti, batch e famiglie bloccate.

## Contratto manifest privato

Schema `3B.2-v1`, massimo 10 famiglie per batch. Ogni famiglia contiene:

- identità interna, parent SKU, tipo `variable`, action `CREATE_VARIABLE_PARENT`;
- titolo, descrizione approvata e fonte `ORIGINAL|MANUAL`, handle deterministico;
- mapping Shopify parent nullo, readiness `READY_FOR_SALE`, struttura `CREATE_NEW`;
- option names e varianti con SKU, parent, prezzo, option values e mapping nullo;
- media reali HTTPS marcati `approved=true`;
- publication intent separato (`CREATE_DRAFT` o `READY_TO_PUBLISH`);
- target stock assoluto 20.

Il file versionato `shopify-create-manifest.example.json` è solo sintetico. I manifest cliente completi non sono secret di ambiente e non sono versionati: risiedono nel bucket privato `shopify-create-manifests`, sotto `batches/<batchId>.json`. `index.json` contiene esclusivamente `batchId`, path deterministico, SHA-256, conteggio famiglie e versione schema.

Sono sempre esclusi `OG_393883`, le famiglie `OG_152965`, `OG_891874`, `OG_758263`, gli SKU TEST, i record restructure/review, prezzi o descrizioni mancanti, mapping già presenti, identità ambigue e contenuti AI publish-blocked.

## Architettura e flusso

Endpoint: `shopify-create-batch`.

1. autentica JWT e ruoli `admin|tech_admin` con i moduli Admin V2 condivisi;
2. accetta dal request soltanto `batchId`, `mode`, conferma EXECUTE e `approvalDigest`; manifest, path, SHA e payload prodotto sono rifiutati;
3. scarica con `service_role` il solo `index.json` dal bucket privato fisso `shopify-create-manifests`;
4. verifica che il `batchId` sia approvato e che il path sia esattamente `batches/<batchId>.json`;
5. scarica l'oggetto privato, calcola SHA-256 sui byte e confronta hash e `familyCount` prima di parsare lo schema `3B.2-v1`;
6. deriva `approvalDigest = SHA-256(batchId:manifestSha256:schemaVersion)` e lo restituisce nel `DRY_RUN`;
7. per EXECUTE ricarica indice e manifest, richiede lo stesso `approvalDigest`, la conferma `SHOPIFY_CREATE_EXECUTE` e il gate `SHOPIFY_CREATE_EXECUTE_ENABLED=true`; digest assente o diverso blocca prima di qualsiasi client/write Shopify;
8. il DRY_RUN finale di VERIFY invia lo stesso digest e rileva una sostituzione avvenuta dopo EXECUTE;
9. ricerca prima handle e tutti gli SKU; un'identità ambigua blocca la famiglia;
10. crea il parent in `DRAFT`, le opzioni e le varianti in ordine parent-first;
11. imposta in creazione SKU, tracking, `DENY` e quantità assoluta 20 sulla location `gid://shopify/Location/117678014804`;
12. allega soltanto media approvati e verifica identità e post-condizioni;
13. non esegue mutation di pubblicazione.

Non esiste fallback a `SHOPIFY_CREATE_BATCH_MANIFEST_JSON`: due sorgenti concorrenti renderebbero ambiguo l'oggetto approvato. `MANIFEST_BATCH_NOT_APPROVED`, `MANIFEST_INDEX_INVALID` e `MANIFEST_INTEGRITY_ERROR` fermano la richiesta prima di qualsiasi client Shopify.

Sono riusati il client Shopify Admin condiviso e l'API GraphQL `2026-01`. Lo stock executor esistente non è stato modificato.

## Idempotenza e protezione duplicati

Le migration ledger già applicate hanno creato e ristretto `shopify_creation_ledger`, privata e accessibile in lettura/scrittura solo al `service_role`. Ogni operazione registra batch, SKU, tipo operazione, request key deterministica, hash SHA-256 canonico del payload, ID Shopify, stato e timestamp di verifica.

- stesso request key + stesso hash: replay/reconciliation, senza seconda creazione;
- stesso request key + hash diverso: `IDEMPOTENCY_CONFLICT`;
- reservation concorrente non conclusa: stop item, senza seconda mutation;
- handle/SKU su oggetti incompatibili: `AMBIGUOUS_IDENTITY` o `DUPLICATE_SKU_CONFLICT`;
- parent/variant già esatti: `ALREADY_EXISTS`/`RECONCILED`;
- esito media incerto: stop e riconciliazione manuale, mai upload cieco.

Un errore sistemico arresta il batch; un errore item-level resta isolato e viene riportato. Un successo parziale conserva gli ID già confermati nel ledger.

## Contratto di riconciliazione esatta (R1)

`ALREADY_EXISTS`, la riconciliazione del replay e `READY_TO_PUBLISH` richiedono tutte le post-condizioni seguenti; la sola corrispondenza handle/SKU non è sufficiente:

- parent: handle e titolo esatti, descrizione HTML uguale dopo la sola normalizzazione documentata `CRLF → LF` e trim esterno, stato `DRAFT`;
- opzioni: stessi nomi, stesso ordine e stesso insieme di valori;
- varianti: insieme esatto `expected == actual`, verificato anche tramite `variantsCount` per rilevare elementi oltre la prima pagina; nessuna variante extra viene ignorata o eliminata;
- per ogni variante: SKU e option values esatti, prezzo confrontato deterministicamente in centesimi (`12.5` equivale solo a `12.50`), inventory item presente, `tracked=true`, policy `DENY`, quantità `available=20` sulla location approvata;
- media: stesso conteggio, solo tipo `IMAGE`, alt approvati esatti e stato terminale `READY`; media mancanti, extra o placeholder bloccano la riconciliazione.

Le difformità conservano codici distinti, fra cui `IDENTITY_CONFLICT`, `PRODUCT_STATE_MISMATCH`, `OPTION_STRUCTURE_MISMATCH`, `UNEXPECTED_VARIANTS`, `VARIANT_PRICE_MISMATCH`, `INVENTORY_MISMATCH`, `MEDIA_MISSING`, `MEDIA_SET_MISMATCH` e `MEDIA_PENDING`. Un oggetto simile ma non esatto non viene corretto o riconciliato automaticamente.

## Elaborazione asincrona dei media (R1)

L'upload non viene marcato `APPLIED` finché ogni media non è `READY`. Dopo la mutation, gli ID Shopify restituiti vengono salvati nel ledger mantenendo l'operazione `RESERVED`; il server esegue al massimo cinque letture, distanziate di 750 ms. Non esistono loop illimitati o retry automatici dell'upload.

- `READY`: ledger `APPLIED`/`RECONCILED` e verifica finale del prodotto;
- `FAILED`: ledger `FAILED`, item fallito;
- `UPLOADED`/`PROCESSING` oltre il limite: risultato `MEDIA_PENDING` con codice `MEDIA_PROCESSING_TIMEOUT`, ledger ancora `RESERVED`;
- replay durante `PROCESSING`: riusa i media ID salvati, legge lo stato e prosegue il polling senza creare un secondo media object;
- reservation legacy/incerta senza ID: tenta solo una riconciliazione read-only tramite media già associati e alt approvati; se non è univoca restituisce `MEDIA_RECONCILIATION_REQUIRED`, senza upload.

## Canary live

Il canary `OG_111899` è PASS: un parent `DRAFT`, una variante, stock 20, tracking attivo, policy `DENY`, media `READY` e zero duplicati. Il gate EXECUTE è stato rimosso dopo la verifica. Questo risultato valida le regole business esistenti ma non distribuisce automaticamente la forward-fix Storage.

### Continuità con PR #27 e PR #28

La PR #27 ha introdotto l'executor e la migration ledger; l'handoff docs-only della PR #28 registrava correttamente che gli input 3B.1C sono privati, non presenti nei worktree e non sostituibili con CSV WordPress o fixture sintetiche. Conserva inoltre i criteri canary: un solo parent `CREATE_VARIABLE_PARENT`, 1–2 child `CREATE_VARIANT`, `READY_FOR_SALE`, `CREATE_NEW`, prezzi positivi, contenuti `ORIGINAL|MANUAL`, media HTTPS approvati, mapping nulli e tutte le denylist applicate.

Quel handoff operativo è però superato: ledger e ACL sono stati verificati, il canary è PASS e il vecchio secret `SHOPIFY_CREATE_BATCH_MANIFEST_JSON` non è più una sorgente ammessa dalla forward-fix. Non va riapplicata la migration ledger né ripetuto il canary. Le verifiche ACL read-only restano valide per audit (`RLS=true`; nessun privilegio `anon|authenticated`; `service_role` solo `SELECT|INSERT|UPDATE`, senza `DELETE|TRUNCATE|REFERENCES|TRIGGER`). Il rollout corrente parte dalla migration Storage, dall'upload privato e dal DRY_RUN con pinning descritti sotto.

## Scale-out controllato e resume

Con 903 famiglie, batch da massimo 10 producono **91 batch**. Il numero reale di varianti viene stampato dal builder sugli export privati. Il workflow `run-shopify-create-scaleout.mjs` elabora sequenzialmente ogni `batchId` già presente nell'indice:

1. DRY_RUN e acquisizione di `approvalDigest` + `manifestSha256`;
2. stop se `FAILED`, `BLOCKED`, `MEDIA_PENDING`, conflitto di identità/idempotenza o errore sistemico sono diversi da zero;
3. EXECUTE una volta soltanto durante la finestra autorizzata, inviando esattamente il digest del DRY_RUN;
4. nuovo DRY_RUN di VERIFY con lo stesso digest, che deve riconciliare gli oggetti già creati senza mutation;
5. batch successivo.

`--start-batch` riparte da un batch preciso. Ledger e riconciliazione esatta rendono sicuro il replay di batch già completati; non viene eseguito rollback distruttivo. Un safe skip item-level può proseguire, mentre errori sistemici, di integrità o duplicate protection fermano l'intera esecuzione.

La finestra operativa usa una sola attivazione temporanea di `SHOPIFY_CREATE_EXECUTE_ENABLED=true`. Il controllo Lovable deve rimuovere o impostare `false` il gate in un blocco `finally`, sia a completamento sia al primo stop. La funzione non può eseguire batch assenti dall'indice privato anche quando il gate è attivo.

## Rollback sicuro

Non esiste rollback automatico distruttivo di oggetti Shopify creati. In caso di errore:

- disabilitare il gate EXECUTE e fermare il batch;
- conservare ledger e report per riconciliare gli ID certi;
- lasciare il prodotto in DRAFT;
- correggere manifest/codice con nuova revisione;
- cancellazioni o cambi di mapping richiedono un task Shopify separato e approvazione esplicita.

Ledger, bucket, indice e manifest non vanno eliminati durante un incidente: sono evidenze necessarie per idempotenza, resume e recovery. Il rollback applicativo consiste nel disabilitare il gate e ripristinare la precedente revisione dell'Edge Function; i prodotti già creati restano `DRAFT`.

## Gate residui

- eseguire il builder sugli input privati e registrare conteggi reali di parent e varianti;
- applicare la migration `20261003205811_create_shopify_create_manifests_bucket.sql` e verificare bucket privato/policy restrittiva;
- caricare i batch con upsert disabilitato e `index.json` per ultimo;
- deploy della sola forward-fix `shopify-create-batch` autorizzato e verificato;
- token Shopify con scope minimi verificati;
- DRY_RUN del primo batch Storage a zero mutation approvato;
- finestra scale-out EXECUTE separatamente autorizzata e gate rimosso nel `finally`.

Il merge della PR #27 e il canary live chiudono i gate storici dell'executor singolo. Non chiudono i gate migration Storage, deploy della forward-fix, upload privato, DRY_RUN Storage o finestra EXECUTE scale-out.
