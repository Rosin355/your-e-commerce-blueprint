## 5 novembre 2026 — chiusura mirata, gate ancora aperti

**PARTIAL — SPECIFIC BLOCKERS.** Un solo tentativo di apertura autenticata del sottomercato Dev è terminato con “Detached while handling command”. Palermo e Cagliari: **CHECKOUT BLOCKED**, nessun prezzo regionale osservato. Rimane valida l'ultima lettura del 4 novembre: sottomercato Dev 119731978565 attivo e nove importi speciali salvati, senza nuova conferma odierna. Attesi 6,90 € su Palermo B 30 € e 12,50 € su Cagliari misto A 45 €; non sono risultati checkout. Le prove standard PASS non sono state ripetute.

Controllo varianti preservato, **8 test mirati PASS** sul codice esistente: approvazioni server per ogni variante, rifiuto di una sorella A/sconosciuta in B, rifiuto del payload approvazione client, nessuna mutation trasmessa al blocco, trasporti gestiti coperti. Flag Admin V2 invariati e non attivati. Registro B **0 approvazioni effettive**; i 161 candidati restano proposte. Nessuna modifica o separazione di prodotti Shopify.

GitHub sulla baseline 69cc332: base main, Draft, mergeability e mergeStateStatus **UNKNOWN**, non un conflitto dimostrato. Check suite GitGuardian completata SUCCESS; nessuna suite GitHub Actions, altre app in coda. Actions abilitate e allowed_actions=all. La causa del mancato evento automatico non è accertata: non viene attribuita a conflitti o alla modalità Draft. È stato aggiunto in modo conservativo workflow_dispatch, lasciando pull_request, permessi contents:read, controlli e versioni inalterati. Il checkout source manuale usa github.sha; la concorrenza usa il riferimento quando manca il numero PR. Il run e il suo SHA vanno verificati prima di dichiarare CI PASS; esito aggiornato nel corpo/check della PR.

Sicilia/Sardegna sono approvate commercialmente, ma i due checkout restano gate. Elba, Lido, Pellestrina e altre isole minori non sono coperte tecnicamente: proposta al proprietario, **non ancora applicata**, accettare esplicitamente la tariffa della provincia come eccezione commerciale al supplemento richiesto, oppure mantenere il rilascio bloccato su questo requisito. Nessun supplemento inventato, nessun blocco destinazioni o gestione manuale introdotti.

Backup, diff tariffe, 161 candidati, piano classificazione, checklist e rollback sono già conservati in SHIPPING-SHOPIFY-INTEGRATION.md e nelle evidenze esistenti; non è stato ripetuto l'audit. Non costituiscono un rilascio completato. Nessuna modifica produzione, Sendcloud, estero o PR #42; nessun deploy, ordine, pagamento o costo aggiuntivo. Le sezioni seguenti sono cronologia.

## Nuove evidenze — Isole Dev e avvio CI

Tariffe speciali A/B salvate e mercato provinciale Dev attivo. Palermo/Cagliari restano non verificati per interruzione del collegamento browser all'apertura checkout; nessun altro tentativo. Il guard varianti non è cambiato. Storefront attivo ma senza run su 2d034eb: l'unico avvio manuale è rifiutato perché manca il trigger workflow_dispatch; causa del mancato avvio automatico non dimostrata. GitGuardian PASS sulla baseline. Nessuna modifica produzione o Sendcloud. [Dettagli nuovi](SHIPPING-QA-REPORT.md). Le sezioni successive sono storico.

## Aggiornamento controllo varianti PR #45

Vincolo di omogeneità B approvato e blocco server implementato nel codice di prova: assegnazioni B dal client e modifiche varianti di prodotti B rifiutate; pubblicazione B bloccata fino alle approvazioni di tutte le varianti nel registro server. Prodotti sconosciuti senza tag restano A; nessuna separazione automatica. Nessun deploy e flag Admin V2 invariati. [Copertura e limiti del blocco](SHIPPING-CLASSIFICATION.md).

Sicilia/Sardegna approvate; checkout Palermo/Cagliari BLOCKED perché la scheda Dev non è più disponibile. Matrice standard già PASS, non ripetuta. Elba, Lido e Pellestrina restano non coperte. Test mirati Node 19/19 e Deno 67/67, typecheck e build PASS. Main è antenato della PR: nessun conflitto. Il rilascio richiede ancora checkout regionali, approvazioni B ed eccezioni geografiche risolte. Costo aggiuntivo 0 €, produzione e Sendcloud invariati. Le sezioni successive sono cronologia.

## Checkpoint mirato — decisione Isole recepita

Sicilia, Sardegna e isole minori sono commercialmente approvate nella fascia speciale. La configurazione regionale nel negozio di test è ancora in bozza: l'interruzione del controllo browser non ha consentito di verificare Palermo e Cagliari. Le tariffe standard già provate restano PASS. Per Elba, Lido e Pellestrina Shopify non distingue le singole località nel modello provinciale verificato. Nessun supplemento viene esteso all'intera provincia continentale.

Costo aggiuntivo 0 €. Protezione delle nuove varianti ancora da attuare. Decisione da approvare per il catalogo: mantenere i prodotti B con sole varianti tutte approvate e logisticamente omogenee, separando in prodotti A le varianti diverse. Nessuna attivazione live è stata effettuata o autorizzata.

## 4 novembre 2026 — Spedizioni Shopify native: carrelli misti verificati

Nel negozio di test Shopify addebita **una sola spedizione**: 5,90 € per due bulbi da 30 €, 7,90 € per bulbo e pianta grassa da 60 €, 11,90 € per bulbo e arbusto da 45 €, 17,50 € per dieci bulbi e un articolo sconosciuto da 160 €. Gli sconti cambiano lo scaglione quando il valore netto attraversa la soglia. [Prove del checkout](shipping-evidence/2026-11-04/native-shipping/README.md).

Il percorso costa **0 € in più** e mantiene Sendcloud per evasione ed etichette. **Intuitive Shipping:** Valutata esclusivamente per il collaudo; esclusa dalla soluzione di produzione per decisione del proprietario.

Il negozio reale conserva le impostazioni attuali. Per chiudere il perimetro, Marco deve decidere se approvare la fascia isole per province intere in Sicilia e Sardegna e accettare che le eccezioni per singolo CAP seguano la tariffa della provincia. Prima dell'attivazione il team deve anche verificare gli articoli ammessi alla tariffa ridotta e il controllo sulle nuove varianti. Le sezioni successive sono storiche.

## 3 novembre 2026 — Sendcloud mantenuta, nessun abbonamento aggiuntivo introdotto

La soluzione logistica resta Sendcloud e il cliente sceglierà il corriere successivamente. Le tariffe A/B all'acquirente restano quelle concordate, indipendenti dal costo dell'etichetta. Sicilia e Sardegna sono soltanto candidate alla fascia isole; la mappa configurabile delle località speciali rimane da completare e approvare, senza pubblicare approssimazioni.

Abbiamo riconfermato Sendcloud installata in Shopify; il pannello dell'app porta però alla schermata di collegamento account, quindi non attestiamo una configurazione interna completata. La documentazione del checkout dinamico Sendcloud per Shopify richiede Plus, mentre il negozio è su Grow. Le normali regole Sendcloud gestiscono la spedizione dopo l'ordine e non sostituiscono il prezzo del checkout. Non sono stati attivati upgrade, servizi o app aggiuntive; la precedente proposta di un selettore esterno non è più la scelta prioritaria.

**302 test locali spedizioni e 645 test di dominio passati.** Le nuove tariffe non sono applicate al checkout: occorre ancora dimostrare il meccanismo compatibile con il piano e collaudare carrelli misti/zone speciali. Nessuna richiesta ulteriore sul nome del corriere e nessuna modifica live, ordine o costo. [Audit Sendcloud e passi successivi](SHIPPING-SENDCLOUD-AUDIT.md). Le sezioni seguenti conservano la cronologia precedente.

## 3 novembre 2026 — nuove spedizioni preparate, ancora da applicare al checkout

Abbiamo verificato il negozio reale: Shopify addebita ancora 7 € per l'Italia sotto 55 € e rende gratuita la spedizione da 55 €. Questa configurazione non coincide con le tariffe concordate. Sono state preparate entrambe le tabelle, senza gratuità: tariffa ridotta solo per carrelli composti interamente da bulbi/piante grasse approvati; tariffa ordinaria quando compare un arbusto, un prodotto ordinario o non classificato. Le due spedizioni non si sommano.

L'analisi copre 1.364 prodotti e 1.392 varianti. La matrice propone 118 varianti bulbi e 43 grasse da validare, oltre alle classi ordinarie/incerte; tutti i pesi letti sono zero. «Sud» significa **isole e zone disagiate**, non tutte le regioni meridionali. Manca l'elenco ufficiale del corriere: servono servizio contrattuale, CAP/località, conferma dell'ambito di Sicilia e Sardegna e destinazioni non servite. Nessun elenco è stato inventato.

La soluzione proposta mantiene un solo profilo Shopify e seleziona la tariffa corretta attraverso un'app di checkout compatibile con Grow. L'app e il suo costo devono essere confermati con prove sui carrelli misti. Sono passati 295 test locali specifici; i checkout nativi delle nuove tariffe **non sono ancora verificati**. Nessun prodotto, tariffa o impostazione del negozio è stato modificato; nessun ordine o addebito. Il lavoro è su un ramo separato e non modifica Admin V2 o PR #42.

**Stato: preparato localmente, rilascio bloccato.** Dopo aver completato approvazioni e prove presenteremo un solo diff definitivo con richiesta esplicita di autorizzazione, comprensivo di costo app e piano di ritorno alla configurazione precedente. [Tariffe e geografia](SHIPPING-RATE-MATRIX.md) · [Dettaglio tecnico e rollback](SHIPPING-SHOPIFY-INTEGRATION.md) · [Risultati e prove ancora necessarie](SHIPPING-QA-REPORT.md).

## 2 novembre 2026 — master Admin configurato a false, conferma runtime in attesa

Con autorizzazione del proprietario, Lovable ha registrato `false` per il solo `PRODUCT_ADMIN_WRITES_ENABLED` del progetto Online Garden. Nessun prodotto, dato o deploy è stato modificato e il sito pubblico resta disponibile. La schermata Admin dopo il cambio non è stata letta con un account autorizzato: nelle sessioni disponibili compare il login. La misura delle 18:58 riguardava la **Preview prima del cambio**; non dichiariamo READ-ONLY in produzione e la PR #42 resta bloccata. Il passo minimo è leggere i tre indicatori della diagnostica su `onlinegarden.it/admin/settings`, senza DevTools né condivisione di credenziali. [Runbook tecnico nel branch Draft #42](https://github.com/Rosin355/your-e-commerce-blueprint/blob/c05f58775e3fa9fb2299311cfc4dd520e8a26027/docs/ADMIN-V2-ACTIVATION-RUNBOOK.md).

## 2 novembre 2026 — diagnostica Admin pubblicata, verifica degli stati ancora da completare

La sola [PR #44](https://github.com/Rosin355/your-e-commerce-blueprint/pull/44) è stata integrata (`e26d6f4`) e il frontend è stato pubblicato su [onlinegarden.it](https://onlinegarden.it/) tramite Lovable (`251548b2-46c2-4842-85a7-16f9c1cdfa6f`). Homepage, catalogo, scheda prodotto, footer e carrello vuoto sono navigabili; `/admin/settings` richiede correttamente il login. La pagina diagnostica è disponibile nel codice pubblicato per gli Admin autorizzati, ma non è stato possibile leggerla con la sessione disponibile. I tre stati delle scritture **non sono verificati** e Admin V2 della PR #42 resta bloccato. Passo minimo: un Admin già autorizzato apre `/admin/settings` e legge i tre campi mostrati, senza DevTools né invio di credenziali. Nessuna modifica a Shopify, Supabase, Edge, migration, secret o flag. [Report tecnico](ADMIN-RUNTIME-DIAGNOSTICS-ONLY.md). La sezione seguente descrive il preflight precedente.

## 2 novembre 2026 — proposta di diagnostica Admin senza strumenti sviluppatore

È stata preparata separatamente dalla PR #42 una piccola schermata in `/admin/settings` che permette a un amministratore autorizzato di leggere tre stati tecnici già previsti dal server. Non cambia prodotti, prezzi, disponibilità, Shopify o impostazioni. In caso di errore mostra **NON VERIFICATO**, senza indicare falsamente che le scritture sono spente. Il codice della funzione pubblicata nell'ultima distribuzione documentata contiene i tre campi, ma i valori effettivi dell'ambiente online non sono ancora stati letti. La [Draft PR #44](https://github.com/Rosin355/your-e-commerce-blueprint/pull/44) ha CI e GitGuardian positivi sul commit implementativo; la schermata non è stata pubblicata. Per chiudere il gate read-only servirà, dopo una pubblicazione autorizzata, una lettura sul sito reale da parte di un Admin. Nessun controllo con DevTools è richiesto. La PR #42 e l'attivazione delle sue funzioni restano sospese. [Piano tecnico e rollback](ADMIN-RUNTIME-DIAGNOSTICS-ONLY.md).

## 30 ottobre 2026 — CI minima reale, preservando la base #39

Introdotto workflow pull_request verso main e codex/storefront-main-integration con runtime e Action fissati, npm ci senza lifecycle script, typecheck, lint pertinente, build e test Node/Deno con lock frozen. Solo contents:read, nessun segreto applicativo o permesso di scrittura, nessun sync/import/backup/deploy; test Node con blocco rete e Deno senza permessi runtime rete/run/write. Codice dello storefront e test esistenti invariati.

Scelta esplicita dell’utente: aggiornare soltanto la #41 e validare nel suo job technical-base anche l’HEAD esatto #39 aa7e6ae, senza muovere la base. I check sono collegati alla #41; non si dichiarano check diretti nuovi sulla #39. QA locale: #41 339 Node + 92 Deno, #39 336 Node + 92 Deno; typecheck/lint/build positivi. [Run GitHub 41072668699](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699) SUCCESS su 6957184: entrambi gli SHA verificati con gli stessi conteggi, typecheck/lint/build e lock positivi; GitGuardian SUCCESS. Nessuna modifica alle protezioni branch. La #39 non ha un nuovo check applicativo direttamente collegato; il suo codice è validato dal job technical-base della #41. Il successivo commit delle evidenze genera una nuova run da controllare sull’HEAD finale. Review adeguate e staging/commerciale restano gate aperti: nessun READY FOR MERGE.

[Implementazione CI e bootstrap](CI-INTEGRATION.md) · [Release readiness corrente](release/FINAL-RELEASE-READINESS.md). I paragrafi successivi conservano lo stato precedente; i loro riferimenti a CI assente descrivono la situazione prima di questo intervento.

---

## 30 ottobre 2026 — integrazione finale Header Only, nuova Draft PR separata

La decisione cliente sostituisce UX 2.0 completa: homepage, catalogo e PDP con grafica precedente, soltanto navbar recente. Branch `codex/customer-experience-header-final` creato direttamente da #39 `aa7e6ae`, selezionando dieci file applicativi e il test monetario da `99fb008`; src identico al risultato approvato, nessuna ancestry/serie di commit importata dalla #40. HomepageV3 e HomeHero identici alla base.

QA locale positiva: typecheck/lint/build, 339 Node + 92 Deno, checkout di contratto simulato con fetch stub e browser desktop/mobile a sei larghezze. Mega-menu, ricerca, account non autenticato e carrello vuoto verificati; nessun checkout o ordine reale. 14 screenshot essenziali, senza duplicare l’archivio UX 2.0. GitGuardian #39/#40 risultava positivo alla verifica iniziale, ma restano mancanti CI applicativa e review adeguate: **BLOCKED al merge**. Staging/produzione e validazione commerciale separati.

Pubblicato soltanto il nuovo branch senza force push e aperta la **[Draft PR #41](https://github.com/Rosin355/your-e-commerce-blueprint/pull/41)** verso `codex/storefront-main-integration`, collegata a #39 e #40. GitGuardian #41 SUCCESS sul primo HEAD pubblicato `f4164ed`, mergeability clean e diff conforme al manifest; zero workflow applicativi e review: **BLOCKED al merge**. I check finali vanno confermati sul relativo HEAD. PR esistenti (inclusa #40 aperta) e worktree preservati. Nessun merge, deploy o cambiamento live. [Report corrente e gate](HEADER-ONLY-FINAL-INTEGRATION.md) · [Confronti essenziali](header-only-integration-evidence/2026-10-30/comparison.html). Le sezioni sotto sono storico della base.

---

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
