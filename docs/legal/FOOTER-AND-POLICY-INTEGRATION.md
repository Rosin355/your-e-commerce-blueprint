# Online Garden — footer, contatti e integrazione policy

1 novembre 2026. Branch `codex/storefront-footer-legal`, worktree indipendente da `main` `b5cbe57aa1f7e674ce7caca106d359f8977c800a`. Implementazione pronta alla review; **pubblicazione del sito bloccata dai gate legali e consenso sotto indicati**. Nessun merge o deploy autorizzato da questa consegna.

## Isolamento e fonti

Fetch iniziale completato; PR aperte verificate con GitHub e CLI: #40 (redesign non approvato) e #42 (Admin V2). Nessun branch/worktree footer/legal preesistente. Il checkout originale e i suoi file dirty non sono stati usati come base né modificati. Nessun commit della #40 importato. Nessun intervento a Admin V2, API, backend, migration, Supabase, configurazione Shopify o Lovable live.

`docs/legal/` non esisteva in main. Nessun documento legale approvato o bozza legale del vecchio WordPress disponibile nel repository: il recupero storico resta **non attestato**, non completato per deduzione. Le sole fonti utilizzabili sono la policy Shopify già pubblicata, la verifica Admin read-only e l'istruzione esplicita del cliente di collegarla. La pubblicazione esistente non viene presentata come nuova approvazione legale di conformità.

L'audit usa `shop { contactEmail shopPolicies { type url body updatedAt } }`, con introspezione, validazione schema e sola lettura. [Riferimento ufficiale Shopify](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/shop). Il testo HTML non viene salvato né renderizzato nell'app: il riepilogo conserva soltanto presenza, lunghezza, URL e data. [Evidenza Shopify](evidence/2026-11-01/shopify-readonly-summary.json).

## Risultato applicativo

- Footer con tre gruppi: Catalogo, Informazioni, Legale. Conservati marchio tipografico, colori, font, descrizione, separatori, padding e gap del footer approvato. La griglia passa da cinque a tre colonne desktop perché social e newsletter inattivi sono rimossi. Link con target minimo 24px e focus esistente; navigazioni con nome accessibile.
- Eliminati tutti i segnaposto del footer, Chi siamo/FAQ/Ispirazioni senza pagine reali, social non verificati e newsletter inattiva. Nessun form simulato e nessun dato societario inventato.
- Contatti e assistenza in `/contatti`: unico recapito `mailto:info@onlinegarden.it`, confermato dal negozio connesso. Nessun telefono, indirizzo, orario o SLA di risposta. Verificato l'href, non l'invio/ricezione della posta.
- Privacy direttamente all'URL ufficiale Shopify nella stessa scheda. `/privacy-policy` è un alias di compatibilità che usa `location.replace` verso lo stesso URL, con link di fallback e `noindex`. Nessun iframe, fetch HTML, `dangerouslySetInnerHTML`, testo duplicato o copia che richieda aggiornamenti autonomi.
- Registro `src/config/legal.ts`: destinazioni pubblicabili separate dalle quattro policy `unavailable`. I percorsi riservati non sono registrati come pagine vuote, non sono linkati e passano al fallback esistente `NotFound` con `noindex,follow` nel DOM. L'attivazione futura richiede un contenuto approvato, il relativo handler e il collaudo, non il solo cambio di un flag.
- Homepage, catalogo, PDP, header e gestione checkout non modificati nei sorgenti; footer condiviso aggiornato su tutte le pagine che lo includono.

## Stato puntuale delle pagine

| Pagina | Disponibilità / bozza / approvazione | Pubblicabilità | Stato effettivo |
| --- | --- | --- | --- |
| Privacy Policy | Disponibile in italiano; aggiornamento Shopify `2026-10-30T15:02:23Z`. Collegamento esplicitamente autorizzato nella richiesta; nessuna nuova revisione legale autonoma | Link ufficiale utilizzabile | **Pubblicata e verificata su Shopify**, HTTP 200, testo italiano; integrazione footer e alias soltanto sul branch |
| `/cookie-policy` | Non disponibile; nessuna bozza reperita; da redigere e approvare | **Non pubblicabile** | Route riservata e disattiva; nessun link |
| `/termini-e-condizioni` | Assente nell'elenco policy Shopify; nessuna bozza reperita; da approvare | **Non pubblicabile** | Route riservata e disattiva; nessun link |
| `/spedizioni` | Assente nell'elenco policy Shopify; nessuna bozza reperita; da approvare | **Non pubblicabile** | Route riservata e disattiva; nessun link |
| `/resi-e-rimborsi` | Assente nell'elenco policy Shopify; nessuna bozza reperita; da approvare | **Non pubblicabile** | Route riservata e disattiva; nessun link |
| `/contatti` | Email disponibile e verificata via Shopify; contenuto tecnico limitato al recapito autorizzato | Implementazione disponibile per review | Verificata nella build locale; **non pubblicata sul sito** |
| Chi siamo / FAQ | Nessuna pagina reale reperita | Nessun collegamento previsto | Non pubblicate da questo intervento |

Non sono state create bozze di testi legali. I documenti di questa cartella sono documentazione tecnica e checklist, non policy del negozio.

## Link controllati

Privacy: <https://checkout.shopify.com/102600966484/policies/56892817748.html?locale=it>, risposta HTTP 200 e pagina italiana verificate con HTTP e browser.

Categorie pubbliche verificate nel browser, senza creare carrelli o ordini:

| Destinazione | Esito live read-only |
| --- | --- |
| <https://onlinegarden.it/collections/piante-da-esterno> | Titolo corretto, 60 card nella prima pagina, nessun errore |
| <https://onlinegarden.it/collections/rose> | Titolo corretto, 60 card nella prima pagina, nessun errore |
| <https://onlinegarden.it/collections/piante-da-frutto> | Titolo corretto, 60 card nella prima pagina, nessun errore |
| <https://onlinegarden.it/collections/conifere> | Titolo corretto, 57 card, nessun errore |
| <https://onlinegarden.it/collections/all> | Catalogo funzionante, 9 card iniziali; non è un conteggio totale prodotti |

Contatto: `mailto:info@onlinegarden.it`. `/contatti` e l'alias locale privacy sono funzionanti nella build del branch; non vanno indicati come già online. I conteggi card descrivono il caricamento osservato, non giacenze o consistenza dell'intero catalogo.

## Cookie, script e consenso: blocco di validazione

Audit statico: nessun GA/GTM, Meta Pixel, SDK marketing o CMP nel codice applicativo; nessun loader condizionato da consenso. Presenti Google Fonts in `index.html`, immagini Shopify, API Storefront, autenticazione Supabase esistente e collegamenti di condivisione esterni nella PDP. I link social di condivisione non certificano canali ufficiali e non sono widget SDK caricati in anticipo.

Storage tecnico applicativo esistente: `shopify-cart` in localStorage; sessionStorage per PKCE/state/nonce e token dell'account Shopify; storage sessione Supabase. `sidebar_state` è previsto dal componente UI sidebar, ma non è stato osservato nello storefront anonimo. Nessun nuovo cookie o storage introdotto.

Audit browser live, nuovo visitatore senza interazioni di consenso:

- Hosting aggiunge `/~flock.js` e `/__l5e/events.270c78a44fc53e7b.js`, assenti dall'HTML sorgente del repository. Il primo contiene codice per analytics e identificativi sessione; il secondo espone un percorso eventi e supporto alla lettura del consenso. Questa è analisi tecnica del codice pubblico, non una certificazione del trattamento.
- Nessun banner o controllo CMP rilevato. Attributo `data-consent` assente sugli script; osservato un **tentativo POST a `/__l5e/trackevents` prima di qualsiasi consenso**. L'audit ha bloccato tutte le POST non di lettura: i fallimenti registrati derivano dalla protezione del test e provano il tentativo, **non l'effettiva ricezione degli eventi da parte del provider**. Nessun payload, token o identificativo visitatore salvato.
- Cookie osservati: `__cf_bm` e `__dpl` sul dominio pubblico; `_shopify_essential` sul dominio della pagina policy Shopify. localStorage/sessionStorage vuoti alla visita anonima iniziale. Nomi e contesti non bastano a certificare la classificazione legale: inventario, finalità e conservazione vanno confermati con hosting/Shopify.
- Nessuna prova che analytics/marketing non essenziali siano subordinati a consenso. **BLOCKED alla dichiarazione di corretta gestione consenso**: Marco/fornitore devono classificare la telemetria e approvare eventuale disattivazione o gating. Se serve una CMP, scelta e configurazione richiedono approvazione separata. Anche i font remoti vanno inclusi nell'inventario fornitori.

[Evidenza browser sanificata](evidence/2026-11-01/live-readonly-audit.json) · [Verifica mirata del consenso](evidence/2026-11-01/hosting-consent-audit.json). Nessun blocco di telemetria è stato inserito nel sito live o nell'app come sostituto della configurazione del provider.

## Checkout e SEO: limiti della verifica

La query/cartCreate, la validazione URL e gli handler d'acquisto sono invariati. La suite UX esistente verifica con API simulate doppio invio, errore/retry, quantità e navigazione nella stessa scheda. Non è stato creato un checkout live: presenza e completezza dei link legali nel footer del checkout Shopify devono essere confermate nel pannello e in un checkout sandbox autorizzato dopo l'approvazione delle altre policy. La pagina privacy ufficiale checkout è invece stata aperta e verificata direttamente.

`noindex` è applicato dall'hook SEO dopo il caricamento JavaScript. Non è un vero HTTP 404 o un header `X-Robots-Tag`: il fallback SPA dell'hosting può rispondere 200 anche per una route non pubblicata. Nessun contenuto di bozza esiste nel bundle e nessun link/sitemap viene aggiunto ai percorsi assenti. Prima del rilascio va approvata la strategia hosting HTTP 404/noindex e redirect server-side dell'alias, soprattutto per crawler senza JavaScript; nessuna modifica a hosting/backend fatta qui.

## QA ed evidenze

Build production, typecheck e lint mirato positivi. CI storefront estesa per includere i cinque file TS/TSX coinvolti nel lint. **339 test Node + 92 Deno PASS**, rete applicativa disabilitata nei test di dominio; **15 scenari della suite UX esistente PASS** con API simulate e rete esterna intercettata. Nessun ordine, pagamento o iscrizione reale.

Lint globale: 43 errori e 11 warning, **identici alla base main**, zero nuove segnalazioni. [Confronto lint](evidence/2026-11-01/lint-baseline-comparison.json). Non si dichiara verde un controllo globale che fallisce già nella baseline.

**6 gruppi browser dedicati PASS**, zero eccezioni JavaScript, zero violazioni axe su Contatti e footer. Controlli e screenshot: [indice evidenze](evidence/2026-11-01/README.md), [report browser](evidence/2026-11-01/footer-legal-browser-report.json). Verifica tastiera/focus, menu mobile e assenza overflow a 320/375/390/430/768/1440px, metadati, alias privacy, route assenti, axe su footer e contenuto Contatti desktop/mobile. Il confronto visivo tollera solo differenze minime di rasterizzazione delle fotografie, esplicitate nel report; nessuna promessa di audit WCAG completo. Webfont remoti bloccati nei test sintetici. Safari/iOS reale e screen reader non disponibili in questa sessione e restano da validare.

## Operazioni ancora necessarie in Shopify e presso il fornitore

1. Marco/referente legale: approvare testi di termini, spedizioni e resi; verificare eventuali documenti WordPress recuperati prima di considerarli fonti.
2. Shopify → Impostazioni → Informative: inserire soltanto testi approvati, verificare lingua italiana, date, URL e visibilità nel checkout. Nessuna scrittura eseguita da questo lavoro.
3. Confermare dati societari pubblicabili (ragione sociale, P. IVA, sede e altri recapiti richiesti), senza riutilizzare indirizzi trovati in fonti non approvate.
4. Verificare la Privacy Policy esistente rispetto a responsabile/titolare, fornitori e trattamenti effettivi, senza riscriverla nel frontend.
5. Hosting/Shopify → impostazioni privacy/analytics/customer events: censire script e app, stabilire consenso/rifiuto/revoca e blocco preventivo dove necessario; sottoporre una proposta CMP a Marco prima di installarla.
6. Collaudo finale in ambiente autorizzato: nuovi visitatori, rifiuto, accettazione, revoca, account/carrello, footer checkout e link policy, Safari/iOS, comportamento HTTP/SEO.

[Checklist cliente](CLIENT-LEGAL-PUBLICATION-CHECKLIST.md). Stato release: **non pubblicabile come storefront legalmente completo finché i gate restano aperti**.
