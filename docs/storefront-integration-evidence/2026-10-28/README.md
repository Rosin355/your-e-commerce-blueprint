# Evidenze Fase 5 — 28 ottobre 2026

Base main `0d1bf639d7fb0c8cd5c47b2dc222ea86c5b1bab3`; port selettivo da `e6da421`, `0d028eb`, `7a7ed51`. Dati esclusivamente sintetici; nessuna scrittura Shopify/Supabase o verifica di produzione.

- `classification.json`: classificazione individuale dei 98 percorsi modificati dai tre commit sorgente e decisioni per funzionalità.
- `safety.json`, `original-18-hashes.json`: confini architetturali e protezione del lavoro originale.
- `baseline-*`, `source-*`, `integrated-*`: output QA dei tre alberi. Baseline Node e Deno eseguite separatamente, come sul ramo integrato.
- `*-report.json`: browser, tutte le verifiche finali PASS; responsive UX su dev, scale/safe/integration su production.
- `performance-compare-main.json`, `performance-summary.json`: 18 misure production, tre ripetizioni alternate per build/volume, ritardo sintetico 20 ms/pagina.
- Due PNG: verifica visiva sintetica a 320 px; font e host esterni intercettati. Le altre catture locali sono in `/private/tmp/online-garden-phase5/browser-ux`.

Riproduzione: [istruzioni e limiti](../../../scripts/ux-audit/README.md) nel repository (percorso dalla root: `scripts/ux-audit/README.md`). Il benchmark non è LCP, trasferimento immagini, SLA Shopify o p95. Gzip stimato offline. Nessuna prova di indicizzazione o pagamento reale.

Gli output testuali hanno soltanto spazi finali e righe vuote finali normalizzati per il controllo Git whitespace; i log originali sono conservati in `/private/tmp/online-garden-phase5`.
