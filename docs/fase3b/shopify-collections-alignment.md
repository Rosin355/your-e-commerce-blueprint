# Allineamento collection Shopify alla navigazione (10/10/2026)

Fonte unica: `src/config/categories.ts` (23 handle di collection; `all` è la pagina "Tutti i prodotti").
Legacy `setup-collections` non usata. Nessuna collection cancellata o rinominata.

- Collection canoniche: 23, tutte già esistenti (custom). Create: 0.
- Pubblicate su Online Store + Headless le 4 che non lo erano: piante-da-siepe, piante-grasse-succulente, rose-paesaggistiche, rose-fiore-grande.
- Famiglie Shopify (3B.2): 903. Assegnate: 821 (732 categoria singola, 89 multi-categoria tutte mappabili).
- NEEDS_REVIEW: 82 (81 "Piante da Interno …", 1 con "Piante Palustri"). Non assegnate.
- Varianti coperte via parent: 847 (le varianti seguono il prodotto Shopify).

Regole di mapping (solo categoria WordPress esatta, nessuna deduzione da titolo/descrizione/AI):

| Categoria raw | Collection |
|---|---|
| Piante da Esterno > Arbusti | arbusti + piante-da-esterno |
| Piante da Esterno > Alberi | alberi + piante-da-esterno |
| Piante da Esterno > Siepi | piante-da-siepe + piante-da-esterno |
| Piante da Esterno > Conifere | conifere |
| Erbacee Perenni e Graminacee | erbacee-perenni-graminacee + piante-da-esterno |
| Rampicanti e Arbusti a Spalliera | rampicanti-arbusti-spalliera + piante-da-esterno |
| Aromatiche | aromatiche + piante-da-esterno |
| Piante da Frutto | piante-da-frutto (nessuna sottocategoria inventata) |
| Rose | rose (nessuna sottocategoria inventata) |

Esecuzione: azione `assign_canonical_collections` in `shopify-admin-proxy` (solo aggiunta, allowlist handle canonici, solo collection custom, dry-run di default).
Collection obsolete mantenute ma fuori dal menu: agrumi, varieta-da-terrazzo, fioriture-stagionali, idee-regalo, balconi-e-terrazze.
Verifica: 10 prodotti a campione con stato e data di ultima modifica invariati (ultima modifica 4–5/10).
