# Admin V2 — nuovo prodotto, implementazione controllata

**Addendum 1 novembre 2026:** [verifica read-only dello schema Supabase reale](ADMIN-V2-LIVE-SUPABASE-COMPATIBILITY.md) completata. La migration è strutturalmente compatibile e non applicata; le nuove RPC/tabelle sono quindi ancora assenti live. Il registro campi contiene le chiavi usate dal form, ma `product_category_shopify_map` e `product_category_assignments` hanno zero righe: l'Admin V2 non può oggi scegliere categorie canoniche verificabili. Prima del canary occorre riconciliare 22 categorie interne con i 23 handle dell'allowlist e le collezioni reali, con approvazione esplicita. Le 194 famiglie senza Product GID nel mapping legacy richiedono verifica separata. L'attivazione dei flag resta OFF. Le sezioni datate 31 ottobre sotto descrivono la situazione precedente al controllo live.

Aggiornamento 31 ottobre 2026. Base `main@b5cbe57` (PR #39 e #41 integrate; #40 esclusa). Il [piano originale del 30 ottobre](https://github.com/Rosin355/your-e-commerce-blueprint/blob/243406976f8a8fe70879103460bc23772b7dc227/docs/ADMIN-V2-NEW-PRODUCT-PLAN.md) rimane conservato sul branch di audit. Questo documento descrive il codice nuovo, non un'attivazione live.

## Stato verificabile

| Perimetro | Stato |
| --- | --- |
| Categorie interne, mapping, ricerca, associati/non classificati/multi-associati | IMPLEMENTED; TESTED con API simulate |
| Anteprima assegnazioni interne e confronto Shopify se disponibile | IMPLEMENTED; backend e autorizzazioni testati localmente; membership per prodotto non verificate live; lettura finale limitata a metadati/conteggi |
| Assegnazione Shopify, rilettura, approvazione interna e registro operazione | IMPLEMENTED, NOT YET ENABLED; serve canary autorizzato |
| Nuovo prodotto manuale, validazione, anteprima, salvataggio canonico | IMPLEMENTED; TESTED in PostgreSQL locale e browser simulato |
| Invio DRAFT Shopify e recupero dopo timeout/fallimento DB | IMPLEMENTED; TESTED con adapter Shopify simulato; NOT YET ENABLED |
| AI | Riutilizzata nella scheda canonica tramite suggerimenti per campo e accettazione umana; nessuna chiamata AI eseguita |
| Pubblicazione | NOT YET ENABLED; nessuna nuova action di pubblicazione; il pannello non può attivare un prodotto |
| Import inverso Shopify → canonico | Progettato sotto; non implementato come import automatico |
| Schema/ruoli/flag nel progetto live | NON LIVE VERIFIED in questa fase |

## Identità e autorità

`products` resta l'unico registro canonico. Un prodotto con un formato è `simple`; con più formati è `variable` con righe `variation` e parent esplicito. La normalizzazione SKU già presente nel DB impedisce duplicati case-insensitive/trim. Non si inferiscono parent da suffissi.

`admin_product_operations` è il journal immutabile della richiesta di creazione, non un catalogo commerciale separato. I dati compilati sono la proposta iniziale; i contenuti editoriali supportati sono scritti anche in `product_current_values`, con origine manuale e pubblicazione bloccata. Prezzi, immagini, tag, fornitore e formati della richiesta vengono inviati solo con la creazione esplicita DRAFT; non diventano un secondo inventario autonomo.

| Dato | Autorità |
| --- | --- |
| Identità canonica, parent, SKU riservato | Supabase `products`, vincoli SQL |
| Product/Variant GID | Shopify, acquisito e verificato; link persistito atomicamente |
| Proposta editoriale e AI accettata | Current values Admin, versionata; sync esistente esplicita |
| Prezzi dopo creazione, inventario, disponibilità, ordini, pubblicazione | Shopify; nessuna quantità inventata o sincronizzazione inventario nuova |
| Categoria interna | Tassonomia Supabase; proposta distinta da assegnazione approvata |
| Membership Shopify | Shopify; verificata prima e dopo l'operazione |
| Menu | `src/config/categories.ts`; non è un assegnatore di categorie |

Il reader esistente `getExactShopifyProductMapping` riconosce i nuovi link verificati oltre al mapping legacy per SKU esatto. Se entrambi esistono con GID differenti fallisce, senza scegliere silenziosamente. Se la migration additiva non è ancora presente, solo gli errori specifici di tabella assente consentono il fallback legacy.

## Protocollo creazione e recupero

1. Compilazione, validazione server, confronto SKU nel catalogo interno e conferma.
2. RPC transazionale: verifica ruolo DB, lock per attore/request key, replay del payload, identità parent/varianti, current values, proposte categorie e journal. Un errore annulla tutta la transazione.
3. Invio solo admin/tech_admin, flag dedicato, riferimento di approvazione operativa e conferma. Verifica valuta base Shopify, ricerca SKU anche tra bozze, mapping delle collezioni manuali. Se i contenuti interni sono cambiati dopo la richiesta, blocco anziché inviare una versione obsoleta.
4. Claim atomico `LOCAL_DRAFT → IN_FLIGHT` prima della mutation. Creazione con `productSet`, versione API esplicita `2026-01`, senza identificatore di aggiornamento, stato DRAFT fisso, handle e marker dell'operazione. Non viene aggiornato un prodotto esistente.
5. Rilettura Shopify, verifica stato, marker, SKU/Variant GID e prezzi; commit atomico dei link e stato `VERIFIED_DRAFT`.
6. Timeout o errore: nessun ritorno a `LOCAL_DRAFT`. Recupero tramite query dell'handle/marker e stessi SKU; se una bozza non è individuata univocamente, intervento tecnico. Assenza nella ricerca non autorizza una seconda creazione.
7. Se Shopify riesce e Supabase fallisce, il recupero completa soltanto il mapping. La prova simulata copre questo caso.

**Limite distribuito:** Shopify non offre qui una transazione unica con Supabase. Un edit esterno tra preflight e mutation può ancora creare conflitti; il canary deve verificare concorrenza e ricerca SKU dello store. Le associazioni Shopify asincrone non ancora visibili diventano `NEEDS_RECONCILIATION`, senza dichiarare successo o ripetere scritture automaticamente.

## Permessi e attivazione

- Letture: ruoli V2 già ammessi; viewer/user/moderator senza accesso. Nessun nuovo ruolo assegnato.
- Bozza interna: editor/admin/tech_admin; in canary solo admin/tech_admin. Richiede `PRODUCT_ADMIN_WRITES_ENABLED` e `PRODUCT_ADMIN_DRAFTS_ENABLED`.
- Invio Shopify: admin/tech_admin, `PRODUCT_ADMIN_WRITES_ENABLED=true`, `PRODUCT_ADMIN_DRAFT_SHOPIFY_ENABLED=true` e approvazione operativa per **uno specifico** `operationId`, oltre alla conferma. Il recupero di un invio già iniziato resta possibile anche dopo la disattivazione dei flag: verifica una bozza esistente e completa solo il mapping.
- Assegnazioni Shopify: admin/tech_admin, `PRODUCT_ADMIN_WRITES_ENABLED=true`, `PRODUCT_ADMIN_CATEGORIES_ENABLED=true`, approvazione per l’`expectedHash` esatto della proposta, conferma e rilettura. Se il catalogo interno e le membership canoniche Shopify divergono, non si esegue alcuna mutation.
- `PRODUCT_ADMIN_OPERATIONAL_APPROVAL` è un JSON server-side, non un token: `{ "action": "create_shopify_draft", "target": "<operationId UUID>", "expiresAt": "<ISO UTC entro 24 ore>" }` oppure `{ "action": "apply_categories", "target": "<expectedHash SHA-256>", "expiresAt": "<ISO UTC entro 24 ore>" }`. Una stringa generica, `false`, un target diverso o un’approvazione scaduta sono rifiutati. Configurarlo solo per il canary autorizzato, poi rimuoverlo; non inserirvi credenziali.
- Recupero bozza già inviata: admin/tech_admin, query Shopify e mapping interno; non crea un nuovo prodotto anche se il flag di invio è stato disattivato.
- Tabelle nuove con RLS e privilegi diretti revocati ad anon/authenticated; RPC SECURITY INVOKER, execute solo service_role, ruoli dell'attore riletti anche in SQL.

Tutti i flag nuovi sono OFF se assenti. Nessun valore live è stato cambiato. Migrazione preparata ma non applicata live.

## Limiti espliciti del primo blocco

Una opzione commerciale “Formato”, massimo 50 varianti, 20 immagini già caricate su CDN Shopify; nessun nuovo uploader o generatore immagini. La bozza interna salvata è una richiesta immutabile: una revisione dei contenuti prima dell'invio richiede gestione tecnica, non un reinvio automatico. L'AI è disponibile dalla scheda esistente; non è necessaria alla creazione manuale. Campi botanici salvati internamente richiedono la sync a campo già approvata per arrivare a Shopify. Pubblicazione e canali non sono attivati dalla nuova UI.

Non sono state applicate migration precedenti al live, eseguiti backfill, riassegnati i 903 prodotti storici o riconciliati automaticamente gli 82.

## Caso inverso: prodotto creato direttamente su Shopify

Prima fase read-only: export Admin autorizzato di Product GID, Variant GID, SKU esatti, stato e pubblicazioni; confronto con `products`, link nuovi e mapping legacy. Classificare: già collegato identico; SKU assente; SKU ambiguo; GID discordante; parent incompleto. Non usare titolo/handle come identità sostitutiva.

Dopo approvazione separata: un'unica transazione idempotente può riservare identità mancanti e registrare GID verificati, senza modificare il prodotto Shopify. Un SKU già collegato ad altro GID blocca; nessun overwrite dei current values manuali. L'importatore inverso resta sviluppo successivo; eventuali webhook richiedono HMAC, deduplicazione e policy di conflitto e non vengono introdotti ora.

## Gate prima del cliente

Review backend/SQL; verifica schema reale e registro campi; migrazione autorizzata; deploy separatamente autorizzato; conferma valuta/scopes e sessione test; canary DRAFT su SKU concordato; canary assegnazioni su prodotto concordato; rollback operativo e recupero dei timeout; ruolo Marco senza escalation automatica; decisione su chi può inviare e pubblicare. Vedere [QA](ADMIN-V2-QA-REPORT.md) e [notifiche](SHOPIFY-EMAIL-NOTIFICATIONS-AUDIT.md).


Addendum live: connessione Shopify Admin disponibile a fine sessione, store corretto e valuta EUR confermati; italiano principale e nuovi account facoltativi confermati. Conteggi 1.348 ACTIVE / 16 DRAFT / 55 collezioni. Nessun canary o test delle scritture: [audit aggiornato](CATALOG-ALIGNMENT-AUDIT.md).
