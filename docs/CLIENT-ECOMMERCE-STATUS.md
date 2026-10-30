## 30 ottobre 2026 — audit catalogo e autonomia Marco (documentazione separata)

Verificati i riferimenti remoti #39 `aa7e6ae` e #41 `d4029b5`, invariati. Audit statico e lettura LIVE Storefront completati in `codex/catalog-autonomy-audit`, senza codice applicativo o scritture Shopify/Supabase. Evidenza pubblica: 1.348 Product GID / 1.376 varianti; dopo il filtro dei due prodotti test dell’app, 1.346 / 1.374. SKU visibili presenti e univoci; 191 prodotti senza collezioni esposte, 364 senza collezioni canoniche esposte, 697 multi-collezione. Sono osservazioni sul perimetro pubblico, non conteggi della coorte 903 o prova di classificazione corretta.

Storico del 10 ottobre conservato: 903 famiglie, 821 assegnate, 82 NEEDS_REVIEW. **Gli 82 sono oggi da riconciliare/verificare; aperti e risolti non determinabili.** L’utente conferma indisponibili connessione Shopify Admin read-only ed export storico; il connettore Supabase nega il progetto atteso. Il piano di chiusura live è documentato e non blocca attività indipendenti.

Menu: tutti i 18 handle reali risolvibili; `/collections/all` virtuale. Vuote Accessori e Piante grasse/succulente. I 23 handle canonici sono esposti, ma la correttezza delle membership richiede sorgenti e mapping. Nessuna deduzione di categorie da testi, SKU o handle.

Autonomia cliente: editing V2 e AI per campo riutilizzabili, con abilitazione live/ruoli da verificare. Creazione manuale V2 assente; NewProductAIPanel collegato soltanto nel legacy, crea DRAFT senza SKU/identità/mapping Supabase o assegnazioni canoniche. Categorie e Pubblicazioni V2 restano segnaposto. Definito il flusso unico con AI opzionale, idempotenza e pubblicazione separata: **proposta, non implementazione**. Test offline pertinenti: 195 Node + 92 Deno PASS; non sono prova commerciale/live.

Per sviluppatore: identità, mapping e criteri di accettazione; per designer: stati chiari senza redesign; per cliente: percorso unico proposto e nessuna autonomia completa dichiarata oggi. [Audit e conteggi](CATALOG-ALIGNMENT-AUDIT.md) · [Piano Admin V2](ADMIN-V2-NEW-PRODUCT-PLAN.md) · [Matrice completa](catalog-audit-evidence/2026-10-30/README.md). Nessuna modifica a PR #39/#41, permessi, dati o servizi; nessun merge/deploy. I paragrafi seguenti conservano la cronologia e i relativi perimetri.

---

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
