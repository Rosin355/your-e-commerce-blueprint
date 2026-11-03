# Scelta motore Grow — evidenze mirate PR #45

**Esito successivo all’autorizzazione: SANDBOX BLOCKED**, nessun development store visibile nell’organizzazione Online Garden accessibile. [Rapporto, costi effettivi, test non eseguiti e rollback](SANDBOX-RESULT.md) · [Evidenza strutturata](sandbox-preflight.json) · [Osservazione UI](sandbox-access-observation.txt).

Continuazione da `5ce8883`, 3 novembre 2026. Audit catalogo e account Sendcloud precedenti conservati, non ripetuti. [Decisione e confronto](../../../SHIPPING-SHOPIFY-INTEGRATION.md).

## Livelli di prova

| Artefatto | Cosa dimostra | Cosa non dimostra |
|---|---|---|
| `native-capabilities.json` | Risposte Admin API effettive e osservazioni UI: Grow, Mercati attivi, mercato/opzione correnti | Abilitazione CCS o ciclo fatturazione; prova di tariffe A/B native |
| `native-*.graphql`, `graphql-validation.json` | Due query read-only eseguite; schema Admin 2026-10 validato | Nessuna configurazione/mutation eseguita |
| `intuitive-blueprint.fixture.json` | Blueprint **manuale** derivato dalle istruzioni tecniche, quattro scenari esclusivi | Non è un export/import del fornitore o un'app installata |
| `offline-proof.json` | Dieci esempi con importi espliciti, contromodelli nativi, semantica simulata | Non chiama Intuitive, Shopify o Sendcloud; non certifica checkout |
| `local-checks.json` | 325 test shipping inclusi nei 668 Node offline, typecheck e lint PASS | Non dimostra runtime app, CCS o Mercati |

## Riproduzione senza rete

Dalla radice del repository con le dipendenze già disponibili:

```sh
node --require ./ci/offline-network.cjs shipping/prove-engine.mjs
npm run test:shipping
node ci/run-domain.mjs node
npm run shipping:prepare
```

Il generatore usa le istantanee precedenti, senza rifare audit live. Nessun flag `--apply`, endpoint, token o installazione. Il vecchio input merchant DeliveryProfile è segnalato storico; il piano corrente non contiene variabili eseguibili per quel percorso. Gli indirizzi della nuova prova sono token simbolici: nessun CAP operativo è stato introdotto.

## Fonti primarie verificate

- [Shopify: semantica delle opzioni per Mercati](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market): massimo entro la stessa opzione, collezioni prodotto/variante, limiti su spedizioni multiple.
- [Shopify: adattamento API a Mercati](https://shopify.dev/docs/apps/build/orders-fulfillment/market-driven-shipping/upgrade-your-app): rilevazione feature, API merchant sostituite, adattamento delle app carrier, preview su nuovo development store.
- [Shopify: CCS su Grow](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/carrier-accounts): supplemento oppure fatturazione annuale; prezzo account specifico non accertato.
- [Intuitive: configurazione Scenario](https://knowledge.intuitiveshipping.com/create-a-scenario): SKU, quantificatori sulle righe, condizioni indirizzo, filtri calcolo separati.
- [Intuitive: tabelle custom](https://knowledge.intuitiveshipping.com/create-a-custom-service-shipping-method): tipo Total, soglie inclusive, ultima illimitata, esclusione somma righe/per-unit/splitting.
- [Intuitive: zone/subzone](https://knowledge.intuitiveshipping.com/create-a-zone): condizioni postali; nessuna mappa reale ricavata da questa guida.
- [Intuitive: FAQ tecnica](https://knowledge.intuitiveshipping.com/faq-page): CCS, sconti disattivati di default, SKU OR, etichette esterne, indirizzo parziale nei checkout rapidi.
- [Intuitive: prezzo ufficiale](https://apps.shopify.com/intuitive-shipping): Growth 70 USD/mese, 500 ordini, sandbox gratuita.
- [ShipX: prezzi ufficiali USD](https://www.logbase.io/products/shipx-shipping-rates-and-rules) e [funzioni dei piani](https://apps.shopify.com/shipping-rates): Starter selector senza CCS, separato dalle tariffe prodotto avanzate Smart.
- [ShipX: condizioni scenari](https://shipx.helpkit.so/delivery-customization-without-ccs-api/8jJcSMAS3Pn4ZqTxMFmBTV/delivery-customization-scenarios/8jJcSMAS3PfuhbSuNTubNK) e [condizioni prodotto](https://shipx.helpkit.so/delivery-customization-without-ccs-api/8jJcSMAS3Pn4ZqTxMFmBTV/product-based-delivery-customization/8jJcSMAS3PBTRMnKR86ju8): ALL tra condizioni non certifica ALL tra righe; limite 25 condiviso, attivazione per scenario.
- [Sendcloud: metodi Shopify](https://support.sendcloud.com/hc/en-us/articles/360049346772-Setting-up-shipping-methods-in-Shopify): prezzo checkout indipendente, default/manuale o regole post-ordine.

## Esito operativo

Intuitive è il candidato **al collaudo**, non una scelta produttiva certificata. La raccomandazione si basa sui controlli configurabili documentati e sui controesempi riprodotti, non sulle recensioni o sulle frasi promozionali. Necessità di acquistare un abbonamento ancora subordinata al superamento della prova app con Mercati/CCS, importi, gruppi e indirizzi. Senza installazioni autorizzate non è possibile produrre una prova di esecuzione del software del fornitore.

Autorizzazione proprietario al collaudo ricevuta. Preflight bloccato: rendere disponibile il development store isolato; nessun acquisto e produzione bloccata. Sicilia/Sardegna rimangono candidate; CAP disagiati da listino futuro, nessun vettore richiesto nuovamente.
