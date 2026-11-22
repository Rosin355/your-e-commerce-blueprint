# Online Garden — SAL per telefonata a Marco (21 novembre 2026)

## Update area clienti dopo PR #64 — 21 novembre 2026

- PR #64 [MERGED](https://github.com/Rosin355/your-e-commerce-blueprint/pull/64), commit `73bd840c5677b67e638b603eead8cdb7cd8fcda2`; fix minimale alla paginazione della SPA OAuth **disattivata**. Non necessario nuovo Publish per il percorso ospitato Shopify. Frontend pubblico controllato dal rapporto: `index-DSQ4UzGV.js`, Admin r2 conservato.
- Percorso clienti: **5/8 criteri di accettazione** verificati nei rispettivi ambiti (**62,5% del collaudo**). Accesso al modulo email, visualizzazione di un proprio ordine pregressa, separazione dal login staff, checkout ospite e responsive/ritorno al negozio collaudati. Safari macOS e simulatore iPhone 17 iOS 26.3.1 coperti, **non necessariamente dispositivo iPhone fisico**.
- **Tre verifiche ancora aperte con identità controllate:** ricezione OTP e rientro dopo scadenza effettiva, logout con nuova autenticazione sul servizio ospitato, isolamento degli ordini fra due profili reali distinti. Non impersonare titolari, non usare credenziali o ordini altrui.
- Preflight WooCommerce offline PASS: 848 candidati a revisione, 8 quarantene e 1 email da disambiguare; **0 clienti importati/associati, 0/953 ordini Woo**.
- **SAL complessiva invariata: 57,75% ≈ 58%** sul perimetro originario; il 62,5% del collaudo clienti non sostituisce il peso gestionale della macroarea account/migrazione (15%, avanzamento 30%, contributo 4,50).
- Prossima attività indipendente dal collaudo delle identità: analisi **read-only** delle regole di spedizione, isole minori e impatto sul checkout; evitare modifiche a tariffe, condizioni, dominio o pagamenti senza autorizzazione.

Fonti: [verbale](../customers/FINAL-ACCEPTANCE.md) · [piano anagrafiche](../customers/MIGRATION-READINESS.md) · [SAL ufficiale](SAL-2026-11-21.md).



> Scheda sintetica per allineamento cliente. **Stato aggiornato** dai report di release e PR #62/#63. Distinguere codice integrato, backend deployato, frontend pubblicato, collaudo tecnico e accettazione personale. Non conservare dati personali o credenziali in questa scheda.

## Numeri

- **Admin V2: 85% gestionale** sull'area Admin; **release tecnica completata e pubblicata**, ma **accettazione personale di Marco ancora `PENDING_CLIENT_ACCEPTANCE`**.
- **Progetto complessivo: 57,75%, arrotondato al 58%**, sull'ambito originale compresa la migrazione clienti e dello storico WooCommerce.
- Se l'accettazione di Marco chiudesse l'Admin al 100% senza cambiare alcun altro indicatore, il contributo Admin salirebbe da 12,75 a 15 punti e il progetto da 57,75 a **60%**: **scenario teorico, non SAL attuale**.
- La migrazione effettiva legacy rimane **0/857 clienti collegati o creati** e **0/953 ordini importati**; il precedente negozio è inaccessibile e il backup ricevuto risulta troncato. **`BLOCKED_SOURCE_UNAVAILABLE`**. Questo punto richiede una decisione trasparente sul perimetro contrattuale: nessuna transazione è stata ricostruita artificialmente.

## A — Cosa abbiamo concluso

1. Storefront Online Garden pubblico con catalogo, ricerca, schede, navigazione desktop/mobile, primo rilascio SEO con sitemap, metadati, canonical e dati strutturati.
2. Shopify Storefront cart/checkout funzionante: verificata apertura del checkout con prodotto e prezzo corretto; **non** provato pagamento finale né ordine completo in questo rilascio.
3. Accesso clienti tramite **Shopify Customer Accounts**; consultazione di un ordine Shopify esistente confermata. Supabase Auth resta riservato allo staff.
4. Sicurezza: controlli ruoli corretti, allowlist sul proxy Admin prodotto distribuita, scansione approfondita comunicata senza Critical; avviso log email preesistente classificato stale/false positive rispetto al codice, non equivalenza a bonifica log storici; immagini commerciali pubbliche intenzionalmente.
5. **Admin V2 r2 è online** in `https://onlinegarden.it/admin`: versione `admin-delivery-20261121-r2`, PR applicativa #62 merge `ca9050d`, documentale #63 merge `6dd2da7`, Edge `product-admin-api` distribuita, Publish Lovable `1e2d8f2f-2040-4398-99dd-048201ea3be5`, asset pubblico `index-DSQ4UzGV.js`.
6. Funzioni Admin sviluppate e tecnicamente verificate: ricerca globale SKU/nome/GTIN e filtri, editing field-by-field e cronologia, creazione DRAFT, immagini/ALT/varianti/categorie, proposta AI con accettazione, invio esplicito di bozza Shopify fuori vendita, recupero idempotente. Per galleria e modifiche strutturali su prodotti Shopify **già esistenti** è previsto l'accesso nativo Shopify, non un'operazione di catalogo Admin V2.
7. Permessi configurati per Marco come **solo Editor, 8 capability e 17 campi**; nessun privilegio Admin esteso. Il report di release registra 114 test Node mirati, 17 Deno, 14 browser e CI PostgreSQL 17. Non tutti i test sono condotti tramite la sua sessione personale.
8. Nessun prezzo, giacenza, prodotto commerciale, ordine o pagamento reale modificato dal collaudo conclusivo Admin.

## B — Cosa resta da concludere (ordine operativo)

1. **Accettazione Marco**: accesso a `/admin` dal suo dispositivo, apertura della bozza tecnica `TEST-OG-AI-001`, verifica foto/formato/collezione, editing solo sulla fixture, prova dell'assistente AI, conferma della leggibilità e dei comandi disponibili. Separatamente: accesso personale allo staff Shopify per gallerie e struttura varianti esistenti. Registrare esito in `docs/admin-v2/FINAL-ACCEPTANCE.md`, senza password o OTP.
2. **DNS/301**: verifica DNSSEC/DS, delega nameserver IONOS verso Cloudflare con il referente autorizzato, verifica posta/HTTPS e test HTTP delle regole. I 16 mapping ricostruiti richiedono approvazione; non dichiarare i 301 attivi.
3. **Spedizioni**: convalidare tariffazione per isole minori (oltre Sicilia/Sardegna e province), con titolare e regole Shopify attuali. Non modificare tariffe senza approvazione.
4. **Legale/commerciale**: ricevere e approvare termini, resi/rimborsi, spedizioni, cookie/consensi e dati societari completi, oltre alla Privacy già presente.
5. **Collaudo acquisto E2E autorizzato**: completare un ordine di prova secondo procedura contabile concordata, email/notifiche cliente e staff, fulfillment/Sendcloud e rimborsi se inclusi; non confondere apertura checkout con pagamento realizzato.
6. **Compatibilità e sessioni**: verificare Safari/iOS, logout cliente, isolamento fra profili account, recupero staff con email e conferma definitiva di rollback/supporto post-consegna.
7. **Perimetro storico irrecuperabile**: informare Marco che i soli conteggi (857 clienti/953 ordini) non consentono ripristino in Shopify; concordare per iscritto l'esclusione/limitazione dello storico dalla consegna se non emergono nuove fonti.

## C — Script sintetico per telefonata

> Marco, il pannello prodotti aggiornato è finalmente online: abbiamo verificato ricerca, schede, bozze con foto e varianti, funzioni AI e invio a Shopify come bozza fuori vendita. Anche il nuovo accesso clienti e l'apertura del checkout funzionano; i controlli di sicurezza non evidenziano criticità. Ora ci serve una prova con il tuo accesso per verificare che tu possa utilizzare in autonomia le funzioni e gestire le gallerie in Shopify. Dopo questo, per la consegna completa restano Cloudflare e redirect SEO, verifica delle spedizioni speciali, testi legali e collaudo dell'ordine/notifiche. Lo storico WooCommerce non è trasferibile con il backup incompleto: abbiamo i conteggi ma non i dettagli degli acquisti, quindi va trattato come limite documentato, non come migrazione compiuta.

## Fonti tecniche

- [Verbale Admin V2](../admin-v2/RELEASE-REPORT.md)
- [Scheda di accettazione](../admin-v2/FINAL-ACCEPTANCE.md)
- [Guida cliente](../admin-v2/CLIENT-GUIDE.md)
- [SAL ufficiale](SAL-2026-11-21.md)
- [Checklist progetto](PROJECT-CLOSEOUT-CHECKLIST.md)
- [PR #62](https://github.com/Rosin355/your-e-commerce-blueprint/pull/62) · [PR #63](https://github.com/Rosin355/your-e-commerce-blueprint/pull/63)

**Nota:** il verbale distingue prove su fixture/browser tecnico da una sessione vera di Marco e da un acquisto completato. La percentuale originale non raggiungerà il 100% sul perimetro iniziale senza una decisione formale sullo storico WooCommerce irrecuperabile.
