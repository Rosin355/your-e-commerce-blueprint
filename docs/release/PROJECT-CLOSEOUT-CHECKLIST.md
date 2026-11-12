# Online Garden checklist di chiusura

Aggiornamento: 12 novembre 2026. Questa checklist distingue la consegna del gestionale a Marco dalla chiusura del sito ecommerce. Non autorizza nuove scritture, pubblicazioni, ordini, cambi di configurazione o spese. Nessuna prova operativa eseguita durante questo aggiornamento documentale.

## Stato gia acquisito

Il [registro cliente](../CLIENT-ECOMMERCE-STATUS.md), aggiornato al 12 novembre, conferma account unico con email verificata, ruolo editor, sette capability catalogo e quattordici campi consentiti. Accesso personale e dicitura modifica abilitata sono confermati dal proprietario tramite il riscontro di Marco. Non richiedere di nuovo registrazione, screenshot di login o assegnazione degli stessi permessi.

Migration e backend sono distribuiti, frontend `admin-delivery-20261110-r1` pubblicato. Il precedente collaudo tecnico ha verificato immagine, bozza unica Shopify, recovery e sincronizzazione di una descrizione SEO. Questa prova non dimostra tutte le operazioni dalla sessione cliente. I controlli server ordinari non vanno sostituiti riaprendo le vecchie finestre canary.

## Chiusura del gestionale

La prima bozza riuscita di Marco chiude il relativo percorso, non automaticamente prezzi, categorie e pubblicazione. Raggruppare le verifiche mancanti in una sola sessione di lavoro utile, evitando nuove prove artificiali o l'intera ripetizione delle suite.

| Punto | Criterio di uscita | Stato documentato |
| --- | --- | --- |
| Modifica e sincronizzazione | Campo autorizzato e, se parte della consegna, prezzo di variante salvati, riletti e sincronizzati dal cliente con esito corretto | Accettazione cliente da attestare |
| Nuovo prodotto con immagine | Bozza reale concordata, SKU e varianti corretti, media disponibile, salvataggio e riapertura senza duplicati | Prova tecnica acquisita; percorso cliente da attestare |
| Categoria e pubblicazione | Scelta di collezione editoriale verificata; pubblicazione manuale di un prodotto reale approvato, visibile nella scheda e nel catalogo corretti | Non collaudato commercialmente |
| UI e passaggio di consegne | Controllo mirato nel browser di Marco e mobile/Safari per il perimetro concordato; guida esistente e limiti consegnati; conferma cliente | Accesso desktop confermato; operazioni e mobile/Safari non attestati |

Non pubblicare la DRAFT tecnica TEST ADMIN. Non inventare stock, prezzi o dati commerciali. La disponibilita pubblica richiede il canale effettivo del sito e non il solo stato ACTIVE. Prezzi e categorie non diventano PASS per il solo funzionamento di seo_description.

Le 22 associazioni delle categorie interne storiche sono una riconciliazione distinta dalla scelta di collezioni editoriali verificate: non devono bloccare ogni bozza o l'editing indipendente, ma non vanno approvate in massa. Registrare i casi aperti e le decisioni di Marco.

**Criterio di consegna Admin:** operazioni concordate utilizzabili da Marco dal suo account, esiti riletti, guida e limiti accettati. Nessun nuovo sviluppo o deploy se non emerge un difetto riproducibile; se emerge, correggere solo quel difetto e riprovare il caso interessato. Non promettere una data o una percentuale di completamento dai soli documenti.

## Chiusura del sito ecommerce

### SEO e vecchi URL

Lettura GitHub del 12 novembre: [PR #49](https://github.com/Rosin355/your-e-commerce-blueprint/pull/49) ancora open, merged=false, mergeable=false, HEAD `08b3cfa3afab17dfe29fa6a2d8d130cab81ca63d`. Il corpo della PR conserva riferimenti storici a mergeability positiva e Admin non attivato: prevalgono i metadati correnti e il registro cliente piu recente. Non attribuire controlli del vecchio SHA a una futura revisione.

Riallineare la PR all'attuale main preservando Admin e capability correnti, poi completare il primo rilascio SEO gia autorizzato: sitemap, robots, canonical, noindex transitorio, link e dati strutturati. Questa checklist non attesta pubblicazione o nuove risposte HTTP live.

I 16 redirect proposti richiedono ancora approvazione dei mapping, livello HTTP effettivo e verifica del rilascio. Il primo rilascio frontend non attiva automaticamente i redirect. Tre casi incerti e 1.255 percorsi restano nel backlog secondo il report del 10 novembre; non sono prodotti dichiarati rimossi. GSC e gia collegata: non ripetere il collegamento. Dopo il rilascio verificare sitemap pubblica, indicizzazione e andamento; recupero del ranking non e una condizione a data garantita della consegna tecnica.

### Spedizioni

La [guida shipping nel branch dedicato](https://github.com/Rosin355/your-e-commerce-blueprint/blob/codex/shopify-shipping-rates/docs/SHIPPING-CLIENT-MANAGEMENT.md) documenta A/B e Sicilia/Sardegna operative nel collaudo precedente. Elba, Lido, Pellestrina e altre isole minori restano senza copertura speciale verificata. E un requisito aperto della tariffazione completa: non basta che la tariffa standard funzioni. Non inventare CAP, estendere supplementi a province continentali o introdurre costi/app senza decisione. Questa nota non ripete il test checkout.

### Contenuti legali e consenso

La [checklist legale del 1 novembre](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md) registra footer, contatti e privacy pubblicati, ma lascia aperti testi approvati di termini, cookie, spedizioni/resi, dati societari e gestione della telemetria/consenso. Stato da riconciliare con eventuali interventi successivi prima di assegnare nuovo lavoro: questa nota non e una verifica legale o un audit live e non dichiara che ogni documento sia ancora assente oggi. Non presentare il footer online come conformita completa.

### Ordini e notifiche

L'[audit notifiche del 31 ottobre](../SHOPIFY-EMAIL-NOTIFICATIONS-AUDIT.md) non attesta ricezione cliente/staff, tracking e mittente. Prima della chiusura commerciale raccogliere le evidenze gia disponibili, anche relative a ordini realmente ricevuti con accesso autorizzato, senza generare acquisti, email o addebiti per questa checklist. Se manca una verifica, pianificare soltanto quella e con consenso specifico. Non dedurre un guasto dalla sola assenza di documentazione.

## Responsabilita e ordine di lavoro

- Marco: dati prodotto reali, scelte di categoria, conferme di pubblicazione, contenuti commerciali e accettazione della guida.
- Developer: eventuali difetti puntuali del percorso cliente, rilascio SEO separato, redirect HTTP e integrita di prezzi/varianti/identita.
- Designer: rifiniture mirate emerse nell'uso reale; nessun redesign necessario per chiudere la consegna.
- Proprietario: approvazione dei perimetri e degli eventuali costi; coordinamento del collega sul backup legacy se necessario, senza restaurare dati clienti in produzione.

Ordine proposto: completare il percorso quotidiano di Marco e firmare il perimetro Admin; portare avanti subito il recupero SEO senza attendere tutta la tassonomia; chiudere le eccezioni commerciali gia note con relative approvazioni. Nessuno di questi punti autorizza ad abbassare le protezioni gia attive.

## Manutenzione successiva e limiti

Crescita del ranking, nuovi articoli, ottimizzazione campagne e miglioramenti futuri sono manutenzione/marketing, non un motivo per tenere aperta senza termine la consegna tecnica. Restano da programmare gli aggiornamenti della sitemap quando cambia il catalogo, il monitoraggio errori e il recupero dei dati. Il restore completo rimane non dimostrato secondo la precedente decisione di rischio; non viene certificato o trasformato qui in una nuova migration obbligatoria.

Il file storico FINAL-RELEASE-READINESS contiene ancora in testa stati del 9 novembre superati dal rilascio e dall'abilitazione del 12 novembre. Per l'account prevalgono CLIENT-ECOMMERCE-STATUS e la guida aggiornata; non usare lo storico per riaprire automaticamente l'attivazione gia conclusa.
