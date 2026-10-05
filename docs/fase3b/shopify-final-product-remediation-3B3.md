# 3B.3 — Final product description remediation

Data: 4 ottobre 2026
Stato: **CODE READY PER REVIEW · NON DEPLOYATO · NESSUNA WRITE SHOPIFY LIVE**

## Scopo e confini

Il workflow corregge esclusivamente `descriptionHtml` sui 14 prodotti Shopify già esistenti isolati in 3B.2 con `PRODUCT_STATE_MISMATCH`. Non crea prodotti, handle, SKU, opzioni o varianti e non modifica titolo, prezzo, media, inventario, tracking, policy, pubblicazione o ID Shopify.

Famiglie ammesse: `OG_238559`, `OG_341476`, `OG_422411`, `OG_489489`, `OG_538594`, `OG_553492`, `OG_644838`, `OG_728356`, `OG_746747`, `OG_778338`, `OG_839472`, `OG_847151`, `OG_865363`, `OG_942831`. Qualsiasi altra famiglia viene rifiutata dal parser.

## Architettura e controlli

- Edge Function `shopify-description-remediation`;
- bucket privato esistente `shopify-create-manifests`;
- indice `remediation/index.json`, schema `3B.3-remediation-index-v1`;
- batch `remediation/batches/<batchId>.json`, schema `3B.3-v1`, massimo 14 item;
- loader `service_role`, SHA-256 e `approvalDigest = SHA-256(batchId:manifestSha256:schemaVersion)`;
- request limitata a `batchId`, `mode`, `confirm`, `approvalDigest`;
- solo `admin|tech_admin`, default `DRY_RUN`;
- EXECUTE richiede conferma `SHOPIFY_DESCRIPTION_REMEDIATION_EXECUTE` e gate temporaneo `SHOPIFY_DESCRIPTION_REMEDIATION_EXECUTE_ENABLED=true`;
- runner `scripts/run-shopify-remediation.mjs`: DRY_RUN → EXECUTE → VERIFY, con resume.

Ogni item contiene mapping `shopifyProductId`, parent SKU, ORIGINAL approvato, operazione fissa `UPDATE_DESCRIPTION_ONLY` e snapshot preflight completo: titolo, handle, descrizione corrente, stato, varianti/prezzi/opzioni, inventory/tracking/policy/available, media e publication ID.

## Normalizzazione consentita

`normalizeApprovedOriginalDescription` applica soltanto: `\n` letterale → newline; CRLF/CR → LF; `< br >`/`<br />` → `<br>`; trim esterno. Non modifica parole o punteggiatura.

Tag attivi (`script`, `style`, `iframe`, `object`, `embed`, `form`, `svg`, `math`), event handler, URL `javascript:`, blocchi PHP/template, byte NUL o parentesi HTML ambigue producono `APPROVED_DESCRIPTION_CORRUPTED|AMBIGUOUS_MARKUP`. Non è prevista pulizia AI o SEO.

## Drift e post-write

Prima della mutation l'executor rilegge il prodotto per ID e confronta l'intero stato con lo snapshot approvato. Target già presente → `ALREADY_REMEDIATED`; qualsiasi variazione → `STATE_DRIFT`, zero write.

Prima di `sameState` verifica inoltre la completezza sia dello snapshot approvato sia della nuova lettura: `variantCount == variants.length` e `mediaCount == media.length`. Una pagina Shopify troncata produce `SNAPSHOT_TRUNCATED`, blocca l'item e non esegue write.

La sola mutation è `productUpdate(product: { id, descriptionHtml })`. Dopo la write vengono verificati ID invariato, descrizione esatta e uguaglianza di tutti i campi estranei. Una differenza genera `FIELD_ISOLATION_POSTCONDITION_FAILED` e stop sistemico. Il client non espone metodi create; il retry sul target già corretto non riscrive.

## Preflight privato richiesto a Lovable

Il repository non contiene manifest cliente o snapshot Admin corrente. Lovable deve leggere i 14 ORIGINAL dai batch privati 3B.2 con SHA verificato, ricavare gli ID dal mapping/ledger (mai ricerca fuzzy), eseguire la query Admin read-only, generare batch+indice con upsert disabilitato e ottenere approvazione content/owner sul DRY_RUN.

```graphql
query RemediationReadProduct($id: ID!, $locationId: ID!) {
  product(id: $id) {
    id title handle descriptionHtml status
    variantsCount { count }
    mediaCount { count }
    variants(first: 100) {
      nodes {
        id sku price inventoryPolicy selectedOptions { name value }
        inventoryItem {
          id tracked
          inventoryLevel(locationId: $locationId) {
            quantities(names: ["available"]) { name quantity }
          }
        }
      }
    }
    media(first: 100) { nodes { id alt status mediaContentType } }
    resourcePublicationsV2(first: 100) {
      nodes { isPublished publication { id name } }
    }
  }
}
```

Se una famiglia supera 100 varianti/media o i count non coincidono, va bloccata, non troncata.

## Esecuzione futura autorizzata

```bash
SHOPIFY_REMEDIATION_ENDPOINT='<edge-url>' \
SHOPIFY_FINAL_ADMIN_JWT='<token-admin-temporaneo>' \
node scripts/run-shopify-remediation.mjs \
  --index /private/remediation/index.json
```

Il comando è DRY_RUN. Solo dopo approvazione e apertura temporanea del gate si aggiunge `--execute-window`. Il gate va rimosso in `finally`. Criterio di uscita: VERIFY tutto `ALREADY_REMEDIATED`, zero blocked/failed/skipped. Solo allora le famiglie entrano in un nuovo preflight 3B.4.

L'errore esatto `Shopify rate limit persistente`, emesso dopo l'esaurimento dei retry 429 del client condiviso, è sistemico: l'item corrente fallisce, tutti i successivi diventano `BATCH_STOPPED` e non vengono eseguite ulteriori write.
