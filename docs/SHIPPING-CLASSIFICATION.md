## Decisione del proprietario — 5 novembre 2026: abilitazione classe B

**NUOVA REGOLA PREVALENTE:** il proprietario autorizza la classificazione B per **tutti i bulbi e tutte le piante grasse/succulente** del catalogo, senza subordinare l'appartenenza B a peso, volume, fragilità, imballaggio o altre valutazioni logistiche aggiuntive. La differenza di tariffa è una scelta commerciale, non un calcolo fisico del trasporto. Tutte le altre tipologie e i prodotti non riconosciuti restano A. La precedente richiesta di conferme sull'imballaggio **non è più un gate**.

La matrice storica contiene **118 varianti candidate bulb + 43 candidate succulent = 161**, tutte su prodotti a variante unica nello snapshot del 3 novembre; il proprietario approva **la regola di classe per tali categorie**, autorizzando il rilascio B per i relativi prodotti dopo la riconciliazione obbligatoria di ID/SKU e varianti con lo stato Shopify **live attuale**. Non dedurre che 161 righe siano già state scritte/abilitate: il numero effettivo va riletto e registrato dopo l'applicazione. Eventuali varianti aggiunte, categorie ambigue o prodotti con varianti A/B miste restano A finché la coerenza non è risolta; prodotti B devono contenere solo varianti B. Non modificare prezzi, pesi, disponibilità o catalogo non pertinente.

**Attivazione coordinata obbligatoria:** la tariffa A è attualmente associata a tutti i prodotti live. La sola assegnazione di tag B non basta, perché Shopify applica il massimo nell'opzione di spedizione: occorre configurare insieme le **collezioni complementari A e B** e tutte le fasce native, poi osservare checkout B puro e misto A+B. Non disattivare o lasciare senza tariffa il checkout esistente, non ripristinare gratuità. La copertura delle isole minori rimane una limitazione geografica separata e non revoca la decisione del proprietario di applicare la fascia speciale a tutte le isole.

# Classificazione logistica Shopify — matrice di validazione

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


## 5 novembre 2026 — chiusura mirata, gate ancora aperti

**PARTIAL — SPECIFIC BLOCKERS.** Un solo tentativo di apertura autenticata del sottomercato Dev è terminato con “Detached while handling command”. Palermo e Cagliari: **CHECKOUT BLOCKED**, nessun prezzo regionale osservato. Rimane valida l'ultima lettura del 4 novembre: sottomercato Dev 119731978565 attivo e nove importi speciali salvati, senza nuova conferma odierna. Attesi 6,90 € su Palermo B 30 € e 12,50 € su Cagliari misto A 45 €; non sono risultati checkout. Le prove standard PASS non sono state ripetute.

Controllo varianti preservato, **8 test mirati PASS** sul codice esistente: approvazioni server per ogni variante, rifiuto di una sorella A/sconosciuta in B, rifiuto del payload approvazione client, nessuna mutation trasmessa al blocco, trasporti gestiti coperti. Flag Admin V2 invariati e non attivati. Registro B **0 approvazioni effettive**; i 161 candidati restano proposte. Nessuna modifica o separazione di prodotti Shopify.

GitHub sulla baseline 69cc332: base main, Draft, mergeability e mergeStateStatus **UNKNOWN**, non un conflitto dimostrato. Check suite GitGuardian completata SUCCESS; nessuna suite GitHub Actions, altre app in coda. Actions abilitate e allowed_actions=all. La causa del mancato evento automatico non è accertata: non viene attribuita a conflitti o alla modalità Draft. È stato aggiunto in modo conservativo workflow_dispatch, lasciando pull_request, permessi contents:read, controlli e versioni inalterati. Il checkout source manuale usa github.sha; la concorrenza usa il riferimento quando manca il numero PR. Il run e il suo SHA vanno verificati prima di dichiarare CI PASS; esito aggiornato nel corpo/check della PR.

Sicilia/Sardegna sono approvate commercialmente, ma i due checkout restano gate. Elba, Lido, Pellestrina e altre isole minori non sono coperte tecnicamente: proposta al proprietario, **non ancora applicata**, accettare esplicitamente la tariffa della provincia come eccezione commerciale al supplemento richiesto, oppure mantenere il rilascio bloccato su questo requisito. Nessun supplemento inventato, nessun blocco destinazioni o gestione manuale introdotti.

Backup, diff tariffe, 161 candidati, piano classificazione, checklist e rollback sono già conservati in SHIPPING-SHOPIFY-INTEGRATION.md e nelle evidenze esistenti; non è stato ripetuto l'audit. Non costituiscono un rilascio completato. Nessuna modifica produzione, Sendcloud, estero o PR #42; nessun deploy, ordine, pagamento o costo aggiuntivo. Le sezioni seguenti sono cronologia.


## Chiusura controllo varianti — aggiornamento PR #45

Il proprietario ha approvato il vincolo di omogeneità B. Implementato nel codice di prova il blocco server comune alle API Admin GraphQL/REST e ai tre script di sincronizzazione prodotti. Le approvazioni B sono un registro lato server, attualmente vuoto: **tutti i prodotti B restano bloccati alla pubblicazione**, anche se il client dichiara una propria approvazione. Prima di consentire una pubblicazione B vanno approvate tutte le varianti correnti per ID prodotto, ID variante, SKU, classe bulb/succulent, approvatore e riferimento; un elenco incompleto blocca. Il registro non viene compilato dai suggerimenti o dal titolo.

Le assegnazioni del tag B e le modifiche delle collezioni attraverso il client generico sono bloccate. Modificare varianti di un prodotto già B è bloccato: le varianti ordinarie devono essere prodotti distinti, senza separazioni automatiche. I nuovi prodotti privi di tag B restano A. Le scritture catalogo REST legacy, prive di controllo equivalente, sono bloccate invece di aggirare la protezione. Il codice non rimuove tag o modifica metafield Shopify.

**Copertura:** proxy legacy, publication/create batch, sincronizzazioni e field-sync Admin V2 usano il client centrale. I flag Admin V2 restano identici. I tre script sync con trasporto diretto passano lo stesso guard. Lo script di creazione collezioni crea soltanto collezioni manuali vuote, senza assegnazione prodotti o regole B; non pubblica prodotti. Customer sync e definizioni metafield non assegnano classi B. L'Admin Shopify diretto e strumenti esterni non sono intercettabili da questo backend: il vincolo catalogo va rispettato anche lì; non attribuiamo al codice una protezione globale dello store. Nessun codice è stato distribuito.

**Verifica:** 19 test Node mirati PASS (8 nuovi shipping + 11 field editing), 67 test Deno create/publication PASS, typecheck, build e Deno check del client PASS. I due test Deno erano inizialmente stati invocati con Node, che ha rifiutato gli import jsr:; rieseguiti correttamente con Deno. Build con solo avviso dimensione bundle preesistente. Conflitti: main 8ad26ba è antenato di b0ba990; nessun conflitto da risolvere, nessun merge eseguito.

**Checkout:** Roma e matrice standard restano PASS già documentati. Sicilia/Sardegna approvate, ma Palermo e Cagliari restano BLOCKED: l'unico tentativo di ricollegamento ha restituito “Tab not found in browser 3”. Nessun nuovo checkout e nessuna nuova modifica Dev; conservata la bozza provinciale 119731978565. Elba, Lido e Pellestrina restano eccezioni speciali non coperte; nessun supplemento applicato alle intere province continentali.

**Rilascio bloccato:** completare i due checkout regionali, registrare le approvazioni B sul perimetro reale e risolvere esplicitamente le eccezioni isole minori. Backup, diff tariffario, rollback ed estero restano quelli preparati. Costo aggiuntivo 0 €, nessuna modifica live, Sendcloud, PR #42, acquisto o deploy. Le sezioni seguenti conservano i checkpoint precedenti.


## Vincolo minimo proposto per il catalogo — 4 novembre 2026

Il controllo non può limitarsi a un warning o a un metafield variante: le tariffe native qui configurate usano collezioni di prodotti. **Protezione tecnica nuove varianti: BLOCKED**, nessun controllo gestionale implementato o dichiarato efficace in questo checkpoint.

Vincolo minimo realmente compatibile con questa configurazione: un prodotto B deve essere logisticamente omogeneo e contenere soltanto varianti tutte esplicitamente approvate. Una variante con classe diversa va creata come prodotto separato senza tag B; non va aggiunta al prodotto B. Prima di ogni aggiunta di variante a un prodotto B, il prodotto deve perdere il tag B ed essere verificato nella sola A; durante la rivalidazione non può mantenere la tariffa ridotta. Il tag può tornare soltanto dopo approvazione esplicita di tutti gli ID variante correnti.

Per rendere obbligatorio il vincolo, il percorso di creazione/pubblicazione nel gestionale deve rifiutare l'operazione finché il prodotto B non è stato declassato o la creazione è stata separata. Lo stesso vincolo deve coprire import e modifiche dirette nell'Admin: una validazione solo nel gestionale non garantisce gli altri percorsi. L'attuazione ed il test di tale blocco restano da fare, prima dell'autorizzazione live. Il titolare deve approvare il vincolo di omogeneità; nessuna nuova dipendenza o modifica ai metafield esistenti è richiesta per questa proposta.


Audit read-only del **3 novembre 2026** sullo store `ecom-blueprint-gen-6ud1s.myshopify.com`. Stato: classificazione proposta, **zero scritture live**.

**4 novembre 2026 — fallback nuovi prodotti PASS; nuove varianti su prodotto B BLOCKED senza controllo di pubblicazione.** Si riutilizza l'istantanea del 3 novembre. [Matrice operativa CSV: 161 candidati, zero approvati](shipping-evidence/2026-11-04/native-shipping/candidati-b.csv). La classificazione rimane indipendente da Sendcloud e dal corriere.

## Copertura reale

Lettura completa di **1.364 prodotti**, di cui 1.348 ACTIVE e 16 DRAFT, e **1.392 varianti**, di cui 1.376 su prodotti ACTIVE e 16 su DRAFT. Catalogo paginato in 46 pagine; associazioni variante/profilo verificate separatamente in 28 pagine. Tutte le varianti risultano nel profilo generale `139796676948`. Nessun `hasNextPage` residuo nelle connessioni raccolte di varianti, collezioni e namespace logistici.

Controlli: ID prodotto/variante, SKU, stato, product type, tag, categoria tassonomica, appartenenza a collezioni, `inventoryItem.requiresShipping`, peso, metafield prodotto/variante nei namespace `shipping` e `logistics`, prodotto `custom.shipping_class`; definizioni metafield PRODUCT e PRODUCTVARIANT.

- Tutti i 1.392 SKU sono presenti e univoci nell'istantanea.
- Nessun valore logistico nei namespace/campi controllati; 23 definizioni prodotto, nessuna definizione variante. Questo non dimostra l'assenza di qualsiasi metafield arbitrario in altri namespace.
- Tutti i 1.392 pesi letti sono zero. Nessuna dimensione nei namespace logistici raccolti: non si può dedurre una classe pesante/voluminosa né calcolare tariffe fisiche dal peso.
- 905 prodotti non hanno product type; i valori presenti sono prevalentemente `variable`, `variation`, `simple`, quindi descrivono l'importazione e non la logistica. I soli tag osservati sono `Corniolo` e `Cornus Florida`.
- Quattro prodotti hanno una categoria assegnata, ma è «Non categorizzato»; gli altri non ne hanno una.
- Tutte le varianti risultano `requiresShipping=true`. È compreso `OG_791194`, tipo `wgm_gift_card, virtual`, variante `55507177603412`: incongruenza da validare, non corretta automaticamente.

La precedente analisi WooCommerce menzionava le classi `Pesante` / `Non Pesante` e il mapping proposto `shipping.class`. Un mapping nel documento non equivale a valori presenti in Shopify; «Non Pesante» non prova l'idoneità alla B. [Fonte storica](wordpress-master-field-map.md).

## Matrice SKU/variante

[Matrice completa JSON, 1.392 righe](shipping-evidence/2026-11-03/classification-review.json). Ogni riga contiene ID prodotto/variante e SKU, evidenze osservate, suggerimento, origine del suggerimento, campi separati di approvazione e fallback A. [Istantanea sorgente](shipping-evidence/2026-11-03/catalog.json).

| Classe suggerita | Varianti | Evidenza | Applicazione attuale |
|---|---:|---|---|
| `bulb` | 118 | Collezione `bulbi` / `bulbi-*` | Non approvata; fallback A nel riferimento |
| `succulent` | 43 | Collezione piante grasse/succulente | Non approvata; fallback A |
| `shrub` | 612 | Collezioni contenenti arbusti | Non approvata; A |
| `standard` | 375 | Altre collezioni di piante | Non approvata; A |
| `unknown` | 244 | Informazioni insufficienti o in conflitto | A conservativa |
| `heavy` / `bulky` | 0 assegnabili con certezza | Peso zero e dimensioni assenti | Richiedono valutazione manuale |

I conteggi sono di **varianti**, includono DRAFT e non certificano categorie botaniche. Non viene usato il titolo commerciale per abilitare tariffe ridotte. Le collezioni sono indizi di revisione: non producono scritture o sconti automatici.

## Regola nativa e controllo nel gestionale

La collezione B include solo i prodotti con il tag logistico di approvazione; A include tutti quelli senza tag. Il [checkout con lo sconosciuto](shipping-evidence/2026-11-04/native-shipping/09-sconosciuto-solo.txt) conferma la tariffa A sul prodotto senza tag. Un nuovo prodotto entra in A se viene pubblicato senza tag B. Shopify documenta che la [fonte Products delle collezioni](https://help.shopify.com/en/manual/products/collections/create-collection) comprende tutte le varianti: una nuova variante sullo stesso prodotto può quindi ereditare B prima dell'approvazione. La copertura automatica delle nuove varianti è **BLOCKED**.

**Controllo minimo da adottare prima del rilascio:** nel flusso del gestionale, e in ogni percorso alternativo via import o Admin, togliere il tag B **prima** di aggiungere o modificare una variante di un prodotto B. Rileggere le due collezioni e attendere che il prodotto risulti solo in A prima di rendere la variante vendibile. Riapplicare il tag B solo dopo aver verificato e approvato ogni variante fisica vendibile per ID e SKU; se coesistono varianti A e B sullo stesso prodotto, mantenere il prodotto in A. Niente codice al checkout o abbonamenti. Il controllo è preparato, non applicato al gestionale live.

| Decisione catalogo | Azione prima dell'attivazione |
|---|---|
| 118 bulbi e 43 piante grasse candidati | Approvare o rifiutare ciascuna riga del CSV per ID variante e SKU, con riferimento. Nello snapshot i 161 candidati erano attivi e su 161 prodotti con una variante ciascuno: confrontare le varianti correnti prima di applicare i tag. Nessuna idoneità deriva dal nome commerciale. |
| Arbusti, standard, sconosciuti, record senza approvazione | A. Verificare che ogni prodotto fisico vendibile sia in una sola delle collezioni. |
| `OG_791194`, gift card osservata come fisica | Verificare se debba richiedere spedizione. Se è digitale, verificare il checkout digitale/fisico prima di dichiarare coperto quel perimetro. |
| Nuove varianti su prodotti B | Applicare e provare il controllo di pubblicazione sopra prima di autorizzare il rilascio. |

Il [registro di approvazione](../shipping/classification.approvals.pending.json) resta vuoto. Conservare le evidenze del catalogo originale; nessun tag, metafield o prodotto live è stato modificato.
