# Audit lossless export WordPress/WooCommerce

Data audit: 2026-09-22T09:16:02.077Z
Baseline Git: `5f617d3cffcd9cd0d134a5d89196efb106aad331`
Branch: `codex/wordpress-lossless-import`

## Sintesi

- CSV analizzati: 8
- Righe complessive: 2637
- SKU unici complessivi: 2560
- Simple: 126
- Parent/variable: 1184
- Variations: 1327
- Colonne uniche: 46
- Categorie/path unici: 21
- SKU presenti in più file: 66
- Orphan variations: 0
- Round-trip superati: 8/8

## Inventario file e integrità

| File | Byte | SHA256 | Encoding | Delimiter | Righe | Colonne | SKU unici | Senza SKU | Simple | Parent | Variation | Parse errors | Round-trip |
|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| wc-product-export-27-7-2026-1785163055481.csv | 335818 | `5731229481a5e7b4368afd422b9359227ce6d5a18648354a9647e05d174f1987` | utf-8 + BOM | , | 118 | 42 | 118 | 0 | 118 | 0 | 0 | 0 | PASS |
| wc-product-export-27-7-2026-1785163338872.csv | 34605 | `2ffeff8ce7898e6f620db3313f9a021a932b9a18abb6561fabe7b287a510982b` | utf-8 + BOM | , | 18 | 46 | 18 | 0 | 0 | 9 | 9 | 0 | PASS |
| wc-product-export-27-7-2026-1785163453321.csv | 194264 | `134397080efe5b3a3371ca9ddb69f994de8f51a0f17abfc2553a067d7454a9d9` | utf-8 + BOM | , | 103 | 46 | 103 | 0 | 0 | 51 | 52 | 0 | PASS |
| wc-product-export-27-7-2026-1785163658156.csv | 2707884 | `d5c8cd3595df4fb65f809e81a37443ac7564e72d2d9766056becac8c2d98458e` | utf-8 + BOM | , | 1686 | 46 | 1676 | 10 | 6 | 768 | 912 | 0 | PASS |
| wc-product-export-27-7-2026-1785163759646.csv | 540684 | `37462ab899415030c8d030232b90c6767010222842c7d7626bf9aeea73e37c2d` | utf-8 + BOM | , | 293 | 46 | 292 | 1 | 0 | 148 | 145 | 0 | PASS |
| wc-product-export-27-7-2026-1785164253248.csv | 275331 | `cb253c8512100a0fc14825dcc39fe25c3a8533b5477daf6b6ef0ea97904a648d` | utf-8 + BOM | , | 153 | 46 | 153 | 0 | 1 | 76 | 76 | 0 | PASS |
| wc-product-export-27-7-2026-1785164406854.csv | 174462 | `95e688170215420177a7349ec7e7297e4804166b054e4656d1e21f6c8b029874` | utf-8 + BOM | , | 109 | 46 | 109 | 0 | 1 | 53 | 55 | 0 | PASS |
| wc-product-export-27-7-2026-1785164449980.csv | 271968 | `8568fb4d3d2e6065a72f5e440c1279f30367bc4f2c0713d27f99d1e673c16c24` | utf-8 + BOM | , | 157 | 46 | 157 | 0 | 0 | 79 | 78 | 0 | PASS |

## Header esatti per file

### wc-product-export-27-7-2026-1785163055481.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`

### wc-product-export-27-7-2026-1785163338872.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

### wc-product-export-27-7-2026-1785163453321.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

### wc-product-export-27-7-2026-1785163658156.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

### wc-product-export-27-7-2026-1785163759646.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

### wc-product-export-27-7-2026-1785164253248.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

### wc-product-export-27-7-2026-1785164406854.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

### wc-product-export-27-7-2026-1785164449980.csv

1. `ID`
2. `Tipo`
3. `SKU`
4. `GTIN, UPC, EAN, o ISBN`
5. `Nome`
6. `Pubblicato`
7. `In primo piano?`
8. `Visibilità nel catalogo`
9. `Breve descrizione`
10. `Descrizione`
11. `Data di partenza del prezzo in saldo`
12. `Data in cui termina l'offerta`
13. `Stato delle imposte`
14. `Aliquota di imposta`
15. `In stock?`
16. `Magazzino`
17. `Quantità in magazzino bassa`
18. `Abilita gli ordini arretrati?`
19. `Venduto singolarmente?`
20. `Peso (kg)`
21. `Lunghezza (cm)`
22. `Larghezza (cm)`
23. `Altezza (cm)`
24. `Permetti le recensioni clienti?`
25. `Nota di acquisto`
26. `Prezzo in offerta`
27. `Prezzo di listino`
28. `Categorie`
29. `Tag`
30. `Classe di spedizione`
31. `Immagine`
32. `Limite di download`
33. `Scarica i giorni di scadenza`
34. `Genitore`
35. `Prodotti raggruppati`
36. `Up-sell`
37. `Cross-sell`
38. `URL esterno`
39. `Testo del pulsante`
40. `Posizione`
41. `EAN`
42. `Marchi`
43. `Nome dell'attributo 1`
44. `Valore dell'attributo 1`
45. `Attributo 1 visibile`
46. `Attributo 1 globale`

## Copertura dati

### wc-product-export-27-7-2026-1785163055481.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: nessuna colonna
- Righe con immagini: 118; URL/elementi immagine: 118
- Categorie/path distinti nel file: 9
- Righe senza SKU: 0

### wc-product-export-27-7-2026-1785163338872.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 9; URL/elementi immagine: 12
- Categorie/path distinti nel file: 2
- Righe senza SKU: 0

### wc-product-export-27-7-2026-1785163453321.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 51; URL/elementi immagine: 104
- Categorie/path distinti nel file: 3
- Righe senza SKU: 0

### wc-product-export-27-7-2026-1785163658156.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 933; URL/elementi immagine: 1845
- Categorie/path distinti nel file: 7
- Righe senza SKU: 10 (riga 284, ID 12251, Abelia Grandiflora Little Richard - Ø Vaso: 19cm - Altezza …; riga 362, ID 25885, Acer Palmatum Skeeter's Broom - Acero Palmato - Ø Vaso: 20c…; riga 393, ID 12576, Berberis Ottawensis Superba - Ø Vaso: 19cm - Altezza Pianta…; riga 398, ID 12599, Berberis Thunbergii Bagatelle - Ø Vaso: 19cm - Altezza Pian…; riga 514, ID 13003, Cedrus Libani Fastigiata - Cedro - Ø Vaso: 19cm - Altezza P…; riga 1349, ID 16967, Osmanthus Armatus - Osmanto; riga 1426, ID 16968, Osmanthus Armatus - Osmanto - Ø Vaso: 10cm - Altezza Pianta…; riga 1602, ID 20454, Amelanchier Lamarckii - Ø Vaso: 18cm - Altezza Pianta: 50cm; riga 1637, ID 26788, Spiraea Betulifolia Pink Sparkler - Spirea - Ø Vaso: 19cm -…; riga 1665, ID 26821, Weigela Florida Alexandra - Vegelia - Ø Vaso: 19cm - Altezz…)

### wc-product-export-27-7-2026-1785163759646.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 151; URL/elementi immagine: 279
- Categorie/path distinti nel file: 4
- Righe senza SKU: 1 (riga 259, ID 26492, Rubus Idaeus Tulameen - Lampone - Ø Vaso: 18cm - Altezza Pi…)

### wc-product-export-27-7-2026-1785164253248.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 79; URL/elementi immagine: 88
- Categorie/path distinti nel file: 2
- Righe senza SKU: 0

### wc-product-export-27-7-2026-1785164406854.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 56; URL/elementi immagine: 109
- Categorie/path distinti nel file: 4
- Righe senza SKU: 0

### wc-product-export-27-7-2026-1785164449980.csv

- Prezzo: `Data di partenza del prezzo in saldo`, `Prezzo in offerta`, `Prezzo di listino`
- Stock: `In stock?`, `Magazzino`, `Quantità in magazzino bassa`
- Shipping class: `Classe di spedizione`
- Attributi: `Nome dell'attributo 1`, `Valore dell'attributo 1`, `Attributo 1 visibile`, `Attributo 1 globale`
- Righe con immagini: 79; URL/elementi immagine: 147
- Categorie/path distinti nel file: 1
- Righe senza SKU: 0

## Parent e variations

- Orphan variations: 0
- Parent con tipo incoerente: 0
- SKU ripetuti (tra file o nello stesso file): 66
- Variation senza SKU: 10
- Parent senza SKU: 1
- Riferimenti parent non espressi come SKU: 1

Nessuna relazione è stata corretta automaticamente. Le variation senza SKU restano import-blocking fino a una decisione esplicita; il riferimento `id:<Woo ID>` deve essere preservato nel raw snapshot.

## Custom/ACF

Non sono state trovate colonne ACF/custom esplicite oltre allo schema WooCommerce export e alle colonne attributo standard.

I campi manuali `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita` e il campo protetto `nome_comune` non compaiono negli otto export. Lo schema futuro deve comunque preservarli e impedire overwrite distruttivi.

## Round-trip lossless

Ogni file è stato letto come byte UTF-8, parsato mantenendo stringhe vuote, HTML e newline nei campi quoted, serializzato in memoria e parsato nuovamente. Il confronto è cella-per-cella, inclusi header e numero colonne.

Risultato: PASS su tutti i file.

## Vincoli rispettati

- Nessun import database.
- Nessuna chiamata o modifica Shopify.
- Nessuna AI eseguita.
- Nessuna migration o Edge Function modificata.
- Nessuna modifica a storefront o Admin V2.
