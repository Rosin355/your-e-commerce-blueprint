## Decisione commerciale confermata — 5 novembre 2026 (PR #45)

**Approvazione del proprietario:** Sicilia e Sardegna applicano la fascia «Isole e zone disagiate» su tutto il territorio delle rispettive province. Per il **lancio iniziale**, le isole minori (esempi: Isola d'Elba, Lido di Venezia, Pellestrina) applicano **provvisoriamente la tariffa standard della rispettiva provincia**, senza supplemento dedicato: questa è un'eccezione commerciale esplicitamente accettata, non un riconoscimento automatico dell'insularità da parte di Shopify. Eventuali maggiori costi del corriere vanno monitorati e rivalutati con listino e CAP/località ufficiali. Il resto dell'Italia mantiene la fascia standard, salvo future eccezioni approvate. Nessun supplemento esteso a province continentali. **Tariffe A/B e importi invariati.**

**Distinzione fra decisione e prova:** la configurazione speciale per Sicilia/Sardegna risulta salvata e attiva nel solo Dev, ma i checkout Palermo (B 6,90 € attesi) e Cagliari (A 12,50 € attesi) sono **NON VERIFICATI** per disconnessione browser. Nessuna configurazione live autorizzata. La matrice geografica storica più sotto rappresenta le questioni aperte al momento della sua redazione; la decisione qui sopra ne aggiorna il perimetro commerciale.

# Spedizioni Online Garden — regole approvate e geografia

## 5 novembre 2026 — chiusura mirata, gate ancora aperti

**PARTIAL — SPECIFIC BLOCKERS.** Un solo tentativo di apertura autenticata del sottomercato Dev è terminato con “Detached while handling command”. Palermo e Cagliari: **CHECKOUT BLOCKED**, nessun prezzo regionale osservato. Rimane valida l'ultima lettura del 4 novembre: sottomercato Dev 119731978565 attivo e nove importi speciali salvati, senza nuova conferma odierna. Attesi 6,90 € su Palermo B 30 € e 12,50 € su Cagliari misto A 45 €; non sono risultati checkout. Le prove standard PASS non sono state ripetute.

Controllo varianti preservato, **8 test mirati PASS** sul codice esistente: approvazioni server per ogni variante, rifiuto di una sorella A/sconosciuta in B, rifiuto del payload approvazione client, nessuna mutation trasmessa al blocco, trasporti gestiti coperti. Flag Admin V2 invariati e non attivati. Registro B **0 approvazioni effettive**; i 161 candidati restano proposte. Nessuna modifica o separazione di prodotti Shopify.

GitHub sulla baseline 69cc332: base main, Draft, mergeability e mergeStateStatus **UNKNOWN**, non un conflitto dimostrato. Check suite GitGuardian completata SUCCESS; nessuna suite GitHub Actions, altre app in coda. Actions abilitate e allowed_actions=all. La causa del mancato evento automatico non è accertata: non viene attribuita a conflitti o alla modalità Draft. È stato aggiunto in modo conservativo workflow_dispatch, lasciando pull_request, permessi contents:read, controlli e versioni inalterati. Il checkout source manuale usa github.sha; la concorrenza usa il riferimento quando manca il numero PR. Il run e il suo SHA vanno verificati prima di dichiarare CI PASS; esito aggiornato nel corpo/check della PR.

Sicilia/Sardegna sono approvate commercialmente, ma i due checkout restano gate. Elba, Lido, Pellestrina e altre isole minori non sono coperte tecnicamente: proposta al proprietario, **non ancora applicata**, accettare esplicitamente la tariffa della provincia come eccezione commerciale al supplemento richiesto, oppure mantenere il rilascio bloccato su questo requisito. Nessun supplemento inventato, nessun blocco destinazioni o gestione manuale introdotti.

Backup, diff tariffe, 161 candidati, piano classificazione, checklist e rollback sono già conservati in SHIPPING-SHOPIFY-INTEGRATION.md e nelle evidenze esistenti; non è stato ripetuto l'audit. Non costituiscono un rilascio completato. Nessuna modifica produzione, Sendcloud, estero o PR #42; nessun deploy, ordine, pagamento o costo aggiuntivo. Le sezioni seguenti sono cronologia.


## Aggiornamento controllo varianti PR #45

Vincolo di omogeneità B approvato e blocco server implementato nel codice di prova: assegnazioni B dal client e modifiche varianti di prodotti B rifiutate; pubblicazione B bloccata fino alle approvazioni di tutte le varianti nel registro server. Prodotti sconosciuti senza tag restano A; nessuna separazione automatica. Nessun deploy e flag Admin V2 invariati. [Copertura e limiti del blocco](SHIPPING-CLASSIFICATION.md).

Sicilia/Sardegna approvate; checkout Palermo/Cagliari BLOCKED perché la scheda Dev non è più disponibile. Matrice standard già PASS, non ripetuta. Elba, Lido e Pellestrina restano non coperte. Test mirati Node 19/19 e Deno 67/67, typecheck e build PASS. Main è antenato della PR: nessun conflitto. Il rilascio richiede ancora checkout regionali, approvazioni B ed eccezioni geografiche risolte. Costo aggiuntivo 0 €, produzione e Sendcloud invariati. Le sezioni successive sono cronologia.


## Decisione geografica recepita — 4 novembre 2026

Il proprietario approva la fascia speciale per Sicilia, Sardegna e isole minori, con esempi Elba, Lido di Venezia e Pellestrina. Questa decisione commerciale sostituisce lo stato «candidate» riportato nella precedente matrice. La copertura tecnica resta parziale: nessuna estensione automatica del supplemento alle intere province di Livorno o Venezia.

| Eccezione approvata | Gestione operativa ancora necessaria |
|---|---|
| Isola d'Elba | Condizione CAP/località non disponibile nei Mercati nativi verificati; non estendere la tariffa speciale a Livorno intera. Checkout non eseguito. |
| Lido di Venezia | Non separabile dalla restante provincia mediante le condizioni native verificate. Checkout non eseguito. |
| Pellestrina | Stesso limite; non estendere la tariffa speciale a Venezia intera. Checkout non eseguito. |
| Altre isole minori / località disagiate | Elenco ancora da acquisire dal listino: nessun CAP o intervallo inventato. |

Sicilia/Sardegna: mercato Dev provinciale creato **in bozza**, configurazione speciale e checkout ancora incompleti. [Checkpoint mirato](shipping-evidence/2026-11-04/native-islands/README.md).


Aggiornamento: **4 novembre 2026**, Europe/Rome. Stato: **Italia standard verificata nel checkout Dev — rilascio bloccato**. Nessuna modifica Shopify live.

Chiarimento cliente recepito: piattaforma logistica **Sendcloud**, scelta del vettore rinviata al cliente. Le tabelle sono prezzi commerciali fissi, indipendenti dal costo del corriere. Sicilia/Sardegna sono ora registrate come candidate non approvate nella configurazione; non generano regole operative. Nessuna richiesta ulteriore del nome del corriere è necessaria per proseguire il lavoro locale.

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

Gli intervalli sono inclusivi al centesimo; l'ultima fascia non ha massimo. Il codice conserva solo interi in centesimi. Le fasce a zero partono da una tariffa positiva e la gratuità è disattivata nella configurazione. Il checkout a zero non è stato provato. Gli sconti d’ordine usano la base netta, come verificato a 49,99/50,00 € e 149,99/150,00 €.

| Checkout Dev, Italia standard | Totale rilevante | Spedizione |
|---|---:|---:|
| Due bulbi | 30 € | 5,90 € |
| Bulbi + grasse | 60 € | 7,90 € |
| Bulbi + arbusto | 45 € | 11,90 € |
| Dieci bulbi + sconosciuto | 160 € | 17,50 € |

## Matrice geografica da approvare

**«Sud» nella tabella originaria significa «isole e zone disagiate», non Sud Italia geografico.** Non esiste una regola che applichi un supplemento indistintamente a Campania, Puglia, Basilicata, Calabria, Molise o Abruzzo.

| Destinazione | Fascia proposta | Fonte disponibile | Stato / decisione |
|---|---|---|---|
| Italia continentale ordinaria, compreso Sud continentale | Standard, salvo eccezioni documentate | Istruzione cliente; manca elenco eccezioni completo | Validare copertura residuale dopo confronto corriere |
| Sicilia | Isole/disagiate | Chiarimento cliente sulle isole, nessuna lista territoriale contrattuale | Sottomercato per province: approvare la copertura e collaudare |
| Sardegna | Isole/disagiate | Come Sicilia | Sottomercato per province: approvare la copertura e collaudare |
| Isole minori | Isole/disagiate per località approvate | Nessun elenco ufficiale acquisito | Acquisire CAP, località, servizio e decorrenza |
| Località montane/remote | Supplemento solo se documentato | Nessun elenco ufficiale acquisito | Non classificare intere regioni |
| CAP/località con supplemento corriere | Isole/disagiate | Corriere e contratto non identificati | Acquisire listino corrente e approvazione Marco |
| CAP condiviso da località ordinarie e disagiate | Dipende anche dalla località | Da listino corriere | Non distinguibile dal mercato nativo per provincia |
| Destinazioni non servite | Nessuna consegna acquistabile | Da contratto | Elenco distinto dal supplemento |
| Estero | Fuori dalle tabelle A/B | Configurazione Shopify attuale | UE/internazionale esclusi dall'intervento |

[Registro dei checkout e verifica selettore Dev](shipping-evidence/2026-11-04/native-shipping/README.md). Shopify espone province nei [sottomercati](https://help.shopify.com/en/manual/markets/getting-started/market-types); le [condizioni native](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/MarketConditionsInput) non espongono il singolo CAP o la località. Non sono stati salvati sottomercati né inventate esclusioni.

Il [riferimento geografico locale](../shipping/geography.pending.json) è ancora incompleto, con lista vuota e fonte assente. I CAP sintetici dei test locali non rappresentano destinazioni reali. Marco deve decidere se approvare Sicilia/Sardegna per province intere e accettare che eventuali eccezioni dentro una provincia seguano la tariffa provinciale. Se il listino impone una distinzione esatta per CAP, questa parte non è coperta dal percorso nativo.
