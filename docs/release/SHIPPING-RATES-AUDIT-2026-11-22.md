# Online Garden — ricognizione tariffe di spedizione Shopify (22 novembre 2026)

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



**Tipo controllo:** sola lettura Admin GraphQL 2026-10 sul negozio connesso `ecom-blueprint-gen-6ud1s.myshopify.com` (Online Garden, EUR, Italia). Nessuna tariffa, policy o configurazione è stata modificata. Valori rilevati da `deliveryProfiles`, non ricostruiti da screenshot o note precedenti.

## Tariffe effettivamente configurate nel profilo generale

Il negozio espone **un solo profilo** `Profilo generale` (default) e **4 metodi di spedizione attivi**; le zone/metodi letti sono completi (`hasNextPage=false`). Prezzi base in EUR:

| Zona | Metodo | Condizione `TOTAL_PRICE` | Prezzo |
| --- | --- | --- | ---: |
| Italia | Standard | Da 0,00 € fino a 54,99 € inclusi | **7,00 €** |
| Italia | Standard | Da 55,00 € in su | **0,00 € (gratuita)** |
| UE (paesi configurati) | Standard Internazionale | Da 0,00 € in su | **14,99 €** |
| Internazionale (altri paesi configurati) | Standard | Da 0,00 € in su | **19,99 €** |

Le regole Shopify sono condizioni sul **totale dell'ordine**, non sul peso; non sono emerse ulteriori fasce di prezzo nel profilo osservato. Le zone estere coprono soltanto i paesi esplicitamente inclusi; non dedurre una spedizione in ogni nazione.

### Sicilia, Sardegna e isole minori

La zona `Italia` include tutte le province italiane, senza una zona speciale separata per Sicilia, Sardegna o le isole minori. Ne consegue che **le tariffe di base** per queste località sono quelle italiane (7 €/0 €), salvo modifiche del checkout non leggibili con i permessi disponibili. La verifica per CAP/località di isole minori (Elba, Capri, Ischia, Procida, Eolie, Egadi, Ponza, Tremiti, Lampedusa, Pantelleria e simili) resta **NON ATTESTATA**. Le province continentali possono includere isole, quindi una regola che si basi soltanto sulla provincia non basta a distinguerle.

### Ambito e limiti della lettura

- `carrierServices`: **0** servizi registrati nella query corrente (niente tariffazione corriere dinamica tramite i servizi elencati).
- `deliveryCustomizations`: **accesso negato**: manca lo scope `read_delivery_customizations`. Non sappiamo se siano presenti Shopify Functions o personalizzazioni di consegna; **non** affermare che siano assenti.
- Eventuali sconti di spedizione, combinazioni di carrello, mercati, prodotti particolari o personalizzazioni del checkout possono determinare un importo effettivo diverso dalle tariffe base. Non si è creato un ordine e non si è completato un preventivo per ogni CAP.
- **Differenza rispetto al verbale del 12 novembre:** quel verbale registrava un preventivo standard Roma di **8,90 €**. Il profilo generale letto oggi riporta **7,00 €** fino a 54,99 € e 0 € da 55 €. La differenza non è spiegata dalla sola fotografia corrente; evitare di presentare 8,90 € come tariffa base attuale senza un nuovo riscontro.
- La homepage pubblica rimanda alle opzioni nel checkout e non riporta nel testo una tabella tariffaria pubblica: comunicazione commerciale da validare.

**Riferimento tecnico Shopify:** [Admin GraphQL `deliveryProfiles` 2026-10](https://shopify.dev/docs/api/admin-graphql/2026-10/queries/deliveryProfiles).

## Decisioni per Marco / release gate

1. Confermare il listino desiderato per Italia continentale, Sicilia/Sardegna e **tutte** le isole minori; confermare la soglia di gratuità e se debba valere per i territori speciali.
2. Ottenere conferma documentata delle eventuali personalizzazioni di consegna in Shopify Admin; chiedere l'accesso minimo di sola lettura o un controllo assistito dal titolare, non ampliare scope senza consenso.
3. Progettare la distinzione per CAP/località dove necessaria, senza introdurre nuove app/costi non concordati; verificare compatibility del checkout nativo e dei prodotti reali.
4. Eseguire **preventivi fino alla schermata della tariffa**, senza completare ordini, con indirizzi di prova rappresentativi e non personali: Roma, Milano, Palermo, Cagliari, Portoferraio (Elba), Capri, Ischia, Lipari e Pantelleria. Registrare la tariffa effettivamente proposta e confrontarla con il listino approvato.
5. Solo dopo approvazione commerciale, autorizzare modifiche circoscritte a tariffe/policy; test di regressione per regioni, soglie e carrelli diversi.

**Stato:** `SHIPPING_SPECIAL_ISLANDS_NOT_CLOSED`. Nessuna modifica Shopify/deploy/DNS. SAL generale originale **57,75% ≈ 58%** invariata.

## Checkpoint di consegna generale

- Admin V2 r2 online; **accettazione personale Marco aperta**.
- Clienti Shopify ospitati operativi; **OTP/scadenza, logout/riaccesso e isolamento con 2 profili reali** aperti.
- Cloudflare/DNS e redirect HTTP 301 storici non ancora attivati; 16 mapping proposti non approvati.
- Tariffe isole minori non verificate come listino speciale (**questo audit**).
- Testi termini, resi, spedizioni, cookie/consensi e dati societari da approvare.
- Ordine pagato E2E controllato, ricezione notifiche e integrazione fulfillment/Sendcloud ancora da dimostrare.
- Verifiche device Safari/iOS fisico, recupero staff, QA finale e handoff.
- Storico WooCommerce 0/953 transazioni importate e 0/857 clienti riconciliati, causa fonte incompleta `BLOCKED_SOURCE_UNAVAILABLE`; richiede decisione sul perimetro.

