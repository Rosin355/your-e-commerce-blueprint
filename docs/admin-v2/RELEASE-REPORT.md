# Rilascio operativo Admin V2 · 21 novembre 2026

## Versioni e decisione di rilascio

Baseline Git df2b23b1df8200537ec8bd823c7636d99d16b298. Sul dominio pubblico /admin restituisce HTTP 200 e presenta l’accesso staff. Prima del rilascio l’entry servita è index-DQT9047V.js, SHA-256 92331f363c01fb877add34d91bc2f8cfb668b684d6db885525b51a22f8de1a24. Il chunk della modalità di rilascio conferma la build operativa admin-delivery-20261110-r1. Un caricamento anonimo dimostra il funzionamento dell’ingresso pubblico. I privilegi richiedono una sessione staff.

Il candidato dichiara admin-delivery-20261121-r2 e supportsCatalogSourceAndProductType. Il contratto è additivo. Richiede il deploy della sola product-admin-api con il suo grafo di moduli _shared. La UI controlla la disponibilità del nuovo contratto. Nessuna modifica a product-admin-ai, all’allowlist del proxy, al checkout, alle migrazioni o ai grant. Il proxy di sicurezza già rilasciato ha SHA-256 sorgente 8d86d25264f78f6faa2cecf2345ace7e627ce3620d45dbba2d26895836d26ee0.

**Stato al commit candidato:** test mirati riusciti. Merge, attestazione della Edge e Publish richiedono ciascuno il proprio riscontro. Aggiornare il registro sotto dopo i passaggi di produzione.

## Architettura e autorizzazioni

- Il frontend Vite in src/adminv2 usa NewProductPage, VariantEditor, CatalogImages, RichTextEditor, FieldCard e CatalogActions. VITE_ADMIN_OPERATIONAL_RELEASE=true abilita l’interfaccia operativa alla compilazione.
- Supabase Auth autentica il personale. product-admin-api valida ruolo, grant, campo, versione, lock, flag e approvazione per l’azione. product-admin-ai gestisce le proposte e le versioni di partenza. L’accesso cliente usa Shopify Customer Accounts.
- Il grant di Marco contiene edit, sync, drafts, images, categories, prices, publish e ai, delimitati da 17 campi. Ha soltanto il ruolo editor. I grant registrati e la disponibilità istantanea dipendono da verifiche distinte. Mantenere il canary e le abilitazioni esistenti. La scheda tecnica è esclusa dalla pubblicazione.
- Il catalogo applica i filtri a monte del cursore. La provenienza del prodotto usa products.legacy_source. La provenienza editoriale dipende dallo snapshot collegato. La lista legge gli ID Shopify in blocco e verifica la pubblicazione sul canale Headless. Un ID conflittuale o un servizio indisponibile produce uno stato da verificare.
- Il journal conserva richiesta, chiave e stato. Dopo una risposta incerta, recuperare l’operazione. La verifica Shopify rilegge identità, SKU, formato, prezzo, descrizione, tipo, SEO, tag, immagini e collezioni richieste prima di concludere il mapping. Le associazioni richiedono gli ID esatti. La creazione invia DRAFT. La UI offre un accesso nativo Shopify distinto per galleria e struttura di prodotti già collegati.

## Collaudo e manutenzione

TypeScript e build di produzione PASS. Controllo Deno su product-admin-api PASS. 114 test Node mirati (86 di dominio e 28 del gestore canary), 17 test Deno del servizio e 14 test browser Playwright PASS. I test del browser utilizzano servizi simulati, compresi errori AI, riapertura, annullamento e invio di una bozza. La CI GitHub esegue anche il contratto database su PostgreSQL 17 isolato. La prima esecuzione ha evidenziato due problemi già presenti sulla baseline. Il test del journal ora inserisce la migrazione sintetica dopo l’ultima voce vigente, inclusa la 0019 di sicurezza, e ne conserva hash, atomicità e storico. Le quattro prove HTTP che richiedono una sessione reale sono disponibili in scripts/live/role-check-live.test.ts per il collaudo esplicito del gestore, con fixture parametrizzata. Il runner di dominio resta interamente offline. Entrambi i test database sono stati eseguiti anche su PostgreSQL 16 locale isolato. Sono visibili i consueti avvisi Vite sulle dimensioni del bundle.

La lettura di produzione trova due operazioni tecniche complessive, una LOCAL_DRAFT e una VERIFIED_DRAFT. Il SEO aggiornato dopo la creazione della bozza tecnica coincide con la successiva modifica documentata. Il titolo SEO assente usa il titolo prodotto effettivo secondo il contratto Shopify già adottato nel progetto. La seconda bozza è stata riletta direttamente da Shopify nel suo stato DRAFT, fuori dal canale, con SKU, formato, immagine READY, ALT e associazione a collezione. Non è stato avviato un nuovo invio per ripetere questa verifica. Acquisti e variazioni a prezzi, scorte o prodotti commerciali effettuati in questo intervento: zero.

## Ordine e rollback

1. Dopo il merge verde, distribuire solo product-admin-api dal commit integrato. Rileggere marker, capacità e fixture tramite sessione tecnica autorizzata. Il riferimento a una revisione Git o a una preview da solo non verifica una funzione distribuita.
2. Pubblicare da Lovable sul dominio esistente. Verificare entry, chunk della release, schermata staff, homepage, catalogo e accessi. Registrare separatamente ID della richiesta e bundle effettivamente servito.
3. Se il frontend regredisce, ripubblicare la precedente versione frontend verificata con la correzione checkout. Se la funzione regredisce, ripristinare sul main corrente esclusivamente il grafo Admin interessato alla baseline di questa release e ridistribuire la sola product-admin-api. Ripetere i controlli. Conservare journal, mapping, ruoli, SQL, proxy protetto e account clienti; una bozza incerta si recupera dalla sua chiave.

[Accettazione](FINAL-ACCEPTANCE.md) · [Guida cliente](CLIENT-GUIDE.md) · [Sicurezza e checkout](../security-checkout-fix-2026-11-21.md) · [SAL con pesi](../release/SAL-2026-11-21.md).
