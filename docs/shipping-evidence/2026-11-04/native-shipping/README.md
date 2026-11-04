# Collaudo Shopify Native Shipping nel Dev

PR #45, Online Garden Shipping Test, store 111269380421, Grow simulato, Market-driven shipping. Mercato Italy 119681515845, valuta EUR.

**NATIVE PARTIAL.** Gate A/B **4/4 PASS**; nove verifiche checkout native, inclusa la prima prova già acquisita. Il collaudo non ha creato ordini o pagamenti. Geografia e controllo sulle nuove varianti restano da chiudere prima del rilascio.

## Configurazione

- B, collezione 710044287301, include il tag prodotto `ogqashippingbapproved`. Tag assegnato esplicitamente a bulbo e pianta grassa.
- A, collezione 710044385605, include i prodotti privi dello stesso tag. Arbusto e sconosciuto rimangono privi di tag B. Il selettore tariffario mostra due prodotti per collezione dopo l'aggiornamento.
- Unica opzione attiva “Spedizione standard”, tipo importo dell'ordine, sede Shop location. Due serie di tariffe nella stessa opzione: sei scaglioni A e tre scaglioni B. Spedizione gratuita spenta. Il modulo richiede una scelta sul tempo di transito. È stato selezionato “Nessuno” per ogni scaglione.
- Intuitive Shipping e Standard dimostrativa risultano inattive dopo riapertura del mercato. La configurazione Intuitive resta disponibile per il ripristino nel Dev. [Lettura del mercato salvato](market-saved.txt)

| Collezione | Minimo–massimo € | Costo € |
|---|---|---|
| A | 0–18,99 / 19–79,99 / 80–149,99 / 150–249,99 / 250–499,99 / da 500 | 8,90 / 11,90 / 12,50 / 17,50 / 36,00 / 54,00 |
| B | 0–49,99 / 50–149,99 / da 150 | 5,90 / 7,90 / 8,90 |

## Registro checkout

Gli importi sono letti dal checkout Shopify Dev, indirizzo standard a Roma. Tutte le prove mostrano una sola spedizione positiva; nessuna somma. Fixture: bulbo 15 €, pianta grassa 45 €, arbusto 30 €, sconosciuto 10 €. Per riprodurre il collaudo, aggiungere le quantità indicate dal negozio Dev, inserire un indirizzo standard e fermarsi prima del pagamento.

| Caso | Subtotale | Sconto | Base netta | Unica tariffa | Evidenza |
|---|---:|---:|---:|---:|---|
| Due bulbi | 30,00 € | — | 30,00 € | B 5,90 € | [Checkout 01](01-bulbi-30.txt) |
| Bulbo + pianta grassa | 60,00 € | — | 60,00 € | B 7,90 € | [Checkout 02](02-bulbo-grassa.txt) |
| Bulbo + arbusto | 45,00 € | — | 45,00 € | A 11,90 € | [Checkout 03](03-bulbo-arbusto.txt) |
| Dieci bulbi + sconosciuto | 160,00 € | — | 160,00 € | A 17,50 € | [Checkout 04](04-bulbi-sconosciuto.txt) |
| Bulbo + pianta grassa, sconto | 60,00 € | 10,01 € | 49,99 € | B 5,90 € | [Checkout 05](05-b-49-99-sconto.txt) |
| Dieci bulbi + sconosciuto, sconto | 160,00 € | 10,01 € | 149,99 € | A 12,50 € | [Checkout 06](06-a-149-99-sconto.txt) |
| Bulbo + pianta grassa, sconto | 60,00 € | 10,00 € | 50,00 € | B 7,90 € | [Checkout 07](07-b-50-sconto.txt) |
| Dieci bulbi + sconosciuto, sconto | 160,00 € | 10,00 € | 150,00 € | A 17,50 € | [Checkout 08](08-a-150-sconto.txt) |
| Sconosciuto solo | 10,00 € | — | 10,00 € | A 8,90 € | [Checkout 09](09-sconosciuto-solo.txt) |

[Screenshot: carrello misto da 160 €, una sola spedizione da 17,50 €](04-bulbi-sconosciuto.jpg). Gli [sconti di prova](sconti-disattivati.txt) sono stati disattivati, con zero utilizzi registrati. I gruppi separati sono **NON VERIFICATI**: nel Dev era attiva [una sola sede](sedi-dev.txt). Gli altri confini sono coperti dai test locali, separati da queste prove.

## Copertura geografica

Shopify documenta sottomercati con condizioni per provincia e personalizzazione della sola spedizione. La fascia speciale può essere modellata per province complete se il proprietario approva quella copertura. Le eccezioni per singoli CAP e località richiedono una condizione geografica di maggiore granularità. I campi documentati dei mercati non espongono quel predicato. Il [selettore del Dev](geografia-dev.txt) ha mostrato province individuali, tra cui Palermo e Cagliari. Non sono stati salvati sottomercati né eseguiti checkout regionali. Il CAP nel checkout serve anche a validare l’indirizzo. [Sottomercati Shopify](https://help.shopify.com/en/manual/markets/getting-started/market-types) · [Condizioni Markets](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/MarketConditionsInput)

Shopify documenta il massimo delle tariffe per importo appartenenti alla stessa opzione e il valore complessivo del carrello come base dello scaglione. Nei gruppi separati coperti dalla stessa opzione, Shopify documenta un solo addebito e l'indicazione “Included” per gli altri gruppi. La verifica dei gruppi separati sul Dev resta NON VERIFICATA. [Tariffe per Mercati](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market) · [Gruppi di spedizione](https://help.shopify.com/en/manual/checkout-settings/split-shipping)

## Ripristino nel Dev

Disattivare “Spedizione standard” e riattivare “Intuitive Shipping (tramite app)” sul mercato Italy. La Standard dimostrativa era già inattiva all'inizio di questo collaudo. Le collezioni e il tag di prova sono isolati nel catalogo Dev. Le modifiche del collaudo riguardano il Dev e la documentazione della PR #45.
