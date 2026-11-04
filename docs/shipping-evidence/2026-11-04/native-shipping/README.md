# Collaudo Shopify Native Shipping nel Dev

PR #45, Online Garden Shipping Test, store 111269380421, Grow simulato, Market-driven shipping. Mercato Italy 119681515845, valuta EUR.

**Collaudo interrotto dopo la prima prova.** Timeout ripetuti del controllo Chrome durante la cattura e durante l’apertura del misto. Il primo importo proviene dalla lettura DOM del checkout. Lo screenshot della prova corrente è in attesa. Il verdetto A/B resta da assegnare.

## Configurazione

- B, collezione 710044287301, include il tag prodotto `ogqashippingbapproved`. Tag assegnato esplicitamente a bulbo e pianta grassa.
- A, collezione 710044385605, include i prodotti privi dello stesso tag. Arbusto e sconosciuto rimangono privi di tag B. Il selettore tariffario mostra due prodotti per collezione dopo l'aggiornamento.
- Unica opzione attiva “Spedizione standard”, tipo importo dell'ordine, sede Shop location. Due tariffe per collezione nella stessa opzione. Spedizione gratuita spenta. Il modulo richiede una scelta sul tempo di transito. È stato selezionato “Nessuno” per ogni scaglione.
- Intuitive Shipping e Standard dimostrativa risultano inattive dopo riapertura del mercato. La configurazione Intuitive resta disponibile per il ripristino nel Dev. [Lettura del mercato salvato](market-saved.txt)

| Collezione | Minimo–massimo € | Costo € |
|---|---|---|
| A | 0–18,99 / 19–79,99 / 80–149,99 / 150–249,99 / 250–499,99 / da 500 | 8,90 / 11,90 / 12,50 / 17,50 / 36,00 / 54,00 |
| B | 0–49,99 / 50–149,99 / da 150 | 5,90 / 7,90 / 8,90 |

## Registro checkout

| Caso | Atteso | Osservato |
|---|---:|---|
| Due bulbi, 30 €, Roma | B 5,90 € | 5,90 €. [Lettura checkout](01-bulbi-30.txt) |
| Bulbo e grassa, 60 € | B 7,90 € | In attesa |
| Bulbo e arbusto, 45 € | A 11,90 € | In attesa |
| Dieci bulbi e sconosciuto, 160 € | A 17,50 € | In attesa |
| Confini, sconti, gruppi di spedizione | Da verificare nel checkout | In attesa |

## Copertura geografica

Shopify documenta sottomercati con condizioni per provincia e personalizzazione della sola spedizione. La fascia speciale può essere modellata per province complete se il proprietario approva quella copertura. Le eccezioni per singoli CAP e località richiedono una condizione geografica di maggiore granularità. I campi documentati dei mercati non espongono quel predicato. Il CAP presente nel checkout serve anche a validare l'indirizzo. [Sottomercati Shopify](https://help.shopify.com/en/manual/markets/getting-started/market-types) · [Condizioni Markets](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/MarketConditionsInput)

Shopify documenta il massimo delle tariffe per importo appartenenti alla stessa opzione e il valore complessivo del carrello come base dello scaglione. Nei gruppi separati coperti dalla stessa opzione, Shopify documenta un solo addebito e l'indicazione “Included” per gli altri gruppi. La verifica sul Dev resta distinta dalla documentazione. [Tariffe per Mercati](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market) · [Gruppi di spedizione](https://help.shopify.com/en/manual/checkout-settings/split-shipping)

## Ripristino nel Dev

Disattivare “Spedizione standard” e riattivare “Intuitive Shipping (tramite app)” sul mercato Italy. La Standard dimostrativa era già inattiva all'inizio di questo collaudo. Le collezioni e il tag di prova sono isolati nel catalogo Dev. Le modifiche del collaudo riguardano il Dev e la documentazione della PR #45.
