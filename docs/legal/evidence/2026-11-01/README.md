# Evidenze footer e policy — 1 novembre 2026

Baseline: `main` `b5cbe57aa1f7e674ce7caca106d359f8977c800a`. Dopo: branch `codex/storefront-footer-legal`. Screenshot sintetici da build production, stessi dati e viewport, Chrome headless; immagini prodotto locali ripetute intenzionalmente, API simulate, rete esterna intercettata. Nessun prezzo/stock sintetico è una promessa commerciale. Font remoti non caricati nei test offline. Le due immagini `live-*` sono invece fotografie dello stato pubblico precedente, raccolte in sola lettura senza modificare il sito.

## Confronti prima/dopo

| Vista | Prima | Dopo |
| --- | --- | --- |
| Footer desktop 1440 | [Prima](before-footer-1440.png) | [Dopo](after-footer-1440.png) |
| Footer mobile 390 | [Prima](before-footer-390.png) | [Dopo](after-footer-390.png) |
| Homepage desktop | [Prima](before-home-1440.png) | [Dopo](after-home-1440.png) |
| Homepage mobile | [Prima](before-home-390.png) | [Dopo](after-home-390.png) |
| Catalogo desktop | [Prima](before-catalog-1440.png) | [Dopo](after-catalog-1440.png) |
| Catalogo mobile | [Prima](before-catalog-390.png) | [Dopo](after-catalog-390.png) |
| PDP desktop | [Prima](before-pdp-1440.png) | [Dopo](after-pdp-1440.png) |
| PDP mobile | [Prima](before-pdp-390.png) | [Dopo](after-pdp-390.png) |
| Nuova pagina Contatti | — | [Desktop](after-contacts-1440.png) · [Mobile](after-contacts-390.png) |

Preservati i sorgenti di header/home/catalogo/PDP. Il confronto delle sei schermate sopra il footer ha **zero pixel con variazione significativa** secondo la tolleranza del test: delta per canale >24/255, massimo consentito 0,1% dei pixel. Gli hash PNG non sono necessariamente uguali: Chrome può ricampionare le fotografie in modo leggermente diverso tra contesti. Il footer cambia intenzionalmente eliminando i gruppi inattivi.

## Risultati

- Build, typecheck, lint dei cinque file TS/TSX coinvolti: PASS. La CI esistente è estesa per includere questi file nel lint.
- 339 Node + 92 Deno: PASS, runner nativi con guard rete e lock frozen.
- Suite UX esistente: **15 PASS**, zero pageerror. [Report](storefront-ux-regression-report.json). Doppio checkout, errore/retry, quantità e navigazione simulati, nessuna mutation live.
- Suite footer/legal: **6 gruppi PASS**, zero pageerror. [Report completo](footer-legal-browser-report.json).
- Contatti/menu mobile/assenza overflow a 320/375/390/430/768/1440px; ordine Tab, focus visibile e Invio su Contatti; privacy href e alias esatti; quattro policy assenti senza link e `noindex` nel DOM; ritorno a homepage ripristina SEO.
- axe su `main` Contatti + footer a 390 e 1440: **zero violazioni**, incluso controllo automatico contrasto. Non è una certificazione WCAG completa o una prova con screen reader.
- Lint globale: **43 errori e 11 warning**, identici a main, zero nuove segnalazioni. [Confronto](lint-baseline-comparison.json). Errori estranei allo scope non corretti qui.
- Safari/iOS reale: non disponibile nella sessione; non dichiarato verificato tramite emulazione Chromium.
- HTTP 404/noindex server-side, checkout Shopify completo, consegna email e consenso rifiuto/accettazione/revoca live: gate aperti, non simulati come superati.

## Audit live in sola lettura

[Shopify: presenza policy e email](shopify-readonly-summary.json) · [Rete/script/cookie e categorie](live-readonly-audit.json) · [Consenso hosting](hosting-consent-audit.json) · [Homepage live desktop](live-home-desktop.png) · [Homepage live mobile](live-home-mobile.png).

La Privacy Policy ufficiale restituisce HTTP 200 in italiano. Le cinque categorie del footer caricano contenuti reali. Il browser nuovo visitatore rileva script hosting e tentativo POST `/__l5e/trackevents` prima del consenso. Il guard del test blocca tutte le POST non di lettura, telemetria compresa: **tentativi osservati, ricezione eventi non provata**. Registrati solo nomi cookie/storage, attributi script e chiavi strutturali payload, senza valori sensibili. Non modificata alcuna impostazione hosting/Shopify/Supabase.

## Riproduzione locale

Dipendenze progetto: `npm ci --ignore-scripts --no-audit --no-fund`. Playwright e `@axe-core/playwright` sono installati fuori dal progetto in una cartella temporanea; nessuna modifica package/lock. Necessari Chrome, Python 3 e Pillow con `get_flattened_data` per il confronto PNG.

1. Costruire main `b5cbe57` in una directory isolata e servirne `dist` a `http://127.0.0.1:8085` con Vite preview.
2. Costruire il branch e servirne `dist` a `http://127.0.0.1:8086`. Le fixture usano l'asset `rose-C0q0uc8j.jpg` presente in entrambe le build.
3. Eseguire dalla root del branch, impostando i percorsi reali delle librerie di test:

```sh
npm run typecheck
npx --no-install eslint src/App.tsx src/components/Footer.tsx src/config/legal.ts src/pages/Contacts.tsx src/pages/PrivacyPolicy.tsx
npm run build
node ci/run-domain.mjs node
node ci/run-domain.mjs deno ci/deno-ci.lock
PLAYWRIGHT_MODULE=/percorso/playwright/index.mjs AXE_PLAYWRIGHT_MODULE=/percorso/@axe-core/playwright/dist/index.mjs FOOTER_BEFORE_URL=http://127.0.0.1:8085 UX_BASE_URL=http://127.0.0.1:8086 UX_OUTPUT_DIR=/tmp/footer-legal-qa node scripts/ux-audit/footer-legal.mjs
```

La suite UX esistente richiede invece il server dev per le verifiche del cartStore: vedere [istruzioni](../../../../scripts/ux-audit/README.md). Non usare carrelli o ordini reali per replicare i test sintetici.
