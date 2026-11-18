# Shopify Customer Accounts — implementazione isolata

16 novembre 2026. Branch `codex/shopify-customer-auth`, base main `acb2f78450c86ad224d8c55786b83e16d43def28`. Riferimenti architetturali: [PR #54](https://github.com/Rosin355/your-e-commerce-blueprint/pull/54), documenti `customers-auth-architecture-2026-11-16.md` e `customers-auth-risk-test-matrix.md` al commit `20dfd73`. Le PR #53/#54 non sono dipendenze Git né vengono modificate.

## Selezione del percorso

`VITE_SHOPIFY_CUSTOMER_AUTH_ENABLED` richiede esattamente la stringa `true`; assente, `false`, `TRUE`, `1` mantengono OFF. Il valore è risolto **durante la build**, non è un toggle remoto o un permesso. Nessun valore attivo è stato aggiunto ai file di ambiente. Con OFF vengono montati gli stessi componenti Supabase preesistenti nelle route `/auth`, `/account` e `/account/callback`; il checkout e i percorsi Admin restano quelli di main. Il nuovo codice non effettua discovery o richieste in background quando OFF.

Con ON i wrapper montano le pagine in `src/customer/CustomerPages.tsx`; `/account/logout` completa il ritorno dall'IdP. La configurazione mancante provoca una schermata generica di indisponibilità. Il nuovo modulo non importa Supabase, lo store Shopify precedente o le funzioni Admin. Nessun nuovo `/admin/login`, modifica a useAuth, utenti, ruoli, RLS o backend.

## Configurazione da predisporre, esclusivamente nell'ambiente di prova autorizzato

| Variabile build | Valore da ottenere e verificare |
| --- | --- |
| `VITE_SHOPIFY_CUSTOMER_AUTH_ENABLED` | `false` predefinito; `true` soltanto per la build di prova autorizzata |
| `VITE_SHOPIFY_CUSTOMER_STOREFRONT` | Origine HTTPS del negozio di prova, senza slash finale/path/query |
| `VITE_SHOPIFY_CUSTOMER_ISSUER` | Issuer esatto dell'OIDC discovery del negozio; da verificare privatamente, non dedurre da un client ID |
| `VITE_SHOPIFY_CUSTOMER_CLIENT_ID` | Client pubblico Customer Account del canale Headless/Hydrogen; nessun client secret |

Occorre confermare Customer Accounts abilitati, client **pubblico storefront**, origine JavaScript HTTPS, callback esatto `https://<origine-prova>/account/callback`, logout esatto `https://<origine-prova>/account/logout`, scope `openid email customer-account-api:full`, CORS e accesso ai dati protetti necessari. Non usare un client Admin OAuth o un generico app client supponendo che supporti refresh. Non sono state lette/modificate impostazioni live. Nessuna credenziale inventata. Un server HTTPS di prova deve gestire i fallback SPA sulle route callback/logout; `http://localhost` non è il percorso accettato da questa implementazione.

## Protocollo e gestione dati

`oauth4webapi` 3.8.8 gestisce state, PKCE S256, scambio code e controlli OIDC; `jose` 6.2.17 verifica firma RS256 con JWKS, issuer, audience, exp/iat/sub. È stata scelta una allowlist RS256: un algoritmo diverso nel client reale richiede una modifica revisionata, non un fallback permissivo. Il nonce viene verificato durante lo scambio. Discovery OIDC e Customer Account API sono distinte; issuer deve corrispondere alla configurazione e gli endpoint devono essere HTTPS Shopify o del negozio configurato. Nessuna dipendenza dal fallback hardcoded 2025-07 del vecchio helper.

Transazione OAuth monouso in sessionStorage, TTL 10 minuti; callback controlla origine/path e rimuove i parametri dall'URL prima dello scambio. Un callback replay invalida lo stato customer. Sessione e transazione usano soltanto chiavi `og.customer.*`; il codice non pulisce lo storage globale. Dopo scambio/restore il profilo deve fornire un Shopify Customer ID stabile; sul refresh e sulle pagine successive un ID diverso causa rifiuto. Non viene ricercato alcun cliente per email/telefono e nessun UUID Supabase è equiparato al Customer ID.

Sessione: access/refresh/ID token in memoria e sessionStorage nella stessa tab; nessun profilo/ordine persistito. Ripristino validato con firma e query customer-scoped; scadenza verificata con margine di 60 secondi e refresh single-flight. Una risposta senza refresh non eredita token dell'account precedente. Refresh che non fornisce un ID token nuovo mentre il precedente è scaduto richiede nuovo login: comportamento conservativo da verificare sul client storefront reale. Se il client non supporta refresh, scadenza => nuovo accesso volontario; nessun iframe o rinnovo implicito non supportato. Controllo ogni 30 secondi e al focus della finestra, soltanto quando le pagine cliente sono montate.

Ordini: unica query `customer { id ... orders(first:20, after:...) }`, paginazione esplicita con “Carica altri ordini”, senza Admin API/fallback. Profilo in sola lettura, riepilogo ordine con numero/data/importo; non implementati modifica profilo/indirizzi, resi o dettaglio righe ordine. Nessun marketing o consenso modificato. Errori di rete/API non diventano “nessun ordine”.

Logout pulisce subito dati/token locali e usa `end_session_endpoint` con ID token e URI ammesso. Un marker impedisce di ripristinare la sessione quando l'uscita remota non è confermata; il rientro al logout lo rimuove. Una risposta tardiva non ripristina dati dopo cambio identità/logout. Non è un logout globale di tutti i dispositivi; sessioni di altre tab/browser e sessioni Supabase sono distinte. Dati di un'altra tab già aperta richiedono il collaudo esplicito della semantica IdP. La pulizia locale non garantisce revoca di URL checkout già emessi.

## Confini Admin e checkout

Il login di Marco e quello degli operatori **non vengono modificati**. Con flag OFF `/auth` resta quello preesistente. Con ON `/auth` diventa il percorso Shopify: gli operatori che usano questa route pubblica devono essere censiti e verificati prima di qualsiasi attivazione. L'incongruenza preesistente tra AdminLogin admin-only e ruoli Admin V2 non viene corretta qui. **Se il collaudo dimostra necessaria una modifica al login staff, fermare l'attivazione e chiedere una decisione separata; non introdurre un secondo Admin.** Non è stato effettuato un login reale di Marco o degli operatori.

`src/lib/shopify-checkout.ts`, `cartStore.ts` e `CartDrawer` sono invariati. L'area cliente Shopify non viene passata automaticamente al checkout; il checkout mantiene il proprio comportamento/sessione. Non promettere SSO o corrispondenza automatica dell'identità tra account e checkout. Associazione `buyerIdentity` e lifecycle del cart/checkout URL restano lavoro separato prima di proporre un'esperienza unificata. Nessuna mutation carrello/cliente è stata eseguita in questa attività.

Il vecchio bridge `get-customer-orders` resta presente per preservare il comportamento OFF e non è usato dal nuovo percorso. Il rischio statico già documentato nella #54 resta aperto sul percorso legacy: questa PR non lo risolve e non è un'autorizzazione al rilascio pubblico della migrazione auth.

## Sicurezza, prove e rollback

SessionStorage non protegge da XSS e può essere copiato fra tab aperte dall'opener: review CSP/script terzi/dipendenze e dispositivi condivisi necessaria. Nessun token va in log, toast, query d'ordine o telemetry; evitare raccolta URL callback/referrer prima della pulizia. Il modulo emette solo messaggi generici, senza body o errori provider. L'ID token nel logout è richiesto dal protocollo: le URL di navigazione IdP non devono essere registrate nei sistemi analytics.

Test: `npm run test:customer-auth`; suite Node completa `node ci/run-domain.mjs node`; suite Deno `node ci/run-domain.mjs deno ci/deno-ci.lock`; `npm run typecheck`, `npm run build`. Fixture in memoria, endpoint simulati, chiavi RSA sintetiche generate durante il test; rete Node negata. La suite esistente CI scopre automaticamente il nuovo `.test.ts`. Query validata con toolkit Shopify contro schema 2026-10, senza interrogare un negozio.

Controlli di regressione: confronto byte per byte dei componenti legacy (salvo nome del wrapper), invariabilità dei file Admin/Supabase/checkout e gate, suite di dominio. Questo dimostra compatibilità statica e contratti offline, **non un test end-to-end dei login staff reali**. Due `catch: any` già presenti nelle pagine legacy fanno fallire il lint esteso di quelle pagine anche su main; il lint del nuovo modulo e dei punti d'integrazione senza tali errori passa. Non sono stati riscritti i gestori legacy per risolvere questo debito.

Rollback della prova: chiudere il percorso di prova, uscire dal customer e cancellare soltanto le chiavi `og.customer.*` nell'origine di prova; ricostruire con flag OFF. Questo ripristina i percorsi pubblici preesistenti e non modifica staff o servizi. La flag non annulla profili eventualmente creati al primo login, email OTP o ordini; niente cancellazione automatica. Prima di passare da una futura ON a OFF, valutare le sessioni e il rischio del vecchio bridge: il rollback applicativo non è una mitigazione di quel rischio.

## Primo collaudo e go/no-go

1. Owner autorizza ambiente isolato, sole caselle controllate, OTP e possibile creazione di profili di prova. Nessun account dei 849.
2. Responsabile Shopify fornisce configurazione pubblica verificata, audit di Flow/app/webhook e default marketing. Non dedurre “nessuna comunicazione” dalla sola assenza di consensi impostati.
3. Build di prova ON, mai produzione. Verificare login nuovo/esistente, callback, reload, scadenza/refresh, logout remoto, errore rete, cambio persona, ordini e paginazione con sole identità controllate.
4. Verificare l'accesso staff esistente con ruoli e recovery previsti; nessuna modifica al form o ai privilegi. Problemi => stop, decisione separata.
5. Provare mobile/tastiera, mancata configurazione, errore API distinto dal vuoto, checkout guest e sessione checkout separata, due tab, device condiviso e rollback.
6. Registrare solo esiti aggregati. Rilascio pubblico NO-GO finché staff, checkout/identità, sicurezza e automazioni non hanno un piano e accettazione espliciti.

Fonti: [Shopify Customer Accounts](https://help.shopify.com/en/manual/customers/customer-accounts), [configurazione headless](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started), [API/OAuth](https://shopify.dev/docs/api/customer/2026-10), [oauth4webapi](https://github.com/panva/oauth4webapi), [jose](https://github.com/panva/jose). Consultate il 16 novembre 2026.
