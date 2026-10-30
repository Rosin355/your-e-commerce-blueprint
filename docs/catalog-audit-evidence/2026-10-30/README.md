# Evidenze catalogo — 30 ottobre 2026

Letture pubbliche Storefront, intervallo e versione API in `summary.json`. Solo prodotti/varianti/collezioni, nessun dato cliente, prezzo, inventario o credenziale esportati. I CSV costituiscono una fotografia pubblica, non il catalogo Shopify Admin completo.

- `products-collections.csv`: 1.348 righe Product GID, comprese le due escluse dall’app; membership osservate, non classificazioni approvate.
- `variants-sku.csv`: 1.376 righe Variant GID/SKU esatto. UUID Supabase e parent canonico restano non verificati; nessuno SKU parent dedotto da suffissi.
- `collections.csv`: 55 collezioni pubbliche; include tutte le 23 canoniche, i 18 handle reali di menu e le cinque obsolete documentate. `/collections/all` è virtuale e ha il totale in summary.
- `summary.json`: conteggi, limiti, accessi e SHA-256 dei CSV. Le metriche applicative escludono soltanto i due ID test previsti dal codice.

Le 1.961 coppie Product GID/collection handle lette da product.collections coincidono con quelle lette da collection.products. Tutte le connection prodotti, varianti e collezioni sono state paginate fino a hasNextPage=false; nessun cap assunto come totale. Il preflight pubblico iniziale è una query aggiuntiva alle 74 query del censimento. Nessuna mutation, chiamata Edge, AI o SQL live.

I payload JSON completi, ridondanti rispetto ai CSV, rimangono fuori dal branch in `/private/tmp/og-catalog-live-snapshot.json`. Non sono stati pubblicati dump di ambiente o header di autenticazione. I CSV non sono input approvati per importazioni o assegnazioni automatiche.

`read-only-queries.graphql` conserva le query pubbliche senza header/token; `validation.json` riporta i 195 test Node e 92 Deno eseguiti offline. Le credenziali e le liste di altri progetti Supabase non sono esportate.
