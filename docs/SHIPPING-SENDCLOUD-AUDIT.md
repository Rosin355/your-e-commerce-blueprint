# Sendcloud — audit piattaforma e prezzo checkout

**3 novembre 2026. Stato: Sendcloud confermata come piattaforma logistica; motore checkout Intuitive Shipping collaudato nel solo Dev; sincronizzazione live bloccata.** Nessuna nuova connessione o modifica Sendcloud, subscription, upgrade, etichetta, ordine o addebito. Intuitive è presente esclusivamente nel Dev.

## Intuitive Dev: matrice A/B PASS, Sendcloud isolata

Quattro scenari/metodi Testing nel solo Dev `111269380421`; **38 casi Cart Tester validi PASS** e conferme nel checkout nativo per B puro, B bulbo+grassa, A bulbo+arbusto/sconosciuto, totale 160 €, soglie e campioni Palermo/Cagliari. Il difetto sul confine 18,99 € è stato riprodotto e corretto con limiti tecnici fra centesimi; stesso carrello rieseguito correttamente. Dieci prove native dopo fix PASS, 28 confini completi verificati nell'app. Conferma del workaround dal fornitore ancora necessaria prima della produzione.

**0,00 €**, nessun piano/trial/CCS acquistato, ordine o pagamento. Prezzi fixture ripristinati e catalogo Intuitive risincronizzato. Nessuna connessione Sendcloud Dev o modifica Sendcloud live; nessuna prova ordine→etichetta e nessuna certificazione end-to-end Sendcloud. CCS funzionale nel Dev con Mercati; entitlement/costo CCS Grow reale e geografia operativa ancora aperti. **SANDBOX PASS limitato alla matrice, sincronizzazione live bloccata.** [Evidenze, difetto/correzione e rollback](shipping-evidence/2026-11-03/intuitive-sandbox/README.md).

## Storico: Dev creato, Sendcloud isolata — blocco identità poi risolto

Development store **111269380421**, `online-garden-shipping-test.myshopify.com`, Grow simulato, Italia/EUR e preview Mercati creati gratuitamente. Solo quattro prodotti fittizi, nessuna importazione di clienti/ordini e nessuna app nell'elenco Dev: **Sendcloud produzione non collegata**. Intuitive non installabile finché l'utente/proprietario non verifica l'identità con Shopify; zero prove checkout. Il controllo read-only live rileva CCS da abilitare su Grow, distinto dalla disponibilità UI carrier nel Dev. Nessun costo, trial, abbonamento o modifica Sendcloud/live. [Evidenze e rollback limitato alle fixture Dev](shipping-evidence/2026-11-03/development-store/README.md).

## Storico: collaudo prima della creazione Dev — SANDBOX BLOCKED

Preflight 3 novembre 2026: Dev Dashboard Online Garden accessibile, tabella Negozi «Nessun negozio per ora». Nessun development store isolato identificato; CCS gratuito non verificato. Il collaudo si ferma per ambiente mancante come richiesto, con zero test checkout e costo effettivo 0,00 €. Non sono stati installati Intuitive, attivati trial/piani o modificati Shopify/Sendcloud. **Nessuna interferenza introdotta; prova completa di integrazione non eseguita**, quindi nessun PASS attribuito. Nessun rollback logistico necessario. [Evidenze e prossima decisione](shipping-evidence/2026-11-03/engine-selection/SANDBOX-RESULT.md).

## Aggiornamento PR #45 — separazione dal motore tariffario

Il controllo richiesto sul motore Grow non ripete l'audit account sottostante. È stata verificata separatamente la spedizione per Mercati già attiva nello store. Il confronto raccomanda **Intuitive Shipping solo per un collaudo isolato**, con CCS/Mercati ora provati nel Dev e requisiti live separati; non viene autorizzato alcun abbonamento. [Confronto, costi e prova](SHIPPING-SHOPIFY-INTEGRATION.md).

**Sendcloud può restare per importazione ordini, etichette e spedizioni con tutte e tre le alternative considerate.** La guida ufficiale chiarisce che Sendcloud non importa tariffe in Shopify: prezzi checkout e servizio logistico sono indipendenti. L'ordine Shopify contiene il metodo scelto; Sendcloud può usare il metodo predefinito o la selezione manuale. Le Shipping Rules possono associarlo al servizio del futuro vettore dove disponibili nel piano (guida: Lite o superiore), ma non sono necessarie per definire il listino A/B. Non si promette una mappatura automatica gratuita o una connessione già collaudata. [Fonte Sendcloud](https://support.sendcloud.com/hc/en-us/articles/360049346772-Setting-up-shipping-methods-in-Shopify).

Il flusso candidato è **Intuitive → tariffa nel checkout nativo → ordine Shopify → Sendcloud → etichetta**. Non richiede un connettore diretto Intuitive–Sendcloud né il Dynamic Checkout Sendcloud. Il nome cliente del metodo deve essere stabile e distinto dalla classe interna A/B; il servizio di etichetta verrà associato quando il cliente sceglierà il vettore. Nessuna regola Sendcloud è stata modificata o riaperta in questo intervento.

Le sezioni seguenti conservano l'audit precedente: installazione confermata, connessione interna non verificata. Le osservazioni di allora sul motore non individuato sono superate dal confronto attuale, **non** da una certificazione checkout.

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

È dimostrato il limite del percorso Dynamic Checkout documentato sul piano Grow; **non è ancora dimostrata una soluzione completa solo con le capacità attive**, né la necessità di uno specifico abbonamento aggiuntivo. Nessuna raccomandazione di acquisto sostituisce il collaudo di carrelli misti, CAP/località e base sconti. La precedente preferenza generica per un selettore esterno è superata: il nuovo confronto indica Intuitive solo come candidato al collaudo, non come servizio acquistato o installato.

## Passi di verifica ancora necessari

1. Verificare in una sessione Sendcloud già autorizzata l'integrazione Shopify effettivamente collegata, piano/capacità correnti, template e stato pubblicato. La schermata di collegamento osservata non viene completata automaticamente.
2. Eseguire, dopo decisione del proprietario, il collaudo isolato del candidato Intuitive descritto nel confronto Grow: compatibilità Mercati, CCS, condizioni ALL/ANY sulle righe e tariffa intera. Costi e limiti sono documentati; nessuna attivazione è stata eseguita.
3. Completare approvazioni varianti e mappa geografica: candidati regionali separati dalle regole operative, CAP/località con fonte e decorrenza, nessuna macroregione «Sud».
4. Eseguire staging senza pagamento: B puro, A misto/sconosciuto, prezzo sul totale corretto, zone speciali, quantità, sconti, gruppi multipli, rollback. Conservare un unico profilo se il percorso scelto lo consente e dimostrare nessuna tariffa sommata.
5. Presentare un unico diff operativo completo con richiesta di autorizzazione live. Nessuna sincronizzazione parziale finché il meccanismo resta irrisolto.

## Preparazione eseguibile localmente

`shipping/platform-policy.json` contiene i vincoli cliente; `shipping/sendcloud.mjs` valuta le evidenze e non chiama alcuna API; `shipping/geography.pending.json` contiene le due regioni candidate e una lista operativa vuota; `npm run shipping:prepare` rigenera il piano bloccato. I test specifici distinguono installazione, connessione, idoneità del piano e prova effettiva del prezzo checkout.
