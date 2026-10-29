# Online Garden — Fase 8: direzione visiva, preliminare

29 ottobre 2026, Europe/Rome. **Stato: in attesa delle due immagini di riferimento e della successiva approvazione visuale.** Nessuna implementazione React avviata. Questo documento prepara il confronto, non sostituisce l'analisi delle immagini mancanti.

## 1. Baseline e materiale effettivamente disponibile

- GitHub read-only: PR #39 aperta, Draft, non unita; branch `codex/storefront-main-integration`, HEAD `aa7e6aeb9aa0eafc01f655976f342733562bb824`, invariati rispetto alla richiesta.
- Nuovo worktree `/private/tmp/online-garden-customer-experience-implementation`, branch `codex/customer-experience-implementation`, derivato esattamente da tale HEAD.
- Letti audit, design system e roadmap Fase 7 dalla consegna separata. Consultati screenshot dell'attuale homepage desktop, PDP desktop/mobile e dell'anteprima precedente; verificati i relativi contratti nel codice della PR.
- Le immagini Silver Garden e Plantella non sono visibili nel messaggio ricevuto, non sono state individuate nel repository e non risultano file immagine negli allegati locali accessibili. Non ne sono stati inventati colori, font, proporzioni, stati interattivi o dettagli.
- I nomi delle reference e le rispettive aree di applicazione provengono dall'addendum dell'utente. Non sono stati usati risultati web omonimi in sostituzione dei file richiesti.

## 2. Cosa mantenere di Online Garden

| Elemento verificato | Motivazione |
| --- | --- |
| Palette crema/verde e superfici botaniche | Identità esistente riconoscibile; evolve senza un redesign completo |
| Marchio Online Garden e fotografie locali esistenti | Continuità visiva e assenza di materiale copiato dai riferimenti |
| Figtree/Inter e Playfair Display nel marchio | Sistema già configurato; nessuna nuova famiglia o dipendenza necessaria prima dell'analisi |
| Categorie canoniche e ricerca attuale | Conservare ranking titolo/tassonomia, query, paginazione completa ed esclusione prodotti test |
| Selezioni home e correlati | Preservare membership e deduplica, senza introdurre presunte vendite o compatibilità |
| Gallery, zoom, varianti complete e disponibilità Shopify | Mantengono affidabilità e contenuti esistenti; va cambiata la gerarchia, non la logica d'acquisto |
| Skip link, dialog, reduced motion, lock e retry checkout | Sono requisiti di continuità della PR #39 |

Nell'attuale PDP mobile gli approfondimenti precedono il blocco d'acquisto. La sintesi futura dovrà correggere tale ordine mantenendo l'immagine protagonista e spazio riservato ai media. Le coordinate della Fase 7 restano evidenze storiche del 28 ottobre, non nuove misure del 29.

## 3. Silver Garden → homepage, navigazione, card e filtri

**Attribuzione richiesta dall'utente, non analisi osservata della reference.** Una volta disponibile Reference A, ricavare la gerarchia di navigazione, il rapporto testo/foto della hero, il ritmo delle sezioni e il comportamento delle pillole. Tradurre questi principi negli asset e nei token Online Garden, senza trasferire logo, foto, copy o componenti identici.

Ipotesi di adattamento da verificare e presentare:

- Homepage con hero fotografica esistente e accesso chiaro a categorie reali e catalogo; quantità di spazio e proporzioni da definire dopo l'immagine.
- Sezioni prodotto con card coerenti tra home/catalogo, usando i dati ricevuti e l'azione appropriata alla presenza di varianti.
- Filtri a pillola soltanto come presentazione delle faccette già supportate. Selezione esposta semanticamente, reset e nomi leggibili; nessun nuovo filtro botanico dedotto dalle fotografie.
- Su mobile, pillole e comandi rifluiscono o hanno un overflow locale controllato; nessun percorso essenziale disponibile solo con hover o swipe. Il pattern preciso resta da approvare.

## 4. Plantella → PDP, gallery e acquisto

**Attribuzione richiesta dall'utente, non analisi osservata della reference.** Una volta disponibile Reference B, confrontare gallery, ordine identità/prezzo/formato, selettore quantità e gerarchia CTA con la PDP corrente.

Vincoli già definiti dal brief:

- Titolo tempestivo; prezzo e variante vicini; disponibilità derivata dalla variante Shopify.
- Gallery con spazio riservato, foto e zoom preservati; nessun layout shift introdotto per riordinare il mobile.
- Stato del formato selezionato leggibile anche da tastiera/screen reader; quantità e CTA touch adeguate.
- Sticky coerente con il formato e prezzo selezionati; approfondimenti dopo il percorso essenziale.
- Nessuna modifica a `cartCreate → checkoutUrl`, retry, lock o gestione concorrenza della PR.

Il ruolo primario di Plantella non autorizza a copiarne l'identità. Posizione, raggio, dimensioni, proporzioni, spaziatura e stili verranno definiti nel confronto da approvare.

## 5. Token esistenti e decisioni ancora aperte

| Area | Baseline verificata | Decisione visuale |
| --- | --- | --- |
| Fondo | `--background: 42 38% 97%` | Mantenere identità crema; applicazioni nuove da proporre |
| Testo | `--foreground: 140 18% 13%` | Preservare leggibilità e verificare fondi effettivi |
| Verde | `--primary: 122 26% 38%`, `--primary-dark: 122 26% 30%` | Gerarchia CTA finale da approvare nel confronto |
| Errori | `--destructive: 0 84% 60%`; criticità checkout già documentata | Correzione prevista nel perimetro; colore locale e contrasto da misurare, nessun cambio globale Admin |
| Tipografia | Figtree/Inter, marchio Playfair Display | Scale e pesi della sintesi non ancora approvati |
| Raggio | Base `0.9rem`, override nei componenti | Forma delle pillole e card da definire sulla reference |
| Layout | PDP max 1200px, catalogo max 1280px, header fino a 1600px | Ritmo e proporzioni desktop/mobile da presentare |
| Responsive | 320/375/390/430/768/1440 richiesti; breakpoint attuali già descritti in Fase 7 | Nessuna misura nuova attribuita ai riferimenti assenti |

Le specifiche della Fase 7 rimangono proposte, salvo i vincoli espliciti del nuovo brief. Nessuna decisione visuale viene registrata come approvata senza un successivo riscontro dell'utente.

## 6. Confronto visivo da produrre dopo ricezione delle reference

| Superficie | Confronto desktop | Confronto mobile | Materiale mancante |
| --- | --- | --- | --- |
| Homepage e navigazione | UI attuale → proposta originale con Reference A | UI attuale → proposta a 390px, verifica 320px | Immagine Silver Garden |
| Card e filtri catalogo | UI attuale → proposta con faccette esistenti | UI attuale → pillole, griglia e stato selezione | Immagine Silver Garden |
| PDP | UI attuale → proposta con Reference B | UI attuale → sequenza gallery/identità/variante/CTA | Immagine Plantella |

La preview Fase 7 rimane un precedente progettuale: non è un mockup derivato da Silver Garden o Plantella, non approva la sintesi nuova e non va presentata come confronto già completato. Nessun nuovo confronto visivo prodotto in assenza dei riferimenti.

## 7. Regola prezzi aggiornata dal Task 2

“Da” soltanto se i dati dimostrano **un intervallo reale**, ossia minimo e massimo validi, stessa valuta e massimo maggiore del minimo. Una pluralità di formati non dimostra un intervallo: le varianti possono avere prezzo identico.

Le query correnti espongono `minVariantPrice`, ma non il massimo. Prima della futura implementazione valutare una lettura additiva del massimo dal contratto Storefront: nessuna scansione di anteprime parziali e nessuna deduzione dai primi dieci formati. Con massimo non noto non mostrare “Da” come se l'intervallo fosse provato. I segnaposto “Da” della vecchia preview non sono una regola di produzione.

## 8. Passaggio allo sviluppo

Prima ricevere ed esaminare le due immagini; poi produrre le viste desktop/mobile, aggiornare token/layout proposti e richiedere approvazione della soluzione concreta. Solo dopo avviare React, QA e commit implementativi locali previsti dalla Fase 8. L'addendum dell'utente richiede esplicitamente: “Non iniziare l'implementazione React finché la nuova direzione visiva non è stata approvata.”
