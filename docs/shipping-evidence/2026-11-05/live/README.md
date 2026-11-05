# Intervento Shopify live — 5 novembre 2026

Autorizzato dal proprietario nel messaggio «Rilascio live spedizioni A+B e gestione cliente». HEAD iniziale effettivo PR #45: d26d2f0120bc4a1c270b864aad003288f7bf8eb1. Nessun deploy, merge, ordine o pagamento.

## Backup e diff

[Prima dell'intervento](backup-before.json): Italy 112143401300, Standard, tutti i prodotti/sede esistente, 7 € senza massimo, gratuità da 55 €. Backup acquisito prima della prima modifica. [Sconti letti via API](discounts-before.json): zero discountNodes, paginazione completa. Nessuno sconto modificato.

Prima rimossa soltanto la gratuità: checkout reale sito 65,60 € → 7 € ([screenshot](01-hotfix-65-60.jpg)). Poi aggiornati gli scaglioni A standard sull'opzione esistente, e creato il solo sottomercato Sicilia/Sardegna live 120287887700, genitore Italy, con le 17 province corrispondenti (9 Sicilia, 8 Sardegna secondo il selettore Shopify corrente). Nessun ID Dev copiato.

[Lettura API finale delle tariffe e condizioni](native-rates-after.json): un'opzione attiva per mercato, tutti i prodotti, sei fasce contigue, freeDeliveryMinimumValue=null. Standard: 8,90/11,90/12,50/17,50/36/54 €. Isole: 9,60/12,50/14,90/17,50/36/54 €. Tempi di transito «Nessuno», senza promesse inventate. [Stato isole attivo](islands-active.jpg).

I [profili tradizionali riletti](profiles-after.json) sono identici nei dati allo snapshot del 3 novembre in ../../2026-11-03/profile.json (confronto strutturale, non hash del wrapper). Questo include UE/internazionale: nessuna modifica o riattivazione estera, checkout estero non provato. Nessuna operazione su Sendcloud.

## Checkout reali, senza ordine

Tutti dal sito onlinegarden.it usando il suo pulsante checkout Shopify e dati di prova. Prodotto Rosa Maizner Fastnacht, prezzo invariato 16,40 €, quantità 1 o 4. Nessun codice custom per alterare il prezzo.

| Destinazione / subtotale | Spedizione osservata | Evidenza |
|---|---:|---|
| Roma 65,60 €, dopo hotfix immediato | 7,00 € | [Screenshot](01-hotfix-65-60.jpg) |
| Roma 65,60 €, A definitiva | 11,90 € | [DOM](02-a-65-60.txt), [screenshot](02-a-65-60.jpg) |
| Roma 16,40 €, A definitiva | 8,90 € | [DOM](05-a-16-40.txt), [screenshot](05-a-16-40.jpg) |
| Palermo 65,60 €, A Isole | 12,50 € | [DOM](03-palermo-a.txt), [screenshot](03-palermo-a.jpg) |
| Cagliari 65,60 €, A Isole | 12,50 € | [DOM](04-cagliari-a.txt), [screenshot](04-cagliari-a.jpg) |

Sempre una sola tariffa positiva. Checkout B/misti non eseguiti: zero B approvate. Nessun dato pagamento inserito e nessun ordine completato. URL checkout e token di sessione non conservati nelle letture DOM; screenshot con dati di prova.

## Candidati e cliente

[Rilettura attuale dei 161 prodotti](candidates-refresh.json): ID/SKU coincidenti, tutti attivi con una variante, pesi zero, connessioni complete. [Eccezioni/decisioni](candidates-exceptions.csv): nessuna idoneità logistica esplicita; tutti A. Nessuna approvazione o tag generati automaticamente.

[Marco: verifica ruoli](marco-permissions.txt): account attivo con amministrazione dell'organizzazione. Nessun permesso modificato. Gestione classi protetta non distribuita; [guida disponibile](../../../SHIPPING-CLIENT-MANAGEMENT.md).

## Rollback e limiti

Fallback sicuro: Italy Standard 7 € da zero senza massimo, gratuità OFF; sottomercato Isole in Bozza per ereditare la tariffa positiva. Non ripristinare silenziosamente la gratuità originaria. Nessun rollback necessario ai quattro test A PASS. Elba, Lido, Pellestrina e altre isole minori non ricevono la speciale: nessuna decisione commerciale di deroga o blocco inventata. Copertura completa non dichiarata.

[result.json](result.json) distingue ciò che è attivo, PASS e non provato. Il manifest SHA256 include questi file eccetto sé stesso.
