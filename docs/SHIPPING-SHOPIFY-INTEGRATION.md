## Decisione operativa B — 5 novembre 2026

Il proprietario richiede **attivazione B live per bulbi e piante grasse/succulente**, senza condizionare la tariffa ridotta a verifica di imballaggio, ingombro, peso o fragilità. L'elenco di partenza è `docs/shipping-evidence/2026-11-04/native-shipping/candidati-b.csv` (118 bulb + 43 succulent nello snapshot storico). Tutto il resto è A. Rimangono obbligatori il confronto IDs/SKU/varianti con Shopify live corrente, l'omogeneità delle varianti e l'assenza di prodotti misti A/B in un unico prodotto.

**Non considerare B attiva fino a verifica checkout:** in live A è attualmente universale; la semplice aggiunta di tag/collezione B non fa prevalere B su A. Il passaggio deve sostituire A universale con due collezioni complementari nella stessa opzione nativa, con backup e fallback positivo, e verificare B puro, carrello misto, Roma/Palermo/Cagliari e assenza di gratuità. Mantieni Sendcloud, tariffe estere, Lovable e flag Admin V2 invariati se non pertinenti. Questa decisione **sostituisce** i precedenti gate di approvazione per l'imballaggio, ma non costituisce attestazione di modifica Shopify già avvenuta. Per tutte le isole minori resta richiesta la fascia speciale, non ancora garantita tecnicamente dall'attuale perimetro provinciale.

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

## Decisione geografica DEFINITIVA — 5 novembre 2026 (PR #45)

**SOSTITUISCE la deroga di lancio documentata in precedenza.** Tutte le isole italiane, **comprese le isole minori (Elba, Lido di Venezia, Pellestrina e altre)**, devono applicare la stessa fascia «Isole e zone disagiate» prevista per Sicilia e Sardegna. Non è consentito per il lancio far pagare la tariffa standard provinciale alle isole minori. Non estendere la fascia speciale a territori continentali della stessa provincia. Nessun nuovo costo fisso/app/upgrade approvato.

**La regola non è ancora attuabile integralmente con le condizioni native attualmente dimostrate:** le condizioni di Shopify Markets per provincia non discriminano località/CAP interni alla provincia. Il collaudo Palermo/Cagliari è ancora NON VERIFICATO e non è stata provata una soluzione nativa per le isole minori. Si richiede una soluzione tecnicamente verificabile prima di dichiarare il perimetro pronto; niente tariffe provinciali di comodo, CAP inventati o blocchi automatici non approvati. Restano inoltre 161 candidati B senza approvazione, controllo varianti PASS locale e CI/GitGuardian PASS sullo SHA storico `bb1bdf6` (non automaticamente sui successivi commit documentali). PR #45 Draft, nessun merge/deploy o modifica live. Le sezioni storiche successive hanno valore cronologico e non prevalgono sulla presente decisione.

# Spedizioni Shopify Grow — configurazione nativa e rilascio

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


## Checkpoint operativo Isole — 4 novembre 2026

Approvazione commerciale ricevuta per Sicilia/Sardegna e isole minori. Creato nel solo Dev il mercato **QA Isole Sicilia e Sardegna**, ID **119731978565**, genitore Italy **119681515845**, **Bozza**. Sono state selezionate le 17 province mostrate da Shopify; l'override della spedizione è stato iniziato ma le tariffe speciali non risultano completate e rilette. Non attivare questa bozza come se fosse pronta.

Diff previsto, non applicato al live: conservare Italy standard; configurare nel sottomercato provinciale una sola opzione con A speciale 9,60/12,50/14,90/17,50/36,00/54,00 € e B speciale 6,90/8,90/9,50 €, stesse soglie approvate e nessuna gratuità. Evitare doppia esposizione della tariffa genitore. Confrontare i checkout Palermo B 30 € → 6,90 € e Cagliari misto A 45 € → 12,50 € con i due checkout Roma già PASS, rispettivamente 5,90 € e 11,90 €.

L'errore browser «Debugger unattached» ha impedito di completare l'override e i due nuovi checkout. Non è un errore della tariffa. Elba, Lido e Pellestrina restano escluse dalla copertura tecnica speciale: non si modifica l'intera provincia continentale. Il backup, i 161 candidati B, il rollback e le checklist già presenti restano validi come preparazione; aggiornare la baseline al momento dell'autorizzazione live. UE/internazionale e Sendcloud restano invariati.


**4 novembre 2026 · PR #45 Draft · NATIVE PARTIAL.** Gate A/B Italia standard **4/4 PASS** nel checkout Shopify Dev. La produzione è stata consultata in sola lettura e conserva le tariffe precedenti.

## Configurazione da preservare

- **Shopify Grow + Market-driven Shipping**. La prova è sul Dev `111269380421`, Grow simulato, Italy `119681515845`, EUR. Sullo store reale, la lettura Grow è documentata nell'[evidenza del piano](shipping-evidence/2026-11-03/engine-selection/native-capabilities.json); l'Admin del 4 novembre mostra la spedizione effettivamente gestita in [Mercati → Italia](shipping-evidence/2026-11-04/native-shipping/live-italia-readonly.txt). Le tariffe manuali per importo non richiedono Carrier Calculated Shipping (CCS). **Costo aggiuntivo del percorso: 0 €.**
- **Una sola opzione attiva «Spedizione standard» per indirizzo**, con due serie di regole per importo: sei scaglioni A e tre B secondo la [matrice approvata](SHIPPING-RATE-MATRIX.md). A è la collezione complementare dei prodotti senza il tag B; B contiene soltanto prodotti con tutte le varianti spedibili approvate. Nessuna regola gratuita; mantenere una sola sede di evasione per il perimetro collaudato.
- Le [tariffe Shopify per Mercati](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market) usano il valore complessivo e applicano il massimo tra le tariffe corrispondenti nella stessa opzione. In tutti gli scaglioni, per lo stesso valore netto, A supera B. Un articolo A rende applicabile A anche quando il resto del carrello è B. Lo dimostrano i due checkout misti da 45 € e 160 €; le quantità e gli sconti non cambiano questa logica.
- **Sendcloud** resta per evasione ed etichette: [presenza verificata nell'Admin live](shipping-evidence/2026-11-04/native-shipping/sendcloud-live-readonly.txt). Shopify calcola il prezzo al checkout senza invocare Sendcloud. Account, regole, etichette e importazione ordini Sendcloud non sono stati modificati o collaudati.
- **Intuitive Shipping.** Valutata esclusivamente per il collaudo; esclusa dalla soluzione di produzione per decisione del proprietario. L'opzione app e la Standard dimostrativa sono inattive nel solo Dev. [Evidenze storiche Intuitive](shipping-evidence/2026-11-03/intuitive-sandbox/README.md).

## Geografia

L'Italia standard è verificata al checkout. Il selettore Mercati del Dev offre le [province italiane](shipping-evidence/2026-11-04/native-shipping/geografia-dev.txt); Sicilia e Sardegna si possono modellare con sottomercati per province intere e override della sola spedizione. Dopo la decisione di Marco, collaudare almeno Palermo e Cagliari con A e B e verificare che la tariffa del mercato genitore non sia visibile insieme a quella del sottomercato. Nessun mercato regionale è stato salvato e nessun checkout isole è certificato per questa configurazione.

Il criterio nativo di [sottomercato](https://help.shopify.com/en/manual/markets/getting-started/market-types) usa regioni amministrative; le [condizioni Markets](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/MarketConditionsInput) non espongono filtri per CAP/località. Una destinazione disagiata interna a una provincia segue quindi la tariffa della provincia, salvo diversa politica approvata che rimane fuori dalla copertura nativa. Il listino futuro è necessario per identificare le eccezioni effettive.

## Backup, attivazione e rollback

Il [backup read-only dei profili](shipping-evidence/2026-11-03/backup-manifest.json) conserva configurazioni, regole, copertura varianti e checksum. La [baseline nativa del 4 novembre](shipping-evidence/2026-11-04/native-shipping/live-standard-editor-readonly.txt) documenta l'opzione Italy esistente «Standard»: tutti i prodotti, sede esistente, 7,00 € da 0,00 € senza massimo e gratis da 55,00 €. Il backup di profilo precedente documenta anche UE «Standard Internazionale» 14,99 € e Internazionale «Standard» 19,99 €: **valori storici di profilo**, senza attestazione di disponibilità attuale. Conservare configurazione, ereditarietà e disponibilità dei mercati esteri; non riattivare le opzioni storiche come parte del rilascio Italia.

| Momento | Controllo operativo |
|---|---|
| Prima di autorizzare | Gate A/B PASS; decisione territoriale e checkout regionali per il perimetro approvato; approvare gli SKU/ID effettivi e applicare il controllo nuove varianti [nel flusso catalogo](SHIPPING-CLASSIFICATION.md). Verificare copertura A/B esclusiva di ogni variante fisica vendibile, una sola sede, e che sconti di spedizione esistenti non introducano gratuità. Se il perimetro usa gruppi separati, eseguire un checkout con split prima di autorizzarlo. |
| Prima di attivare | Dopo autorizzazione esplicita, aggiornare lo snapshot read-only di profilo, opzione nativa, mercato/sede, condizioni, transito, gratuità ed ereditarietà. Salvare ID live e baseline per confronto. Creare le collezioni da approvazioni verificate; compilare le opzioni dai valori della matrice, usando gli oggetti live e senza copiare gli ID Dev. Conservare intatta l'opzione precedente per il ripristino. |
| Attivazione | In una finestra concordata, sostituire l'opzione attiva per Italia con la nuova opzione nativa. Usare bozze/opzioni inattive dove disponibili e verificare subito che per ogni indirizzo resti una sola opzione. Lasciare invariati estero, sedi, profili, corrieri e Sendcloud. |
| Dopo l'attivazione | Checkout fino alla scelta spedizione, senza ordine: B puro, misto, A sconosciuto, confine con sconto, regioni approvate, controllo estero rispetto alla baseline. Confermare una sola tariffa positiva corretta. Registrare screenshot, configurazione attiva e operatore. |
| Rollback | Se manca una tariffa, compare un duplicato/gratuità o cambia un mercato escluso, ripristinare «Standard» originale e la precedente ereditarietà. Disattivare le nuove opzioni/override, lasciando intatto l'originale. Rileggere la baseline e verificare 7,00 € sotto soglia, gratis da 55,00 € e mercati esteri invariati. Rimuovere solo eventuali tag introdotti nella finestra, confrontandoli con lo snapshot. |

La PR rimane Draft. La procedura prepara il rilascio; per attivare sullo store reale serve un'autorizzazione separata dopo la chiusura dei gate.
