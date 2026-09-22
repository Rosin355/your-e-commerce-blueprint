# Piano admin prodotto lossless

## Flusso dati

`WordPress original → snapshot immutabile → current value → proposta AI per singolo campo → accetta/scarta → current value approvato → Shopify`

## Schema futuro proposto

### product_import_batches

Traccia file, hash, stato audit/import, conteggi, autore e timestamp. Non contiene dati prodotto modificabili.

### product_source_snapshots

- `id uuid primary key`
- `batch_id uuid not null`
- `source_file text not null`
- `source_row_number integer not null`
- `source_hash text not null`
- `source_sku text`
- `raw_row jsonb not null` con ogni colonna originale
- `imported_at timestamptz not null`
- policy append-only: vietare UPDATE e DELETE applicativi
- unique consigliata: `(batch_id, source_file, source_row_number, source_hash)`

### product_current_values

Contiene un valore corrente per campo e prodotto, con riferimento allo snapshot da cui deriva, stato approvazione, versione e lock per i campi protetti. Separare i campi indicizzati principali da un contenitore JSONB per campi dinamici.

### product_ai_suggestions

Una proposta per singolo campo: `product_id`, `field_key`, `source_value`, `suggested_value`, `status pending|accepted|rejected`, modello/prompt/versione, autore decisione e timestamp. L'accettazione crea storia e aggiorna solo il current value del campo.

### product_field_history

Registro append-only delle transizioni campo-per-campo: valore precedente, nuovo valore, origine (`source`, `manual`, `ai_accepted`, `restore_source`), utente e timestamp.

## Strategia admin field-by-field

Per ogni campo mostrare: valore WordPress originale, valore corrente, stato/provenienza, eventuale conflitto sorgente, cronologia e azioni consentite. I JSON raw restano disponibili all'audit tecnico ma non vengono mostrati come editor principale.

Azioni:

- `Ripristina originale WordPress` per campi modificabili.
- `Migliora con AI` solo per campi editoriali.
- `Accetta` e `Scarta` sulla proposta separata.
- Confronto sorgenti per `SOURCE_CONFLICT` senza selezione automatica.
- Campi strutturali in sola lettura o modifica manuale privilegiata.

## Configurazione AI field-by-field

AI consentita: `Nome/title`, `Breve descrizione`, `Descrizione`, `Nota di acquisto`, `Testo del pulsante`, SEO title/description futuri, FAQ, testi cura/botanica/promo/curiosità quando disponibili.

AI vietata: SKU, Woo ID, Shopify ID, tipo record, prezzo, stock, peso/dimensioni, immagini, parent, relazioni variante, shipping class, tax, categorie sorgente, GTIN/EAN, attributi tecnici.

`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia` e `curiosita` devono essere protetti dall'import distruttivo. `curiosita` può ricevere una proposta AI solo senza sovrascrittura automatica.

## Golden dataset (20 SKU)

| SKU | Titolo | Tipo | Categorie | Motivo |
|---|---|---|---|---|
| OG_393883 | Rosa Rugosa Hansa | parent | Rose | SKU richiesto esplicitamente |
| OG_544298 | Rosa Alaska - Rampicante | parent | Rose | Seconda rosa rappresentativa |
| OG_682138 | Laurus Nobilis alloro - Ciliegio | parent | Aromatiche; Piante da Esterno > Arbusti | Arbusto |
| OG_154282 | Betula Albosinensis - Betulla Rossa Cinese | parent | Piante da Esterno > Alberi | Albero |
| OG_281711 | Abies Inversa Glauca | simple | Piante da Esterno > Conifere | Conifera |
| OG_365676 | Gladiolo "Violet summer" - 10 Bulbi | simple | Bulbi > Gladioli | Bulbo |
| OG_166719 | Arbutus Unedo Atlantic - Corbezzolo | parent | Piante da Esterno > Arbusti; Piante da Frutto | Pianta da frutto |
| OG_216444 | Rubus Idaeus Golden Everest - Lampone | parent | Piante da Frutto | Piccolo frutto |
| OG_711741 | Salvia officinalis - Salvia a Foglia Stretta | parent | Aromatiche | Aromatica |
| OG_362693 | Gladiolo "Apricot fudge" - 10 Bulbi | simple | Bulbi > Gladioli | Prodotto simple |
| OG_685393 | Rosmarinus officinalis - Rosmarino | parent | Aromatiche | Prodotto parent |
| OG_711741-01 | Salvia officinalis - Salvia a Foglia Stretta - Ø Vaso: 14cm - Altezza Pianta: 10cm | variation |  | Variation |
| OG_449525 | Helichrysum Italico - Pianta Liquirizia | parent | Aromatiche | Più immagini |
| OG_646117 | Acorus Gramineus Ogon - Calamo | parent | Erbacee Perenni e Graminacee; Piante Acquatiche > Piante Palustri | Categorie multiple |
| OG_682138-01 | Laurus Nobilis alloro - Ciliegio - Ø Vaso: 19cm - Altezza Pianta: 50cm | variation |  | Presente in più CSV |
| OG_935122-01 | Hydrangea Paniculata Limelight - Ortensia Paniculata | variation |  | Record con pochi campi compilati |
| OG_168484 | Clematis Viola - Clematide | parent | Rampicanti e Arbusti a Spalliera | Record ad alta compilazione |
| OG_152965 | Cornus Stolonifera Flaviramea | parent | Piante da Esterno > Arbusti; Piante da Esterno > Siepi | Copertura rappresentativa aggiuntiva |
| OG_891874 | Cipresso di Leyland - Cupressocyparis Leylandii | parent | Piante da Esterno > Conifere; Piante da Esterno > Siepi | Copertura rappresentativa aggiuntiva |
| OG_758263 | Euonymus Alatus Compactus - Evonimo | parent | Piante da Esterno > Arbusti; Piante da Esterno > Siepi | Copertura rappresentativa aggiuntiva |

Criteri richiesti ma non disponibili negli export: prodotti con colonne ACF esplicite e prodotti con `SOURCE_CONFLICT`. Non sono stati inventati sostituti per questi due casi.

## Decisioni aperte prima dell'importer

- Approvare source precedence e regole per i conflitti.
- Definire il mapping finale categorie WooCommerce → Shopify Collections.
- Definire la gestione dei parent senza SKU o delle variation orfane, se presenti.
- Confermare quali campi dinamici meritano colonne indicizzate oltre al `raw_row`.
