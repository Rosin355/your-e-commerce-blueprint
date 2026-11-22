# Cookie e tecnologie di navigazione
**Inventario verificato sul percorso pubblico il 22 novembre 2026. Testo candidato per revisione, pubblicazione sospesa.**

<!-- testo-cliente:inizio -->
## Per chi visita Online Garden

La vetrina conserva nel browser gli articoli che aggiungi al carrello. Shopify gestisce la sessione di checkout e l’accesso all’area clienti. Il browser contatta anche i servizi che forniscono i caratteri, le immagini e il metodo di pagamento scelto. L’infrastruttura usa strumenti di sicurezza e protezione dai bot.

Nella configurazione verificata, Lovable misura visite e clic sulla vetrina. Browser e servizi tecnici possono trasmettere l’indirizzo IP, informazioni sul dispositivo e la pagina richiesta. Nelle impostazioni del browser puoi ispezionare o cancellare cookie e dati locali. La cancellazione può svuotare il carrello o richiedere un nuovo accesso.

Il titolare è M.G. PLANT DI GERON MARCO. Per informazioni sulle tecnologie di navigazione e per esercitare i tuoi diritti puoi scrivere a **info@onlinegarden.it**.
<!-- testo-cliente:fine -->

## Inventario tecnico per il titolare

Chromium in italiano, profilo nuovo, nessuna interazione di consenso, home → ricerca → scheda → carrello → checkout ospite. Registrati nomi, host, metodi ed esiti HTTP, senza valori dei cookie, payload individuali o URL di checkout. La lingua del browser non dimostra la regione usata dal provider per attivare il suo banner.

| Superficie | Evidenza del 22/11 | Trattamento da validare |
|---|---|---|
| Protezione e hosting vetrina | Cookie `__cf_bm` Secure/HttpOnly, circa 30 minuti. `__dpl` Secure, circa sette giorni osservati. | Il primo è documentato per la gestione bot. Confermare con hosting scopo e necessità di `__dpl`. La scadenza client non identifica la retention server. [Cloudflare](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/) |
| Carrello | Nessuna chiave local/sessionStorage in home appena aperta. Dopo Aggiungi compare `shopify-cart` in localStorage. | Persistenza tecnica per gli articoli richiesti, senza scadenza esplicita in Web Storage. |
| Telemetria hosting | Script iniettato `/__l5e/events.b979ee024b15adfd.js` con `data-consent="1"` sulla prima visita, senza scelta dell’utente. POST `/__l5e/trackevents` **HTTP 202** prima del consenso. Nessun controllo di consenso rilevato in vetrina. `/~flock.js` compariva il 01/11, assente fra script e richieste della sessione attuale. Il pannello risultava ON nell’audit precedente e le statistiche aggregate Lovable del 21/11 sono consultabili. | Il 202 attesta l’accettazione HTTP. La flag nel markup non documenta il consenso del visitatore. Ottenere finalità, campi, retention, ruoli e possibilità di soppressione dall’hosting. Lo stesso prefisso serve anche immagini necessarie: evitare un blocco indiscriminato. [Lovable Analytics](https://docs.lovable.dev/features/analytics) |
| Font e contenuti | `fonts.googleapis.com`, `fonts.gstatic.com`, CDN immagini Shopify e dominio Storefront API osservati. | Font esterni servono risorse grafiche e comportano un collegamento con terzi. Verificare configurazione/trasferimenti, valutare font locali. In questo campione non sono comparsi tag Google Ads, GA o Meta sulla vetrina. |
| Checkout e Shop | `_shopify_essential`, `_shopify_cmp`, `__Host-Http-shop_binding`, `_shop_app_essential`; chiavi carrello, UI, scroll, receipt e source tracking. Richieste Shopify `/api/collect` (204), error analytics (202), wallet PayPal e Google, incluso un GET del componente pixel del wallet PayPal. | Distinguere sicurezza/sessione, preferenze e diagnostica da analytics o pubblicità. Nome e HTTP non provano finalità, base giuridica o durata. Nessuna transazione effettuata. Il cookie `_shopify_cmp` non dimostra una scelta sulla vetrina headless. |
| Eventi cliente e advertising | Accesso API a `webPixel` negato (`read_pixels`), a `privacySettings` negato (`read_privacy_settings`). `webPixel` riguarda comunque l’app chiamante. Flag Shopify `dynamicRemarketing=false`. | Leggere in Admin Impostazioni → Eventi cliente e Privacy dei clienti per app pixel, pixel personalizzati, finalità, stato e regioni. Richiesta una sessione autorizzata in sola lettura. |

## Soluzione minima e prove di accettazione

Proposta prioritaria a costo incrementale nullo: se il titolare può rinunciare alle statistiche di visita della vetrina, disattivare **solo** Visitor Analytics lato hosting dopo autorizzazione, registrare valore iniziale e verificare cosa continua a partire. Si perde la nuova misurazione del traffico eventualmente dipendente dalla funzione. Se il servizio deve restare, occorre un interruttore che impedisca **prima del caricamento** gli strumenti opzionali finché manca consenso. Il caricamento iniettato prima di React rende insufficiente un banner che memorizzi soltanto la scelta dentro React. Conservare eventuali eventi tecnici indispensabili previa documentazione del provider. Nessuna CMP o variazione di configurazione attuata.

Prova isolata nel browser di QA con blocco dei soli endpoint/script di telemetria della vetrina: nessuna risposta da trackevents, carrello e checkout apribili, dialogo con il testo della privacy Shopify leggibile, accesso clienti raggiungibile. Questo esperimento verifica dipendenze del percorso, non l’efficacia del toggle hosting o il consenso in produzione.

| Prova dopo la decisione | Criterio verificabile |
|---|---|
| Primo accesso senza scelta | Profili puliti, desktop e Safari iOS, provenienza UE verificata. Nessun accesso/storage facoltativo o beacon prima della scelta. Acquisto e login utilizzabili. Fare lo stesso al passaggio al checkout. |
| Rifiuta o chiudi | Rifiuto facile quanto l’accettazione, consenso predefinito negato e persistente al reload e in una nuova scheda. Nessun evento opzionale, anche uscendo dalla pagina. |
| Accetta per finalità | Solo le categorie scelte si attivano dopo il gesto. Verificare richieste e scelta registrata; una riconciliazione della preferenza tra superfici va testata separatamente. |
| Revoca o cambia | Comando sempre accessibile, stop agli eventi opzionali successivi, trattamento degli identificatori pregressi secondo la procedura adottata. Nuovo accesso mantiene la revoca. Ripetere dopo aggiornamenti del banner. |
| Solo strumenti necessari | Se dopo disattivazione e verifica di entrambi gli ambienti restano solo gli strumenti ammessi senza consenso, documentare le condizioni e il motivo dell’eventuale esclusione dei controlli facoltativi. |

Non sono disponibili evidenze di un ciclo accetta/rifiuta/revoca in produzione. Prima della pubblicazione completare durata delle chiavi dove applicabile, responsabili e garanzie reali, comando effettivo di preferenze e verifica con il titolare. [Garante, linee guida cookie e altri strumenti](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876) · [Informativa da confrontare](DRAFT-PRIVACY-POLICY-REVIEW-2026-11-22.md)

Nel pannello del progetto pubblicato gli interruttori Visitor analytics, monitoraggio dei clic e Project monitoring sono attivi. L’operazione proposta riguarda solo Visitor analytics. L’accesso staff pubblico è stato aperto con e senza il solo loader, con entrambi i campi del modulo disponibili. I contatori sono nel verbale commerciale. L’effetto dell’interruttore reale sui dati raccolti rimane da misurare. [Impostazioni Lovable](https://docs.lovable.dev/features/analytics#enable-or-disable-visitor-analytics) · [Garante, linee guida](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876)
