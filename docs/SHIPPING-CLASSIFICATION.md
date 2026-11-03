# Classificazione logistica Shopify — matrice di validazione

Audit read-only del **3 novembre 2026** sullo store `ecom-blueprint-gen-6ud1s.myshopify.com`. Stato: classificazione proposta, **zero scritture live**.

## Copertura reale

Lettura completa di **1.364 prodotti**, di cui 1.348 ACTIVE e 16 DRAFT, e **1.392 varianti**, di cui 1.376 su prodotti ACTIVE e 16 su DRAFT. Catalogo paginato in 46 pagine; associazioni variante/profilo verificate separatamente in 28 pagine. Tutte le varianti risultano nel profilo generale `139796676948`. Nessun `hasNextPage` residuo nelle connessioni raccolte di varianti, collezioni e namespace logistici.

Controlli: ID prodotto/variante, SKU, stato, product type, tag, categoria tassonomica, appartenenza a collezioni, `inventoryItem.requiresShipping`, peso, metafield prodotto/variante nei namespace `shipping` e `logistics`, prodotto `custom.shipping_class`; definizioni metafield PRODUCT e PRODUCTVARIANT.

- Tutti i 1.392 SKU sono presenti e univoci nell'istantanea.
- Nessun valore logistico nei namespace/campi controllati; 23 definizioni prodotto, nessuna definizione variante. Questo non dimostra l'assenza di qualsiasi metafield arbitrario in altri namespace.
- Tutti i 1.392 pesi letti sono zero. Nessuna dimensione nei namespace logistici raccolti: non si può dedurre una classe pesante/voluminosa né calcolare tariffe fisiche dal peso.
- 905 prodotti non hanno product type; i valori presenti sono prevalentemente `variable`, `variation`, `simple`, quindi descrivono l'importazione e non la logistica. I soli tag osservati sono `Corniolo` e `Cornus Florida`.
- Quattro prodotti hanno una categoria assegnata, ma è «Non categorizzato»; gli altri non ne hanno una.
- Tutte le varianti risultano `requiresShipping=true`. È compreso `OG_791194`, tipo `wgm_gift_card, virtual`, variante `55507177603412`: incongruenza da validare, non corretta automaticamente.

La precedente analisi WooCommerce menzionava le classi `Pesante` / `Non Pesante` e il mapping proposto `shipping.class`. Un mapping nel documento non equivale a valori presenti in Shopify; «Non Pesante» non prova l'idoneità alla B. [Fonte storica](wordpress-master-field-map.md).

## Matrice SKU/variante

[Matrice completa JSON, 1.392 righe](shipping-evidence/2026-11-03/classification-review.json). Ogni riga contiene ID prodotto/variante e SKU, evidenze osservate, suggerimento, origine del suggerimento, campi separati di approvazione e fallback A. [Istantanea sorgente](shipping-evidence/2026-11-03/catalog.json).

| Classe suggerita | Varianti | Evidenza | Applicazione attuale |
|---|---:|---|---|
| `bulb` | 118 | Collezione `bulbi` / `bulbi-*` | Non approvata; fallback A nel riferimento |
| `succulent` | 43 | Collezione piante grasse/succulente | Non approvata; fallback A |
| `shrub` | 612 | Collezioni contenenti arbusti | Non approvata; A |
| `standard` | 375 | Altre collezioni di piante | Non approvata; A |
| `unknown` | 244 | Informazioni insufficienti o in conflitto | A conservativa |
| `heavy` / `bulky` | 0 assegnabili con certezza | Peso zero e dimensioni assenti | Richiedono valutazione manuale |

I conteggi sono di **varianti**, includono DRAFT e non certificano categorie botaniche. Non viene usato il titolo commerciale per abilitare tariffe ridotte. Le collezioni sono indizi di revisione: non producono scritture o sconti automatici.

## Modello stabile proposto

Nuovo metafield merchant-owned **PRODUCTVARIANT `logistics.shipping_class`**, `single_line_text_field`, valori ammessi `bulb`, `succulent`, `shrub`, `standard`, `heavy`, `bulky`, `unknown`. La granularità variante consente di differenziare formati e confezioni dello stesso prodotto. Namespace condiviso necessario per la lettura da altre app; nessun dato botanico o metafield esistente viene sostituito.

Sequenza preparata: creare la definizione se assente e compatibile; scrivere **solo** le varianti esplicitamente approvate con `metafieldsSet`, massimo 25 per chiamata, `compareDigest:null` per esigere l'assenza del nuovo valore; rileggere valori e digest. Se la chiave compare nel frattempo, interrompere e produrre un diff separato. Nessuna mutation è stata eseguita. [Query e mutation preparate](../shipping/queries/).

Le approvazioni si registrano separatamente in [classification.approvals.pending.json](../shipping/classification.approvals.pending.json), con ID variante, classe, approvatore e riferimento. `npm run shipping:prepare` rigenera il piano senza trasformare i suggerimenti in approvazioni e senza perdere questo registro separato. Attualmente il registro è vuoto e il piano contiene **zero scritture di classificazione**.

Se l'app scelta non legge metafield variante, il piano offre un adattatore **allowlist SKU** derivato esclusivamente dalle approvazioni. Tutti gli articoli devono risultare nell'allowlist per usare B; SKU assente, duplicato o nuovo comporta A e blocca la compilazione di un'allowlist ambigua. Le capacità `ALL` / `ANY` dell'app restano da provare: la sola condizione «contiene un bulbo» è insufficiente. Non usare proprietà carrello controllabili dal browser come fonte della classe.

Marco deve validare i 161 candidati alla B, gli eventuali pesanti/voluminosi fra le altre classi, le 244 varianti incerte e l'anomalia gift card. Una variante fisica sconosciuta ricade sempre in A; un prodotto esplicitamente non spedibile blocca la consegna. Il digitale puro non richiede consegna; i carrelli misti digitale/fisico richiedono una decisione sulla base tariffaria prima dell'attivazione.
