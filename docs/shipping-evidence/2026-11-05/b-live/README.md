# Attivazione B live — 5 novembre 2026

HEAD iniziale effettivo PR #45: 795e2015db241f15736e44cface1d694a1ba96f9. Politica botanica approvata nell'allegato b6758fa3; modifiche live, checkout e rollback confermati direttamente in chat dopo un blocco automatico. Stato finale: **LIVE A+B CHECKOUT PASS**, con limite isole minori ancora aperto.

## Stato precedente e finale

[Backup precedente](before-activation.json): configurazione A positiva universale nei due mercati, senza gratuità, prima delle modifiche tariffarie B. Il campo aSource nello stesso file conserva il primo input di pianificazione, non una rilettura della sorgente finale. [Stato finale delle tariffe](native-rates-final.json): A/B per collezioni complementari nella stessa opzione Standard, una per mercato; tutti gli importi approvati, freeDeliveryMinimumValue=null.

[B approvate](approved-variants.json): 118 bulbi e 43 grasse, tutti con ID/SKU corrispondenti alla rilettura live, una variante ciascuno. B 734709514580 usa selezioni esplicite di ID variante (VARIANTS). A 734709547348 è complementare, con filtro tecnico prezzo base > −0,01 EUR (tutti i prezzi Shopify non negativi) ed esclusione B; i prezzi dei prodotti non sono stati modificati. Nessuna modifica a tag prodotto necessaria per l'appartenenza.

[Copertura riletta](coverage-final.json): 14 pagine complete, 1.364 prodotti e 1.392 varianti; 1.231 A, 161 B. Nessun prodotto con membership in entrambe le classi e nessun conteggio varianti residuo. [Profili tradizionali finali](profiles-final.json): identici in data al backup ../live/profiles-after.json, senza variazione UE/internazionale. Sendcloud non modificato.

## Checkout reali del sito

| Carrello | Subtotale | Unica spedizione | Prova |
|---|---:|---:|---|
| Roma: 6 bulbi ×5 € | 30,00 € | 5,90 € | [PASS](01-b-30.txt) |
| Roma: 6 bulbi ×5 € + 4 Aloe ×7,70 € | 60,80 € | 7,90 € | [PASS](02-b-60-80.txt) |
| Roma: 6 bulbi ×5 € + 1 rosa ×16,40 € | 46,40 € | 11,90 € | [PASS](03-mixed-46-40.txt) |
| Roma: 6 bulbi ×5 € + 9 rose ×16,40 € | 177,60 € | 17,50 € | [PASS](04-mixed-177-60.txt) |
| Palermo: 6 bulbi ×5 € | 30,00 € | 6,90 € | [PASS](05-palermo-b-30.txt) |
| Cagliari: 6 bulbi ×5 € + 1 rosa ×16,40 € | 46,40 € | 12,50 € | [PASS](06-cagliari-mixed-46-40.txt) |

Gli importi 60,80/46,40/177,60 € sono equivalenti nelle fasce 50–149,99 / 19–79,99 / 150–249,99 €. La succulenta Wigginsia scelta inizialmente risultava non disponibile nel sito: usata Aloe Vera a 7,70 €, disponibile, senza cambiare inventario o prezzo. Nessun ordine o pagamento completato. URL checkout, token e dati di pagamento non sono salvati nelle letture DOM.

## Gestione cliente e protezioni

[Selettore native varianti verificato](marco-native-variant-selector.jpg). UI per includere e rimuovere manualmente varianti disponibile nella collezione B, verificata senza cambiare le selezioni durante l'ispezione. La [guida Marco](../../../SHIPPING-CLIENT-MANAGEMENT.md) è aggiornata alla sorgente VARIANTS, non a tag ereditabili. Nuovi ID non entrano automaticamente in B. Per non creare prodotti misti, declassificare prima il prodotto intero, verificare A e rivalidare tutte le varianti prima di reincluderle. Nessun blocco globale sulle operazioni dirette Shopify Admin viene attribuito al codice non distribuito del gestionale.

## Blocco iniziale, risolto

Il checkout e il tentativo di rollback erano stati rifiutati dalla revisione automatica per il vecchio perimetro Dev. [Stato intermedio](current-rates-awaiting-confirmation.json) e [screenshot intermedio](standard-awaiting-confirmation.jpg) sono storico, NON lo stato finale. Dopo la conferma diretta in chat il flusso è ripreso con gli strumenti ordinari, B Isole è stata completata e tutti i sei checkout sono PASS. Non è stato necessario eseguire il rollback.

## Rollback e limiti

Ripristinare per entrambi i mercati il gruppo A per tutti i prodotti e togliere il gruppo B, conservando le sei fasce A e gratuità OFF. Non ripristinare la gratuità da 55 €. Non cancellare le collezioni o i prodotti come parte del ripristino.

Elba, Lido, Pellestrina e altre isole minori restano fuori dalla copertura speciale verificata: non estese intere province continentali, non inventati CAP, deroghe o blocchi. Nessun deploy Lovable, nessuna scrittura Admin V2 abilitata, nessuna modifica a PR #42. Costi aggiuntivi 0 €.

[result.json](result.json) separa gli esiti finali dalle prove storiche. Manifest SHA256 aggiornato, eccetto sé stesso.
