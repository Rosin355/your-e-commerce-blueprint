# Evidenze Customer Experience — 28 ottobre 2026

Baseline applicativa: `aa7e6aeb9aa0eafc01f655976f342733562bb824`, Draft PR #39. Questa cartella è nuova; le evidenze storiche già contenute nella PR restano separate e non sono state sovrascritte.

## File e interpretazione

- `report.json`: nuova esecuzione della suite UX già presente nella PR, 15 PASS/0 FAIL e nessuna eccezione JavaScript non gestita. Le sei verifiche responsive attraversano home, catalogo, ricerca, collezione, PDP e carrello. Gli altri scenari provano errori/retry, checkout simulato, varianti, persistenza, tastiera e paginazione.
- `home-*`, `catalogo-*`, `ricerca-*`, `collezione-*`, `pdp-*`, `carrello-*`: screenshot viewport della suite a 320/375/390/430/768/1440 × 900. Quelli di errore e tastiera corrispondono agli scenari del report. Non tutte le catture della suite attendono le immagini o le card collezione: usare `audit-*` per l'analisi stabilizzata.
- `observations.json`: sonda aggiuntiva su 390/1440px, coordinate documentali, confronto sort, stato semantico formato, card con prezzi diversi e stile computato errore checkout. Zero eccezioni JS. `firstProduct` in homepage indica il link immagine della prima ProductCard, non gli articoli del journal.
- `audit-*`: acquisizioni complete di home/catalogo/collezione/PDP; dettagli viewport di acquisto, carrello, menu aperto e messaggio errore checkout. Il menu viene catturato dopo il termine dell'animazione.
- `preview-qa.json`: controlli della **proposta**, separati dall'app. 18 combinazioni: tre pagine × due modalità × tre larghezze host (1024/390/320); stato pagina/modalità, overflow, immagini risolte, CTA acquisto disabilitate e assenza eccezioni JS. Menu/filtri dimostrativi controllati anche localmente.
- `proposta-*.png`: sei viste concettuali dell'anteprima. I dati prodotto sono segnaposto e le foto provengono dal repository; non sono schermate del negozio aggiornato.
- `git-baseline.json`: metadati Git/PR riletti, senza credenziali o contenuto `.env`.
- `safety.json`: confronto hash/stato dell'originale e differenze della copia isolata rispetto alla baseline. I documenti di stato conservano il testo precedente integralmente.
- `cx-probe.mjs`, `preview-qa.mjs`: sonde dell'audit, fuori dal codice applicativo, con percorsi dell'ambiente di esecuzione. Il wrapper di verifica dell'anteprima è temporaneo e non è un sito pubblicato.

## Condizioni del laboratorio

Chrome headless, reduced motion, dev server locale in copia isolata. Il traffico esterno applicativo è intercettato dalla fixture esistente: Shopify, Supabase, checkout, font Google e logo remoto non raggiungono i servizi reali. Sono visibili le fotografie locali; la tipografia usa i fallback. Nessun cliente, ordine o prodotto reale è stato usato.

I badge `[DEV]` collezione non sono difetti produzione. Gli errori di checkout sono generati dalla fixture. Le immagini uguali tra prodotti sono intenzionali nel dataset di prova e non dimostrano duplicati nel catalogo reale.

Il browser misura lo stato renderizzato locale; non certifica WCAG completa, webfont live, prestazioni di rete Shopify, indicizzazione, pagamenti o disponibilità reali. Build, lint, test Node/Deno e benchmark 10k della PR non sono stati ripetuti in questa fase documentale.

## Riproduzione della suite esistente

Da una copia isolata della baseline PR con dipendenze già disponibili, senza installarne di nuove:

```sh
npm run dev -- --host 127.0.0.1 --port 8097 --strictPort
```

In un altro terminale, con `PLAYWRIGHT_MODULE` impostato al modulo già disponibile se non risolvibile normalmente:

```sh
UX_BASE_URL=http://127.0.0.1:8097 UX_OUTPUT_DIR=/private/tmp/online-garden-cx-repeat node scripts/ux-audit/run.mjs
```

La ripetizione usa una cartella di output diversa per preservare questa evidenza. Nel run consegnato è stato usato un `cacheDir` Vite separato tramite `createServer`, riutilizzando le dipendenze locali. Il server è destinato esclusivamente al browser di test con intercettazione: non aprirlo come prova di servizi live.

Le sonde aggiuntive documentano i controlli effettuati e i percorsi locali; adattare modulo Playwright, root baseline e output prima di riutilizzarle in un altro ambiente. Per la proposta, usare il renderer della skill visualize e lo scope iframe riportato nella sonda, senza pubblicare o collegare Shopify.

## Indice visivo consigliato

| Superficie | Mobile | Desktop |
| --- | --- | --- |
| Homepage | [390px](home-390.png) | [1440px](home-1440.png) |
| Catalogo | [390px](catalogo-390.png) | [1440px](catalogo-1440.png) |
| Collezione | [390px, completa](audit-collezione-390.png) | [1440px, completa](audit-collezione-1440.png) |
| PDP | [390px](pdp-390.png) | [1440px](pdp-1440.png) |
| Ricerca | [390px](ricerca-390.png) | [1440px](ricerca-1440.png) |
| Carrello | [390px](carrello-390.png) | [1440px](carrello-1440.png) |
| Menu | [390px aperto](audit-menu-390.png) | Non oggetto di un nuovo screenshot dedicato del mega-menu |

Altre evidenze: [formato e acquisto mobile](audit-pdp-acquisto-390.png), [errore checkout](audit-errore-checkout-390.png), [misure](observations.json), [audit completo](../../CUSTOMER-EXPERIENCE-AUDIT.md).
