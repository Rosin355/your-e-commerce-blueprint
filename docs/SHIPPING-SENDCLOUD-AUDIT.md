# Sendcloud — audit piattaforma e prezzo checkout

**3 novembre 2026. Stato: Sendcloud confermata come piattaforma logistica; nuovo prezzo checkout non risolto; sincronizzazione live bloccata.** Nessuna nuova connessione, app, servizio, subscription, upgrade, pubblicazione, etichetta, ordine o addebito.

## Decisione del cliente

Sendcloud rimane la piattaforma prevista. Il futuro corriere è una scelta successiva del cliente, non una dipendenza per scrivere le tabelle commerciali. La tariffa all'acquirente deve essere A/B e non il costo della singola etichetta. Sicilia e Sardegna restano candidate provvisorie alla fascia speciale; isole minori e località disagiate sono una mappa configurabile da completare e approvare. Nessun nuovo servizio o abbonamento è autorizzato senza dimostrarne la necessità.

## Evidenze effettive

| Verifica | Risultato | Cosa dimostra |
|---|---|---|
| Admin API, piano store | Grow, `shopifyPlus=false` | Piano effettivo, non solo etichetta storica «Shopify» |
| Admin API, app installate paginate | Sendcloud `AppInstallation/1164702024020` presente | Installazione confermata |
| Admin API, app Dynamic Checkout separata | Non presente nell'elenco completo | Percorso specifico non installato come app separata |
| Admin API, carrier services | 0 | Nessun provider calcolato registrato attraverso questa risorsa |
| Shopify Admin, scheda Sendcloud | «Installata Ieri», estensioni **0 attive**, Functions **0 attive** | Nessuna capacità attiva di queste categorie nella scheda letta |
| Apri app da Shopify | Schermata «Collega Sendcloud con il tuo account Shopify» | Connessione account/pannello **non verificata**, non prova che l'account non esista |
| Interno Sendcloud | Non letto con sessione autenticata | Piano, integrazioni collegate, regole, template e pubblicazione sconosciuti |

Il comando «Inizia a connettere Shopify» non è stato premuto: avvierebbe un collegamento, mentre l'incarico attuale autorizza audit e preparazione. Non sono stati richiesti credenziali, chiavi API o il nome del corriere. [Evidenza delle letture e note UI](shipping-evidence/2026-11-03/sendcloud-followup-audit.json).

Il totale zero dei carrier o delle Functions non prova da solo l'assenza di qualsiasi personalizzazione possibile: è un segnale circoscritto alla risorsa/schermata letta. L'audit generale `deliveryCustomizations` rimane limitato dal permesso mancante, come nel report precedente.

## Tre capacità differenti

| Capacità | Momento e responsabilità | Sufficiente per queste tariffe? |
|---|---|---|
| Sendcloud standard / Shipping Rules | Gestione degli ordini importati e spedizione successiva | **No come fonte del prezzo checkout** |
| Sendcloud Checkout API / Checkout Rules | Configurazione di opzioni nel percorso Checkout API | Non dimostra automaticamente compatibilità col plugin Shopify standard |
| App Sendcloud Dynamic Checkout per Shopify | Integrazione checkout specifica documentata | Il percorso richiede Shopify Plus; store attuale Grow non idoneo |

[Shipping Rules ufficiali](https://support.sendcloud.com/hc/en-gb/articles/10274470454292-Create-your-shipping-rules) · [Checkout Rules ufficiali](https://support.sendcloud.com/hc/en-gb/articles/18580048370705-Checkout-rules) · [Requisiti Shopify Dynamic Checkout](https://support.sendcloud.com/hc/en-us/articles/27525573677201-Shopify-Plus-Dynamic-checkout-app).

La guida Shopify specifica esclude inoltre «Checkout metadata» dalle condizioni supportate da quell'app: non si può proporre di trasferire una classe logistica al Dynamic Checkout tramite metadata senza una prova di un altro percorso compatibile. I predicati ALL/ANY documentati per le Shipping Rules non vanno attribuiti alle Checkout Rules per analogia.

## Architettura e limiti dimostrati

Conservare **Sendcloud per la logistica**, Shopify per carrello/checkout e le tabelle A/B come listino commerciale indipendente dal vettore. Conservare classificazione esplicita per variante, fallback A e geografia separata e versionata. Il futuro listino del corriere completa la mappa delle eccezioni, senza cambiare gli importi commerciali approvati.

Il template nativo di 18 tariffe e il contratto generico di selezione sono **riferimenti condizionali**, non una configurazione Sendcloud pronta. Il generatore produce `deploymentCandidate=null`, mantiene i gate falsi e aggiunge i blocchi derivati dall'audit, anche se qualcuno abilita il vecchio flag `publicAppVerified`. Non esiste una modalità di scrittura live nel pacchetto.

È dimostrato il limite del percorso Dynamic Checkout documentato sul piano Grow; **non è ancora dimostrata una soluzione completa solo con le capacità attive**, né la necessità di uno specifico abbonamento aggiuntivo. Nessuna raccomandazione di acquisto sostituisce il collaudo di carrelli misti, CAP/località e base sconti. La precedente preferenza per un selettore esterno è superata: nessun servizio esterno è ora scelto.

## Passi di verifica ancora necessari

1. Verificare in una sessione Sendcloud già autorizzata l'integrazione Shopify effettivamente collegata, piano/capacità correnti, template e stato pubblicato. La schermata di collegamento osservata non viene completata automaticamente.
2. Individuare e dimostrare un percorso checkout compatibile con il piano effettivo, usando prima le capacità esistenti. Se richiede nuove capacità o costi, documentarne la necessità, copertura e costo prima di richiedere autorizzazione.
3. Completare approvazioni varianti e mappa geografica: candidati regionali separati dalle regole operative, CAP/località con fonte e decorrenza, nessuna macroregione «Sud».
4. Eseguire staging senza pagamento: B puro, A misto/sconosciuto, prezzo sul totale corretto, zone speciali, quantità, sconti, gruppi multipli, rollback. Conservare un unico profilo se il percorso scelto lo consente e dimostrare nessuna tariffa sommata.
5. Presentare un unico diff operativo completo con richiesta di autorizzazione live. Nessuna sincronizzazione parziale finché il meccanismo resta irrisolto.

## Preparazione eseguibile localmente

`shipping/platform-policy.json` contiene i vincoli cliente; `shipping/sendcloud.mjs` valuta le evidenze e non chiama alcuna API; `shipping/geography.pending.json` contiene le due regioni candidate e una lista operativa vuota; `npm run shipping:prepare` rigenera il piano bloccato. I test specifici distinguono installazione, connessione, idoneità del piano e prova effettiva del prezzo checkout.
