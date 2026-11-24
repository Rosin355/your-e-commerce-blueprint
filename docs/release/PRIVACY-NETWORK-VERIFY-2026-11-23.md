# Online Garden — verifica manuale Lovable e classificazione Shopify (23 novembre 2026)

**Esito aggiornato del 23 novembre.** Visitor Analytics spenta, zero richieste al collettore nei due percorsi pubblici. PR #69 funzionale, NO-GO al rilascio per la classificazione Shopify. [Misure indipendenti](#verifica-indipendente-dello-sprint) · [Unica richiesta al fornitore](#richiesta-unica-al-fornitore)

**Contesto delle prove precedenti.** Istruzioni read-only e raccolta verificabile di evidenze per il responsabile. Nessuna modifica a codice, Lovable, Shopify o alle policy viene eseguita da questo documento. PR #69 **OPEN** sul commit `a5f319ace864b398f43285bb9471d6cd5bd1ef12`. Stato produzione prima della prova: `/__l5e/trackevents` ha restituito HTTP 202 senza consenso; banner headless non ancora pubblicato. SAL originaria 57,75% invariata.

## Procedura storica, precedente allo spegnimento di Visitor Analytics

1. Titolare autorizza separatamente lo spegnimento di **Visitor Analytics** su `https://lovable.dev/projects/95cad199-55fd-4870-9d5c-a2653edf88f5`, in una finestra concordata. Annotare orario, operatore, stato iniziale e revisione pubblica. Percorso Lovable documentato: **Project settings → General → Publishing → Visitor analytics**. Spegnere soltanto questa voce. Lasciare **Project monitoring** e ogni altra configurazione invariati. Il servizio non raccoglierà più visite, clic e gli errori browser a esso collegati.
2. In Chrome desktop, avviare sessione privata per accessi e dati puliti. Aprire `https://onlinegarden.it` → Strumenti sviluppatore (Mac `Cmd+Option+I`) → **Network** → **Preserve log** → filtro `trackevents`. Hard refresh `Cmd+Shift+R` e attendere almeno 20–30 secondi; visitare home e scheda prodotto, senza login né pagamento.
3. **PASS limitato:** zero richieste verso `/__l5e/trackevents` nel campione e accesso a carrello/account/Admin funzionante. Registrare data/orario e schermata di Network filtrata. Ripetere senza filtro con `__l5e` e, se possibile, su Safari/macOS/iPhone. La sola assenza di eventi nel breve campione non certifica tutte le finalità o altre risorse di hosting.
4. **STOP:** se compaiono POST HTTP 202 (o altre richieste riconducibili al collector), non fondere/pubblicare la PR #69. Annotare schermata e richiedere verifica Lovable; non modificare arbitrariamente altri interruttori. Se la disattivazione compromette operazioni essenziali, applicare piano di ripristino concordato, considerando che riaccendere Visitor Analytics ricomincia raccolta pre-consenso.
5. La verifica del banner headless **non è possibile sul pubblico fino al Publish** della PR #69 revisionata e autorizzata; testare lì in una seconda fase con accesso da Italia riconosciuta e tutte le scelte.

## Verifica 3 — classificazione tecnica Shopify e checkout

1. In Shopify Admin **Impostazioni → Privacy dei clienti** fotografare soli **stati delle impostazioni** (banner Italia attivo, Shopify Network Intelligence stato e informativa corrente). In **Impostazioni → Eventi cliente** confermare pixel app/custom elencati o nessuno visibile. **Non disattivare Shopify Network Intelligence** senza riesame: Shopify elenca funzionalità e canali che possono essere disabilitati/disinstallati in conseguenza.
2. Browser privato, Network senza filtro. Per la vetrina candidata della PR #69 e, separatamente, nel checkout di prova senza pagamento, utilizzare filtri testuali `monorail`, `otlp`, `web-pixels`, `collect` e `trackevents`. Registrare **solo** host, percorso generico, metodo, status HTTP, fase (senza scelta, rifiuto, accettazione, revoca), nome schema evento e se iniziato da Shopify/Lovable/altro. Per checkout registrare richieste Shop/identità/wallet separatamente; **non** dedurre finalità dal solo nome URL e codice HTTP.
3. Nel candidato si sono osservati 3 POST `customer_privacy_api_events/2.0` a `monorail-edge.shopifysvc.com/v1/produce` prima della scelta. HTTP 200 dimostra ricezione, **non dimostra pubblicità o profilazione né un'esenzione per trattamenti tecnici**. Proprietario/privacy e referente Shopify devono confermare: finalità, dati effettivi e identificatori, ruolo dei soggetti, necessità tecnica, base giuridica, consenso applicato, conservazione, trasferimenti, documentazione ufficiale e come limitare eventi facoltativi se presenti.
4. Per i soli flussi aperti utilizzare la richiesta unica riportata in fondo al verbale.
5. **Non caricare pubblicamente HAR, cookie, payload completi, authorization headers, cart ID, email, access token o indirizzi.** Se necessario condividere una cattura col supporto tramite canale protetto, dopo redazione dei segreti. Nessun `fetch` monkeypatch, XHR/beacon block globale o proxy improvvisato.
6. **Gate:** richieste documentate come tecnicamente necessarie → conservare evidenza e procedere con revisione privacy e test; eventi opzionali senza scelta → bloccare Publish finché non c'è un controllo supportato, testato. Richieste senza classificazione → PENDING_CLASSIFICATION, non attribuire colpevolezza né certificare conformità.

### Fonti ufficiali
- [Lovable — Enable or disable Visitor Analytics](https://docs.lovable.dev/features/analytics#enable-or-disable-visitor-analytics)
- [Shopify — impostazioni privacy e Network Intelligence](https://help.shopify.com/it/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings)
- [Shopify — Customer Privacy API](https://shopify.dev/docs/api/customer-privacy)
- [PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69) e [verbale](FINAL-CLOSEOUT-2026-11-22.md)

**Stato:** guida operativa. Nessuna verifica è marcata PASS in produzione dal solo presente documento.


## Riscontro del responsabile — Lovable Visitor Analytics spento (23/11/2026)

**Evidenza comunicata direttamente dal titolare/operatore:** «Ho disattivato Visitor Analytics su Lovable e nel Network non vedo più richieste `trackevents`». Registrare quindi **`LOVABLE_VISITOR_ANALYTICS=OFF (segnalazione operatore)`**, **`TRACK_EVENTS=0 (riscontro manuale nel campione osservato)`**. Questa annotazione non è una misura di rete indipendente dell'assistente; mancano ancora screenshot/HAR sanitizzato, browser/region/campione temporale precisi e controllo dell'Admin autenticato.

**Conseguenza:** il precedente blocco dovuto a invii Lovable `/__l5e/trackevents` sembra risolto **nel campione riportato**; non ripristinare la telemetria senza nuova valutazione. Gli invii Monorail del SDK Shopify e le richieste del checkout/wallet **non sono classificati** e restano da documentare. La PR #69 all'HEAD `a5f319ace864b398f43285bb9471d6cd5bd1ef12` rimane OPEN e non pubblicata, come confermato via GitHub il 23/11. Per il GO al Publish servono ancora valutazione finalità dati Shopify, riesame privacy e accettazione specifica del rilascio con test pubblico dopo deploy. SAL ufficiale 57,75%, invariata.


## Verifica indipendente dello sprint

**Visitor Analytics PASS nel campione pubblico.** Chromium 159, contesti nuovi desktop e mobile Pixel 7 emulato, lingua italiana, service worker ammessi. Monitor di rete attivo prima della prima navigazione. Nessuna route sostituita. In ciascuna sessione 30 secondi di attesa in home prima dell’interazione, poi catalogo, prodotto, carrello/ricarica, checkout, account e login staff. Zero richieste al collettore della vetrina e zero caricamenti del relativo script versionato. Nessun comando di consenso osservato in homepage pubblica nel campione. L’operatore ha spento Visitor Analytics; la prova non legge lo stato interno di Project monitoring. [Sonda ripetibile](../../scripts/qa/probe-visitor-analytics.mjs)

**SDK su candidato a5f319a.** Chromium desktop, regione Shopify IT34, SDK SHA-256 `c8d12d01ba0e2f81d699a83c08720f2aec90927c5ef65aaa1bbe0dd9e6f3c9e1`. Il test mirato ha conservato l’identità del fetch. Accettazione, rifiuto, ricarica, scelta granulare e revoca PASS. Nel checkout ospitato su altro host si leggono analytics=no, marketing=no, preferences=no dopo rifiuto. Prima della scelta, 3 POST a Monorail e 3 risposte 200. Al cambio granulare e alla revoca, 2 tentativi per fase. Dopo rifiuto, nel checkout il rilevatore ha contato 26 richieste della famiglia misurazione/diagnostica. Il test restituisce correttamente exit 1 per il gate di rete. I conteggi descrivono questa sessione.

| Flusso osservato | Conclusione utilizzabile |
|---|---|
| Carrello locale, chiamata esplicita all’API di consenso, apertura del checkout e del login | Legame funzionale dimostrato con l’azione richiesta. Il formato di consenso e il suo trasferimento sono documentati. |
| Monorail `customer_privacy_api_events/2.0` | Emesso dallo SDK anche prima della scelta. Compatibile con diagnostica del componente. Necessità di ogni campo, finalità ulteriori e trattamento lato server restano aperti. |
| OTLP e servizi errori, inclusi `web-pixels-manager`, `checkout-web`, `hosted-fields` | Origine e nomi tecnici osservati. Una metrica del gestore dei pixel da sola non identifica un particolare pixel pubblicitario. Da confermare necessità, destinatari e controllo per consenso. |
| Shop e wallet, inclusi `shop_identity_post_message_transmission/1.0`, `shop_accounts_identity_verification_ui_event/2.4` e risorsa PayPal | Tenere distinta la disponibilità del metodo dalla misurazione associata. Nessun pagamento eseguito. La risposta del browser non consente di determinare l’uso successivo dei dati. |

Per le impostazioni del negozio, il connettore ha negato la lettura di privacySettings e webPixel. La sessione browser disponibile non è autorizzata a consultare la privacy di questo negozio. L’inventario completo dei pixel richiede una lettura autorizzata del pannello. [API Customer Privacy](https://shopify.dev/docs/api/customer-privacy) · [Cookie Shopify](https://www.shopify.com/legal/cookies) · [Accordo Shopify](https://www.shopify.com/legal/dpa)

## Richiesta unica al fornitore

**Destinatari proposti:** referente Shopify, con valutazione finale del responsabile privacy del titolare. Bozza registrata, invio esterno da autorizzare.

> Per una vetrina React con banner Shopify, regione IT34 e scelta trasmessa al checkout, quali finalità e campi, identificatori, destinatari/ruoli, conservazione e trasferimenti si applicano alle famiglie elencate nella tabella? Per i tre eventi SDK prima della scelta e per OTLP, Shop e wallet dopo il rifiuto, indicate quali sono indispensabili per la funzione richiesta, la relativa motivazione e documentazione, quali dipendono dal consenso e il controllo ufficiale che impedisce gli eventuali eventi facoltativi. Distinguete le impostazioni del negozio dagli invii obbligatori di piattaforma, per permettere al titolare di documentare la base applicabile.

**NO-GO al merge e al Publish della PR #69.** Archiviare risposta, inventario pixel e decisione motivata del titolare. Se emerge un evento opzionale, provare il controllo supportato prima del rilascio. Ripetere la misura al cambio di configurazione o versione SDK e dopo Publish. Nessuna modifica ai trasporti del browser. [Procedura di consegna e rollback](FINAL-HANDOVER-2026-11-23.md)
