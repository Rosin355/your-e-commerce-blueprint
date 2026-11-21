# Online Garden — traccia SAL per telefonata a Marco (21 novembre 2026)

> **Nota di lettura:** stato verificato sulla documentazione a GitHub + ultimo report Lovable al 21/11. Questo documento non certifica il futuro completamento dell'Admin V2; aggiornare gli esiti dopo l'unico intervento conclusivo Codex. Non includere dati personali o credenziali.

## 1. Cosa è già fatto / pubblicato

- Nuovo e-commerce Online Garden in funzione con homepage, catalogo e pagine prodotto; primo rilascio SEO con sitemap, robots, canonical e navigazione mobile/desktop eseguito e registrato.
- Shopify Payments e checkout nativo integrati: carrello crea il checkout e mostra prodotto/prezzo corretti su `onlinegarden.it`. **Non è un acquisto E2E pagato**.
- Nuova area personale Shopify Customer Accounts pubblicata; visualizzazione di un ordine Shopify proprio confermata da schermate. Password legacy clienti non importate.
- Sicurezza: nove/dieci Edge Functions interessate dalle correzioni, inclusa `shopify-admin-proxy`, rilasciate secondo il report Lovable, restrizione dei ruoli B applicata; quick scan senza criticità e deep scan con **0 Critical**. Log email finding da versione datata classificato stale rispetto al sorgente attuale; immagini catalogo pubbliche per scelta.
- Pannello Admin V2 già esistente, con editor field-by-field, audit/history, protezione versioni e suggerimenti AI in codice, workflow DRAFT, immagini, categorie, varianti, pubblicazione Shopify esplicita. **Non dichiarare il suo collaudo finale come completato fino a esito cliente.**

## 2. Cosa resta

1. **Admin V2**: chiudere l'integrazione frontend/backend e collaudare concretamente i diritti Editor di Marco, creazione/modifica di una bozza DRAFT autorizzata, AI, immagini, categorie, varianti, sync opzionale e storico; consegna istruzioni utilizzabili. Nessuna pubblicazione commerciale senza consenso.
2. **Cloudflare/301**: DNS Cloudflare predisposto con MX/SPF/DKIM, ma nameserver e DNSSEC da verificare con il soggetto autorizzato; regole 301 non confermate live. 16 mapping corroborati, resto non riconciliato.
3. **Spedizioni**: confermare tutte le isole minori e le condizioni commerciali; tariffe standard/Sicilia/Sardegna non dimostrano copertura completa.
4. **Legale, comunicazioni, collaudo**: termini/cookie/reso/consegna e dati societari approvati; ricezione email ordine, mobile Safari/iOS, prova transazione E2E autorizzata, assistenza/rollback.
5. **Legacy WooCommerce**: 857 customer acquirenti storici identificati, **0 clienti legacy creati/associati**; 953 ordini conteggiati ma **0 trasferiti** per backup TAR troncato e mancanza delle singole transazioni. Non presentare come recuperati né cancellati. Se non è disponibile altra fonte, formalizzare col cliente il limite di perimetro e l'eventuale trattamento separato.

## 3. SAL percentuale

- **58%** è la stima gestionale documentata sull'**ambito originario completo**, che include le 953 transazioni non recuperabili con i file esistenti. Non modificarla arbitrariamente dopo un commit o test.
- Dopo il collaudo Admin, aggiornare una nuova tabella PASS/BLOCKED per gli elementi operativi effettivamente chiusi. **Non dare percentuali future prima dei risultati**.
- Se il cliente approva un perimetro di consegna rivisto che esclude il recupero degli ordini senza fonte, misurare il completamento di quel perimetro **separatamente** dalla SAL originaria, senza mascherare 0/953.

## 4. Formulazione telefonica proposta

«Marco, il nuovo negozio è online, la nuova area clienti Shopify funziona e abbiamo verificato il carrello fino alla schermata di pagamento. Sono stati completati i principali interventi di sicurezza e SEO. La nostra priorità ora è la consegna del pannello Admin V2: vogliamo verificarlo insieme con il tuo account per consentirti di gestire bozze, testi, categorie, immagini e prodotti in autonomia. Rimangono da finalizzare l'attivazione Cloudflare per i redirect dei vecchi URL, alcuni controlli commerciali sulle spedizioni e i testi legali. Sul vecchio WooCommerce abbiamo identificato il numero dei clienti e 953 ordini, ma il backup non contiene i dati delle transazioni, quindi non possiamo inserirli nello storico Shopify senza inventare informazioni. Ti fornirò la checklist con gli esiti effettivi del collaudo del gestionale.»
