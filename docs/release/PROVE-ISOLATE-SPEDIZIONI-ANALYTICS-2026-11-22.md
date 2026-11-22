# Online Garden · prove isolate su spedizioni e Visitor Analytics

**22 novembre 2026. Base GitHub `7d8fad5`. Costo incrementale sostenuto 0,00 €. SAL 57,75% (58% arrotondato).** Le due prove isolano rispettivamente la scelta del metodo e il caricamento dello script. Il commerciante può usare questi risultati per decidere la fase successiva.

| Requisito | Esito | Evidenza |
|---|---|---|
| Selezione CAP/località sui 69 preventivi | **PASS in laboratorio** | 23 destinazioni × A, B e misto. Un importo corretto per ogni caso, 27 corretti nel modello, 42 già corretti conservati. |
| Selettore effettivo nel checkout Shopify Grow | **BLOCKED** | Accesso negato al negozio di sviluppo. La disponibilità contemporanea dei due metodi nel gruppo giusto e le condizioni dell’app restano da verificare su Shopify. |
| Soppressione del solo script Visitor Analytics | **PASS nel browser** | Quattro profili ospite puliti, due desktop e due mobile emulato. Il collettore resta raggiungibile. Entrambi i controlli inviano già dalla home, entrambi i trattamenti registrano zero tentativi. |
| Interruttore del provider e risoluzione in produzione | **BLOCKED** | Nel workspace collegato è stato identificato il solo progetto Online Garden pubblicato. La configurazione del progetto attivo è rimasta in servizio. Nessuna conclusione sugli altri servizi di tracciamento o sull’area autenticata. |

## A · Spedizioni

Il simulatore legge i preventivi acquisiti nel [verbale precedente](FINAL-CLOSEOUT-2026-11-22.md) e il [controllo diretto nel checkout](evidence/checkout-islands-2026-11-22.csv). Nei casi del mercato Italia riceve in ingresso **due opzioni ipotetiche** con identificativi di prova e prezzi già rilevati a Livorno e a Lipari per lo stesso paniere e subtotale. Sceglie esclusivamente fra le opzioni ricevute. Le righe regionali mantengono il proprio metodo osservato. Nel riferimento pubblico ogni destinazione offriva un solo metodo. Nasconderlo da solo non può far apparire un prezzo speciale mancante. La scelta usa paese, mercato, provincia, CAP completo e nome normalizzato per spazi e maiuscole. Il comparatore indipendente verifica importo, valuta, subtotale e numero di opzioni contro il riferimento originario. Le colonne `baseline_cents` e `quoted_cents` nel file del laboratorio descrivono rispettivamente l’importo pubblico osservato e quello selezionato localmente. [Matrice dei risultati](evidence/island-selector-isolated-2026-11-22.csv) · [Simulatore](../../scripts/qa/replay-island-selector.py)

| Destinazioni | Casi | Riferimento pubblico | Risultato isolato |
|---|---:|---:|---:|
| Portoferraio, Lido di Venezia, Pellestrina, Capri, Ischia, Procida, Ponza, Ventotene, Isole Tremiti | 27 | 0/27 | **27/27** |
| Livorno, Mestre, Napoli, Latina, Foggia | 15 | 15/15 | **15/15** |
| Quattro località insulari già corrette e cinque controlli in Sicilia/Sardegna | 27 | 27/27 | **27/27** |
| **Totale** | **69** | **42/69** | **69/69** |

Per A da 18,50 €, B da 5,00 € e misto da 23,50 €, il risultato speciale è rispettivamente **9,60 / 6,90 / 12,50 €**. I corrispondenti importi ordinari sono **8,90 / 5,90 / 11,90 €**. Nessun importo viene sommato o riscritto. La suite tariffaria di riferimento ha superato nuovamente **295/295** casi, incluse soglie e composizioni. Il collaudo dei 69 usa tre subtotali e non certifica le soglie presso il fornitore. [Regole e test approvati](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b2059cff561ee36ec8ee331da4363cca4a/scripts/tests/shipping-rates.test.ts)

**37 verifiche aggiuntive** coprono alias documentati, omonimia sintetica tra due zone, campi mancanti o incoerenti, CAP con zero iniziale, opzioni di pari prezzo, opzione mancante o duplicata, express inatteso, più gruppi ed estero. Per il CAP 30126, Poste elenca anche Venezia, Venezia Lido, Malamocco e Pellestrina. Nel campione, `30126 + Venezia` seleziona la speciale, mentre `30126 + Mestre` e `30126` con località assente restano irrisolti. Per una stessa terna iscritta in entrambe le zone il laboratorio restituisce BLOCKED. È uno stato diagnostico interno. Resta da provare cosa può fare il checkout reale in questo caso, anche con un wallet che fornisca l’indirizzo parziale. Il PDF di Poste riguarda il proprio servizio. Occorre la copertura del vettore effettivo, comprese le frazioni e le eventuali eccezioni per via. [Fonte Poste Italiane, edizione gennaio 2025](https://business.poste.it/business/files/1476629075287/Elenco-CAP-Localita-Disagiate.pdf)

**Compatibilità reale.** L’API Admin conferma Grow, `shopifyPlus=false`. L’elenco delle personalizzazioni richiede `read_delivery_customizations`, assente dalla connessione. Il negozio storico *Online Garden Shipping Test* esiste nel dossier del 3 novembre. La sessione staff disponibile ha ricevuto un diniego sulla home Admin e sulla pagina Spedizione di quel negozio. Il connettore lo esclude dai propri PreviewStore. Il precedente Cart Tester riguardava Intuitive e una configurazione diversa. L’identità dei due metodi, la capacità di esprimere CAP **e** località, il comportamento con indirizzi ambigui e la selezione nel checkout Grow restano da dimostrare. [Collaudo Dev storico](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b2059cff561ee36ec8ee331da4363cca4a/docs/shipping-evidence/2026-11-03/intuitive-sandbox/README.md)

Una Delivery Customization Shopify può nascondere opzioni già prezzate. La distribuzione privata di una Function richiede Plus. Una pubblica da App Store è utilizzabile su Grow in linea di principio. La candidata **DS Hide Payment Hide Shipping** è esposta come gratuita e la scheda dichiara criteri ZIP e indirizzo. I permessi richiesti includono dati cliente e interventi su alcune risorse commerciali. Confermare ambito minimo, condizioni, costo effettivo, identificatori e comportamento sullo specifico negozio di prova. [API Shopify](https://shopify.dev/docs/api/functions/latest/delivery-customization) · [Piani Shopify](https://shopify.dev/docs/apps/build/functions) · [Permessi e prezzo della candidata](https://apps.shopify.com/ds-shipping-payment-hide-sort)

## B · Visitor Analytics

Chromium 159, lingua italiana, profili senza sessione precedente. Sul desktop l’ordine è controllo → soppressione, sul mobile emulato è soppressione → controllo. La sola risorsa sostituita nel browser è `/__l5e/events.b979ee024b15adfd.js`, con una risposta JavaScript vuota. Il collettore `/__l5e/trackevents`, il resto del dominio e Shopify ricevono traffico normalmente. Prima di qualunque interazione la home viene osservata per sette secondi. Poi si aggiunge una Dalia Purple Queen, si ricarica la pagina e si controlla la riga nel carrello, si apre il checkout ospite con l’articolo e si raggiunge il modulo email dell’account. Nessun ordine o accesso con OTP. [Sonda riproducibile](../../scripts/qa/probe-visitor-analytics.mjs) · [Conteggi di rete e controlli funzionali](evidence/visitor-analytics-isolated-2026-11-22.jsonl)

| Profilo | POST in home prima della scelta | POST nell’intero percorso | Risposte HTTP 202 osservate | Carrello dopo ricarica / checkout / accesso |
|---|---:|---:|---:|---|
| Desktop controllo | 1 | 5 | 5 | PASS / PASS / PASS |
| Desktop soppressione | 0 | 0 | 0 | PASS / PASS / PASS |
| Mobile emulato soppressione | 0 | 0 | 0 | PASS / PASS / PASS |
| Mobile emulato controllo | 1 | 6 | 5 | PASS / PASS / PASS |

Le richieste iniziali nei due controlli hanno ricevuto 202. La sesta richiesta del controllo mobile è stata osservata in partenza senza una sesta risposta 202 registrata. In ogni profilo quattro risposte positive da altre risorse dello stesso prefisso hosting. Zero richieste a `/~flock.js` nella finestra osservata. Il checkout ha continuato a emettere richieste diagnostiche Shopify anche durante la soppressione. I file conservano contatori e nome del solo script pubblico. La prova mobile riguarda Chromium emulato. Il tentativo aggiuntivo con WebKit si è interrotto all’avvio del motore, prima di aprire una pagina.

**Effetto del comando effettivo.** Lovable documenta che disattivare *Visitor analytics* in *Project settings → General → Publishing* interrompe anche la registrazione dei clic e degli errori browser. La prova mostra che l’esecuzione del loader è necessaria agli invii osservati e che il percorso ospite funziona senza di esso. Per conoscere l’effetto esatto dell’impostazione del provider serve un progetto di prova pubblicato in un ambiente separato oppure una finestra autorizzata su quello reale. Un’anteprima dello stesso progetto non offre un interruttore indipendente. [Documentazione Lovable](https://docs.lovable.dev/features/analytics#enable-or-disable-visitor-analytics)

## Costi, rischi, ripristino e decisioni ancora necessarie

| Ambito | Costo e rischio residuo | Ripristino e operazione successiva |
|---|---|---|
| Selettore Shopify | **0 € sostenuti**. Un metodo assente, una regola ambigua o uno scambio di identificatori può esporre una tariffa errata, due opzioni o nessuna. La fattibilità gratuita in produzione è aperta. | Il simulatore opera solo su copie di dati. Per proseguire occorre concedere accesso tecnico **al solo Dev** e fornire la matrice del vettore. L’accesso al Dev consente di riprendere il collaudo già autorizzato. Un’eventuale concessione all’app di permessi ulteriori e la predisposizione di metodi mancanti in Shopify Markets richiedono una decisione esplicita sullo specifico ambiente. Il passaggio live richiederà esiti su checkout, wallet, soglie e gruppi, approvazione distinta e uno snapshot ripristinabile contestualmente di opzioni e selettore. |
| Visitor Analytics | **0 € sostenuti**. Spegnere il servizio riduce la visibilità su visite, clic ed errori browser. La diagnostica Shopify richiede valutazione propria. | Chiudere i profili termina la sostituzione locale. Per usare l’interruttore reale occorre indicare un progetto isolato idoneo oppure autorizzare una finestra circoscritta su Online Garden. Registrare lo stato iniziale, intervenire sulla sola voce Visitor analytics, ripetere il confronto e, se occorre ripristinare il servizio, riabilitare l’impostazione previa decisione del titolare considerando la ripresa della raccolta. |

La SAL conserva il denominatore e i pesi del [verbale di chiusura](FINAL-CLOSEOUT-2026-11-22.md#e-sal-per-la-telefonata). I due PASS riguardano le prove isolate. Nessun nuovo requisito produttivo è stato chiuso.

### Ripetizione delle prove

Dalla radice del repository, con Python 3 e le dipendenze browser del progetto già disponibili, la prima coppia opera offline. La terza istruzione usa la vetrina pubblica in modalità ospite e produce solo contatori JSON.

```sh
python3 scripts/qa/replay-island-selector.py > /tmp/onlinegarden-islands-qa.csv
python3 scripts/qa/check-island-quotes.py /tmp/onlinegarden-islands-qa.csv
node scripts/qa/probe-visitor-analytics.mjs
```
