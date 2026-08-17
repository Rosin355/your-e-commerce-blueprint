# FASE H/I — Mapping legacy e Bulbi · DOCUMENTO PREPARATO, NON APPLICATO

Nessuna riga è stata inserita nel database. Nessun prodotto riclassificato.

## H1 — Mapping iniziali relativamente sicuri (stato: `proposed`)

| Categoria sorgente | Target | stable_key |
|---|---|---|
| Alberi | Piante da Esterno > Alberi | `esterno.alberi` |
| Arbusti | Piante da Esterno > Arbusti | `esterno.arbusti` |
| Conifere | Piante da Esterno > Conifere | `esterno.conifere` |
| Piante da siepe | Piante da Esterno > Siepi | `esterno.siepi` |
| Rampicanti | Rampicanti | `rampicanti` |
| Erbacee-perenni-graminacee | Erbacee e Graminacee | `erbacee` |
| Aromatiche | Aromatiche | `aromatiche` |
| Piante grasse e succulente | Grasse e Succulente | `succulente` |
| Alberi da frutto | Piante da Frutto > Alberi da Frutto | `frutto.alberi` |
| Piccoli frutti | Piante da Frutto > Piccoli Frutti | `frutto.piccoli` |
| Rose rampicanti | Rose > Rose Rampicanti | `rose.rampicanti` |
| Rose paesaggistiche | Rose > Rose Paesaggistiche | `rose.paesaggistiche` |
| Rose a cespuglio | Rose > Rose a Cespuglio | `rose.cespuglio` |
| Rose fiore grande | Rose > Rose a Fiore Grande | `rose.fiore_grande` |

Anche questi restano `proposed`: nessuna approvazione automatica.

## H2 — Mapping ambigui (stato: `ambiguous`, mai applicati in automatico)

| Sorgente | Problema | Nota |
|---|---|---|
| Sempreverdi | Caratteristica, non categoria | probabile tag/attributo |
| Rampicanti-arbusti-spalliera | Categoria mista (2 rami) | richiede revisione per SKU |
| Rose profumate | Caratteristica di prodotto | probabile tag/metafield, non categoria |
| Categorie fuori elenco | Sconosciute | classificazione manuale |
| Prodotti con più categorie discordanti | Conflitto | scelta manuale della categoria primaria |

## I — Bulbi: matrice di classificazione

La tipologia botanica **non viene mai sostituita** dalla stagione: resta un dato
separato (`bulbi_classification_matrix.botanical_type`) utilizzabile come
tipologia botanica, filtro, tag, metafield e dato sorgente visibile in Admin.

Colonne della matrice: `sku`, `product_name`, `botanical_type`, `proposed_season`,
`proposal_source`, `confidence`, `review_status`, `manual_override`,
`approved_by` / `approved_at`, `notes`.

Orientamento indicativo (da verificare, **non** vincolante e **non** applicato):

| Tipologia botanica | Stagione ipotizzata | Stato |
|---|---|---|
| Tulipani | primaverile | da verificare |
| Iris | primaverile | da verificare |
| Fresie | primaverile | da verificare |
| Gigli | estiva | da verificare |
| Gladioli | estiva | da verificare |
| Hemerocallis | estiva | da verificare |
| Gloriosa | estiva | da verificare |
| Amaryllis | ambiguo (forzatura invernale) | da verificare |
| Dalie | estiva/autunnale | ambiguo, da verificare |

Regole: nessuna classificazione AI viene applicata o pubblicata automaticamente;
una proposta AI resta separata (`proposal_source = 'ai'`, `review_status = 'da_verificare'`)
e richiede accettazione manuale.

## Spedizioni

Pesi, dimensioni e classi di spedizione restano dati sorgente conservati e
visibili in Admin, esclusi dall'AI, non sincronizzati, senza modifiche a
tariffe, checkout o profili di spedizione Shopify.
