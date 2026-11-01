# PR #43 — rilascio footer verificato sul dominio pubblico

1 novembre 2026. **ONLINE, solo footer tecnico**. Merge e commit effettivamente servito: `8d2a160917895735658e34a37d6b337733a32649`. HEAD sorgente validato da CI/GitGuardian: `e617c05ad9afcaf2c22ad5faac0da06e8bd9ad1d`. [PR #43 MERGED](https://github.com/Rosin355/your-e-commerce-blueprint/pull/43) · [CI del sorgente](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41323052611).

## Traccia del rilascio

- Main precedente/rollback: `b5cbe57aa1f7e674ce7caca106d359f8977c800a`. Branch PR corretto, nessun conflitto, CI/GitGuardian positivi, nessuna review o regola di protezione obbligatoria; review tecnica COMMENT registrata, senza presentarla come approvazione indipendente. Nessun bypass.
- PR portata fuori da Draft e unita con merge commit a due genitori (main precedente + HEAD sorgente). Main → progetto Lovable `95cad199-55fd-4870-9d5c-a2653edf88f5`, branch sincronizzato `main`, dominio principale `onlinegarden.it` attivo e `www` incluso confermati in sola lettura.
- Deploy esplicito tramite il connettore Lovable: ID `0ae71161-a4cc-407e-ae36-b2202f381981`. Risposta iniziale `pending`; successiva verifica HTTP e browser del dominio ha mostrato il nuovo footer e il commit di produzione nel `data-commit-sha`. Nessun ulteriore passaggio manuale richiesto dalla piattaforma.
- Nessuna integrazione delle PR #40/#42, modifica Shopify/Supabase/DNS, attivazione Admin V2/flag, cartCreate o ordine. L'autorizzazione riguarda il footer e non la readiness commerciale o nuove configurazioni privacy.
- Il verbale finale è un commit soltanto documentale su main, successivo al merge; non modifica la build pubblicata e non richiede una seconda pubblicazione.

[Preflight sanificato](preflight.json) · [Riepilogo rilascio](release-summary.json) · [HTTP post-deploy](http-postdeploy.json) · [QA browser reale](browser-postdeploy.json).

## Screenshot reali post-deploy

Acquisiti su https://onlinegarden.it dopo il rilascio, con catalogo reale e webfont caricati; nessuna fixture o API simulata. Le viste mobile usano viewport responsive del browser, non un dispositivo iOS fisico. Screenshot del viewport senza ritagli o ricostruzioni dell'interfaccia.

| Vista | Desktop | Mobile |
| --- | --- | --- |
| Footer | [1440×1000](live-footer-desktop.png) | [390×932](live-footer-mobile.png) |
| Contatti | [Desktop](live-contacts-desktop.png) | [Mobile](live-contacts-mobile.png) |
| Catalogo | [Tutti i prodotti](live-catalog-desktop.png) | [Rose](live-catalog-mobile.png) |
| PDP | [Desktop](live-pdp-desktop.png) | [Mobile](live-pdp-mobile.png) |

Impostazioni preflight verificate in sola lettura nel pannello: GitHub/main in sync, dominio principale attivo e Visitor analytics ON. Il [record sanificato](preflight.json) conserva gli esiti senza esportare la cronologia privata della chat Lovable. Nessuna impostazione cambiata.

## QA reale

**16 controlli browser PASS, zero errori inattesi**. URL aperti realmente: homepage, cinque destinazioni catalogo, `/contatti`, PDP `/products/rosa-maizner-fastnacht`, alias privacy e documento Shopify ufficiale. Le quattro route legali assenti sono state visitate intenzionalmente per verificare che non servano testi fittizi e applichino `noindex,follow` nel DOM.

Verificati link footer, email esatta, navigazione menu mobile verso Rose, assenza overflow, focus visibile 2px nel percorso Privacy → email → Contatti, Invio su Contatti con focus nel contenuto principale, carrello vuoto con Escape e focus ripristinato. Il controllo del carrello attende la conclusione dell'animazione del drawer: il primo campionamento di un frame intermedio non era una regressione. Contatti verificato senza overflow a 320/390/768/1440px. PDP senza immagini rotte o errori applicativi rilevati; CTA presenti e abilitate, senza attivarle.

HTTP: 16 URL e cinque risorse iniziali controllati, tutti con risposta finale 200. HTTP e www reindirizzano a `https://onlinegarden.it/`; HTTPS e HSTS presenti. JS/CSS principali, stylesheet Google Fonts e script hosting raggiungibili. Il `data-commit-sha` del dominio corrisponde al merge. L'alias privacy reindirizza via JavaScript alla policy italiana ufficiale, anch'essa HTTP 200.

Limiti e segnalazioni:

- Warning preesistente Radix: manca `Description`/`aria-describedby` per il drawer del menu mobile, il cui sorgente è invariato. Non blocca navigazione, chiusura o focus; non è una certificazione WCAG completa.
- I quattro errori console `404 Error: User attempted…` sono attesi dai test dei percorsi legali non pubblicati. Le route valide non hanno errori inattesi. Il fallback SPA restituisce HTTP 200 anche ai percorsi assenti; `noindex` è client-side, non un header server.
- Checkout end-to-end non eseguito: nessun cartCreate, pagamento o ordine reale. Codice checkout invariato, suite UX simulata precedente positiva; carrello vuoto reale verificato. Nessuna nuova autorizzazione commerciale dedotta.
- Safari/iOS reale e screen reader non verificati in questa sessione.

## Telemetria e privacy: stato aperto

Gli script `/~flock.js` e `/__l5e/events.270c78a44fc53e7b.js` sono ancora caricati, senza `data-consent`; SHA-256 uguali all'audit precedente. La visita post-deploy non mostra banner CMP. Il pannello Lovable conferma Visitor analytics ON.

La [documentazione ufficiale Analytics](https://docs.lovable.dev/features/analytics) descrive il conteggio visite/pagine e il comando per disabilitarlo in Impostazioni progetto → Generali → Pubblicazione → Visitor analytics. Descrive inoltre analytics senza cookie; ciò non certifica autonomamente tutti i rami degli script legacy o i trattamenti effettivi. Il controllo può essere modificato soltanto dopo una decisione specifica dell'utente, poi verificando gli invii reali. Nessuna CMP installata e nessuna configurazione privacy modificata.

Il tentativo POST a `/__l5e/trackevents` prima del consenso è documentato nell'[audit originale](../../evidence/2026-11-01/hosting-consent-audit.json), dove il guard impediva l'invio. La chiusura odierna riconferma file/configurazione e presenza degli script, ma **non ripete l'intercettazione di rete né prova una nuova ingestione eventi**.

## Blocchi residui e operazioni successive

**Non bloccano il footer già autorizzato e pubblicato:** warning del drawer, perfezionamenti HTTP/SEO e collaudo Safari reale.

**Restano bloccanti per dichiarare completa la readiness legale/commerciale:** Cookie Policy, termini, spedizioni/resi e dati societari approvati; valutazione telemetria/consenso e decisione sul controllo Lovable; validazione checkout/pagamenti/logistica e footer legale Shopify in un test autorizzato. Nessun vecchio dato societario o documento recuperato è considerato definitivo per deduzione.

Nessuna ulteriore operazione manuale è necessaria per rendere visibile questo footer. Le azioni successive sono approvazioni separate, descritte nella [checklist Marco](../../CLIENT-LEGAL-PUBLICATION-CHECKLIST.md).

## Rollback

Conservato il commit precedente `b5cbe57`. Se il footer richiedesse rollback: predisporre un revert del merge `8d2a160` con primo genitore main (`git revert -m 1`), sottoporlo ai check/review applicabili, unire senza force push, attendere la sincronizzazione Lovable e pubblicare esplicitamente; poi verificare dominio e commit servito. Non ripristinare dati, configurazioni privacy, DNS o flag. Nessun rollback è stato eseguito.

La documentazione [Git sync](https://docs.lovable.dev/integrations/github) e [Publish](https://docs.lovable.dev/features/publish) distingue sincronizzazione e pubblicazione; la [cronologia Lovable](https://docs.lovable.dev/features/projects/history) offre anche un ripristino del codice, con conseguenze sulle funzioni server: per questo rilascio frontend resta preferibile il revert Git controllato.
