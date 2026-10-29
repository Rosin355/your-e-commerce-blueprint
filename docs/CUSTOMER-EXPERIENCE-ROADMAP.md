# Customer Experience 2.0 — roadmap aggiornata

29 ottobre 2026. **Task 1–5 implementati, QA offline positiva, READY FOR REVIEW.** Direzione approvata dall’utente: sans attuali, crema/verde, Silver Garden per home/catalogo, Plantella per gerarchia PDP. Base verificata PR #39 `aa7e6ae`; nessun cambiamento della PR o dei servizi live. [Report](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md) · [Design system effettivo](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md).

| Lotto | Stato effettivo | Evidenza / limite |
| --- | --- | --- |
| Gate reference/proposta/approvazione | Completato | Due reference lette in originale; proposta desktop/mobile approvata esplicitamente |
| Task 1 — PDP | Implementato | Titolo/prezzo prima della gallery mobile; acquisto prima degli approfondimenti; sticky coerente; due colonne desktop |
| Task 2 — prezzi | Implementato | Helper unico, valuta Shopify, intervallo min/max reale, somme per valuta; test EUR/USD/JPY e quantità |
| Task 3 — ordinamento | Implementato | Voce `best`/“Più venduti” rimossa; gli altri ordinamenti restano globali e verificati |
| Task 4 — accessibilità mirata | Implementato nel perimetro | Selezione/annunci/focus; errori a 8,13:1; target 44px; non equivale a audit WCAG completo |
| Task 5 — discovery/contenuti | Implementato | Hero compatta, categorie reali, card morbide; moduli inattivi ridotti; testo catalogo conservato dopo i prodotti |
| QA e commit | Completato localmente | Typecheck/lint/build, 431 test dominio, 38 scenari browser; confronti app prima/dopo |
| Pubblicazione | Non eseguita, fuori autorizzazione | Nessun push, merge, PR nuova, deploy o test pagamento live |

A 390×900 il primo prodotto del catalogo è a y=409 (prima 625), sotto il target indicativo y=420 della Fase 7; primo prodotto home y=785 (prima 1813); titolo PDP y=193 (prima 1507). Sono misure di layout a fixture identiche, non risultati di conversione o performance live.

## Aperto dopo questo lotto

- Revisione designer/cliente del risultato React e dei [sei confronti](customer-experience-implementation-evidence/2026-10-29/README.md). La proposta storica non viene dichiarata pixel-identica all’app: altezze, responsive e carosello sono stati adattati ai contenuti/controlli esistenti.
- Gate R0 commerciali della PR: conferma Marco su mercato, imposte (“Tasse incluse” preesistente), consegna, resi e pagamenti realmente abilitati. Nessuna nuova promessa aggiunta.
- Verifica autorizzata Shopify in staging: campi delle query effettive, valuta/stock/varianti reali, checkout sandbox e rientro. Nessun ordine reale eseguito qui.
- Audit accessibilità completo, lettore di schermo reale, Safari e dispositivi; prestazioni su rete mobile e risorse reali. I controlli ARIA automatici non sostituiscono l’ascolto con screen reader.
- Gate SEO/dominio/HTTP/sitemap e hosting della PR #39 ancora separati. Metadati descrittivi e contratti esistenti preservati.
- Nuove faccette botaniche, motore ricerca, newsletter e articoli richiedono dati/contenuti/servizi reali approvati. Nessuna funzione fittizia aggiunta.
- L’attesa del catalogo completo, costo O(N) e richieste sequenziali restano limiti della PR; non è stato introdotto un ordinamento su risultati parziali.

I punti del backlog storico R1/R2 coperti da questo lotto sono soddisfatti soltanto nei termini dichiarati sopra; ad esempio annulla rimozione carrello e navigazione mobile progressiva non sono stati aggiunti. Nessuna chiusura automatica di tutto il backlog Fase 7.

---

## Archivio — backlog e ipotesi Fase 7

Le priorità e i criteri seguenti sono lo storico della proposta; lo stato corrente è nella matrice sopra.

# Online Garden — Customer Experience Roadmap 2.0

28 ottobre 2026. **Piano proposto, nessuna implementazione avviata.** Revisione analizzata: `aa7e6aeb9aa0eafc01f655976f342733562bb824`, Draft PR #39 aperta e non unita. [Audit](CUSTOMER-EXPERIENCE-AUDIT.md) · [Specifiche](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md).

## 1. Regole e ordine delle decisioni

P0 = gate prima del lancio; P1 = chiarezza acquisto/accessibilità prioritaria; P2 = scoperta e coerenza; P3 = evoluzione subordinata a dati e misure. Le priorità sono valutazioni, non risultati di test A/B. Impatto alto/medio indica la rilevanza attesa per il percorso; rischio indica possibilità di regressioni o dipendenze operative. Nessuna stima di uplift o calendario concordato è disponibile.

Prima approvare il perimetro UX, poi aprire un intervento separato sulla revisione effettiva concordata. Se la PR cambia, riconciliare la baseline e i criteri di regressione. Questo piano non modifica la PR #39, non ne autorizza il merge e non assume che sia già su main.

## 2. Backlog prioritario

| ID / priorità | Intervento e problema | Impatto / rischio | Dipendenze e responsabile | Criterio di accettazione verificabile |
| --- | --- | --- | --- | --- |
| R0.1 / P0 | Completare informazioni commerciali e verificare “Tasse incluse” (CX-11) | Alto / alto per contenuti e mercato | Marco: mercato, trattamento imposte, consegna, resi, identità, contatti; referente configurazione Shopify | Ogni affermazione commerciale ha fonte approvata/data/responsabile; policy raggiungibili dal percorso d'acquisto; nessun claim di spedizione, sconto o disponibilità dedotto |
| R0.2 / P0 | Verifica checkout e pagamenti prima del lancio | Alto / alto operativo | Marco e responsabile store; ambiente test autorizzato e futura autorizzazione separata alla prova | Checkout di test `cartCreate → checkoutUrl` verificato su variante disponibile/esaurita, quantità, errore/retry e rientro; nessun ordine reale; metodi mostrati soltanto dopo conferma di configurazione/mercato/dispositivo |
| R0.3 / P0 | Confermare revisione, approvazione e confini futuri | Alto / medio integrazione | Responsabile tecnico + approvazione utente; stato aggiornato PR/main | Baseline fissata; diff previsto solo storefront concordato; regressioni PR preservate; niente backend/Admin/auth/RLS/sync; gate SEO/ambiente della PR ancora tracciati separatamente |
| R1.1 / P1 | Riordinare PDP mobile e barra acquisto (CX-01) | Alto / medio layout e focus | Approvazione direzione; frontend UX | Titolo prima della gallery; blocco prezzo/varianti prima degli approfondimenti; barra mostra formato o conduce alla scelta; fixture con più formati, esaurito e nome lungo; nessun occultamento CTA/dialog a 320–430px e 200% zoom |
| R1.2 / P1 | Correggere significato degli ordinamenti (CX-02) | Alto fiducia / basso se etichetta, alto se nuovo ranking | Marco: rimuovere/rinominare “Più venduti” oppure fonte vendita; frontend | Nessun ordinamento presentato come vendite senza fonte; sorting globale, ranking ricerca e stabilità verificati, inclusi prodotti oltre 1.000 |
| R1.3 / P1 | Prezzo minimo, importi e valuta coerenti (CX-03/CX-05) | Alto / medio dati e copy | Decisione “Da” su prezzo minimo o estensione contratto prezzo; mercato confermato | Card/PDP/cart usano valuta ricevuta e formato italiano; card dichiara il minimo; variante a prezzo diverso aggiorna PDP/cart; nessun prezzo fisso dedotto da una sola option o variante di anteprima |
| R1.4 / P1 | Selezione variante e menu accessibili (CX-04) | Alto / medio interazione | Frontend + QA accessibilità | Stato selezionato e gruppo annunciati, controllo utilizzabile con tastiera e screen reader; menu comunica apertura/relazione pannello; zoom conserva Escape/focus; nessun ruolo ARIA solo decorativo |
| R1.5 / P1 | Contrasto errore checkout (CX-06) | Medio-alto / basso se token locale | Approvazione colore testo errore; QA | Testo normale almeno 4,5:1 sullo sfondo effettivo, anche hover/focus pertinenti; errore persistente e carrello conservato; nessuna modifica globale non verificata in Admin |
| R2.1 / P2 | Accorciare introduzione catalogo/ricerca (CX-07) | Medio-alto / basso | UX copy + approvazione design | A 390×844 standard prima card entro y=420 come target; query/conteggio e filtri leggibili; testi lunghi e zoom rifluiscono; nessuna attesa nascosta o promessa di risultati completi prima del termine |
| R2.2 / P2 | Homepage più orientata ai percorsi (CX-07/CX-08) | Medio-alto / medio visivo/editoriale | Marco: selezioni, destinazioni articoli e newsletter; UX | Categorie disponibili prima dei moduli lunghi; logica homepage/deduplica invariata; CTA editoriali con destinazione coerente; niente iscrizione fittizia o nuova piattaforma newsletter |
| R2.3 / P2 | Unificare card e immagini | Medio / medio | UX + verifica asset reali e titoli lunghi | Nome/prezzo/stato/azione coerenti; minimo prezzo distinto; multi-formato conduce alla PDP; crop approvato; stati senza immagine/esaurito; nessun richiamo botanico generico non validato |
| R2.4 / P2 | Navigazione mobile progressiva (CX-09) | Medio / medio focus e scoperta | UX; tassonomia esistente | Espansione categoria distinta dal link; tutti i link raggiungibili; touch target 44px proposto; tastiera/Escape/ritorno focus; test 320/390 e tablet |
| R2.5 / P2 | Cart feedback, rimozione e chiarezza | Medio / medio stato locale | UX + frontend; approvazione eventuale annulla | Feedback annuncia prodotto/formato/quantità e azione carrello; annulla, se approvato, ripristina una sola riga locale; checkout lock e retry non duplicano quantità; no secondo carrello remoto |
| R2.6 / P2 | Misurare e progettare riduzione attesa (CX-10) | Potenzialmente alto / alto architettura | Autorizzazione staging, dataset rappresentativo, misure mobile, responsabile tecnico | Baseline distinta per volume/rete; prima card/interattività/byte/richieste e correttezza globale; proposta confrontata a 1k/5k/10k senza truncation; nessun cambio ricerca o servizio esterno automatico |
| R2.7 / P2 | Persistenza filtri e continuità collezione | Medio / medio semantica e SEO | Approvare schema URL, aggregazione e robots/canonical | Back/forward conservano query/sort/filtri; nessun conteggio globale sulla prima pagina; collezioni oltre 60 mantengono deduplica/retry; non alterare i canonical senza decisione specifica |
| R3.1 / P3 | Censire e normalizzare dati botanici | Alto abilitante / alto dato | Marco responsabile botanico; futura autorizzazione letture dataset | Report per campo/categoria: applicabili, validi, ignoti, non applicabili, conflitti, data e fonte; nessuna scrittura o backfill implicito |
| R3.2 / P3 | Nuove faccette e ricerca guidata | Alto potenziale / alto dati e performance | R3.1; approvazione vocabolari e copertura; budget payload | Attivare solo campi approvati e completi; soglia proposta 95% applicabili, valori mostrati 100% validati; ignoti non etichettati falsamente; filtri globali e paginazione preservati |
| R3.3 / P3 | Cross-selling compatibile e contenuti editoriali | Medio / medio dato/editoriale | Marco: compatibilità vaso/pianta, contenuti, priorità | Solo associazioni approvate; nessun “acquistati insieme” senza dati; correlati esistenti non regressi; niente recensioni sintetiche o rating generati |
| R3.4 / P3 | Misurazione funnel e test con utenti | Alto decisionale / medio privacy e operatività | Piano misure/consensi approvato; nessun tracker installato qui | Definizioni eventi e denominatori concordati; utenti rappresentativi completano ricerca, variante e cart; risultati con numerosità/limiti, nessun uplift attribuito senza dati |

## 3. Dati: ciò che può partire dopo approvazione e ciò che resta subordinato

**Con contratti attuali:** riorganizzazione PDP, gerarchia CTA, etichette, stato selezionato, focus, formattazione valuta, riduzione introduzioni, trattamento moduli inattivi. La navigazione canonica e filtri prezzo/disponibilità/opzioni esistono già; nessuna necessità di riscrivere il motore ricerca per questi interventi.

**Richiede censimento/arricchimento:** ambiente, esposizione, fioritura, colore botanico, altezza adulta e difficoltà nel catalogo. I metafield PDP non sono presenti nella query globale. Il “formato” del vaso non equivale alla dimensione adulta. La completezza reale resta ignota. Anche nuovi filtri per tipologia richiedono verifica delle membership prima di pubblicarne i conteggi.

**Richiede decisione operativa separata:** loghi/metodi di pagamento, fiscalità, promesse logistiche, policy, newsletter, recensioni, tracking, compatibilità prodotti e nuovi servizi. Questa roadmap non autorizza modifiche Shopify, Supabase, Admin V2, Edge Functions, auth, RLS o sincronizzazioni.

## 4. Registro decisioni di Marco

| Decisione | Evidenza richiesta | Blocca |
| --- | --- | --- |
| Mercati, imposte e valuta | Conferma configurazione effettiva e testi approvati | R0.1, parte di R1.3 |
| Spedizione, resi, identità e assistenza | Documenti/versioni/destinazioni pubblicabili; nessun tempo/soglia inventato | R0.1, trust e PDP |
| Metodi pagamento | Elenco verificato nello Shopify corretto, per mercato/dispositivo pertinente; data/responsabile | R0.2, eventuali badge |
| Direzione visiva e CTA | Valutazione sei viste e specifiche, inclusa priorità “Aggiungi” | R1.1, R2.1–R2.4 |
| “Più venduti” | Rinomina/rimozione approvata o vera fonte e finestra vendite | R1.2 |
| Significato attributi botanici | Vocabolari, mesi, unità, applicabilità, clima e responsabile validazione | R3.1/R3.2 |
| Fotografie e formato fornito | Rappresentatività immagine, vaso incluso, altezza fornita/adulta distinti | R2.3 e accuratezza PDP |
| Articoli, newsletter, selezioni e abbinamenti | Contenuti realmente disponibili e associazioni approvate | R2.2/R3.3 |
| Ambiente test e misurazione | Store/mercato/dataset autorizzati, priorità e perimetro | R0.2/R2.6/R3.4 |

Non serve attendere tutte le risposte per valutare il design. Per implementare ciascun blocco è però necessaria l'approvazione successiva prevista dalla richiesta, più le sole dipendenze applicabili.

## 5. Sequenza di esecuzione futura

1. Approvare design e perimetro; aggiornare baseline tecnica rispetto a PR/main senza toccare il lavoro originale.
2. Risolvere le decisioni P0 documentali/commerciali, predisporre un piano di verifica autorizzato. Nessuna attivazione servizi implicita.
3. Realizzare un lotto P1 circoscritto: PDP mobile, trasparenza prezzi/sort, semantica selezioni e contrasto. Review prima di qualunque pubblicazione.
4. Validare il lotto, poi P2: scoperta homepage/catalogo, card/menu/cart. L'ottimizzazione dati resta una proposta tecnica separata.
5. Solo dopo censimento e approvazione dei dati, valutare P3 faccette/assistente/abbinamenti.

Nessun effort in giornate o data di rilascio promessi prima della revisione tecnica e delle decisioni di contenuto.

## 6. Criteri di non regressione e verifica

Per il futuro lotto frontend concordato: typecheck/build/lint mirato e test di dominio pertinenti nel runtime corretto; QA browser con fixture prima delle verifiche reali autorizzate. Non correggere gli script package o il backend come effetto collaterale.

- Catalogo oltre 1.000 e varianti oltre 100; cursori ripetuti/mancanti, deduplica e errore pagina successiva. Ricerca, faccette, conteggi e sort sul set globale completo.
- Titolo prioritario, accenti, tassonomia, descrizione/handle/vendor/tag/tipo preservati; prodotti test sempre esclusi; selezioni home e correlati stabili.
- Variante disponibile oltre le prime dieci; prodotto esaurito; combinazioni non disponibili; passaggio rapido tra PDP e richieste cancellate.
- Aggiunta, quantità, rimozione, checkout concorrente, errore e retry senza seconda aggiunta; URL fresco nella stessa scheda; nessun pagamento reale nelle prove fixture.
- Mobile 320/375/390/430, tablet 768/1024, desktop 1280/1440; titoli lunghi, 200% zoom, tastiera virtuale e safe-area su dispositivi rappresentativi.
- Tastiera e screen reader: stato variante, menu, focus non coperto, dialog, ritorno focus, errori e aggiornamenti. Misurazione contrasto sulle superfici reali; nessuna certificazione WCAG dedotta dalla sola suite.
- SEO DOM/canonical/robots/JSON-LD esistenti preservati. I gate pubblici di dominio, crawling, sitemap e HTTP 404 restano quelli della PR: non si risolvono con il redesign.

Metriche future proposte: completamento ricerca→PDP, scelta variante corretta, aggiunta cart e avvio checkout; tempo al primo risultato distinto dalla correttezza globale, errori/retry e comprensione del prezzo. Nessun tracker o nuovo trattamento dati introdotto in questa fase.

## 7. Stato di questa consegna

Audit, specifiche, sei viste concettuali e documentazione di stato predisposti nella copia isolata. Suite UX esistente ripetuta: 15/15 PASS offline; sonda aggiuntiva con misure/screenshot e nessuna eccezione JS. Non equivale a QA di implementazioni future. Originale preservato via hash/stato; nessuna modifica applicativa, dipendenza nuova, commit, push, merge, deploy o scrittura live.
