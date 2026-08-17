# F4.7 — Dry-run categorie con ereditarietà parent/variation (READ-ONLY)

Data: 2026-08-17 · Nessuna assegnazione creata · Nessun mapping approvato · Tassonomia non modificata

## 1. Copertura per tipo prodotto

| entity_type | Totale | Con categoria raw | Senza categoria raw |
|---|---:|---:|---:|
| simple | 404 | 92 | **312** |
| variable | 1.114 | 967 | **147** |
| variation | 1.188 | 0 | **1.188** |
| **Totale** | **2.706** | **1.059** | **1.647** |

## 2. Scomposizione delle 1.647 righe senza categoria

| Caso | Conteggio |
|---|---:|
| simple senza categoria | 312 |
| variable senza categoria | 147 |
| variation senza categoria propria | 1.188 |
| — di cui **variation il cui parent possiede categoria** | **1.035** |
| — di cui variation il cui parent NON possiede categoria | 153 |
| variation senza parent risolvibile | **0** |
| prodotti con categoria non riconosciuta dalla tassonomia 2026-v1 | 88 (vedi §4) |
| prodotti con categoria ambigua (multi-categoria) | 116 (vedi §3) |

### Categoria effettiva dopo ereditarietà

| Metrica | Valore |
|---|---:|
| Prodotti con categoria effettiva (propria o ereditata) | **2.094** (1.059 + 1.035) |
| **Prodotti realmente senza categoria dopo ereditarietà** | **612** (312 simple + 147 variable + 153 variation con parent scoperto) |

Regola di ereditarietà proposta:
- l'assegnazione canonica in `product_category_assignments` resta **solo sul parent**;
- per le variation si espone una `category_effective` **derivata a runtime** (view/campo calcolato), usata per visualizzazione e pubblicazione;
- nessuna duplicazione di riga di assegnazione;
- override sulla singola variation ammesso solo con `origin = 'manual'` e motivazione, quando esiste un'esigenza reale (oggi: 0 casi identificati).

## 3. Categorie raw uniche (28 valori distinti)

| Categoria raw | Prodotti | Esito proposto |
|---|---:|---|
| Piante da Esterno > Arbusti | 467 | mapping sicuro |
| Piante da Frutto | 126 | mapping sicuro |
| Piante da Esterno > Arbusti, Piante da Esterno > Siepi | 87 | **ambiguo** (multi) |
| Rose | 78 | **revisione** (sottocategoria non ricavabile) |
| Piante da Esterno > Conifere | 67 | mapping sicuro |
| Piante da Interno > Piante da Appartamento | 45 | **revisione** |
| Erbacee Perenni e Graminacee | 38 | mapping sicuro |
| Rampicanti e Arbusti a Spalliera | 37 | **revisione** |
| Piante da Interno > Piante Grasse e Succulente | 32 | **revisione** |
| Piante da Esterno > Alberi | 30 | mapping sicuro |
| Aromatiche | 8 | mapping sicuro |
| Piante da Frutto, Rampicanti e Arbusti a Spalliera | 8 | **ambiguo** |
| Piante da Esterno > Arbusti, Piante da Frutto | 7 | **ambiguo** |
| Piante da Esterno > Siepi, Rampicanti e Arbusti a Spalliera | 5 | **ambiguo** |
| Piante da Esterno > Alberi, Piante da Frutto | 3 | **ambiguo** |
| Piante da Esterno > Siepi, Piante da Esterno > Arbusti | 3 | **ambiguo** |
| Piante da Interno > Piante da Appartamento, Erbacee Perenni e Graminacee | 2 | **ambiguo** |
| Piante da Esterno > Alberi, Piante da Esterno > Siepi | 2 | **ambiguo** |
| Piante da Esterno > Conifere, Piante da Esterno > Siepi | 2 | **ambiguo** |
| Piante da Esterno > Arbusti, Rampicanti e Arbusti a Spalliera | 2 | **ambiguo** |
| Piante da Interno > Piante da Appartamento, Piante da Interno > Piante Grasse e Succulente | 2 | **ambiguo** |
| Piante da Interno > Orchidee | 2 | **revisione** |
| Erbacee Perenni e Graminacee, Piante Acquatiche > Piante Palustri | 1 | **ambiguo + revisione** |
| Aromatiche, Piante da Esterno > Arbusti | 1 | **ambiguo** |
| Rampicanti e Arbusti a Spalliera, Piante da Esterno > Siepi | 1 | **ambiguo** |
| Uncategorized | 1 | **revisione** |
| Piante da Interno | 1 | **revisione** |
| Piante da Interno > Bonsai | 1 | **revisione** |

| Sintesi | Valore |
|---|---:|
| Categorie raw uniche | 28 |
| Prodotti con mapping sicuro | 736 |
| Prodotti con categoria ambigua (multi-categoria) | 116 |
| Prodotti in revisione obbligatoria | 207 |

## 4. Casi da NON risolvere automaticamente

| Caso | Prodotti | Stato |
|---|---:|---|
| Piante da Interno (tutte le varianti) | 85 | revisione — nessuna categoria principale corrispondente in 2026-v1 |
| Rampicanti e Arbusti a Spalliera | 53 | revisione — collocazione da decidere |
| Piante Palustri | 1 | revisione |
| Uncategorized | 1 | revisione |
| Sempreverdi | 0 | non presente nel dato legacy |
| Rose (sottocategoria non ricavabile) | 78 | revisione |
| Rose Profumate | 0 categoria esplicita; 295 prodotti citano “profumat…” in titolo/descrizione | proposta, vedi §6 |
| Bulbi (categoria botanica → stagione) | 82 | revisione, vedi §7 |

## 5. Report “Piante da Interno”

| Sotto-livello | Prodotti |
|---|---:|
| Piante da Interno > Piante da Appartamento | 49 |
| Piante da Interno > Piante Grasse e Succulente | 34 |
| Piante da Interno > Orchidee | 2 |
| Piante da Interno > Bonsai | 1 |
| Piante da Interno (senza sottocategoria) | 1 |
| **Totale (con sovrapposizioni multi-categoria)** | **85** |

Dati botanici utili disponibili: `difficolta_di_coltivazione`, `periodo_di_fioritura`, `origini_e_habitat` (popolati solo su 25 prodotti con metafields).

Proposta futura (non applicata): mantenere questi 85 prodotti in un'area “Da classificare — Interno” dell'Admin, senza esporli nello storefront. **Non viene aggiunta alcuna nona categoria principale.** Impatto sul menu: nullo finché la decisione resta sospesa; se in futuro venisse creata la categoria principale “Piante da Interno” con 4 sottocategorie, il menu passerebbe da 8 a 9 voci principali — decisione riservata al cliente.

## 6. Report Rose

| Metrica | Valore |
|---|---:|
| Prodotti con categoria raw contenente “Rose” | 78 |
| Prodotti il cui titolo cita rosa/rose | 187 |
| Sottocategoria Rose ricavabile dal dato legacy | **0** |
| Prodotti con riferimento a profumo in titolo/descrizione | 295 |

La tassonomia 2026-v1 prevede sottocategorie Rose (incl. **Rose a Fiore Grande**), ma il dato legacy non contiene informazioni sufficienti per attribuirle. Tutti i 78 restano `needs_review` sulla categoria radice `rose`.

**Rose Profumate — proposta (non applicata):** trattarla come **caratteristica trasversale**, non come categoria. Opzioni valutate, in ordine di preferenza:
1. metafield booleano `rosa_profumata` (filtrabile, pubblicabile, compilazione manuale/editoriale);
2. tag `profumata` (semplice, ma meno strutturato);
3. filtro storefront derivato dal metafield.
Sconsigliato: sottocategoria dedicata, perché si sovrapporrebbe alle sottocategorie morfologiche. La rilevazione testuale (295 prodotti) è indicativa e **non va usata come compilazione automatica**.

## 7. Report Bulbi

| Metrica | Valore |
|---|---:|
| Prodotti riconosciuti come bulbi (titolo/handle) | **82** |
| Tutti classificati come | `simple` |
| Categoria raw presente | 0 |
| Stagione derivabile da dati affidabili | **0** |
| Righe inserite in `bulbi_classification_matrix` | **0** |

Dry-run per SKU proposto (solo struttura, nessuna riga reale):

| Campo | Valore proposto |
|---|---|
| `botanical_type` | genere estratto dal titolo (es. `Amaryllis`, `Tulipa`) — fonte: testo titolo |
| `proposed_season` | `NULL` — non derivabile da dati affidabili |
| `proposal_source` | `title_parsing` |
| `confidence` | 0.0–0.4 (bassa, solo identificazione botanica) |
| `review_status` | **`needs_review`** |

Nessuna AI usata. Nessuna stagione assegnata automaticamente. La categoria botanica è conservata; la stagione richiede input del cliente o una fonte anagrafica dedicata.

## 8. Verdetto F4.7

Ereditarietà parent→variation interpretata senza duplicazioni (1.035 variation coperte, 0 assegnazioni duplicate), 612 prodotti realmente scoperti, 116 ambigui e 207 in revisione. Nessuna scrittura eseguita. **Nessun mapping approvato, nessuna categoria assegnata.**
