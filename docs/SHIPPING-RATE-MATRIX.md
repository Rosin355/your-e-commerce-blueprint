# Spedizioni Online Garden — regole approvate e geografia

Aggiornamento: **3 novembre 2026**, orario operativo Europe/Rome. Stato: **PREPARATO LOCALMENTE — NON SINCRONIZZATO — RILASCIO BLOCCATO**. Nessuna modifica Shopify live.

## Regole commerciali

La decisione riguarda l'intero carrello fisico. B soltanto se tutte le varianti sono bulbi o piante grasse con classificazione approvata. Basta una variante ordinaria, pesante, voluminosa o sconosciuta per usare A. Le quantità non generano spedizioni aggiuntive. **A e B non si sommano e non prevedono spedizione gratuita.** La fascia usa il valore complessivo rilevante per le condizioni native Shopify, senza ricalcolare sconti o imposte nel browser.

### A — ordinaria, arbusti, prodotti standard/pesanti e misti

| Valore ordine | Italia standard | Isole e zone disagiate |
|---|---:|---:|
| 0–18,99 € | 8,90 € | 9,60 € |
| 19–79,99 € | 11,90 € | 12,50 € |
| 80–149,99 € | 12,50 € | 14,90 € |
| 150–249,99 € | 17,50 € | 17,50 € |
| 250–499,99 € | 36,00 € | 36,00 € |
| Da 500 € | 54,00 € | 54,00 € |

### B — esclusivamente bulbi e/o piante grasse approvati

| Valore ordine | Italia standard | Isole e zone disagiate |
|---|---:|---:|
| 0–49,99 € | 5,90 € | 6,90 € |
| 50–149,99 € | 7,90 € | 8,90 € |
| Da 150 € | 8,90 € | 9,50 € |

Gli intervalli sono inclusivi al centesimo; l'ultima fascia non ha massimo. Il codice conserva solo interi in centesimi. Un ordine fisico interamente scontato a zero conserva una tariffa positiva secondo la fascia nativa applicabile; non viene aggiunta una regola di gratuità.

| Carrello, Italia standard | Totale rilevante | Spedizione |
|---|---:|---:|
| Bulbi | 15 € | 5,90 € |
| Bulbi + grasse | 60 € | 7,90 € |
| Bulbi + arbusto | 45 € | 11,90 € |
| Bulbi + arbusto | 160 € | 17,50 € |

## Matrice geografica da approvare

**«Sud» nella tabella originaria significa «isole e zone disagiate», non Sud Italia geografico.** Non esiste una regola che applichi un supplemento indistintamente a Campania, Puglia, Basilicata, Calabria, Molise o Abruzzo.

| Destinazione | Fascia proposta | Fonte disponibile | Stato / decisione |
|---|---|---|---|
| Italia continentale ordinaria, compreso Sud continentale | Standard, salvo eccezioni documentate | Istruzione cliente; manca elenco eccezioni completo | Validare copertura residuale dopo confronto corriere |
| Sicilia | Isole/disagiate | Chiarimento cliente sulle isole, nessuna lista territoriale contrattuale | Confermare applicazione integrale e riferimenti |
| Sardegna | Isole/disagiate | Come Sicilia | Confermare applicazione integrale e riferimenti |
| Isole minori | Isole/disagiate per località approvate | Nessun elenco ufficiale acquisito | Acquisire CAP, località, servizio e decorrenza |
| Località montane/remote | Supplemento solo se documentato | Nessun elenco ufficiale acquisito | Non classificare intere regioni |
| CAP/località con supplemento corriere | Isole/disagiate | Corriere e contratto non identificati | Acquisire listino corrente e approvazione Marco |
| CAP condiviso da località ordinarie e disagiate | Dipende anche dalla località | Da listino corriere | Verificare capacità dell'app per CAP + località |
| Destinazioni non servite | Nessuna consegna acquistabile | Da contratto | Elenco distinto dal supplemento |
| Estero | Fuori dalle tabelle A/B | Configurazione Shopify attuale | UE/internazionale esclusi dall'intervento |

Ricerca effettuata nel repository (documentazione e codice) e nelle letture Shopify autorizzate: profili/zone/regole, metafield Shop nei namespace `shipping` e `logistics`. Nessun elenco ufficiale trovato. Le impostazioni interne Sendcloud non sono state lette: non si può escludere che il cliente ne abbia uno nel proprio account. Non è stato scelto un elenco generico Internet o un listino di un corriere diverso.

[Configurazione geografica pending](../shipping/geography.pending.json): elenco vuoto, fonte e corriere assenti, `coverageComplete=false`. È un blocco intenzionale: la mancanza di un CAP nella lista vuota **non** autorizza una tariffa standard. `resolveArea` richiede fonte, approvatore, data e lista dichiarata completa; gestisce CAP esatti, località e destinazioni non servite. I CAP nei test sono esclusivamente fixture sintetiche.

Le zone dei profili tradizionali usano paesi/province, non una lista arbitraria di CAP. La geografia richiesta deve quindi essere selezionata nel checkout da una capacità aggiuntiva verificata. [Configurazione zone Shopify](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/setting-up-shipping-rates), [documentazione del fornitore sui CAP e Delivery Customization](https://www.logbase.io/blog/shopify-shipping-based-on-zip-code).

Prima del rilascio servono: corriere/servizio contrattuale, lista vigente con fonte e decorrenza, conferma Sicilia/Sardegna, CAP condivisi, destinazioni escluse e responsabile dei futuri aggiornamenti. Nessuna classificazione geografica è stata pubblicata.
