# Sicurezza residua + checkout — 21/11/2026

## Checkout («Creazione checkout…»)
- cartCreate Storefront: HTTP 200, nessun userError, checkoutUrl valido (variante Dalia Purple Queen, €5,00).
- Anteprima locale e produzione (onlinegarden.it): il checkout Shopify si apre e mostra il riepilogo (nessun pagamento/ordine).
- Causa confermata nel codice: dentro la finestra di anteprima dell'editor (iframe) il checkout veniva aperto nella stessa cornice, che Shopify rifiuta → l'utente restava sul carrello. Il blocco osservato in precedenza non si è riprodotto fuori dall'iframe (timeout richiesta 20s già presente).
- Fix minimo `src/components/CartDrawer.tsx`: in iframe apre il checkout in una nuova scheda, altrimenti stessa scheda (comportamento sito invariato). Verificato con test in iframe.

## Avviso 1 — campi update_product
- Confermato: `shopify-admin-proxy` inoltrava a Shopify ogni campo non rimosso.
- Fix: `sanitizeProductUpdatePayload` (allowlist: title, body_html, vendor, product_type, tags, variants sku/price/compare_at_price/inventory_quantity, immagini https, SEO title/description). Status, pubblicazione, handle, template, opzioni scartati. Funzioni legittime di AI writer e import preservate.
- Codice non distribuito: richiede deploy autorizzato di `shopify-admin-proxy`.

## Avviso 2 — email nei log clienti
- Falso positivo sul codice attuale (scansione su versione precedente): lo strumento è solo offline e non stampa email. Aggiunto test di non regressione con dati sintetici (`sync/tests/customer-log-redaction.test.mjs`).

## Test
- admin-proxy-payloads 5/5, clienti 49/49, customer-auth 20/20, suite scripts 653 PASS; 5 file falliscono per import `jsr:` non supportati da Node (preesistente, non correlato).
- Nessun deploy, SQL, Publish, modifica prodotti/clienti/prezzi/inventario.

## Stato
GO per Publish frontend lato checkout. Backend: fix allowlist pronto, in attesa di deploy autorizzato di `shopify-admin-proxy`.

## Rilascio 21/11/2026 ~12:00 UTC
- Commit verificato: `c8d7237` (codice); HEAD `07d3623` differisce solo per documentazione.
- Deploy solo `shopify-admin-proxy`: source SHA-256 `8d86d25264f78f6faa2cecf2345ace7e627ce3620d45dbba2d26895836d26ee0` (ID deployment runtime non esposto dallo strumento).
- Post-deploy: OPTIONS 200; senza token rifiutato (risposta 500 "Missing or invalid Authorization header", comportamento preesistente, nessun dato); chiave pubblica 401; sessione Admin: letture catalogo 200, update con ID non valido respinto senza scrittura.
- Publish frontend: asset `index-DQT9047V.js` su onlinegarden.it. Home, catalogo, area clienti Shopify (login), accesso Admin, carrello e checkout Shopify verificati (nessun pagamento). Nessun errore pagina.
- Scan rapido: 0 critical/warning, 1 info Storage (immagini pubbliche, voluto). Deep scan avviato sul commit distribuito.
