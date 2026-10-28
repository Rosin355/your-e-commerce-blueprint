# Online Garden — roadmap storefront integrata

28 ottobre 2026. Stato del nuovo ramo da main `0d1bf63`; le roadmap/audit completi del vecchio ramo restano nella sua cronologia locale e non vengono sovrascritti.

## Cronologia e decisione d'integrazione

- `e6da421`: UX/accessibilità, rimozione dati sintetici commerciali, checkout protetto.
- `0d028eb`: catalogo/varianti con cursori, metadati per route.
- `7a7ed51`: payload catalogo ridotto, NotFound e JSON-LD descrittivo.
- Main 10 ottobre/`0d1bf63`: header compatto, discovery canonica, homepage/correlati deterministici, ID test esclusi, Admin/sync evoluti. Questi contratti sono la base mantenuta.
- 28 ottobre: port manuale selettivo sul nuovo branch; esclusi antenati Admin/migration, adattata la ricerca alla semantica attuale di main. Nessun merge/cherry-pick o rilascio.

## Completato localmente

- Catalogo completo senza cap, errore/retry e abort; ricerca locale che conserva titolo/categorie/descrizione/handle/vendor/tag/tipo, filtri e sort globali. Query successive senza nuovo download.
- Varianti complete e prima disponibile, collezioni paginate, prodotti test nascosti anche su PDP diretta.
- Checkout stessa scheda/URL fresco, lock/quantità/retry; nessuna mutation commerciale aggiunta.
- A11y: focus/skip link, zoom dialog, pausa hero, viewport compatti; design mobile e selettori main preservati.
- Metadata/NotFound noindex e Product/BreadcrumbList descrittivi con cleanup. Nessuna informazione commerciale dedotta nel markup.
- QA: 428 test dominio nei due runtime, typecheck/lint/build, 28 scenari browser distinti, packaging Edge main. [Evidenze e limiti](STOREFRONT-MAIN-INTEGRATION.md).

## Prossimi gate e criteri

| Priorità | Attività | Criterio di accettazione / dipendenza |
| --- | --- | --- |
| P1 prima del lancio | Validazione Shopify/checkout staging | Query/varianti/disponibilità/valuta coerenti, errori/warnings e checkout sandbox autorizzato; nessun ordine reale. |
| P1 prima del lancio | SEO pubblica/HTTP | Dominio approvato, HTML crawler con dati pronti, canonical, veri status HTTP, regole sitemap confermate. Noindex DOM non è HTTP 404. |
| P1 commerciale | Policy, pagamenti, consegne | Dati/URL approvati dal referente; nessun fallback commerciale inventato. |
| P2 da progettare | Risultati progressivi | Faccette/conteggi/sort globali e semantica main dimostrati equivalenti; niente limite 1.000. Misure reali oltre alle fixture. |
| P2 da valutare | Discovery membership / best | Verificare risorse con >50 collezioni e definire ranking vendite; mantenuto il fallback main senza dati generati. |
| P2 QA | Script npm misto Node/Deno | Proposta separata per usare il runner corretto nello script/CI; tutti i file già eseguiti localmente senza disabilitazioni. |
| Approvazione tecnica | Pin API/SSR/prerender/indice | Compatibilità completa e ADR costi/complessità/rollback; nessuna infrastruttura introdotta in questa fase. |

**READY FOR PR locale ≠ pronto al lancio.** Nessun push, merge, PR, deploy o servizio live modificato. I gate precedenti rimangono aperti dove richiedono staging/decisioni del referente.
