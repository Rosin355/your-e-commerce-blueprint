# Online Garden checklist di chiusura

Aggiornamento: 12 novembre 2026. Questa checklist distingue la consegna del gestionale a Marco dalla chiusura del sito ecommerce. Il mandato del proprietario del 12 novembre autorizza ora le attività di chiusura qui delimitate: riallineamento/merge PR #49 dopo review e CI/GitGuardian, Publish frontend SEO e accettazione di soli prodotti reali approvati. Restano esclusi ordini/addebiti/invii di prova, nuovi costi/ambienti/app, cambi DNS/proxy e mapping non approvati. Le note precedenti di sola preparazione non prevalgono sul mandato attuale.

## Scadenza del proprietario — venerdi 13 novembre 2026

Il proprietario richiede di concludere la consegna entro domani, 13 novembre, fuso Europe/Rome. Nessun orario preciso nuovo e stato indicato. E una scadenza di progetto, non una garanzia di esito o una promessa di lavoro in background.

**Perimetro congelato:** completare i requisiti gia concordati, non nuovi redesign, AI, campagne, infrastrutture o funzionalita. Non spostare unilateralmente fra i miglioramenti futuri un requisito ancora mancante. Non riaprire registrazione, grant, migration e canary gia conclusi. Correggere soltanto difetti riproducibili e fare un controllo finale integrato, oltre ai test automatici relativi al codice modificato.

| Quando | Attivita | Responsabile | Uscita richiesta |
| --- | --- | --- | --- |
| 12 novembre, subito | Riallineare PR #49 al main corrente e completare il primo rilascio SEO gia autorizzato, senza regressione Admin | Developer/Codex | Check dello SHA finale, merge e versione pubblicata verificati; sitemap HTTP 200 e schede coerenti |
| 12 novembre, senza aspettare la riconciliazione completa SEO | Un primo lavoro reale di Marco: modifica, bozza con immagine, categoria verificata; pubblicazione solo del prodotto commerciale da lui approvato | Marco + proprietario, assistenza tecnica sui difetti | Percorso cliente documentato, nessuna impersonificazione o DRAFT tecnica pubblicata |
| 12 novembre, prima di impegnare ulteriori tentativi | Riunire in una sola richiesta gli eventuali dati/accessi mancanti: provider HTTP, mapping incerti, geografia isole minori, policy e dati societari approvati | Proprietario/Marco/collega tecnico | Responsabile e decisione concreta per ogni dipendenza; nessun rinvio silenzioso a domani |
| 13 novembre | Chiudere le correzioni residue autorizzate, controllo integrato pubblico/Admin, guida e verbale unico | Developer + proprietario + Marco | Checklist con evidenze live, stato completo oppure elenco esplicito delle eccezioni non accettate |

I lavori indipendenti possono procedere mentre Marco usa il proprio browser, ma un solo operatore coordina merge, deploy e modifiche alla configurazione live. Non pubblicare una vecchia build SEO che riporta l'Admin in sola lettura. Non presumere che il consenso al primo rilascio SEO autorizzi cambi DNS, app a pagamento, tutti i redirect o modifiche commerciali non specificate.

**Dipendenze da rendere visibili subito:** l'adattatore redirect non e ancora un livello HTTP installato; la tariffa speciale delle isole minori non e attestata; i testi legali devono provenire da una fonte approvata; una pubblicazione reale richiede un prodotto e dati commerciali concordati. Se non risolvibili con strumenti/accessi correnti, chiedere la sola decisione necessaria e continuare gli altri filoni. Un blocco non e un PASS e una nota TODO non sostituisce il requisito.

**Chiusura onesta:** l'Admin puo essere consegnato per il perimetro verificato mentre un filone separato resta aperto, ma la dicitura 'tutto concluso' richiede che nessun requisito concordato rimanga irrisolto. Non promettere un recupero del ranking entro il 13 novembre: il risultato della consegna SEO e la correzione tecnica pubblicata e verificata. Le eccezioni possono essere differite soltanto con accettazione esplicita del proprietario/cliente.

Usare questa stessa checklist e i registri esistenti per l'esito finale, senza produrre altri piani generici o duplicare file di stato. Nessuna nuova modifica runtime effettuata dalla registrazione della scadenza.


## Esecuzione corrente — 12 novembre 2026

- Main letto: `41e53339e647c23ea80e69f3c66fec383ee8ad30`; PR #49 OPEN, HEAD iniziale `08b3cfa3afab17dfe29fa6a2d8d130cab81ca63d`, due conflitti nei documenti di stato. Riallineamento locale completato, due conflitti documentali risolti preservando codice/configurazione Admin e cronologia recenti; controlli locali SEO 8/8, lint, typecheck e build operativa PASS. Nessun nuovo canary/grant/migration.
- Policy Shopify rilette: soltanto Privacy Policy pubblicata, aggiornamento 30 ottobre 2026. Non risultano altre policy nel servizio; i contenuti pubblici del frontend saranno confrontati separatamente. Nessuna policy inventata.
- Servizi tariffari esterni Shopify: elenco vuoto in lettura. A/B e Sicilia/Sardegna preservate; nessuna tariffa speciale delle isole minori dichiarata verificata.
- HTTP: hosting Lovable, primary domain 302/307 e assenza di supporto 301 fra domini confermati nelle [istruzioni provider](https://docs.lovable.dev/features/custom-domain#primary-domain). Un 301 path-level controllabile non è ancora dimostrato; nessuna route/proxy/DNS modificata. La verifica non blocca il rilascio sitemap.

Main concorrente `8d912b7` ha aggiunto automaticamente due dipendenze preview Lovable senza lockfile: integrate e rimosse soltanto quelle due voci, ripristinando package/lock identici al candidato già validato. Nuova CI/GitGuardian richiesta sul nuovo SHA; nessuna modifica funzionale o costo.

Sitemap rigenerata: 1.346 prodotti pubblici + 3 pagine, 1.349 URL; DRAFT tecnica assente. I 16 GID/handle sono ancora pubblici e ACTIVE, SKU varianti ricontrollati. Il file è statico: dopo nuove pubblicazioni/handle il responsabile tecnico deve rigenerarlo e pubblicare il frontend. Nessun automatismo dichiarato. [Evidenza corrente](../seo/evidence/release-2026-11-12.json).

### Unica approvazione dei 16 mapping pronti

Questa tabella riprende i mapping corroborati della PR #49; **nessuno è ancora approvato o attivo**. L’approvazione deve riferirsi all’intero elenco o precisare le sole righe approvate. Le destinazioni saranno ricontrollate sul catalogo pubblico prima dell’attivazione. Ogni riga ha riscontro Woo ID/SKU → GID Shopify nelle evidenze SEO; non è un abbinamento per solo titolo. L’approvazione dei mapping non autorizza automaticamente modifiche DNS/proxy.

| Vecchio URL (host apex e www) | Destinazione canonica | Identità corroborata |
| --- | --- | --- |
| `/prodotto/rose/rosa-jasmina-rampicante/` | [rosa-jasmina-rampicante](https://onlinegarden.it/products/rosa-jasmina-rampicante) | SKU `OG_436162`; Woo `14180`; Shopify `15836809494868` |
| `/prodotto/piante-da-interno/grasse-e-succulente/agave-americana-verde/` | [agave-americana-verde](https://onlinegarden.it/products/agave-americana-verde) | SKU `OG_317782`; Woo `12457`; Shopify `15836802220372` |
| `/prodotto/piante-da-interno/piante-da-appartamento/kalanchoe-calandiva-bianco/` | [kalanchoe-calandiva-bianco](https://onlinegarden.it/products/kalanchoe-calandiva-bianco) | SKU `OG_182937`; Woo `13302`; Shopify `15836783116628` |
| `/prodotto/piante-da-interno/grasse-e-succulente/kalanchoe-tetraphylla/` | [kalanchoe-tetraphylla-kalanchoe-a-quattro-foglie](https://onlinegarden.it/products/kalanchoe-tetraphylla-kalanchoe-a-quattro-foglie) | SKU `OG_631727`; Woo `13943`; Shopify `15357645914452` |
| `/prodotto/da-frutto/castanea-sativa-marrone-di-marradi-castagno-marrone/` | [castanea-sativa-marrone-di-marradi-castagno-marrone](https://onlinegarden.it/products/castanea-sativa-marrone-di-marradi-castagno-marrone) | SKU `OG_334361`; Woo `12930`; Shopify `15836803465556` |
| `/prodotto/da-frutto/prunus-avium-lapins-ciliegio/` | [prunus-avium-lapins-ciliegio](https://onlinegarden.it/products/prunus-avium-lapins-ciliegio) | SKU `OG_326285`; Woo `16228`; Shopify `15836802941268` |
| `/prodotto/piante-da-esterno/arbusti/calycanthus-floridus-calicanto-estivo/` | [calycanthus-floridus-calicanto-estivo](https://onlinegarden.it/products/calycanthus-floridus-calicanto-estivo) | SKU `OG_737951`; Woo `12821`; Shopify `15836827156820` |
| `/prodotto/piante-da-esterno/arbusti/calycanthus-venus-calicanto-estivo/` | [calycanthus-venus-calicanto-estivo](https://onlinegarden.it/products/calycanthus-venus-calicanto-estivo) | SKU `OG_575973`; Woo `12830`; Shopify `15836815130964` |
| `/prodotto/piante-da-esterno/arbusti/rhyncospermum-asiaticum-tricolor-gelsomino/` | [rhyncospermum-asiaticum-tricolor-gelsomino](https://onlinegarden.it/products/rhyncospermum-asiaticum-tricolor-gelsomino) | SKU `OG_689687`; Woo `14409`; Shopify `15836819849556` |
| `/prodotto/piante-da-esterno/arbusti/elaeagnus-ebbingei-aurea-eleagno/` | [elaeagnus-ebbingei-aurea-eleagno](https://onlinegarden.it/products/elaeagnus-ebbingei-aurea-eleagno) | SKU `OG_287827`; Woo `14764`; Shopify `15836800614740` |
| `/prodotto/piante-da-esterno/alberi/fagus-sylvatica-dawyck-purple-faggio/` | [fagus-sylvatica-dawyck-purple-faggio](https://onlinegarden.it/products/fagus-sylvatica-dawyck-purple-faggio) | SKU `OG_349957`; Woo `14964`; Shopify `15836804546900` |
| `/prodotto/piante-da-esterno/alberi/ginkgo-biloba-mariken/` | [ginkgo-biloba-mariken-albero-nano-da-giardino-e-terrazzo](https://onlinegarden.it/products/ginkgo-biloba-mariken-albero-nano-da-giardino-e-terrazzo) | SKU `OG_839828`; Woo `15120`; Shopify `15357650272596` |
| `/prodotto/piante-da-esterno/alberi/ginkgo-biloba-menhir/` | [ginkgo-biloba-menhir-lalbero-antico-dal-portamento-elegante](https://onlinegarden.it/products/ginkgo-biloba-menhir-lalbero-antico-dal-portamento-elegante) | SKU `OG_818665`; Woo `15121`; Shopify `15357649813844` |
| `/prodotto/piante-da-esterno/arbusti/parrotia-persica-bella-albero-pagoda/` | [parrotia-persica-bella-albero-pagoda](https://onlinegarden.it/products/parrotia-persica-bella-albero-pagoda) | SKU `OG_455857`; Woo `16976`; Shopify `15836810477908` |
| `/prodotto/piante-da-esterno/alberi/paulownia-tomentosa-paulonia/` | [paulownia-tomentosa-paulonia](https://onlinegarden.it/products/paulownia-tomentosa-paulonia) | SKU `OG_371278`; Woo `17011`; Shopify `15836806578516` |
| `/prodotto/piante-da-interno/piante-da-appartamento/tradescantia-nanouk/` | [tradescantia-nanouk](https://onlinegarden.it/products/tradescantia-nanouk) | SKU `OG_748228`; Woo `15466`; Shopify `15836830925140` |

Tre casi campione ambigui e gli altri percorsi restano separati: nessuna approvazione in massa, nessun reindirizzamento alla homepage.

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

Non pubblicare la DRAFT tecnica TEST ADMIN. Non inventare stock, prezzi o dati commerciali. La disponibilita pubblica richiedeere il canale effettivo del sito e non il solo stato ACTIVE. Prezzi e categorie non diventano PASS per il solo funzionamento di seo_description.

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
