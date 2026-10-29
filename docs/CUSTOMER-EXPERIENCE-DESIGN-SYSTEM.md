> **Review Fase 9 — 29 ottobre 2026:** le sei viste e i viewport mobili compatti confermano la direzione approvata. Nessun token, font o componente applicativo modificato durante la review; [valutazione finale e limiti](CUSTOMER-EXPERIENCE-FINAL-REVIEW.md).

# Customer Experience 2.0 — design system approvato e implementato

29 ottobre 2026. **Direzione approvata dall’utente e Task 1–5 implementati; READY FOR REVIEW locale.** Questa sezione governa lo stato corrente. Le specifiche Fase 7 conservate sotto sono storiche; le alternative discordanti non sono state applicate. [Report tecnico](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md) · [Confronti React](customer-experience-implementation-evidence/2026-10-29/README.md).

## Identità e token effettivi

Figtree/Inter e fallback sans attuali per testo e titoli; Playfair del marchio preesistente conservato. Nessun nuovo font o dipendenza. Crema `--background: 42 38% 97%`, testo `--foreground: 140 18% 13%`, verde `--primary: 122 26% 38%` e `--primary-dark: 122 26% 30%` invariati. Fotografie Online Garden esistenti; nessun asset dei concorrenti.

| Ruolo | Implementato | Ambito |
| --- | --- | --- |
| Card/foto commerciali | `--og-radius-card: 0.875rem` (14px) | `.og-storefront`, `.og-product-card`, `.og-catalog-card`; nessuna modifica del radius globale |
| Hero | Raggio 14px mobile / 20px da md; altezza minima contenuto 390px / 420px | Foto esistenti, scrim leggibile e controlli del carosello conservati; nessuna animazione nuova |
| Controlli acquisto | Radius 8px; CTA primaria verde pieno, secondaria con bordo | “Acquista ora” già presente: solo stile cambiato, handler invariato |
| Pillole | Radius pieno; altezza minima 44px | Link categoria reali; disclosure filtri esistenti, senza nuove faccette |
| Errori checkout | `.og-storefront-error`, HSL `0 64% 35%` | 8,13:1 misurato sul fondo effettivo; `--destructive` globale/Admin invariato |
| Focus | Outline 2px verde scuro; offset 2–4px, ring header scuro | Storefront e chiusure dialog circoscritti |
| Spazi | Scala Tailwind esistente: 4/8/12/16/20/24/32/40/56px | Nessun reset generale del layout |

## Tipografia e layout realizzati

Hero sans 32px mobile / 52px da md, line-height 1,08. Titolo PDP 28px / 36px da md; catalogo 32px / 40px da sm / 48px da md. Titoli selezioni home circa 26px / 32px. Body e controlli riusano le classi attuali; niente serif editoriale aggiuntivo.

Homepage: header preservato, hero fotografica con margini, categorie subito dopo, tre selezioni con algoritmo/deduplica esistenti. Due card per riga su mobile e quattro da lg. Journal senza destinazioni, collage ripetitivo e grande banner newsletter inattivo rimossi; il footer e i suoi contatti restano disponibili.

Catalogo: ingresso sintetico; ricerca, conteggi e ordinamenti globali conservati; controlli filtro/ordinamento sulla stessa riga mobile. Filtri a disclosure in sidebar desktop e drawer mobile, con intestazioni a pillola. Due card mobile e tre da md; sidebar da lg. Testo introduttivo lungo e relativo disclosure spostati dopo i prodotti, senza cancellarne i contenuti SEO.

PDP max1200px: un solo H1 e un solo blocco commerciale. Ordine DOM mobile titolo/prezzo → gallery → formato/disponibilità/quantità/CTA → descrizione e dettagli. Da lg, grid `gallery identity / gallery buy / editorial editorial`, colonna acquisto 420px e gap 56px. Foto mobile con spazio riservato `min(45svh,340px)`, da sm `min(55svh,480px)`, desktop rapporto 5:6; miniature e zoom preservati. La gallery non cambia dimensioni durante il caricamento nelle fixture testate. Non è una certificazione CLS dell’intero sito.

Sotto 768px la barra fixed mantiene variante, prezzo unitario e quantità della CTA; usa il medesimo handler, safe area e z-index preesistenti. Sparisce durante lo zoom. Drawer e dialog rimangono sopra la barra. Target verificati da 44px per varianti, quantità, CTA, header mobile, filtri e chiusure dialog. Sotto 360px le due parole del marchio si dispongono verticalmente per conservare i target senza overflow.

## Semantica di prezzo e stato

`formatMoney`, `formatProductPrice`, `formatCartSubtotal` usano importo e valuta Shopify. “Da” solo con min/max validi nella stessa valuta e massimo maggiore del minimo; più formati a prezzo uguale non bastano. Il massimo è richiesto come campo additivo nelle query pubbliche; nessuna deduzione dalle anteprime varianti. In assenza del massimo non compare “Da”. Quantità/importi sommati in decimale; valute diverse nel carrello mostrate separatamente, senza conversione.

Selezione variante con `aria-pressed`, gruppo etichettato e testo live prezzo/formato/disponibilità. Errori checkout persistenti con `role="alert"`; tastiera, Escape e ritorno focus preservati. Nessuna recensione, scarsità numerica, sconto, dato botanico o promessa logistica aggiunta. Disponibilità deriva dai campi Shopify esistenti, non da quantità inventate.

## Proposte rimaste aperte

Audit completo WCAG e screen reader reali, Safari/dispositivi, webfont/immagini/mercati live, eventuali nuove faccette botaniche e servizi editoriali/newsletter richiedono lavoro separato. Nessun serif nuovo, acquisto aggiuntivo, nuovo metodo pagamento o motore di ricerca introdotto. I gate commerciali/SEO/checkout live della PR rimangono aperti.

---

## Archivio — specifica proposta Fase 7, 28 ottobre 2026

Il testo seguente documenta le ipotesi precedenti: non sostituisce le decisioni implementate sopra.

# Online Garden — Customer Experience Design System 2.0

28 ottobre 2026. **Specifiche proposte, non implementate.** Baseline: PR #39, `aa7e6aeb9aa0eafc01f655976f342733562bb824`. [Audit e fonti](CUSTOMER-EXPERIENCE-AUDIT.md) · [Roadmap](CUSTOMER-EXPERIENCE-ROADMAP.md).

## 1. Direzione: botanica contemporanea, acquisto leggibile

Mantenere la fotografia botanica, crema e verde naturale, il marchio esistente e le categorie canoniche. Migliorare gerarchia commerciale, leggibilità dei dettagli, continuità tra homepage/catalogo/PDP e uso dello spazio. Sospendere o ridimensionare sezioni prive di una destinazione o servizio attivo. Nessun rebranding automatico, nuova libreria UI, nuovo font o motore commerciale.

Il carattere premium deriva da immagini curate, testo leggibile e informazioni affidabili. La proposta non usa badge promozionali, urgenza artificiale o promesse logistiche per creare fiducia.

## 2. Colori: inventario esistente e impieghi proposti

Valori **esistenti**, letti da `src/index.css`; non sostituiti in questa fase.

| Token | Valore HSL esistente | Uso attuale / regola proposta |
| --- | --- | --- |
| `--background`, `--cream` | `42 38% 97%` | Fondo crema; mantenere |
| `--foreground` | `140 18% 13%` | Testo principale; mantenere |
| `--card` | `0 0% 100%` | Superfici opache per decisioni e pannelli |
| `--primary`, `--forest` | `122 26% 38%` | Verde principale; proporre CTA primaria uniforme |
| `--primary-dark` | `122 26% 30%` | Marchio, enfasi e hover |
| `--primary-foreground` | `48 33% 97%` | Testo sulle superfici verdi |
| `--muted` | `48 27% 94%` | Fondi secondari, non stato disabilitato universale |
| `--muted-foreground` | `140 10% 39%` | Testo secondario leggibile |
| `--sage` | `98 18% 71%` | Accento botanico su aree limitate |
| `--sand` | `38 25% 90%` | Separazione editoriale leggera |
| `--border`, `--input` | `42 20% 86%` | Separatori; non affidarsi a questo solo tono per rendere riconoscibile un controllo |
| `--accent` | `87 20% 53%` | Decorazione; evitare testo piccolo chiaro senza contrasto verificato |
| `--destructive` | `0 84% 60%` | Errore attuale; proporre variante testuale più scura |
| CTA diretta PDP | `#B4483C`, hover `#9A3A2F` | Valori hardcoded, non token globali. Proposta: verde primario, “Acquista ora” secondaria |

Calcolo sRGB sui token opachi, non certificazione di tutte le combinazioni del sito: foreground/background 14,63:1; primary-foreground/primary 4,79:1; primary-foreground/primary-dark 6,82:1; muted-foreground/background 5,23:1; muted-foreground/muted 4,93:1. Accent con primary-foreground 2,74:1 e destructive con bianco 3,78:1: inadatti al normale testo piccolo in quelle combinazioni. La presenza del token non prova che ogni coppia sia usata.

Nel caso riprodotto del messaggio di errore checkout, destructive su background crema è circa 3,59:1: una criticità concreta descritta in CX-06. **Proposta nuova** `error-text: 0 70% 35%`, da validare sul fondo effettivo prima dell'adozione. Non scurire globalmente `--destructive` senza verificare tutti i suoi usi, anche fuori dallo storefront.

Target progettuale: testo normale almeno 4,5:1, testo grande almeno 3:1 e componenti/stati essenziali almeno 3:1. Verificare overlay fotografici, trasparenze, hover, focus e messaggi separatamente. Colore sempre accompagnato da etichetta o forma.

## 3. Tipografia

**Esistente:** body Figtree → Inter → Arial/Helvetica; titoli Inter → Figtree; marchio e footer Playfair Display. Caricamento Google Fonts nel documento HTML; le catture offline usano fallback. Token Tailwind già disponibili: hero 48px/1,02, section 36px/1,12, subsection 24px/1,3, card-title 18px/1,4; esistono numerosi override nelle pagine, inclusa la hero.

**Proposta:** consolidare gli usi, mantenendo i font attuali. Il serif rimane al marchio e a brevi momenti editoriali; titoli di prodotto e controlli rimangono sans-serif per scansione e chiarezza.

| Ruolo | Desktop proposto | Mobile proposto | Regola |
| --- | --- | --- | --- |
| Titolo hero | 48–64px, line-height 1,05 | 32–40px, 1,1 | 2–3 righe; testo fuori dal punto focale della foto |
| H1 catalogo/PDP | 36–40px, 1,15 | 28–32px, 1,15 | Nessun taglio del nome prodotto essenziale |
| H2 sezione | 28–32px, 1,2 | 24–28px, 1,2 | Spaziatura coerente, non tutto maiuscolo |
| Titolo card | 16–18px, 1,4 | 15–16px, 1,4 | Almeno due righe; espandibile nel dettaglio |
| Prezzo PDP | 28–32px, 1,15 | 26–28px, 1,15 | Tabular numerals; distinto da subtotale e prezzo minimo |
| Body | 16px, 1,6 | 16px, 1,55 | Lunghezza 55–75 caratteri dove possibile |
| Metadati | 13–14px, 1,45 | 13–14px, 1,45 | Nessun dato d'acquisto essenziale a 9–10px |
| Form e ricerca | 16px | 16px | Etichette visibili, placeholder supplementare |
| CTA | 14–16px, 600 | 14–16px, 600 | Sentence case; evitare tracking molto largo |

Le dimensioni sono specifiche da validare al 200% di zoom e a 320px, non una migrazione applicata.

## 4. Spaziature, superfici e responsive

**Esistente:** raggio base `0.9rem`; container Tailwind fino a 1400px, header fino a 1600px, contenuto catalogo fino a 1280px, PDP fino a 1200px; sidebar catalogo 260px, pannello PDP 420px. Breakpoint: sm 640, md 768, lg 1024, xl 1280, 2xl 1536. Header completo da xl, barra acquisto solo sotto 768px. Catalogo 2 colonne mobile/3 da md; collezione 2/3/4; homepage 1/2/4.

**Proposta:** scala 4/8/12/16/24/32/48/64px; margini 16px mobile, 24–32px tablet, 32–48px desktop. Container contenuti 1280px, header espandibile mantenendo tutti i comandi; PDP fotografia 55–60% e acquisto 40–45% a desktop, senza irrigidire i 420px su viewport insufficienti. Gap card 12–16px mobile, 24px desktop. Sezioni 32–40px mobile, 56–64px desktop.

Foto con bordi 0–4px, card commerciali 8px, drawer/dialog 12–16px: gerarchia proposta, non sostituzione obbligatoria di `--radius`. Ombra solo per elementi sovrapposti o in elevazione. Ridurre gradienti/glass nella lettura dei dati; mantenere fondi opachi per formati, importi e avvisi.

Reflow proposto: 320–639 mobile, 640–1023 tablet, da 1024 contenuto su colonne quando entra, header completo solo da 1280 come oggi. Testare in modo mirato il tratto 768–1023: oggi non ha né pannello PDP desktop né barra mobile. Nessun problema di questo tratto è dichiarato riprodotto con la sola analisi del breakpoint.

## 5. Componenti e stati

| Componente | Da mantenere | Proposta e stati richiesti |
| --- | --- | --- |
| Header | Categorie canoniche, ricerca, account e carrello | Ricerca sempre riconoscibile; trigger menu esplicito con stato aperto; touch target 44px; niente categorie fittizie |
| Navigazione mobile | Drawer con scroll e contatti | Gruppi collassabili, categoria visitabile e comando espandi distinti; focus visibile e ritorno al trigger; evitare menu annidati superflui |
| Product card | Immagine/link, titolo, prezzo, sold out | Un modello commerciale comune; minima decorazione; stato assente immagine; prezzo minimo dichiarato; CTA “Scegli formato” se serve selezione |
| Gallery PDP | Immagini esistenti e zoom dialog | Foto principale con crop approvato, miniatura selezionata semanticamente identificata, contatore; nessun carousel automatico prodotto |
| Selettore variante | Opzioni e disponibilità da Shopify | Fieldset/legend e radio nativi o pattern accessibile completo; nome, selezione, indisponibilità testuale; nessuna variante inventata |
| Prezzo | Prezzo variante e currencyCode | Formattazione `it-IT` uniforme; niente euro hardcoded; prezzo minimo distinto dal selezionato; imposte solo se confermate |
| CTA | Lock checkout e prima variante disponibile | “Aggiungi al carrello” verde primaria; “Acquista ora” secondaria da validare; pending/disabled/errore e retry conservati |
| Scheda botanica | Parser e rendering condizionali | 3–4 caratteristiche pertinenti in sintesi; approfondimenti più in basso; non tradurre dato mancante in valore di default |
| Calendario | Mesi validati e alternativa testuale | Sintesi mesi leggibile su mobile, dettaglio completo espandibile; niente griglia obbligatoriamente larga nel primo percorso |
| Filtri | Stato pending/applica mobile e semantica globale | Chip dei filtri applicati, reset raggiungibile, nessuna faccetta vuota o non supportata; conteggio solo sul set completo |
| Carrello | Riga variante, quantità e conservazione errore | Feedback specifico; importi uniformi; eventuale annulla rimozione da progettare; subtotale ≠ totale finale |
| Trust | Contatto vivaio e informazioni condizionali | Massimo 2–3 messaggi verificabili; link alle policy pubblicate; niente loghi pagamento non confermati |

Stati obbligatori per tutte le proposte: caricamento, pronto, vuoto, errore iniziale, errore pagina successiva, variante esaurita, selezione non risolvibile, checkout in preparazione e retry. Le informazioni già caricate non vengono perse per un errore non critico dei correlati.

## 6. Homepage — proposta desktop e mobile

| Ordine | Desktop 1440×900 | Mobile 390×844, con verifica 320px |
| --- | --- | --- |
| Header | Marchio, categorie esistenti, ricerca immediatamente riconoscibile, account/carrello | Menu, marchio compatto, ricerca, carrello; campo ricerca accessibile senza attraversare il menu |
| Hero | Singola foto botanica esistente; blocco titolo 6 colonne, CTA catalogo; altezza indicativa 440–520px | Foto/overlay controllato, titolo breve e CTA; 360–440px indicativi, adattivi al testo. Nessun vincolo rigido che tagli contenuti |
| Esplorazione | Categorie canoniche con immagini esistenti, senza nuovi percorsi basati su attributi non censiti | 2 colonne di categorie o lista compatta; tutte disponibili anche senza swipe |
| Prodotti | Novità e selezioni esistenti, card coerenti, 4 colonne | 2 colonne se nome/prezzo restano leggibili a 320px; alternativa 1 colonna da validare per titoli lunghi |
| Fiducia/editoriale | Fascia breve con policy approvate; articolo solo con destinazione reale | 2 rassicurazioni concise dopo il primo percorso utile; newsletter inattiva ridotta o rimossa |

Mantenere la logica di selezione e deduplica della PR. Non denominare “stagionale”, “resistente” o “facile” una selezione senza una base editoriale approvata. La modifica della hero è una proposta: l'attuale versione conserva il controllo pausa finché non venga approvata una versione statica.

## 7. Catalogo — proposta desktop e mobile

Desktop: breadcrumb → H1/una frase → eventuali categorie canoniche → conteggio/ordinamento → sidebar 240–260px e griglia di 3 colonne. A 1440×900 la prima riga dovrebbe mostrare almeno nome/prezzo di alcune card con contenuti rappresentativi. È un criterio da verificare, non una proprietà dell'app attuale.

Mobile: H1 e frase breve → ricerca attiva se presente → conteggio → riga “Filtri”/“Ordina” → chip applicati → griglia 2 colonne. Target proposto: prima card entro y=420 a 390×844 con header standard e introduzione breve; con zoom o titoli lunghi prevale il reflow, non il vincolo pixel. “Carica altri” rimane esplicito; annunciare aggiornamento risultati senza spostare il focus a ogni batch.

Il pannello filtri propone solo disponibilità/prezzo e opzioni formato/colore realmente presenti nello scope. Nessun filtro “sole”, “facile” o “fiorisce ora” nell'anteprima iniziale. Colore commerciale e colore botanico restano separati. Query ricerca nell'URL e ranking restano quelli della PR; persistenza di filtri/sort è una successiva proposta con schema URL e regole robots/canonical da definire.

Collezione: riusare intestazione e card, mantenendo il pulsante di pagina e conteggio “caricati”. Non mostrare un totale globale o faccette globali se è nota soltanto la pagina corrente.

## 8. PDP — proposta desktop e mobile

### Gerarchia desktop

Breadcrumb; sinistra fotografia e miniature, destra nome commerciale, nome botanico se presente, sintesi disponibile, prezzo della variante, formato/altre opzioni, disponibilità, quantità, CTA primaria, secondaria, informazioni di consegna verificabili. Dettagli botanici e calendario sotto la prima decisione; correlati in un'unica sezione successiva, mantenendo il ranking esistente.

### Gerarchia mobile

1. Breadcrumb compatto e **nome della pianta**.
2. Foto principale e contatore, senza anteporre tutta la scheda botanica al titolo.
3. Nome botanico e massimo 3 caratteristiche disponibili, senza valori inventati.
4. Prezzo, scelta formato, altre opzioni, stato disponibilità e quantità.
5. “Aggiungi al carrello”, eventuale “Acquista ora” secondaria, avviso checkout e consegna.
6. Descrizione, caratteristiche, cura/calendario, FAQ reali, correlati.

La barra inferiore proposta mostra prezzo **e formato selezionato**. Se non è possibile rappresentare chiaramente la selezione, usare “Scegli formato” con scorrimento al controllo; non cambiare automaticamente la variante quando il cliente preme la barra. La preselezione esistente della prima vendibile può essere mantenuta se chiaramente comunicata. Quando la CTA principale è visibile, valutare la scomparsa della duplicata; rispetto safe-area e nessuna sovrapposizione con drawer, tastiera o dialog.

### Le nove domande dell'acquirente e le fonti ammesse

| Domanda | Fonte già letta dalla PDP | Posizione proposta / assenza dato |
| --- | --- | --- |
| Che pianta è? | `title`, `nome_comune`, `nome_botanico`, descrizione | Identità in alto; i nomi mancanti non si generano |
| Dove coltivarla? | Attributi prodotto, origini/habitat, guida approvata | Sintesi solo se la semantica è esplicita; non dedurre dal nome categoria |
| Difficoltà? | `difficolta_di_coltivazione` | Etichetta leggibile se presente; ignoto non diventa facile |
| Quando fiorisce? | `periodo_di_fioritura`, parser mesi | Sintesi testuale e calendario successivo; nessun mese inferito |
| Dimensioni raggiunte? | Attributi approvati, se distinguono sviluppo adulto | Specifiche; vaso e altezza fornita non sostituiscono altezza adulta |
| Quale variante? | `options`, `variants`, `selectedOptions` | Gruppo acquisto e barra mobile; nome sempre leggibile |
| È disponibile? | `selectedVariant.availableForSale` | Accanto alla scelta; nessun numero di pezzi o data riassortimento |
| Quanto costa? | `selectedVariant.price.amount/currencyCode` | Prezzo aggiornato alla selezione; fiscalità da confermare |
| Come arriva? | Testi commerciali approvati; opzioni checkout | Vicino alla CTA; fino a conferma, solo indicazione attuale dei costi/opzioni al checkout e contatto vivaio |

## 9. Accessibilità, movimento e performance

Conservare skip link, form/select nativi, dialog Radix, Escape e ripristino focus. Proporre target ergonomici 44×44px; distinguere questa scelta dal minimo normativo. Focus mai coperto da header/sticky, ordine DOM coerente con quello visivo, disponibilità e selezione leggibili senza colore. Verifica successiva con tastiera, VoiceOver/Safari e un secondo screen reader/browser concordato.

Microinterazioni proposte 120–200ms per stati e 200–300ms per pannelli; nessun movimento necessario a capire lo stato. Con reduced motion nessun autoplay, parallax o traslazione decorativa. Non annunciare ogni cambio foto automatico ai lettori di schermo. Nessun test prestazionale reale già implicito.

Riutilizzare asset attuali; proporre `sizes/srcset`, dimensioni riservate e priorità solo alla foto iniziale, dopo verifica dei media disponibili. Non appesantire il payload globale con tutti i metafield per supportare filtri non approvati. Qualunque strategia di caricamento anticipato deve conservare risultati globali, ranking, cancellazione e prodotti nascosti della PR.

## 10. Anteprima e approvazione

L'anteprima concettuale `online-garden-cx-preview.html` consente di selezionare Homepage/Catalogo/PDP e Desktop/Mobile: rappresenta sei viste, senza accesso a rete o scritture. Foto tratte dagli asset esistenti; nomi, prezzo, disponibilità e attributi sono segnaposto espliciti. Le CTA di acquisto sono disabilitate. Non è una riproduzione del sito implementato né un'approvazione di testi commerciali. Le specifiche qui riportate prevalgono sulle semplificazioni del mockup.

Da approvare: gerarchia mobile PDP, CTA verde primaria, densità homepage/catalogo, regole card/prezzo, trattamento moduli inattivi. Dati botanici, mercato fiscale, policy, pagamenti e arricchimenti richiedono risposte separate di Marco. L'approvazione della direzione non autorizza automaticamente modifiche backend o servizi live.
