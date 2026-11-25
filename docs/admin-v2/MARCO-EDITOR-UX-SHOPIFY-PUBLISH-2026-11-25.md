# Online Garden — UX semplificata Marco + operatività Shopify
Data: 25 novembre 2026. **Stato: proposta da implementare, non già distribuita.** Documento per designer, developer, QA e cliente. SAL ufficiale 57,75% finché non siano conclusi rilascio e accettazione.

## Baseline verificata
- `src/adminv2/pages/ProductDetailPage.tsx` visualizza anche campi tecnici e di sola lettura nelle sezioni prodotto.
- `src/adminv2/components/FieldCard.tsx` possiede per-campo `capabilities.updateBlockReason` ed errori/syncState; il componente può distinguere campi editabili da bloccati.
- `src/adminv2/components/ProductOperations.tsx` prevede `create_shopify_draft` dopo bozza interna e controlli `canManageDraft`/`canSendDraft`.
- `src/adminv2/components/CatalogActions.tsx` usa `canPublish`, `canSync` e una policy per prodotti tecnici, controlli commerciali e pubblicazione.
- `docs/admin-v2/CLIENT-GUIDE.md` oggi rimanda alla UI Shopify nativa per gallerie/varianti esistenti e a un operatore autorizzato per la pubblicazione. **Questa autonomia completa di Marco non è ancora dimostrata.**
- È già documentato un problema sulla distinzione descrizione breve/estesa in `docs/admin-v2/SHORT-LONG-DESCRIPTION-AND-PUBLISHING-2026-11-25.md`. Correggere nello stesso intervento senza sovrascrivere lo stesso campo Shopify.

## Requisiti UX
1. **Vista standard personalizzata dal server** per l'Editor: solo campi con azione realmente permessa e utile (titolo, descrizioni separate, SEO, tag, categorie, immagini e alt, varianti/formati/prezzi se autorizzati, stato commerciale e AI). Raggruppare per compito, non per schema dati.
2. Mettere gli elementi bloccati e di sola lettura sotto **«Opzioni avanzate · Dati tecnici e permessi»**, chiusa di default. L'etichetta «Non disponibile per il tuo ruolo» compare **solo nella vista avanzata**, non in mezzo ai campi quotidiani. Accessibilità da tastiera e screen reader; nessuna restrizione soltanto CSS.
3. **Colori semantici** accessibili con testo e icone: verde azioni editoriali e salvataggio interno; blu azioni Shopify che richiedono conferma; ambra verifica/rischio non distruttivo; grigio sola lettura/disabilitato; rosso solo per azioni distruttive o errori. «Annulla» non distruttivo rimane neutro. Un solo CTA primario per contesto, contrasto WCAG e indicatori di loading.
4. Dashboard/catalogo raggruppano **prodotto padre con varianti**; non presentare le varianti come prodotti indipendenti da gestire nello stesso modo. Supportare ricerca per nome, SKU, tipo, origine, stato e filtro «Da correggere». Selezionare una variante apre contesto padre e modifica mirata.
5. Workflow visibile: **Bozza interna → Bozza Shopify → Da verificare → Pubblicato**. Per prodotti esistenti: **Pubblicato → Modifica proposta → Confronto Shopify → Conferma aggiornamento → Verifica sul sito**. Show next action and owner.

## Autonomia Shopify di Marco, a privilegi minimi
1. Il proprietario chiede che Marco, **identificato con esattezza nell'anagrafica staff**, possa aggiornare prodotti Shopify già esistenti e pubblicare nuovi prodotti. Implementare nuove **capability separate e ristrette**, applicate server-side soltanto al suo account Editor: lettura/matching, modifica di campi approvati, creazione DRAFT, sincronizzazione modifiche, pubblicazione del singolo prodotto. Niente owner/admin globale, niente gestione staff, ordini, clienti, pagamenti, DNS, impostazioni o token.
2. Consentire la correzione di prodotti pubblicati mantenendo come fonte autorevole Shopify: titolo, descrizione breve/estesa (mapping distinto verificato), SEO, tag, categorie/collezioni, immagini/alt e prezzi delle varianti **solo se l'API e i permessi necessari sono verificati**. Non cambiare giacenze, inventario, imposte, logistica, struttura varianti, SKU, URL/handle e canali senza una capability specifica e conferma esplicita. Per gallerie e varianti esistenti, se l'integrazione diretta è tecnicamente disponibile, implementarla in modo controllato; altrimenti creare passaggio contestuale alla scheda Shopify senza dichiarare autonomia completata.
3. **Matching sicuro**: product/variant ID Shopify persistiti, parent SKU + variant SKU, verifica di corrispondenza univoca, gestione di mapping assenti/ambigui, collisioni, varianti legacy Woo e controllo concorrenza/versione. Non creare duplicati né collegare per sola somiglianza del titolo.
4. **Flusso aggiornamento**: modifiche in bozza locale, riepilogo diff vecchio/nuovo, conferma esplicita «Aggiorna su Shopify», esito Admin API, rilettura Shopify, audit (chi/cosa/quando, old/new con minimizzazione dati), rollback/manual restore e nessuna ripetizione cieca delle scritture in caso di timeout.
5. **Flusso pubblicazione**: creazione DRAFT, checklist obbligatoria di dati, prezzo, varianti, categoria, immagine, inventario/stato disponibilità, shipping class, canale; conferma esplicita «Pubblica su Shopify» e successiva verifica di presenza effettiva sul catalogo pubblico e possibilità di acquisto se applicabile. La sola sincronizzazione non implica la pubblicazione. Non pubblicare prodotti marcati test/technical.
6. Se l'account Shopify staff ha bisogno di capacità native aggiuntive, documentare la **minima configurazione manuale** per Marco e non simulare una permission che la piattaforma non concede.
7. RLS, capability API, access-control per ID e anti-IDOR; rate limit, idempotence, audit, no secrets in browser. Non estendere permessi a tutti i ruoli Editor né ai clienti Shopify. Migrazioni reversibili, policy e snapshot pre-deploy.

## Criteri di test e rilascio
- As Marco Editor, dashboard mostra solo campi editabili; pannello Advanced chiuso espone gli altri con motivazione. Ruolo admin mantiene gli strumenti tecnici.
- Un singolo prodotto esistente **non tecnico** e uno nuovo DRAFT di test esplicitamente autorizzati: modificare un campo sicuro e verificarne il risultato Shopify; provare anche un aggiornamento via API che fallisce, conflitti, permessi negati, SKU ambiguo, variante e rollback. Non modificare prodotti commerciali senza un target di collaudo approvato.
- Inserimento AI produce descrizioni breve ed estesa differenziate e persistenti, senza duplicazione del mapping.
- Pubblicazione in ambiente idoneo e test autorizzato; se non autorizzato a una reale pubblicazione, eseguire simulazione completa e distinguere chiaramente `LIVE_PUBLISH_NOT_TESTED` da `PASS`.
- Test permessi rifiutati, SPA, mobile, Safari/iPhone, accessibilità, storefront, checkout senza ordine, login clienti/staff, catalogo Shopify, CI.
- Delivery: PR unica o intervento coordinato con documentazione `docs/PROJECT_STATUS.md`, guida Marco, note UX designer, handoff developer, QA e SAL. **GO separati** per migrazioni/grant, Edge, merge e Publish, eseguiti solo con prerequisiti e mandato verificabili; mai inviare modifiche commerciali senza conferma esplicita nel pannello.

**Non ancora implementato**: questa pagina è una specifica approvabile, non un attestato di rilascio.


## Addendum · 25 novembre 2026 — chiusura AI e ciclo di vita prodotto (requisiti richiesti dal committente)

**Stato:** SPECIFICA DA IMPLEMENTARE, non prova di avvenuto rilascio. PR #74 e #75 sul ramo Lovable isolato già integrate; non riimplementare ciò che funziona. La SAL 57,75% non cambia senza accettazione.

### Obiettivo UX «Marco in pochi passaggi»
- Home scheda per ruolo Editor basata sui permessi server: vista principale con soli campi/CTA realmente operativi, e **«Opzioni avanzate · Dati tecnici e permessi»** chiusa di default per ogni campo bloccato, identificativo, dettaglio di mapping, motivo `Non disponibile per il tuo ruolo`, log. Nessun elemento importante per l'azione primaria va nascosto.
- Azione primaria per nuova scheda **«Completa con AI»**; per esistente **«Migliora con AI»**. Nome, categoria e fatti confermati come ingresso; consentire anche fatti importati da Shopify evidenziando chiaramente le informazioni *da confermare*. Precompilare il contesto conosciuto senza chiedere di ridigitare dati, ma l'AI non può creare fatti non verificati.
- Una chiamata strutturata ove possibile produce descrizione breve `custom.short_intro`, descrizione lunga `descriptionHtml`, SEO title, SEO description, tag, eventuali caratteristiche/FAQ soltanto verificate e supportate. Validazione/fallback per campo, provenance, preview compatta e **«Applica proposte»** con selezione predefinita dei soli campi validi e autorizzati. I contenuti confermati manualmente prevalgono; nessuna sovrascrittura implicita di valori Shopify, prezzo, inventario, SKU, immagini o stato di pubblicazione. Editor può espandere il confronto campo per campo.
- Per prodotto esistente percorso minimo: **Modifica → AI facoltativa → Rivedi modifiche → Salva e aggiorna Shopify** con un'unica conferma finale consapevole, attuato come operazioni server distinte e verificabili (persistenza, comparison, mutation selettiva, rilettura), idempotenza, controllo concorrenza e rollback. Per nuovo: **Completa con AI → Rivedi → Salva e crea bozza Shopify → Verifica e pubblica** con conferma esplicita di pubblicazione. Non rendere opaca la distinzione tra DRAFT, online e acquistabile.

### Gestione prodotti esistenti, varianti e ciclo di vita
- Correzione su Shopify dei campi autorizzati, senza duplicazione/matching per titolo; ruoli `edit`, `sync`, `publish` già registrati per Marco, ma controlli live obbligatori. Le tre chiavi aggiuntive da esaminare individualmente sono `tags`, `product_gallery` e `product_formats`.
- Completare, se richiesto per autonomia reale, creazione/eliminazione di combinazioni su famiglie Shopify **già collegate**, ora non supportata dalla PR #74: identificativi Shopify, riconciliazione interna, prezzi, SKU, stock e media, no retry cieco, conferma per le rimozioni e protezione degli ordini.
- **Tre azioni distinte e visibili in modo comprensibile**:
  1. `Rimuovi dal sito` (unpublish dal canale specifico; prodotto Shopify conservato);
  2. `Archivia` (stato ARCHIVED, recuperabile tramite riattivazione; spiegare impatto sugli altri canali);
  3. `Elimina definitivamente` (mutation Shopify `productDelete`, irreversibile: accesso specifico nominativo distinto `product_delete`, non concesso per default; conferma rafforzata digitando SKU/titolo e ID identificato; verifica collegamenti padre/varianti, ordini, media, SEO, redirect e storico; audit e tombstone locale, no cancellazione cieca di righe interne e no hard delete di media condivisi).
- Unpublish/archive anche con permessi separati e conferma esplicita. Se manca scope Shopify reale, mostra messaggio operativo senza simulare successo. Nessun prodotto commerciale va eliminato, archiviato o messo offline in collaudo senza mandato per quell'ID.
- Colorazione semantica accessibile e distinta: verde contenuti/salvataggio, blu azioni Shopify, ambra verifiche, grigio Advanced/secondary, rosso eliminazione irreversibile ed errori (non per «Annulla»).
- Proteggere prodotti tecnici, casi con mapping incerto, non idonei per la pubblicazione, storici Woo e duplicati; se eliminazione definitiva impossibile o non autorizzata offrire l'alternativa reversibile, senza aggirare i controlli.

### Gate QA e release
- Test Node/Deno/PostgreSQL/Chromium+Safari: un account Marco e altro Editor, nuova bozza, prodotto esistente con varianti, AI reale con provider autorizzato e mock, sintesi diversa da lunga dopo rilettura Shopify, SEO/tag, foto/ALT, formati, confronto/sync, unpublish/archive/restore, consenso renforzato per delete e rifiuto server, perdita di rete e replay idempotente, percorsi pubblici e checkout.
- Nessuna nuova migrazione o deploy senza GO distinto. Per Lovable Cloud accettare come limite di piattaforma il 403 del download della revisione attiva; recupero preparato da commit documentato, con **rischio residuo dichiarato**: commit inviato non prova binaria della revisione runtime. Per rollback frontend usare come baseline immediatamente precedente alla PR #74 `index-BcqOotvz.js`, salvo riscontro live più recente.
- Documentare per designer/developer/cliente e SAL con categorie IMPLEMENTED / MOCK_TESTED / LIVE_VERIFIED / PUBLISHED / CLIENT_ACCEPTED. Non dichiarare autorizzazione a cancellazioni reali solo perché il committente ne richiede la funzionalità.
