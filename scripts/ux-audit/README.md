# QA storefront integrato — offline

Eseguire dalla root del nuovo worktree. Le suite intercettano tutti gli host esterni, Shopify/Supabase/checkout inclusi. Dati sintetici soltanto; nessun test di indicizzazione, stock reale o pagamento reale.

```sh
npm run typecheck
node scripts/ux-audit/domain.mjs
node scripts/test-edge-function-packaging.mjs
npm run build
npm run dev -- --host 127.0.0.1 --port 8082
```

`domain.mjs` esegue tutti i `scripts/tests/*.test.ts` con Node+tsx oppure Deno nativo in base all'uso di `Deno.test`. Deno ha solo read/env, nessun permesso rete applicativo; moduli JSR devono essere disponibili nella cache di sviluppo. Il comando npm di main globba anche i quattro file Deno e fallisce in Node: nessun test va disabilitato per aggirarlo. Richiesti Node e Deno.

Browser: Playwright già installato, Chrome disponibile. Se non presente nel progetto, indicare `PLAYWRIGHT_MODULE=/percorso/assoluto/playwright/index.mjs`; nessuna dipendenza nuova nel package. Definire `UX_BASE_URL` e `UX_OUTPUT_DIR` per ogni comando:

```sh
UX_BASE_URL=http://127.0.0.1:8082 node scripts/ux-audit/run.mjs
UX_BASE_URL=http://127.0.0.1:8082 node scripts/ux-audit/scalability.mjs
UX_BASE_URL=http://127.0.0.1:8082 node scripts/ux-audit/safe-fixes.mjs
UX_BASE_URL=http://127.0.0.1:8082 node scripts/ux-audit/integration.mjs
```

`run.mjs` legge anche lo stato del modulo cartStore per verificare lock/persistenza, quindi richiede dev. Le altre tre suite funzionano anche su `npm run preview -- --host 127.0.0.1 --port 4177` dopo build, come nella QA finale production.

`compare-main.mjs`: avviare separatamente le build production **committate** di main base (4176), sorgente (4178) e integrato (4177), senza includere file locali dirty. Variabili: `MAIN_BASE_URL`, `SOURCE_BASE_URL`, `UX_BASE_URL`, `UX_OUTPUT_DIR`. Misura 18 run (3 ripetizioni × 2 volumi × 3 build), prima card DOM, richieste, JSON e stima gzip. La baseline main restituisce solo 1.000: confrontare la copertura e byte/prodotto, non presentare le latenze come SLA a parità di risultato. Le immagini/font esterni sono bloccati e non misurati.

Le fixture proiettano i campi GraphQL selezionati, ma non validano lo schema remoto, tokenizzazione Shopify, throttle o prestazioni live. Ricerca main rimane locale; il piccolo evaluator delle query presenti nella fixture serve solo ai confronti del ramo storico.
