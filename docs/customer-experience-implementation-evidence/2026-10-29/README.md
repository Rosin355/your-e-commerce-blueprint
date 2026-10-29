# Fase 8 — evidenze dell’implementazione, 29 ottobre 2026

**READY FOR REVIEW.** Screenshot dell’applicazione React: baseline `aa7e6ae` e implementazione sul branch `codex/customer-experience-implementation`. Non sono i mockup della proposta.

Stesso dataset sintetico, browser Chrome 156, viewport, reduced motion e traffico esterno intercettato prima/dopo. Le foto sono asset locali Online Garden; i prodotti di prova, ripetuti intenzionalmente, non sono in vendita. Il primo prodotto ha due formati da 19,90/29,90 EUR; il terzo è indisponibile. Font e logo remoti esclusi in entrambe le acquisizioni. Nessun acquisto reale.

## Confronti

[Apri il confronto affiancato](comparison.html).

| Pagina e viewport | Baseline | Implementazione | Intera pagina |
| --- | --- | --- | --- |
| Homepage desktop 1440×900 | [Prima](before/home-1440.png) | [Dopo](after/home-1440.png) | [Prima intera](before/home-1440-full.png) · [Dopo intera](after/home-1440-full.png) |
| Homepage mobile 390×900 | [Prima](before/home-390.png) | [Dopo](after/home-390.png) | [Prima intera](before/home-390-full.png) · [Dopo intera](after/home-390-full.png) |
| Catalogo desktop 1440×900 | [Prima](before/catalogo-1440.png) | [Dopo](after/catalogo-1440.png) | [Prima intera](before/catalogo-1440-full.png) · [Dopo intera](after/catalogo-1440-full.png) |
| Catalogo mobile 390×900 | [Prima](before/catalogo-390.png) | [Dopo](after/catalogo-390.png) | [Prima intera](before/catalogo-390-full.png) · [Dopo intera](after/catalogo-390-full.png) |
| PDP desktop 1440×900 | [Prima](before/pdp-1440.png) | [Dopo](after/pdp-1440.png) | [Prima intera](before/pdp-1440-full.png) · [Dopo intera](after/pdp-1440-full.png) |
| PDP mobile 390×900 | [Prima](before/pdp-390.png) | [Dopo](after/pdp-390.png) | [Prima intera](before/pdp-390-full.png) · [Dopo intera](after/pdp-390-full.png) |

## Dati e verifiche

- [Riepilogo QA](qa-summary.json), [coordinate prima/dopo](comparison-metrics.json), [integrità e contratti](integrity.json), [PR verificata](pr-verification.json).
- `before/report.json`, `after/report.json`: coordinate documentali e controlli della variante in PDP, acquisiti con `scripts/ux-audit/customer-experience.mjs`.
- `responsive/report.json`: 15 scenari della suite esistente; screenshot a 320/375/390/430/768/1440 × 900.
- `accessibility/report.json`: 10 scenari aggiuntivi, target touch header/PDP/chiusura zoom, focus, ARIA, dimensioni gallery prima/dopo il caricamento, prezzi/intervalli e contrasto errore checkout. La misura del target chiusura attende il termine dell’animazione Radix esistente.
- `production-scalability`, `production-safe-fixes`, `production-integration`: 6+4+3 scenari sulle risorse della build production. Catalogo completo fino a 10.000 prodotti, 205 varianti, metadati, prodotti test nascosti, filtri/sort globali, cancellazione e retry. Anche viewport 320×568, 375×812, 390×844, 430×932.
- `logs`: typecheck, lint frontend, lint test TS, build, 339 test Node + 92 Deno, packaging invariato.

Le misure y indicano distanza dall’inizio del documento; nella home `firstProduct` è il link immagine e nel catalogo è l’articolo. La CTA riportata è quella nel flusso, distinta dalla barra fixed. L’altezza di 900px non è una misura del fold su tutti i dispositivi. Il valore `gallery: null` della sonda comparativa non viene usato: le dimensioni della gallery sono misurate separatamente nella suite accessibilità.

Le prove non certificano WCAG completa, esperienza con un lettore di schermo reale, Safari, stock/valuta live, webfont remoti, velocità Shopify, SEO pubblicata o pagamenti. Nessuna stima di aumento conversioni.
