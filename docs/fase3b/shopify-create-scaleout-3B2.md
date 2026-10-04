# 3B.2 — Product creation scale-out (report cumulativo)

Stato: **Canary PASS; Storage scale-out CODE READY, NON DEPLOYATO**.

## Export editoriale deterministico
- Generatore: `scripts/build-3b2-editorial-export.py` (regole owner-approved: handle da titolo ORIGINAL, description ORIGINAL con `\n` → newline e HTML minimo, option `Formato` da suffisso, immagini solo `www.onlinegarden.it/wp-content/uploads/` con http→https, HEAD 200 `image/*` stesso path; nessuna AI, nessun campo publishBlocked).
- Output privato (non versionato): `/tmp/3b2/content.json`, `/tmp/3b2/class.csv`.
- Famiglie CREATE_VARIABLE_PARENT 3B.1C: 941
  - SAFE_CREATE: 903
  - SKIPPED_AMBIGUOUS_OPTIONS: 36 (23 valori opzione duplicati, 7 suffisso non derivabile, 6 handle duplicati tra famiglie)
  - SKIPPED_MEDIA: 2
  - SKIPPED_CONTENT / STRUCTURAL / EXISTING_MAPPING: 0 (già esclusi a monte da 3B.1C e denylist)

## Canary OG_111899 — SAFE
- Child: `OG_111899-01`, prezzo 23.5, ORIGINAL legacy_db_baseline, publishBlocked=false su title/description/immagine.
- Handle `pyrus-communis-martinsecco-pero`; `Formato = Ø Vaso 24cm - Altezza Pianta 180cm`.
- Immagine `https://www.onlinegarden.it/wp-content/uploads/2023/01/pyrus-communis-martinsecco-pero.jpg` → 200 image/*.
- Nessun mapping Shopify. Manifest privato `shopify-create-3b2-canary-001` generato (`/tmp/3b2/canary-001.json`).

## Ledger migration
- `20261003163930_create_shopify_creation_ledger.sql` (SHA-256 `720a2669…525725f`) applicata una volta, registrata come `drizzle/migrations/0006_create_shopify_creation_ledger.sql`.
- Tabella presente, RLS attiva, 0 righe.
- anon / authenticated: nessun privilegio — PASS.
- service_role: SELECT/INSERT/UPDATE **più DELETE, TRUNCATE, REFERENCES, TRIGGER** — **FAIL**.
  Causa: i default privileges dello schema `public` concedono ALL a service_role; la migration fa solo `grant`, non `revoke`.

## Fix proposto (non applicato, richiede approvazione)
```sql
revoke delete, truncate, references, trigger on table public.shopify_creation_ledger from service_role;
```
Migration additiva separata, nessun impatto sui dati o sull'executor (usa solo select/insert/update).

## Gate EXECUTE
`SHOPIFY_CREATE_EXECUTE_ENABLED` assente; `SHOPIFY_CREATE_BATCH_MANIFEST_JSON` non configurato; `shopify-create-batch` non distribuita.

## Aggiornamento — ACL fix + canary
- Migration `0007_harden_shopify_creation_ledger_acl.sql` (revoke delete/truncate/references/trigger da service_role). ACL: anon/authenticated nessun privilegio; service_role SELECT/INSERT/UPDATE sì, DELETE/TRUNCATE/REFERENCES/TRIGGER no; RLS attiva — **PASS**.
- Deploy della sola `shopify-create-batch` (avviato in parallelo con la migration, prima della verifica ACL; nessuna chiamata eseguita prima della verifica).
- Canary `shopify-create-3b2-canary-001` / OG_111899: DRY_RUN PLANNED=1, 0 blocked/failed → EXECUTE una volta → CREATED=1.
  - Product `gid://shopify/Product/15836694249812`, variant `gid://shopify/ProductVariant/57407007981908` (OG_111899-01).
  - Verifiche executor: DRAFT, titolo/description/handle, opzioni, prezzo, media READY, tracked=true, DENY, available 20 alla location, mapping.
  - Ledger: 5 operazioni APPLIED. DRY_RUN successivo: ALREADY_EXISTS=1 (nessun duplicato).
  - Gate `SHOPIFY_CREATE_EXECUTE_ENABLED` rimosso subito dopo.

## Blocker scale-out
Il manifest viene letto solo dal secret `SHOPIFY_CREATE_BATCH_MANIFEST_JSON`, limitato a 24.576 caratteri. Una famiglia media occupa ~3 KB (description ORIGINAL completa): 10 famiglie superano il limite, ~5 ci stanno. 903 famiglie = ~180 lotti, ciascuno con sostituzione manuale del secret e gate on/off: non eseguibile in modo affidabile.

Il limite viene rimosso senza frammentare le descrizioni e senza sostituire manualmente secret: la forward-fix usa Supabase Storage privato e non mantiene il vecchio secret come seconda sorgente.

## Architettura Storage implementata

- bucket fisso: `shopify-create-manifests`, `public=false`, solo JSON, massimo 5 MiB per oggetto;
- client/browser: nessuna policy di accesso; una policy RLS `AS RESTRICTIVE` nega esplicitamente il bucket a `anon` e `authenticated` anche in presenza di policy più ampie;
- runtime: download esclusivamente con `service_role`; nessuna chiave privilegiata passa al frontend;
- indice fisso: `index.json`;
- batch: `batches/shopify-create-3b2-NNN.json`, massimo 10 famiglie;
- nessun manifest o contenuto privato in Git e nessun URL firmato.

Migration locale non applicata: `20261003205811_create_shopify_create_manifests_bucket.sql`.

### Contratto `index.json`

```json
{
  "schemaVersion": "3B.2-scaleout-v1",
  "batches": [
    {
      "batchId": "shopify-create-3b2-002",
      "objectPath": "batches/shopify-create-3b2-002.json",
      "sha256": "<64 caratteri esadecimali>",
      "familyCount": 10,
      "schemaVersion": "3B.2-v1"
    }
  ]
}
```

Ogni entry accetta esclusivamente questi cinque campi. Il path deve derivare esattamente dal `batchId`; SHA-256 e `familyCount` vengono verificati prima dell'executor. Il request HTTP accetta solo `batchId`, `mode`, `confirm`, `approvalDigest` e rifiuta manifest, object path, SHA o payload prodotto.

Il DRY_RUN restituisce `manifestSha256` e `approvalDigest = SHA-256(batchId:manifestSha256:schemaVersion)`. EXECUTE deve inviare esattamente quel digest: la funzione ricarica indice e manifest, ricalcola entrambi i valori e restituisce `MANIFEST_APPROVAL_MISMATCH` prima di costruire il client Shopify se il contenuto approvato è cambiato. Anche il DRY_RUN finale di VERIFY invia lo stesso digest, così una sostituzione fra EXECUTE e verifica non può essere ignorata. `approvalDigest` identifica l'artefatto approvato, ma non sostituisce JWT, ruolo Admin, conferma EXECUTE o gate server-side.

## Generazione privata

```bash
node scripts/build-shopify-create-scaleout.mjs \
  --manifest /private/manifest-3B1C-shopify-final.csv \
  --content /private/content.json \
  --output-dir /private/shopify-create-scaleout-3b2 \
  --batch-prefix shopify-create-3b2 \
  --batch-size 10 \
  --start-number 2 \
  --expected-families 903
```

Il builder crea file `0600`, non sovrascrive directory esistenti, ordina deterministicamente parent/varianti, produce l'indice per ultimo e stampa conteggi esatti. **903 parent producono 91 batch**; il totale varianti reale non è ricostruibile dal repository e deve provenire dall'output privato del comando. L'ultimo batch contiene 3 famiglie se tutte le 903 superano nuovamente i gate.

Upload operativo: creare/applicare il bucket privato, caricare tutti i batch con upsert disabilitato, verificarne SHA e dimensione, quindi caricare `index.json` per ultimo e congelarlo per la finestra. Il canary già creato può essere riconciliato senza duplicazione se ricompare: ledger e verifica esatta bloccano qualsiasi payload differente.

## Workflow server-side senza interazione tra batch

`scripts/run-shopify-create-scaleout.mjs` usa soltanto i batch ID dell'indice privato locale e chiama l'endpoint Admin. Per ogni batch esegue DRY_RUN, acquisisce digest e SHA server-side, quindi li vincola a EXECUTE e al DRY_RUN di VERIFY. Un digest assente/diverso o una risposta riferita a un altro SHA arrestano globalmente il runner. `--start-batch` abilita il resume; una seconda esecuzione riconcilia i prodotti esistenti.

```bash
SHOPIFY_CREATE_ENDPOINT='<endpoint>' \
SHOPIFY_CREATE_ADMIN_JWT='<token admin temporaneo>' \
node scripts/run-shopify-create-scaleout.mjs \
  --index /private/shopify-create-scaleout-3b2/index.json \
  --start-batch shopify-create-3b2-002 \
  --execute-window
```

Lovable deve aprire una sola finestra impostando `SHOPIFY_CREATE_EXECUTE_ENABLED=true`, eseguire il runner e rimuovere il gate in un `finally`. Qualsiasi errore sistemico, integrità/SHA, identity/duplicate/idempotency conflict, `FAILED`, `BLOCKED` o `MEDIA_PENDING` arresta tutti i batch. Safe skip espliciti possono proseguire. Nessun prodotto viene pubblicato: tutti restano `DRAFT`.

## Stato e rollout

Questa PR non crea il bucket live, non carica manifest, non distribuisce funzioni e non chiama Shopify. Prima del rollout servono backup/preflight Storage, conteggi builder reali, upload privato verificato, deploy della sola funzione, DRY_RUN Storage del primo batch e approvazione separata della finestra EXECUTE.

Rollback: rimuovere immediatamente il gate, fermare il runner e conservare bucket, indice, manifest e ledger. Non cancellare automaticamente prodotti o righe ledger. Ripristinare la precedente Edge Function solo dopo aver verificato che nessun workflow scale-out sia attivo.

## Esito live scale-out Storage (lotti 002–092)

- Bucket privato `shopify-create-manifests` (public=false, 5 MiB, policy client-deny). **Gap aperto:** `allowed_mime_types` = NULL (non application/json); gate MIME NON dichiarato PASS.
- 91 manifest + `index.json` caricati (dimensioni verificate; SHA verificato server-side a ogni DRY_RUN tramite `approvalDigest`/`manifestSha256`).
- Ledger 3B.2: 903 parent e 930 varianti con operazioni registrate; 0 request_key duplicate. 1 riga `ATTACH_MEDIA` rimasta RESERVED (OG_461758, lotto 037, runner interrotto lato client) — verifica successiva ALREADY_EXISTS.
- Verificate ALREADY_EXISTS: 889 famiglie (incluso canary OG_111899). Tutte DRAFT, nessuna pubblicazione.
- BLOCKED isolate (14) `PRODUCT_STATE_MISMATCH` — create come DRAFT su Shopify ma descrizione normalizzata da Shopify (HTML sorgente malformato, es. `< br >`): OG_238559, OG_341476, OG_422411, OG_489489, OG_538594, OG_553492, OG_644838, OG_728356, OG_746747, OG_778338, OG_839472, OG_847151, OG_865363, OG_942831. Remediation: pulizia HTML descrizione e riconciliazione, nessuna ricreazione.
- Incidenti: 1 lettura Storage transitoria (lotto 014, nessuna scrittura); runner client sopravvissuti al timeout dello strumento in due casi (nessuna esecuzione EXECUTE concorrente, solo DRY_RUN in parallelo).
- Gate `SHOPIFY_CREATE_EXECUTE_ENABLED`: **OFF** (rimosso).

### Safe pause (2026-10-04 00:34 UTC)
- Nessun lotto in corso al momento dello stop; nessun runner attivo.
- Ultimo lotto completato: 092 (ultimo dell'indice). Lotti non completati: nessuno.
- Famiglie create: 903; varianti: 930. BLOCKED: 14 (`PRODUCT_STATE_MISMATCH`, elencate sopra); FAILED: 0; MEDIA_PENDING: 0.
- `SHOPIFY_CREATE_EXECUTE_ENABLED` assente nelle secret (read-back): EXECUTE OFF.
- Ledger, bucket, `index.json`, manifest e prodotti intatti. Una nuova esecuzione con `--start-batch` su qualsiasi lotto produrrebbe solo ALREADY_EXISTS/BLOCKED (idempotenza ledger), senza duplicati.
