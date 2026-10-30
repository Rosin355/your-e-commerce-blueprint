# Online Garden — Safe storefront main integration

28 ottobre 2026. **READY FOR PR locale**, subordinato alla review/CI della futura PR; non è autorizzazione a push, merge o rilascio. Nessuna regressione P0/P1 introdotta rilevata nei controlli obbligatori offline.

## 1. Origine e protezione Git

- Worktree separato: `/private/tmp/online-garden-storefront-main-integration`.
- Branch: `codex/storefront-main-integration`, creato ex novo senza sovrascrivere branch esistenti.
- Base esatta e merge-base con il target verificato: **`0d1bf639d7fb0c8cd5c47b2dc222ea86c5b1bab3`**, `origin/main` invariato dopo fetch.
- Provenienza: `e6da421892759da9df8c8a44505b7b132d887bce`, `0d028eba1b183517c89db0932d4437159899265f`, `7a7ed51c037f335df4b8b215a3322a7683bbe007`.
- Il vecchio ramo resta a `7a7ed51`; il suo merge-base era `5f617d3cffcd9cd0d134a5d89196efb106aad331`, divergenza 383 remoti / 5 locali, 14 conflitti virtuali. Questi conflitti non sono stati importati: nessun merge o cherry-pick.
- I commit sorgente sono provenienza del port, **non antenati del nuovo branch**. I due antenati locali import/Admin non sono stati trasferiti.
- Snapshot SHA-256 di tutti i **39 file** dirty/untracked originali, inclusi i **18 protetti**. Hash dei 18 identici al precedente audit; hash/status/HEAD originali ricontrollati. Nessun cambio branch/index nel worktree originale, reset, clean, stash o rebase.

La documentazione dell'audit precedente non committata resta nel worktree originale; non è stata aggiunta involontariamente a questo ramo. I report storici completi/evidenze restano nella catena sorgente. Nuova documentazione basata sulle verifiche effettive di main.

## 2. Analisi differenziale

La [matrice completa per i 98 percorsi sorgente](storefront-integration-evidence/2026-10-28/classification.json) comprende anche i documenti/evidenze storici esclusi. I seguenti sono gli interventi applicativi e le decisioni architetturali:

| File / funzionalità | Classificazione | Decisione effettiva |
| --- | --- | --- |
| `shopify.ts`, catalogo completo | ADAPT | Cursori da 100, deduplica ID, validazione cursori, abort prima delle pagine e prima del ritorno; nessun cap 1.000 e nessun risultato incompleto presentato come finale. |
| Query catalogo dedicata / `CatalogProduct` | ADAPT | Una immagine e nessuna variante; mantenuti descrizione, vendor/tag/tipo, publishedAt e membership collezioni necessari ai contratti main. |
| Ricerca Shopify `buildCatalogQuery` del sorgente | SKIP | Non compatibile con la ricerca main su descrizione/handle/tassonomia. Non migrato a `search`. |
| `storefrontDiscovery.ts`, categorie canoniche | ALREADY PRESENT / ADAPT | Ranking e normalizzazione main identici; ampliato soltanto il contratto strutturale del tipo per prodotti catalogo senza varianti. |
| `AllProducts.tsx` | ADAPT | Ricerca locale sul catalogo completo; query URL successive riusano lo stesso insieme, senza nuovo download. Filtri, conteggi, date, featured/best e ordinamento main conservati. Errore/retry esplicito. |
| `useProduct.ts` | ADAPT | 100 varianti iniziali e cursori fino al completamento; prima variante vendibile, abort e risposta obsoleta ignorata, retry. Preservati campi discovery e filtro ID test di main. |
| `CollectionPage.tsx`, query collezione | ADAPT | Pagine da 60 con pulsante/retry, deduplica, cancellazione e controllo cursori ciclici per sessione. Stato “prodotti caricati”, senza falso totale. |
| `CatalogProductCard.tsx`, `ProductCard.tsx` | PORT | Link reali, valuta ricevuta, disponibilità di prodotto, scelta formato in PDP prima dell'acquisto quando necessario. |
| Homepage e correlati | ALREADY PRESENT / ADAPT | Restano `fetchProducts(120, ..., CREATED_AT/reverse)` e selettori canonici recenti di main, senza ripristinare vecchie selezioni generiche. Errore distinto da selezione vuota. |
| `Pdp.tsx` | ADAPT | Stock numerico sintetico e fallback botanici/commerciali rimossi; dati soltanto da sorgente. Conservati gallery mobile contenuta e correlati main; dialog accessibile, calendario JSON e scroll interno, acquisti protetti. Il vecchio blocco promo morto è SKIP. |
| `shopify-checkout.ts`, `cartStore.ts`, `CartDrawer.tsx` | PORT | Quantità intere, lock, URL fresco HTTPS nella stessa scheda, retry “Acquista ora” senza raddoppio. Persistiti solo articoli, ignorati URL/flag obsoleti. Mutation cartCreate di main identica. |
| `HomeHero`, `SiteHeader`, `index.css` | PORT / ADAPT | Pausa/reduced motion, skip link, focus; aggiunte alle regole CSS attuali senza rimuovere container query Admin. |
| Announcement e header compatto | ALREADY PRESENT / ADAPT | Design mobile main conservato; solo min-width safety del link logo. Nessun ripristino del vecchio layout header. |
| Footer, PaymentInformation, newsletter | PORT / ADAPT | Nessun elenco pagamenti/promessa di consegna/resi non confermato; newsletter non funzionante dichiarata indisponibile. Nessun servizio attivato. |
| Hook/metadati route, Index/NotFound/ProductDetail | PORT | Title, description, canonical, robots, OG/Twitter con cleanup. Missing/error PDP e collezioni noindex; NotFound italiano noindex. |
| Product e BreadcrumbList JSON-LD | PORT | Titolo/descrizione/immagini Storefront; URL coerenti con canonical, escape sicuro e cleanup loading/missing/error/uscita. Niente Offer/prezzo/stock/rating/brand inventati. |
| `index.html`, `.env.example` | ADAPT | Italiano e rimozione handle social non verificato; origine SEO opzionale documentata, nessuna configurazione negozio/hosting modificata. |
| Fixture e test | ADAPT | Mantengono ranking/categorie main e proiettano i campi GraphQL richiesti; suite separate Node/Deno e nuovi casi 10k/ID test. |
| Audit/log/PNG storici e vecchia checklist | SKIP | Nessuna importazione massiva di evidenze non relative al main integrato; soltanto nuova evidenza limitata e riproducibile. |
| Migration, admin-product-field, vecchio Admin/auth/sync | SKIP | Rimangono integralmente le implementazioni di main. Nessuna migration o endpoint parallelo. |
| Sitemap, Organization, SSR/SSG, status HTTP | BLOCKED | Mancano dominio/regole/identità approvati e decisione hosting. Nessuna implementazione infrastrutturale o pubblicazione. |

## 3. Semantica e protezioni mantenute

**Ricerca client-side:** Shopify restituisce pagine del catalogo pubblico, ordinate per ID, senza espressione costruita dai termini utente. La ricerca resta quella di main: titolo prioritario, tassonomia canonica, product type/tag/vendor/handle e descrizione, con normalizzazione italiana. Filtri e sort sono locali sul set **completo**. Il parametro query opzionale della funzione dati resta inoltrabile, ma non è usato dalla UI per restringere la semantica. Nessuna interpolazione dei termini utente in GraphQL.

**Paginazione server-side:** cursori Shopify per download catalogo, prodotti delle collezioni e varianti PDP. Una collezione può mostrare progressivamente gli elementi con conteggio esplicito di caricamento; il catalogo con filtri/sort globali aspetta la connessione completa. Errori intermedi non fanno apparire un sottoinsieme come ricerca conclusa. La PDP non rende acquistabile un set di varianti incompleto.

**Prodotti test:** mantenuti gli ID esclusi `15357653156180` e `15357653188948` in catalogo, home, collezioni e accesso diretto PDP; per questi ultimi nessun acquisto o JSON-LD. Nessuno stato Shopify cambiato.

**Backend:** diff vuoto su `src/admin`, `src/adminv2`, `src/catalog`, `src/integrations`, `src/hooks/useAuth.tsx`, `src/App.tsx`, `supabase`, `sync`, package e lockfile. Nessuna nuova funzione o strada Admin di scrittura. `product-admin-api` conserva `canSyncShopify(auth.roles)`, `shopifySyncEnabled()` e `WRITES_DISABLED`; la configurazione live del flag non è stata letta o modificata. Rimane il flusso consentito **cartCreate → checkoutUrl**, mutation byte-identica a main. Nessuna mutation di prodotto/inventario/prezzo aggiunta.

**Versione API:** configurazione main preservata, fallback `2025-07`. Il precedente audit sorgente osservò fall-forward servito `2026-01`; è evidenza storica, non una nuova chiamata live in questa fase né prova delle env pubblicate. Query e mutation non sono state validate live qui: il pin resta subordinato a compatibilità completa in staging autorizzato.

## 4. QA: esiti e confronto

Ambiente: Node 22.22.3, Deno 2.9.5, Chrome headless (versione nei report), dipendenze locali riutilizzate con root/cache isolati. Nessuna installazione o lockfile aggiornato. Non equivale a `npm ci` su runner pulito.

| Controllo | Main base | Sorgente 7a7ed51, export pulito | Integrato |
| --- | --- | --- | --- |
| Typecheck app | PASS | PASS | PASS |
| Build production | PASS | PASS | PASS |
| Test dominio Node | 320 PASS | 39 PASS | **336 PASS** |
| Test dominio Deno nativi, senza permesso rete applicativo | 92 PASS | non presenti in quella suite | **92 PASS** |
| Lint file frontend cambiati | baseline non rifatta globale | esito precedente noto; non sostituisce l'integrato | **24 file, 0 errori/warning** |
| Lint tre nuovi test TS | n/a | n/a | PASS con `--no-ignore`; script esclusi dal config globale main |
| Packaging Edge main | 21/12 moduli, PASS | vecchio endpoint parallelo escluso | **21/12 moduli, PASS**, checker invariato |
| Browser responsive UX | baseline funzionale coperta dai test main; non dichiarata equivalente | storico 15+6+4, benchmark rieseguito | **15/15**, sei larghezze 320–1440 |
| Browser scala/SEO production | benchmark evidenzia troncamento a 1.000 | benchmark completo | **6/6**, inclusi 1.205 prodotti, 205 varianti e checkout ultima variante |
| Browser SEO/safe production | metadati dinamici assenti nella base | benchmark, non nuova certificazione SEO | **4/4** |
| Browser integrazione production | benchmark e discovery di dominio | benchmark | **3/3**: 10k/search, quattro viewport compatti, ID test nascosti |

**Totale integrato: 428 test dominio (336 Node + 92 Deno), nessuna assertion fallita.** I conteggi differenti misurano suite differenti, non percentuali di copertura confrontabili. I 18 test non tracciati del vecchio working tree non sono stati importati.

**Comando di main non verde:** `npm run test:catalog` globba anche quattro file Deno e, in Node, fallisce al caricamento di `jsr:@std/assert` (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). Riprodotto prima delle modifiche e sull'integrato; nessuna assertion di dominio viene eseguita in quei quattro file con Node. Nessun test disabilitato: il nuovo `node scripts/ux-audit/domain.mjs` avvia tutti i file con il runtime corretto, con i risultati sopra. Package main invariato. Correzione dello script npm esistente rinviata a manutenzione QA esplicita; il runner consegnato supera l'intero controllo dominio richiesto.

Primi tentativi QA non considerati PASS: dipendenze copiate con symlink pnpm non risolti/SWC nativo, poi risolti soltanto nell'ambiente isolato; un'aspettativa browser del vecchio ramo incompatibile con la ricerca canonica main; selettori singolare/conteggio condizionato e misura del pannello durante animazione. Adeguate le fixture/attese, senza rimuovere scenari o modificare la semantica per farli passare. La misura del dialog a transizione conclusa passa nei quattro viewport compatti. Typecheck/build e suite finali ripetute sul nuovo albero.

Sono inoltre verificati: errore pagina catalogo/collezione/varianti e retry, doppio checkout concorrente, retry senza quantità duplicate, dati persistiti obsoleti, prima variante disponibile oltre dieci, navigazione rapida, formati tardivi, sort globale, cleanup JSON-LD/meta e nessuna eccezione JS. I browser intercettano Shopify, Supabase, checkout, font e altri host esterni. Nessun carrello o ordine live creato.

Warning build preesistenti: chunk >500 kB e classi Tailwind ambigue. Lint globale non dichiarato verde. RLS/auth/database e packaging remoto non sono stati certificati su servizi live: codice protetto invariato e test locali main conservati.

## 5. Confronto performance controllato

Stesse fixture per le tre build production: 1.205/10.000 prodotti, descrizione sintetica ~1.000 caratteri, cinque immagini e dieci varianti disponibili nel mock. La risposta proietta la selezione GraphQL effettiva. Tre ripetizioni alternate per build/volume, viewport 1440×900, 20 ms artificiali per risposta. Diciotto esecuzioni. Prima card = presenza DOM da inizio navigazione, **non paint/LCP**; JSON = byte cumulativi API, non immagini/bundle o trasferimento compresso. Nessun p95 o SLA ricavato da tre campioni.

| Fixture | Build | Prodotti restituiti | Richieste | JSON MB decimali | Byte/prodotto | Prima card DOM, mediana ms |
| --- | --- | --- | --- | --- | --- | --- |
| 1.205 | Main 0d1bf63 | 1.000 | 4 | 4.010 | 4010.4 | 301 |
| 1.205 | Sorgente 7a7ed51 | 1.205 | 13 | 0.436 | 362.2 | 880 |
| 1.205 | Integrato | 1.205 | 13 | 1.919 | 1592.2 | 869 |
| 10.000 | Main 0d1bf63 | 1.000 | 4 | 4.010 | 4010.4 | 326 |
| 10.000 | Sorgente 7a7ed51 | 10.000 | 100 | 3.654 | 365.4 | 3396 |
| 10.000 | Integrato | 10.000 | 100 | 15.954 | 1595.4 | 3388 |

Il main appare più rapido perché termina a 1.000 prodotti: **non è copertura equivalente**. L'integrato elimina il troncamento e riduce il payload per prodotto di circa **60,2%** rispetto alla selezione main nelle fixture; il totale aumenta a 10k perché ora restituisce dieci volte i prodotti. La sorgente trasferisce meno byte perché non restituisce descrizione/tassonomia/data: non può essere sostituita integralmente senza perdere la ricerca attuale. Nessuna promessa di miglioramento dell'attesa a 10k o confronto percentuale di latenza su set differenti.

Query successive nella stessa route vengono valutate localmente senza nuovo download; l'uscita dalla route cancella l'operazione. Rimangono caricamento O(N), memoria e 100 richieste sequenziali a 10k. La progressività richiede una proposta con filtri/sort/faccette globali compatibili; non viene simulata con conteggi parziali.

## 6. Rischi residui e piano

**Interventi sicuri consegnati:** port storefront selettivo, protezioni di concorrenza/errori, cursori completi, disponibilità reale come campo sorgente, card leggere, a11y, SEO/JSON-LD DOM, test e documentazione. Nessuna nuova configurazione commerciale.

**Interventi con rischio da progettare:** primo risultato progressivo con conteggi/faccette/sort globali, gestione caching/invalidazione, costo delle membership `collections(first:50)` già presente su main e necessità di paginarle se una risorsa supera quel contratto. `best` conserva il fallback di main: non rappresenta una certificazione di vendite reali. Nessun dato di vendite inventato. Misurare rete mobile, immagini, Safari e carico Shopify rappresentativo prima di dichiarare readiness prestazionale.

**Decisioni che richiedono approvazione:** origine canonica definitiva e regole sitemap, identità Organization, strategia HTTP 404/prerender/SSR e hosting; eventuale indice esterno, pin di versione dopo test completi; contenuti legali/commerciali e pagamenti effettivi. Nessun SSR/SSG, migrazione, workaround client dichiarato vero HTTP 404 o sitemap pubblicata.

**Gate staging/lancio:** query su catalogo reale, disponibilità/varianti/prezzi/valuta nel mercato configurato, errori/warnings Shopify, checkout sandbox autorizzato senza ordini reali, crawler e HTML del dominio pubblicato, canonical e status HTTP. L'attuale rendering SPA può ancora rispondere **200 per route inesistente**; noindex DOM non risolve quel comportamento server. La preview Lovable era protetta nell'audit storico: non è prova del sito pubblicato.

**Criteri di accettazione PR locale:** base esatta main; nessun diff nelle aree protette; nessun cap artificiale/risultato incompleto; ranking/ordinamenti main e ID test preservati; 1.205/10k prodotti, 205 varianti e checkout simulato corretti; typecheck/lint/build/dominio/browser/packaging verdi; hash originali invariati. Tutti soddisfatti nelle evidenze locali. Nessun gate di rilascio live dichiarato superato.

## 7. Consegna e limiti Git

**HEAD applicativo verificato: `624fc66`** (catalogo `e33a9c3`, UX `eb8bbfd`, SEO `624fc66`). [Elenco completo dei file consegnati](storefront-integration-evidence/2026-10-28/changed-files.txt). Commit locali separati per catalogo, UX/checkout, SEO e documentazione/QA; l'elenco finale si ottiene con `git log --oneline 0d1bf63..codex/storefront-main-integration`. SHA finale riportato nella consegna della chat, evitando uno SHA autoreferenziale in questo file.

Branch di origine e 18 file protetti preservati. Nessuna inclusione dei documenti dirty precedenti, migration o vecchio backend. Scansione mirata dei file cambiati senza nuovi pattern di credenziali private; token Storefront pubblico preesistente invariato. Non è una certificazione esaustiva di segreti/storia. Nessun push, merge, PR, deploy, scrittura o configurazione live.

[QA/evidenze](storefront-integration-evidence/2026-10-28/README.md) · [Riproduzione](../scripts/ux-audit/README.md).
