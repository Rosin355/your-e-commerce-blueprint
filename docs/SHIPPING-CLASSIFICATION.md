# Classificazione logistica Shopify — matrice di validazione

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
