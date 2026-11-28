# Espansione massiva redirect WooCommerce -> Shopify · 28 novembre 2026

**Esito del 28 novembre, successivo ai dati riportati sotto.** Registro definitivo di 1.410 percorsi, 1.113 APPROVED, 72 REVIEW e 225 BLOCKED. Il Worker esistente usa due route generali nel pacchetto preparato. Un solo percorso risponde con 301 diretto sull’apex. Sul www è misurato un passaggio intermedio. Le indicazioni storiche sui 16 prodotti e sulle route per singolo percorso sono superate dal [fascicolo massivo](../recupero-massivo/).

## Stato verificato

**PILOTA APEX PASS (HTTP)**. Test HTTP fornito dal titolare il 28/11/2026 ore 14:45:47 GMT:

```text
GET https://onlinegarden.it/prodotto/rose/rosa-jasmina-rampicante/?utm_source=test301
HTTP/2 301
location: https://onlinegarden.it/products/rosa-jasmina-rampicante?utm_source=test301
cache-control: no-store
server: cloudflare
```

Le precedenti schermate mostravano PDP corretta, parametri UTM conservati e sito accessibile con apex Proxied; il titolare ha riferito di aver attivato anche www, ma **manca ancora prova HTTP della route www**. Il pilota prova un solo vecchio percorso e non attesta gli altri 15 o il resto del catalogo. Nessuna modifica a Shopify, ordini o prodotti.

## Matrice e opportunita di recupero (lettura diretta dei CSV della PR #82)

- 1.354 prodotti principali Woo; 1.364 Shopify.
- 1.189 Woo con identita Shopify **esatta per SKU**; 79 ambigui, 85 assenti, 1 probabile.
- GSC: 1.380 URL osservati, 1.274 percorsi distinti (query e www compresi nell'inventario).
- 16 percorsi gia verificati individualmente e configurati nel pacchetto originario.
- **1.058** ulteriori prodotti con identita esatta SKU **e** un possibile percorso storico osservato in GSC.
- Quei 1.058 corrispondono a **1.053** percorsi distinti, di cui **5 collidono** fra due ID Woo ciascuno: `echinocactus-grusonii`, `aloe-aristata`, `crassula-arborescens`, `astrophytum`, `crassula-capitella` (vedere il percorso completo nella matrice). **Escludere queste cinque collisioni**.
- Risultano dunque **1.048 vecchi percorsi con una sola identita Woo per percorso** da sottoporre a corroborazione automatica, **non ancora approvati**; se tutti verificati, insieme ai 16 gia documentati, il totale massimo sarebbe **1.064 percorsi**, non un risultato conseguito.
- 115 prodotti con SKU esatto non hanno nel CSV un percorso GSC candidato; non creare un redirect indovinando URL.
- Le righe GSC non validate sono generalmente `UNRESOLVED` / `IDENTITY_REQUIRED`: lo SKU esatto identifica il prodotto ma non da solo il permalink storico. Il frammento backup TAR esaminato il 12 novembre e' troncato; non contiene un archivio SQL ripristinato con permalink originali.

## Piano di implementazione: un Worker, due route generali, allowlist esatta

Cloudflare limita le route per zona a 1.000; un approccio di due route per ogni prodotto non scala. **Riutilizzare** il Worker attivo `onlinegarden-301-redirects`, senza creare Workers e senza allargare la superficie all'intero sito. Proposta per la fase massiva:

- `onlinegarden.it/prodotto/*`
- `www.onlinegarden.it/prodotto/*`

Cloudflare fa match su prefissi incluso query, ma il **Worker deve imporre match letterale** di pathname e host e operare solo su allowlist approvata. Gestire conflitto con eventuali route specifiche del pilota: le route piu specifiche prevalgono; mantenere il pilota invariato finche la sostituzione non e' verificata. Non agganciare `/*`, checkout o altri URL.

Il Worker deve:
1. Consentire solo GET/HEAD, URL su host ammessi e pathname storico esatto; non usare fuzzy redirect nel runtime.
2. Usare mappa `oldPath -> newUrl` deduplicata e approvata con SKU/GID, old path GSC e dati di prova; nessun mapping a homepage.
3. Conservare parametri UTM `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (anche ripetuti) e ignorare `attribute_dimensioni`; le query sconosciute vanno all'origine, mantenendo comportamenti legacy e sicurezza.
4. Restituire **301** con `Location` HTTPS/canonical Shopify e `Cache-Control: no-store`; evitare redirect su dest non indexable/404, loop e catene.
5. Per percorsi non approvati e metodi diversi da GET/HEAD, **pass through all'origine** via `fetch(request)`, con test reale su 404 e query sconosciute prima di ampliare le route. Validare limiti Workers Free e rollback.
6. Nessun lookup Shopify/Gemini su richiesta HTTP: la mappa dev'essere deterministica, costruita e verificata prima del deployment.

## Sblocco della copertura massiva senza inventare prove

1. Leggere `matrice-prodotti.csv`, `LEGACY-URL-REDIRECT-MAP.csv`, `infra/seo/redirect-candidates.json`, eventuale export Woo originario (non dati clienti), inventario SKU e snapshot Shopify Admin privato autorizzato.
2. Generare una tabella `old_path, woo_id, sku, shopify_gid, new_url, evidence_urls, confidence, reason, qa_status`.
3. Corroborare percorso: esistenza in GSC, segmenti e categoria storico Woo, slug dell'export/inventario, identita Woo ID e SKU, unicita percorso (escludere 5 collisioni). **Confronto di solo slug NON e' prova sufficiente**; in assenza di prova indipendente, `REVIEW`/non pubblicare.
4. Per ogni destinazione: associare GID a handle Shopify con fonte autorizzata; test HTTP diretto 200, canonical coincidente, nome/H1 e Product JSON-LD coerenti, assenza di noindex e redirect loop, prodotto reale non draft. In caso di prodotto rimosso: non puntare alla homepage, classificare separatamente 404/410 o equivalente reale.
5. Distinguere `APPROVED`, `REVIEW`, `BLOCKED`; scrivere un report aggregato e uno per riga, senza inventare conteggi o scavalcare un approvatore. Non trattare i 1.048 come automaticamente approvati.
6. Compilare una build del Worker con solo gli `APPROVED`; aggiungere test di 301, `Location`, UTM, no redirect sulle query estranee, 404 pass-through, www, HTTP/HTTPS, prodotti fuori scope, checkout non toccato e rollback.
7. Rilasciare **per lotti** (es. prima 50, poi il resto dopo monitoraggio), con versionamento dell'allowlist, ricevuta Worker e rollback alla versione pilota. Prima di estendere a www, verificare il primo hop reale per evitare catene.
8. Verificare Google Search Console e gli errori 404/5xx; sorvegliare anche quota Workers Free 100.000 richieste/giorno e CPU disponibile. Questo non certifica che il negozio resti entro le quote: misurarlo.

**Se un vecchio permalink/identita non e' documentabile**, restare in stato `REVIEW`; un redirect scorretto e' piu dannoso di un 404 da chiarire. Dati clienti e ordini fuori da questo processo.

## Comandi di collaudo gia disponibili

```sh
python3 infra/seo/check-redirect-http.py --pilot --expect-active
python3 infra/seo/check-redirect-http.py --expect-active
```

Questi test esistenti coprono il fascicolo iniziale da 16 percorsi. **Non dichiararli prova degli ulteriori URL**; estenderli al manifest massivo, conservando tutte le evidenze di primo hop e destinazione.

## Stato e titolarita

Stato progetto: **PENDING_CLIENT_ACCEPTANCE**, SAL **57,75%**. L'attivazione del primo percorso apex non completa il recupero. Il token Lovable Cloudflare API e' **Read-only**: non puo distribuire in autonomia il Worker o creare route. L'utente ha autorizzato il completamento della migrazione SEO, ma ogni batch deve restare tracciabile e reversibile. Per ora codice massivo non distribuito.

Documentazione da mantenere: questo file, README SEO della PR #82 e `docs/PROJECT_STATUS.md`; fonti sensibili o backup privati mai nel repo.

Fonti Cloudflare: https://developers.cloudflare.com/workers/configuration/routing/routes/ ; https://developers.cloudflare.com/workers/platform/limits/ .
