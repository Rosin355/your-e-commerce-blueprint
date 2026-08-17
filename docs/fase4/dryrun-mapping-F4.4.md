# F4.4 — DRY-RUN MAPPING CATEGORIE LEGACY (solo proposta)

Stato: **nessuna riga scritta** in `product_category_source_map`,
`product_category_assignments`, `product_category_shopify_map`,
`bulbi_classification_matrix`. Nessuna collezione Shopify toccata.

Sorgente read-only: `product_sync_csv_products.product_category` (2.706 righe).
Un valore può contenere più percorsi separati da virgola → mapping molti-a-molti.

## Distribuzione sorgente

| Percorso sorgente | Righe | Proposta (stato `proposed`) |
|---|---:|---|
| (vuoto) | 1.647 | `unmapped` |
| Piante da Esterno > Arbusti | 467 | `piante-da-esterno.arbusti` |
| Piante da Frutto | 126 | `piante-da-frutto` (root) |
| Piante da Esterno > Arbusti, Piante da Esterno > Siepi | 87 | arbusti (primary) + siepi (secondary) |
| Rose | 78 | `rose` (root) |
| Piante da Esterno > Conifere | 67 | `piante-da-esterno.conifere` |
| Piante da Interno > Piante da Appartamento | 45 | **ambiguo** — nessuna categoria "Interno" in tassonomia 2026-v1 |
| Erbacee Perenni e Graminacee | 38 | `erbacee-graminacee` |
| Rampicanti e Arbusti a Spalliera | 37 | **ambiguo** — `rampicanti` vs `piante-da-esterno.arbusti` |
| Piante da Interno > Piante Grasse e Succulente | 32 | `grasse-succulente` (needs_review: prefisso Interno) |
| Piante da Esterno > Alberi | 30 | `piante-da-esterno.alberi` |
| Aromatiche | 8 | `aromatiche` |
| combinazioni miste (≤8 righe ciascuna) | 34 | split per percorso, `secondary` per il secondo |
| Piante da Interno > Orchidee / Bonsai / Piante da Interno | 4 | **ambiguo** |
| Piante Acquatiche > Piante Palustri | 1 | **ambiguo** |
| Uncategorized | 1 | `unmapped` |

## Mapping relativamente sicuri (comunque `proposed`, mai `approved`)

Alberi, Arbusti, Conifere, Siepi → `piante-da-esterno.*`;
Rampicanti → `rampicanti`; Erbacee Perenni e Graminacee → `erbacee-graminacee`;
Aromatiche → `aromatiche`; Piante grasse e succulente → `grasse-succulente`;
Alberi da frutto → `piante-da-frutto.alberi`; Piccoli frutti → `piante-da-frutto.piccoli-frutti`;
Rose rampicanti / paesaggistiche / a cespuglio / fiore grande → `rose.*`.

## Ambigui (revisione manuale obbligatoria)

- Sempreverdi (non presente nella sorgente attuale, previsto nei CSV Bulbi).
- Rampicanti e Arbusti a Spalliera (37 righe).
- Rose profumate (attributo, non categoria).
- Tutto il ramo "Piante da Interno" (50 righe): la tassonomia 2026-v1 non lo prevede.
- Piante Acquatiche > Piante Palustri (1 riga).
- Prodotti con percorsi discordanti nella stessa riga.

## Bulbi

Nessuna conversione automatica specie → stagione. Tulipani, Iris, Dalie, Gigli,
Hemerocallis, Gladioli, Fresie, Amaryllis e Gloriosa restano conservati come
`botanical_type`; la matrice reale `bulbi_classification_matrix` **non è popolata**
(0 righe) e ogni proposta futura nascerà come `proposed` / `needs_review`.

## Sottocategorie Rose

La sorgente attuale espone solo la root `Rose` (78 righe): le cinque sottocategorie
Rose non sono derivabili dal CSV e richiedono una fonte aggiuntiva o revisione manuale.
