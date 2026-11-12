# SEO P1 — checkpoint corrente del 12 novembre 2026

Prevalgono il mandato di chiusura del 12 novembre e lo stato corrente: Marco ha account editor/capability nominative e accesso personale confermato. Il Publish SEO deve preservare la build operativa e tutti i grant/flag, senza riportare l’Admin in sola lettura o distribuire backend. La proposta storica di usare normalmente Shopify Admin non descrive la consegna attuale.

**Primo rilascio SEO concluso e verificato live il 12 novembre 2026.** [PR #49](https://github.com/Rosin355/your-e-commerce-blueprint/pull/49) MERGED, HEAD validato `91c26c11a47951b0bf822a644fd42428e8c9ae18`, main applicativo `2d1cee558ff1e292f5d8f34e9d0f86b87b5ce6fb`. [CI Storefront/PostgreSQL 17 e GitGuardian](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/43261015209) SUCCESS sul candidato; nessuna CI push main configurata. Publish Lovable `539ca523-c5ec-4fd0-b5de-3792c605d28d`, versione realmente servita su `onlinegarden.it`: **`seo-p1-20261112-r1`**, asset `/assets/index-7LGwLIzQ.js`. Il merge GitHub e il Publish sono stati verificati separatamente.

**Sitemap e robots:** `/sitemap.xml` HTTP 200, XML valido con **1.349 URL (1.346 prodotti pubblici + 3 pagine)**, DRAFT tecnica esclusa. `/robots.txt` HTTP 200 con direttiva sitemap apex. Canonical renderizzati autoriferiti su catalogo/PDP/contatti; ricerca `noindex,follow`, PDP pubblica `index,follow`. Fotografia generata il 12/11 alle 16:27:20 UTC. Non è una garanzia di indicizzazione/ranking o una nuova URL Inspection Google.

**Admin operativo preservato:** modulo live `readOnlyRelease-DRvoVRBm.js` HTTP 200, byte identici alla build validata, `readOnly=false`, marker `admin-delivery-20261110-r1`. Nessun cambiamento a sorgenti Admin/backend, configurazione operativa, grant, flag, migration o prodotti. Ruolo editor e sette capability nominative di Marco restano quelli già assegnati; accesso personale già confermato, senza ripetere login o canary. Questa verifica di continuità non certifica nuove operazioni dalla sessione cliente.

**Verifica finale:** home, catalogo (1.346 prodotti), ricerca, PDP Rosa Jasmina, canonical/indexazione, offerte JSON-LD reali, breadcrumb/correlati con href, carrello e apertura checkout PASS. Desktop 1280×720 e mobile reale 390×844 senza overflow; override ripristinato. Preventivo standard Roma: €18,50 + €8,90 = €27,40, senza ordine/addebito o dati di contatto; carrello svuotato. Contatti e link Privacy presenti. Safari/iOS non verificati: il controllo Safari non ha risposto. Nessuna nuova prova di pagamento, consegna email o pubblicazione commerciale. [Evidenza di rilascio](evidence/release-2026-11-12.json).

**Aggiornamento sitemap:** il comando esistente `node --import tsx scripts/prepare-seo-sitemap.ts` legge la stessa pubblicazione Storefront del sito e sostituisce la fotografia soltanto dopo validazione completa. È stato eseguito con successo in questo rilascio. Dopo nuove pubblicazioni o cambi handle serve una nuova esecuzione, review del diff e Publish frontend a cura del responsabile tecnico; il solo comando Pubblica dell’Admin non aggiorna il file statico. Nessun cron o aggiornamento automatico dichiarato attivo.

**Redirect HTTP:** 16 proposte tecnicamente corroborate, **0 approvate, 0 pubblicate**; manifest `enabled=false`. GET/HEAD del vecchio percorso Rosa Jasmina dopo il Publish: apex 200 senza Location, www 302 verso lo stesso percorso apex. Nessun 301 verso la PDP. Lovable non espone il livello path-level richiesto; DNS autoritativi ui-dns/IONOS identificati, ma nessun proxy HTTP controllato dimostrato. Per una modifica infrastrutturale serve il titolare/referente DNS IONOS con autorizzazione specifica; non è automaticamente il referente del vecchio cPanel. Nessun DNS/proxy/costo modificato.

**Fonti indipendenti dal backup:** GSC del 10 novembre, export WooCommerce con hash/ID/SKU e lettura Shopify attuale sostengono i 16 mapping. Lookup mirato dei tre SKU incerti: nessuna variante Magnolia/Celtis trovata nella ricerca; la famiglia OG_924853 restituisce 12 varianti di prodotti diversi, non dimostra l’identità di Coppertop. Tre casi e 1.255 percorsi restano distinti; nessun inoltro generico alla homepage. L’archivio Drive è [strutturalmente troncato](evidence/legacy-backup-2026-11-12.json), ma non blocca le corrispondenze dimostrabili con queste fonti. Richiesta selettiva al vecchio hosting e tabella dei soli 16 nella [checklist unica](../release/PROJECT-CLOSEOUT-CHECKLIST.md). Nessun recupero completo dichiarato.

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
