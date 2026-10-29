# Online Garden — Fase 8: direzione visiva approvata

29 ottobre 2026, Europe/Rome. **Direzione approvata dall’utente e implementata nel lotto Task 1–5.** Sans attuali, crema/verde, identità e fotografie Online Garden confermati. [Design system effettivo](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md) e [report React](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md) descrivono il risultato. Le sezioni seguenti conservano l’analisi e i valori proposti prima dello sviluppo; alternative serif/hero statica non sono state introdotte.

## 1. Reference effettivamente esaminate

Le immagini sono state lette dal worktree originale senza modificarlo:

| Reference | Percorso originale | Dimensioni | SHA-256 |
| --- | --- | --- | --- |
| A — Silver Garden | `/Users/romesh/Desktop/Cose belle/your-e-commerce-blueprint/docs/design/references/silver-garden-home-reference.png` | 2048×1647 | `3ae15f3e9376a7640537d16fc6d3dae19b26aa8ce435be8ed2a9b46a47380760` |
| B — Plantella | `/Users/romesh/Desktop/Cose belle/your-e-commerce-blueprint/docs/design/references/plantella-pdp-reference.png` | 2048×1603 | `0abee3d8b3821d66c6031bbc5ccf75cc122124db8ab74d6a3c60a5f2161d9d11` |

Entrambe mostrano composizioni desktop. Non sono disponibili versioni mobile, DOM o stati interattivi: le osservazioni riguardano immagini statiche, non comportamento, performance o accessibilità dei siti di origine. La resa mobile è una proposta originale.

Baseline Online Garden: PR #39 ancora aperta, Draft e non unita, branch `codex/storefront-main-integration`, HEAD `aa7e6aeb9aa0eafc01f655976f342733562bb824`, riconfermato tramite GitHub read-only. Confronto con screenshot Fase 7 della stessa revisione, acquisiti il 28 ottobre con fixture offline. L'applicazione non è stata rieseguita in questa fase visuale.

## 2. Silver Garden: osservazioni e adattamento

**Osservato:** header chiaro con marchio centrato e categorie su riga dedicata; hero fotografica arrotondata con testo in basso a sinistra e CTA a destra; porzioni di slide adiacenti e controlli di carosello; grande titolo di sezione, pillole con selezione evidenziata e card fotografiche ravvicinate con valutazioni sovrapposte. Il bordo inferiore attribuisce il progetto a Silver Garden su Dribbble; non è stato cercato un sito omonimo.

**Da adattare:** ritmo fotografia → selezione → prodotti, margini della hero, card morbide, pillole riconoscibili. Online Garden mantiene il marchio a sinistra e le categorie canoniche. Hero con fotografia outdoor esistente, raggio proposto 20px e altezza 430px desktop/330px mobile; testo attuale e CTA al catalogo. Card con immagini dal raggio 14px e azioni leggibili. In homepage le pillole navigano verso collezioni reali; nel catalogo aprono solo faccette supportate.

**Da escludere:** “Best Sellers” senza fonte vendite, rating generati, classificazioni pet friendly o caratteristiche ambientali non presenti nei dati. Nessun logo, slogan, fotografia o componente identico viene trasferito. Il carosello non è assunto necessario: si propone una hero statica, senza nuove animazioni, ancora da approvare.

## 3. Plantella: osservazioni e adattamento

**Osservato:** fondo verde chiaro; immagine ampia su superficie quasi bianca e colonna commerciale distinta; breadcrumb, titolo dall'aspetto serif, prezzo/riga spedizione, formato/quantità, CTA affiancate e separatori. Una seconda immagine è visibile sotto la principale. Sono presenti prezzo barrato, bestseller, scarsità numerica con barra, servizi e rassicurazioni logistiche.

**Da adattare:** separazione gallery/acquisto, raggruppamento dei controlli e gerarchia delle CTA. Online Garden mantiene il fondo crema e il container PDP da 1200px. Desktop: gallery a sinistra; nome, nome botanico condizionale, prezzo della variante, formato, quantità, disponibilità e acquisto a destra. CTA primaria verde piena, “Acquista ora” secondaria con bordo. Gli approfondimenti seguono il blocco essenziale.

Mobile: breadcrumb → titolo/nome botanico condizionale → prezzo → gallery con spazio riservato → formato → quantità/disponibilità → CTA → consegna/pagamento → approfondimenti. Il riepilogo mobile riporta formato e prezzo selezionati. Nel prototipo è rappresentato come componente statico: posizionamento fixed, safe-area e interazione con drawer/tastiera restano da implementare e verificare dopo approvazione.

**Da escludere:** prezzo barrato, conteggi scorte, urgenza, barra stock, bestseller, gift wrap, altri negozi, resi gratuiti o date di consegna non confermati. Nessuna foto, descrizione botanica o identità Plantella riutilizzata.

## 4. Cosa mantenere di Online Garden

| Elemento | Decisione proposta e motivazione |
| --- | --- |
| Marchio, crema e verde naturale | Continuità, senza rebranding |
| Fotografie attuali | Asset del vivaio, senza materiale delle reference |
| Figtree/Inter e Playfair Display del marchio | Default consigliato: titoli sans attuali; nessuna nuova famiglia |
| Tassonomia, navigazione e ricerca | Preservare query, ranking, categorie, prodotti nascosti, paginazione e sort globale |
| Selezioni home e correlati | Preservare logica e deduplica; niente classifica vendite o compatibilità aggiunta |
| Gallery/zoom e dati condizionali | Nessuna perdita di foto o informazione inventata |
| Acquisto | `cartCreate → checkoutUrl`, lock, retry, variant ID e quantità invariati |
| Accessibilità esistente | Skip link, dialog, tastiera, focus e reduced motion; nessuna conformità dedotta dal disegno |

## 5. Token e tipografia da approvare

| Ruolo | Esistente | Proposta |
| --- | --- | --- |
| Fondo | `42 38% 97%` | Mantenere crema, senza adottare il verde chiaro diffuso Plantella |
| Testo | `140 18% 13%` | Mantenere |
| Primario | `122 26% 38%` | CTA “Aggiungi” coerente; nessuna disponibilità desunta dal colore |
| Verde scuro | `122 26% 30%` | Marchio, titoli sezione e bordo secondario |
| Testo secondario | `140 10% 39%` | Mantenere, verificando il fondo effettivo |
| Raggi | Base 0.9rem e override | Hero 20px desktop/14px mobile; foto 14px; controlli/CTA 8px; pillole 999px |
| H1 hero | Override attuali più grandi | 52px desktop, 34px mobile; testo lungo rifluisce |
| H1 PDP/catalogo | Sans attuale | 40px desktop, 30px mobile |
| H2 | Sans attuale | 30px desktop, 25px mobile |
| Corpo/controlli | Figtree/Inter | Body 16px, controlli 14–16px; dati essenziali leggibili |
| Spaziatura | Container differenziati | Ritmo 8/12/16/24/36/48; margini 36px desktop, 16px mobile; gap PDP 48px |
| Errore checkout | Criticità storica Fase 7 | Correzione futura circoscritta allo storefront, colore/contrasto da misurare; nessun cambio globale Admin |

Il titolo serif Plantella è trattato come **alternativa editoriale**, esplorabile tramite il controllo opzionale dei titoli nella proposta, riutilizzando Playfair Display già configurato. La raccomandazione mantiene Inter/Figtree per continuità e scansione commerciale. Nessuna famiglia tipografica delle reference è identificata con certezza dal solo screenshot.

Il prototipo usa i nomi delle famiglie attuali con fallback locali e non scarica webfont. Le catture non certificano la resa dei font pubblicati. La rappresentazione si adatta al tema dell'host senza modificare i token applicativi.

## 6. Responsive e componenti

- Desktop: categorie, ricerca, account/carrello; hero con CTA a destra; quattro card home, tre catalogo; PDP su due colonne nel container attuale.
- Sotto 1024px: header compatto e blocchi che rifluiscono, con verifica a 768px.
- Mobile: ricerca raggiungibile; pillole su righe senza swipe obbligatorio; due card per riga se leggibili; titolo/prezzo prima della foto, radio formato e quantità vicini alla CTA.
- Target proposto 44×44px per azioni principali; verifica nell'app futura ancora necessaria. I radio del prototipo espongono selezione nativa e navigazione con frecce.
- Pillole categoria e filtro hanno funzioni diverse: navigazione contro apertura di un controllo. Lo stile non deve eliminare tale differenza semantica.
- Gallery: aspect-ratio riservato, 5:6 desktop e 5:4 mobile nella proposta; crop e zoom con foto intera da verificare su prodotti rappresentativi. Non si dichiara assenza CLS dell'app dal mockup.
- Collezioni: stesso linguaggio card, senza aggiungere faccette globali su pagine parziali o modificare la paginazione.

## 7. Sei viste e confronti

[Indice screenshot e limiti del confronto](design/proposals/2026-10-29/README.md): homepage, catalogo e PDP, ciascuna desktop/mobile. Nella chat i selettori Pagina/Formato/Vista consentono proposta e confronto attuale/proposta.

Le coppie mostrano la prima area di **1440×900** o **390×900**. Gli screenshot attuali sono quelli storici della PR con fixture; le proposte hanno nomi/prezzi segnaposto e asset locali illustrativi. I contenuti differiscono: il confronto illustra ordine dei blocchi e direzione, non conversione, performance o differenze pixel su contenuti identici. Nessun incremento percentuale dichiarato.

Nessun prodotto reale caricato: prezzo assente, disponibilità descritta come campo e Formato A/B segnaposto. La quantità e il formato funzionano solo nel disegno; acquisti disabilitati e nessun accesso a Shopify/Supabase. La gallery mostra una foto reale del repository e un segnaposto per altre foto, senza affermare che uno specifico prodotto ne possieda altre.

## 8. QA e limiti

Controllati solo prototipo e immagini: sei catture complete; reflow a 320/375/390/430/768/1440; passaggio fra viste; radio da tastiera; quantità con minimo uno; riepilogo formato; apertura pillole e menu; acquisti disabilitati; nessuna eccezione JS o chiamata a servizi applicativi. Le risorse statiche del renderer sono registrate separatamente nel [report](design/proposals/2026-10-29/prototype-qa.json).

Non eseguiti nuovi typecheck/build/lint/test React, prove checkout, screen reader reale, performance live o pagamenti. Nessun audit completo WCAG. Gli esiti Fase 7 rimangono storici.

## 9. Decisione richiesta

Approvare o correggere: hero contenuta e card morbide, pillole funzionali, PDP con acquisto anticipato, CTA verde primaria e secondaria con bordo, font sans esistenti come default. L'eventuale titolo serif può essere approvato separatamente senza nuovi font.

L'approvazione riguarda la direzione del lotto Task 1–5, non backend, servizi live o nuove condizioni commerciali. L'utente ha ribadito di non implementare ancora codice applicativo: lo sviluppo attende una successiva approvazione, pur essendo ora disponibili le reference.
