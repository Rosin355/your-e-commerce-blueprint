## Collaudo Admin · stato di rilascio

Il vecchio gestionale ha superato una prova isolata con il nuovo servizio. Sono pronti i file per il ripristino. Il collaudo personale di Marco verrà svolto dopo il rilascio autorizzato. La SAL resta **57,75%**. [Procedura e stato](release/PR71-RELEASE-CHECKLIST-2026-11-24.md#registro-di-preparazione-admin-v2)

## Creazione prodotti · 24 novembre 2026

La versione in revisione permette di creare una bozza con nome, descrizione e prezzo senza inventare codici. I mesi selezionati si ritrovano riaprendo la scheda. Marco potrà confermare l’autonomia sul proprio dispositivo e usare l’AI con i propri permessi dopo l’approvazione del rilascio. La prova tecnica non modifica la SAL del **57,75%**. [Guida per Marco](admin-v2/CLIENT-GUIDE.md)

## Riscontro del responsabile — Visitor Analytics disattivata, 23 novembre 2026

Il responsabile ha comunicato di avere **disattivato Visitor Analytics in Lovable** e di non avere osservato **alcuna richiesta `trackevents` nel Network** dopo la modifica. **Esito: positivo ma limitato al test manuale dichiarato.** La conferma indipendente delle condizioni di test (profilo pulito/Italia, più pagine, Safari, carrello, account e Admin autenticato) resta da eseguire; l'assenza osservata non dimostra l'assenza di qualsiasi altra telemetria. **Project monitoring deve rimanere attivo**, senza riabilitare Visitor Analytics salvo decisione distinta.

La [PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69) resta **OPEN** sul commit `a5f319ace864b398f43285bb9471d6cd5bd1ef12`: banner headless e trasferimento consenso testati solo sul candidato, non ancora pubblicati. **Classificazione della diagnostica Shopify Monorail e dei flussi checkout/wallet ancora PENDING**, senza dedurne finalità dal solo HTTP 200. Prima di merge/Publish: conferma tecnica e privacy sugli eventi residui e autorizzazione del rilascio, poi prove sul pubblico di consenso/rifiuto/revoca, carrello, checkout, login clienti e staff. SAL ufficiale 57,75% invariata.


## Checkpoint privacy — 23 novembre 2026, PR #69 HEAD a5f319a

**Verificato su GitHub:** [PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69) **OPEN**, non integrata né pubblicata. HEAD `a5f319ace864b398f43285bb9471d6cd5bd1ef12`, CI passata. La revisione rimuove l'intercettazione globale di `window.fetch` e il generatore di risposte sintetiche HTTP 204; il banner e il trasferimento del consenso al checkout restano funzionanti sul candidato.

**Importante distinzione privacy:** 3 POST `customer_privacy_api_events/2.0` a Shopify Monorail prima della scelta (HTTP 200) sono **diagnostica tecnica osservata**. L'HTTP 200 da solo non stabilisce se si tratta di tracciamento facoltativo o di trattamento tecnico necessario. Servono finalità, payload minimo, retention, basi, ruoli e conferma Shopify/referente privacy per classificarle. Evitare wrapper, blocchi globali fetch/XHR/sendBeacon e workaround non supportati. Altri flussi di checkout e wallet restano da qualificare separatamente.

**Problema produttivo certo:** l'hosting Lovable continua a inviare eventi `/__l5e/trackevents` con HTTP 202 prima del consenso; i test dimostrano che il caricamento avviene anche senza React. Il nuovo banner non è ancora pubblicato, quindi manca sulla vetrina. Decidere e autorizzare la disattivazione della **sola Visitor Analytics**, conservando Project monitoring e registrando il suo effetto sulle statistiche. Dopo classificazione dei flussi e GO privacy, merge/Publish dell'esatto commit approvato, test pubblici del banner, rifiuto e revoca, flag checkout, carrello/account/admin; rollback della build in caso di regressioni. Non promettere conformità senza prove.

**Nessun Publish, nessun cambio live, SAL 57,75% invariata.** Registrata [review operativa nella PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69).

## Cookie headless — checkpoint PR #69, 23 novembre 2026

**PR #69 OPEN, NON MERGED** al commit `9f93e91d6915fb2a291984349e4841be0e823b0b`; tre controlli GitHub verdi, build/typecheck/lint mirato PASS, **33 test specifici** e **661 test Node** superati. Il candidato integra banner ufficiale Shopify nel frontend React, preferenze rifiuta/accetta/granulari, link footer e trasmissione dei soli segnali espliciti al checkout; Chromium desktop/mobile, Safari desktop e iOS simulato superati negli scenari documentati. **Il banner continua a mancare in produzione** finché la PR non viene integrata e la versione approvata non viene pubblicata.

**Rischio residuo di review:** il candidato sovrascrive `window.fetch` nell'entrypoint privacy con un wrapper che risponde artificialmente 204 a POST diagnostici dell'SDK Shopify su endpoint Monorail/OpenTelemetry, identificati tramite host/payload. La whitelist è circoscritta, e i test passano, ma il comportamento dipende dagli schemi di un SDK remoto e potrebbe variare o interferire con diagnostica futura. Richiedere una valutazione esplicita di manutenzione/compatibilità e una strategia per SDK evoluti prima di firmare il rilascio; non presentare la soppressione locale come prova di conformità complessiva.

**Produzione ancora BLOCKED:** Visitor Analytics Lovable continua a inviare HTTP 202 pre-consenso, incluso test con React non montato. Shopify checkout ospitato continua a emettere richieste tecniche/diagnostiche/wallet, con finalità da distinguere; non inventare classificazioni o sopprimere traffico tecnico indiscriminatamente. Per sbloccare: autorizzazione dedicata alla disattivazione della **sola** Visitor Analytics nella finestra controllata, Project monitoring intatto; verifica del wrapper; classificazione delle richieste checkout con owner privacy; solo poi merge/Publish e test post-release su dominio pubblico, inclusi carrello/account/Admin e rifiuto/revoca in IT. Rollback senza riattivare per default analytics pre-consenso. **SAL originaria 57,75% invariata**.

Fonti: [PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69) · [verbale candidato](https://github.com/Rosin355/your-e-commerce-blueprint/blob/9f93e91d6915fb2a291984349e4841be0e823b0b/docs/release/FINAL-CLOSEOUT-2026-11-22.md#consenso-sulla-vetrina-headless-del-23-novembre-2026).

## Consegna operativa al titolare

Apri *Consulta storico.html* sul Mac autorizzato e scegli *conteggi.json*. Sono consultabili 858 account e 953 acquisti aggregati. I clienti Shopify non vedono dati storici; le associazioni verificate sono zero. Le indicazioni precedenti sul recupero delle transazioni sono superate dalla decisione definitiva del titolare. [Risultati e scheda per Marco](release/FINAL-DELIVERY-2026-11-22.md)

## Esito per il titolare · 22 novembre 2026

Il checkout continua ad applicare la tariffa ordinaria alle nove località. Nel pannello Lovable la misurazione delle visite è attiva. I cinque testi hanno una revisione identificabile. Per lo storico manca la fonte con il dettaglio degli acquisti. Tutte le decisioni a carico del titolare sono raccolte nella [richiesta unica](release/FINAL-COMMERCIAL-CLOSEOUT-2026-11-22.md#g-unica-richiesta-conclusiva).

## Decisione operativa — 22 novembre 2026: chiusura commerciale in tre ambiti, ordini storici, DNS rinviato

Mandato comunicato dal responsabile: dedicare **un unico intervento** a (1) tariffe speciali delle **nove località insulari ancora non conformi**, (2) **Visitor Analytics/consenso**, (3) **cinque informative** Termini, Privacy, Spedizioni, Resi, Cookie. **Cloudflare/DNS/16 redirect 301 rinviati a domani**: nessuna delega, record, proxy o redirect deve essere modificato in questo intervento. Il cliente dichiara di utilizzare le **email di notifica**; non richiede attività Sendcloud di gestione etichette/spedizioni in questo ciclo. La presenza eventuale di app/Flow/automazioni deve comunque essere controllata in sola lettura per evitare effetti collaterali sugli ordini storici.

**Richiesta esplicita aggiuntiva:** importare i **953 ordini WooCommerce**. L'intento è acquisito come priorità, **non come attestazione di fattibilità o autorizzazione a creare record fittizi**. La verifica già conclusa nel [registro storico](migration/woocommerce-history-2026-11-20.md) conferma **953 conteggi aggregati ma zero ordini individuali disponibili**, backup TAR troncato, zero clienti storici associati o creati e **0/953 ordini importati**. L'importatore `sync/history/import.mjs` è già predisposto. Il prossimo intervento deve cercare soltanto fonti **nuove/autentiche** (export ordine-per-ordine Woo/HPOS, accesso vecchio negozio autorizzato di sola lettura, archivio integro), senza ripetere tentativi sullo stesso TAR e senza pubblicare dati. Se una fonte valida compare, fare preflight, riconciliazione con Shopify, identity review, confronto contabile e **pilota di un solo ordine con approvazione specifica** prima di qualunque batch. Se non compare, mantenere `BLOCKED_SOURCE_UNAVAILABLE`; mai inventare date, righe, prezzi, clienti, pagamenti o stati, né importare 953 ordini sintetici in produzione. Attenzione al fatto che la creazione di ordini storici può alterare reporting, notifiche e sistemi esterni anche quando non si addebita nulla.

**Autorizzazioni ancora separate:** attivazione selettore spedizioni sul checkout Grow dopo prova dei due metodi, eventuale app e relativi permessi/costo; scelta definitiva sull'interruttore Lovable e verifica live; pubblicazione policy soltanto dopo inserimento dati e approvazione del titolare; ordine storico pilota e batch solo con fonte e prova contabile. L'attuale autorizzazione è di **lavorare verso la chiusura**, non di superare i gate tecnici o creare ordini privi di fonte. Conservare snapshot e rollback. La SAL ufficiale resta **57,75%** finché non si dimostra una nuova chiusura produttiva.


## Aggiornamento per Marco — 22 novembre 2026, PR #66 integrata

**Nessun intervento live aggiuntivo:** Codex ha completato due prove isolate, entrambe PASS, senza costi incrementali (0,00 €). La prova del selettore tariffe porta il campione da **42/69 a 69/69** soltanto **nel modello** che riceve due opzioni già prezzate; il checkout Shopify Grow continua a presentare una sola opzione e non è attestato corretto per le nove isole. Per completarlo serve accesso tecnico soltanto al negozio di prova *Online Garden Shipping Test*, fonte aggiornata di copertura CAP/località del corriere e test delle due tariffe realmente disponibili, senza installazioni live o nuove app a pagamento. Il test di soppressione dello script Lovable ha azzerato gli eventi osservati in quattro profili browser isolati, mantenendo accessibili carrello, checkout e account; l'interruttore Visitor Analytics **del progetto live non è stato modificato**. Restano le decisioni sul monitoraggio, informative, DNS e collaudi personali. **SAL 57,75% (~58%)** invariata. [Prove e limiti](release/PROVE-ISOLATE-SPEDIZIONI-ANALYTICS-2026-11-22.md) · [Autorizzazioni](release/FINAL-CLIENT-APPROVALS.md) · [PR #66](https://github.com/Rosin355/your-e-commerce-blueprint/pull/66).

## Per Marco · 22 novembre 2026

Il negozio, il carrello e il checkout sono operativi. Il prezzo delle isole è già approvato. Il checkout va corretto per nove località del campione. Cinque testi sono pronti per la revisione. La firma personale resta aperta. [Verbale e dettagli](release/FINAL-CLOSEOUT-2026-11-22.md). [Approvazioni](release/FINAL-CLIENT-APPROVALS.md) · [Checklist personale](release/PRODUCTION-HANDOVER.md#unica-checklist-di-accettazione-personale).

---

## Stato aggiornato per il cliente — 21 novembre 2026

## Area clienti · cosa può fare il cliente

Account apre Shopify dal computer e dal telefono. Il cliente può consultare gli ordini del nuovo negozio associati al suo profilo. Rimangono aperte le prove di uscita, rientro e separazione su due profili controllati. Lo storico WooCommerce resta a 0/953. [Guida per Marco](customers/CLIENT-GUIDE.md) · [Riscontri e limiti](customers/FINAL-ACCEPTANCE.md).

## Consegna del pannello prodotti · 21 novembre 2026

La versione aggiornata del pannello è pubblicata. Il collaudo ha verificato direttamente una bozza salvata nel gestionale e una diversa bozza su Shopify fuori vendita. Categorie, foto e formati sono descritti nella [guida cliente](admin-v2/CLIENT-GUIDE.md). Il checkout Shopify si è aperto con articolo e prezzo attesi. Resta da registrare la prima prova personale di Marco, incluso l’eventuale accesso Shopify per intervenire sulla galleria di un prodotto esistente. [Accettazione](admin-v2/FINAL-ACCEPTANCE.md) · [Rilascio sul sito](admin-v2/RELEASE-REPORT.md).

La nuova area clienti Shopify e il percorso verso il checkout risultano online, verificati fino alla schermata Shopify senza completare pagamenti. Il lavoro di sicurezza su accesso, funzioni amministrative e filtri dei campi prodotto è stato distribuito secondo il report tecnico; una nuova scansione approfondita non segnala criticità. Rimane un avviso su email nei log attribuito a un vecchio file (le righe non esistono più nel programma attuale): lo archiviamo come rilievo non applicabile alla versione corrente, preservandone le evidenze senza presumere che eventuali vecchi log siano stati cancellati. La libreria pubblica delle immagini dei prodotti rimane intenzionalmente accessibile. **Da completare:** collaudo finale del pannello Admin con Marco e le attività commerciali/DNS ancora pendenti. Lo storico WooCommerce non è importato perché le singole transazioni non sono disponibili. [Relazione tecnica](security-checkout-fix-2026-11-21.md) · [SAL](release/SAL-2026-11-21.md).

## Verifica checkout e sicurezza — 21 novembre 2026

Il checkout Shopify è stato nuovamente verificato su sito pubblico e anteprima fino alla pagina di pagamento, senza completare acquisti. È disponibile una correzione per il checkout nel riquadro di anteprima Lovable. La protezione aggiuntiva sui campi prodotto dell'Admin è pronta nel codice ma deve ancora essere distribuita e collaudata; il Publish della versione più recente non è stato eseguito in questa fase. I controlli automatizzati disponibili non mostrano nuove regressioni, con cinque file test non eseguibili nel runner Node. Il recupero delle 953 transazioni del precedente sito rimane impossibile senza una fonte integra, perciò non sono state importate. [Report tecnico](security-checkout-fix-2026-11-21.md) · [SAL](release/SAL-2026-11-21.md).

## Aggiornamento 21 novembre — verifica area clienti Shopify

L'accesso a un profilo Shopify e la consultazione di un ordine Shopify già esistente sono stati **verificati attraverso schermate fornite dal responsabile**. Il sito in anteprima aveva già superato navigazione, prodotti e carrello. La PR #61 è integrata; **il nuovo Publish è stato richiesto ma non ancora verificato come disponibile su onlinegarden.it**. Resta aperta una verifica dedicata per accesso e recupero dell'operatore staff. Lo storico WooCommerce non è stato importato, perché i dettagli dei 953 ordini non sono disponibili. La SAL rimane **58%**. [Dettagli del rilascio](release/SAL-2026-11-21.md).

# Online Garden — stato per il cliente

## Area personale al 21 novembre 2026

**Il nuovo accesso Shopify è pronto in anteprima. Il rilascio sul negozio pubblico è sospeso.** Il pulsante account su computer e telefono apre la pagina Shopify di Online Garden. In anteprima abbiamo provato anche la navigazione, il carrello e l’apertura del checkout senza acquistare. Sul sito pubblico rimane il login precedente. Per pubblicare manca il collaudo con un cliente di prova e un operatore abilitato, ciascuno con accesso alla propria casella.

L’area Shopify permette l’accesso volontario con codice email. Gli acquisti WooCommerce del vecchio sito restano indisponibili. I dati privati contengono i conteggi, il negozio precedente è inaccessibile e il backup recuperabile è privo del database ordini. **0 clienti storici creati, 0 associati, 0 ordini importati su 953.** Fra i 857 acquirenti storici con ruolo customer, 848 sono candidati alla verifica, 8 richiedono esame manuale e una corrispondenza email è ancora da confermare. Nessun invito inviato.

**SAL stimata sull’ambito originario: 58%.** [Registro dei controlli e decisione sul rilascio](release/SAL-2026-11-21.md) · [Riepilogo della migrazione](migration/woocommerce-history-2026-11-20.md).

Aggiornamento: 2 ottobre 2026

## Stato go-live aggiornato

Backend Admin e interfaccia Admin V2 sono ora pronti per il go-live. Sono passati anche il primo inserimento di un campo manuale assente, il replay sicuro delle richieste e il QA finale dell'interfaccia. Il valore `colore_fiore = "viola"` su `OG_365676` resta intenzionalmente come dato editoriale corretto.

Restano i controlli commerciali: catalogo Shopify/storefront, varianti, prezzi, immagini, spedizioni, checkout, email ordine, mobile e un ordine end-to-end controllato. La modalità `canary` resta attiva fino alla decisione finale di pubblicazione.

La funzione richiesta “Migliora con AI” è stata implementata e il database è
stato predisposto con privilegi minimi verificati. **Non è ancora online**: il
primo tentativo di pubblicazione delle funzioni si è fermato prima della
distribuzione per un problema tecnico di packaging tra moduli. La correzione
2D.6 organizza il codice condiviso in modo compatibile con pacchetti separati,
senza modificare prodotti, chiamare AI o coinvolgere Shopify.

## QA commerciale Shopify — esito

Il pannello Admin è pronto, ma il negozio non è ancora pronto per il lancio commerciale. Il QA ha trovato quattro blocchi principali: quasi tutto il catalogo Shopify risulta esaurito (458 prodotti su 461), soltanto 461 prodotti risultano pubblicati rispetto ai 2.706 del catalogo interno, i tre prodotti acquistabili non hanno immagini e le spedizioni per l'Italia non sono ancora state verificate.

Prezzi e carrello sono risultati coerenti; il checkout Shopify si apre correttamente. Prima del go-live servono quindi giacenze reali, decisione sul catalogo da pubblicare, immagini, verifica spedizioni, correzione mobile e un ordine di prova completo.

## Diagnosi commerciale 3B

La diagnosi ha confermato che il blocco principale non si risolve semplicemente attivando i prodotti: le quantità disponibili non hanno oggi una fonte operativa completa da sincronizzare. Shopify deve restare il registro delle giacenze effettive, ma prima serve stabilire quale gestionale/feed alimenta quantità, tracking e location per ogni SKU.

È stato inoltre confermato che l'attuale catalogo Shopify deriva da sincronizzazioni storiche parziali: i 461 prodotti online non rappresentano ancora un catalogo di lancio deliberato. Le immagini multiple presenti in WordPress non sono state trasferite dalle vecchie pipeline, e il checkout italiano non è ancora pubblicato in lingua italiana.

## In sintesi

La nuova base catalogo e il pannello Admin sono online. I dati originali sono
stati conservati, i campi importanti sono protetti da sovrascritture automatiche
e sono stati chiusi i principali interventi di sicurezza su accessi e file di
sincronizzazione.

L'ultimo aggiornamento backend permette a un Admin autorizzato di modificare i
campi manuali protetti senza togliere la protezione contro import e AI. Update,
ripristino, replay idempotente, conflitto e creazione con versione iniziale zero
sono stati collaudati; la modalità `canary` resta attiva.

## Cosa è completato e online

- catalogo unico basato sui prodotti Online Garden;
- conservazione degli originali WordPress e dei valori correnti separati;
- pannello Admin V2 con confronto per campo, provenienza e versione;
- editor specifici per testo, numeri, selezioni, booleani, liste e FAQ;
- protezione contro sovrascritture concorrenti;
- accessi amministrativi e funzioni Storage irrobustiti;
- Smart Sync con nuovi CSV custoditi nell'area privata;
- rimozione del vecchio CSV pubblico, mantenendo pubbliche le immagini prodotto;
- backend per aggiornare i campi manuali protetti, secondo il report di
  rilascio Lovable.

## Migliora con AI — cosa farà

- il pulsante compare soltanto sui campi editoriali autorizzati dal server;
- mostra una proposta separata dal valore corrente;
- permette di modificare, rifiutare o accettare la proposta;
- rifiutare non cambia il prodotto;
- accettare usa la stessa protezione di versione e cronologia delle modifiche
  manuali;
- se un altro Admin modifica il campo nel frattempo, la proposta diventa
  obsoleta e non può sovrascrivere il dato nuovo;
- non pubblica su Shopify e non esegue elaborazioni massive.

## Cosa è protetto

I cinque campi manuali principali — nome comune, ibridatore, colore del fiore,
colore della foglia e curiosità — restano protetti da import, AI e canali non
autorizzati. La modifica manuale Admin non elimina questa protezione.

Anche inventario, identità prodotto, categorie tecniche e stato Shopify restano
fuori dall'editing libero della scheda prodotto.

## Cosa manca

- review e merge della correzione di packaging 2D.6;
- pubblicazione coordinata e controllata delle due Edge Functions dalla stessa
  revisione, seguita da smoke read-only;
- rilascio coordinato di endpoint, capability e frontend;
- smoke con un campo non sensibile e una proposta controllata, senza Shopify;
- decidere se collegare automaticamente i valori correnti agli originali
  WordPress quando l'abbinamento è certo;
- completare un collaudo commerciale separato di Shopify, storefront e checkout.

## Prossimo collaudo

Prima dello smoke AI verranno concordati prodotto, campo, versione e contenuto
atteso. La generazione non scriverà sul prodotto; l'eventuale accettazione sarà
un passaggio umano separato. `OG_393883` resta escluso dalle scritture senza
autorizzazione esplicita.

## Stato finale

La piattaforma è in una fase avanzata e controllata. Catalogo, Admin V2,
sicurezza e Storage hanno una base stabile. La funzione AI richiesta è pronta
per review ma non è stata distribuita; resta un gate prima dell'handoff cliente.

## Aggiornamento 29/09/2026

Il test controllato della creazione di un nuovo valore è riuscito: il colore del fiore "viola" è stato aggiunto al Gladiolo "Violet Summer" e resta come dato corretto. La parte server della fase 2C.1 è chiusa e la UX Admin V2 è stata confermata; restano il rilascio controllato della Fase 2D e i gate commerciali Shopify.


## Fase 2C.2 — QA finale Admin V2 (2026-09-29)
ADMIN V2 UX — GO-LIVE READY (canary attivo). Backend 2C.1 CLOSED; create expectedVersion=0 live PASS; OG_365676.colore_fiore="viola" permanente; current values 24.467, history 5, command log 5. Due fix UX P3 (Salva solo con modifiche, niente "versione 0"). Dettagli: `docs/fase2c/qa-finale-admin-2C2.md`.

## Aggiornamento sicurezza AI — 02/10/2026

Il controllo pre-rilascio ha funzionato come previsto: i permessi database
delle reservation e delle proposte AI sono ora limitati a quanto serve al
backend. Il deploy successivo si è fermato durante il packaging e non ha
distribuito nuove Edge Functions. La funzione resta intenzionalmente non
pubblicata finché la correzione 2D.6 non sarà revisionata. Catalogo, Admin V2,
Shopify e dati prodotto non sono stati modificati.


## Fase 2D.7 (2026-10-02)
2D EDGE BACKEND LIVE · READ-ONLY SMOKE PASS · FRONTEND NOT PUBLISHED · AI PROVIDER NOT CALLED · AI GENERATION NOT YET TESTED · CANARY ACTIVE. Dettagli: `docs/fase2d/edge-live-2D7.md`.

## Fase 2D.8 — AI generation smoke (2026-10-02)
Frontend AI pubblicato; una generazione su OG_264361 `seo_title` → suggestion pending `72d271c6`, valore prodotto invariato, accept/reject non testati, canary attivo. Dettagli: `docs/fase2d/ai-generation-smoke-2D8.md`.


## 2D.9 — Controlled accept (2026-10-02)
Accept live su OG_264361/seo_title v1→v2, history/command +1, replay idempotente e conflict 409 verificati, Shopify non toccato, provider 0, canary attivo, restore non eseguito. Dettagli: `docs/fase2d/ai-controlled-accept-2D9.md`.
