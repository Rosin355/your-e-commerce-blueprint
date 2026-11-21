# Clienti WooCommerce · preparazione alla riconciliazione

Il preflight di riferimento è del 20 novembre 2026. Lo snapshot Shopify di quella data conteneva 14 profili. L’esecuzione di QA del 21 novembre ha utilizzato fixture sintetiche, con rete bloccata. I conteggi reali qui riportati provengono dal [report aggregato storico](../migration/customers-reconciliation-2026-11-20.json).

| Coorte | Quantità | Trattamento |
| --- | ---: | --- |
| Acquirenti con ruolo customer | 857 | Perimetro storico da riconciliare |
| Candidati alla verifica individuale | 848 | Nessun assenso alla creazione. Ogni candidato richiede riscontro privato, assenza di conflitti e snapshot attuale |
| In quarantena | 8 | Sei somiglianze telefoniche interne, un telefono malformato e una somiglianza con Shopify. Escludere fino a risoluzione documentata |
| Corrispondenza per email | 1 | Sospendere la creazione. Verificare con fonte indipendente che i due profili appartengano alla stessa persona |
| Profili creati / associati / identità approvate | 0 / 0 / 0 | Nessuna scrittura autorizzata in questo ciclo |
| Ordini WooCommerce importati | 0 di 953 | BLOCKED_SOURCE_UNAVAILABLE. I CSV contengono contatori, senza righe, date e importi per transazione |

Il censimento include anche un account con ruolo author e un ordine. È esterno ai 857 clienti. L’account personale Shopify può essere aperto volontariamente dai clienti del nuovo negozio.

## Quali informazioni possono passare

Dopo la verifica e l’autorizzazione si possono valutare l’indirizzo email confermato, il nome e il cognome documentati e una corrispondenza privata fra l’ID sorgente e l’ID Shopify esatto. Limitare i campi a quelli necessari per l’operazione approvata. La modalità email-only esclude i telefoni dal trasferimento. Recapiti ambigui, indirizzi postali, credenziali, preferenze di marketing e dati di pagamento non fanno parte del pilota. Un conteggio di acquisti serve a riconciliare i totali e non contiene le informazioni di un ordine.

## Sequenza per un eventuale pilota autorizzato

1. Il responsabile identifica il negozio e acquisisce un nuovo snapshot Shopify privato, completo e paginato, con data, copertura e conteggio verificati. Conservare separatamente i due CSV minimizzati. Interrompere in caso di fonte incompleta o identità duplicata.
2. Il preflight offline unisce le fonti tramite ID Woo stabile, controlla duplicati, ruoli, email e telefoni e produce un report aggregato. Rieseguire il controllo sui dati freschi. Gli account staff e le quarantene restano esclusi. Una coincidenza di recapiti richiede un riscontro individuale tramite il canale di assistenza approvato.
3. Il titolare autorizza per iscritto il lotto esatto e i campi. Il piano già predisposto limita il primo pilota a cinque identità verificate. Prima di ogni operazione rileggere la destinazione, verificare che le condizioni dello snapshot siano ancora valide e registrare nel journal privato la chiave della richiesta. Il comando di preflight è esclusivamente offline.
4. Riconciliare ogni esito con il GID Shopify e il journal. Se l’esito remoto è incerto, fermare il lotto e rileggere prima di un nuovo tentativo. Conservare blocchi, eccezioni e verifiche individuali nel deposito privato. Su GitHub pubblicare esclusivamente i totali.
5. Per recuperare lo storico serve un export autentico per singolo ordine con ID immutabile, cliente, righe/varianti, quantità, date, valuta, importi, sconti, tasse, spedizioni e rimborsi ove presenti. La [specifica transazionale completa](../migration/woocommerce-history-2026-11-20.md) definisce la fonte accettabile. Il relativo import resta chiuso in questo ciclo.

## Prova ripetibile senza dati reali

`node --require ./ci/offline-network.cjs sync/customers-sync-shopify.mjs --synthetic --dry-run --email-only` deve indicare `privateIdentityReviewRequired=true`, `productionAuthorized=false` e zero richieste di rete, scritture e artefatti personali. Il codice di uscita 2 segnala la revisione richiesta. La suite offline esercita anche collisioni, snapshot obsoleti, arresto del lotto, tentativi ripetuti ed errori a esito incerto. Nessun invito, SMS o consenso commerciale è generato dal preflight.
