# SEO Recovery P1 — rilascio autorizzato del 12 novembre 2026

Il mandato corrente autorizza review, CI/GitGuardian sul nuovo HEAD, merge della PR #49 e Publish frontend SEO. Il riallineamento locale preserva Admin operativo, grant nominativi e flag: build con `VITE_ADMIN_OPERATIONAL_RELEASE=true`, modulo compilato read-only=false. Nessun deploy backend/DDL/canary. Riferimento operativo unico: [checklist di chiusura](../release/PROJECT-CLOSEOUT-CHECKLIST.md).

**Primo rilascio SEO concluso e verificato live il 12 novembre 2026.** [PR #49](https://github.com/Rosin355/your-e-commerce-blueprint/pull/49) MERGED, HEAD validato `91c26c11a47951b0bf822a644fd42428e8c9ae18`, main applicativo `2d1cee558ff1e292f5d8f34e9d0f86b87b5ce6fb`. [CI Storefront/PostgreSQL 17 e GitGuardian](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/43261015209) SUCCESS sul candidato; nessuna CI push main configurata. Publish Lovable `539ca523-c5ec-4fd0-b5de-3792c605d28d`, versione realmente servita su `onlinegarden.it`: **`seo-p1-20261112-r1`**, asset `/assets/index-7LGwLIzQ.js`. Il merge GitHub e il Publish sono stati verificati separatamente.

**Sitemap e robots:** `/sitemap.xml` HTTP 200, XML valido con **1.349 URL (1.346 prodotti pubblici + 3 pagine)**, DRAFT tecnica esclusa. `/robots.txt` HTTP 200 con direttiva sitemap apex. Canonical renderizzati autoriferiti su catalogo/PDP/contatti; ricerca `noindex,follow`, PDP pubblica `index,follow`. Fotografia generata il 12/11 alle 16:27:20 UTC. Non è una garanzia di indicizzazione/ranking o una nuova URL Inspection Google.

**Admin operativo preservato:** modulo live `readOnlyRelease-DRvoVRBm.js` HTTP 200, byte identici alla build validata, `readOnly=false`, marker `admin-delivery-20261110-r1`. Nessun cambiamento a sorgenti Admin/backend, configurazione operativa, grant, flag, migration o prodotti. Ruolo editor e sette capability nominative di Marco restano quelli già assegnati; accesso personale già confermato, senza ripetere login o canary. Questa verifica di continuità non certifica nuove operazioni dalla sessione cliente.

**Verifica finale:** home, catalogo (1.346 prodotti), ricerca, PDP Rosa Jasmina, canonical/indexazione, offerte JSON-LD reali, breadcrumb/correlati con href, carrello e apertura checkout PASS. Desktop 1280×720 e mobile reale 390×844 senza overflow; override ripristinato. Preventivo standard Roma: €18,50 + €8,90 = €27,40, senza ordine/addebito o dati di contatto; carrello svuotato. Contatti e link Privacy presenti. Safari/iOS non verificati: il controllo Safari non ha risposto. Nessuna nuova prova di pagamento, consegna email o pubblicazione commerciale. [Evidenza di rilascio](evidence/release-2026-11-12.json).

**Aggiornamento sitemap:** il comando esistente `node --import tsx scripts/prepare-seo-sitemap.ts` legge la stessa pubblicazione Storefront del sito e sostituisce la fotografia soltanto dopo validazione completa. È stato eseguito con successo in questo rilascio. Dopo nuove pubblicazioni o cambi handle serve una nuova esecuzione, review del diff e Publish frontend a cura del responsabile tecnico; il solo comando Pubblica dell’Admin non aggiorna il file statico. Nessun cron o aggiornamento automatico dichiarato attivo.

**Redirect HTTP:** 16 proposte tecnicamente corroborate, **0 approvate, 0 pubblicate**; manifest `enabled=false`. GET/HEAD del vecchio percorso Rosa Jasmina dopo il Publish: apex 200 senza Location, www 302 verso lo stesso percorso apex. Nessun 301 verso la PDP. Lovable non espone il livello path-level richiesto; DNS autoritativi ui-dns/IONOS identificati, ma nessun proxy HTTP controllato dimostrato. Per una modifica infrastrutturale serve il titolare/referente DNS IONOS con autorizzazione specifica; non è automaticamente il referente del vecchio cPanel. Nessun DNS/proxy/costo modificato.

**Fonti indipendenti dal backup:** GSC del 10 novembre, export WooCommerce con hash/ID/SKU e lettura Shopify attuale sostengono i 16 mapping. Lookup mirato dei tre SKU incerti: nessuna variante Magnolia/Celtis trovata nella ricerca; la famiglia OG_924853 restituisce 12 varianti di prodotti diversi, non dimostra l’identità di Coppertop. Tre casi e 1.255 percorsi restano distinti; nessun inoltro generico alla homepage. L’archivio Drive è [strutturalmente troncato](evidence/legacy-backup-2026-11-12.json), ma non blocca le corrispondenze dimostrabili con queste fonti. Richiesta selettiva al vecchio hosting e tabella dei soli 16 nella [checklist unica](../release/PROJECT-CLOSEOUT-CHECKLIST.md). Nessun recupero completo dichiarato.

<details>
<summary>Cronologia della preparazione del 10 novembre — istruzioni Admin e vincoli allora vigenti, superati dal mandato corrente</summary>

# SEO Recovery P1 — preparazione, 10 novembre 2026

**Stato: PR SEO da revisionare; nessun merge, deploy o redirect live autorizzato/eseguito.** Base verificata `main e111ecf`, che include PR #47 via `b56d421b8c30fbf74e4768c112acbdc6e874fd08`. Il branch è `codex/seo-recovery-p1`. Prima del push, main ricontrollato a `93add0f063d27e1eb0d913942771f916e153a04f`: il solo nuovo file è `docs/seo/SEO-GROWTH-STRATEGY.md`, preservato e fuori dalle modifiche di questa PR. Le conclusioni descrivono il campione e le fonti disponibili, non un audit generale o una diagnosi causale completa.

## Esito per Marco

Il traffico organico della prima settimana è sceso del **48,16% nei clic** e del **57,78% nelle impressioni** tra ottobre e novembre. [Baseline, query e piano di monitoraggio](GSC-BASELINE.md).

Sono stati identificati **1.380 URL prodotto storici** in GSC, corrispondenti a **1.274 percorsi**. Ne sono stati controllati **21 percorsi prioritari su apex e www**: tutti arrivano a HTTP 200 sulla SPA, senza redirect verso la nuova scheda. Nessun 404 HTTP prodotto è stato osservato nel campione; non è lecito estendere questo risultato agli altri URL.

I quattro URL citati nella richiesta sono invece **soft 404 confermate nel rendering**: il server risponde 200, poi React mostra “404 / Pagina non trovata” e imposta `noindex,follow`. Non si afferma che GSC li abbia già classificati come soft 404: il relativo report non è accessibile da Windsor. [GET e redirect](evidence/http-2026-11-10.json), [render iniziale](evidence/rendered-2026-11-10.json), [altri tre URL](evidence/rendered-legacy-additions.json).

Le nuove schede dei quattro prodotti esistono: contenuto, H1, canonical apex autoriferito e `index,follow` sono presenti dopo rendering. Il solo HTML iniziale curl contiene la shell Vite e metadati generici: questo **non prova** che un Googlebot verificato riceva HTML vuoto, perché Lovable documenta [pre-rendering per crawler verificati sui progetti React/Vite precedenti](https://docs.lovable.dev/features/seo-aeo). Serve URL Inspection dopo il futuro rilascio per distinguere la vista Google effettiva.

## Difetti verificati e correzioni del branch

| Tema | Evidenza live/codice | Preparazione effettuata |
| --- | --- | --- |
| Vecchi prodotti | 21 percorsi finiscono sulla SPA 200; 4 renderizzati mostrano pagina 404. Nessun 301 prodotto. | 16 regole HTTP esatte con identità corroborata, tutte disabilitate; nessuna regola globale. |
| Host | `https://www` reindirizza a `https://onlinegarden.it` conservando il percorso; primo hop 302 osservato. Nessun loop nel campione, massimo un hop fino alla SPA. | Canonical e sitemap apex; adattatore preparato per entrambi gli host, subordinato alla verifica della precedenza sul provider. Nessun DNS/primary domain cambiato. |
| Sitemap | `/sitemap.xml`, `/sitemap_index.xml`, `/wp-sitemap.xml` sono 404 HTTP. Anche www/sitemap.xml termina 404: 4 richieste, 3 percorsi unici. | `public/sitemap.xml`: 1.346 prodotti della pubblicazione Storefront + 3 rotte pubbliche = 1.349 URL canonici. |
| Robots | `robots.txt` 200, scansione consentita; nessuna direttiva Sitemap. | Aggiunta sola direttiva Sitemap apex. Nessun blocco crawler introdotto. |
| Canonical | Le 4 nuove PDP renderizzate hanno canonical corretto; default del codice precedente dipendeva dall'host della finestra. | Default centralizzato apex per canonical e JSON-LD, compresa l'anteprima locale. Override VITE già esistente preservato; ricontrollarlo prima di pubblicare. |
| Meta robots PDP | Il codice impostava `noindex` anche mentre attendeva la risposta prodotto. | Rimosso il `noindex` transitorio di caricamento; prodotto assente o errore resta noindex. Dati SEO di un handle precedente non vengono riutilizzati. [Motivazione Google](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics#use-robots-meta-tags-carefully). |
| Product JSON-LD | Product descrittivo e breadcrumb presenti; mancano offerte, recensioni e rating. Il solo Product descrittivo non soddisfa i requisiti snippet prodotto. | Aggiunte offerte con prezzo/valuta reali delle varianti già caricate. Nessun prezzo scritto su Shopify, nessuna recensione/brand/stock inventati. Disponibilità omessa: `availableForSale` non dimostra quantità inventario. [Requisiti Google](https://developers.google.com/search/docs/appearance/structured-data/product-snippet). |
| Linking interno | Catalogo/home usano già Link reali. Breadcrumb e correlati PDP erano pulsanti con `navigate`, senza href. | Convertiti in Link con href canonico di rotta; handler di carrello e checkout non modificati. |

Ricerca mirata nel codice storefront/public: nessun link hardcoded `/prodotto/` o `/categoria/` da sostituire. I dati HTML delle descrizioni Shopify non sono stati riscritti né dichiarati integralmente privi di vecchi link. Le 4 PDP campione hanno descrizioni presenti: non è dimostrata una carenza quantitativa di contenuto. La correttezza botanica delle descrizioni commerciali richiede revisione editoriale del proprietario; questa PR non la presume e non modifica quei dati.

## Identità e matrice redirect

[LEGACY-URL-REDIRECT-MAP.csv](LEGACY-URL-REDIRECT-MAP.csv) contiene esattamente i campi richiesti. Si rigenera offline con `python3 scripts/prepare-legacy-url-map.py` dalle evidenze versionate, senza richieste live. `old_status` è il primo status HTTP quando verificato; `NOT_TESTED` significa URL originale non richiesto direttamente, incluse le query variante non testate. Lo status finale e la catena sono nell'evidenza HTTP. `destination_status` è il GET senza follow della destinazione. Un 200 della SPA non basta da solo: la destinazione deve comparire nella pubblicazione Storefront con lo stesso GID e handle.

HIGH richiede sorgente prodotto, SKU, categoria e immagine originale coerenti con il percorso GSC, collegamento attuale GID e varianti SKU, stato Shopify ACTIVE, presenza nella pubblicazione Storefront e GET canonico 200. La sorgente non contiene permalink/post_name: la corrispondenza al vecchio URL è corroborata, non ricavata da un permalink autorevole. **HIGH è confidenza tecnica da revisionare, non approvazione di Marco.** Tutti i redirect restano `PROPOSE_301_REVIEW_REQUIRED`.

- Export WooCommerce locali del 27 luglio: letti soltanto campi prodotto ID/SKU/categorie/immagini. Hash dei file e righe selezionate in [identità sorgente](evidence/legacy-source-identity.json); nessun export clienti o dump completo copiato.
- Tradescantia: export WooCommerce del 28 febbraio su [Drive](https://docs.google.com/spreadsheets/d/1jwHC8GP-A6f_g5j-7fgBPoIt4_12IQ5rFieTVsqroNU/edit#gid=1879789133), tab e limiti verificati prima della lettura; riga 1301, Woo ID **15466**, SKU **OG_748228**, variante **OG_748228-01** (riga 2133), categoria e immagini coerenti. Lookup limitato A1:E2721, poi AB1301:AE1301; [evidenza sanitizzata](evidence/tradescantia-source-verification.json).
- Mapping attuali: letture SELECT di soli dati prodotto `product_sync_csv_products`, poi conferma read-only dei GID/varianti in Shopify e presenza nel catalogo pubblico. [Riepilogo decisionale](evidence/mapping-evidence.json), [destinazioni HTTP](evidence/destinations-2026-11-10.json).
- Backup database WooCommerce completo: non individuato con provenienza affidabile nelle fonti consultate. Sono stati usati gli export prodotto accessibili; nessun dump SQL ripristinato/scaricato e nessun account cliente letto. Vecchie sitemap live non disponibili ai percorsi verificati; non inventato uno storico sitemap.

| Quattro URL iniziali: slug storico | SKU affidabile | Destinazione verificata |
| --- | --- | --- |
| tradescantia-nanouk | OG_748228 | `/products/tradescantia-nanouk` |
| rosa-jasmina-rampicante | OG_436162 | `/products/rosa-jasmina-rampicante` |
| ginkgo-biloba-mariken | OG_839828 | `/products/ginkgo-biloba-mariken-albero-nano-da-giardino-e-terrazzo` |
| castanea-sativa-marrone-di-marradi-castagno-marrone | OG_334361 | `/products/castanea-sativa-marrone-di-marradi-castagno-marrone` |

Tre casi identificati nel campione richiedono decisione aggiuntiva: **Magnolia Little Gem** e **Celtis australis** senza GID attuale verificato nella sorgente; **Viburnum Coppertop** con SKU variante discordante. Non vengono cancellati, pubblicati, associati o reindirizzati per approssimazione. Altri **1.255 percorsi** restano da riconciliare; una destinazione vuota non significa “prodotto rimosso”. Nessun 410 proposto come fatto accertato senza decisione. Per rimozioni reali senza sostituto pertinente mantenere 404/410 HTTP, secondo [Google](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors#soft-404-errors), mai un redirect indiscriminato alla homepage.

## Preparazione infrastrutturale e pubblicazione

[Configurazione e limiti del livello HTTP](../../infra/seo/README.md). Il modulo risponde con un vero 301 Request/Response solo dopo gate espliciti; test offline su host, percorsi, metodi, query, destinazioni e fail-closed. Non è collegato a nessuna route provider. Il `server: cloudflare` pubblico non prova controllo della zona da parte del proprietario. Prima di un rilascio occorre confermare il livello HTTP esistente e la sua precedenza sul 302 www; altrimenti il singolo hop non è garantito. Nessun `_redirects` non supportato, finto redirect React o nuovo abbonamento.

La sitemap è una fotografia manuale della pubblicazione **Storefront**, non dell'intero Admin catalog. Esclude i due ID test già nascosti dall'app, prodotti non pubblicati e DRAFT non esposti da Shopify. I prodotti pubblici esauriti mantengono URL indicizzabili: indisponibilità non equivale a rimozione. Nessun `lastmod` inventato. Generatore manuale `node --import tsx scripts/prepare-seo-sitemap.ts`, senza mutation; fallisce su paginazione incoerente, duplicati, handle invalidi o catalogo vuoto, senza produrre una lista parziale. Non viene eseguito da build/CI; rigenerare e revisionare la fotografia immediatamente prima del futuro rilascio, soprattutto se cambiano pubblicazioni o handle. La sitemap non cambia lo stato dei prodotti Shopify.

**Prossima azione concreta:** approvare un unico change SEO con questa PR e i 16 mapping, autorizzando separatamente la successiva pubblicazione e confermando il livello HTTP del provider già in uso. Questa richiesta non autorizza ora né merge né deploy. Dopo tale change: QA HTTP reale, sitemap live 200 e URL Inspection/GSC da account autorizzato; Windsor qui è read-only e non invia sitemap.

## Verifica e continuità Admin V2

Test mirati SEO e test strutturati pertinenti, lint dei file modificati, typecheck e build read-only; aggiunto lint SEO al workflow PR esistente, nessun deploy job. I nuovi test sono scoperti dalla suite Node offline di CI. Verifica Chrome locale: PDP valida con canonical apex, `index,follow`, offerte reali e link href; prodotto assente noindex senza Product JSON-LD. [Evidenza locale](evidence/local-validation.json). Non rieseguite manualmente le suite Admin/SQL/canary già superate. CI/GitGuardian finali e commit fanno fede sulla singola PR SEO.

Admin V2 resta separato: Livello A live di riferimento `admin-readonly-20261106-r1`; Livello B integrato da PR #47 ma disabilitato. File Admin, backend, migration pendente e configurazione flag non modificati da questo lavoro. Ultima lettura runtime attestata dal proprietario: **09/11/2026 19:16:37 CET**, writesEnabled=false, writeMode=canary, shopifySyncEnabled=false, READ-ONLY; non viene presentata come nuova lettura odierna né come cronologia completa dei secret. Recovery non dimostrato, ruolo/identità Marco non verificati, zero mapping categorie approvati. Nessuna migration, canary, scrittura, modifica ruolo/secret, sincronizzazione Shopify o deploy Lovable. Payments, checkout, spedizioni A/B, Sendcloud, inventario e catalogo commerciale non modificati.


</details>
