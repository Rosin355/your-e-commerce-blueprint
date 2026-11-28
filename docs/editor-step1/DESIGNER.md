# Step 1 — UX di verifica

## Stato operativo · 28 novembre 2026

La V3 iniziale è visibile nell'anteprima autenticata, non sul frontend pubblico. Conservare l'interfaccia esistente: nessun nuovo sviluppo esplorativo. Le 254 parole, il confronto e la riapertura completa sono evidenze della fixture già collaudata, non una generazione reale corrente. Approvazione, bozza interna e DRAFT Shopify rimangono stati distinti. Curiosità autonoma non persistibile con i grant live attuali. Archivio clienti e Admin globale Marco non ancora rilasciati; non presentarli come disponibili. [Rapporto unico e UAT successiva](../release/CONSEGNA-FINALE-2026-11-28.md), PENDING_CLIENT_ACCEPTANCE, SAL 57,75%.

## V3 · Anteprima cliente

Il primo schermo contiene nome, fonte e generazione. Nel risultato si leggono insieme la quota di fatti coperti e i problemi aperti. Le azioni di sezione sono **Modifica** e **Modifica con AI**. Il confronto prima/dopo richiede una scelta esplicita. Su tablet i controlli vanno a capo e il testo resta in una colonna. Conservare i componenti pubblici di titolo, breve, descrizione, punti elenco, curiosità e FAQ. Le differenze della galleria e dei contenuti commerciali sono indicate accanto all’anteprima. [Catture su tablet](../release/ai-editor-v3/README.md)

## Candidato per Marco · 25 novembre 2026

Nel percorso principale contano i contenuti e l’esito dell’operazione. La vista raccoglie nome, foto, prezzi/formati, testi, SEO e tag. Il pannello tecnico è chiuso alla prima apertura. Nella proposta editoriale, confrontare valore attuale, suggerimento, origine ed eventuali dati mancanti. Verde per preparare/salvare, blu per Shopify, ambra per i controlli, grigio per annullare, rosso per errori ed eliminazione. L’azione distruttiva mostra l’effetto e richiede la digitazione esatta. Verificare con Marco la comprensione delle diciture «Solo Admin», «Admin e Shopify», «Fuori vendita» e «esito da riconciliare». Restano aperti Safari desktop e iPhone. [Collaudo e ricevute](../release/ADMIN-V2-CONSEGNA-MARCO-2026-11-25.md)

## Passaggio al collaudo con Marco · 20 novembre 2026

Sono online il riepilogo della creazione, i campi modificabili segnalati, la descrizione formattata, gli stati di vendita e le azioni distinte di scrittura assistita. La prova Admin ha mostrato «Bozza interna non inviata · fuori vendita» accanto ai dati della lavanda. Ricerca categorie, prezzi per formato, sezioni facoltative e confronto delle proposte sono coperti dai test del candidato.

**Osservazione con Marco.** Chiedergli di trovare i 10,00 EUR, spiegare se la lavanda è acquistabile e cambiare una parola per poi annullare. Lasciargli scegliere i comandi e annotare dove ha bisogno di una spiegazione. Sul dispositivo che usa davvero verificare leggibilità, foto, avvisi e raggiungibilità dei pulsanti. Dopo la sessione valutare come miglioramenti facoltativi solo le etichette o l’ordine dei comandi che gli hanno creato difficoltà. [Checklist di accettazione](CHECKLIST.md)

**Cronologia.** Le note successive descrivono le verifiche alle rispettive date. Le istruzioni che indicano ancora da eseguire merge, deploy o pubblicazione sono superate.

---

## Comportamento del candidato del 20 novembre 2026

Aprendo la scheda, l’operatore trova lo stato di vendita, poi il riepilogo in sola lettura registrato alla creazione e i campi correnti. «Record interno» identifica la scheda Admin. Per una bozza locale senza collegamento il testo è «Bozza interna non inviata · fuori vendita». Un dato Shopify mancante lascia visibile «Visibilità e disponibilità sul sito da verificare». Il canale conferma se almeno un formato è acquistabile. Un prodotto fuori elenco viene indicato come consultabile tramite link.

| Momento | Indicazione per Marco |
| --- | --- |
| Scrivere | «Puoi modificare qui» identifica i campi consentiti. Il comando di salvataggio riguarda la bozza interna. Azioni Shopify e metadati tecnici si aprono separatamente. |
| Usare l’AI | La compilazione da fatti confermati richiede la verifica dell’operatore. Il miglioramento di testo esistente mostra originale e proposta affiancati su desktop e in sequenza su mobile. «Modifica proposta», «Scarta» e «Applica alla bozza» restano espliciti. |
| Recuperare da un errore | In caso di lettura pending fallita, Marco può riprovare il recupero o lavorare manualmente. Le proposte obsolete non sono applicabili. |
| Inserire dati | La ricerca categorie mostra i nomi e le selezioni. Ogni formato distingue SKU, prezzo di vendita e prezzo precedente. Botanica/FAQ e SEO si aprono su richiesta. |
| Controllare immagini e anteprima | Il testo distingue disponibilità del file in libreria, associazione alla bozza e rimozione locale. La foto dispone di miniatura e ALT. Il riepilogo espone campi mancanti e rende il testo formattato in sicurezza. |

Le regressioni responsive sono coperte a 390 e 1280 px. Restano due verifiche umane: comprensione autonoma di «Applica alla bozza» e dello stato fuori vendita, poi navigazione con tastiera e tecnologia assistiva sul dispositivo effettivo. [Checklist](CHECKLIST.md)

---

## Cronologia precedente alla correzione del 20 novembre

## Percorso A — aggiornamento 18 novembre 2026

Preparazione tecnica mantiene editor/AI e UX della PR; conflitto dipendenze risolto senza riscrivere componenti. Il database potrà essere aggiornato in un unico batch canonico 0016/0017 con futura 0018 tecnica, solo dopo autorizzazione. Test sintetici non sono collaudo Marco; funzionalità non dichiarate live. [Esiti tecnici e limiti](ATTIVAZIONE-STEP1C.md). Nessuna variazione del comportamento visibile o dei permessi in produzione.

## Stato attivazione — 18 novembre 2026

**BLOCKED sulla preparazione della migrazione unica**, senza cambiamenti UX: non è dimostrata la corrispondenza della registrazione nativa Lovable con il journal del repository. [Evidenza tecnica](ATTIVAZIONE-STEP1C.md). Editor e assistenza AI rimangono sviluppati ma non distribuiti/consegnati; nessuna nuova prova operativa o modifica del sito. Il collaudo personale resta successivo alle autorizzazioni distinte.

Implementata nell'editor esistente, non pubblicata. Stato complessivo PARZIALE/BLOCCATO per il collaudo live; [limiti tecnici](DEVELOPER.md).

Descrizione: area visuale con toolbar e link etichettato; nessun HTML. Contenuto non rappresentabile senza perdita: avviso e conservazione dell'originale, senza conversione automatica. Editor bloccato non equivale a contenuto vuoto.

Card: azione Modifica in alto, testo Modificabile/In modifica, Bozza interna al posto di Solo Admin. Salva bozza cambia solo il locale; Aggiorna sul sito richiede conferma. Annulla non scrive. Confronti chiusi sotto Dettagli e confronto. Descrizioni alternative indicano che aggiornano lo stesso testo Shopify.

Liste: Punti di forza, Caratteristiche principali, Altri punti utili; una voce per riga, aggiunta/rimozione e su/giù utilizzabili da tastiera. Nessun JSON. Mancata autorizzazione deve produrre una spiegazione, non un pulsante che sembra rotto.

Formati: scelta iniziale Un solo formato/Più formati, esempi esplicativi non precompilati, SKU proposti solo per nuove varianti. Prezzi in euro con virgola, prezzo precedente facoltativo; nessun valore inventato. AI non è necessaria per comprendere il modulo.

Proposta AI: richiesta volontaria, valore corrente e proposta, modifica/scarto/applicazione confermata. Applicare non aggiorna il sito. Su campi vuoti e nuove bozze è presente “Aiutami a compilare”: fatti verificati per riga, conferma non preselezionata, richiesta volontaria, proposta modificabile, Scarta/Applica alla compilazione. Modificare i fatti invalida conferma e proposta; senza dati sufficienti spiegazione e manuale. Il modello organizza soltanto le frasi confermate, senza nuovi claim. Applicare non salva, sincronizza o pubblica.

Test Chromium a 1280 e 390 pixel e tastiera nel percorso sintetico; nessuna certificazione completa WCAG, Safari, screen reader o sessione reale. Prima dell'accettazione: verificare focus, lettura dei messaggi, target touch, descrizioni legacy complesse e contrasto nella sessione autorizzata.

Step 1A: verificato offline; GO al preflight in lettura dopo CI verde, nessuna disponibilità live attestata. Nuovo test browser: campo vuoto e nuova bozza, input insufficiente senza invocazione del provider simulato, scarto, revisione e applicazione visuale.

## Step 1C-1 — caratteristiche e conferma singolo campo

Conservare editor a voci e riordino. Per i tre elenchi separare Salva bozza da Aggiorna sul sito: niente azione combinata mentre si modifica. Solo la versione salvata può essere inviata, dopo dialogo di conferma e approvazione server nuova. La proposta AI non comporta sync. La UI segue le capability per campo del server: se baseline/definizione/tipo non sono verificabili nasconde l’azione e mostra un messaggio accessibile di blocco. Esito incerto: stop e richiesta di verifica, mai invito a riprovare alla cieca. Non comunicare disponibilità live prima del collaudo.

## Step 1C-2 — formato multilinea senza conversioni silenziose

key_features e special_bullets conservano l’editor a voci; la serializzazione a righe avviene solo sul server. Una voce non può contenere una nuova riga in questo formato. Mostrare blocco comprensibile per valori legacy ambigui e preservare l’originale; niente rimozione automatica di righe/spazi. key_benefits resta bloccato sul negozio finché non è approvata una definizione compatibile. Nessuna modifica al parser o al layout storefront. Versione non distribuita: non comunicare disponibilità live.

## Step 1C-3 — posizione futura «Punti di forza»

Il sito attuale ha gia «Cosa lo rende speciale» e «Caratteristiche principali». `key_benefits` NON e renderizzato: l'aggiunta della sola definizione Shopify non compare in PDP. Prima di approvare una terza sezione, validare contenuto, ordine e gerarchia nel layout mobile/desktop; mostrare Punti di forza solo se vi sono voci, senza riempitivi, duplicati o modifiche alle sezioni attuali. La proposta completa e in [SHOPIFY-KEY-BENEFITS-DEFINITION.md](SHOPIFY-KEY-BENEFITS-DEFINITION.md). Nessun design/prodotto live modificato; decisione UX ancora aperta.

## Step 1C-3 — Punti di forza nella PDP

Nuovo accordion Punti di forza accanto a Caratteristiche principali, stesso stile; presente soltanto quando keyBenefits contiene voci valide proprie. Parte chiuso, senza cambiare l’apertura iniziale delle sezioni esistenti. Nasconde solo nel nuovo blocco le voci identiche già visibili in Cosa lo rende speciale/Caratteristiche principali; se restano zero voci, niente titolo o spazio vuoto. Nessuna sostituzione, riordinamento o variazione dei consumer precedenti. Valori incompatibili o ambigui non sono normalizzati né mostrati come JSON.

Prove su PDP sintetica desktop 1280/mobile 390 con campo presente/assente/vuoto/tutto duplicato; ordine, caratteri e sezioni precedenti verificati. Il confronto semantico dei testi resta revisione editoriale umana: nessuna AI o deduplicazione automatica semantica. Codice non pubblicato, definizione Shopify ancora mancante.

## UX test live del 19 novembre 2026 — priorita' cliente Marco

Consulta [BACKLOG-UX-MARCO.md](BACKLOG-UX-MARCO.md) per priorita', prove e criteri di accettazione. In particolare: modalita' semplice con campi modificabili evidenziati, descrizione rich text senza HTML visibile, anteprima completa, categorie ricercabili senza slug, botanica organizzata in sezioni progressive, indicatore inequivocabile bozza locale vs negozio online. Non progettare un'interfaccia che nasconde la mancanza del prezzo nella scheda salvata: esporre la fonte dei dati e lo stato di persistenza.

## Scheda Editor · candidato del 25 novembre

Il merge della PR #74 è visibile nell’editor Lovable. Per la prova con Marco, osservare se distingue il salvataggio interno dall’invio del singolo campo e se comprende perché un’azione di galleria o di formato è indisponibile. Verificare anche che riesca a raggiungere da tastiera la descrizione estesa partendo dalla sintesi nella scheda prodotto. Registrare dispositivo ed esito nella checklist. [Collaudo con Marco](../admin-v2/FINAL-ACCEPTANCE.md)

La vista iniziale segue le capability del backend. I dettagli tecnici e i motivi di esclusione si aprono con un controllo nativo accessibile da tastiera. Verde per modifica interna e applicazione delle proposte, blu per invio Shopify, ambra per una verifica, rosso per errori o azioni distruttive. Il testo dell’azione esplicita sempre l’effetto. Il percorso PDP presenta la sintesi vicino all’acquisto e un collegamento alla descrizione estesa. Nella revisione visuale controllare focus, leggibilità a 390 px e messaggi di stato dopo una conferma. [Verbale, collaudo e rollback](../release/MARCO-EDITOR-SHOPIFY-2026-11-25.md)
