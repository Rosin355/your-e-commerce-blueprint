# FASE 2B.4 — Deploy edge-first product-admin-api: FERMATO al gate 2

Data: 2026-09-24. Nessun deploy, merge, pubblicazione, migration o scrittura eseguiti.

## Gate 1 — Log anteprima: SUPERATO
- Ultima build: `build OK` (2026-09-24T17:33:39Z).
- I due errori TypeScript erano preesistenti e in `shopify-admin-proxy` (non nella funzione admin); corretti con sole annotazioni di tipo, senza cambi di comportamento.
- Side effect noto: le Edge Function modificate vengono ridistribuite automaticamente, quindi `shopify-admin-proxy` è stata ridistribuita con logica identica.

## Gate 2 — Rollback della versione distribuita: NON SUPERATO
- Dal sandbox non esiste un canale per scaricare il bundle realmente distribuito di `product-admin-api`: nessun token di gestione della piattaforma, nessuna CLI e nessuno strumento che esporti il codice in esecuzione.
- L'unico riferimento disponibile è il codice di `main` a `7858f6c`. Il gate vieta di presumere che coincida con quanto distribuito.
- Esito: rollback attendibile non ottenibile, quindi il rilascio viene fermato come previsto.

Hash di riferimento di `main` a `7858f6c` (solo candidato, non verificato come versione distribuita):
| file | sha256 |
|---|---|
| auth.ts | 9e8494354fca9c5f20573cc2589522f6634f6f827373fc72432dc274814f9e38 |
| commands.ts | afc79add06bf7fc1fea5aedd61592936dbe8fd522cdd25da2c6e992196753705 |
| index.ts | 300a491ca84ef9c1bbb948b541235a32057d27beb61751ae5cebb08e7ca91034 |
| permissions.ts | 9babf4b3363cd3a6b30922ad24c169f0de79f65ffe2e6f410f088c8ae34a3361 |
| queries.ts | 00bd82ec8796a882e3a1586164b78e5c4a5991ac43ae154b18e91e0abdbd0906 |
| serializers.ts | 40db1a849c608d81fa54f225303f9a864ecd5795515e8494c09508c1798a7b11 |
| types.ts | 753d73c4b9279e03b37fbd6377fe64e37c49eaf1360dfcb2db0916512922e119 |
| validation.ts | 49e7993f763e0a01db7aa6ce441fdea7ce3beaef1cdb263774e1eb59bf81726f |

La funzione non usa `_shared/`. Le dipendenze esterne sono `supabase-js@2.49.8` (esm.sh) e `npm:@supabase/supabase-js@2/cors`.

Modalità admin documentata: `PRODUCT_ADMIN_WRITES_ENABLED=true`, `PRODUCT_ADMIN_WRITE_MODE=canary`.

## Gate 3–6: non eseguiti
Il PR #4 HEAD `24b2b118` è aperto e non mergiato. Hash già rilevati in 2B.3 (capabilities `fe982af6…`, index `6dcb76d5…`, queries `ec75ee63…`, serializers `d78d4bd3…`, types `34c7a4df…`, validation `afb40bfc…`; auth, commands e permissions identici a main).

## Opzioni per sbloccare (servono decisioni)
1. Accettare esplicitamente come rollback `main@7858f6c`, rafforzato da un'impronta comportamentale pre-deploy: la risposta read-only attuale deve essere priva di `appliesTo` e `sourceSnapshotId`, e deve essere confrontata dopo l'eventuale ripristino.
2. Fornire un export del bundle distribuito ottenuto da chi ha accesso alla gestione della piattaforma.

Prossimo gate frontend: invariato, richiede un'approvazione separata.
