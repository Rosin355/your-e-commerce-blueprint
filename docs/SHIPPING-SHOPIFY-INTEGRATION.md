# Tariffe Shopify Grow — scelta del motore e prova tecnica

**3 novembre 2026 · PR #45 · continuazione da `5ce8883` · LIVE BLOCCATO.** Verifica mirata delle capacità native e delle alternative, senza ripetere audit catalogo/Sendcloud. Zero installazioni, acquisti, mutation Shopify, ordini, merge o deploy.

## Decisione tecnica

**Intuitive Shipping è il candidato raccomandato per un collaudo su development store isolato, non un motore già certificato o autorizzato in produzione.** Copre documentalmente quantificatori sulle righe, tabelle sul totale e CAP/località. Grow è supportato con CCS. Mancano la prova dell'app con il modello per Mercati attivo nello store, la conferma CCS dell'account e il collaudo checkout: non si dichiarano risolti con un simulatore locale. Non serve proporre Plus sulla base delle evidenze raccolte.

## Confronto sintetico: tre alternative

| Soluzione | Grow, costo e CCS | Carrelli misti A/B e soglie | Isole / CAP disagiati | Sendcloud e limiti |
|---|---|---|---|---|
| **Shopify nativo: spedizione per Mercati** | **Già attivo nello store**, costo incrementale 0 €, senza CCS per tariffe fisse | Una sola opzione applica il **massimo**, non la somma, tra tariffe per collezioni. Poiché A ≥ B, il misto può dare A. Serve partizione A/B completa per variante: A su tutti annulla B; nuovi prodotti senza appartenenza A possono lasciare B erroneamente. Fasce sul totale ordine disponibili. | Mercati regionali documentati e flag disponibile; nessun predicato CAP/località arbitrario verificato nel modello letto. Sicilia/Sardegna solo candidate. | Logistica Sendcloud indipendente. **Copertura completa non dimostrata** per geografia e fallback dei nuovi prodotti. |
| **ShipX: Delivery Customization** | Grow documentato, selezione di opzioni esistenti **senza CCS**. Starter **9,99 USD/mese**; il generatore di tariffe è un percorso diverso, con CCS e funzioni prodotto avanzate nel piano Smart **19,99 USD/mese**. | Nasconde/ordina/rinomina prezzi già esistenti, non crea importi. Documenta ALL/ANY/NONE tra **condizioni** e SKU; non dimostra ALL sulle **righe** del carrello. Non selezionato senza questa prova e senza collaudo con Mercati. | ZIP/CAP documentati; CAP condivisi fra località e regole complementari da provare. | Sendcloud può restare. Limite documentato 25 personalizzazioni; non basta la pubblicità “product rules” per garantire il misto. |
| **Intuitive Shipping** | Grow **con CCS**, checkout Shopify nativo. Growth **70 USD/mese**, 500 ordini inclusi; sandbox gratuita. CCS incluso con fatturazione Shopify annuale oppure supplemento su Grow: fornitore indica **20 USD/mese**, importo specifico da confermare con Shopify. | Documentati **All products / Any product / No products**, SKU e tariffa custom **Total**, soglie inclusive e fascia finale illimitata. Blueprint A/B completo sotto; semantica provata offline, app non eseguita. | Zone/subzone CAP e condizioni City/Postal code; lista operativa ancora vuota. Regioni candidate separate. | Sendcloud resta per etichette. **Compatibilità specifica Mercati, CCS attivo, sconti e gruppo unico ancora da collaudare**. |

Costi pubblicati al 3 novembre 2026, senza conversioni in EUR o preventivi fiscali. Il ciclo di fatturazione e CCS dello store non sono stati accertati: zero carrier services non significa CCS disabilitato. [Prezzi Intuitive](https://apps.shopify.com/intuitive-shipping), [requisiti Intuitive](https://knowledge.intuitiveshipping.com/faq-page), [CCS Shopify](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/carrier-accounts), [prezzi ShipX in USD](https://www.logbase.io/products/shipx-shipping-rates-and-rules), [funzioni incluse Starter](https://apps.shopify.com/shipping-rates), [manuale condizioni ShipX](https://shipx.helpkit.so/delivery-customization-without-ccs-api/8jJcSMAS3Pn4ZqTxMFmBTV/delivery-customization-scenarios/8jJcSMAS3PfuhbSuNTubNK).

## Capacità native effettivamente lette

Le query read-only restituiscono piano **Grow**, `shopifyPlus=false`, `marketDrivenShipping=true`, `subCountryMarketsEnabled=true`. La UI conferma «La spedizione è stata spostata su Mercati». Mercato Italy `112143401300`, opzione Standard attiva `1464001134932`, applicata a tutti i prodotti, gratuità da 55 €. [Risposte API e osservazioni UI](shipping-evidence/2026-11-03/engine-selection/native-capabilities.json).

Il modello consente tariffe per collezione prodotto/variante, sede e importo ordine; il selettore osservato offre collezioni, non condizioni dirette su `logistics.shipping_class`. Le classi possono alimentare collezioni, previa prova della selezione esatta delle varianti. **Nella stessa opzione** vale il massimo delle tariffe; tra opzioni diverse e per spedizioni multiple possono esserci somme. Il modello non garantisce per sé ALL sui prodotti o fallback A per ogni futuro sconosciuto. Esempi riproducibili: B puro da 15 € deve costare 5,90 €, ma A applicata indiscriminatamente lo porta a 8,90 €; B + sconosciuto da 45 € senza copertura A può restare a 5,90 € invece di 11,90 €. [Semantica nativa Shopify](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market), [configurazione](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/setting-up-shipping-options).

Il mercato Italia attuale include 110/110 province e non permette di espanderle singolarmente in quel dialogo. Questo **non prova l'assenza globale dei mercati regionali**, che il flag e la documentazione supportano. Non è stata verificata una tariffa nativa per CAP/località arbitrari: resta il divario geografico per le future zone disagiate.

**Correzione della preparazione precedente:** Shopify sposta la configurazione merchant su `Market.delivery.shipping`; le API dei profili merchant sono deprecate per gli store migrati. `shipping/prepare.mjs` ora verifica il modello e genera `proposedVariables=null`, `rollback=null`, `deploymentCandidate=null`. Il file storico `profile-target-input.graphql` e i precedenti input/rollback di profilo sono **SUPERATI, NON ESEGUIRE su questo store**. Il loro superamento non invalida il backup storico o le tabelle commerciali. Per le app carrier sulle sedi del merchant Shopify richiede un adattamento specifico: non si presume che la sola presenza in App Store dimostri compatibilità con Mercati. [Guida tecnica Shopify](https://shopify.dev/docs/apps/build/orders-fulfillment/market-driven-shipping/upgrade-your-app).

## Blueprint Intuitive e prova riproducibile

Quattro scenari mutuamente esclusivi: A-standard, A-speciale, B-standard, B-speciale. In ciascuno `All conditions` combina IT, area e condizione prodotto; il quantificatore prodotto è un controllo distinto:

- **B:** Product SKU Equals elenco SKU approvati, **All products**. Lista valori OR, non condizioni separate in AND.
- **A:** Product SKU Does not equal lo stesso elenco, **Any product**. Una riga ordinaria/sconosciuta deve imporre A; SKU vuoti/duplicati e varianti dello stesso prodotto con classi diverse sono casi obbligatori di collaudo.
- **Totale:** disattivare `Match product filters to conditions`, lasciare **No product filters**. In caso contrario bulbi 150 € + arbusto 10 € rischiano A sul solo arbusto: 8,90 € anziché A sull'intero 160 € = 17,50 €.
- **Metodo:** Custom shipping rates, tipo `Total`, righe `Up to` inclusive derivate dalle tabelle A/B, ultima `~`, `Per unit` vuoto, `Return the highest applicable rate row`. Niente somma righe, splitting, blending, costi prodotto, ricarichi, arrotondamenti o soglie gratuite aggiuntive.
- **Sconti:** abilitare `Enable discount fetching`, disattivato di default. L'equivalenza del totale effettivo con le soglie Shopify va verificata con sconti riga/ordine, quantità, imposte e checkout rapido. Eventuali sconti spedizione Shopify possono sovrascrivere la tariffa: politica da includere nel collaudo, non modificata qui.
- **Geografia:** area speciale da elenco approvato CAP + eventuale località, standard come complemento. Nessuna lista regionale definitiva, CAP numerico inventato o esclusione pubblicata. Apple Pay/Google Pay possono passare solo il CAP: se la futura mappa richiede località entro lo stesso CAP, il comportamento con indirizzo incompleto è un gate obbligatorio.

[Quantificatori, filtri e indirizzi](https://knowledge.intuitiveshipping.com/create-a-scenario), [tabelle e soglie](https://knowledge.intuitiveshipping.com/create-a-custom-service-shipping-method), [zone e subzone](https://knowledge.intuitiveshipping.com/create-a-zone), [SKU multipli, sconti, limiti checkout rapido e CCS](https://knowledge.intuitiveshipping.com/faq-page). Queste sono istruzioni tecniche del fornitore, non inferenze dalla descrizione commerciale.

```sh
node --require ./ci/offline-network.cjs shipping/prove-engine.mjs
npm run test:shipping
npm run shipping:prepare
```

La prima prova rigenera [blueprint manuale con fixture](shipping-evidence/2026-11-03/engine-selection/intuitive-blueprint.fixture.json) e [risultati offline](shipping-evidence/2026-11-03/engine-selection/offline-proof.json). Non sono un formato importabile nell'app, un rate provider o una connessione Intuitive. Gli indirizzi sono token simbolici `__QA_*__`, non CAP reali. I 23 nuovi test comprendono selezione ALL/ANY, importo intero, soglie esatte, sconti già attribuiti, località con CAP condiviso, sconosciuti e rifiuto di gruppi multipli. **325 test spedizioni PASS; zero casi eseguiti nell'app/checkout.** La precedente matrice di 720 casi rimane preparata e non eseguita.

## Collaudo successivo: criteri di accettazione, nessuna esecuzione live

Dopo decisione del proprietario, il collaudo richiede un **nuovo development store con preview Market-driven shipping**, come indicato da Shopify, oppure un ambiente isolato equivalente. Nessuna installazione su questo store per costruire la prova. Sandbox Intuitive non richiede un piano app pagante, ma visualizzare tariffe di test richiede comunque CCS: se l'ambiente non lo consente, fermarsi prima di attivare abbonamenti o cambiare piano.

La prova deve attestare compatibilità Markets API/posizionamento della tariffa app, entitlement equivalente Grow con CCS, una sola tariffa IT e gruppo di consegna sull'intero carrello, SKU esatto per variante, fallback A per nuovo/assente, tutti i confini A/B, sconti, quantità, destinazioni e indirizzi incompleti. Verificare che altre opzioni native non restino visibili o si sommino alla tariffa app; provare indisponibilità/errore del provider, gruppi multipli e rollback nell'ambiente isolato. Non configurare un fallback che inventi un prezzo errato. Un collaudo su development store privo dei medesimi entitlement non certifica automaticamente Grow.

Sendcloud resta downstream dell'ordine; nessun corriere è necessario per provare le tabelle fisse. Prima del rilascio serviranno geografia/classificazione approvate, connessione logistica già prevista verificata, backup aggiornato **dei Mercati e dell'app**, diff definitivo e autorizzazione live. Nessun esecutore live o `--apply` è stato introdotto; tutti i gate restano falsi. [Audit Sendcloud esistente e conferma della separazione](SHIPPING-SENDCLOUD-AUDIT.md), [policy](../shipping/platform-policy.json), [gate](../shipping/release-gates.pending.json).

**Unica decisione operativa richiesta:** autorizzare il collaudo isolato di Intuitive Shipping in sandbox, senza acquisti e mantenendo la produzione bloccata. Questo non autorizza installazioni live, CCS a pagamento, cambio fatturazione, merge o deploy.
