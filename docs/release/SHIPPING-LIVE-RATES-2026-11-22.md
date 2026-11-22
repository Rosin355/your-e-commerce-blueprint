# Online Garden — tariffe Shopify live e gate isole minori (22 novembre 2026)

## Rettifica prioritaria — 22 novembre 2026: rilettura *Shopify Markets* A+B

**LA PRECEDENTE CONCLUSIONE «7 € sotto 55 € / spedizione gratuita da 55 € su tutta Italia» NON DESCRIVE IL LISTINO COMMERCIALE A+B.** Era una lettura isolata di `deliveryProfiles` (profilo generale), senza controllare le definizioni `markets.delivery.shipping.optionDefinitions`. Non usare i 7 €/0 € come tariffa commerciale certificata dei carrelli Online Garden.

### Stato LIVE verificato direttamente via Admin GraphQL (sola lettura, 22/11)
- `markets`: **Italy ACTIVE** e **Sicilia e Sardegna — Isole ACTIVE**, `shipping.isEnabled=true`, ognuno con una `DeliveryValueBasedOptionDefinition` **Standard attiva**, `freeDeliveryMinimumValue=null`. I `rateGroups` sono condizionati dalle collezioni `og-logistica-a-fallback` (A) e `og-logistica-b-approvati` (B). Paginazione di metodi, gruppi e fasce completata.
- Tariffe A **Italia**: 0–18,99 € → **8,90 €**; 19–79,99 → **11,90 €**; 80–149,99 → **12,50 €**; 150–249,99 → **17,50 €**; 250–499,99 → **36 €**; ≥500 → **54 €**.
- Tariffe A **Sicilia/Sardegna**: stesse fasce → **9,60 € / 12,50 € / 14,90 € / 17,50 € / 36 € / 54 €**.
- Tariffe B (solo bulbi/grasse approvati) **Italia**: 0–49,99 € → **5,90 €**; 50–149,99 → **7,90 €**; ≥150 → **8,90 €**.
- Tariffe B **Sicilia/Sardegna**: stesse fasce → **6,90 € / 8,90 € / 9,50 €**.
- Nessuna spedizione gratuita nelle definizioni Markets A/B; carrello misto A+B segue A, secondo la politica commerciale approvata, già collaudata live il 5 novembre. Questa rilettura API non è un nuovo checkout per tutti gli scenari.

**Origine decisionale:** [PR #45](https://github.com/Rosin355/your-e-commerce-blueprint/pull/45), Draft e non merged, ma il suo report documenta la **configurazione LIVE effettuata il 5 novembre** e sei checkout superati. [Matrice completa, ramo release b6ac09b](https://github.com/Rosin355/your-e-commerce-blueprint/blob/b6ac09b2059cff561ee36ec8ee331da4363cca4a/docs/SHIPPING-RATE-MATRIX.md). La mancata integrazione della PR non implica che le modifiche configurative Shopify siano state annullate: ora la lettura live Markets conferma gli scaglioni A+B.

**Unico gap del requisito geografico:** applicazione automatica della fascia «Isole e zone disagiate» alle **isole minori in province miste** (Elba, Lido di Venezia, Pellestrina ecc.) non verificata; nessuna deroga al supplemento è autorizzata e nessun CAP/filtro inventato. Eventuali personalizzazioni `deliveryCustomizations` non leggibili con lo scope corrente. Nessuna modifica Shopify è stata eseguita da questa rettifica.

### Distinzione fra le due superfici API

`deliveryProfiles` mostra tuttora 7 €/gratis Italia e 14,99 €/19,99 € estero nel **profilo generale**. Questo dato è reale ma non esaurisce la configurazione del checkout: Shopify Markets ha una **definizione di spedizione attiva A+B** per i mercati italiani. La priorità/tariffa finale in un carrello specifico può essere attestata solo da checkout o con API di calcolo; non dedurre la tariffa italiana effettiva dal solo profilo generale.

---



## Evidenze lette dal negozio Shopify collegato

**Negozio:** Online Garden, `ecom-blueprint-gen-6ud1s.myshopify.com`. **Metodo:** query Admin GraphQL read-only `deliveryProfiles` sulla versione 2026-10; nessuna mutation, nessuna prova d'ordine o modifica delle tariffe.

Unico profilo restituito: **Profilo generale**, `default=true`, 4 definizioni di metodo attive, tre zone:
- **Italia** (tutte le province incluse nello schema Shopify): metodo *Standard*, **7,00 EUR** per `TOTAL_PRICE` da 0 a 54,99 EUR, e **0,00 EUR** da 55,00 EUR in su.
- **UE (Unione Europea)**: metodo *Standard Internazionale*, **14,99 EUR** da 0 EUR in su, per i paesi esplicitamente assegnati a questa zona.
- **Internazionale**: metodo *Standard*, **19,99 EUR** da 0 EUR in su, per i paesi esplicitamente assegnati a questa zona.
- Paginazione: `deliveryProfiles.hasNextPage=false`, tre zone e metodi non paginati (`hasNextPage=false`).
- La query read-only `carrierServices` ha restituito **zero** servizi.

**Importante:** il vecchio preventivo Roma **8,90 EUR** registrato nella checklist SEO del 12 novembre non equivale all'attuale tariffe generali Shopify, che risultano **7,00 EUR** sotto soglia. Questo scarto è una differenza temporale/di metodo da collaudare, non un cambio applicato da questa verifica.

## Isole e limitazioni

Il profilo generale non contiene zone specifiche per Sicilia, Sardegna o isole minori né una distinzione per CAP/località; poiché tutte le province italiane appartengono alla zona Italia, **la regola tariffaria base applicabile** a Elba (LI), Ischia/Capri/Procida (NA), Eolie (ME), Tremiti (FG), Ponza/Ventotene (LT), Sicilia e Sardegna è **7,00 EUR sotto 55 EUR / 0,00 EUR da 55 EUR**. Questa deduzione è basata **solo sulle regole del profilo**: non è una prova di preventivo finale con quei CAP.

La query `deliveryCustomizations` è stata **negata** per mancanza dello scope `read_delivery_customizations`. Non è possibile attestare la presenza/assenza o gli effetti di personalizzazioni che nascondano/modifichino le opzioni di spedizione. Mancano anche prove checkout su CAP reali delle isole e conferma delle tariffe contrattuali del corriere/Sendcloud. **Non presentare come certificato l'importo finale per tutte le isole.**

## Decisioni necessarie

1. Marco deve confermare per iscritto se vuole una tariffa speciale per **tutte le isole minori**, e indicare importi/soglie e lista delle località/CAP rilevanti secondo il proprio corriere.
2. Verificare in sola lettura nell'Admin Shopify eventuali personalizzazioni, con titolare munito di permessi adeguati, e testare con checkout/profilo di indirizzo di prova almeno: Roma, Palermo, Cagliari, Portoferraio, Capri, Ischia, Lipari, Ponza e Tremiti; registrare gli importi **senza completare pagamento**.
3. Proporre una soluzione che distingua correttamente CAP/località (Shopify shipping zones a sola provincia non bastano) e valutarne limiti, disponibilità del piano, costi e compatibilità con Sendcloud; **nessuna app o Shopify Function aggiunta senza autorizzazione**.
4. Eseguire nuova lettura e collaudo prima/dopo eventuale modifica, con rollback e consenso esplicito.

## Stato progetto

Resta la SAL complessiva originale **57,75%, arrotondata al 58%**. Admin V2 `r2` è pubblicato, accettazione di Marco pendente. Area clienti: 5/8 controlli finali, tre prove con identità reali controllate. Aperte inoltre: DNS Cloudflare e redirect 301, testi legali, notifiche, acquisto E2E, accessibilità Safari/iOS completa e permessi Shopify personali di Marco. Ordini WooCommerce: **0/953**, `BLOCKED_SOURCE_UNAVAILABLE`.

Fonti Shopify: [Delivery Profiles Admin GraphQL](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/deliveryProfiles). Fonti progetto: [checklist](PROJECT-CLOSEOUT-CHECKLIST.md), [SAL](SAL-2026-11-21.md).
