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

## Riscontro corrente del 22 novembre

I 69 preventivi Storefront su 23 destinazioni verificano una sola opzione per ogni carrello A, B e misto. Sono corretti 42 importi. Le 27 difformità riguardano nove destinazioni insulari di province con terraferma. In checkout sono stati riletti i nove importi sulle coppie positive e negative di Portoferraio, Livorno e Lipari. In ordine A/B/misto, Portoferraio e Livorno mostrano 8,90 / 5,90 / 11,90 €, mentre Lipari mostra 9,60 / 6,90 / 12,50 €. Il CAP, la città e la provincia effettivamente selezionati sono stati verificati dopo il ricalcolo. La decisione commerciale è acquisita. [Dettaglio tecnico e fonti](SHIPPING-MINOR-ISLANDS-DECISION-2026-11-22.md) · [Dati minimizzati](evidence/shipping-islands-2026-11-22.csv)

La lettura del profilo generale documentava separatamente Standard 7 €/0 € e tariffe estere. Restano metodi di quel profilo. Il costo italiano applicato ai carrelli sopra è quello osservato al checkout. Il piano Grow, le possibilità del selettore, i limiti degli scope e il rollback sono descritti nel dossier tecnico. Non sono state eseguite modifiche a metodi, collezioni o varianti.
