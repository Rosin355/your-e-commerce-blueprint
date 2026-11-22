# Online Garden · chiusura commerciale e storico WooCommerce

**22 novembre 2026. SAL 57,75%. Costo incrementale sostenuto 0,00 €.** Il checkout pubblico resta operativo. Il nuovo lavoro ha verificato le impostazioni effettive di Lovable, escluso ulteriori fonti prive di transazioni, aggiornato i cinque testi e corretto l’autorizzazione al lotto storico. Nessun ordine, notifica, movimento di magazzino, addebito o pubblicazione di policy in questo intervento.

## A. Spedizioni

**BLOCKED in Dev e in produzione.** L’accesso staff disponibile è ancora respinto sulla home di *Online Garden Shipping Test*. Il connettore collegato al negozio principale non riconosce il Dev come proprio PreviewStore e manca dello scope per le personalizzazioni di consegna. Il piano verificato è Grow. Per certificare la soluzione servono due opzioni acquistabili e distinguibili al momento del calcolo e un selettore in grado di nascondere quella sbagliata. Una sola Standard nel mercato interessato non consente al selettore di far apparire il prezzo mancante.

Portoferraio, Lido di Venezia, Pellestrina, Capri, Ischia, Procida, Ponza, Ventotene e Isole Tremiti restano aperte. L’ultima misura pubblica è 42/69 corretti, con 27 scostamenti. A Portoferraio il checkout ha mostrato 8,90 / 5,90 / 11,90 € sui tre carrelli A/B/misto, a fronte di 9,60 / 6,90 / 12,50 € previsti. Questi ultimi importi si osservano già a Lipari. La precedente prova isolata conserva 69/69 e 37 casi integrativi. Nessuna nuova configurazione o prova di checkout Dev possibile con questa identità. Prima dell’attivazione occorrono matrice del vettore con frazioni/alias, prove su CAP ambigui, wallet, gruppi, 161 varianti B e singola tariffa, costo zero, snapshot e approvazione specifica. Se il checkout di prova mostra entrambe le tariffe o un importo errato, disattivare il selettore in Dev, ripristinare le opzioni dallo snapshot e verificare il ritorno alla configurazione iniziale. [Dossier e matrici](PROVE-ISOLATE-SPEDIZIONI-ANALYTICS-2026-11-22.md)

## B. Privacy

Nel pannello *Impostazioni → Generali → Pubblicazione* sono attivi **Visitor analytics e monitoraggio dei clic**. Anche *Project monitoring* risulta attivo. Nel workspace consultato (26 progetti) è stato individuato un solo progetto corrispondente a Online Garden, pubblicato. La scelta predisposta è disattivare solo Visitor analytics. Il provider documenta la cessazione della registrazione di visite, clic ed errori browser. L’esito reale e l’eventuale persistenza di dati facoltativi richiedono una finestra autorizzata sul progetto o un progetto isolato con comando indipendente. [Lovable Analytics](https://docs.lovable.dev/features/analytics#enable-or-disable-visitor-analytics)

Due controlli indipendenti della PR #66 hanno ricevuto HTTP 202 già in home prima della scelta; due profili con il solo script sostituito hanno registrato zero tentativi a `trackevents`, carrello dopo ricarica, checkout con prodotto e accesso account disponibili. Nella nuova prova mirata su `/admin`, due profili Chromium puliti hanno mostrato email e password per l’accesso staff. Il controllo ha registrato un POST, il profilo con il solo loader sostituito ne ha registrati zero. La sessione Admin autenticata e il comportamento dopo un cambio effettivo restano da verificare.

Nell’inventario restano storage del carrello, cookie tecnici/sessione, font esterni, diagnostica e wallet Shopify. Il connettore non dispone di `read_pixels` e `read_privacy_settings`. Prima di determinare le ulteriori finalità facoltative servono l’inventario amministrativo di app e pixel personalizzati e le regioni configurate. Se emergono finalità soggette a consenso, collaudare blocco preventivo, rifiuto, revoca e persistenza sulle superfici interessate prima di dar loro corso. La finestra deve includere il valore iniziale e la procedura di ripristino autorizzata, considerando che riattivare il servizio fa riprendere la raccolta. [Inventario e criteri di collaudo](../legal/CANDIDATE-COOKIES-2026-11-22.md)

## C. Informative

Cinque candidati aggiornati nei file originari, **revisione 2 al commit `e0840e2`**. Nessuno dei cinque nuovi corpi è approvato o pubblicato. La sola policy Shopify pubblicata resta la privacy italiana aggiornata il 30 ottobre 2026. Il corpo è stato riletto via Admin, 17.946 caratteri e 13 sezioni. Identità dell’impresa e sede sono confermate. Il manifesto associa ogni testo a un hash del solo corpo destinato ai clienti. Eventuali integrazioni richiedono l’approvazione della nuova impronta. [Manifesto delle cinque revisioni](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md#pacchetto-candidato-del-22-novembre-revisione-2)

| Testo | Contenuto completato | Dato o conferma indispensabile |
|---|---|---|
| Termini | Venditore, ordine e pagamento Shopify, conferma, garanzia, reclami, foro. | Destinazione pubblica del telefono registrato in Shopify, atto che conclude il contratto, conferma durevole e ADR ove applicabile. |
| Privacy | Confronto con il testo Shopify su fonti, uso dei dati, terzi, diritti, reclami e trasferimenti; distinzione fra vetrina e piattaforma commerciale. | Registro effettivo di finalità, basi, fornitori, ruoli, conservazione, trasferimenti, marketing e trattamenti autonomi. |
| Spedizioni | Fasce A/B approvate, carrello misto, termine di legge e rimedi per ritardo. | Tempi commerciali di preparazione/consegna, servizio e copertura reale comprese isole ed estero. |
| Resi | Termini, modulo facoltativo, rimborso, conformità ed eccezione per deperibilità da verificare per prodotto. | Destinatario e indirizzo di rientro, spese e costi non postali, recesso elettronico ospite/account con ricevuta. |
| Cookie | Cookie e storage del percorso, servizi e stato delle misurazioni. | Inventario pixel e servizi, qualificazione dei trattamenti residui e verifica dell’effettivo meccanismo di preferenza. |

Il fascicolo indica la sezione Shopify di destinazione, copia di ripristino, verifica italiano/footer/checkout e conferma su supporto durevole. Il telefono della scheda negozio non è automaticamente un recapito pubblico e la sede legale non è automaticamente il magazzino resi. [Privacy pubblicata](https://checkout.shopify.com/102600966484/policies/56892817748.html?locale=it)

## D. Ordini WooCommerce

**BLOCKED_SOURCE_UNAVAILABLE.** Il primo CSV contiene 5.453 ID con un contatore e il secondo 1.108 ID anagrafici. Tutti gli 858 ID con almeno un acquisto trovano una riga anagrafica. La somma dei contatori è 953. I ruoli sono 857 clienti e un autore con un ordine. La precedente classificazione clienti resta 848 candidati, 8 quarantene e un match email da confermare. Il controllo dell’ID fra i due CSV non dimostra l’identità di un cliente Shopify.

| Indicatore reale al 22 novembre | Esito |
|---|---:|
| Fonti complete con transazioni Woo recuperate | 0 |
| Ordini individuali disponibili e verificati | 0 / 953 |
| Identità approvate e associate a un GID Shopify | 0 |
| Ordini pronti per il pilota / importati | 0 / 0 |
| Ordini Shopify con il tag specifico dell’importatore | 0, conteggio esatto |

La ricerca incrementale su Drive, posta pertinente e nuovi archivi locali non ha restituito una transazione. Il foglio non classificato della cartella del progetto ha intestazioni di catalogo. Un set di backup con database si riferisce a un altro sito. Il TAR già noto non è stato nuovamente aperto. Il registro specifica per fonte data, integrità verificabile, copertura e possibilità di collegamento. Rimane da recuperare l’export Woo v3 completo o un dump coerente HPOS/classico, oppure accesso Woo in sola lettura. Servono ID ordine e cliente, righe, quantità e importi originari, valuta, imposte, spedizioni, sconti, date, stati reali, pagamenti, rimborsi e annullamenti, insieme a provenienza e checksum. Per l’ordine dell’autore serve una revisione individuale dell’acquisto e del soggetto, conservando l’esclusione dei privilegi staff. [Registro fonti e specifica](../migration/woocommerce-history-2026-11-20.md#ricerca-incrementale-e-controlli-del-22-novembre)

L’importatore esistente ora consente **un ID** nel mandato pilota. Il lotto esige un riferimento separato, una selezione vincolata all’archivio e una decisione successiva all’accettazione del pilota, incluso il controllo di reporting. Il journal riconcilia il GID remoto e conserva gli esiti incerti. Nessuna cancellazione o correzione contabile automatica. Nel campione di tre ordini Shopify del nuovo canale si osservano quattro eventi di invio email, tre con l’indirizzo associato all’ordine e uno privo di indirizzo nel testo. Il recapito e le notifiche staff restano da verificare. Flow, Messaging e Sendcloud risultano installati. Prima del pilota occorre riscontro in lettura sulle regole attive. Nessuno sviluppo Sendcloud. [Procedura pilota, lotto e ripresa](../migration/woocommerce-history-2026-11-20.md#procedura-privata-archiviata)

## E. Rilascio GitHub e produzione

Base `8c3bb3c`, branch `codex/chiusura-commerciale-storico`, implementazione e candidati `e0840e2`. Il verbale di merge riporta il commit integrato e l’esito dei controlli sull’ultima revisione. [PR #67](https://github.com/Rosin355/your-e-commerce-blueprint/pull/67)

| Ambito | Risultato |
|---|---|
| Codice | Modificati il comando offline/operativo dello storico e il relativo test. Nessuna modifica al frontend, al checkout o al catalogo. |
| Test isolati | 7/7 test dello storico con fixture e rete chiusa. Superati typecheck e build. Nuova prova ospite dell’ingresso Admin nei due profili. |
| Produzione | Letture di impostazioni, eventi, policy e asset pubblici. Nessuna scrittura a clienti/ordini o servizi commerciali. Nessuna operazione di rollback necessaria. |
| Deploy e Publish | Nessun nuovo deploy. In produzione rimane il Publish Lovable `1e2d8f2f-2040-4398-99dd-048201ea3be5` dell’applicazione `ca9050d`, entry `index-DSQ4UzGV.js`, SHA-256 `4f603cd21fdfae105489a165b8986bfea2b3a636f73585cfe21d85ef7c73e0fa`, Admin V2 r2. |

## F. SAL

**57,75% (58% arrotondato)**. I punti per area restano 18,00 + 12,75 + 9,75 + 7,00 + 4,50 + 0,75 + 5,00. Le prove, il codice del writer e le revisioni delle policy migliorano la preparazione. Nessun requisito di produzione è passato a completato. [SAL ufficiale](SAL-2026-11-21.md)

## G. Unica richiesta conclusiva

Il responsabile può rispondere con un unico pacchetto, specificando l’ambito di ciascuna decisione.

1. **Spedizioni.** Dare all’identità tecnica accesso al solo *Online Garden Shipping Test* e fornire la lista contrattuale CAP/località del vettore, inclusi alias ed eccezioni. Il test in Dev è già autorizzato entro il costo incrementale zero. La firma di attivazione live verrà associata soltanto a snapshot e checkout Dev positivi.
2. **Analytics.** Indicare un progetto indipendente idoneo oppure autorizzare una finestra sul progetto pubblicato con orario, operatore e criteri di ripristino, per disattivare la sola Visitor Analytics. Durante la finestra verificare rete, carrello, account, checkout e Admin. L’effetto atteso è l’interruzione della raccolta di visite, clic ed errori browser.
3. **Testi.** Fornire i dati mancanti della tabella C e l’inventario Shopify Eventi cliente/Privacy. Dopo l’integrazione firmare gli hash definitivi, singolarmente o in pacchetto. Solo quella firma consente la pubblicazione sulle superfici indicate.
4. **Storico.** Mettere la fonte autentica in un percorso privato o abilitare accesso Woo in sola lettura. A fonte riconciliata serviranno l’accesso di lettura alle regole delle notifiche/automazioni, il mandato specifico per un ordine e, dopo l’accettazione del pilota, il mandato distinto per i soli ID validati. Fornire la fonte oggi non avvia scritture.
