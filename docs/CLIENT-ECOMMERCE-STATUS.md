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


## Approvazione commerciale tariffa B — 5 novembre 2026

Il proprietario approva **tariffa ridotta B per tutti i bulbi e tutte le piante grasse/succulente**, indipendentemente da peso, imballaggio, ingombro o fragilità. Le altre tipologie usano A. La prima matrice di classificazione identifica 118 bulbi e 43 piante grasse (161 candidati), da confrontare con il catalogo attuale prima dell'attivazione. La tariffa B **non risulta ancora attiva sul negozio live** finché l'opzione Shopify non è riconfigurata e verificata con carrelli B puri e misti. La spedizione A positiva e la rimozione della gratuità sono già state verificate live: non comprometterle. Sicilia/Sardegna già collaudate in A; tutte le isole minori devono commercialmente ricevere la fascia speciale, ma resta un limite di copertura tecnica da risolvere. Nessuna nuova app a pagamento o deploy Lovable è richiesto per la sola decisione commerciale. Questa decisione supera le precedenti richieste di approvazione del solo imballaggio.

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

## Decisione FINALE del proprietario sulle isole — 5 novembre 2026

**La precedente concessione sulla tariffa standard delle isole minori è annullata.** Il cliente conferma che **tutte le isole italiane, anche quelle minori — tra cui Elba, Lido di Venezia e Pellestrina — devono pagare la fascia «Isole e zone disagiate», proprio come Sicilia e Sardegna**. Si rivedrà la politica solo in seguito a un'eventuale nuova decisione. Non aumentare il prezzo delle consegne continentali della stessa provincia. Le tariffe commerciali A/B non cambiano.

**Attenzione:** questa è una decisione commerciale definitiva, non un test superato. Al momento Shopify nativo nel Dev gestisce le province siciliane/sarde ma non è stata dimostrata la distinzione delle isole minori all'interno di province continentali. I checkout Palermo e Cagliari sono ancora non verificati e ci sono 161 prodotti/varianti candidati alla tariffa B, **nessuno ancora approvato**. La copertura completa delle isole è quindi un requisito aperto che impedisce di considerare pronta la produzione. Shopify e Sendcloud live invariati, PR #45 Draft, nessun nuovo abbonamento autorizzato. Le precedenti note sulla tariffa provinciale standard sono soltanto storico superato.

# Online Garden — aggiornamento cliente

## 1 novembre 2026 — footer pubblicato sul dominio ufficiale

**Footer pubblicato e verificato su https://onlinegarden.it.** PR [#43](https://github.com/Rosin355/your-e-commerce-blueprint/pull/43) unita senza bypass. HEAD sorgente `e617c05ad9afcaf2c22ad5faac0da06e8bd9ad1d`; merge e commit effettivamente servito in produzione `8d2a160917895735658e34a37d6b337733a32649`. Deploy Lovable esplicito `0ae71161-a4cc-407e-ae36-b2202f381981`, confermato dal DOM del footer e dal `data-commit-sha` dell'HTML pubblico, non dal solo merge.

Il sito pubblico mostra ora il nuovo footer desktop e mobile. Le categorie aprono pagine reali, Contatti mostra `info@onlinegarden.it` e Privacy Policy porta all'informativa ufficiale Shopify. Social non verificati e newsletter inattiva sono rimossi dal footer; homepage, catalogo, schede prodotto e header conservano la grafica approvata.

La verifica reale dopo la pubblicazione è positiva per navigazione, link, focus, mobile e carrello vuoto. Il checkout non è stato completato con un acquisto o un carrello Shopify reale. Il codice Admin V2 della PR #42 non è stato pubblicato e non sono stati attivati flag o modificati negozio, database o dominio.

**Questo rilascio riguarda il footer, non l'approvazione a vendere.** Marco deve ancora fornire testi approvati per Cookie Policy, termini, spedizioni/resi e dati societari. La telemetria Lovable è ancora attiva: c'è un'impostazione per disabilitarla, ma occorre una decisione specifica e una successiva verifica. Nessuna CMP aggiunta e nessuna dichiarazione di conformità del consenso.

[Checklist Marco](legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md) · [Screenshot realmente online e QA](legal/release-evidence/2026-11-01/README.md). Le sezioni successive sono storico precedente, non attestazioni aggiornate del rilascio.

### Storico precedente alla pubblicazione del footer

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
