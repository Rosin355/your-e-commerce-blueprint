# Conflitti sorgenti WordPress/WooCommerce

SKU presenti in più export: 66

| Classificazione | Occorrenze campo |
|---|---:|
| SAME | 1421 |
| SOURCE_ONLY | 0 |
| MISSING | 1615 |
| SOURCE_CONFLICT | 0 |

## Source precedence proposta

La precedence seguente è una proposta e non è stata applicata. Ogni `SOURCE_CONFLICT` resta in attesa di decisione umana.

| Priorità | File | Ruolo proposto | Motivazione |
|---:|---|---|---|
| 1 | wc-product-export-27-7-2026-1785163658156.csv | master export candidate | Massima copertura SKU e righe; usare solo come baseline proposta, non come vincitore automatico. |
| 2 | wc-product-export-27-7-2026-1785163759646.csv | category export with parent/variation pairs | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |
| 2 | wc-product-export-27-7-2026-1785164449980.csv | category export with parent/variation pairs | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |
| 2 | wc-product-export-27-7-2026-1785164253248.csv | category export with parent/variation pairs | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |
| 2 | wc-product-export-27-7-2026-1785163055481.csv | category export of simple products | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |
| 2 | wc-product-export-27-7-2026-1785164406854.csv | category export with parent/variation pairs | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |
| 2 | wc-product-export-27-7-2026-1785163453321.csv | category export with parent/variation pairs | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |
| 2 | wc-product-export-27-7-2026-1785163338872.csv | category export with parent/variation pairs | Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente. |

Regole consigliate:

1. Usare il master candidate come baseline di copertura, senza sovrascrivere automaticamente valori diversi.
2. Integrare da export verticali solo campi assenti nella baseline e chiaramente valorizzati.
3. Un valore diverso non vuoto genera sempre revisione manuale.
4. Categorie, relazioni parent/variation e campi commerciali restano source-controlled.
5. Conservare tutte le osservazioni nel raw snapshot, anche dopo l'approvazione di un current value.

## SOURCE_CONFLICT rilevati

| SKU | Campo | Osservazioni sorgenti |
|---|---|---|

La tabella contiene tutti i SOURCE_CONFLICT rilevati.
