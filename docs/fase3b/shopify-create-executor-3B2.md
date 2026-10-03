# Fase 3B.2 — Executor sicuro per creazione prodotti Shopify

Data: 3 ottobre 2026
Stato: **CODE FIRST — NESSUN DEPLOY, NESSUNA WRITE SHOPIFY LIVE**

## Obiettivo e confini

La fase introduce un executor Admin-only per creare in Shopify famiglie commerciali già classificate `CREATE_VARIABLE_PARENT` + `CREATE_VARIANT` nel manifest privato 3B.1C. Non modifica l'executor stock-20, non pubblica prodotti e non accetta payload prodotto dal frontend.

Lo scale-out stock è concluso: batch 001–013, **306 inventory item verificati a available=20**, tracking attivo e policy `DENY`; zero errori e zero recovery. Le famiglie strutturali escluse sono rimaste intenzionalmente intatte. Il gate EXECUTE stock non è presente e il secret del relativo manifest può essere rimosso dopo la verifica operativa finale.

## Fonte e conteggi

Il repository contiene lo script di ricostruzione 3B.1C e il report storico, non il CSV privato. I numeri storici sono 941 parent `CREATE_VARIABLE_PARENT`, 1.006 righe `CREATE_VARIANT`, 300 `RESTRUCTURE_REQUIRED` e 146 `SKIP`, ma **non sono stati dichiarati come ricomputati** in questa fase.

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

L'output è creato con permessi `0600` e `wx`: non sovrascrive file esistenti. Lo script riporta i conteggi ricalcolati e blocca una famiglia se contenuti, prezzo, struttura, identità, opzioni o media non soddisfano il contratto.

## Contratto manifest privato

Schema `3B.2-v1`, massimo 10 famiglie per batch. Ogni famiglia contiene:

- identità interna, parent SKU, tipo `variable`, action `CREATE_VARIABLE_PARENT`;
- titolo, descrizione approvata e fonte `ORIGINAL|MANUAL`, handle deterministico;
- mapping Shopify parent nullo, readiness `READY_FOR_SALE`, struttura `CREATE_NEW`;
- option names e varianti con SKU, parent, prezzo, option values e mapping nullo;
- media reali HTTPS marcati `approved=true`;
- publication intent separato (`CREATE_DRAFT` o `READY_TO_PUBLISH`);
- target stock assoluto 20.

Il file versionato `shopify-create-manifest.example.json` è solo sintetico. Il manifest cliente completo resta un secret server-side `SHOPIFY_CREATE_BATCH_MANIFEST_JSON`.

Sono sempre esclusi `OG_393883`, le famiglie `OG_152965`, `OG_891874`, `OG_758263`, gli SKU TEST, i record restructure/review, prezzi o descrizioni mancanti, mapping già presenti, identità ambigue e contenuti AI publish-blocked.

## Architettura e flusso

Endpoint: `shopify-create-batch`.

1. autentica JWT e ruoli `admin|tech_admin` con i moduli Admin V2 condivisi;
2. carica esclusivamente il manifest server-side e verifica il `batchId`;
3. parte in `DRY_RUN` se la modalità non è esplicitamente `EXECUTE`;
4. per EXECUTE richiede conferma `SHOPIFY_CREATE_EXECUTE` e gate `SHOPIFY_CREATE_EXECUTE_ENABLED=true`;
5. ricerca prima handle e tutti gli SKU; un'identità ambigua blocca la famiglia;
6. crea il parent in `DRAFT`, le opzioni e le varianti in ordine parent-first;
7. imposta in creazione SKU, tracking, `DENY` e quantità assoluta 20 sulla location `gid://shopify/Location/117678014804`;
8. allega soltanto media approvati e verifica identità e post-condizioni;
9. non esegue mutation di pubblicazione.

Sono riusati il client Shopify Admin condiviso e l'API GraphQL `2026-01`. Lo stock executor esistente non è stato modificato.

## Idempotenza e protezione duplicati

La migration proposta crea `shopify_creation_ledger`, privata e accessibile in lettura/scrittura solo al `service_role`. Ogni operazione registra batch, SKU, tipo operazione, request key deterministica, hash SHA-256 canonico del payload, ID Shopify, stato e timestamp di verifica.

- stesso request key + stesso hash: replay/reconciliation, senza seconda creazione;
- stesso request key + hash diverso: `IDEMPOTENCY_CONFLICT`;
- reservation concorrente non conclusa: stop item, senza seconda mutation;
- handle/SKU su oggetti incompatibili: `AMBIGUOUS_IDENTITY` o `DUPLICATE_SKU_CONFLICT`;
- parent/variant già esatti: `ALREADY_EXISTS`/`RECONCILED`;
- esito media incerto: stop e riconciliazione manuale, mai upload cieco.

Un errore sistemico arresta il batch; un errore item-level resta isolato e viene riportato. Un successo parziale conserva gli ID già confermati nel ledger.

## Canary live futuro

Il candidato deve essere scelto dal manifest privato ricalcolato: una famiglia `CREATE_NEW` pulita, con un parent e 1–2 varianti, contenuti originali/manuali completi, prezzo valido, media reale approvato, nessun mapping esistente e nessuna appartenenza alle famiglie escluse.

Procedura controllata, non eseguita:

1. applicare una sola volta la migration ledger;
2. configurare il manifest canary privato e lasciare `SHOPIFY_CREATE_EXECUTE_ENABLED=false`;
3. distribuire solo `shopify-create-batch` dalla stessa revisione;
4. eseguire DRY_RUN e ottenere una sola famiglia `PLANNED`, zero mutation;
5. verificare nuovamente assenza di identità Shopify e approvare gli old→new;
6. aprire una finestra controllata, attivare temporaneamente il gate ed eseguire un solo EXECUTE;
7. disattivare immediatamente il gate;
8. verificare esattamente un parent, le sole varianti attese, titolo/descrizione/prezzi/media, mapping, stock 20, tracked=true, `DENY` e assenza di duplicati;
9. non pubblicare: `CREATED`/`READY_TO_PUBLISH` resta separato da `PUBLISHED`.

## Rollback sicuro

Non esiste rollback automatico distruttivo di oggetti Shopify creati. In caso di errore:

- disabilitare il gate EXECUTE e fermare il batch;
- conservare ledger e report per riconciliare gli ID certi;
- lasciare il prodotto in DRAFT;
- correggere manifest/codice con nuova revisione;
- cancellazioni o cambi di mapping richiedono un task Shopify separato e approvazione esplicita.

La migration può essere ritirata prima dell'uso live. Dopo la prima applicazione non va rimossa durante un incidente: il ledger è evidenza di idempotenza e recovery.

## Gate residui

- input privati 3B.1C disponibili e hashati;
- conteggi ricalcolati, non solo storici;
- candidato canary nominato e revisionato;
- migration e deploy autorizzati;
- token Shopify con scope minimi verificati;
- DRY_RUN live a zero mutation approvato;
- approvazione esplicita separata per EXECUTE.
