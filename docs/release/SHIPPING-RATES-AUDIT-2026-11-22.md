# Online Garden — ricognizione tariffe di spedizione Shopify (22 novembre 2026)

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

