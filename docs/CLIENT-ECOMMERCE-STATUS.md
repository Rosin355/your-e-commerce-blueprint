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
