# Intuitive Shipping — collaudo Dev A/B completato

**3 novembre 2026 · PR #45 · continuazione da `428783a` · SANDBOX PASS per la matrice mirata, produzione bloccata.** Configurazione reale, Cart Tester reale e checkout nativo Shopify verificati separatamente. Il difetto iniziale sul confine 18,99 € è stato riprodotto, corretto nel solo Dev e rieseguito con successo. Non è una certificazione produttiva Grow.

## Ambiente, identità e costi

Solo **Online Garden Shipping Test**, Shopify ID **111269380421**, `online-garden-shipping-test.myshopify.com`, organizzazione Online Garden `213529043`. Tipo Development, Grow simulato, Italia/EUR, preview **Market-driven shipping and ship & pickup in one order**. App autenticata sul medesimo dominio, banner **“You're in sandbox mode!”**, stato globale Testing. Nessun piano o trial selezionato, CCS acquistato o pagamento: **spesa incrementale effettiva 0,00 €**.

[Banner iniziale](screenshots/01-sandbox-mode.png), [sandbox ancora attiva alla fine](sandbox-still-free-final.txt), [connessione](connection-catalog-final.txt). Discount fetching preesistente abilitato e lasciato invariato. Missing product dimensions non ha impedito le tariffe Total: nessuna dimensione aggiunta.

## Configurazione salvata e riletta

| Scenario | ID | Metodo | Condizione prodotto |
|---|---|---|---|
| B standard | 154776 | 668877 | SKU equals elenco, **All products** |
| B speciale sperimentale | 154777 | 668878 | SKU equals elenco, **All products** |
| A standard | 154778 | 668879 | SKU does not equal elenco, **Any product** |
| A speciale sperimentale | 154779 | 668880 | SKU does not equal elenco, **Any product** |

Elenco approvato di test: **OG-QA-BULB, OG-QA-SUCCULENT**. Tutti Testing, All conditions, **Match product filters to conditions disattivato**, **No product filters**. Zona Domestic Italia `87231`. Metodi **Total + Combine products**, Per unit vuoto, ultima fascia `~`, nessuno splitting, somma righe, arrotondamento, gratuità, ricarico, custom shipping cost blending o rate blending. Sample Scenario `154768` archiviato reversibilmente: [baseline](sample-scenario-before.txt).

| Tabella | Limiti commerciali inclusivi | Costi standard | Costi speciale |
|---|---|---|---|
| A | 18,99 / 79,99 / 149,99 / 249,99 / 499,99 / illimitato | 8,90 / 11,90 / 12,50 / 17,50 / 36,00 / 54,00 € | 9,60 / 12,50 / 14,90 / 17,50 / 36,00 / 54,00 € |
| B | 49,99 / 149,99 / illimitato | 5,90 / 7,90 / 8,90 € | 6,90 / 8,90 / 9,50 € |

**Limiti tecnici finali nell'app:** A 18.995 / 79.995 / 149.995 / 249.995 / 499.995 / `~`; B 49.995 / 149.995 / `~`. Costi e policy commerciale invariati. Su importi in centesimi EUR, x.995 include x.99 ed esclude il centesimo successivo. Non è un prezzo addebitato al cliente. [Read-back persistente dei quattro metodi](technical-methods-readback.json), [verifica configurazione finale](technical-boundaries-verification.json), file `method-*-after-fix.txt`. `methods-readback.json` e `configuration-verification.json` conservano la configurazione iniziale con limiti letterali x.99, **superata** dalla correzione.

## Difetto trovato e regressione risolta

Checkout iniziale con **2 bulbi × 5,99 € + 1 sconosciuto × 7,01 € = subtotal Shopify 18,99 €**: restituita **A 11,90 €**, attesa **8,90 €**. Stesso errore con 899 unità da 0,01 € + sconosciuto 10 €. I controlli 18,98 €, 19,00 € e una singola riga 18,99 € erano corretti. La differenza suggerisce precisione nella somma dei valori, ma **non dimostra il codice interno del fornitore**. [Richiesta di origine checkout, transazione 42924023-fa35-4172-943b-2f3d2f766c2a](activity-boundary-three-units.txt).

Dopo il salvataggio dei limiti intermedi, il **medesimo controesempio a tre unità** restituisce una sola A **8,90 €**; il successivo 19,00 € resta A **11,90 €**. [Prima: 11,90 €](native-12-A-boundary-three-units.png) · [Dopo: 8,90 €](native-21-three-units-after-fix.png). Due errori storici restano nel registro, marcati come corretti e rieseguiti; non sono nascosti né conteggiati come errori correnti.

**Limite:** il workaround a tre decimali è accettato e persistito dall'app, verificato nei test sotto; non è stato approvato dal supporto Intuitive. La conferma del fornitore resta necessaria prima dell'approvazione produttiva, soprattutto per basi scontate/frazionarie non ancora collaudate.

## Cart Tester reale: 38 casi validi PASS

| Gruppo | Casi | Esito |
|---|---:|---|
| Matrice funzionale iniziale + totale 160 € + verifica catalogo finale | 9 | Una tariffa corretta in ciascun caso |
| Tutti i confini A, standard e speciale | 20 | 18,99/19,00; 79,99/80,00; 149,99/150,00; 249,99/250,00; 499,99/500,00 |
| Tutti i confini B, standard e speciale | 8 | 49,99/50,00; 149,99/150,00 |
| CAP sintetico dopo la correzione | 1 | B speciale 6,90 € |

[29 transazioni distinte soglie/CAP](threshold-cart-tester-results.json), [9 casi funzionali validi e 1 cattura obsoleta esclusa](cart-tester-results.json), [screenshot finale a prezzi ripristinati](cart-final-restored.png). Prodotti e quantità reali del test inviati dall'interfaccia dell'app, non da un emulatore locale. La cattura obsoleta `cart-02` mostrava il risultato precedente: esclusa e sostituita dal misto rieseguito `cart-04`.

I test ai centesimi usano temporaneamente due fixture da **0,01 €** e quantità intere. Il test finale con catalogo ripristinato usa **10 bulbi da 15 € + sconosciuto 10 € = 160 € → A 17,50 €**, confermando il totale intero. Il picker mostra `$`, mentre configurazione e risultato sono EUR: nessuna conversione dedotta dal simbolo.

## Checkout nativo: prove effettive e separate

Dati esclusivamente fittizi, email example.com, nome/cognome **Intuitive** per il bypass sandbox. Nessun ordine completato; nessun pagamento, gateway o piano attivato. La password storefront Dev esistente è stata usata senza modificarla e senza salvarla nelle evidenze. I blocchi precedenti dell'estensione Chrome sono stati risolti dall'utente; nessun percorso alternativo usato per aggirarli.

| Caso nativo | Subtotal | Unica tariffa osservata |
|---|---:|---|
| Soli bulbi | 30 € | B 5,90 € |
| Bulbo + arbusto | 45 € | A 11,90 € |
| Bulbo + pianta grassa | 60 € | B 7,90 € |
| Bulbi + sconosciuto, controllo sul totale | 160 € | A 17,50 € |
| A, due lati prima soglia dopo fix | 18,99 / 19,00 € | 8,90 / 11,90 € |
| B, tutti i confini standard | 49,99 / 50,00 / 149,99 / 150,00 € | 5,90 / 7,90 / 7,90 / 8,90 € |
| Palermo e Cagliari, misto campione | 45 € | A speciale 12,50 € |
| Cagliari, B ultima fascia dopo fix | 150 € | B speciale 9,50 € |
| Controesempio originale dopo fix | 18,99 € | A 8,90 € |
| Verifica finale prezzi ripristinati | 40 € | A 11,90 € |

[Registro nativo e singoli screenshot/testi](native-checkout-results.json): **21 catture**, di cui **20 con tariffa valida** (18 positive, 2 errori storici poi corretti), più 1 CAP rifiutato. **Dieci prove native dopo la correzione tutte PASS**. Non sono stati eseguiti tutti i 28 confini nel checkout: la copertura completa è Cart Tester; nel nativo sono provati la prima soglia A, tutti i confini B standard, il misto 160 € e le destinazioni campione.

Il checkout iniziale mostrava anche la tariffa dimostrativa **Standard 7 €, gratis da 55 €**. È stata **disattivata reversibilmente nel solo mercato Dev Italia**, senza eliminarla. [Baseline](dev-standard-before.txt), [prima della disattivazione](08-native-bulbs-with-default.png), [dopo, unica B](native-02-bulbs-only.png). Nessuna modifica al mercato produzione.

**CAP sintetico 00000:** Cart Tester calcola la tariffa sperimentale; Shopify mostra **“Enter a valid postal code for Cagliari”**. La tariffa ancora a schermo può essere precedente: [cattura esclusa dalle prove tariffarie native](native-06-synthetic-postcode-rejected.txt). È un limite di validazione, non la prova di una spedizione reale verso un CAP inesistente.

## Geografia, Grow, Mercati e Sendcloud

Solo tre campioni nella condizione speciale Dev: **90133 Palermo, 09124 Cagliari, 00000 sintetico**; standard come complemento, zona Domestic Italia intera. I CAP reali sono riscontrati negli elenchi [Poste Palermo](https://www.poste.it/files/1476614444505/lista-uffici-postali-abilitati-240624.pdf) e [Poste Cagliari](https://www.poste.it/uffici-postali-abilitati-servizio-consulenza.pdf). Non è una mappa completa di Sicilia/Sardegna né dei CAP disagiati. Nessuna classificazione operativa definitiva approvata o pubblicata.

**Dev Grow/CCS/Mercati:** passaggio delle tariffe Intuitive al checkout nativo dimostrato gratuitamente, nella preview Market-driven shipping. **Produzione Grow:** l'ultima verifica indipendente read-only mostrava la richiesta di abilitare CCS; nessuna attivazione eseguita. [Evidenza live separata](../development-store/live-ccs-readonly.txt). Shopify documenta [add-on CCS su Grow o entitlement con fatturazione annuale](https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates/third-party-carrier-calculated-shipping/carrier-accounts): ciclo, diritto e costo effettivo dell'account live restano da confermare. Il successo Dev non li dimostra.

**Sendcloud:** non collegata al Dev, produzione invariata. Il calcolo tariffario Intuitive resta indipendente dalle etichette; nessuna prova ordine→Sendcloud→etichetta, perché non si creano ordini reali o si collega Sendcloud live. L'assenza di interferenze introdotte non equivale a una certificazione end-to-end Sendcloud.

## Ripristino, rollback e limiti residui

Prezzi fixture **15/45/30/10 €** ripristinati; bulbo/sconosciuto salvati e confermati **dopo reload Admin**, catalogo Intuitive reimportato e riletto, ultimo checkout conferma 40 € e A 11,90 €. [Registro finale](temporary-fixture-prices.json), [bulbo](restored-bulb-price-final.txt), [sconosciuto](restored-unknown-price-final.txt), [catalogo](connection-catalog-final.txt). Nessun prezzo produzione modificato.

Per annullare il collaudo: archiviare i quattro scenari QA, riportare Sample Scenario `154768` da Archived a Published e riattivare **Standard** nel mercato Italia **del Dev**. Nessuna cancellazione necessaria. Per riprodurre il difetto diagnostico soltanto in Dev, ripristinare i limiti letterali x.99 dai read-back iniziali; non farlo in produzione e non usare quei metodi come configurazione approvata. Le fixture possono restare per il collaudo successivo.

Restano gate produttivi: CCS effettivo Grow, approvazione Sicilia/Sardegna e mappa CAP, conferma fornitore sul workaround, sconti/imposte e checkout rapido, SKU vuoti/duplicati o classi diverse fra varianti, gruppi/sedi multipli, indisponibilità provider e rollback operativo. Questi casi non fanno parte del PASS della matrice mirata. Nessun merge/deploy, modifica produzione/Sendcloud/PR #42/secret, ordine o pagamento.

**Prossimo passo operativo unico:** validare con Intuitive la rappresentazione a mezzo centesimo prima di approvare qualsiasi attivazione live. Nessun messaggio al supporto inviato in questa sessione. [Rapporto JSON](result.json) · [Manifest SHA-256](manifest.json).
