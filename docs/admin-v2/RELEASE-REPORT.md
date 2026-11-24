# Rilascio operativo Admin V2 · 21 novembre 2026

## Registro di preparazione · PR #71 del 24 novembre

Preparati i due pacchetti della Edge e le build frontend di ritorno e candidata. Il frontend r2 ha superato in isolamento la prova di collisione e salvataggio contro la nuova logica server. La distribuzione attende i GO distinti su merge, Edge e Publish. L’ultimo rilascio pubblico documentato è r2. Impronte, limite HTTP 403 sul download della revisione gestita e delta pubblicabile sono nel [registro #71](../release/PR71-RELEASE-CHECKLIST-2026-11-24.md#registro-di-preparazione-admin-v2).

## Versioni e decisione di rilascio

Baseline Git df2b23b1df8200537ec8bd823c7636d99d16b298. Sul dominio pubblico /admin restituisce HTTP 200 e presenta l’accesso staff. Prima del rilascio l’entry servita è index-DQT9047V.js, SHA-256 92331f363c01fb877add34d91bc2f8cfb668b684d6db885525b51a22f8de1a24. Il chunk della modalità di rilascio conferma la build operativa admin-delivery-20261110-r1. Un caricamento anonimo dimostra il funzionamento dell’ingresso pubblico. I privilegi richiedono una sessione staff.

Il candidato dichiara admin-delivery-20261121-r2 e supportsCatalogSourceAndProductType. Il contratto è additivo. Richiede il deploy della sola product-admin-api con il suo grafo di moduli _shared. La UI controlla la disponibilità del nuovo contratto. Nessuna modifica a product-admin-ai, all’allowlist del proxy, al checkout, alle migrazioni o ai grant. Il proxy di sicurezza già rilasciato ha SHA-256 sorgente 8d86d25264f78f6faa2cecf2345ace7e627ce3620d45dbba2d26895836d26ee0.

## Registro di produzione

| Passaggio | Riscontro del 21 novembre |
| --- | --- |
| Integrazione | [PR #62](https://github.com/Rosin355/your-e-commerce-blueprint/pull/62), candidato d5f94f0de50ac689f940250234eed094d9b3de67, [merge ca9050d](https://github.com/Rosin355/your-e-commerce-blueprint/commit/ca9050d004da3b27f2aff0cb8020bf58ab87d63d). Quattro controlli verdi: [applicazione e PostgreSQL 17](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/44907938001), [browser](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/44907937949) e GitGuardian. |
| Deploy Edge | Lovable ha verificato il checkout sul merge e distribuito esclusivamente product-admin-api con 36 file, inclusi 25 moduli condivisi. SHA-256 del pacchetto sorgente bdb1e1e65a5d00fb23941d9c61c630ec9fb0ac81018affbf9a997d4b6ba7638c. Lovable non espone ID della revisione o checksum binario in esecuzione. |
| Smoke Edge autenticato | La UI in anteprima con sessione tecnica ha interrogato la Edge **di produzione**. get_admin_context, dashboard, catalogo e get_product hanno restituito HTTP 200. Marker admin-delivery-20261121-r2 e supporto al nuovo contratto confermati. Ricerca SKU della lavanda con un solo risultato, bozza riaperta. Modalità full, canaryConfigured=false; risultano abilitati scrittura, sync, bozze interne/Shopify, immagini, categorie, prezzi, AI e pubblicazione per quella sessione. Nessun cambio ai flag. |
| Publish Lovable | Richiesta 1e2d8f2f-2040-4398-99dd-048201ea3be5. Il dominio [onlinegarden.it/admin](https://onlinegarden.it/admin) serve HTTP 200 con index-DSQ4UzGV.js, SHA-256 4f603cd21fdfae105489a165b8986bfea2b3a636f73585cfe21d85ef7c73e0fa. Impronte dell’entry, della modalità, di lista, dettaglio e nuovo prodotto identiche ai cinque asset del build locale. Sul dominio sono presenti marker r2, modalità operativa, filtro origine e tipo commerciale. |
| Post-Publish pubblico | Login staff, homepage e catalogo caricati su Chromium a 1280 e 390 px. Il catalogo mostra collegamenti alle schede prodotto. Nessun overflow orizzontale rilevato su queste tre pagine. Il browser del gestore conferma HTTP 200 e lo stesso asset sul dominio. La sessione tecnica era disponibile in anteprima, mentre il dominio pubblico richiedeva il login. |
| Clienti e checkout | Da /auth e /account il browser raggiunge il modulo email ospitato da Shopify, HTTP 200. Dal catalogo pubblico, un solo carrello ospite con la Dalia Purple Queen ha aperto il checkout Shopify con il prodotto e 5,00 €. La prova si è fermata prima di qualsiasi inserimento dati, ordine o pagamento. |

Impronte SHA-256 dei sorgenti verificati prima del deploy: entrypoint 540514c0a0ea7ea76da4fc195f23e4fcb692cf27fe233c321fdbca461311efd2, servizio bozze 9f6890e01d1da8519cf4f8812bdb70ecc00f404dde614134abe9b439725969de, lettura delle pubblicazioni d79ae6e3c731deb02bd85d38336717cc850f8f0cc00c0371c93f45e6749785f3.

Le due operazioni tecniche Lovable hanno utilizzato 2,0 e 0,8 crediti del workspace esistente. Nessuna ricarica o acquisto di servizi. Il connettore Shopify non dispone di uno scope staff/utenti per attestare i permessi nativi personali. Il journal operativo autorizza immagini in creazione e prezzi dei formati; la galleria e le modifiche strutturali di prodotti già collegati si eseguono nel pannello Shopify con i suoi permessi.

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
