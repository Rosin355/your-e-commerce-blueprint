# Tariffe Shopify Grow — scelta del motore e prova tecnica

**3 novembre 2026 · PR #45 · continuazione da `5ce8883` · LIVE BLOCCATO.** Verifica mirata delle capacità native e delle alternative, senza ripetere audit catalogo/Sendcloud. Intuitive installata dall’utente nel solo Dev; nessun acquisto, scrittura Shopify produzione, ordine, merge o deploy. Scritture Dev e limiti esplicitati sotto.

## 4 novembre 2026 — Collaudo nativo su Grow

La direzione scelta è Shopify Native Shipping Options by Market su Grow, con Sendcloud per l'evasione. Nel Dev 111269380421 il mercato Italy contiene una sola opzione attiva “Spedizione standard”. Le due tariffe per importo sono assegnate a collezioni complementari. B comprende bulbo e pianta grassa tramite approvazione esplicita. A comprende arbusto e sconosciuto in assenza del tag di approvazione. Intuitive e Standard dimostrativa risultano inattive.

Il checkout Dev per due bulbi da 30 € mostra 5,90 €. Il controllo del browser si interrompe prima dei risultati sui misti e della cattura dello screenshot. Soglie, sconti e gruppi separati restano da collaudare. Le prove Intuitive precedenti sono storiche e non concorrono al verdetto nativo. [Configurazione, prima lettura e ripristino](shipping-evidence/2026-11-04/native-shipping/README.md)

Il percorso a costo incrementale di licenza 0 € consiste in un'opzione nativa con le due collezioni complementari e Sendcloud per l'evasione. I sottomercati per provincia permettono di valutare una fascia isole separata dopo approvazione territoriale. Il modello documentato richiede una decisione commerciale per le eccezioni CAP che ricadono dentro la stessa provincia. Il rilascio produttivo resta bloccato.

## Storico Intuitive — Esito Dev: SANDBOX PASS per la matrice A/B, LIVE BLOCCATO

Solo **Online Garden Shipping Test 111269380421**, Grow simulato, Italia/EUR, preview Market-driven shipping, Intuitive sandbox/Testing. Quattro scenari **154776–154779**, metodi **668877–668880**: B ALL SKU bulbo/grassa, A ANY SKU complementare, nessun filtro prodotti, Total/Combine products, nessuna somma/blending. Sample Scenario archiviato; Standard nativa disattivata reversibilmente nel solo Dev.

**Cart Tester reale: 38 casi validi PASS**, inclusi tutti i **28 confini A/B standard/speciale**, CAP sintetico e totale 160 € con catalogo ripristinato. **Checkout nativo verificato:** B puro 5,90 €, bulbo+grassa 7,90 €, bulbo+arbusto A 11,90 €, sconosciuto impone A, misto 160 € → unica A 17,50 €. Provati nativamente 18,99/19,00 A, tutti i confini B standard e campioni Palermo/Cagliari. Dieci prove native dopo correzione tutte PASS; la copertura completa dei 28 confini resta interna all'app.

**Difetto trovato e corretto:** 2×5,99 € + 7,01 € = 18,99 € dava A 11,90 € anziché 8,90 €. Limiti tecnici finali **x.995** fra centesimi, costi e policy approvati invariati. Stesso controesempio rieseguito nel checkout → **8,90 €**, 19,00 € → 11,90 €. Ipotesi precisione nella somma, causa interna non dimostrata; conferma del workaround da Intuitive ancora richiesta prima della produzione. Conservati due errori storici, non conteggiati come PASS correnti.

Prezzi fixture **15/45/30/10 €** ripristinati e verificati dopo reload, catalogo app reimportato e riletto; ultimo checkout con prezzi originali corretto. CAP **90133/09124/00000** solo sperimentali; 00000 rifiutato dalla validazione Shopify e non usato come prova tariffaria nativa. Nessuna classificazione definitiva delle isole o lista disagiata inventata.

**Grow/CCS/Mercati:** tariffe native dimostrate gratuitamente nel Dev con preview. Nessuna compatibilità produttiva dedotta: ultima lettura live separata mostra CCS da abilitare, costo/entitlement account da confermare. Spesa effettiva **0,00 €**, nessun piano/trial/CCS pagante; produzione, Sendcloud, PR #42, secret, ordini e pagamenti invariati. [Configurazione, risultati distinti, screenshot, limiti e rollback](shipping-evidence/2026-11-03/intuitive-sandbox/README.md).

**Prossimo passo:** validare con Intuitive i limiti tecnici a mezzo centesimo prima di approvare qualsiasi attivazione live. Non è stato inviato alcun messaggio al supporto.

## Storico: development store creato — blocco identità poi risolto

Dopo autorizzazione esplicita è stato creato **Online Garden Shipping Test**, ID **111269380421**, dominio `online-garden-shipping-test.myshopify.com`, organizzazione Online Garden `213529043`: **Development, Grow simulato, Italia, EUR, preview Market-driven shipping**. Quattro fixture fittizie create/rilette, nessun cliente/ordine importato; costo effettivo **0,00 €**, nessun abbonamento/trial.

Il precedente blocco «store mancante» è risolto. **Nuovo blocco:** Shopify richiede la verifica identità dell'utente o del proprietario per installare app di terze parti sul Dev; **Installa Intuitive è disabilitato**. Nessuna app installata, tabella A/B configurata o prova checkout eseguita. I carrier sono accessibili nella UI Dev senza upgrade, ma CCS funzionale con l'app resta da dimostrare. Non si sostituisce il test con il simulatore locale.

**Verifica separata live:** Online Garden è Grow; Account corrieri mostra «Abilita tariffe calcolate di terze parti al check-out» e upgrade, quindi CCS risulta non abilitato secondo la UI. Shopify documenta comunque add-on Grow o fatturazione annuale, senza obbligo di Advanced/Plus; ciclo/prezzo specifico non accertati e nulla attivato. Nessuna compatibilità produttiva dedotta dal Dev. [ID, fixture, otto screenshot, CCS, costi e rollback](shipping-evidence/2026-11-03/development-store/README.md).

**Sblocco necessario:** l'utente/proprietario completa la verifica identità direttamente in Shopify; la pagina Dev è lasciata aperta. Le autorizzazioni gratuite già concesse restano valide. Produzione, Sendcloud, PR #42, secret e pagamenti invariati.

Le sezioni precedenti al collaudo sono conservate sotto come storico; l'assenza iniziale del Dev non è più il blocco corrente.

## Storico: preflight prima della creazione Dev — SANDBOX BLOCKED

Il proprietario ha autorizzato operazioni gratuite e reversibili esclusivamente sul development store isolato, vietando trial a conversione automatica e chiedendo di fermarsi se l'ambiente manca. Il preflight del 3 novembre 2026 alle 13:23:42 UTC ha raggiunto la Dev Dashboard **Online Garden `213529043`**: la pagina Negozi senza filtri mostra **«Nessun negozio per ora»**. Nessun target di test disponibile; il link Crea negozio non è stato seguito. Non è una dichiarazione sull'esistenza di store fuori dall'organizzazione accessibile.

**CCS gratuito, entitlement Grow e Mercati del dev store non verificati; zero prove checkout.** Sandbox Intuitive gratuita documentata, ma nessuna app installata, piano/trial attivato o costo sostenuto (**0,00 €**). Le simulazioni precedenti non sostituiscono il collaudo. Nessuna modifica Shopify/Sendcloud: rollback applicativo non necessario. [Evidenze, test non eseguiti, costi e rollback](shipping-evidence/2026-11-03/engine-selection/SANDBOX-RESULT.md).

**Decisione successiva:** rendere disponibile il development store isolato autorizzato con entitlement Grow e Mercati, per verificare CCS gratuito. L'autorizzazione sandbox è già acquisita; produzione sempre bloccata.

## Decisione tecnica

**Intuitive Shipping è il motore raccomandato per preparare la successiva validazione produttiva, dopo il PASS della matrice mirata nel Dev.** ALL/ANY, totale intero, soglie e CAP campione sono provati nell’app, con conferme nel checkout nativo e Mercati. Il workaround sui confini richiede conferma del fornitore; CCS live, geografia e gli ulteriori gate restano aperti. Nessuna autorizzazione produttiva o necessità di Plus dedotta dal collaudo.

## Confronto sintetico: tre alternative

| Soluzione | Grow, costo e CCS | Carrelli misti A/B e soglie | Isole / CAP disagiati | Sendcloud e limiti |
|---|---|---|---|---|
| **Shopify nativo: spedizione per Mercati** | **Già attivo nello store**, costo incrementale 0 €, senza CCS per tariffe fisse | Una sola opzione applica il **massimo**, non la somma, tra tariffe per collezioni. Poiché A ≥ B, il misto può dare A. Serve partizione A/B completa per variante: A su tutti annulla B; nuovi prodotti senza appartenenza A possono lasciare B erroneamente. Fasce sul totale ordine disponibili. | Mercati regionali documentati e flag disponibile; nessun predicato CAP/località arbitrario verificato nel modello letto. Sicilia/Sardegna solo candidate. | Logistica Sendcloud indipendente. **Copertura completa non dimostrata** per geografia e fallback dei nuovi prodotti. |
| **ShipX: Delivery Customization** | Grow documentato, selezione di opzioni esistenti **senza CCS**. Starter **9,99 USD/mese**; il generatore di tariffe è un percorso diverso, con CCS e funzioni prodotto avanzate nel piano Smart **19,99 USD/mese**. | Nasconde/ordina/rinomina prezzi già esistenti, non crea importi. Documenta ALL/ANY/NONE tra **condizioni** e SKU; non dimostra ALL sulle **righe** del carrello. Non selezionato senza questa prova e senza collaudo con Mercati. | ZIP/CAP documentati; CAP condivisi fra località e regole complementari da provare. | Sendcloud può restare. Limite documentato 25 personalizzazioni; non basta la pubblicità “product rules” per garantire il misto. |
| **Intuitive Shipping** | Grow **con CCS**, checkout Shopify nativo. Growth **70 USD/mese**, 500 ordini inclusi; sandbox gratuita. CCS incluso con fatturazione Shopify annuale oppure supplemento su Grow: fornitore indica **20 USD/mese**, importo specifico da confermare con Shopify. | Documentati **All products / Any product / No products**, SKU e tariffa custom **Total**, soglie inclusive e fascia finale illimitata. Matrice mirata A/B provata nel Dev e nel checkout; limiti tecnici a mezzo centesimo dopo difetto riprodotto e corretto. | Zone/subzone CAP e condizioni City/Postal code; lista operativa ancora vuota. Regioni candidate separate. | Sendcloud resta per etichette. Mercati/CCS funzionali nel Dev; CCS live, sconti, gruppi multipli e conferma del workaround ancora da validare. |

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
- **Metodo:** Custom shipping rates, tipo `Total`; policy commerciale in centesimi invariata, limiti tecnici finali `x.995` verificati nel Dev dopo il difetto sul confine. Ultima `~`, `Per unit` vuoto, `Return the highest applicable rate row`. Niente somma righe, splitting, blending, costi prodotto, ricarichi, arrotondamenti o soglie gratuite aggiuntive.
- **Sconti:** abilitare `Enable discount fetching`, disattivato di default. L'equivalenza del totale effettivo con le soglie Shopify va verificata con sconti riga/ordine, quantità, imposte e checkout rapido. Eventuali sconti spedizione Shopify possono sovrascrivere la tariffa: politica da includere nel collaudo, non modificata qui.
- **Geografia:** area speciale da elenco approvato CAP + eventuale località, standard come complemento. Nessuna lista regionale definitiva, CAP numerico inventato o esclusione pubblicata. Apple Pay/Google Pay possono passare solo il CAP: se la futura mappa richiede località entro lo stesso CAP, il comportamento con indirizzo incompleto è un gate obbligatorio.

[Quantificatori, filtri e indirizzi](https://knowledge.intuitiveshipping.com/create-a-scenario), [tabelle e soglie](https://knowledge.intuitiveshipping.com/create-a-custom-service-shipping-method), [zone e subzone](https://knowledge.intuitiveshipping.com/create-a-zone), [SKU multipli, sconti, limiti checkout rapido e CCS](https://knowledge.intuitiveshipping.com/faq-page). Queste sono istruzioni tecniche del fornitore, non inferenze dalla descrizione commerciale.

```sh
node --require ./ci/offline-network.cjs shipping/prove-engine.mjs
npm run test:shipping
npm run shipping:prepare
```

La prima prova rigenera [blueprint manuale con fixture](shipping-evidence/2026-11-03/engine-selection/intuitive-blueprint.fixture.json) e [risultati offline](shipping-evidence/2026-11-03/engine-selection/offline-proof.json). Non sono un formato importabile nell'app, un rate provider o una connessione Intuitive. Gli indirizzi sono token simbolici `__QA_*__`, non CAP reali. I 23 nuovi test comprendono selezione ALL/ANY, importo intero, soglie esatte, sconti già attribuiti, località con CAP condiviso, sconosciuti e rifiuto di gruppi multipli. **Storico offline: 325 test spedizioni PASS; a quel momento zero casi app/checkout.** Le prove reali successive sono documentate in apertura. La precedente matrice di 720 casi rimane preparata e non eseguita.

## Gate prima di un eventuale rilascio live

Il Dev isolato con preview esiste e la matrice mirata è completata senza acquisti. Il PASS è circoscritto ai casi registrati sopra; non abilita la produzione. Nessuna installazione sul negozio reale, selezione piano app o acquisto CCS eseguiti. Conferma del fornitore sul workaround e CCS effettivo Grow restano gate separati.

La prova deve attestare compatibilità Markets API/posizionamento della tariffa app, entitlement equivalente Grow con CCS, una sola tariffa IT e gruppo di consegna sull'intero carrello, SKU esatto per variante, fallback A per nuovo/assente, tutti i confini A/B, sconti, quantità, destinazioni e indirizzi incompleti. Verificare che altre opzioni native non restino visibili o si sommino alla tariffa app; provare indisponibilità/errore del provider, gruppi multipli e rollback nell'ambiente isolato. Non configurare un fallback che inventi un prezzo errato. Un collaudo su development store privo dei medesimi entitlement non certifica automaticamente Grow.

Sendcloud resta downstream dell'ordine; nessun corriere è necessario per provare le tabelle fisse. Prima del rilascio serviranno geografia/classificazione approvate, connessione logistica già prevista verificata, backup aggiornato **dei Mercati e dell'app**, diff definitivo e autorizzazione live. Nessun esecutore live o `--apply` è stato introdotto; tutti i gate restano falsi. [Audit Sendcloud esistente e conferma della separazione](SHIPPING-SENDCLOUD-AUDIT.md), [policy](../shipping/platform-policy.json), [gate](../shipping/release-gates.pending.json).

**Stato corrente:** Intuitive configurata nel Dev, sette casi interni validi; SANDBOX BLOCKED per controllo browser della preview/app. Confini esatti e checkout da completare, catalogo da confermare dopo prezzi ripristinati. Installazioni live, CCS a pagamento, cambio fatturazione, merge e deploy restano esclusi.
