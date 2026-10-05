# 3B.4 — Controlled Shopify publication

Data: 4 ottobre 2026
Stato: **CODE READY PER REVIEW · PUBBLICAZIONE PENDING · NESSUNA WRITE LIVE**

## Stato ricomputato dalle evidenze disponibili

| Classe | Conteggio certo | Nota |
|---|---:|---|
| `CREATED_DRAFT` | 903 famiglie / 930 varianti | batch 002–092, tutti DRAFT |
| `EXISTING_SAFE` | 889 famiglie | sottoinsieme riconciliato delle 903, non totale aggiuntivo |
| `BLOCKED_DESCRIPTION` | 14 famiglie | esistono già; remediation 3B.3 |
| `STRUCTURAL_EXCLUDED` | non ricomputabile senza manifest privato | OG_152965, OG_891874, OG_758263, OG_393883, TEST, `RESTRUCTURE_REQUIRED` |
| `READY_TO_PUBLISH` | da export live | 889 è la platea candidata, non il conteggio finale |
| `PUBLISHED` | da export live | richiede lettura Admin publication |
| `FAILED` | 0 nella creazione 3B.2 | separato dai futuri esiti 3B.4 |

Le 14 sono incluse nelle 903. Dopo remediation la platea massima teorica della coorte è 903, ma il valore finale può scendere per drift o gate non conformi. DRAFT esterni alla coorte entrano solo con mapping e manifest owner-approved completi, mai per il solo stato DRAFT.

## Modello di visibilità Shopify

La visibilità richiede entrambe le condizioni: `Product.status=ACTIVE` e pubblicazione sulla publication identificata esattamente come `Online Store`. L'executor verifica ID/nome fissati nel manifest, invia `publishablePublish` solo a quell'ID e blocca publication inattese. Non pubblica su Headless/Hydrogen.

## Criteri esatti di eleggibilità

- product ID e parent SKU mappati deterministicamente;
- stato iniziale DRAFT; replay ACTIVE ammesso solo per riconciliare una precedente esecuzione;
- titolo, handle e descrizione uguali al manifest approvato;
- descrizione APPROVED, nessun `publishBlockedFields`;
- opzioni e insieme varianti esatti, nessuna variante extra;
- prezzo positivo e uguale in centesimi;
- media non vuoti, insieme esatto, solo IMAGE, tutti READY;
- inventory item presente, tracked=true, DENY, available=20;
- struttura EXACT, nessun blocked/restructure/review;
- esclusione di OG_152965, OG_891874, OG_758263, OG_393883 e TEST.

## Architettura

- Edge Function separata `shopify-publication-batch`;
- indice privato `publication/index.json` (`3B.4-publication-index-v1`);
- batch `publication/batches/<batchId>.json` (`3B.4-v1`), massimo 25 famiglie;
- bucket privato `shopify-create-manifests`, service-role, SHA e approval digest;
- solo admin/tech_admin; DRY_RUN predefinito;
- EXECUTE: `SHOPIFY_PUBLICATION_EXECUTE`, digest e gate `SHOPIFY_PUBLICATION_EXECUTE_ENABLED=true`;
- runner `scripts/run-shopify-publication.mjs`, resume e stop globale;
- mutation minime: `productUpdate(status: ACTIVE)` e `publishablePublish` solo se necessarie;
- già completo → `ALREADY_PUBLISHED`, zero mutation.

### Prova durevole per replay ACTIVE

Lo stato Shopify `ACTIVE` non è mai considerato da solo una prova di replay. Il workflow riusa `shopify_creation_ledger` con operazione `SET_ACTIVE`, request key deterministica e transizioni `RESERVED → APPLIED → VERIFIED`; registra `batchId`, parent SKU, product ID, payload hash, `applied_at` e `verified_at`.

- `DRAFT` senza evidenza: normale flusso eleggibile;
- `ACTIVE` con evidenza esatta `APPLIED|VERIFIED`: riconciliazione/replay ammesso;
- `ACTIVE` senza evidenza: `STATE_DRIFT`, nessuna pubblicazione;
- evidenza con request key, hash, batch, SKU o product ID incompatibili: `IDEMPOTENCY_CONFLICT`;
- `DRAFT` con evidenza già applicata: `STATE_DRIFT`.

La migration `20261004120000_extend_shopify_ledger_publication.sql` estende il ledger privato esistente; è inclusa come codice ma non viene applicata da Codex. Il deploy dell'Edge Function resta bloccato finché la migration non viene approvata e applicata separatamente.

Batch 25 è un default conservativo: operazione più leggera della creazione, ma con più letture e due possibili mutation. Un aumento richiede misure reali di latenza/rate-limit.

## Export Admin read-only obbligatorio

Lovable deve esportare tutti i candidati mappati senza troncare e joinarli ai manifest privati. Campi minimi:

```graphql
query PublicationPreflight($id: ID!, $locationId: ID!) {
  product(id: $id) {
    id title handle descriptionHtml status
    variantsCount { count }
    mediaCount { count }
    options { name values }
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

La publication target va letta con `publications(first: 100) { nodes { id name } }` e deve essere univoca. Il report ha una riga per parent SKU: `classification`, `parentSku`, `shopifyProductId`, `variantCount`, `descriptionState`, `mediaState`, `inventoryState`, `publicationState`, `reason`. Classi: `CREATED_DRAFT`, `EXISTING_SAFE`, `BLOCKED_DESCRIPTION`, `STRUCTURAL_EXCLUDED`, `READY_TO_PUBLISH`, `PUBLISHED`, `FAILED`. I totali derivano dalle righe.

## Canary e scale-out

Candidato: `OG_111899`, prodotto `gid://shopify/Product/15836694249812`, solo se il nuovo preflight conferma tutti i gate.

Sequenza futura Lovable: manifest di una famiglia → DRY_RUN `READY_TO_PUBLISH` → approvazione digest → gate + EXECUTE una volta → VERIFY `ALREADY_PUBLISHED` → storefront check (visibilità, varianti, prezzo, immagine, stock, acquistabilità, nessuna quantità numerica, duplicato o canale extra) → gate OFF in `finally`.

Dopo PASS:

```bash
SHOPIFY_PUBLICATION_ENDPOINT='<edge-url>' \
SHOPIFY_FINAL_ADMIN_JWT='<token-admin-temporaneo>' \
node scripts/run-shopify-publication.mjs \
  --index /private/publication/index.json \
  --start-batch shopify-publication-3b4-002 \
  --execute-window
```

Drift, identity conflict, media/stock mismatch, varianti/publication inattese, blocked/failed o errore sistemico fermano globalmente. Il resume parte da un batch approvato; il replay non duplica mutation.

Anche `Shopify rate limit persistente` è classificato come errore sistemico dopo l'esaurimento dei retry 429: arresta immediatamente il batch e marca gli item successivi `BATCH_STOPPED`, senza ulteriori write Shopify.

Rollback: gate OFF e stop runner. Nessun unpublish automatico. Le esclusioni strutturali restano backlog post-launch. Questa revisione non distribuisce funzioni, non carica manifest, non modifica secret, non chiama Shopify e non pubblica prodotti.
