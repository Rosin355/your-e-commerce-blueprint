# Online Garden — crescita organica dopo il recupero URL

Aggiornamento: 10 novembre 2026.
Stato: STRATEGIA PROPOSTA / TODO. Nessun redirect, attivazione Ads, modifica catalogo, deploy o nuova spesa autorizzati da questo documento. La registrazione del piano non equivale ad approvazione del preventivo o a un'attivazione commerciale.

## Obiettivo e contesto

Dopo la migrazione WooCommerce → storefront Lovable con checkout Shopify, separare il recupero della visibilità esistente dalla crescita di nuove ricerche e vendite organiche. Il proprietario riferisce un precedente budget Google Shopping/Performance Max di circa 200 EUR/mese, attualmente sospeso. Non è stato svolto in questa fase un nuovo audit delle campagne, dei margini o del tracking: la scelta fra Shopping e Performance Max resta subordinata ai dati storici.

Google Search Console è già collegata tramite Windsor.ai. Il TODO di recupero URL è presente in [PROJECT_STATUS](../PROJECT_STATUS.md). I dati di Search Analytics non sono una certificazione HTTP 404 né un inventario completo degli URL indicizzati. Verificare risposte HTTP e URL Inspection separatamente.

Il pagamento degli annunci non migliora direttamente il ranking organico; la pausa Ads può ridurre visite e vendite a pagamento, senza dimostrare la causa del calo SEO. Non promettere posizioni, tempi di recupero o percentuali di crescita.

## P0 — Chiudere la migrazione SEO prima di ampliare il catalogo indicizzato

- Ricostruire gli URL storici usando GSC, backup WooCommerce, sitemap e collegamenti noti. Trattare il backup offline senza importarlo in produzione e senza estrarre dati clienti non necessari.
- Mappare vecchio URL → nuova pagina pertinente usando SKU/identità prodotto ed evidenze, non solo somiglianza del titolo. Dare precedenza alle pagine con traffico, backlink e valore commerciale.
- Applicare solo dopo autorizzazione redirect HTTP permanenti diretti al livello che serve onlinegarden.it. Non dare per scontato che i redirect Shopify intercettino le richieste del dominio gestito da Lovable. React navigation non equivale a un HTTP 301.
- Per il campione prioritario: controllare codice HTTP sorgente, Location, destinazione 200, canonical, contenuto renderizzato e indicizzabilità. Conservare redirect per almeno un anno, preferibilmente più a lungo se ricevono traffico.
- Controllare sitemap con URL canonici validi, robots, noindex, duplicati www/apex, link interni e soft 404. Non reindirizzare indistintamente tutto alla homepage.
- Verificare che Google riceva contenuti e link dei prodotti: il rendering JavaScript va collaudato. Valutare SSR/prerender solo se emerge un problema concreto, senza avviare una nuova migrazione estetica.

Deliverable developer: matrice URL, QA HTTP, sitemap verificata e registro delle modifiche. Le verifiche non autorizzano da sole il deploy.

## P1 — Categorie commerciali e prodotti prioritari

Proposta iniziale, da dimensionare sulle risorse: 5 categorie e 20–30 schede prodotto, non riscrittura indiscriminata dell'intero catalogo.

Selezionare in base a query GSC già visibili, intento d'acquisto, disponibilità, margine e affidabilità delle consegne. Esempi di cluster da validare, non keyword research già conclusa: bulbi per specie, rose rampicanti, arbusti sempreverdi, piante da appartamento, piante da frutto.

Categorie: URL stabile, title/H1 descrittivi, catalogo raggiungibile tramite link HTML, filtri utili e breve guida alla scelta. Non generare pagine indicizzabili per ogni combinazione di filtro. Collegare homepage → categorie → sottocategorie → prodotti e guide → categoria/prodotto pertinente.

Prodotti: nome botanico/cultivar e comune corretti, formato effettivamente venduto, vaso/altezza ove verificati, prezzo e disponibilità coerenti, immagini autentiche, esigenze e consigli confermati da Marco, varianti distinguibili, spedizioni/resi chiari. Non inventare tolleranze climatiche, recensioni, misure, GTIN o credenziali dell'autore.

Per prodotti stagionali temporaneamente esauriti, proposta di mantenere la scheda utile e l'URL stabile con disponibilità reale e alternative pertinenti; valutare separatamente i prodotti definitivamente ritirati. Evitare cambi di URL per mero inserimento di keyword.

Designer: rifinitura del template esistente, chiarezza di variante/formato, informazioni di consegna e leggibilità mobile; nessun nuovo redesign. Marco: convalida dati botanici, assortimento e margini.

## P1 — Merchant Center e risultati prodotto

Verificare le schede senza costi prima di riattivare Ads: esistenza del programma/account, idoneità, stato prodotti, URL sul nuovo dominio, immagini, prezzi, disponibilità e identificativi reali. Le schede gratuite sono un canale aggiuntivo, non una garanzia di posizione organica.

Allineare costi e tempi di spedizione del feed alle condizioni realmente applicate al checkout A/B; non dichiarare risolte eccezioni insulari ancora aperte. Verificare contenuti approvati su contatti, spedizioni e resi. Validare Product/Offer e breadcrumb con strumenti Google; markup conforme al contenuto visibile, nessuna recensione inventata. L'idoneità non garantisce la visualizzazione di risultati avanzati.

## P2 — Contenuti utili e autorevolezza

Proposta sostenibile: due guide approfondite e circa dieci aggiornamenti prodotto al mese, adattabili al tempo disponibile. Esempi da validare: scelta e coltivazione di bulbi, confronto rose rampicanti, arbusti per specifiche esposizioni, cura di cultivar già cercate in GSC. Ogni guida deve risolvere una domanda distinta e collegare prodotti disponibili e categorie pertinenti.

Richiedere contributo reale di Marco: foto del vivaio, esempi di piante/varietà vendute, errori frequenti dei clienti, preparazione delle spedizioni e consigli di coltivazione. AI come supporto editoriale, con verifica umana; niente testi in massa senza informazioni originali.

Sviluppare menzioni editoriali pertinenti da partner, fornitori, giardinieri e pubblicazioni di settore; correggere link esterni importanti verso vecchi URL. Non comprare pacchetti backlink o richiedere link che trasferiscano ranking in cambio di prodotti. Le collaborazioni pubblicitarie vanno distinte dai riferimenti editoriali spontanei.

Prestazioni: misurare le pagine mobile e correggere immagini/bundle/layout problematici. Un punteggio Lighthouse elevato non garantisce posizionamento; non sacrificarvi contenuti e acquistabilità.

## Budget Ads — circa 200 EUR/mese

La strategia organica non richiede l'accensione di campagne. I 200 EUR sono budget media, separato dal costo del lavoro tecnico/editoriale.

Prima di riattivare: pagine di destinazione funzionanti, feed idoneo, prezzi e stock coerenti, spese corrette e tracking purchase verificato una sola volta con valore/valuta e attribuzione corretti nel percorso storefront → checkout Shopify. Non usare add_to_cart come equivalente degli acquisti.

Proposta: non frammentare 200 EUR fra diverse campagne. Un solo test controllato su circa 10–20 prodotti selezionati per disponibilità, margine e domanda. Sono dimensioni operative proposte, non requisiti Google.

Scelta condizionata: se la precedente Performance Max ha acquisti attendibili e redditività dimostrata, valutarne la ripresa; se lo storico è insufficiente, confrontare un test Shopping standard più circoscritto. Non dichiarare PMax inadatta solo per il budget, né riattivare l'intero catalogo per automatismo. Nessuna campagna modificata.

Indicazione budget: 200/30,4 ≈ 6,58 EUR/giorno medio; per la maggior parte delle campagne Google può variare la spesa giornaliera rispettando i limiti applicabili. Non è un budget salvato nell'account.

Valutare CPA contro margine di contribuzione dopo costo prodotto, imballaggio, commissioni, resi attesi e quota spedizione sostenuta dal negozio, non solo ROAS sui ricavi. Esempio teorico: con 20 EUR residui prima della pubblicità, un CPA di 20 EUR assorbe tutto quel margine. Nessuna stima del margine reale di Online Garden.

## Roadmap e misurazione

Orizzonte organizzativo proposto di 90 giorni, non promessa di risultati:

| Fase | Output | Criterio di verifica |
| --- | --- | --- |
| Primo blocco | Recupero vecchi URL prioritari, rendering/sitemap e controllo tracking/feed | Mapping pertinente, risposte HTTP e pagine valide; dati purchase affidabili |
| Mese 1 | 5 categorie e 20–30 prodotti prioritari | Pagine utili, navigabili e tecnicamente indicizzabili; contenuti approvati |
| Mese 2 | Prime guide e collegamenti interni; eventuale singolo test Ads | Crescita misurata delle query/pagine pertinenti, vendite attribuite e margini |
| Mese 3 | Estensione alle categorie migliori e revisione | Decisioni basate su andamento consolidato, non pochi giorni isolati |

Dashboard minima: clic/impressioni/CTR e query non-brand per gruppi di pagine in GSC; vecchi URL recuperati, canonical e indicizzazione verificata; stato feed Merchant; ordini e ricavi organici da analytics ecommerce affidabili; CPA/ROAS separati per Ads. Confrontare finestre equivalenti e, se disponibile, anno precedente per la stagionalità. Non mediare semplicemente le posizioni di tutte le pagine. Non attribuire un calo esclusivamente ai redirect o alla pausa Ads senza analisi.

Proposta di controllo settimanale nelle prime fasi, poi mensile. Nessuna automazione creata.

## Stima del lavoro sul backup e comunicazione cliente

Il proprietario vuole comunicare una previsione iniziale di almeno una giornata per esame del backup, estrazione delle informazioni utili e recupero/mappatura dei collegamenti, con l'aiuto di un collega. È una stima da confermare dopo verifica del backup e del perimetro; non equivale alla durata dell'intero piano SEO o alla garanzia di ritorno in ranking. Il compenso del collega non è ancora quantificato: richiedere il costo e comunicarlo a Marco prima di impegnare spese. Nessun importo inventato o incarico esterno attivato.

## Fonti ufficiali

- Google, migrazioni e redirect: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Google, navigazione ecommerce: https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure
- Google, JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google, Product/Offer: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Google, contenuti utili: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google, analisi cali: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
- Google, separazione Ads e organico: https://support.google.com/google-ads/answer/3097241?hl=it
- Google Merchant Center, schede gratuite: https://support.google.com/merchants/answer/13889434?hl=it
- Google Merchant Center, spedizioni e resi: https://support.google.com/merchants/answer/15254380?hl=en
- Google Ads, limiti budget: https://support.google.com/google-ads/answer/10486637?hl=it
- Google Ads, Performance Max retail: https://support.google.com/google-ads/answer/11546049?hl=en
- Google, spam e link: https://developers.google.com/search/docs/essentials/spam-policies
- Google, page experience: https://developers.google.com/search/docs/appearance/page-experience
