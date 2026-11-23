# Online Garden · verbale di chiusura tecnica del 22 novembre 2026

**Verbale successivo.** [Esiti del consenso headless e operazioni da autorizzare, 23 novembre](#consenso-sulla-vetrina-headless-del-23-novembre-2026)

**Seguito autorizzato del 22 novembre.** Il selettore raggiunge 69/69 nel modello isolato. La soppressione locale del solo script Visitor Analytics azzera gli invii osservati nei due profili trattati. Restano aperte la verifica del selettore nel checkout Grow e quella dell’interruttore Lovable. SAL 57,75%. [Rapporto unico delle due prove](PROVE-ISOLATE-SPEDIZIONI-ANALYTICS-2026-11-22.md)

**Esito per Marco.** Il negozio può ricevere acquisti e mostrare i nuovi ordini ai clienti autenticati. La consegna commerciale completa resta aperta per tariffe insulari, pubblicazione delle informative, consenso, 301, prova d’ordine e accettazione personale. Lo storico WooCommerce ha una dipendenza documentale distinta.

## A. Lavori completati

| Ambito | Stato | Riscontro concreto |
|---|---|---|
| Vetrina, ricerca, varianti e carrello | COMPLETED per il percorso provato | Homepage e catalogo a 1280/390 px senza overflow, ricerca «rosa», formato aggiornato su Aucuba japonica Crotonifolia, carrello e checkout con prezzo prodotto corretto. |
| Account e Admin | COMPLETED per gli ingressi e il rilascio tecnico r2 | Entrambe le route clienti raggiungono il modulo Shopify HTTP 200. /admin presenta l’ingresso personale. Ricontrollati quattro chunk Admin e l’entry pubblica. Il precedente riscontro del titolare documenta un proprio ordine. |
| Safari e iOS | COMPLETED nel perimetro indicato | Safari desktop macOS verificato il 21/11 sulla stessa build. Il 22/11 Safari su simulatore iPhone 17 iOS 26.3.1 ha raggiunto il modulo Shopify e, con Indietro, è tornato in vetrina. L’iPhone fisico e l’accessibilità personale di Marco restano da collaudare. |
| Preventivi, copertura e dati di prova | COMPLETED per la misurazione | 69 preventivi veri su 23 destinazioni. 42 conformi, 27 difformi. Nove importi riletti nel checkout ospitato con A, B e misto. Su tutti i carrelli osservati una sola opzione pagante. [Preventivi](evidence/shipping-islands-2026-11-22.csv) · [Checkout](evidence/checkout-islands-2026-11-22.csv) |
| Contenuti, privacy e cookie | COMPLETED per confronto e inventario pubblico | Unica policy Shopify letta integralmente e verificata nel dialogo del checkout. Cinque testi candidati pronti alla revisione. POST eventi hosting accettato HTTP 202 al primo accesso senza scelta. Il blocco simulato nel browser preserva carrello, checkout, informativa e ingresso account. |
| SEO e DNS | COMPLETED per rilievi e prova offline | Inventario IONOS confrontato con entrambi i nameserver Cloudflare preparati. DS assente presso .it, uno scostamento DKIM identificato. 16 target raggiungibili, 0 redirect prodotto attivi secondo la matrice. Sitemap 1.349 URL, robots e canonical verificati. |
| Test software | COMPLETED | Typecheck e build superati. 295 casi sulle regole di spedizione del ramo di riferimento, 384 simulazioni positive sui redirect, 28 test auth, 73 test offline su preflight e storico, 16 test browser sintetici. Il confronto automatico con il listino segnala correttamente 27 difformità reali. |

## B. Lavori da approvare

**READY FOR APPROVAL** per la prova del selettore di spedizione in ambiente isolato, la scelta su Visitor Analytics e il protocollo del singolo ordine sandbox. Sono disponibili testi e registro delle informazioni ancora da completare. La pubblicazione in Shopify, il cambio DNS e l’attivazione tariffe hanno condizioni e autorizzazioni autonome nel medesimo modulo. [Unica richiesta al titolare](FINAL-CLIENT-APPROVALS.md) · [Fascicolo legale](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md)

## C. Lavori tecnici ancora aperti

- **Spedizioni.** Nove località di province miste restituiscono il prezzo Italia in tutti i tre carrelli. A Portoferraio, rispettivamente 8,90 / 5,90 / 11,90 € anziché 9,60 / 6,90 / 12,50 €. A Lipari funzionano già le tariffe speciali. Verificare classe, geografia completa, opzione singola, express e rollback prima di attivare qualsiasi modifica. [Soluzione tecnica e limiti](SHIPPING-MINOR-ISLANDS-DECISION-2026-11-22.md)
- **Dati personali, recesso e checkout.** Classificare telemetria hosting, wallet e pixel Shopify. Validare la configurazione di consenso per regioni/servizi. Il profilo resi predefinito non presenta regole nell’API. Collaudare il percorso elettronico, inclusi ospiti e ricevuta, prima di inserirlo nelle condizioni. [Cookie e test](../legal/CANDIDATE-COOKIES-2026-11-22.md) · [Recesso](../legal/CANDIDATE-RETURNS-2026-11-22.md)
- **Ordine, notifiche e Sendcloud.** Applicazione Sendcloud installata, nessun carrier service registrato. Il pannello Integrazioni Sendcloud aperto dal profilo tecnico porta alla pagina di login. Tre conferme di ordini pregressi hanno un evento di invio. Per leggere le impostazioni e le anteprime dei template la sessione tecnica disponibile riceve «non ha l’autorizzazione». Ricezione cliente/staff, mapping effettivi, regole di automazione, recesso e rimborso richiedono il collaudo circoscritto. Nessun ordine/pagamento, etichetta, invito o cambio di stock in questa esecuzione.
- **PENDING CLIENT ACCEPTANCE.** Admin V2 al 85% e area clienti 5/8: OTP/scadenza reale, logout/rientro e separazione su due identità distinte ancora aperti. [Checklist personale unica](PRODUCTION-HANDOVER.md#unica-checklist-di-accettazione-personale)

## D. Dipendenze esterne

**BLOCKED EXTERNAL** per la lista aggiornata di copertura/alias del servizio di consegna e i riscontri del provider su telemetria, per le impostazioni leggibili solo da un operatore autorizzato, per l’export completo delle zone e l’accesso al gestore della delega. Confermare lo scostamento DKIM e coordinare TLS prima della finestra. Lo storico ordini rimane **0/953**: i CSV conservano soltanto i conteggi, il TAR disponibile è troncato. L’eventuale disponibilità di un altro backup presso il fornitore non è determinata. Anagrafiche: 857 acquirenti, 848 candidati, 8 in quarantena e 1 riscontro email da confermare. Zero profili creati o associati.

**NOT REQUIRED per questo intervento**: nuova autenticazione, modifica SQL/RLS, cambio di piano, riclassificazione dei 161 B e nuovo Publish della vetrina. Il verificatore aggiunto opera su CSV offline. La [PR #65](https://github.com/Rosin355/your-e-commerce-blueprint/pull/65) raccoglie SHA di merge, esiti CI e verbale dopo l’integrazione. L’applicazione in servizio proviene da `ca9050d`, Publish Lovable `1e2d8f2f-2040-4398-99dd-048201ea3be5`, entry `index-DSQ4UzGV.js`. [Versione e procedure di ripristino](PRODUCTION-HANDOVER.md)

## E. SAL per la telefonata

| Voce sulla base originaria | Peso | Avanzamento | Punti |
|---|---:|---:|---:|
| Storefront, UX e SEO base | 20% | 90% | 18,00 |
| Admin V2 e operatività | 15% | 85% | 12,75 |
| Catalogo, checkout e logistica | 15% | 65% | 9,75 |
| Cloudflare, DNS e redirect | 10% | 70% | 7,00 |
| Account e migrazione clienti | 15% | 30% | 4,50 |
| Transazioni WooCommerce | 15% | 5% | 0,75 |
| QA, legale e handover | 10% | 50% | 5,00 |
| **Totale** | **100%** | | **57,75** |

**57,75%, arrotondato al 58%.** Il nuovo lavoro quantifica difetti e completa la preparazione. Nessuna tariffa modificata, policy pubblicata, delega o accettazione personale chiusa. Per questa ragione i pesi e la stima delle macroaree restano quelli del 21/11. I 5/8 misurano il collaudo clienti e i 42/69 misurano i preventivi del campione. Il 5% della migrazione transazionale riconosce la preparazione tecnica. I trasferimenti effettivi sono zero. Marco può valutare una consegna del nuovo negozio con lo storico in un lotto separato. Servono accordo scritto e doppia rendicontazione prima di cambiare il denominatore.

## F. Sequenza fino alla consegna

1. Marco e operatori autorizzati integrano i dati mancanti, aprono i pannelli tecnici in sola lettura e scelgono le righe della [richiesta unica](FINAL-CLIENT-APPROVALS.md).
2. In ambiente isolato provare la regola per isole, i nove scaglioni, i CAP condivisi e i mercati esistenti. Provare soppressione/gating hosting, impostazioni native di recesso e anteprime notifiche. Riesaminare i cinque testi sui risultati.
3. Solo con copertura e revisione firmate, eseguire le operazioni autorizzate nelle rispettive finestre. Collaudare gli importi nel checkout, le informative pubblicate e il ciclo su preferenze. Gestire DNS/301 con backup separato e monitoraggio posta.
4. Eseguire la prova d’ordine concordata, registrare ricezione, annullamento/rimborso e riconciliazione. Marco firma gli esiti dal suo dispositivo. Lo storico conserva la sua specifica di importazione fino al recupero della fonte. [Handover e rollback](PRODUCTION-HANDOVER.md) · [Specifica WooCommerce](../migration/woocommerce-history-2026-11-20.md)

## Consenso sulla vetrina headless del 23 novembre 2026

**PASS sulla build candidata per banner, scelta e trasferimento al checkout. BLOCKED per la chiusura in produzione.** Il 23 novembre il collector Lovable ha risposto HTTP 202 sulla homepage pubblica anche con il bundle React sostituito localmente e zero elementi montati nella radice dell’app. La SAL di produzione resta al **57,75%**. Costo incrementale dell’intervento **0 €**.

### Risultati del collaudo

| Superficie | Esito | Evidenza |
|---|---|---|
| Banner della vetrina | **PASS sul candidato** | Shopify ha restituito una regione italiana nei profili puliti. In home appare «Consenso ai cookie». Il visitatore può accettare, declinare oppure aprire e richiudere le preferenze senza dare il consenso. Il footer permette di riaprire il pannello anche dopo la scelta. Controllati home, scheda prodotto e contatti. |
| Persistenza e revoca | **PASS sul candidato** | Nessuna delle finalità aveva un sì prima della scelta. Rifiuto e revoca persistono alla ricarica. L’accettazione persiste alla visita successiva nello stesso profilo. Su Chromium una seconda scheda prodotto già aperta acquisisce la revoca prima del checkout. |
| Chromium desktop e mobile | **PASS** | Due profili nuovi, desktop e Pixel 7 emulato. Il 23 novembre Shopify ha restituito `IT`. In entrambi, confrontati i flag inviati da `cartCreate` con quelli restituiti nella pagina di checkout per quattro scelte. |
| Safari desktop | **PASS nel profilo privato** | Safari 26.0.1 su macOS. Nella build locale il browser ha mostrato il banner, salvato la scelta granulare e conservato la revoca alla ricarica. Il checkout Shopify ha mostrato il prodotto. Il 23 novembre Web Inspector ha confermato direttamente nella pagina ospitata tutti e tre i flag su «no». |
| Safari mobile | **PASS nel simulatore** | Safari iOS 26.3 su iPhone 17 Pro simulato. Eseguiti primo accesso, rifiuto, ricarica, accettazione, visita su un’altra pagina, preferenze granulari e revoca. L’automazione ha attivato i controlli del DOM e letto i tre rifiuti nella pagina del checkout. La prova riguarda il simulatore. |
| Rete della vetrina candidata | **PASS nelle sessioni osservate** | Nelle due prove Chromium del 23 novembre, prima scelta preceduta dal caricamento del banner, due chiamate all’API privacy e una all’API vetrina. Zero invii facoltativi rilevati dal classificatore sulla vetrina, anche dopo rifiuto, accettazione e revoca. Nelle prove Safari sono stati rilevati i conteggi per fase. Il confronto pubblico Lovable è riportato sotto. |
| Carrello, account clienti e Admin V2 | **PASS nei percorsi ospite** | Articolo presente nel checkout su un altro dominio. Nei controlli Lovable il carrello conserva l’articolo dopo la ricarica. Accesso cliente fino al modulo email Shopify e Admin V2 fino al modulo staff, senza banner sulla schermata staff. |
| Visitor Analytics sul sito pubblico | **BLOCKED** | Il 22 novembre, nei controlli Chromium desktop e mobile, un POST iniziale a `/__l5e/trackevents` ha ricevuto HTTP 202 prima di ogni scelta. Sopprimendo il solo loader nel browser si osservano zero POST nell’intero percorso, con carrello, account e checkout funzionanti. Il controllo indipendente del 23 novembre ha confermato l’invio anche in assenza di React. |
| Classificazione della rete del checkout ospitato | **BLOCKED** | Il checkout ha ricevuto le scelte corrette. Prima della scelta e dopo il rifiuto sono state osservate richieste Shopify di diagnostica errori, metriche di `checkout-web` e `web-pixels-manager`, eventi di identità Shop e richieste a servizi wallet. I nomi e gli host osservati non stabiliscono da soli la finalità di ciascun invio. Occorre qualificare gli eventi residui con il responsabile privacy e, dove necessario, con Shopify. |
| Verifiche software | **PASS** | Typecheck, build Vite, lint mirato, validazione della mutazione sullo schema Storefront 2026-10 e 33 test offline su consenso, comportamento del checkout e autenticazione. |

**Flag ricevuti dal checkout Shopify** nei due profili Chromium del 23 novembre, dopo la navigazione da `onlinegarden.it` al dominio permanente `myshopify.com` del negozio. Ogni prova si è fermata prima del pagamento.

| Scelta sulla vetrina | Analisi | Marketing | Preferenze |
|---|---|---|---|
| Primo accesso, nessuna scelta | Senza risposta | Senza risposta | Senza risposta |
| Accetta | Sì | Sì | Sì |
| Preferenze personalizzate | Sì | No | Sì |
| Revoca | No | No | No |

### Implementazione e ripetibilità

La vetrina carica il banner ufficiale e usa la Customer Privacy API. Shopify determina la regione e fornisce i contenuti configurati dal titolare. L’app trasmette tramite `@inContext(visitorConsent: …)` soltanto i valori espliciti e usa l’URL generato da Shopify per il passaggio al checkout. Il controllo del pannello «Mostra banner dei cookie nel check-out» risultava disattivato nella schermata del titolare. [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy) · [Contesto Storefront](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context) · [Riscontro Shopify Admin](SHOPIFY-ADMIN-SCREENSHOTS-2026-11-22.md)

Nella prima prova il solo SDK Shopify emetteva tre POST Monorail con schema `customer_privacy_api_events/2.0` prima della scelta. La build esclude sulla vetrina le POST diagnostiche riconoscibili di quel servizio e le sue metriche OpenTelemetry anche dopo l’accettazione. Le chiamate che salvano il consenso raggiungono Shopify. Il filtro dipende dal trasporto e dagli schemi utilizzati dall’SDK remoto. Un loro cambiamento richiede la ripetizione del test di rete.

Dalla radice del repository, dopo `npm run build`, eseguire `node scripts/qa/headless-privacy.mjs chromium desktop` e il corrispondente comando con `mobile`. Il test sostituisce nel browser solo l’HTML e gli asset del candidato, lascia raggiungibili Shopify e il checkout e verifica la regione tramite l’API. La prova Safari ha usato la medesima build servita su loopback, Shopify reale e la pagina ospitata del checkout. Le letture del formato serializzato di Shopify servono esclusivamente al collaudo. Per riprodurre il confronto sull’hosting usare `node scripts/qa/probe-visitor-analytics.mjs`. [Prova del candidato](../../scripts/qa/headless-privacy.mjs) · [Confronto controllato Lovable](../../scripts/qa/probe-visitor-analytics.mjs)

### Autorizzazioni e rollback

1. **Visitor Analytics.** In una finestra approvata, registrare le impostazioni iniziali in Lovable e disattivare la sola voce *Project settings → General → Publishing → Visitor analytics*. Il titolare deve accettare la perdita di statistiche visite, clic ed errori browser raccolti da questa funzione. Lasciare attivo Project monitoring. Ripetere il controllo in Italia sul sito pubblicato, inclusi carrello, account, checkout e zero POST prima della scelta. Lovable documenta che, anche quando riceve un segnale di consenso dal banner, conserva alcune misurazioni di base in attesa della scelta. [Documentazione Visitor Analytics](https://docs.lovable.dev/features/analytics#enable-or-disable-visitor-analytics)
2. **Rilascio.** Acquisire la decisione sui flussi residui del checkout e l’approvazione della revisione e del Publish. Nella finestra concordata ripetere la matrice sui domini pubblici e verificare lo stato dei servizi tecnici. Nessuna modifica a Shopify Payments, wallet o configurazione checkout è stata eseguita.
3. **Ripristino.** Prima del Publish annotare la revisione pubblicata e lo stato dei singoli interruttori. Se una funzione del negozio regredisce, ripubblicare la revisione precedente approvata e ricontrollare carrello, account e checkout. Il ritorno alla versione precedente riapre il difetto del banner. Una riattivazione di Visitor Analytics riprenderebbe la raccolta e richiede una decisione distinta del titolare.
