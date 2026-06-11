## Diagnosi

- L’errore del sito non è generico: nei log dell’Edge Function `shopify-admin-proxy` Shopify risponde:
  - `Invalid API key or access token (unrecognized login or wrong password)`
- Quindi il problema attuale è il token Admin usato dal backend per pubblicare/aggiornare prodotti.
- Nel progetto attuale esistono già questi secret:
  - `SHOPIFY_ACCESS_TOKEN`
  - `SHOPIFY_ONLINE_ACCESS_TOKEN:...`
  - `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
  - manca `SHOPIFY_ADMIN_API_TOKEN`

## Chiarimento sulla schermata Shopify che hai allegato

Quella schermata non è la vecchia procedura “Custom App → Admin API integration → Install app”.

È il nuovo sistema Shopify con:

- `ID client`
- `Segreto`
- endpoint OAuth:

```text
POST https://{shop}.myshopify.com/admin/oauth/access_token

grant_type=client_credentials
client_id=...
client_secret=...
```

Questo genera un token `shpat_...`, ma non è permanente: Shopify indica `expires_in: 86399`, quindi dura circa 24 ore. La differenza è che il backend può rigenerarlo automaticamente usando `client_id` + `client_secret`, senza che il cliente torni ogni giorno in Lovable.

## Piano di correzione

1. **Aggiungere supporto al nuovo flusso Shopify client-credentials**
   - Aggiornare il client Shopify backend centralizzato.
   - Se sono presenti `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET`, il backend chiederà automaticamente un nuovo `shpat_...` a Shopify.
   - Il token verrà usato con header corretto:

```text
X-Shopify-Access-Token: shpat_...
```

2. **Non dipendere più dal token OAuth Lovable giornaliero**
   - L’ordine di priorità diventerà:
     1. `SHOPIFY_ADMIN_API_TOKEN`, se presente, per token Custom App manuale/permanente.
     2. `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`, per generare automaticamente uno `shpat_...`.
     3. `SHOPIFY_ONLINE_ACCESS_TOKEN:*`, solo come fallback.
     4. `SHOPIFY_ACCESS_TOKEN`, solo come ultimo fallback.

3. **Applicare la stessa logica anche alla lista prodotti admin**
   - C’è un punto nel proxy che legge il token direttamente invece di usare il client centralizzato.
   - Lo allineerò alla nuova logica, così non resta un percorso che usa token vecchi/scaduti.

4. **Aggiungere secret necessari**
   - Serviranno questi due secret runtime:

```text
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
```

   - Li inserirai dal form sicuro di Lovable, non in chat.
   - Il `client_id` è quello visibile nella schermata.
   - Il `client_secret` è il “Segreto” della schermata Shopify.

5. **Validare dopo l’implementazione**
   - Testare la chiamata all’Edge Function.
   - Controllare i log per confermare che non compaia più `Invalid API key or access token`.

## Risultato atteso

Il cliente non dovrà più rigenerare manualmente un token ogni giorno. Il backend userà le credenziali dell’app Shopify per ottenere automaticamente un token valido quando serve, come nel progetto precedente.