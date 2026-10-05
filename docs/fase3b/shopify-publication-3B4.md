# 3B.4 — Controlled Shopify publication

Data: 4 ottobre 2026
Stato: **MULTI-CHANNEL CODE READY PER REVIEW · MANIFEST PRIVATI DA RIGENERARE · NESSUNA WRITE LIVE**

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

Il canary `OG_111899` ha dimostrato che la vetrina richiede `Product.status=ACTIVE` e la presenza simultanea sulle tre publication approvate:

| Target approvato | Identità vincolata |
|---|---|
| Online Store | nome esatto; ID risolto in modo univoco server-side |
| Ecom Blueprint Gen 6ud1s Headless | `gid://shopify/Publication/338862113108` + nome esatto |
| Lovable | `gid://shopify/Publication/328891826516` + nome esatto |

`Point of Sale`, `Shop` e ogni altro canale non sono target del workflow. L'executor pubblica solo sui target approvati mancanti. Una publication storica estranea già presente viene conservata e segnalata come `PRE_EXISTING_EXTRA_PUBLICATION`: non viene aggiunta, rimossa o usata come causa di cleanup distruttivo. La postcondizione blocca invece qualsiasi publication estranea nuova comparsa durante l'esecuzione.

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
- indice privato `publication/index.json` (`3B.4-publication-index-v2`);
- batch `publication/batches/<batchId>.json` (`3B.4-v2`), massimo 25 famiglie;
- bucket privato `shopify-create-manifests`, service-role, SHA e approval digest;
- solo admin/tech_admin; DRY_RUN predefinito;
- EXECUTE: `SHOPIFY_PUBLICATION_EXECUTE`, digest e gate `SHOPIFY_PUBLICATION_EXECUTE_ENABLED=true`;
- runner `scripts/run-shopify-publication.mjs`, resume e stop globale;
- mutation minime: `productUpdate(status: ACTIVE)` e `publishablePublish` una volta per ciascun target approvato mancante;
- già completo → `ALREADY_PUBLISHED`, zero mutation.

Il manifest v2 incorpora `approvedPublications` con il set esatto sopra indicato, oltre a identità prodotto, `schemaVersion`, `batchId` e stato atteso completo. Il parser rifiuta target aggiuntivi, ID rinominati o set riordinati/manomessi; la request HTTP continua ad accettare solo `batchId`, modalità, conferma e `approvalDigest`, quindi il client non può fornire publication ID arbitrari. Ogni variazione del set modifica i byte del manifest, lo SHA-256 e di conseguenza l'`approvalDigest`.

Gli indici e manifest v1 single-channel sono **superseded**. Loader e runner accettano esclusivamente v2: un digest ricavato dai vecchi file non può aprire una finestra EXECUTE sul nuovo codice.

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

Le publication vanno lette con `publications(first: 100) { nodes { id name } }`: Online Store deve essere univoca per nome, Headless e Lovable devono corrispondere simultaneamente per ID e nome. Il report ha una riga per parent SKU: `classification`, `parentSku`, `shopifyProductId`, `variantCount`, `descriptionState`, `mediaState`, `inventoryState`, `publicationState`, `reason`. Classi: `CREATED_DRAFT`, `EXISTING_SAFE`, `BLOCKED_DESCRIPTION`, `STRUCTURAL_EXCLUDED`, `READY_TO_PUBLISH`, `PUBLISHED`, `FAILED`; eventuali canali storici sono annotati separatamente come `PRE_EXISTING_EXTRA_PUBLICATION`. I totali derivano dalle righe.

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

Drift, identity conflict, media/stock mismatch, nuova publication estranea, blocked/failed o errore sistemico fermano globalmente. Il resume parte da un batch approvato; il replay non duplica mutation e pubblica soltanto i target approvati ancora mancanti.

Anche `Shopify rate limit persistente` è classificato come errore sistemico dopo l'esaurimento dei retry 429: arresta immediatamente il batch e marca gli item successivi `BATCH_STOPPED`, senza ulteriori write Shopify.

Rollback: gate OFF e stop runner. Nessun unpublish automatico. Le esclusioni strutturali restano backlog post-launch. Questa revisione non distribuisce funzioni, non carica manifest, non modifica secret, non chiama Shopify e non pubblica prodotti.

## Esecuzione FAST TRACK — 5 ottobre 2026

FAST-TRACK LAUNCH BASELINE: lo stato Shopify verificato oggi è accettato come riferimento per le famiglie SAFE già riconciliate.

- Coorte 3B.2: 903 famiglie (mappatura ledger 1:1, 0 duplicati)
- Preflight Admin in sola lettura: **READY_TO_PUBLISH = 887**, BLOCKED_DRIFT = 0
- Escluse: 14 BLOCKED_DESCRIPTION; 2 per media ledger (OG_779932 = riga ATTACH_MEDIA effettivamente RESERVED; OG_461758 escluso per prudenza, il suo ledger risulta APPLIED)
- Manifest privati: `publication/index.json` + 37 lotti (001 = canary, 002–037 = 886 famiglie, max 25)
- Canary OG_111899: DRY_RUN → EXECUTE una volta (SET_ACTIVE + Online Store) → VERIFY `ALREADY_PUBLISHED`. Admin: ACTIVE, pubblicato solo su Online Store, nessun canale extra.
- **Controllo vetrina non superato**: la Storefront API usata dal sito restituisce `product: null` (il token del sito è legato a un altro canale) e la vetrina Shopify risponde 401 (negozio protetto da password). Visibilità, prezzo e acquistabilità lato cliente non verificabili → STOP come da procedura.
- Gate `SHOPIFY_PUBLICATION_EXECUTE_ENABLED` rimosso e verificato assente.
- Pubblicati: 1 (canary). Già pubblicati: 0. Falliti: 0. Restano DRAFT: 902. Canali non previsti: 0.

FAST TRACK SAFE PUBLICATION — STOPPED: verifica vetrina canary non eseguibile (canale del sito diverso da Online Store; negozio con password).

## MASS PUBLICATION FINAL — 5 ottobre 2026

Blocco sistemico rilevato prima di qualsiasi DRY_RUN/EXECUTE: i 36 manifest preparati (002–037) e `shopify-publication-batch` fissano un solo `targetPublication` = Online Store (`types.ts`, `manifest.ts`, `executor.ts`), e la verifica post-publish fallisce se il prodotto è su canali diversi da Online Store. Il publication set approvato (Online Store + Headless 338862113108 + Lovable 328891826516) non è eseguibile senza modificare codice, ridistribuire la funzione e rigenerare i manifest (nuovi SHA/approvalDigest): operazione fuori dall'ambito autorizzato.

- Pubblicati in questa fase: 0. Già pubblicati: 1 (canary). Restano DRAFT: 902. Falliti: 0. Duplicati: 0. Canali non previsti: 0.
- Gate `SHOPIFY_PUBLICATION_EXECUTE_ENABLED`: OFF (mai aperto in questa fase).

MASS SAFE PUBLICATION — STOPPED: executor e manifest supportano solo Online Store

## Multi-channel publication fix — 5 ottobre 2026

Il contratto applicativo è stato portato a v2 con i tre target approvati. I test coprono DRAFT, target parzialmente presenti, replay ACTIVE con prova ledger, canary già completo, publication storiche, rifiuto di un quarto canale, manomissione manifest, verifica dei tre target, isolamento dei campi e stop sistemico. `OG_111899`, già ACTIVE e presente sui tre canali, risulta `ALREADY_PUBLISHED` in DRY_RUN con zero mutation nella regressione locale.

Il builder offline `scripts/build-shopify-publication-manifests.mjs`:

1. legge soltanto `publication/index.json` v1 e i relativi batch privati;
2. verifica lo SHA-256 di ogni sorgente prima del parsing;
3. esclude `OG_111899` e rifiuta famiglie bloccate, strutturali, TEST o duplicate;
4. richiede esattamente 886 famiglie;
5. genera deterministicamente 36 batch v2 (`002–037`, massimo 25; ultimo lotto 11), nuovi SHA e nuovi input `approvalDigest`.

Esecuzione locale prevista, senza upload:

```bash
node scripts/build-shopify-publication-manifests.mjs \
  --source-root /private/source-v1 \
  --output-root /private/generated-v2 \
  --expected-items 886
```

La sessione Codex non dispone della copia privata dei manifest v1 né di credenziali Storage service-role. La rigenerazione sui dati reali non è quindi stata eseguita: 0 file cliente sono stati inventati, caricati o versionati. Il conteggio 36/886 è verificato deterministicamente dal test del builder, ma i nuovi manifest privati reali devono essere prodotti in ambiente Lovable con le sorgenti approvate prima di deploy, DRY_RUN o EXECUTE.

## GO LIVE FAST TRACK v2 — 5 ottobre 2026 (SAFE PAUSE)

- `shopify-publication-batch` distribuita da main `dbbeb4f` (PR #31). Builder: accettati i parentSku con suffisso numerico (`OG_475352-1…`, `OG_924853-n`), già SAFE in 3B.2.
- 36 batch v2 (002–037, 886 famiglie) rigenerati dalle copie locali v1 verificate via SHA; nuovi SHA/approvalDigest e `publication/index.json` v2 caricati nel bucket privato.
- DRY_RUN su tutti i 36: READY_TO_PUBLISH=886, BLOCKED=0.
- EXECUTE+VERIFY 002–027: 650 famiglie `ALREADY_PUBLISHED` su Online Store + Headless + Lovable. Lotto 011: un replay ha mostrato 6 BLOCKED transitori (esecuzione precedente ancora in corso), verifica finale 25/25. Lotto 027: verificato in sola lettura dopo lo stop (25/25).
- Stop richiesto dall'owner: gate `SHOPIFY_PUBLICATION_EXECUTE_ENABLED` rimosso, read-back assente. Lotto 028 in DRY_RUN: 25 READY, nessuna scrittura parziale.
- Totali: pubblicati 651 (650 + canary), FAILED 0, BLOCKED/SKIPPED finali 0, ancora DRAFT 252 (236 della coorte + 16 esclusi).
- Ripresa: `--start-batch shopify-publication-3b4-028` (replay idempotente via ledger, solo target mancanti).

SAFE PAUSE — RESUME FROM BATCH 028
