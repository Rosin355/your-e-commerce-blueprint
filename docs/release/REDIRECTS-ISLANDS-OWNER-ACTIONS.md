# Redirect e spedizioni isole — azioni del proprietario

Aggiornamento: 12 novembre 2026. Romesh gestisce le attivita tecniche; Marco eseguira l'accettazione domani, 13 novembre. Non riaprire Admin, registrazione o permessi per rispondere a questi due punti.

Questa nota non modifica DNS, tariffe, prodotti o stato delle approvazioni. Si basa sulla checklist di rilascio e sulle fonti ufficiali consultate; non contiene una nuova verifica checkout autenticata.

## Stato essenziale

| Tema | Stato documentato | Azione |
| --- | --- | --- |
| SEO iniziale | Pubblicato e collaudato nel rilascio del 12 novembre | Non rifare il Publish solo per approvare i mapping |
| Redirect | 16 corrispondenze proposte; zero approvate e zero attive | Romesh rivede/approva la tabella; poi si configura un livello HTTP effettivo |
| Sicilia e Sardegna | A/B configurate e checkout gia collaudati; configurazione preservata nell'ultimo rilascio | Non riscrivere importi o creare tariffe duplicate |
| Elba, Lido, Pellestrina e altre isole minori | Tariffa speciale non dimostrata nella configurazione corrente | Verificare personalizzazioni Shopify e meccanismo per destinazione prima di modificarle |

Fonti progetto: [checklist di chiusura](PROJECT-CLOSEOUT-CHECKLIST.md), [preparazione HTTP](../../infra/seo/README.md), [matrice shipping](https://github.com/Rosin355/your-e-commerce-blueprint/blob/codex/shopify-shipping-rates/docs/SHIPPING-RATE-MATRIX.md).

## Redirect 301

Le 16 corrispondenze possono essere approvate dal proprietario; non richiedono di attendere il test Admin di Marco o il backup SQL integro. L'approvazione commerciale delle corrispondenze resta distinta dal consenso al cambio infrastrutturale. Non includere i tre casi incerti o tutti i percorsi per somiglianza.

Il traffico pubblico del sito arriva a Lovable: inserire regole soltanto nel vecchio hosting o nell'Admin Shopify non dimostra che le richieste del dominio le attraversino. I record DNS da soli non contengono regole per percorso.

Proposta da approvare: Cloudflare Free con Bulk Redirects davanti a Lovable. Le fonti ufficiali attuali indicano Bulk Redirects anche sul piano Free, con quota di 10.000 URL per account, e richiedono proxy dei record interessati. Lovable documenta la connessione con CDN/reverse proxy, con impostazione avanzata e valori CNAME forniti per il progetto. Non e una risorsa gia installata o un'attivazione autorizzata da questa nota; il solo header Cloudflare del sito non prova il controllo di un account Cloudflare.

Passo immediato di Romesh: accedere alla gestione IONOS del dominio e visualizzare/esportare DNS e nameserver, senza modificarli. Prima di eventuale passaggio a Cloudflare occorre confrontare tutta la zona, preservare posta/MX/SPF/DKIM/DMARC, sottodomini, verifiche, impostazioni DNSSEC e SSL, annotare rollback e usare i valori origin forniti da Lovable. Non inserire nameserver generici o attivare l'inoltro indiscriminato del dominio. Il dominio non deve essere trasferito a un altro registrar per usare un proxy, ma il cambio di gestione DNS resta un intervento da autorizzare.

Dopo approvazione e setup: installare esclusivamente i mapping approvati, gestire apex/www e query coerentemente con le regole preparate, verificare GET/HEAD 301 e destinazione valida 200 senza loop. Non creare cache generiche per Admin, autenticazione o carrello. Nessuna garanzia di 301 operativo dal solo merge/Publish.

## Spedizioni

La lacuna riguarda il riconoscimento della destinazione, non una nuova tabella prezzi. Il sottomercato Sicilia/Sardegna distingue province; non identifica automaticamente un'isola che condivide provincia con localita continentali. Non aggiungere Livorno o Venezia intere al mercato speciale e non cambiare gli importi gia approvati.

Passo immediato di Romesh, in sola lettura: Shopify Admin -> Impostazioni -> Spedizione e consegna -> Personalizzazioni consegna (Delivery customizations). Rilevare eventuali regole, stato e app che le fornisce. Se la sezione manca o e vuota, segnalarlo senza installare app o attivare regole per tentativi. La lettura via API era bloccata dallo scope read_delivery_customizations mancante: non e una prova di assenza delle regole.

Per controllare le tabelle gia attive: Mercati -> Sicilia e Sardegna - Isole -> opzione Standard, secondo la configurazione del progetto. Mantenere A/B nella stessa opzione e la gratuita disabilitata. La verifica di personalizzazioni non equivale ad aver configurato le isole minori.

Serve un meccanismo compatibile con il checkout attuale che riconosca CAP/localita o indirizzi senza applicare supplementi al continente. Non presumere che ogni CAP sia esclusivamente insulare o che qualsiasi delivery customization possa generare nuovi prezzi. Nessuna nuova app a pagamento, upgrade, supplemento automatico Sendcloud o regola nel solo frontend costituisce una soluzione approvata.

La decisione commerciale vigente rimane tariffa speciale per tutte le isole; non ripristinare la vecchia deroga provinciale. Se non esiste un meccanismo disponibile, il requisito resta esplicitamente incompleto e va presentata una soluzione con compatibilita/costi verificati, non un falso PASS.

## Fonti ufficiali consultate

- Lovable, CDN/reverse proxy: https://docs.lovable.dev/features/custom-domain#advanced-use-a-cdn-or-reverse-proxy
- Cloudflare, Bulk Redirects e limiti: https://developers.cloudflare.com/rules/url-forwarding/
- Shopify, opzioni spedizione per Mercati: https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/understanding-shipping-options-by-market
- Shopify, personalizzazioni consegna: https://help.shopify.com/en/manual/checkout-settings/checkout-customization
- Shopify, tipi di mercato: https://help.shopify.com/en/manual/markets/getting-started/market-types

Nessuna mutazione produttiva, nessuna nuova approvazione, nessuna nuova lettura delle sessioni personali e nessun costo introdotto da questo aggiornamento documentale.
