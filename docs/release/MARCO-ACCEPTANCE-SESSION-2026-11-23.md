# Online Garden — sessione di collaudo con Marco (23 novembre 2026)

## Collaudo dei quattro fix Admin · aggiunta del 24 novembre

**PENDING_CLIENT_ACCEPTANCE.** Eseguire sul candidato autorizzato con l’account personale di Marco. Per i mesi usare una scheda tecnica fuori vendita con dati di prova, evitando di attribuirli a una pianta reale.

- [ ] Da telefono e computer aprire **Nuovo prodotto**, completare nome, descrizione e prezzo senza aprire le opzioni avanzate. Aggiungere una foto dalla propria libreria e una categoria se disponibili.
- [ ] Aggiungere un secondo formato, inserire il relativo prezzo e annotare la corrispondenza dei due codici. Cambiare nome, passare all’anteprima e tornare indietro.
- [ ] Provare Febbraio/Maggio/Novembre e Dicembre/Gennaio/Aprile su due calendari distinti. Togliere e reinserire un mese, richiudere le opzioni e controllare il riepilogo.
- [ ] Con il suo permesso AI, fornire una frase già verificata. Leggere la proposta, controllare che la descrizione resti intatta fino alla conferma e decidere se applicarla. Se fallisce, annotare solo messaggio e orario e proseguire manualmente.
- [ ] Verificare l’anteprima, salvare **solo la bozza interna**, riaprirla e confrontare codici, prezzi, mesi, foto e descrizione. In una scheda esistente è sufficiente consultare/annullare la modifica. Concludere senza inviare o pubblicare su Shopify.

Registrare data, versione, browser/dispositivo, esito di ogni punto e decisione di Marco. L’assenza di accesso al provider resta un blocco del punto AI. [Verbale tecnico](../admin-v2/MARCO-UX-FIXES-2026-11-23.md)

**Stato:** checklist di test, NON verbale firmato; nessuna prova nuova dichiarata PASS da questo documento. Fonte: [handover e checklist personale](PRODUCTION-HANDOVER.md), [approvazioni](FINAL-CLIENT-APPROVALS.md), [revisione 4 informative](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md).

## Cosa dire

> Marco, il negozio è già operativo. Oggi verifichiamo insieme da telefono e computer le funzioni che userai: Admin, bozza prodotto e AI Editor, accesso cliente, carrello, checkout e notifiche. Non pubblicheremo prodotti, non modificheremo prezzi e non faremo pagamenti senza un test preventivamente autorizzato. Registriamo separatamente ciò che funziona, ciò che manca e ciò che vuoi approvare.

## Percorso sicuro in presenza

1. **Admin personale** su `https://onlinegarden.it/admin`: Marco usa il proprio account, verifica i permessi `editor`; apre *TEST-OG-AI-001*, annota un campo consentito, modifica solo la bozza, salva/riapre, ripristina il valore. Prova una proposta AI e la scarta. Verifica il suo accesso Shopify staff per foto e varianti esistenti **senza pubblicare**. Per test di recupero staff usare casella di prova autorizzata.
2. **Storefront su iPhone fisico e desktop:** ricerca, scheda prodotto e varianti, carrello persistente dopo reload, apertura checkout; **non acquistare**. Il banner headless PR #69 non è ancora pubblicato, non segnare `CONSENT_LIVE=PASS`. La disattivazione Visitor Analytics osservata resta separata.
3. **Clienti:** accesso a `/account` con OTP personale mai condiviso; visibilità esclusiva degli ordini propri, logout/rientro e, quando possibile, reale scadenza OTP. Per test di isolamento serve **un secondo titolare autorizzato** distinto. Mai scambiare account/password/codici.
4. **Spedizioni:** confrontare a checkout senza ordine le tariffe approvate sui carrelli A/B/misti: Livorno continentale rispetto a Portoferraio e Lipari; **non affermare che le nove isole minori funzionino**. Decisione commerciale **già APPROVATA**: isole minori usano stessa tabella speciale di Sicilia/Sardegna. Tecnica ancora 42/69 conforme, 27 casi anomali, bisogno di accesso Dev e metodo CAP/località verificato.
5. **Notifiche ordini:** guardare pannello Shopify **Impostazioni → Notifiche** e le anteprime. La prova con ricezione email richiede **un ordine su metodo di test sicuro** e autorizzazione specifica a importo reale massimo 0 €, con controllo di automazioni e stock; nessun nuovo lavoro Sendcloud.
6. **Informative:** controllare dati impresa dalla visura del 22/03/2024, confermati attuali dall'operatore: `M.G. PLANT DI GERON MARCO`, `Via San Giovanni 25, 35010 Santa Giustina in Colle (PD)`, P.IVA `04347360242`, REA `PD-464045`, PEC `geronmarco@pec.agritel.it`, assistenza `info@onlinegarden.it`. **La visura NON riporta un numero di telefono pubblico; NON contiene privacy policy, resi, tempi di consegna o condizioni di vendita.** Chiedere a Marco se il telefono nella scheda Shopify è quello da pubblicare; chiedere indirizzo e spese di reso, preparazione/consegna e eventuali limitazioni, finalità/fornitori/conservazione dati per revisione. I cinque testi r4 sono candidate NON APPROVATE/PUBBLICATE; nessuna firma automatica.
7. **Consegna:** registrare data, dispositivo/browser, singolo esito PASS/PENDING/FAIL, osservazioni, firma/approvazione specifica; non archiviare OTP, dati clienti, indirizzi o carte nel repository.

## Fuori dalla sessione

- PR #69 (banner) **OPEN/NO-GO**; PR #70 (handover) **OPEN** al 23/11; nessun Publish automatico. Dopo classificazione diagnostica Shopify e firma specifica potrà seguire rilascio separato.
- Cloudflare/DNS e 16 redirect = finestra separata con backup DKIM/posta.
- Storico WooCommerce = archivio aggregato **858/858, 953/953** PASSED; nessun ordine dettagliato originario disponibile o importato, non chiedere backup e non fingere transazioni.
- SAL originaria 57,75%; readiness 4/10 prima dei test personali, aggiornare solo con prove reali e rispettando i 10 criteri.

**Nota:** questa checklist non autorizza modifiche live, addebiti, invii reali a clienti, cambio profili o Publish.
