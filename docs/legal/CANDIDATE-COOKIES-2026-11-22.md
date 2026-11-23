# Cookie e tecnologie di navigazione

**Revisione 4 del 23 novembre 2026. Candidato per approvazione del titolare.**

<!-- testo-cliente:inizio -->
## Vetrina, carrello e checkout

Online Garden conserva nel browser gli articoli aggiunti al carrello per ritrovarli al tuo ritorno. Il sito richiede risorse per visualizzare caratteri e immagini e usa servizi di hosting e protezione dai bot. Il titolare ha disattivato Visitor Analytics di Lovable sulla vetrina. Il monitoraggio tecnico del progetto è un servizio distinto.

Shopify gestisce il checkout, la sessione e l’accesso all’area clienti. Quando apri il checkout il browser può contattare servizi di Shopify e dei fornitori di pagamento, inclusi servizi per mostrare i portafogli digitali disponibili. Il trattamento dei dati per l’acquisto e i contatti per esercitare i tuoi diritti sono descritti nell’informativa privacy del negozio.

Puoi cancellare i dati del sito dalle impostazioni del browser. Questa operazione può svuotare il carrello e richiedere un nuovo accesso. Per informazioni sulle tecnologie utilizzate puoi contattare il titolare M.G. PLANT DI GERON MARCO all’indirizzo **info@onlinegarden.it** o alla PEC **geronmarco@pec.agritel.it**.
<!-- testo-cliente:fine -->

## Nota per la pubblicazione

Integrare finalità, destinatari, identificatori e durate dopo la classificazione degli eventi del checkout e dello SDK. Quando il banner sarà verificato sul dominio italiano, inserire la posizione e il nome effettivo del comando permanente per scegliere le singole categorie, rifiutare o revocare. Documentare gli effetti successivi e i trattamenti che restano attivi. Il campione del 23 novembre è nel [verbale di rete](../release/PRIVACY-NETWORK-VERIFY-2026-11-23.md). [Scheda unica di Marco](../release/FINAL-CLIENT-APPROVALS.md) · [Garante, linee guida](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876)

## Inventario storico del 22 novembre, antecedente allo spegnimento

Chromium in italiano, profilo nuovo, nessuna interazione di consenso, home → ricerca → scheda → carrello → checkout ospite. Registrati nomi, host, metodi ed esiti HTTP, senza valori dei cookie, payload individuali o URL di checkout. La lingua del browser non dimostra la regione usata dal provider per attivare il suo banner.

| Superficie | Evidenza del 22/11 | Trattamento da validare |
|---|---|---|
| Protezione e hosting vetrina | Cookie `__cf_bm` Secure/HttpOnly, circa 30 minuti. `__dpl` Secure, circa sette giorni osservati. | Il primo è documentato per la gestione bot. Confermare con hosting scopo e necessità di `__dpl`. La scadenza client non identifica la retention server. [Cloudflare](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/) |
| Carrello | Nessuna chiave local/sessionStorage in home appena aperta. Dopo Aggiungi compare `shopify-cart` in localStorage. | Persistenza tecnica per gli articoli richiesti, senza scadenza esplicita in Web Storage. |
| Telemetria hosting | Script iniettato `/__l5e/events.b979ee024b15adfd.js` con `data-consent="1"` sulla prima visita, senza scelta dell’utente. POST `/__l5e/trackevents` **HTTP 202** prima del consenso. Nessun controllo di consenso rilevato in vetrina. `/~flock.js` compariva il 01/11, assente fra script e richieste della sessione attuale. Il pannello risultava ON nell’audit precedente e le statistiche aggregate Lovable del 21/11 sono consultabili. | Il 202 attesta l’accettazione HTTP. La flag nel markup non documenta il consenso del visitatore. Ottenere finalità, campi, retention, ruoli e possibilità di soppressione dall’hosting. Lo stesso prefisso serve anche immagini necessarie: evitare un blocco indiscriminato. [Lovable Analytics](https://docs.lovable.dev/features/analytics) |
| Font e contenuti | `fonts.googleapis.com`, `fonts.gstatic.com`, CDN immagini Shopify e dominio Storefront API osservati. | Font esterni servono risorse grafiche e comportano un collegamento con terzi. Verificare configurazione/trasferimenti, valutare font locali. In questo campione non sono comparsi tag Google Ads, GA o Meta sulla vetrina. |
| Checkout e Shop | `_shopify_essential`, `_shopify_cmp`, `__Host-Http-shop_binding`, `_shop_app_essential`; chiavi carrello, UI, scroll, receipt e source tracking. Richieste Shopify `/api/collect` (204), error analytics (202), wallet PayPal e Google, incluso un GET del componente pixel del wallet PayPal. | Distinguere sicurezza/sessione, preferenze e diagnostica da analytics o pubblicità. Nome e HTTP non provano finalità, base giuridica o durata. Nessuna transazione effettuata. Il cookie `_shopify_cmp` non dimostra una scelta sulla vetrina headless. |
| Eventi cliente e advertising | Accesso API a `webPixel` negato (`read_pixels`), a `privacySettings` negato (`read_privacy_settings`). `webPixel` riguarda comunque l’app chiamante. Flag Shopify `dynamicRemarketing=false`. | Leggere in Admin Impostazioni → Eventi cliente e Privacy dei clienti per app pixel, pixel personalizzati, finalità, stato e regioni. Richiesta una sessione autorizzata in sola lettura. |
