# Online Garden — audit mirato dei 15 Security Findings

Data: 21 novembre 2026. Baseline Git: `e3c4e46f8aea2da7363f463c7f04ec510c3e3080`.

## Esito: NO-GO per il prossimo Publish

Preparati e verificati **fix sorgente per 6 dei 7 rilievi Critical** (due descrivono la stessa funzione). Nessun deploy: queste correzioni **non attestano la protezione delle funzioni attualmente in produzione**. Publish del frontend non distribuisce questi fix.

Nessuna migration, modifica di ruoli/grant/RLS/bucket/flag/secret, generazione AI, modifica di prodotti/prezzi/immagini/inventario/ordini/pagamenti o Publish. Il collaudo ha aggiunto una pianta al carrello del browser e tentato il checkout senza acquisto. Nessuna mutazione Shopify Admin invocata. Un tentativo Storefront cartCreate può creare un carrello tecnico, non un ordine.

## Esito per finding

| # | Finding / ID finale | Livello | Verifica e stato |
|---|---|---|---|
| 1 | Export prodotti completi — `lov_finding_10b05618164cf216` | Warning | Confermato: service-role senza autorizzazione. Fix sorgente: JWT e ruolo Admin verificati e attesi prima di ogni lettura. Test PASS. Deploy pendente. |
| 2 | Cancellazione arricchimento — `lov_finding_18ee86d57fd8d591` | Critical | Confermato in `ai-enrich-products`, reset non protetto. Fix sorgente: controllo Admin prima di parsing, letture e reset. Test PASS. Deploy pendente. |
| 3 | Export CSV Shopify — `lov_finding_1a07daa4c7b4cd7c` | Warning | Confermato in `export-shopify-native-csv`. Stesso controllo preventivo Admin; formato CSV invariato. Test PASS. Deploy pendente. |
| 4 | Creazione collezioni — `lov_finding_1a2944db25d40652` | Critical | Confermato in `setup-collections`, anche GET poteva mutare. Fix sorgente: controllo Admin su ogni richiesta non OPTIONS, prima di qualsiasi chiamata Shopify. Nessuna collezione creata nel test live. Test offline PASS. Deploy pendente. |
| 5 | Ruoli di terzi — `lov_finding_38b7f082ff8fba7f` | Warning | Confermato nel DB live: `has_role(uuid,app_role)` eseguibile da authenticated e UUID non vincolato al richiedente. Nessuna escalation dimostrata, ma divulgazione dei ruoli possibile conoscendo un UUID. Correzione sospesa: modifica della funzione/permessi richiede approvazione e test delle policy dipendenti. |
| 6 | File import privati — `lov_finding_3a33cbce75b4659c` | Warning | Confermato in `inspect-woo-source-csv`: la allowlist dei percorsi non autorizzava il caller. Fix sorgente: Admin prima di download e letture. Test PASS. Deploy pendente. |
| 7 | Ordini tramite email altrui — `lov_finding_4bcf02c4b5860893` | Critical | Il codice attuale ha ritirato `get-customer-orders` con 410 senza import/provider, e il flusso cliente usa l'identità Shopify, non ricerche per email. **Runtime non allineato/attestabile:** chiamata senza header 401; con chiave pubblica e con sessione Admin risponde 200 con `success,orders`, array vuoto, non 410. Non sono state provate email di clienti o creati account. Impostazione live auto-confirm non leggibile dagli strumenti read-only utilizzati. Non classificato come falso positivo né chiuso: occorre verificare versione distribuita e autenticazione prima del rilascio. |
| 8 | Autorizzazione prezzi senza await — `lov_finding_5a9278d46c7f91e4` | Critical | Confermato in `update-product-prices`: Promise auth non attesa. Aggiunto `await`; test su update e propagate, auth pendente/rifiutata e ruolo non Admin PASS. Nessun prezzo reale scritto. Deploy pendente. |
| 9 | Sostituzione immagini — `lov_finding_ad1d7f2960ab3513` | Critical | Confermato in `generate-product-images`. Controllo Admin prima di AI, DB e Storage. Test offline PASS, zero AI reale e zero upload reale. Deploy pendente. |
| 10 | Deviazione collegamento Shopify — `lov_finding_baf8660fbff5ac52` | Critical | Confermato in `shopify-oauth-exchange`: host arbitrario riceveva il client secret. Fix sorgente: Admin verificato, dominio `.myshopify.com` esatto configurato, redirect HTTP vietati, errori esterni non riflessi, import CORS locale anziché npm. Host terzi, userinfo, porte, percorsi e domini simili negati nei test. Risposta token conservata per il solo Admin autorizzato. Deploy pendente; non eseguito scambio OAuth reale. |
| 11 | Modifica catalogo — `lov_finding_bd174a3500f644f2` | Critical | Confermato; stessa causa del #2 in `ai-enrich-products`. Stesso fix sorgente e test PASS. Deploy pendente. |
| 12 | Email nei log import — `lov_finding_c2361d73a35a5a9c` | Warning | Già risolto nel codice attuale: `customers-sync-shopify.mjs` delega a un preflight solo offline; log aggregati e codici sanitizzati, nessun cliente/errore grezzo. Suite preflight 46/46 PASS. Nessuna riscrittura e nessun log storico cancellato; conservazione/accesso dei log storici non verificati. |
| 13 | Export arricchimento — `lov_finding_f428732c258b2da1` | Warning | Confermato in `export-enriched-csv`; controllo preventivo Admin aggiunto. Test PASS, deploy pendente. |
| 14 | Permessi pubblicazione di terzi — `lov_finding_f7a297a45f6fd4bd` | Warning | Confermato live: `can_publish_products(uuid)` e analoghi helper eseguibili da authenticated con UUID arbitrario. Correzione sospesa per approvazione. Non revocare indiscriminatamente EXECUTE: le RLS e Storage dipendono da questi helper. |
| 15 | Storage non vincolato al proprietario — `lov_db_storage_objects_owner_unbound_v1_ef163b0bfd75c9f3` | Info | Configurazione intenzionale: libreria immagini pubblica di negozio, non file personali. Live: sync pubblico, 6 oggetti e zero fuori `product-images/`; CSV privato con 11 oggetti; manifest privati con 130 oggetti. Upload/update/delete Admin; service-role tecnico; lettura pubblica immagini. La policy «Deny client access to Shopify create manifests» è **RESTRICTIVE**, quindi non concede accesso agli altri bucket. Nessuna esposizione privata attuale dimostrata da questo rilievo. Lasciato visibile, nessuna policy modificata. Bucket sync pubblico non deve mai ospitare import privati: il download pubblico non è limitato da SELECT RLS. |

## Controlli effettuati

- **98/98 nuovi test**: esecuzione degli handler e del verificatore JWT/ruolo reali, con DB/Storage/Shopify/AI sintetici; anonimo, token invalido, non-Admin (anche con metadata admin falsi), errori auth/ruoli, Promise pendente, OPTIONS e Admin ammesso. Gli effetti privilegiati rimangono a zero per i caller negati.
- **278/278 test mirati** di sicurezza, Admin API, editing, packaging, Storage, async auth e integrazione storefront.
- **20/20 test accessi clienti**: PKCE, validazione token, identità Shopify, isolamento da sessione staff, ordini nel contesto del cliente. Nessun login cliente reale effettuato.
- **46/46 test preflight clienti**: offline e assenza di dati privati nei log.
- Suite catalogo completa: **644 PASS, 5 file test non eseguibili** sotto Node per import `jsr:` non supportato. Non dichiarata completamente PASS; non modificati moduli estranei per aggirare il limite.
- Tutte le **9 funzioni modificate** risolvono le proprie dipendenze locali/_shared. Nessuna modifica a `product-admin-api` o `product-admin-ai`, né frontend/design.
- Log della preview: ultimo **build OK**, nessun errore browser nel collaudo.
- Sessione autorizzata esistente Admin/editor, non Marco: lista e dettaglio Admin V2 caricati. Letture `get_admin_context`, `list_products`, `get_product`, `get_product_operations`; richieste suggerimenti AI solo in lettura. Zero tentativi di azioni automatiche non consentite nell'ultima esecuzione.
- Storefront: home, catalogo con 9 link prodotti distinti, PDP e carrello verificati. Dalia Purple Queen, Default Title, €5, quantità 1 nel carrello.
- **Checkout non verificato**: dopo click rimane «Creazione checkout…» oltre 45 secondi; nessuna navigazione esterna. Nessuna correzione al checkout effettuata: non è stato cambiato da questo audit. Il collegamento nel codice resta Shopify Storefront `cartCreate`, senza pagamenti alternativi. Blocker di verifica da diagnosticare separatamente.

## RLS, autorizzazioni e minimo privilegio

RLS attiva sulle tabelle sensibili verificate; nessuna policy cliente consente modifiche a prodotti, prezzi catalogo sync, collegamento Shopify o capability. I grant SQL effettivi sono presenti anche dove la vista information_schema restituisce vuoto: verificati con `has_table_privilege`, **non** interpretati come revocati. Alcune tabelle legacy hanno grant ampi ma sono limitate dalle RLS; revocarli richiede approvazione distinta, non è necessario allargare policy pubbliche.

L'helper legacy attuale usa JWT verificato e `user_roles.role=admin`, non whitelist email; i fix riusano questo criterio senza cambiare account o assegnazioni. Admin V2 conserva la propria matrice editor/capability, non viene instradato attraverso il guard legacy.

## Scan ripetuti e avvisi ulteriori

Quick scan prima e dopo: **1 Info Storage**, nessun Critical DB rilevato dal controllo rapido. Questo non certifica le Edge Functions live.

Deep scan richiesto e avviato sulla baseline salvata **prima dei fix**, come previsto dallo strumento; risultato asincrono pendente, nessun polling. Non può attestare le modifiche non ancora salvate quando è partito: occorrerà una nuova scansione del commit correttivo quando disponibile, prima del rilascio. Nessuna esclusione deep-scan è stata segnalata nei risultati iniziali. Wiz non eseguito: connettore non configurato.

Dependency scan aggiuntivo: 8 advisory nel lockfile per ws (via client Cloud), Zod e React Router. Non inclusi nei 15 rilievi iniziali. Non aggiornati automaticamente: Zod/Router hanno possibili migrazioni incompatibili, diversi advisory dipendono da server WebSocket/SSR o redirect non dimostrati in questa SPA. Applicabilità e upgrade vanno verificati prima di dichiarare il progetto sicuro; nessuna vulnerabilità è stata ignorata solo per l'assenza di un exploit dimostrato.

## Interventi successivi, con approvazione

1. Confermare e correggere l'allineamento runtime del vecchio endpoint ordini (ritiro già presente nel sorgente) e verificare configurazione signup senza cambiare clienti/staff.
2. Preparare guardie self-only per gli helper ruoli, preservando chiamate tecniche autorizzate e policy RLS/Storage; validare con due identità sintetiche, poi chiedere approvazione esplicita prima di migration/permessi produzione. Nessun SQL eseguito in questo audit.
3. Diagnosticare checkout pendente senza ordini/acquisti e completare un collaudo reale prima di Publish.
4. Ottenere deep-scan finale del codice correttivo e verificare advisory dipendenze.
5. Solo con autorizzazione separata: deploy mirato delle nove funzioni corrette, verifica OPTIONS/401/403 e letture Admin; includere tutte le dipendenze. Nessuna mutazione live per provare autorizzazione. Ripristino solo con approvazione, da baseline Git recuperabile.

**Non esiste ancora una versione attestata pronta al rilascio in produzione.** Le correzioni sono preparate nel repository, non distribuite; il rilascio rimane bloccato dai punti sopra.