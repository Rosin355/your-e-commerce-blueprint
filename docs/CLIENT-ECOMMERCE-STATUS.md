## 29 ottobre 2026 — Review finale Customer Experience completata

**Valutazione visuale e verifiche locali positive.** Homepage, catalogo e scheda prodotto rispettano la direzione approvata; mantenuti font, crema/verde, fotografie e identità Online Garden. Verificati anche formato, prezzo e barra acquisto su telefoni compatti, con carrello e checkout simulato.

431 test di dominio e 42 scenari browser positivi. Nessun cambiamento applicativo ulteriore; amministrazione, dati e servizi restano invariati. Il toast errore esistente può coprire brevemente il fondo del carrello sui telefoni bassi: scompare automaticamente e il retry è verificato. Le conferme commerciali di Marco, i test live e l’audit accessibilità completo restano aperti.

È ora autorizzata la pubblicazione del solo branch di sviluppo e una Draft PR separata, dipendente dalla PR #39. **Il negozio non viene distribuito online.** Esiti GitHub e URL saranno registrati dopo l’apertura; nessun merge o deploy. [Final review](CUSTOMER-EXPERIENCE-FINAL-REVIEW.md) · [Screenshot e nuove verifiche](customer-experience-final-review-evidence/2026-10-29/README.md). La cronologia precedente resta conservata.

---

## 29 ottobre 2026 — Nuova esperienza implementata e pronta per review

**La direzione approvata è ora applicata in una copia di lavoro separata; il negozio online non è stato pubblicato o modificato.** Restano font, colori crema/verde, marchio e fotografie Online Garden. Homepage e catalogo hanno hero più compatta, card arrotondate e accessi diretti alle categorie. La scheda prodotto porta prima nome, prezzo e scelta del formato; il pulsante principale è verde e la barra mobile segue la variante selezionata.

Prezzi e valuta sono coerenti; “Da” appare solo per un vero intervallo. Rimossa “Più venduti” senza una classifica verificabile. Migliorati contrasto degli errori, selezione dei formati, focus e dimensione dei controlli. Le informazioni di prodotto restano nei dati esistenti; nessuna recensione, promozione, quantità di scorte o promessa di consegna aggiunta.

[Sei confronti prima/dopo del sito implementato](customer-experience-implementation-evidence/2026-10-29/README.md), per home/catalogo/PDP desktop e mobile. A 390px si raggiunge il primo prodotto del catalogo circa 216px prima e il titolo della scheda oltre 1.300px prima. Sono misure di layout su prodotti sintetici di prova, non un aumento di vendite stimato.

Verifiche positive: typecheck, lint mirato, build, 431 test di dominio e 38 scenari browser, anche con prodotti esauriti, varianti e checkout simulato. Nessuna regressione rilevata nelle prove. Restano da verificare separatamente pagamenti/mercati live, Safari e accessibilità completa; consegna e condizioni commerciali richiedono ancora conferma di Marco prima del lancio.

**READY FOR REVIEW sul branch locale `codex/customer-experience-implementation`.** Nessun push, merge, nuova PR, deploy o cambiamento a pagamenti, amministrazione, dati o sincronizzazioni. [Report tecnico e limiti](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md) · [Roadmap](CUSTOMER-EXPERIENCE-ROADMAP.md). Le proposte e i blocchi documentati sotto sono lo storico precedente all’approvazione e all’implementazione attuali.

---

## 29 ottobre 2026 — Proposta grafica pronta da valutare

**Le due reference sono state analizzate e il sito non è stato modificato.** È pronta una proposta originale: ritmo fotografico, card e pillole ispirati a Silver Garden; scheda prodotto più chiara nella scelta del formato, ispirata alla gerarchia Plantella. Restano colori, marchio e fotografie di Online Garden.

Sono disponibili [sei viste e i confronti con il sito attuale](design/proposals/2026-10-29/README.md), per homepage, catalogo e prodotto su desktop/mobile. Entrambe le reference ricevute erano desktop: le soluzioni mobile sono state progettate per Online Garden. I prototipi usano segnaposto e non permettono acquisti; nessun prezzo, recensione, sconto, numero di scorte o promessa di consegna è stato aggiunto al negozio.

La proposta porta titolo/prezzo prima della gallery su telefono, avvicina formati e quantità alla CTA, distingue il pulsante principale dalla seconda azione e rende più diretti i percorsi verso il catalogo. È una direzione da approvare, non un miglioramento già pubblicato o un aumento di conversione misurato.

Il passaggio successivo è approvare o correggere la [direzione visuale](CUSTOMER-EXPERIENCE-VISUAL-DIRECTION.md). L'implementazione dei cinque task inizierà solo dopo tale approvazione. Nessuna modifica a pagamenti, amministrazione, dati o sincronizzazioni; nessun commit implementativo o pubblicazione. La cronologia preliminare è conservata sotto; le immagini inizialmente mancanti sono ora disponibili.

---

## 29 ottobre 2026 — Fase 8, preparazione della direzione grafica

**Il negozio non è stato modificato.** È stato creato un ambiente di lavoro separato dalla revisione esatta della Draft PR #39, che resta aperta e non unita. La documentazione della Fase 7 e le immagini del sito attuale sono state consultate.

La nuova richiesta prevede una sintesi tra Silver Garden per homepage/catalogo e Plantella per la scheda prodotto. I due file immagine non sono però presenti fra gli input accessibili. Per evitare interpretazioni arbitrarie, la nuova proposta grafica non è stata ancora costruita né presentata come approvata. Sono pronti [gli elementi da mantenere e il percorso di adattamento](CUSTOMER-EXPERIENCE-VISUAL-DIRECTION.md).

Una volta ricevute le reference, verranno preparati i confronti desktop/mobile e presentati per approvazione, come richiesto dall'addendum. Solo successivamente inizieranno le modifiche a scheda prodotto, prezzi, ordinamento, accessibilità e percorsi di scoperta. “Da” sarà usato solo quando i dati dimostrano un vero intervallo di prezzi, anche in presenza di più formati.

Nessun intervento applicativo o nuovo test Fase 8 completato, nessun pagamento/carrello reale creato e nessuna pubblicazione. Non è ancora una consegna READY FOR REVIEW dell'implementazione. [Piano e stato tecnico](CUSTOMER-EXPERIENCE-IMPLEMENTATION.md). La cronologia precedente è conservata sotto.

---

## 28 ottobre 2026 — Progetto della nuova esperienza cliente, Fase 7

**Audit e proposta completati; il sito non è stato modificato né pubblicato.** La Draft PR #39 è ancora aperta e non unita a main. L'analisi usa esattamente la sua revisione `aa7e6ae`, in una copia separata che preserva il lavoro locale e i file originali.

La proposta mantiene l'identità botanica e le fotografie attuali. Su telefono porta prima il nome della pianta, il prezzo e la scelta del formato; rende più uniformi card e pulsanti e accorcia le introduzioni per raggiungere prima i prodotti. Include sei viste concettuali: homepage, catalogo e scheda prodotto, ciascuna desktop e mobile. Sono proposte da valutare, non nuove funzioni già disponibili.

I principali problemi verificati riguardano il formato poco visibile prima dell'aggiunta dalla barra mobile, il prezzo minimo non qualificato nelle card, la formattazione monetaria diversa tra pagine, la voce “Più venduti” senza un ordinamento basato sulle vendite e il contrasto del messaggio di errore checkout. Le basi affidabili vengono conservate: ricerca completa, gestione varianti, recupero dagli errori e pagamento sul checkout Shopify.

Sono passati 15 scenari browser con prodotti di prova e sei larghezze di schermo. Non sono stati creati carrelli/ordini reali o provati pagamenti live; le fotografie locali sono visibili ma font e logo remoti sono esclusi dalle prove offline. Questa verifica non dichiara il negozio pronto al lancio.

**Da confermare con Marco:** imposte/mercati, pagamenti effettivamente attivi, spedizioni/resi/policy, completezza dei dati botanici, immagini/formato fornito, priorità editoriali e direzione grafica. Filtri per sole, fioritura, dimensione adulta o facilità non saranno introdotti solo perché esiste qualche informazione nelle schede: prima servono dati sufficienti e validati.

La [roadmap](CUSTOMER-EXPERIENCE-ROADMAP.md) separa condizioni per il lancio e miglioramenti progressivi. Per avviare lo sviluppo occorre una successiva approvazione del perimetro proposto. Nessun cambio a Shopify, amministrazione o sincronizzazioni; nessuna nuova dipendenza, modifica PR, commit, push, merge o deploy. Il testo precedente rimane sotto come cronologia.

[Audit completo](CUSTOMER-EXPERIENCE-AUDIT.md) · [Proposte e specifiche](CUSTOMER-EXPERIENCE-DESIGN-SYSTEM.md) · [Evidenze browser](customer-experience-evidence/2026-10-28/README.md).

---

# Online Garden — aggiornamento cliente

28 ottobre 2026. **Migliorie integrate e verificate localmente; pubblicazione non effettuata.**

La nuova versione è stata preparata sulla base più recente del sito. Conserva categorie, selezioni della homepage, suggerimenti e prodotti di prova nascosti. Il lavoro precedente è stato preservato integralmente.

## Miglioramenti verificati con dati di prova

- La ricerca può raggiungere anche i prodotti oltre il millesimo. Sono stati controllati cataloghi sintetici da 1.205 e 10.000 prodotti, mantenendo filtri, conteggi e ordinamenti sull'intero insieme.
- Le schede caricano tutte le varianti; verificato un prodotto di prova con 205 formati. Gli errori di caricamento hanno un messaggio e un nuovo tentativo, senza mostrare dati parziali come completi.
- Il percorso di acquisto gestisce doppi clic ed errori, senza raddoppiare la quantità al nuovo tentativo. Il checkout Shopify resta quello esistente; le prove sono simulate e non hanno creato ordini o carrelli reali.
- Navigazione mobile, tastiera e ingrandimento immagini migliorati. Disponibilità e informazioni della pianta vengono mostrate dai dati ricevuti, senza numeri di stock o descrizioni botaniche generati.
- Titoli e descrizioni delle pagine aggiornati durante la navigazione; pagine mancanti contrassegnate per non essere indicizzate dopo il caricamento dell'app. Aggiunti dati descrittivi delle schede, senza prezzi o recensioni inventati.

Il catalogo completo richiede ancora il caricamento di tutte le pagine prima dei risultati: i test non dimostrano tempi reali su rete mobile o Shopify. La maggiore copertura non equivale a una promessa di maggiore velocità. La riduzione dei dati per singolo prodotto è stata misurata soltanto su fixture controllate.

## Da validare prima del lancio

Confermare dominio pubblico, indicizzazione e pagine mancanti sul sito effettivamente pubblicato; provare in un ambiente autorizzato prodotti/varianti/prezzi/disponibilità reali e checkout di test; approvare pagamenti, spedizioni, resi e pagine informative. Non sono stati attivati servizi, newsletter o metodi di pagamento per deduzione.

L'amministrazione, le sincronizzazioni e i dati del negozio restano quelli della versione recente. Non sono stati modificati dati, prezzi, giacenze, utenti o configurazioni live. Nessuna pubblicazione automatica o nuova Pull Request creata.

Questo documento descrive lo stato cliente. Dettagli tecnici e prove sono nel [report di integrazione](STOREFRONT-MAIN-INTEGRATION.md).
