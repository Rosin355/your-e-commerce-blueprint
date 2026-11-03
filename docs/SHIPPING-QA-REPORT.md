# QA spedizioni Online Garden

**3 novembre 2026 — QA LOCALE PASS; CHECKOUT NATIVO NON CERTIFICATO; RILASCIO BLOCCATO.** Nessuna configurazione live modificata, nessun ordine creato, nessun pagamento/addebito, nessuna mutation Shopify eseguita.

## Verifiche eseguite

| Controllo | Risultato | Limite dell'evidenza |
|---|---|---|
| Identità/piano/imposte/fuso tramite Admin API | PASS: store atteso, EUR, Grow non Plus | Il connettore non espone l'header versione API |
| Profili, zone, metodi, condizioni e sedi | PASS: 1 profilo, 3 zone, 4 metodi attivi | Conferma configurazione precedente, non le nuove tariffe |
| Catalogo paginato | PASS: 1.364 prodotti / 1.392 varianti | Namespace logistici esplicitamente elencati nel report classificazione |
| Associazione varianti/profilo paginata | PASS: 1.392 / 1.392 nel profilo generale | Non dimostra automaticamente un delivery group unico in ogni carrello |
| SKU | PASS: tutti presenti, nessun duplicato osservato | Necessario ricontrollo prima di compilare allowlist definitiva |
| Classificazione/pesi | Criticità: nessuna classe nei campi controllati, tutti i pesi zero | 161 candidati ridotti non ancora approvati |
| App installate e carrier | PASS: Sendcloud installata, carrier service vuoti | Impostazioni interne Sendcloud non lette |
| Delivery Customization esistenti | **NON VERIFICATO** | Access denied, manca `read_delivery_customizations` |
| Regole dominio spedizioni | **295/295 PASS** | Esecuzione locale, fixture e snapshot, nessuna Function installata |
| Suite dominio Node offline | **638/638 PASS** | Include le verifiche spedizioni; API live non coinvolte |
| TypeScript | PASS | Nessun cambio applicativo a checkout/Admin V2 |
| ESLint nuovi file e test | PASS | Controllo mirato allo scope modificato |
| Build Vite | PASS | Avviso dimensione chunk >500 kB già presente; nessun deploy |
| Query/mutation Admin | **14 operazioni VALID**, più **2 input completi VALID** | Schema 2026-01; validità sintattica/tipi non equivale a permessi o risultato live |
| Matrice checkout nativo | **720 casi preparati, 0 eseguiti** | Geografia e app pending; nessun risultato live inventato |

Una prima query profilo superava il limite Shopify di costo 1.000; è stata ridotta ed eseguita con paginazione controllata. Il validatore del connettore dichiarava di rinviare la validazione all'esecuzione: è stato quindi usato anche il validatore della skill. Il campo live `coversAllItems` non era nello schema 2026-01: rimosso dalla query riutilizzabile, lasciando il dato grezzo nel backup. [Riepilogo validazioni](shipping-evidence/2026-11-03/validation-summary.json).

## Riproduzione locale

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run shipping:prepare
npm run test:shipping
node ci/run-domain.mjs node
npm run typecheck
npx --no-install eslint --no-ignore shipping/rules.mjs shipping/plan.mjs shipping/prepare.mjs shipping/evidence-json.mjs scripts/tests/shipping-rates.test.ts
npm run build
git diff --check
```

`shipping:prepare` legge soltanto snapshot e registri locali; non legge token, non usa la rete e non prevede `--apply`. Rigenera matrice, riferimenti e piano bloccato. I test Node vengono eseguiti con la protezione rete della CI. Non sono stati eseguiti nuovi test browser dello storefront perché questo intervento non modifica frontend, cartCreate o redirect; i test browser non sostituirebbero comunque il collaudo delle regole nel checkout Shopify.

## Copertura delle regole automatiche

280 casi incrociano 10 composizioni carrello, 14 valori (compresi zero e importo elevato), due fasce geografiche sintetiche. Ulteriori 15 test coprono esempi cliente, sconosciuti/non approvati, quantità invalide, digitale/non spedibile, CAP e località, opzioni duplicate/assenti, importi, sconti con base già determinata, completezza snapshot, diff Italia, approvazioni, unicità SKU e gate di rilascio.

Un controllo esaustivo verifica **ogni centesimo da 0 a 600 €**, per A/B e standard/speciale: esattamente una fascia per contesto, nessun buco o sovrapposizione, prezzo positivo, A non inferiore a B. I casi di carrello verificano che venga mantenuta una sola tariffa, senza sommare A e B. La fascia superiore aperta è verificata anche a 10.000 €.

| Soglie provate | A standard prima/dopo | B standard prima/dopo |
|---|---:|---:|
| 18,99 / 19,00 € | 8,90 / 11,90 € | 5,90 / 5,90 € |
| 49,99 / 50,00 € | 11,90 / 11,90 € | 5,90 / 7,90 € |
| 79,99 / 80,00 € | 11,90 / 12,50 € | 7,90 / 7,90 € |
| 149,99 / 150,00 € | 12,50 / 17,50 € | 7,90 / 8,90 € |
| 249,99 / 250,00 € | 17,50 / 36,00 € | 8,90 / 8,90 € |
| 499,99 / 500,00 € | 36,00 / 54,00 € | 8,90 / 8,90 € |

Le stesse soglie sono provate per la colonna isole/disagiate. Gli importi stringa sono convertiti in centesimi senza aritmetica decimale binaria; valori con più di due decimali vengono rifiutati, non arrotondati arbitrariamente. **I test sconti non applicano un vero codice Shopify**: confrontano basi già determinate ai due lati della soglia. La prova nativa di sconti automatici, riga/ordine, combinazioni e arrotondamenti resta aperta.

## Matrice di checkout da eseguire senza pagamento

[720 casi con stato esplicito NOT_RUN](shipping-evidence/2026-11-03/checkout-matrix.json): 10 composizioni × 12 importi di soglia × 6 destinazioni. Gli importi sono obiettivi di fixture in staging; non si sostiene che i prezzi reali dei prodotti permettano ogni totale esatto e non si alterano prezzi o sconti live per ottenerlo.

| Dimensione | Casi richiesti | Criterio di accettazione |
|---|---|---|
| Solo bulbi, solo grasse, bulbi + grasse | Classi approvate, quantità 1 e multiple | Una B, nessuna A visibile |
| Solo arbusti, bulbi + arbusti, grasse + arbusti | Inclusa riga ordinaria di piccolo valore | Una A sul totale intero |
| Tre classi, pesanti, voluminosi | Varianti approvate e sconosciute | Una A, nessun supplemento separato |
| Non classificato + ridotto | Variante nuova o assente da allowlist | A conservativa |
| Italia standard e Sud continentale ordinario | CAP campione approvati | Nessun supplemento per macroregione |
| Sicilia, Sardegna | Ambito territoriale da approvare | Tariffa speciale solo secondo regola approvata |
| Isole minori, CAP disagiato | Fonte corriere, CAP e località | Riconoscimento esatto, anche CAP condiviso |
| Non servito / fisico non spedibile | Caso contrattuale documentato | Nessun acquisto di consegna non disponibile |
| Digitale puro e misto digitale/fisico | Prima verificare incongruenza gift card | Nessuna spedizione digitale; politica mista da validare |
| Sconti riga/ordine/automatici, arrotondamento | Attraversamento soglie, sconto totale | Fascia coerente con base nativa Shopify, nessuna nuova gratuità |
| Split fulfillment / gruppi multipli | Giacenze/sedi/righe non consegnabili | Nessuna somma o prezzo parziale; blocco se non dimostrato |
| UE e internazionale | Carrello di controllo | Nessuna variazione involontaria |
| Disattivazione app e rollback | Solo staging prima del live | Nessuna esposizione delle combinazioni sbagliate |

Ogni prova deve registrare ambiente, timestamp/fuso, ID variante, quantità, classe approvata, totale nativo prima/dopo sconti, CAP/località approvati, delivery group, opzioni visibili e importo osservato, evidenza oscurata e PASS/FAIL. Fermarsi prima di completare l'ordine. Non usare clienti reali, non inviare notifiche e non salvare URL checkout con identificatori riservati.

## Esito di rilascio

Le tariffe attuali Shopify **non corrispondono** alle tabelle concordate. I test locali dimostrano la correttezza del riferimento e del piano, non la sua applicazione nel checkout. Rimangono bloccanti geografia, approvazioni logistiche, scelta/capacità app, permesso per audit personalizzazioni, base sconti, delivery group e staging. Nessuna richiesta di autorizzazione al live viene anticipata: si presenterà una sola richiesta sul diff definitivo quando sarà completo. [Runbook e rollback](SHIPPING-SHOPIFY-INTEGRATION.md).
