# Online Garden · verbale di chiusura tecnica del 22 novembre 2026

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
