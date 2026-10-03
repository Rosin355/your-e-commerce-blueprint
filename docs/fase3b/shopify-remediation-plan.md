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
