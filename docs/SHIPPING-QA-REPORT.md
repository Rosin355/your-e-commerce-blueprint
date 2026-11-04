# QA spedizioni Online Garden

**4 novembre 2026 · NATIVE PARTIAL · gate A/B Italia standard 4/4 PASS.** Nove verifiche in checkout Shopify, di cui una riutilizzata; collaudo sul solo Dev `111269380421`, Grow simulato, Mercati attivi, EUR. Nessun ordine o pagamento.

| Tipo di verifica | Risultato | Limite |
|---|---|---|
| Checkout reale: gate principale | 30 € due bulbi → B 5,90 €; 60 € bulbo + grassa → B 7,90 €; 45 € bulbo + arbusto → A 11,90 €; 160 € dieci bulbi + sconosciuto → A 17,50 €. | Una sola «Spedizione standard» positiva in ogni caso. [Registro completo e screenshot](shipping-evidence/2026-11-04/native-shipping/README.md). |
| Checkout reale: sconti e centesimo | B 49,99 € → 5,90 €, 50,00 € → 7,90 €. Misto A 149,99 € → 12,50 €, 150,00 € → 17,50 €. Sconosciuto solo 10 € → A 8,90 €. | Confermata la base dopo sconto d'ordine ai confini rappresentativi; gli altri confini e lo zero non sono prove checkout. Codici Dev disattivati, zero utilizzi. |
| Configurazione Shopify | Unica opzione attiva per importo, A/B per collezioni complementari, Intuitive e Standard dimostrativa inattive. Province individuali disponibili nel selettore Mercati Dev. | Nessun checkout regionale con questa configurazione. |
| Gruppi di spedizione separati | **NON VERIFICATO**: una sola sede Dev e nessuno split nei carrelli provati. | Shopify [documenta il caso della stessa opzione per importo](https://help.shopify.com/en/manual/checkout-settings/split-shipping): un addebito al massimo applicabile, altri gruppi inclusi. Opzioni o topologie diverse richiedono una prova specifica. |
| Test automatici locali | `npm run test:shipping`: **325 passati, 0 falliti**. Copertura della matrice in centesimi, precedenze e casi geografici di riferimento. | Non attestano il checkout Shopify. |
| Catalogo e fallback | Un prodotto distinto senza tag ricade in A, come verificato con lo sconosciuto. | Una nuova variante su un prodotto già in B eredita la collezione; [controllo catalogo](SHIPPING-CLASSIFICATION.md) richiesto. |

**Intuitive Shipping.** Valutata esclusivamente per il collaudo; esclusa dalla soluzione di produzione per decisione del proprietario. Il [Cart Tester e i checkout storici](shipping-evidence/2026-11-03/intuitive-sandbox/README.md) non concorrono alle nove prove native.

Costo sostenuto **0 €**. Nessun acquisto CCS, upgrade o nuova app. La [procedura di rilascio](SHIPPING-SHOPIFY-INTEGRATION.md) definisce i controlli, il backup e il rollback prima di un'eventuale autorizzazione live.
