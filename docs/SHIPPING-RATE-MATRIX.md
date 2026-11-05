## 5 novembre 2026 — intervento LIVE autorizzato: A attiva, B in attesa

## 5 novembre 2026 — A+B LIVE

Le tabelle approvate sotto sono ora configurate nella stessa opzione Standard, per collezioni complementari A/B, in Italy e nel sottomercato Sicilia/Sardegna. **118 bulbi e 43 grasse approvati e classificati B** secondo la politica botanica definitiva del proprietario. Sei checkout reali PASS: [rapporto](SHIPPING-QA-REPORT.md). Nessuna gratuità. Isole minori ancora non coperte dalla speciale verificata; nessuna deroga o supplemento a province continentali. Le sezioni successive conservano la cronologia precedente.

**LIVE PARZIALE.** Rimossa dal mercato Italy la gratuità da 55 €, mantenendo prima un fallback positivo da 7 €. Checkout immediato del sito reale: 65,60 € → una sola spedizione 7,00 €. Successivamente attivati i sei scaglioni **A standard per tutti i prodotti** e creato il sottomercato live **Sicilia e Sardegna — Isole 120287887700** (genitore Italy 112143401300), con le 17 province approvate e i sei scaglioni A speciali. Nessun ID Dev copiato. Le opzioni si chiamano «Standard» e sono attive; nome conservato dalla configurazione esistente. Non c'è gratuità.

| Checkout live dal sito onlinegarden.it | Subtotale | Unica spedizione osservata |
|---|---:|---:|
| Roma, Rosa Maizner Fastnacht ×1 | 16,40 € | A 8,90 € |
| Roma, stesso prodotto ×4 | 65,60 € | A 11,90 € |
| Palermo, stesso prodotto ×4 | 65,60 € | A Isole 12,50 € |
| Cagliari, stesso prodotto ×4 | 65,60 € | A Isole 12,50 € |

Nessun ordine o pagamento. Nessun prodotto fisico escluso dalla copertura precedente: A continua ad applicarsi a tutti i prodotti e alla sede esistente, con intervalli contigui da zero senza massimo finale. Il test dimostra disponibilità sul prodotto provato; non equivale a collaudare ogni SKU o ogni gruppo di evasione. [Backup, letture e screenshot](shipping-evidence/2026-11-05/live/README.md).

**B: zero prodotti/varianti approvati e attivi.** Riletti nel live tutti i 161 candidati: ID, SKU, stato, tag, varianti correnti e collezioni. Nessuna approvazione logistica esplicita nel registro; non sono state assegnate classi dal solo nome botanico. Tutti restano A. I checkout B/misti non sono eseguiti live perché non esiste una B approvata. Le tabelle B restano commercialmente approvate, ma non sono attive e non sono certificate su prodotti live. L'eccezione di revisione è unica: confermare l'idoneità logistica dei 161 candidati (118 bulbi, 43 grasse), tutti con peso rilevato zero e senza evidenza sufficiente per approvare ingombro/fragilità. Non viene inventato un elenco di prodotti «delicati» dal titolo.

**Geografia:** Sicilia/Sardegna A PASS live. Elba, Lido, Pellestrina e altre isole minori non ricevono la tariffa speciale tramite questa configurazione. Il checkout resta servito dalla tariffa del mercato genitore come comportamento tecnico già esistente; non è un'eccezione commerciale approvata al requisito «tutte le isole speciali». Non sono stati creati supplementi per intere province continentali, blocchi destinazione o procedure manuali. Copertura completa NON dichiarata; serve una decisione specifica sulle destinazioni non distinguibili nativamente.

**Marco:** account attivo, ruolo Amministratore dell'organizzazione e privilegi completi verificati nella UI Shopify. Nessun permesso modificato. Può verificare le tariffe in Shopify Admin; un passaggio A/B protetto nel gestionale non è pubblicato. Il guard server resta codice di prova e il percorso generico rifiuta assegnazioni B: niente override tramite tag manuale presentato come soluzione sicura. [Guida cliente](SHIPPING-CLIENT-MANAGEMENT.md).

**Lovable:** nessun deploy necessario o effettuato per queste tariffe: il checkout aperto dal sito reale ha letto gli importi aggiornati. Flag Admin V2, prezzi, giacenze, contenuti prodotto, pagamenti, Sendcloud e PR #42 invariati. Profili tradizionali riletti via API identici allo snapshot 3 novembre (incluse tariffe UE/internazionale); nessun collaudo checkout estero, nessuna riattivazione di destinazioni estere. Costo aggiuntivo 0 €.

**Rollback positivo:** mantenere il backup originale solo come evidenza, NON ripristinare la gratuità. Se le nuove fasce creano un problema, impostare l'opzione Italy su 7 € da zero senza massimo e gratuità OFF; riportare il sottomercato isole in Bozza affinché erediti il fallback positivo. Verificare subito Roma sopra 55 € e le isole, senza ordine. Nessun rollback eseguito perché i quattro checkout A sono corretti. Le sezioni successive conservano la cronologia.

## Decisione commerciale DEFINITIVA — 5 novembre 2026 (PR #45)

**La decisione precedente sulla tariffa standard per le isole minori è REVOCATA e sostituita integralmente.** Il proprietario richiede la fascia **«Isole e zone disagiate» per TUTTE le isole italiane**, comprese Sicilia, Sardegna e isole minori come Isola d'Elba, Lido di Venezia e Pellestrina. Non sono previste deroghe alla tariffa standard provinciale per le isole minori. Tariffe A/B e importi rimangono quelli approvati; nessuna estensione del supplemento a territori continentali solo perché condividono una provincia con un'isola. Eventuali cambiamenti futuri richiederanno una nuova decisione esplicita.

**GAP TECNICO BLOCCANTE:** Shopify Markets nativo per provincia non ha dimostrato di poter distinguere le isole minori dalle località continentali della stessa provincia. La politica commerciale approvata non prova che il checkout la applichi. Non ripristinare per comodità la precedente deroga standard, non ampliare il supplemento a province continentali e non dichiarare «isole minori coperte» senza verifica. Identificare prima della pubblicazione una soluzione affidabile e approvata, compatibile con il vincolo zero nuove app a pagamento, oppure mantenere il rilascio bloccato per le destinazioni non gestibili senza introdurre blocchi di vendita non autorizzati. Palermo e Cagliari restano NON VERIFICATI nel checkout Dev; 161 candidati B, zero approvati. PR #45 Draft; produzione e Sendcloud invariati.

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
