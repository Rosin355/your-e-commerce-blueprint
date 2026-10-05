# Fase 3B — Shopify remediation plan

Data: 29 settembre 2026  
Stato: **DIAGNOSI READ-ONLY COMPLETATA — GO-LIVE ANCORA BLOCCATO**

## Executive summary

La causa principale non è un singolo bug Shopify. Il catalogo commerciale è il risultato di sync legacy parziali, senza un manifest riproducibile e senza una fonte stock completa.

### Inventory
- Shopify è il registro transazionale previsto.
- 462/462 varianti live: `quantityAvailable=0`.
- Solo tre SKU risultano acquistabili: `OG_257799`, `OG_426481`, `OG_797988`.
- `currentlyNotInStock=false` non prova da solo la policy "continue selling": servono `inventoryPolicy`, `inventoryItem.tracked`, location e inventory levels da Shopify Admin.
- Nei raw, su 2.626 righe SKU: 2.570 senza quantità esplicita, 13 con quantità positiva, 43 con zero.
- Le pipeline legacy mappano stock status/policy ma non alimentano in modo completo quantity, tracking e location.
- I normalizzatori legacy convertono quantità mancanti in zero.

### Publication
- Catalogo canonico: 2.706 entità = 404 simple + 1.114 variable + 1.188 variation.
- Gruppi teorici Shopify: 1.518.
- Storefront: 461 prodotti / 462 varianti.
- 460 prodotti sono monovarianti; uno solo ha due varianti con label degradate `Title 01/02`.
- 165 SKU live corrispondono a variation WordPress pubblicate come prodotti separati.
- 29 SKU live non trovano match negli otto CSV.
- Nessun criterio editoriale/manifest di pubblicazione riproducibile è documentato.
- Gap sovrapposti già osservati: 1.058 senza prezzo, 1.211 senza descrizione, 1.189 senza `image_urls`, 2.706 con contenuti AI legacy ancora da revisionare.

### Images
| Fonte | 0 immagini | 1 immagine | >1 immagini |
|---|---:|---:|---:|
| WordPress raw | 1.151 | 493 | 982 |
| Shopify live | 3 | 458 | 0 |

Fra gli SKU live matchati ai raw, almeno 95 avevano gallery alla fonte. Le pipeline legacy costruiscono `mediaInputs` ma non li inviano alle mutation di creazione/aggiornamento; l'attuale catalogo non usa il percorso recente che supporta gallery.

### Variants
- `OG_152965`: compatibile con prodotto singolo, preservando consapevolmente SKU/URL.
- `OG_891874`: due child con prezzi 7,40 € / 15,50 €, oggi due prodotti separati.
- `OG_758263`: due child con prezzi 15,70 € / 19,20 €, oggi due prodotti separati.
Per gli ultimi due la scelta separati-vs-varianti è una decisione business/SEO; non cambiare automaticamente entity type.

### Mobile
A 390 px il documento arriva a 437 px. Root cause: `src/components/storefront/HomeAnnouncementBar.tsx`, elemento `inline-flex ... whitespace-nowrap`, larghezza ~484 px. Fix minimo futuro: wrapping sotto `sm`, testo centrato, altezza flessibile.

### Shipping
Da verificare in Shopify Admin / checkout con indirizzo:
1. mercato Italia e valuta;
2. location attiva;
3. shipping profile;
4. zona Italia e limitazioni CAP/isole;
5. tariffa applicabile;
6. peso/unità/`requiresShipping`;
7. soglie gratuite;
8. tasse;
9. indirizzi campione Nord/Centro/Sud/isole;
10. ordine E2E.

### Checkout language
Paese Italia, EUR, ma lingua corrente/default/available = EN/EN/EN-only. Pubblicare e assegnare IT al mercato/domain; poi usare contesto Storefront coerente e verificare checkout anonimo/mobile.

## Ordine remediation
1. **3B.1 INVENTORY — P0**
2. **3B.4 VARIANTS — decisione business/SEO**
3. **3B.2 PUBLICATION — manifest commerciale**
4. **3B.3 IMAGES**
5. **3B.5 MOBILE**
6. **3B.6 SHIPPING — P0**
7. **3B.7 CHECKOUT LANGUAGE**
8. rerun QA 3A
9. ordine E2E autorizzato
10. uscita canary

## Gate 3B.1
Prima di qualsiasi write inventory:
- leggere via Shopify Admin `inventoryPolicy`, `tracked`, location e levels;
- identificare la fonte stock autorizzata per SKU;
- produrre dry-run/manifest con old→new;
- non inferire quantità mancanti;
- non usare 0 come fallback di un missing;
- richiedere approvazione esplicita prima del primo write.


## 3B.1A — Inventory Admin read access blocker

Il preflight è stato interrotto senza write. Dopo il rinnovo dell'accesso Shopify, il canale disponibile espone solo SKU, prezzo, stato e identificativi prodotto/variante. Non espone location, `inventoryItem.tracked`, `inventoryPolicy` o inventory levels per location.

Conseguenze:
- non è possibile spiegare in modo affidabile perché `OG_257799`, `OG_426481` e `OG_797988` risultino acquistabili;
- non è possibile preparare un manifest inventory old→new senza inventare stato corrente;
- lo stato provvisorio è **BLOCKED BY SHOPIFY CONFIG ACCESS**, che indica insufficienza del canale di lettura e non configurazione Shopify errata.

Opzioni di sblocco:
1. endpoint Edge Function Admin-only, strettamente read-only, che interroga Shopify Admin per locations, tracking, policy e levels;
2. export CSV inventario da Shopify Admin da analizzare offline.

Prima di qualsiasi write inventory resta obbligatorio un dry-run con quantità sorgente certa, location e old→new espliciti.

## 3B.1A — Rerun 2 ottobre 2026

Account Shopify ricollegato; letture eseguite solo su OG_257799 (variante 55507146146132), OG_426481, OG_797988: tutti ACTIVE, monovariante. Il canale espone ancora solo ID, SKU, prezzo, stato: nessun `tracked`, `inventoryPolicy`, location, inventory level, available/committed. Nessun canale read-only Admin inventory esistente nelle Edge Function. Nessuna write.

Esito: **3B.1A INVENTORY CONFIG — BLOCKED: canale Shopify senza dati inventory/location.**

## 3B.1B — Catalog readiness (3 ottobre 2026)
Audit read-only: 2.560 READY_FOR_SALE, 55 NEEDS_REVIEW, 89 NOT_READY, 2 STRUCTURAL_REVIEW; 421 mappati, 980 prodotti da creare; stock-20 proposto per 1.472 varianti. Nessuna write. Dettagli: `catalog-readiness-stock20-3B1B.md`. Stato: WAITING FOR OWNER APPROVAL.

## Aggiornamento 3B.1C (2026-10-03)
Il finding "165 variation come prodotti separati" è corretto in: 2 variation standalone + 147 parent variable live a variante singola senza figlie (151 variation mancanti). Manifest finale: UPDATE_EXISTING 313, CREATE_VARIABLE_PARENT 941, CREATE_VARIANT 1.006, RESTRUCTURE_REQUIRED 300, SKIP 146; stock-20 su 1.472 unità. Dettagli in `shopify-structure-reconciliation-3B1C.md`. Nessuna write.

## Aggiornamento 3B.1D (2026-10-03)
Canary BLOCKED senza write: nessun mezzo per impostare quantità 20 (manca inventory write e token Admin). Vedi `shopify-canary-write-3B1D.md`.

## Aggiornamento 3B.1F (2026-10-03)
Canary `OG_257799` completato con esito PASS: `tracked false→true`, policy `DENY` invariata, `available/on_hand 0→20`, location `gid://shopify/Location/117678014804`, nessuna modifica estranea. Dettagli in `stock20-canary-3B1F.md`.

## Aggiornamento 3B.1G (2026-10-03)
Preparato executor server-side per batch massimo 25, dry-run di default, manifest privato server-side, validazioni fail-fast, quantità assoluta 20, idempotenza Shopify nativa e report per item. Nessuna chiamata o write live. Il repository non contiene i record del manifest 3B.1C: Lovable deve fornire l'export inventory read-only e installare il batch approvato senza versionare dati privati. Dettagli in `stock20-batch-executor-3B1G.md`.

Stato: **STOCK-20 BATCH EXECUTOR CODE READY / LIVE BATCH NOT YET EXECUTED**.

## Aggiornamento 3B.1G live dry-run (2026-10-03)
Batch `stock20-3b1g-batch-001` (25 SKU simple UPDATE_EXISTING) installato come configurazione server-side; DRY_RUN live unico: 0 FAILED, 0 drift, 0 stop, 25 `SET_AVAILABLE_20` pianificate, zero write. EXECUTE ancora disabilitato. Dettagli in `stock20-live-dry-run-3B1G.md`.

## Aggiornamento 3B.1G live EXECUTE batch #1 (2026-10-03)
Batch `stock20-3b1g-batch-001`: 25/25 UPDATED a available=20 (tracked/DENY invariati), 0 FAILED, 0 recovery; gate EXECUTE eliminato subito dopo. Dettagli in `stock20-live-execute-batch1-3B1G.md`.

## Chiusura 3B.1H e avvio 3B.2 (2026-10-03)

Lo scale-out stock batch 001–013 è concluso: **306 inventory item verificati a 20**, tracking attivo, policy `DENY`, zero failed e zero recovery. Le famiglie strutturali e gli SKU test sono rimasti esclusi; il gate EXECUTE stock è disabilitato e il manifest secret stock può essere rimosso dopo la verifica operativa finale.

Il passo successivo è 3B.2: creazione controllata dei parent/variant Shopify mancanti. L'executor è preparato code-first con manifest privato server-side, DRY_RUN di default, ledger idempotente e canary massimo una famiglia; nessun deploy o write live è stato eseguito. I conteggi 3B.1C nel repository restano storici finché non vengono ricomputati dagli input privati. Vedi `shopify-create-executor-3B2.md`.

## Aggiornamento 3B.2 Storage scale-out (2026-10-03)

La PR #27 è stata integrata con merge `c6fc3b199e5e8dca21f0debb235677abb10e6be0`; il successivo canary `OG_111899` è PASS: parent `DRAFT`, una variante, stock 20, tracked, `DENY`, media `READY`, zero duplicati e gate EXECUTE rimosso. L'handoff docs-only della PR #28, basato sul vecchio secret manifest, è quindi superato e non deve essere eseguito. L'export owner-approved classifica 903 famiglie `SAFE_CREATE`, ma il secret manifest limita il batch a circa cinque famiglie e rende impraticabile la rotazione manuale.

Forward-fix code-first: bucket Supabase Storage privato `shopify-create-manifests`, indice metadata-only con SHA-256, batch massimo 10, loader server-side service-role, request senza manifest/path/SHA, pinning `approvalDigest` fra DRY_RUN, EXECUTE e VERIFY, builder deterministico e runner sequenziale con resume. 903 famiglie corrispondono a 91 batch; il conteggio varianti reale sarà stampato dagli input privati al rollout. Tutti i prodotti restano `DRAFT` e la pubblicazione è disabilitata.

Stato: **STORAGE SCALE-OUT CODE READY / NON DEPLOYATO / NESSUNA WRITE LIVE**. Servono migration bucket, upload privato, deploy della sola Edge Function, DRY_RUN del primo batch e autorizzazione separata per la finestra EXECUTE. Dettagli in `shopify-create-scaleout-3B2.md`.

## Aggiornamento 3B.2 completato e fast track 3B.3/3B.4 (4 ottobre 2026)

Lo scale-out reale ha completato i batch 002–092: 903 famiglie e 930 varianti sono presenti in Shopify come `DRAFT`, con stock 20, tracking attivo, policy `DENY`, 0 failed, 0 media pending e nessun duplicato. Il gate create è OFF.

La verifica finale ha distinto 889 famiglie riconciliate e 14 famiglie esistenti bloccate esclusivamente dal confronto descrizione: `OG_238559`, `OG_341476`, `OG_422411`, `OG_489489`, `OG_538594`, `OG_553492`, `OG_644838`, `OG_728356`, `OG_746747`, `OG_778338`, `OG_839472`, `OG_847151`, `OG_865363`, `OG_942831`.

Sono stati predisposti due workflow isolati e non distribuiti: 3B.3 aggiorna solo `descriptionHtml` sul prodotto già mappato, con ORIGINAL approvato e stop `STATE_DRIFT`; 3B.4 pubblica solo prodotti che superano nuovamente tutti i gate, impostando `ACTIVE` e pubblicando esclusivamente su `Online Store`.

Le esclusioni strutturali (`OG_152965`, `OG_891874`, `OG_758263`, `OG_393883`, TEST e `RESTRUCTURE_REQUIRED`) restano fuori. Il conteggio globale `READY_TO_PUBLISH` deve provenire dal nuovo export Admin read-only descritto nei documenti 3B.3/3B.4.

Stato: **FINAL PRODUCT WORKFLOW CODE READY / PUBLICATION PENDING / POST-LAUNCH RESTRUCTURE DEFERRED**.

## Rimandato post-launch (fast track 5/10/2026)
- 14 descrizioni bloccate (3B.3)
- Riconciliazione media ledger OG_779932 (RESERVED) / OG_461758
- Backlog strutturale/restructure
- Catalogo non 3B.2
- Decisione canale: pubblicare anche sul canale del sito (Lovable/Headless) e/o rimuovere la password del negozio, poi ripetere il controllo vetrina del canary

## Prossimo passo 3B.4 (5 ottobre 2026)
Estendere `shopify-publication-batch` a un publication set fisso (Online Store + Headless + Lovable), rigenerare i manifest 002–037 con nuovi SHA, ridistribuire solo quella funzione, poi DRY_RUN/EXECUTE/VERIFY per lotto. Richiede autorizzazione esplicita.
