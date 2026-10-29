> Archivio Fase 7, 28 ottobre 2026: questo audit descrive la baseline PR #39. I problemi effettivamente risolti nel lotto approvato del 29 ottobre sono nel [report di implementazione](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md); le evidenze nuove non sovrascrivono quelle dell’audit.

# Online Garden — Customer Experience Audit 2.0

Data: 28 ottobre 2026, Europe/Rome. **Fase 7: audit e progettazione; implementazione non autorizzata.**

## 1. Esito e perimetro

La direzione botanica attuale è riconoscibile e merita continuità. Le priorità sono rendere immediata la comprensione della variante acquistata, anticipare le informazioni commerciali su mobile e uniformare le componenti di vendita. Non è giustificata una sostituzione del design system né una riscrittura del catalogo.

Non sono disponibili analytics di conversione o sessioni con clienti: gli impatti indicati sono valutazioni professionali da validare, non incrementi percentuali misurati. Questo audit non certifica il rilascio, l'accessibilità completa o il checkout live.

### Revisione effettivamente esaminata

| Elemento | Verifica |
| --- | --- |
| PR #39 | Connettore GitHub in sola lettura: aperta, Draft, `merged=false` |
| Branch PR | `codex/storefront-main-integration` |
| HEAD PR confermato | `aa7e6aeb9aa0eafc01f655976f342733562bb824` |
| Base PR restituita da GitHub | `main`, `0d1bf639d7fb0c8cd5c47b2dc222ea86c5b1bab3` |
| Workspace originale | `codex/storefront-performance-seo-safe-fixes`, HEAD `7a7ed51c037f335df4b8b215a3322a7683bbe007`, modifiche locali presenti |
| Riferimenti locali | `origin/main=0d1bf63`; HEAD PR non antenato di questo riferimento. Nessun fetch eseguito: lo stato remoto PR deriva dal connettore, non dal tracking locale |
| Metodo di isolamento | Esportazione `git archive` dell'HEAD PR in `/private/tmp/online-garden-cx-phase7`, senza checkout, stash, reset o modifiche ai worktree originali |
| Tutela originale | Snapshot iniziale SHA-256 di 389 file tracked/untracked e stato Git; confronto finale in `safety.json` |

La [PR #39](https://github.com/Rosin355/your-e-commerce-blueprint/pull/39) non è stata modificata. Le sezioni storiche dei due documenti di stato sono conservate integralmente dalla baseline PR. I file aggiornati sono consegnati nella copia isolata: i documenti dirty dell'originale non sono stati sovrascritti.

## 2. Metodo, osservazioni e limiti

- **O — osservato:** Chrome headless, applicazione locale alla revisione PR, fixture sintetiche esistenti, viewport 320/375/390/430/768/1440 × 900. Screenshot acquisiti e selezioni desktop/mobile esaminate visivamente.
- **C — codice:** riscontro nei file dell'HEAD PR. I riferimenti di linea seguenti appartengono esclusivamente a questa revisione.
- **H — storico:** evidenze già contenute nella PR, esplicitamente separate dalle verifiche ripetute in questa fase.
- **P — proposta:** scelta progettuale non applicata, da approvare prima dello sviluppo.
- **D — da confermare:** produzione, copertura dati, condizioni commerciali o risultati non verificati.

Ripetuta la suite esistente `scripts/ux-audit/run.mjs`: **15 scenari PASS, 0 FAIL**, comprese sei larghezze, ricerca/filtri, errori/retry, checkout simulato, persistenza, varianti, tastiera/zoom/hero, concorrenza PDP e paginazione collezioni. Nessuna eccezione JavaScript non gestita nel report. Non sono stati rieseguiti build, lint, test Node/Deno o benchmark 10k: i loro esiti precedenti restano storici.

Tutte le richieste esterne dell'app sono intercettate: nessuna chiamata Shopify/Supabase o checkout reale. Le immagini locali del repository sono visibili; logo remoto e font Google non vengono caricati. Gli screenshot verificano layout e fallback tipografico, non la resa dei webfont pubblicati. I prodotti, prezzi, disponibilità e dati botanici delle fixture **non descrivono articoli in vendita**.

Il badge `[DEV]` nelle collezioni è condizionato a `import.meta.env.DEV`: non viene classificato come difetto di produzione. Alcuni screenshot della suite possono cogliere transizioni di caricamento; le acquisizioni `audit-*` attendono esplicitamente le card o la CTA. Le coordinate sono misure di laboratorio, non valori universali: cambiano con contenuti, font e viewport.

Le fonti applicative sono consultabili alla revisione fissata: [PDP](https://github.com/Rosin355/your-e-commerce-blueprint/blob/aa7e6aeb9aa0eafc01f655976f342733562bb824/src/components/storefront/Pdp.tsx), [catalogo](https://github.com/Rosin355/your-e-commerce-blueprint/blob/aa7e6aeb9aa0eafc01f655976f342733562bb824/src/pages/AllProducts.tsx), [query Shopify](https://github.com/Rosin355/your-e-commerce-blueprint/blob/aa7e6aeb9aa0eafc01f655976f342733562bb824/src/lib/shopify.ts), [ricerca e selezioni](https://github.com/Rosin355/your-e-commerce-blueprint/blob/aa7e6aeb9aa0eafc01f655976f342733562bb824/src/lib/storefrontDiscovery.ts). Il componente legacy `src/components/Header.tsx` non è quello montato nelle sette superfici esaminate: non ne sono stati attribuiti i difetti alla UI attiva.

Evidenze: [indice e riproduzione](customer-experience-evidence/2026-10-28/README.md), [suite ripetuta](customer-experience-evidence/2026-10-28/report.json), [misure e sonda](customer-experience-evidence/2026-10-28/observations.json).

## 3. Valutazione delle sette superfici

| Superficie | Punti di forza da mantenere | Problemi verificati / opportunità | Evidenza |
| --- | --- | --- | --- |
| Homepage | Fotografie botaniche locali, palette coerente, CTA al catalogo, controllo pausa e reduced motion; selezioni stabili senza duplicati | Hero di 92svh mobile/96svh desktop e quattro rassicurazioni prima delle selezioni; card dense e diverse dal catalogo; journal senza destinazioni articolo; banner newsletter ancora dominante pur non attivo | O: `home-390.png`, `home-1440.png`, acquisizioni complete `audit-home-*`; C: `HomeHero.tsx:137`, `HomepageV3.tsx:171`, `:274`, `:300` |
| Catalogo | Card leggibili a due colonne mobile; link reali, filtri e select nativi; errori e caricamento distinti | A 390px la prima card inizia a y=625 su 900px; introduzione lunga; prezzo minimo senza qualificazione; ordinamento vendite non supportato; colore vuoto resta esposto | O: `catalogo-390.png`, `catalogo-1440.png`; C: `AllProducts.tsx`, `CatalogProductCard.tsx:17` |
| Collezione | Titolo/descrizione dedicati; card condivisa col catalogo; cursori, deduplica e retry dopo errore successivo | Non dispone di filtri/ordinamento dedicati; opportunità futura, non regressione. Applicare filtri solo ai primi 60 sarebbe scorretto. Descrizione e lunghezza titoli dipendono dai dati | O: `collezione-375.png`, `audit-collezione-*`; C: `CollectionPage.tsx:33`, `:183` |
| PDP | Gallery e dialog zoom; informazioni botaniche condizionali; varianti complete e disponibilità della variante; pannello acquisto desktop | Colonna editoriale interamente prima dell'acquisto su mobile; selezione formato non esposta semanticamente come selezionata; CTA desktop terracotta e sticky verde; prezzi con punto decimale; immagini principali `object-cover` | O: `pdp-390.png`, `pdp-1440.png`, `audit-pdp-acquisto-390.png`; C: `Pdp.tsx:303`, `:334`, `:577`, `:623`, `:949` |
| Ricerca | Query in URL, ranking titolo/tassonomia, cancellazione, risultati vuoti e retry; nessun cap 1k | Riutilizza l'introduzione generica del catalogo; attende l'intero insieme; filtro e sort non persistono nell'URL. Non osservata un'autocompilazione: non dichiararla malfunzionante | O: `ricerca-390.png`, suite ricerca; C: `AllProducts.tsx:121`, `:137`, `:150`, `:510`, `storefrontDiscovery.ts` |
| Carrello | Drawer accessibile, prodotto e formato, quantità/rimozione 44px, errore persistente, subtotale distinto, checkout nella stessa scheda | Formato monetario diverso dalle card; errore rosso con contrasto insufficiente nel caso misurato; nessun annullamento della rimozione; feedback di aggiunta generico | O: `carrello-390.png`, `audit-errore-checkout-390.png`, suite checkout; C: `CartDrawer.tsx:34`, `:109`, `:187`, `ProductCard.tsx:60`, `Pdp.tsx:229` |
| Navigazione mobile | Ricerca visibile; drawer scorrevole con categorie/sottocategorie e contatto; chiusura al link; nessun overflow nella suite | 21 link nel drawer della fixture; categorie tutte espanse rendono lungo il percorso. Menu 36px a 390px: inferiore al target ergonomico proposto di 44px, senza dedurne automaticamente una violazione WCAG | O: `audit-menu-390.png`, suite tastiera; C: `HomeHeaderOverlay.tsx:375`, `:394` |

### Gerarchia, immagini, microinterazioni e coerenza

Le superfici crema, il verde scuro e la fotografia generosa sono già un sistema riconoscibile. La PDP desktop separa bene fotografia e decisione d'acquisto. Il catalogo favorisce l'esplorazione visiva con meno badge rispetto alla homepage. Il cart drawer protegge la continuità del percorso.

La coerenza si perde tra `ProductCard`, `CatalogProductCard` e suggerimenti PDP: cambiano proporzioni, bordi, CTA, densità e formattazione monetaria. L'obiettivo è un linguaggio comune con varianti editoriali controllate, senza imporre la stessa azione a prodotti con formati multipli. Il crop `object-cover` è un fatto verificato; non è dimostrato che tagli una parte essenziale su fotografie del catalogo reale. Serve una revisione dei media reali prima di scegliere `contain` per tutti.

Le animazioni della hero rispettano pausa e reduced motion. Altre classi di movimento sulle card homepage/correlati non hanno tutte un equivalente `motion-reduce` locale: verificare sistematicamente prima di dichiarare conformità completa. Non sono stati misurati frame rate, CLS o LCP reali.

## 4. Registro dei problemi e priorità

| ID | Riscontro | Priorità proposta | Motivazione e intervento da approvare |
| --- | --- | --- | --- |
| CX-01 | O+C: a 390×900 titolo PDP y=1507, formato y=1802, CTA principale y=1896; barra fissa già disponibile nel primo schermo | P1 | Anticipare identità, prezzo e scelta formato; la barra deve mostrare il formato scelto e condurre alla selezione quando necessario |
| CX-02 | C+O: `best` e `featured` restituiscono la stessa lista; query globale ordinata per ID, nessun segnale vendite | P1 | Rimuovere/rinominare “Più venduti” oppure predisporre una fonte verificabile, senza cambiare di nascosto il contratto PR |
| CX-03 | O+C: fixture con due prezzi 19,90/29,90; card mostra solo 19,90 € senza “Da”; la query globale non fornisce massimo prezzo | P1 | Dichiarare correttamente il prezzo minimo; per distinguere fisso/intervallo serve un contratto dati approvato, non una deduzione dalle opzioni |
| CX-04 | O+C: pulsanti formato senza `aria-pressed`/`aria-checked`; stato solo bordo/riassunto; trigger categorie desktop senza `aria-expanded`/`aria-controls` | P1 | Rendere leggibili stato e relazione del pannello; pattern tastiera da validare con screen reader, senza introdurre ruoli ARIA incompleti |
| CX-05 | O+C: card catalogo `19,90 €`, PDP e carrello `€19.90`; valuta EUR hardcoded in più componenti | P1 | Unificare formattazione italiana sulla valuta ricevuta; rischio multivaluta da confermare, non incidente live dimostrato |
| CX-06 | O+C: errore checkout usa token destructive su background crema; contrasto circa 3,59:1, testo 14px regolare | P1 | Proporre un token testo errore più scuro e verificare almeno 4,5:1 sullo sfondo effettivo; nessun cambio colore in questa fase |
| CX-07 | O+C: prima card catalogo y=625; ricerca ripete testo generale; hero quasi a pieno schermo e trust verticale prima dei prodotti | P2 | Ridurre l'introduzione e anticipare categorie/selezioni; verificare comprensione e scoperta senza dichiarare uplift |
| CX-08 | C+O: card journal non sono link; “Leggi tutto” punta a `/collections/all`; newsletter non attiva occupa 460px minimi | P2 | Collegare solo contenuti realmente pubblicati; ridimensionare o sospendere moduli inattivi con approvazione editoriale |
| CX-09 | O+C: drawer mobile con sottocategorie tutte esposte, target hamburger 36px; desktop categorie attivate da focus/hover | P2 | Proporre gruppi espandibili e target 44px; aggiungere un'attivazione esplicita mouse/touch/tastiera mantenendo i link |
| CX-10 | C+H: catalogo completo prima dei risultati, costo O(N), 100 richieste per 10k nelle prove precedenti | P2, escalation P1 se misure live lo richiedono | Progettare separatamente l'ottimizzazione preservando ranking, faccette, conteggi e sort globali; vietato filtrare una pagina come catalogo completo |
| CX-11 | C: “Tasse incluse.” è testo fisso; policy e pagine informative risultano “in preparazione” | P0 come gate pre-rilascio, non incidente fiscale provato | Marco deve confermare mercato/imposte, consegna, resi, identità e testi; gli indicatori di fiducia devono rimandare a informazioni verificabili |

P0 indica una condizione da risolvere **prima di un eventuale lancio**, non l'autorizzazione a cambiare configurazioni ora. I rischi non verificati rimangono distinti dai difetti riprodotti.

## 5. Benchmark funzionale

Consultazione web il 28 ottobre 2026. Lettura di contenuti resi disponibili dal motore: non sessione d'acquisto completa, non confronto visuale pixel per pixel o valutazione conversione dei concorrenti.

| Pattern | Riscontro ManoMano sulla PDP indicata | Adattamento proposto a Online Garden |
| --- | --- | --- |
| Navigazione | Categorie e ricerca evidenti | Tassonomia botanica esistente; ricerca sempre raggiungibile |
| Immagini | Gallery con conteggio | Conservare zoom; indicare posizione e formato |
| Prezzo/CTA | Acquisto vicino al prezzo | Una CTA primaria verde, prezzo della variante |
| Specifiche | Sezione strutturata | Sintesi botanica solo da campi validati |
| Cross-selling | Simili e abbinamenti | Correlati esistenti; compatibilità solo se approvata |
| Fiducia | Recensioni e assistenza | Policy reali; nessun rating inventato |
| Disponibilità | Non accertata dinamicamente | Usare `availableForSale`, nessuna quantità dedotta |
| Varianti | Interazione non verificata | Scelta esplicita e stato selezionato accessibile |
| Filtri | Fuori dalla PDP esaminata | Preservare faccette globali; arricchimento separato |
| Carrello | CTA presente; drawer non provato | Conservare drawer e checkout Shopify esistenti |

Fonte primaria: [PDP ManoMano richiesta](https://www.manomano.it/p/stufa-a-legna-in-ghisa-remilly-7kw-invicta-73795828). Le promozioni e condizioni del concorrente non sono adottate. La pagina categoria ManoMano tentata non era accessibile al lettore web: filtri e checkout del concorrente restano non verificati.

Il [catalogo piante IKEA](https://www.ikea.com/it/it/cat/piante-da-vaso-700524/) espone accesso ai risultati, conteggio e ordinamento/filtro. Il pattern utile è distinguere introduzione e percorso operativo: per Online Garden proponiamo un'introduzione breve e risultati più vicini, senza aggiungere confronto prodotti in questa fase.

La [PDP botanica IKEA](https://www.ikea.com/it/it/p/monstera-deliciosa-pianta-da-vaso-pianta-del-formaggio-svizzero-50515493/) separa cura, ambiente e misure. Online Garden può adottare questa separazione informativa, distinguendo vaso, pianta fornita e dimensione adulta. Nessuna caratteristica della Monstera o promessa del concorrente viene trasferita al nostro catalogo. Disponibilità locale e checkout IKEA non sono stati completati.

## 6. Catalog experience: fattibilità dei percorsi

**Presenza di un campo ≠ copertura sufficiente.** Sono state verificate query, parser e UI; non è stato letto il catalogo live e non è disponibile un censimento attuale completo. Nessuna percentuale di completezza è quindi dichiarata. Non si approvano nuovi filtri botanici con queste sole evidenze.

| Percorso | Dati realmente presenti nel contratto | Realizzabilità e dipendenza |
| --- | --- | --- |
| Tipologia botanica | `CATEGORIES`, membership `collections`, `productType`, `tags` nel catalogo | Navigazione già attiva. Una faccetta canonica può riusare la membership disponibile, dopo censimento associazioni e gestione del limite `collections(first:50)`; non cambiare tassonomia automaticamente |
| Ambiente | Tag/tipo/collezioni; nessun campo ambiente normalizzato nella query globale | “Piante da esterno” è una categoria editoriale, non prova di idoneità di ciascuna pianta a balcone/interno/clima. Richiede tassonomia e approvazione Marco |
| Esposizione | Può comparire in `custom.attributi_prodotto` della PDP | Non presente nella query catalogo; chiavi libere, nessun censimento. Richiede normalizzazione, unità semantiche e copertura |
| Fioritura | PDP `custom.periodo_di_fioritura`; parser mesi JSON/testo già disponibile | Non caricato nel catalogo. Distinguere ignoto/non applicabile, mesi validi e contesto climatico approvato prima della faccetta |
| Colore | Filtro attuale da opzioni variante `color/colore/tonalit`; PDP `colore_fiore`, `colore_foglia` | Il filtro esistente riguarda opzioni commerciali. Colore fiore/foglia è un attributo distinto: non unirli. Realizzabile attuale solo dove opzioni valorizzate; nuova faccetta subordinata ai dati |
| Dimensione | Filtro formato da `size/taglia/misura/formato`; altri attributi liberi PDP | Formato vaso acquistato già filtrabile dove disponibile. Altezza fornita, sviluppo adulto e ampiezza non si possono dedurre dal vaso; servono unità e campi approvati |
| Difficoltà | PDP `custom.difficolta_di_coltivazione`, normalizzazione easy/medium/hard/unknown | Non nel payload globale, copertura ignota. Arricchimento e validazione prima del filtro “Facile” |
| Disponibilità/prezzo | `availableForSale`, `minVariantPrice`, valuta | Filtri già presenti e provati sulle fixture. Disponibilità prodotto non promette tutte le varianti; prezzo minimo non è il prezzo di ogni formato |

Il primo passo dati proposto è un censimento futuro autorizzato per categoria: N pubblicati, N applicabili, N validi, ignoti, non applicabili, duplicati/sinonimi e conflitti. Denominatore esplicito e data della lettura. Soglia **proposta**, da approvare: almeno 95% di validi sugli applicabili per attivare una faccetta, 100% dei valori mostrati validati; gli ignoti restano nel catalogo e non sono trasformati in “facile”, “sole” o “non fiorisce”.

La collezione carica a pagine di 60: nuovi filtri globali richiedono aggregati affidabili o caricamento completo dichiarato, mai conteggi dedotti dalla prima pagina. Conservare ricerca su descrizione/handle/vendor/tag/tipo/tassonomia, priorità titolo, cancellazione richieste, deduplica, prodotti test esclusi e paginazione varianti.

## 7. Cart e checkout: progetto vincolato

Conservare **`cartCreate → checkoutUrl`** e navigazione nella stessa scheda. Nessun checkout custom o nuova mutation. Il carrello locale è una selezione, non una prenotazione delle scorte; prezzo/disponibilità sono ricontrollati nel checkout secondo il comportamento esistente.

Proposta: feedback “Aggiunto: [titolo], [formato], quantità [n]” con azione “Vai al carrello”; nessuna apertura forzata a ogni aggiunta. Quantità e rimozione restano disabilitate durante la creazione checkout. Un eventuale annullamento rimozione ripristina solo la riga locale e va specificato/testato prima dello sviluppo. Errore persistente, carrello conservato e un solo invio attivo rimangono requisiti inderogabili.

Klarna, Apple Pay, Google Pay, Shop Pay, Satispay e carte non sono dichiarati disponibili: `PaymentInformation` usa la lista confermata vuota. Un elenco approvato deve riportare negozio, mercato, valuta/dispositivo pertinente, data e responsabile della verifica Shopify. Costi, tempi, soglie gratuite, sconti e resi compaiono solo dopo conferma di Marco e della configurazione effettiva.

## 8. Decisioni e materiale consegnato

Proposte desktop/mobile, gerarchia PDP e regole di design sono nel [design system](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md); attività P0/P1/P2/P3, rischi e criteri sono nella [roadmap](CUSTOMER-EXPERIENCE-ROADMAP.md). Anteprima concettuale separata: `online-garden-cx-preview.html` nella cartella di consegna; non è una preview di codice implementato e non interagisce con Shopify.

Serve una successiva approvazione della direzione e del perimetro di sviluppo. Nessun commit, push, merge, deploy, modifica PR o cambiamento applicativo è stato effettuato.
