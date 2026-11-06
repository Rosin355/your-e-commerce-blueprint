## Perimetro della versione in sola lettura

La gestione categorie è isolata dal frontend pubblicabile: non vengono richiesti nuovi cataloghi/RPC o applicate associazioni. La tabella decisionale per Marco resta una proposta per un'eventuale attivazione successiva, non un prerequisito per consultare dashboard/prodotti oggi. Zero mapping applicati in questo intervento. Nessuna modifica alle collezioni logistiche A/B.

## Tabella decisionale per Marco — proposta, non applicazione

Riutilizzo dei riferimenti già rilevati il 1 novembre, senza nuove letture Shopify e senza modificare categorie/collezioni A/B. Tutte le 22 righe restano proposte: nessun mapping approvato. Prima di una write futura va riconfermata la destinazione tecnica indicata nella matrice originale sotto.

| Categoria interna | Collezione Shopify proposta (handle) | Affidabilità | Decisione necessaria | Eccezione |
|---|---|---|---|---|
| Aromatiche | `aromatiche` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Bulbi | `bulbi` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Bulbi → Fioritura Autunnale | Nessuna proposta certa | Nessuna | Lasciare senza mapping o progettare separatamente | Nessuna creazione automatica |
| Bulbi → Fioritura Estiva | Nessuna proposta certa | Nessuna | Lasciare senza mapping o progettare separatamente | Nessuna creazione automatica |
| Bulbi → Fioritura Primaverile | Nessuna proposta certa | Nessuna | Lasciare senza mapping o progettare separatamente | Nessuna creazione automatica |
| Erbacee e Graminacee | `erbacee-perenni-graminacee` | Ambigua | Scegliere la destinazione canonica | Più alternative nella matrice tecnica |
| Grasse e Succulente | `piante-grasse-succulente` | Ambigua | Scegliere la destinazione canonica | Più alternative nella matrice tecnica |
| Piante da Esterno | `piante-da-esterno` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Piante da Esterno → Alberi | `alberi` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Piante da Esterno → Arbusti | `arbusti` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Piante da Esterno → Conifere | `conifere` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Piante da Esterno → Siepi | `piante-da-siepe` | Media | Validare contenuti e gerarchia | Nome simile non sufficiente |
| Piante da Frutto | `piante-da-frutto` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Piante da Frutto → Alberi da Frutto | `alberi-da-frutto` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Piante da Frutto → Piccoli Frutti | `piccoli-frutti` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Rampicanti | `rampicanti` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Rose | `rose` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Rose → Rose a Cespuglio | `rose-cespuglio` | Media | Validare contenuti e gerarchia | Nome simile non sufficiente |
| Rose → Rose a Fiore Grande | `rose-fiore-grande` | Media | Validare contenuti e gerarchia | Nome simile non sufficiente |
| Rose → Rose Paesaggistiche | `rose-paesaggistiche` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Rose → Rose Rampicanti | `rose-rampicanti` | Alta tecnica | Confermare significato e approvare | Non ancora approvata |
| Rose → Rose Tappezzanti | Nessuna proposta certa | Nessuna | Lasciare senza mapping o progettare separatamente | Nessuna creazione automatica |

# Riconciliazione: stato confermato 6 novembre 2026

**Aggiornamento 6 novembre 2026 — PR #42; questa sezione prevale sugli stati storici sottostanti.**

SELECT sul backend Lovable: **22 categorie interne, 0 mapping, 0 assegnazioni**. La matrice del 1 novembre sotto è riutilizzata senza ripetere l'audit Shopify; handle/GID candidati devono essere riletti prima di una write futura. Nessun mapping approvato o prodotto riconciliato in questa sessione, nessuna collezione logistica A/B toccata.

| Gruppo da presentare a Marco | Numero | Decisione residua |
|---|---:|---|
| Handle identici, riferimenti tecnici univoci nella matrice | 13 | Confermare semantica e autorizzare il mapping; non sono già approvati. |
| Siepi, Rose a Cespuglio, Rose a Fiore Grande | 3 | Validare gerarchia e contenuti del candidato plausibile. |
| Erbacee/Graminacee; Grasse/Succulente | 2 | Scegliere la collezione canonica rispetto alle alternative; nessuna deduzione dal nome. |
| Bulbi Fioritura Autunnale/Estiva/Primaverile; Rose Tappezzanti | 4 | Mantenere senza mapping o progettare separatamente la destinazione; nessuna creazione automatica. |

Le **194 famiglie senza Product GID legacy** (112 simple, 82 variable, snapshot precedente) non sono 194 prodotti Shopify mancanti. Nessun backfill basato sul titolo. La futura riconciliazione deve usare SKU, ID e riferimenti Shopify verificati; gli eventuali casi non univoci restano bloccati senza duplicazione. La mappatura interna non è completabile oggi senza approvazione dei candidati e collaudo staging.

# Admin V2 — piano di riconciliazione categorie Shopify–Supabase

Controllo **read-only, 1 novembre 2026**, su Supabase Online Garden (reference `iekwvvihjwghosqdxrdi`) e Shopify Admin dello store `ecom-blueprint-gen-6ud1s.myshopify.com`. Snapshot logico raccolto con SELECT sulle categorie e aggregati Supabase e con paginazione completa delle 55 collezioni Shopify. Le interrogazioni non sono una transazione fra sistemi: rileggere prima di approvare o applicare. **Zero mapping live** in `product_category_shopify_map`, **zero assegnazioni** in `product_category_assignments`. Questa tabella è una proposta, non una modifica al catalogo.

## Regole di valutazione

`EXACT` significa soltanto che lo slug interno è identico a un handle Shopify esistente e che il relativo Collection GID è stato letto. Non dimostra corrispondenza semantica o prodotti corretti e **non equivale a `map_status='verified'`**. `PLAUSIBLE` richiede approvazione del significato; `MULTIPLE` richiede scegliere fra più collezioni; `NO_MATCH` non autorizza a creare o dedurre una collezione. Tutte le collezioni candidate lette qui sono `custom/manual` (`ruleSet=null`); la tipologia andrà riletta prima di qualsiasi write. La confidenza riguarda il *candidato*, non la qualità delle associazioni prodotto.

## Matrice delle 22 categorie interne

| ID categoria interna | Nome / gerarchia | Handle candidato | Collection GID letto | Tipo | Stato | Evidenza | Confidenza | Azione proposta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `8ccb9533-1fa7-4f21-8dad-047ae38d7c2b` | Aromatiche | `aromatiche` | `gid://shopify/Collection/712003879252` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 9. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `426696e3-b1bd-4b35-856c-d6f5e159c4c0` | Bulbi | `bulbi` | `gid://shopify/Collection/712003912020` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 21. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `950cfe2f-0956-4d31-aae5-6d30fe4a9e27` | Bulbi → Fioritura Autunnale | — | — | — | NO_MATCH; **non mappata** | Nessun handle canonico o titolo univoco per la stagione. | — | Decidere se mantenere senza mapping o progettare collezione separata. |
| `fee2bc8c-f0ad-4816-a486-a35380c65fe7` | Bulbi → Fioritura Estiva | — | — | — | NO_MATCH; **non mappata** | Nessun handle canonico o titolo univoco per la stagione. | — | Decidere se mantenere senza mapping o progettare collezione separata. |
| `c00d0d14-e196-4cb8-adb0-e9f6c5fa58ed` | Bulbi → Fioritura Primaverile | — | — | — | NO_MATCH; **non mappata** | Nessun handle canonico o titolo univoco per la stagione. | — | Decidere se mantenere senza mapping o progettare collezione separata. |
| `029908a6-da14-4d1a-af91-ee97bd44c8de` | Erbacee e Graminacee | `erbacee-perenni-graminacee` | `gid://shopify/Collection/717815284052` | custom/manual | MULTIPLE; **non mappata** | Esiste anche `erbacee-perenni-e-graminacee` fuori allowlist. Conteggio Shopify: 43. | media | Confrontare contenuto/gerarchia con Marco; approvare un solo mapping. |
| `d77f05f4-6f4f-478a-beed-5dcbd048e5bb` | Grasse e Succulente | `piante-grasse-succulente` | `gid://shopify/Collection/717815349588` | custom/manual | MULTIPLE; **non mappata** | Esiste anche la collezione indoor `piante-da-interno-piante-grasse-e-succulente`. Conteggio Shopify: 0. | bassa | Confrontare contenuto/gerarchia con Marco; approvare un solo mapping. |
| `b93f8398-340a-4b51-bc07-57b6c056983b` | Piante da Esterno | `piante-da-esterno` | `gid://shopify/Collection/712003354964` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 566. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `e3c35839-6df1-4b61-be96-61d504c24310` | Piante da Esterno → Alberi | `alberi` | `gid://shopify/Collection/717815251284` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 25. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `06c69fdb-b19a-4c0e-b990-3d9744386f56` | Piante da Esterno → Arbusti | `arbusti` | `gid://shopify/Collection/717815218516` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 538. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `2bedd1c3-3f21-4b09-b45a-c909ceebf86c` | Piante da Esterno → Conifere | `conifere` | `gid://shopify/Collection/717815415124` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 59. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `260f7af1-78b3-40b1-aea4-8b47185ca7d8` | Piante da Esterno → Siepi | `piante-da-siepe` | `gid://shopify/Collection/717815316820` | custom/manual | PLAUSIBLE; **non mappata** | Nome equivalente, slug interno diverso; presenti anche collezioni legacy combinate. Conteggio Shopify: 69. | media | Confrontare contenuto/gerarchia con Marco; approvare un solo mapping. |
| `ebaa49dc-ce11-46e1-8fc4-97acbf6dc52b` | Piante da Frutto | `piante-da-frutto` | `gid://shopify/Collection/712003617108` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 138. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `128b8149-cdb8-4664-8ef4-1116f2159f00` | Piante da Frutto → Alberi da Frutto | `alberi-da-frutto` | `gid://shopify/Collection/712003715412` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 1. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `10c5cbe1-2974-4f75-8bb0-b1043821a6b1` | Piante da Frutto → Piccoli Frutti | `piccoli-frutti` | `gid://shopify/Collection/712003682644` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 1. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `0b8291c2-b2d6-4864-a166-d3bf7a19da81` | Rampicanti | `rampicanti` | `gid://shopify/Collection/712003420500` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 2. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `c1c29ed0-9b48-4170-b451-a165eb29b7da` | Rose | `rose` | `gid://shopify/Collection/708266230100` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 78. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `8b11854a-63ff-4375-8621-f6566b813f2a` | Rose → Rose a Cespuglio | `rose-cespuglio` | `gid://shopify/Collection/712003518804` | custom/manual | PLAUSIBLE; **non mappata** | Nome affine, slug interno diverso; collezione attualmente vuota. Conteggio Shopify: 0. | media | Confrontare contenuto/gerarchia con Marco; approvare un solo mapping. |
| `5be4eef3-22dd-41de-9510-1fe792607b4a` | Rose → Rose a Fiore Grande | `rose-fiore-grande` | `gid://shopify/Collection/717815185748` | custom/manual | PLAUSIBLE; **non mappata** | Nome affine, slug interno diverso; collezione attualmente vuota. Conteggio Shopify: 0. | media | Confrontare contenuto/gerarchia con Marco; approvare un solo mapping. |
| `02dd19d5-bc55-4097-8809-6f08ca4caa57` | Rose → Rose Paesaggistiche | `rose-paesaggistiche` | `gid://shopify/Collection/717815152980` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 0. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `e9456eb2-7dde-4f8e-befc-2723a88ef963` | Rose → Rose Rampicanti | `rose-rampicanti` | `gid://shopify/Collection/712003551572` | custom/manual | EXACT; **non mappata** | Handle interno identico all'handle Shopify. Conteggio Shopify: 0. | alta tecnica | Confermare semantica e approvare; nessuna write ora. |
| `211d7c44-de07-4cc8-8eac-29a13a2c66a8` | Rose → Rose Tappezzanti | — | — | — | NO_MATCH; **non mappata** | Nessuna collezione con handle corrispondente. | — | Decidere se mantenere senza mapping o progettare collezione separata. |

Risultato: **13 handle identici**, **3 corrispondenze plausibili**, **2 casi con più corrispondenze possibili**, **4 senza match**. Tutti richiedono approvazione prima di registrare il mapping. Le 23 collezioni dell'allowlist applicativa esistono come handle Shopify, ma non impongono una relazione 1:1 con le 22 categorie interne.

## Collezioni fuori dall'allowlist

Le restanti **32 delle 55** collezioni Shopify non sono nell'allowlist delle operazioni Admin V2. Handle osservati: `agrumi`, `altre-categorie`, `balconi-e-terrazze`, `bulbi-amaryllis`, `bulbi-dalie`, `bulbi-fresie`, `bulbi-gigli`, `bulbi-gladioli`, `bulbi-gloriosa`, `bulbi-hemerocallis`, `bulbi-iris`, `bulbi-tulipani`, `erbacee-perenni-e-graminacee`, `fioriture-stagionali`, `gift-card`, `frontpage`, `idee-regalo`, `piante-acquatiche-ninfee`, `piante-da-esterno-alberi`, `piante-da-esterno-arbusti`, `piante-da-esterno-arbusti-piante-da-esterno-siepi`, `piante-da-esterno-arbusti-piante-da-frutto`, `piante-da-esterno-conifere`, `piante-da-esterno-siepi-piante-da-esterno-arbusti`, `piante-da-frutto-piante-da-esterno-alberi`, `piante-da-frutto-piante-da-esterno-arbusti`, `piante-da-interno-orchidee`, `piante-da-interno-piante-carnivore`, `piante-da-interno-piante-da-appartamento`, `piante-da-interno-piante-grasse-e-succulente`, `rampicanti-e-arbusti-a-spalliera`, `varieta-da-terrazzo`. Alcune rappresentano tassonomie legacy o collezioni tecniche (`frontpage`, `gift-card`); altre hanno nomi simili ai candidati canonici. Vanno mantenute fuori dall'assegnazione automatica. Per ognuna, un successivo inventario read-only deve registrare il motivo dell'esclusione e l'eventuale conflitto semantico; nessuna eliminazione o fusione è proposta qui.

## Le 194 famiglie interne senza Product GID legacy

Conteggio aggregato sul database live: **112 simple + 82 variable**, tutte con `legacy_source='woocommerce'`, `shopify_sync_status` NULL nella riga parent e nessuna operazione `CREATE_PARENT/APPLIED` nel ledger per lo SKU parent. **Non è stato dimostrato** che questi prodotti manchino dallo Shopify Admin. Il valore 82 delle famiglie variable coincide numericamente con gli 82 storici `NEEDS_REVIEW`, ma non esiste evidenza di identità: non vanno sovrapposti.

Classificare deterministicamente dopo un export Shopify Admin read-only autorizzato di Product GID, Variant GID, SKU esatto, parent/varianti, stato e pubblicazioni. Per ciascuna famiglia: normalizzare SKU solo per la ricerca e conservare l'originale; confrontare parent e tutte le varianti; verificare in ordine mapping legacy, ledger, eventuali link nuovi e Shopify Admin. Gli esiti possibili sono: match univoco di Product GID e varianti; parent trovato ma varianti incomplete; SKU presente su più Product GID; varianti distribuite su prodotti diversi; GID discordante con mapping esistente; nessun SKU esatto trovato; ricerca/paginazione incompleta. Gli ultimi sei casi sono **bloccanti per qualunque backfill automatico**. Titolo, handle e descrizione non sostituiscono SKU/GID come identità.

Preparare un manifest di sola proposta con `internal_product_id`, SKU parent/varianti, GID candidati, fonte, timestamp, risultato dei controlli e decisione umana; non includere token né dati cliente. Un backfill futuro richiede approvazione separata, transazione idempotente con UNIQUE/controllo conflitto, dry-run e verifica post-write. **Nessuna riconciliazione o assegnazione è stata eseguita.**
