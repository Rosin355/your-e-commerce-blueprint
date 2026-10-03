# Fase 3B.2 — Executor sicuro per creazione prodotti Shopify

Data: 3 ottobre 2026
Stato: **PR #27 MERGED — LIVE CANARY PENDING; NESSUN DEPLOY, NESSUNA WRITE SHOPIFY LIVE**

Baseline applicativa: `main@c6fc3b199e5e8dca21f0debb235677abb10e6be0` (merge PR #27). La migration e la Edge Function descritte sotto sono versionate ma non sono state applicate o distribuite da Codex.

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

## Canary live futuro

Il candidato deve essere scelto dal manifest privato ricalcolato: una famiglia `CREATE_NEW` pulita, con un parent e 1–2 varianti, contenuti originali/manuali completi, prezzo valido, media reale approvato, nessun mapping esistente e nessuna appartenenza alle famiglie escluse.

Gli input privati reali 3B.1C non sono presenti nel repository né nei worktree locali verificati dopo il merge. Di conseguenza non è stato nominato alcuno SKU e non è stato generato un manifest canary locale. Lovable deve usare in ambiente privato `manifest-3B1C-shopify-final.csv` e l'export editoriale approvato richiesto dal builder; non sono sostituibili con i CSV WordPress o con la fixture sintetica versionata.

### Handoff Lovable — Gate live DRY_RUN

Eseguire i passi nell'ordine seguente e fermarsi al primo esito non conforme:

1. fissare la revisione `c6fc3b199e5e8dca21f0debb235677abb10e6be0` e verificare che il tree contenga `20261003163930_create_shopify_creation_ledger.sql` e `shopify-create-batch`;
2. dai due input privati 3B.1C generare un nuovo file `0600`, fuori da Git, con `scripts/build-shopify-create-manifest.mjs --limit 1`;
3. accettare la sola famiglia che abbia esattamente un parent `CREATE_VARIABLE_PARENT`, 1–2 child `CREATE_VARIANT`, `READY_FOR_SALE`, `CREATE_NEW`, prezzi positivi, descrizione `ORIGINAL|MANUAL`, nessun `publishBlockedFields`, media HTTPS reali approvati e mapping Shopify tutti nulli;
4. escludere `OG_393883`, `OG_152965`, `OG_891874`, `OG_758263`, SKU `TEST`, denylist, restructure, structural review e qualsiasi identità già presente o ambigua; riportare parent SKU e child SKU scelti senza pubblicare il manifest;
5. applicare **una sola volta** esclusivamente `20261003163930_create_shopify_creation_ledger.sql`; non modificare altre migration o il registro manualmente;
6. verificare in sola lettura `to_regclass('public.shopify_creation_ledger')`, `pg_class.relrowsecurity` e gli ACL: `PUBLIC`, `anon`, `authenticated` senza privilegi; `service_role` soltanto `SELECT`, `INSERT`, `UPDATE`, senza `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`;
7. impostare il manifest come secret server-side `SHOPIFY_CREATE_BATCH_MANIFEST_JSON`; lasciare assente oppure esattamente `false` `SHOPIFY_CREATE_EXECUTE_ENABLED`;
8. distribuire **solo** `shopify-create-batch` dalla stessa revisione; non distribuire frontend o altre Edge Function;
9. invocare come Admin/Tech Admin `POST` con `{"mode":"DRY_RUN","batchId":"<batch-id-privato>"}` e senza conferma EXECUTE;
10. accettare il risultato soltanto se riporta una famiglia pianificata: un parent `DRAFT`, l'insieme esatto delle 1–2 varianti, tracking `true`, policy `DENY`, stock target `20`, soli media approvati, nessuna publication e **zero mutation**; allegare conteggi `planned`, `skipped`, `failed`, drift/errori sistemici e conferma zero mutation;
11. terminare il Gate live dopo il report. Non abilitare EXECUTE e non effettuare write Shopify.

Comandi SQL di preflight, tutti read-only dopo l'applicazione autorizzata della sola migration:

```sql
select to_regclass('public.shopify_creation_ledger') as ledger_table;

select c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'shopify_creation_ledger';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'shopify_creation_ledger'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;

select
  has_table_privilege('anon', 'public.shopify_creation_ledger', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as anon_any,
  has_table_privilege('authenticated', 'public.shopify_creation_ledger', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as authenticated_any,
  has_table_privilege('service_role', 'public.shopify_creation_ledger', 'SELECT') as service_select,
  has_table_privilege('service_role', 'public.shopify_creation_ledger', 'INSERT') as service_insert,
  has_table_privilege('service_role', 'public.shopify_creation_ledger', 'UPDATE') as service_update,
  has_table_privilege('service_role', 'public.shopify_creation_ledger', 'DELETE,TRUNCATE,REFERENCES,TRIGGER') as service_forbidden_any;
```

Atteso: tabella presente, RLS `true`, nessuna riga grant per `anon`/`authenticated`, soli tre grant al `service_role`; `anon_any=false`, `authenticated_any=false`, i tre flag service consentiti `true`, `service_forbidden_any=false`.

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

Il merge della PR #27 chiude il gate Git. Non chiude i gate migration, deploy, selezione canary, DRY_RUN o EXECUTE.
