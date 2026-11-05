## 5 novembre 2026 — B LIVE: sei checkout PASS

**A+B attive e collaudate nel checkout del sito reale.** Questo checkpoint sostituisce lo stato intermedio di blocco: dopo i rifiuti della revisione automatica, il proprietario ha confermato direttamente in chat «Confermo modifiche shipping LIVE, checkout senza ordini/pagamenti e rollback A positiva». Nessun ordine, pagamento, merge o deploy effettuato.

Classificati B **118 bulbi + 43 grasse/succulente = 161 prodotti e varianti**. Decisione definitiva per categoria botanica: non sono più richieste approvazioni per peso, dimensioni, fragilità o imballo. Tutti i 161 ID/SKU sono stati confrontati col live e risultano invariati, ACTIVE e con una sola variante; nessun nuovo prodotto univoco nelle categorie controllate. La ricerca ha restituito 180 righe con 19 duplicati, deduplicati per ID.

Collezioni native live **A 734709547348**, **B 734709514580**. B seleziona esplicitamente gli ID variante approvati con sorgente **VARIANTS**, senza ereditarietà tramite tag prodotto. A è la sorgente VARIANTS complementare: include i prezzi base non negativi ed esclude B. Verifica dedicata completa: **1.364 prodotti / 1.392 varianti**, **1.231 varianti A + 161 B**, nessun prodotto con classi sovrapposte o varianti senza classe. È una verifica della copertura shipping, non un nuovo audit botanico.

Italy e Sicilia/Sardegna mantengono ciascuna **una sola opzione Standard**, con A e B per collezioni complementari. A universale è stata rimossa solo dopo aver preparato la copertura A/B. Conservati tutti i sei scaglioni A; aggiunti tre B standard 5,90/7,90/8,90 € e tre B Isole 6,90/8,90/9,50 €. Gratuità disattivata in entrambi i mercati.

| Checkout live | Subtotale | Unica tariffa osservata |
|---|---:|---:|
| Roma, soli bulbi | 30,00 € | B 5,90 € |
| Roma, bulbi + Aloe | 60,80 € | B 7,90 € |
| Roma, bulbi + rosa A | 46,40 € | A 11,90 € |
| Roma, bulbi + rose A | 177,60 € | A 17,50 € |
| Palermo, soli bulbi | 30,00 € | B Isole 6,90 € |
| Cagliari, bulbi + rosa A | 46,40 € | A Isole 12,50 € |

I tre carrelli non esatti sono equivalenti nelle fasce richieste: 60,80 € invece di 60 €, 46,40 € invece di 45 €, 177,60 € invece di 160 €. Usati prodotti e disponibilità reali, senza cambiare prezzi o giacenze. La Wigginsia iniziale non era disponibile sul sito; sostituita con Aloe disponibile. Mai somma A+B, gratuità o assenza di tariffa nei sei checkout. [Backup, letture API, coverage e screenshot](shipping-evidence/2026-11-05/b-live/README.md).

**Marco:** percorso Shopify Admin → Prodotti → Collezioni → OG Logistica B → sorgente Varianti → «Includi manualmente varianti». Selettore, 161 selezioni e comandi di rimozione verificati in UI senza modificare la lista durante questa verifica. La [guida cliente](SHIPPING-CLIENT-MANAGEMENT.md) descrive A→B, B→A e la rivalidazione prima di aggiungere varianti. Una nuova variante non è inserita automaticamente nella lista B. L'omogeneità futura dell'intero prodotto richiede la procedura: togliere prima tutte le selezioni B del prodotto, verificare A, creare la variante, quindi approvare tutti gli ID correnti. L'Admin Shopify diretto non è bloccato dal guard server del gestionale: non viene dichiarata un'intercettazione automatica di ogni operazione amministrativa. Nessun deploy o flag Admin V2 attivato.

**Limiti invariati:** tutte le isole minori devono commercialmente usare la speciale, ma Elba/Lido/Pellestrina e altre destinazioni non distinguibili restano tecnicamente non coperte; nessun supplemento a province continentali o deroga inventati. Profili tradizionali UE/internazionale riletti identici alla baseline prima di B; checkout estero non ripetuto. Sendcloud invariato. Nessun deploy Lovable necessario: i sei checkout provengono dal sito reale.

Rollback pronto, non eseguito: riportare A a Tutti i prodotti e rimuovere il gruppo B da ciascuna opzione, conservando i sei importi A e gratuità OFF; soltanto dopo verificare le opzioni attive. Conservare le selezioni B per ripresa, senza cancellare prodotti o modificarne lo stato. Le sezioni seguenti sono storico. Costi aggiuntivi **0 €**.


## 5 novembre 2026 — intervento LIVE autorizzato: A attiva, B in attesa

**LIVE PARZIALE.** Rimossa dal mercato Italy la gratuità da 55 €, mantenendo prima un fallback positivo da 7 €. Checkout immediato del sito reale: 65,60 € → una sola spedizione 7,00 €. Successivamente attivati i sei scaglioni **A standard per tutti i prodotti** e creato il sottomercato live **Sicilia e Sardegna — Isole 120287887700** (genitore Italy 112143401300), con le 17 province approvate e i sei scaglioni A speciali. Nessun ID Dev copiato. Le opzioni si chiamano «Standard» e sono attive; nome conservato dalla configurazione esistente. Non c'è gratuità.

| Checkout live dal sito onlinegarden.it | Subtotale | Unica spedizione osservata |
|---|---:|---:|
| Roma, Rosa Maizner Fastnacht ×1 | 16,40 € | A 8,90 € |
| Roma, stesso prodotto ×4 | 65,60 € | A 11,90 € |
| Palermo, stesso prodotto ×4 | 65,60 € | A Isole 12,50 € |
| Cagliari, stesso prodotto ×4 | 65,60 € | A Isole 12,50 € |

Nessun ordine o pagamento. Nessun prodotto fisico escluso dalla copertura precedente: A continua ad applicarsi a tutti i prodotti e alla sede esistente, con intervalli contigui da zero senza massimo finale. Il test dimostra disponibilità sul prodotto provato; non equivale a collaudare ogni SKU o ogni gruppo di evasione. [Backup, letture e screenshot](shipping-evidence/2026-11-05/live/README.md).

**B: zero prodotti/varianti approvati e attivi.** Riletti nel live tutti i 161 candidati: ID, SKU, stato, tag, varianti correnti e collezioni. Nessuna approvazione logistica esplicita nel registro; non sono state assegnate classi dal solo nome botanico. Tutti restano A. I checkout B/misti non sono eseguiti live perché non esiste una B approvata. Le tabelle B restano commercialmente approvate, ma non sono attive e non sono certificate su prodotti live. L'eccezione di revisione è unica: confermare l'idoneità logistica dei 161 candidati (118 bulbi, 43 grasse), tutti con peso rilevato zero e senza evidenza sufficiente per approvare ingombro/fragilità. Non viene inventato un elenco di prodotti «delicati» dal titolo.

**Geografia:** Sicilia/Sardegna A PASS live. Elba, Lido, Pellestrina e altre isole minori non ricevono la tariffa speciale tramite questa configurazione. Il checkout resta servito dalla tariffa del mercato genitore come comportamento tecnico già esistente; non è un'eccezione commerciale approvata al requisito «tutte le isole speciali». Non sono stati creati supplementi per intere province continentali, blocchi destinazione o procedure manuali. Copertura completa NON dichiarata; serve una decisione specifica sulle destinazioni non distinguibili nativamente.

**Marco:** account attivo, ruolo Amministratore dell'organizzazione e privilegi completi verificati nella UI Shopify. Nessun permesso modificato. Può verificare le tariffe in Shopify Admin; un passaggio A/B protetto nel gestionale non è pubblicato. Il guard server resta codice di prova e il percorso generico rifiuta assegnazioni B: niente override tramite tag manuale presentato come soluzione sicura. [Guida cliente](SHIPPING-CLIENT-MANAGEMENT.md).

**Lovable:** nessun deploy necessario o effettuato per queste tariffe: il checkout aperto dal sito reale ha letto gli importi aggiornati. Flag Admin V2, prezzi, giacenze, contenuti prodotto, pagamenti, Sendcloud e PR #42 invariati. Profili tradizionali riletti via API identici allo snapshot 3 novembre (incluse tariffe UE/internazionale); nessun collaudo checkout estero, nessuna riattivazione di destinazioni estere. Costo aggiuntivo 0 €.

**Rollback positivo:** mantenere il backup originale solo come evidenza, NON ripristinare la gratuità. Se le nuove fasce creano un problema, impostare l'opzione Italy su 7 € da zero senza massimo e gratuità OFF; riportare il sottomercato isole in Bozza affinché erediti il fallback positivo. Verificare subito Roma sopra 55 € e le isole, senza ordine. Nessun rollback eseguito perché i quattro checkout A sono corretti. Le sezioni successive conservano la cronologia.

## Decisione commerciale finale e QA — 5 novembre 2026

**La precedente eccezione commerciale che lasciava le isole minori in tariffa standard è REVOCATA.** Regola finale: **tutte le isole italiane, incluse Sicilia, Sardegna, Elba, Lido di Venezia, Pellestrina e le altre isole minori, usano la fascia «Isole e zone disagiate»**. Nessuna deroga di lancio alla tariffa provinciale; nessun supplemento applicato automaticamente a territori continentali della medesima provincia.

**Esiti tecnici separati:** Italia standard A/B 4/4 checkout PASS, soglie/sconti principali PASS; Palermo B 6,90 € attesi e Cagliari A 12,50 € attesi NON VERIFICATI; isole minori NON COPERTE dalla configurazione nativa per provincia finora dimostrata. L'assenza di filtro CAP/località rende la copertura completa un **GATE BLOCCANTE**; non inventare checkout PASS. Classificazione varianti PASS locale, 161 candidati B e zero approvati; gruppi separati NON VERIFICATI. CI e GitGuardian erano PASS su `bb1bdf6`, non automaticamente sul nuovo commit. Nessuna modifica produttiva. PR #45 Draft, non autorizzata al rilascio.

# QA spedizioni Online Garden

## 5 novembre 2026 — chiusura mirata, gate ancora aperti

**PARTIAL — SPECIFIC BLOCKERS.** Un solo tentativo di apertura autenticata del sottomercato Dev è terminato con “Detached while handling command”. Palermo e Cagliari: **CHECKOUT BLOCKED**, nessun prezzo regionale osservato. Rimane valida l'ultima lettura del 4 novembre: sottomercato Dev 119731978565 attivo e nove importi speciali salvati, senza nuova conferma odierna. Attesi 6,90 € su Palermo B 30 € e 12,50 € su Cagliari misto A 45 €; non sono risultati checkout. Le prove standard PASS non sono state ripetute.

Controllo varianti preservato, **8 test mirati PASS** sul codice esistente: approvazioni server per ogni variante, rifiuto di una sorella A/sconosciuta in B, rifiuto del payload approvazione client, nessuna mutation trasmessa al blocco, trasporti gestiti coperti. Flag Admin V2 invariati e non attivati. Registro B **0 approvazioni effettive**; i 161 candidati restano proposte. Nessuna modifica o separazione di prodotti Shopify.

GitHub sulla baseline 69cc332: base main, Draft, mergeability e mergeStateStatus **UNKNOWN**, non un conflitto dimostrato. Check suite GitGuardian completata SUCCESS; nessuna suite GitHub Actions, altre app in coda. Actions abilitate e allowed_actions=all. La causa del mancato evento automatico non è accertata: non viene attribuita a conflitti o alla modalità Draft. È stato aggiunto in modo conservativo workflow_dispatch, lasciando pull_request, permessi contents:read, controlli e versioni inalterati. Il checkout source manuale usa github.sha; la concorrenza usa il riferimento quando manca il numero PR. Il run e il suo SHA vanno verificati prima di dichiarare CI PASS; esito aggiornato nel corpo/check della PR.

Sicilia/Sardegna sono approvate commercialmente, ma i due checkout restano gate. Elba, Lido, Pellestrina e altre isole minori non sono coperte tecnicamente: proposta al proprietario, **non ancora applicata**, accettare esplicitamente la tariffa della provincia come eccezione commerciale al supplemento richiesto, oppure mantenere il rilascio bloccato su questo requisito. Nessun supplemento inventato, nessun blocco destinazioni o gestione manuale introdotti.

Backup, diff tariffe, 161 candidati, piano classificazione, checklist e rollback sono già conservati in SHIPPING-SHOPIFY-INTEGRATION.md e nelle evidenze esistenti; non è stato ripetuto l'audit. Non costituiscono un rilascio completato. Nessuna modifica produzione, Sendcloud, estero o PR #42; nessun deploy, ordine, pagamento o costo aggiuntivo. Le sezioni seguenti sono cronologia.


## Checkpoint finale mirato — tariffe Isole salvate nel Dev

Nel solo Dev Online Garden Shipping Test è stato salvato l'override del mercato 119731978565, attivato e riletto nello stato **Attivo**. Nella stessa opzione «Spedizione standard» sono stati impostati i nove importi: A 9,60 / 12,50 / 14,90 / 17,50 / 36,00 / 54,00 €; B 6,90 / 8,90 / 9,50 €, mantenendo gli scaglioni esistenti e la gratuità non selezionata. Le condizioni sono le 17 province Sicilia/Sardegna già selezionate; nessuna provincia continentale aggiunta.

**Palermo e Cagliari: BLOCKED, non PASS.** Il tentativo di aprire il carrello Dev con due bulbi è stato interrotto dal distacco del collegamento browser durante l'apertura della nuova scheda. Nessun checkout regionale è stato letto; nessun tentativo ripetuto. Non è disponibile uno screenshot di conferma dopo l'ultimo salvataggio: l'evidenza di stato Attivo proviene dalla lettura DOM. La configurazione rimane nel Dev; per ripristinare la copertura ereditata standard durante una diagnosi, riportare il sottomercato in Bozza. Nessuna modifica live, al guard varianti, a Sendcloud o alla PR #42.

**CI baseline 2d034eb:** GitGuardian PASS; zero run Storefront. Il workflow 401886711 risulta active. Il file accetta solo pull_request verso main/codex/storefront-main-integration. Unico tentativo ordinario: gh workflow run sul branch, rifiutato HTTP 422 «Workflow does not have 'workflow_dispatch' trigger». Questo dimostra perché l'avvio manuale non è disponibile; non dimostra la causa del mancato evento automatico. Nessuna modifica al workflow, nessuna chiusura/riapertura PR o cambio Draft. Le verifiche locali precedenti restano valide e non sono state ripetute.

Rilascio ancora bloccato dai due checkout, dalla CI Storefront e dai gate catalogo/geografici già descritti. Elba, Lido e Pellestrina restano non coperte. Non si chiede di riapprovare Sicilia/Sardegna: l'approvazione commerciale è acquisita. Nessuna attivazione produttiva autorizzata.


## Chiusura controllo varianti — aggiornamento PR #45

Il proprietario ha approvato il vincolo di omogeneità B. Implementato nel codice di prova il blocco server comune alle API Admin GraphQL/REST e ai tre script di sincronizzazione prodotti. Le approvazioni B sono un registro lato server, attualmente vuoto: **tutti i prodotti B restano bloccati alla pubblicazione**, anche se il client dichiara una propria approvazione. Prima di consentire una pubblicazione B vanno approvate tutte le varianti correnti per ID prodotto, ID variante, SKU, classe bulb/succulent, approvatore e riferimento; un elenco incompleto blocca. Il registro non viene compilato dai suggerimenti o dal titolo.

Le assegnazioni del tag B e le modifiche delle collezioni attraverso il client generico sono bloccate. Modificare varianti di un prodotto già B è bloccato: le varianti ordinarie devono essere prodotti distinti, senza separazioni automatiche. I nuovi prodotti privi di tag B restano A. Le scritture catalogo REST legacy, prive di controllo equivalente, sono bloccate invece di aggirare la protezione. Il codice non rimuove tag o modifica metafield Shopify.

**Copertura:** proxy legacy, publication/create batch, sincronizzazioni e field-sync Admin V2 usano il client centrale. I flag Admin V2 restano identici. I tre script sync con trasporto diretto passano lo stesso guard. Lo script di creazione collezioni crea soltanto collezioni manuali vuote, senza assegnazione prodotti o regole B; non pubblica prodotti. Customer sync e definizioni metafield non assegnano classi B. L'Admin Shopify diretto e strumenti esterni non sono intercettabili da questo backend: il vincolo catalogo va rispettato anche lì; non attribuiamo al codice una protezione globale dello store. Nessun codice è stato distribuito.

**Verifica:** 19 test Node mirati PASS (8 nuovi shipping + 11 field editing), 67 test Deno create/publication PASS, typecheck, build e Deno check del client PASS. I due test Deno erano inizialmente stati invocati con Node, che ha rifiutato gli import jsr:; rieseguiti correttamente con Deno. Build con solo avviso dimensione bundle preesistente. Conflitti: main 8ad26ba è antenato di b0ba990; nessun conflitto da risolvere, nessun merge eseguito.

**Checkout:** Roma e matrice standard restano PASS già documentati. Sicilia/Sardegna approvate, ma Palermo e Cagliari restano BLOCKED: l'unico tentativo di ricollegamento ha restituito “Tab not found in browser 3”. Nessun nuovo checkout e nessuna nuova modifica Dev; conservata la bozza provinciale 119731978565. Elba, Lido e Pellestrina restano eccezioni speciali non coperte; nessun supplemento applicato alle intere province continentali.

**Rilascio bloccato:** completare i due checkout regionali, registrare le approvazioni B sul perimetro reale e risolvere esplicitamente le eccezioni isole minori. Backup, diff tariffario, rollback ed estero restano quelli preparati. Costo aggiuntivo 0 €, nessuna modifica live, Sendcloud, PR #42, acquisto o deploy. Le sezioni seguenti conservano i checkpoint precedenti.


## Follow-up geografico mirato — 4 novembre 2026

| Verifica richiesta | Esito verificato |
|---|---|
| Roma, due bulbi 30 € | PASS riutilizzato: una B 5,90 €. Non ripetuto. |
| Roma, bulbo + arbusto 45 € | PASS riutilizzato: una A 11,90 €. Non ripetuto. |
| Palermo, due bulbi 30 € | NON VERIFICATO: attesa B speciale 6,90 €, nessun nuovo checkout letto. |
| Cagliari, bulbo + arbusto 45 € | NON VERIFICATO: attesa A speciale 12,50 €, nessun nuovo checkout letto. |
| Elba / Lido / Pellestrina | NON VERIFICATO in checkout; condizioni native note insufficienti a distinguerle dalla provincia. Nessun indirizzo o CAP inventato. |
| Protezione nuove varianti | BLOCKED: proposto il vincolo prodotto omogeneo; nessun semplice warning considerato una soluzione. |

La sessione autenticata ha consentito di creare il mercato Isole in bozza, ma il collegamento browser si è poi interrotto con «Debugger unattached» su due tentativi di ricollegamento. Il browser inventory conferma la scheda sul mercato Dev 119731978565. Zero nuovi checkout PASS; le nove prove precedenti restano conservate. Modifiche di questo checkpoint esclusivamente documentali e Dev: TypeScript/build e i test shipping già superati non sono stati rieseguiti, poiché nessun codice runtime è cambiato.


**4 novembre 2026 · NATIVE PARTIAL · gate A/B Italia standard 4/4 PASS.** Nove verifiche in checkout Shopify, di cui una riutilizzata; collaudo sul solo Dev `111269380421`, Grow simulato, Mercati attivi, EUR. Nessun ordine o pagamento.

| Tipo di verifica | Risultato | Limite |
|---|---|---|
| Checkout reale: gate principale | 30 € due bulbi → B 5,90 €; 60 € bulbo + grassa → B 7,90 €; 45 € bulbo + arbusto → A 11,90 €; 160 € dieci bulbi + sconosciuto → A 17,50 €. | Una sola «Spedizione standard» positiva in ogni caso. [Registro completo e screenshot](shipping-evidence/2026-11-04/native-shipping/README.md). |
| Checkout reale: sconti e centesimo | B 49,99 € → 5,90 €, 50,00 € → 7,90 €. Misto A 149,99 € → 12,50 €, 150,00 € → 17,50 €. Sconosciuto solo 10 € → A 8,90 €. | Confermata la base dopo sconto d'ordine ai confini rappresentativi; gli altri confini e lo zero non sono prove checkout. Codici Dev disattivati, zero utilizzi. |
| Configurazione Shopify | Unica opzione attiva per importo, A/B per collezioni complementari, Intuitive e Standard dimostrativa inattive. Province individuali disponibili nel selettore Mercati Dev. | Nessun checkout regionale con questa configurazione. |
| Gruppi di spedizione separati | **NON VERIFICATO**: una sola sede Dev e nessuno split nei carrelli provati. | Shopify [documenta il caso della stessa opzione per importo](https://help.shopify.com/en/manual/checkout-settings/split-shipping): un addebito al massimo applicabile, altri gruppi inclusi. Opzioni o topologie diverse richiedono una prova specifica. |
| Test automatici locali | `npm run test:shipping`: **325 passati, 0 falliti**. Copertura della matrice in centesimi, precedenze e casi geografici di riferimento. | Non attestano il checkout Shopify. |
| Catalogo e fallback | Un prodotto distinto senza tag ricade in A, come verificato con lo sconosciuto. | Una nuova variante su un prodotto già in B eredita la collezione; [controllo catalogo](SHIPPING-CLASSIFICATION.md) richiesto. |

**Intuitive Shipping.** Valutata esclusivamente per il collaudo; esclusa dalla soluzione di produzione per decisione del proprietario. Il [Cart Tester e i checkout storici](shipping-evidence/2026-11-03/intuitive-sandbox/README.md) non concorrono alle nove prove native.

Costo sostenuto **0 €**. Nessun acquisto CCS, upgrade o nuova app. La [procedura di rilascio](SHIPPING-SHOPIFY-INTEGRATION.md) definisce i controlli, il backup e il rollback prima di un'eventuale autorizzazione live.
