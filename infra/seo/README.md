# Preparazione redirect HTTP — NON PUBBLICATA

`redirect-candidates.json` contiene 16 corrispondenze tecniche ad alta confidenza, tutte con `reviewApproved=false`. Il gate globale è `enabled=false`, `approvalReference=null`. Il modulo restituisce quindi sempre il controllo all'origine; non può attivarsi tramite merge o build Vite.

## Livello infrastrutturale

Il sito attuale è una SPA React/Vite su hosting Lovable. Un `<Navigate>`, `location.replace` o una regola React non costituiscono un HTTP 301. Non viene aggiunto un file `_redirects`: non è dimostrato che l'hosting Lovable lo interpreti. La [documentazione domini Lovable](https://docs.lovable.dev/features/custom-domain#primary-domain) descrive il primary domain con **302**, senza supporto del 301 permanente tra domini collegati; il `302 www → apex` è stato osservato anche sul sito.

Per un vero 301 per percorso serve un livello HTTP controllabile **prima** della SPA: reverse proxy/CDN già gestito dal proprietario o regola server supportata e confermata dal provider. Lovable documenta [l'uso con CDN/reverse proxy](https://docs.lovable.dev/features/custom-domain#advanced-use-a-cdn-or-reverse-proxy). Il solo header `server: cloudflare` non dimostra che esista una zona Cloudflare controllata dal proprietario o un Worker configurabile.

`worker.mjs` è un adattatore di preparazione per un edge esistente, basato sulle API standard Request/Response e sul [modello Cloudflare per redirect](https://developers.cloudflare.com/workers/examples/redirect/). Non esistono binding, `wrangler.toml`, credenziali, workflow di pubblicazione o nuove risorse. Non è una configurazione già installabile sul solo hosting Lovable. La disponibilità e la precedenza delle [route HTTP](https://developers.cloudflare.com/workers/configuration/routing/routes/) devono essere confermate nel change di pubblicazione, senza cambiare DNS in questa PR.

## Revisione richiesta

1. Marco/proprietario rivede i 16 mapping in `docs/seo/LEGACY-URL-REDIRECT-MAP.csv` e l'evidenza SKU/ID. HIGH significa confidenza tecnica, non approvazione commerciale. Le sorgenti CSV non contengono permalink/post_name: il collegamento al vecchio percorso GSC è corroborato da categoria e basename delle immagini, poi da SKU, GID e varianti reali. Nessun match basato sul solo titolo.
2. Confermare sul provider già in uso che le regole possano precedere il 302 host per **entrambi** `onlinegarden.it` e `www.onlinegarden.it`. In caso contrario rimarrebbe `302 + 301`: non presentarlo come singolo hop.
3. Autorizzazione specifica con riferimento al change, mapping revisionato e destinazioni ricontrollate. Solo quel successivo change può valorizzare i gate e associare l'adattatore al provider; questa PR non lo fa.
4. Eseguire QA HTTP su GET/HEAD, `Location` canonica diretta, assenza di loop e pagine valide; nessun test di acquisto. Le sole query Woo `attribute_dimensioni` vengono rimosse; i parametri UTM consentiti sono preservati. Query sconosciute/action, POST e rotte nuove restano all'origine.
5. Dopo rilascio autorizzato, monitorare e conservare configurazione precedente per rollback. Disabilitare la route/gate per tornare all'origine; non cancellare prodotti, migrazioni o dati per il rollback SEO.

I restanti URL non ricevono regole globali. Un mapping assente non prova che il prodotto sia stato rimosso. Se il proprietario conferma la rimozione senza sostituto, il livello HTTP deve fornire 404/410; questa preparazione non assegna 410 a prodotti incerti e non modifica il catch-all generale.
