# Online Garden — ultimo intervento operativo per la consegna (23 novembre 2026)

**Scopo:** istruzioni consolidate per un unico intervento Codex di chiusura. Non è una dichiarazione di PASS produttivo né un'autorizzazione implicita a tutte le mutazioni. Baseline SAL originale **57,75%**; distinguere anche un indicatore separato di readiness del nuovo negozio, senza ricalcolare retroattivamente i pesi o eliminare unilateralmente il contratto originario.

## Già chiuso / non duplicare

- Vetrina React/Vite, catalogo, ricerca, carrello, checkout Shopify Payments e Admin V2 r2 sono operativi sul dominio pubblico.
- Shopify Customer Accounts funzionanti all'ingresso, accettazione finale ancora con identità controllate.
- Registro privato **858/858 account** e **953/953 acquisti come conteggi aggregati**, integrità verificata e backup privato. **Zero ordini individuali WooCommerce ricostruibili/importati**; recupero della vecchia fonte chiuso per decisione del responsabile; evitare dati artificiali.
- Visitor Analytics Lovable **disattivata dall'operatore**, nel suo controllo di rete **zero richieste `trackevents`** osservate. Necessario audit post-deploy e chiarimento tecnico sugli altri invii.

## Lavoro residuo per una consegna verificata

1. **PR #69 banner:** OPEN, HEAD `a5f319ace864b398f43285bb9471d6cd5bd1ef12`. Il candidato ha banner Shopify headless, accettazione, rifiuto, preferenze granulari e revoca, trasmette consenso al checkout. Rimosso il wrapper globale `window.fetch`. Classificare sulla base di evidenze (non dell'HTTP da solo) gli eventi SDK Shopify Monorail `customer_privacy_api_events/2.0` pre-scelta e diagnostica/Shop/wallet checkout; i flussi facoltativi non possono partire senza base appropriata. Se il gate è superato, acquisire GO del committente per merge e Publish esatto, poi QA live e rollback; altrimenti lasciare la PR pronta e segnare il blocco con unico interlocutore.
2. **Cinque informative r3:** Termini, Privacy, Spedizioni, Resi, Cookie ancora candidate, nessuna nuova pubblicata. Shopify Privacy vecchia ancora attiva, altre informative e informazioni di contatto richieste in Admin non impostate. Confermati dati impresa `M.G. PLANT DI GERON MARCO`, sede e P.IVA. Mancano telefono commerciale, indirizzo resi, costi resi, tempi effettivi, funzioni recesso elettronico, finalità/fornitori/retention e approvazione finale. Integrare dati già verificabili, offrire una scheda unica sui dati non recuperabili; **nessuna pubblicazione incompleta o senza firma**.
3. **Spedizioni:** Shopify Markets A/B e Sicilia-Sardegna funzionanti; 42/69 preventivi corretti nel campione, 27 errati su 9 destinazioni isole minori × A/B/misto. Modello isolato 69/69 PASS ma checkout Grow espone una sola opzione. Servono accesso al negozio test, prova reale di due opzioni già prezzate e copertura vettore CAP/località; **non modificare tariffe live né installare app a pagamento** prima di verifica e approvazione puntuale. Il supplemento per intere province miste è escluso.
4. **Cloudflare/redirect:** 16 mapping 301 preparati ma 0 live; prima backup zona, DKIM/posta e go del titolare. Non toccare DNS o posta senza autorizzazione dedicata e piano di rollback.
5. **Accettazione:** Admin V2 collaudo con Marco, visualizzatore staff `/admin/storico-acquisti` pronto su main ma non pubblicato, Shopify account OTP/scadenza, logout/rientro e isolamento reale, Safari su dispositivo fisico, staff recovery e ordine controllato/notifiche Shopify. Nessuna necessità di sviluppo Sendcloud (decisione del cliente). Nessun addebito, messaggio a clienti reali o ordine creato senza consenso.
6. **Handover e SAL:** docs per cliente/designer/developer, esiti/firme, rilascio e rollback. Evitare ricostruzioni di feature operative, test infiniti e PR di sola documentazione senza sblocco. Mantenere la SAL contrattuale originale tracciabile, stimare separatamente readiness commerciale del nuovo sito e registrare gap residui con owner e azione, senza etichettarli PASS.

### Criteri rigidi di esecuzione

Prendere il massimo risultato tecnico nello stesso ciclo, senza fermarsi al primo blocco esterno. Separare GO per codice e documentazione da GO per configurazioni esterne, privacy e pubblicazione. Chiedere una sola autorizzazione finale consolidata per le mutazioni ancora non consentite. In ogni caso, nessun cambiamento distruttivo su Shopify, Lovable, Supabase, DNS, ordini o pagamenti senza autorizzazione effettiva e verifica postcondizione. Non creare nuovi ambienti Supabase o app a pagamento per aggirare i blocchi.

**Fonti:** [PR #69](https://github.com/Rosin355/your-e-commerce-blueprint/pull/69), [final closeout](FINAL-CLOSEOUT-2026-11-22.md), [delivery e registro](FINAL-DELIVERY-2026-11-22.md), [legal](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md), [privacy live](PRIVACY-NETWORK-VERIFY-2026-11-23.md), [checklist](PROJECT-CLOSEOUT-CHECKLIST.md).
