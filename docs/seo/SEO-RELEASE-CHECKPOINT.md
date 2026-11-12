# SEO P1 — checkpoint corrente del 12 novembre 2026

Prevalgono il mandato di chiusura del 12 novembre e lo stato corrente: Marco ha account editor/capability nominative e accesso personale confermato. Il Publish SEO deve preservare la build operativa e tutti i grant/flag, senza riportare l’Admin in sola lettura o distribuire backend. La proposta storica di usare normalmente Shopify Admin non descrive la consegna attuale.

**Esecuzione:** main di partenza `41e53339e647c23ea80e69f3c66fec383ee8ad30`; due conflitti risolti nei soli documenti di stato mantenendo la cronologia. Sitemap rigenerata dal catalogo pubblico: 1.346 prodotti + 3 pagine, DRAFT tecnica esclusa, tutti i 16 target proposti ancora pubblici con GID/handle/SKU ricontrollati. Test SEO mirati 8/8, typecheck, lint e build operativa PASS. CI finale, merge e Publish non ancora eseguiti/attestati da questa nota. Marker frontend previsto `seo-p1-20261112-r1`; marker Admin preservato `admin-delivery-20261110-r1`. [Evidenza di rilascio](evidence/release-2026-11-12.json).

**Aggiornamento sitemap:** il comando esistente `node --import tsx scripts/prepare-seo-sitemap.ts` legge la stessa pubblicazione Storefront del sito e sostituisce la fotografia soltanto dopo validazione completa. È stato eseguito con successo in questo rilascio. Dopo nuove pubblicazioni o cambi handle serve una nuova esecuzione, review del diff e Publish frontend a cura del responsabile tecnico; il solo comando Pubblica dell’Admin non aggiorna il file statico. Nessun cron o aggiornamento automatico dichiarato attivo.

**Redirect HTTP:** i 16 mapping rimangono non approvati e l’adattatore non installato. Verifica nativa Lovable: solo gestione primary-domain 302/307, nessun controllo path-level 301 esposto; i file `_redirects`/worker offline non equivalgono a un rilascio. Attesa una sola approvazione della tabella nella checklist e identificazione del livello HTTP già gestito; nessun cambio DNS/proxy/costo autorizzato implicitamente. Altri 1.255 percorsi e tre casi incerti restano separati.

<details>
<summary>Cronologia della preparazione del 10 novembre — istruzioni Admin e vincoli allora vigenti, superati dal mandato corrente</summary>

# SEO P1 — checkpoint per il rilascio della PR 49

Data: 10 novembre 2026. Stato: primo rilascio SEO circoscritto autorizzato dal proprietario, subordinato ai controlli sotto; esecuzione non attestata da questa nota. Redirect e attivazione Admin V2 operativa restano separati.

## Decisione del proprietario e priorità catalogo

Il proprietario ha confermato il primo passaggio proposto (sitemap e correzioni storefront, redirect disabilitati) e ha precisato che Marco deve poter modificare prodotti e aggiungerne di nuovi con urgenza. Questa conferma non è un'approvazione dei 16 mapping, di cambi DNS o di una migration/abilitazione generalizzata delle scritture Admin V2.

L'Admin personalizzato in sola lettura non soddisfa ancora il requisito di gestione quotidiana. Non dichiararlo consegnato come editor operativo. Non subordinare l'operatività del cliente al completamento dei 1.255 percorsi SEO residui.

Percorso immediato proposto, non nuova architettura approvata: usare Shopify Admin con l'account già autorizzato di Marco per editing e nuove bozze, mentre viene completato l'Admin personalizzato. La guida spedizioni del 5 novembre registra il ruolo Shopify amministratore dell'organizzazione; non attesta il ruolo nell'app Online Garden né una nuova sessione odierna. Verificare l'accesso effettivo senza assegnare privilegi automaticamente. Una scheda nuova va inizialmente in DRAFT e deve essere resa disponibile alla pubblicazione/canale effettivamente usato dallo storefront solo con dati e decisione commerciale confermati. Nessuna creazione, modifica di prodotto o pubblicazione Shopify eseguita da questa nota.

Per il passaggio operativo verificare i campi Shopify realmente letti dal frontend, preservare SKU/handle esistenti, controllare categorie pubbliche e stock senza inventarli. Le classi logistiche A/B usano selezioni di varianti: non basta un tag. Seguire la procedura verificata in `docs/SHIPPING-CLIENT-MANAGEMENT.md` nel branch `codex/shopify-shipping-rates`, senza importare l'intera PR shipping. Nuove varianti non sono automaticamente B; prima di cambiare varianti di un prodotto B, gestire la declassificazione/rivalidazione prevista. Non riaprire gratuità o modificare gli importi.

Non è attestato un import automatico Shopify → catalogo interno: un prodotto creato o modificato in Shopify può non comparire aggiornato nella console in lettura. Registrare gli identificativi prodotto/varianti e prevedere riconciliazione prima di riaccendere la sync interna, senza sovrascrivere le modifiche del cliente. La sitemap preparata è statica: il suo aggiornamento dopo nuove pubblicazioni/handle deve rimanere un'attività esplicita finché non viene automatizzato.

## Evidenze e limiti

PR #49 letta aperta, non Draft e mergeable sul commit `0677798ae831fc31fd376b4c5ba91127d4517bf2`. Verificati direttamente i due check sullo stesso SHA: Storefront / pull-request e GitGuardian Security Checks entrambi completed/success. Questa verifica non attribuisce il PASS a commit documentali successivi e non costituisce review integrale del codice.

Il [report di recupero](SEO-RECOVERY-PLAN.md) distingue 1.380 URL storici, 1.274 percorsi, 21 percorsi prioritari senza 404 HTTP prodotto e quattro soft 404 confermate nel rendering. Tre percorsi sitemap risultano 404 nel report. I risultati del campione non vanno estesi a tutti gli URL e non dimostrano da soli la causa del calo GSC.

Lettura diretta a campione dell'export WooCommerce su Google Sheets: tab `wc-product-export-28-2-2026-1772300858057`, riga 1301, intervallo A:E: ID 15466, tipo variable, SKU OG_748228, nome Tradescantia Nanouk. Conferma la presenza del record storico, non l'approvazione dei 16 mapping e non un permalink originario assente dall'export. Fonte: https://docs.google.com/spreadsheets/d/1jwHC8GP-A6f_g5j-7fgBPoIt4_12IQ5rFieTVsqroNU

## Sequenza per evitare di bloccare tutte le correzioni

### Primo rilascio — sitemap e correzioni storefront

Autorizzato nel perimetro circoscritto, dopo review e controlli sullo SHA effettivo: sitemap, direttiva robots, canonical, correzione noindex transitorio delle PDP, link con href e JSON-LD da dati reali. La fotografia preparata contiene 1.346 prodotti + 3 rotte, non 1.349 prodotti. Rigenerarla in sola lettura immediatamente prima del rilascio e verificare esclusione di test, DRAFT e pagine non pubbliche; mantenere un metodo di aggiornamento quando cambiano handle o pubblicazioni.

Prima di pubblicare da main verificare il diff completo rispetto all'ultimo deployment: il Livello B Admin già integrato non deve attivarsi nella build, né devono essere distribuite Edge Functions o applicate migration. Controllare la configurazione read-only senza cambiare secret o capability. Mantenere noindex e protezioni delle aree non pubbliche; nessun cambiamento checkout, tariffe A/B, Sendcloud, catalogo o Ads.

I redirect restano `enabled=false`, `approvalReference=null`, `reviewApproved=false`. Il primo rilascio NON deve essere descritto come recupero completato dei vecchi link. Dopo pubblicazione: sitemap HTTP 200 e XML valido, robots corretto, PDP prioritari renderizzati e canonical coerenti, controllo regressioni essenziale e versione live registrata. La sitemap facilita la scoperta ma non garantisce indicizzazione o ranking.

### Secondo rilascio — redirect permanenti

Approvazione esplicita dei 16 mapping e verifica delle destinazioni, poi conferma del livello HTTP effettivamente controllato. L'adattatore in `infra/seo/` è offline e non è installato sul provider; il solo publish Lovable non ne dimostra l'attivazione. Nessun cambio DNS, nameserver, proxy, installazione provider o costo senza autorizzazione specifica.

Il redirect deve essere verificato con GET/HEAD e Location verso la destinazione pertinente, che deve mostrare realmente il prodotto e non soltanto HTTP 200. Distinguere apex/www e l'eventuale catena 302 + 301; ridurre gli hop quando possibile senza presentare un hop aggiuntivo, da solo, come prova di fallimento SEO. Nessuna regola indiscriminata verso homepage o sostituzione di slug per somiglianza.

Magnolia Little Gem, Celtis australis e Viburnum Coppertop restano in revisione secondo il report. Gli altri 1.255 percorsi restano nel backlog prioritizzato, non sono dichiarati cancellati. Il recupero del backup completo non è attestato: gli export prodotto già accessibili hanno fornito le evidenze usate finora. Non è necessario restaurare il vecchio sito in produzione per ogni mapping confermato.

## Approvazioni e monitoraggio

Primo rilascio frontend SEO autorizzato; merge, deploy e verifiche live devono essere attestati separatamente dopo esecuzione. Secondo rilascio redirect e attivazione operativa Admin V2 non sono autorizzati dalla conferma SEO. La proposta temporanea Shopify Admin non costituisce una nuova assegnazione di ruoli né un'operazione sul catalogo.

Dopo il rilascio: invio sitemap e URL Inspection tramite accesso GSC autorizzato; il connettore Windsor Search Analytics non equivale al report completo di indicizzazione e non invia sitemap. Registrare stato tecnico, clic e impressioni senza promettere recupero immediato. SEO, Admin operativo e Ads rimangono attività separate.

Riferimenti: [piano e matrice](SEO-RECOVERY-PLAN.md), [infrastruttura HTTP](../../infra/seo/README.md), [Google su JavaScript/noindex](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google sulle migrazioni](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), [Shopify: aggiunta e modifica prodotti](https://help.shopify.com/en/manual/products/add-update-products).


</details>
