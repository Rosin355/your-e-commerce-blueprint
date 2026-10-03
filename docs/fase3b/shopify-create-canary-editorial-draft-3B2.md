# Fase 3B.2 — Bozza editoriale canary (NON approvata)

Data: 3 ottobre 2026. Solo letture: manifest 3B.1C privato + database. Nessun manifest finale, migration, deploy, DRY_RUN o write Shopify.

## Selezione

927 famiglie superano i filtri del manifest (parent CREATE_VARIABLE_PARENT, 1–2 varianti, NOT_PRESENT, contenuti/immagini pronti, prezzo > 0, stock 20, nessun mapping/blocco, denylist e TEST esclusi). Solo **1** ha immagini tutte su HTTPS: **OG_736435** (1 variante, 1 immagine). Le altre usano `http://www.onlinegarden.it/...`.

Candidata: parent `OG_736435`, child `OG_736435-01`, 1 variante.

Mappatura provenienza: `legacy_db_baseline` = testo importato da WooCommerce → **ORIGINAL**; `legacy_ai_unknown_approval` (publish_blocked=true) → **AI**; immagine nel bucket `sync/product-images/` (cartella delle immagini generate dalla funzione AI, non dal sito originale) → **UNKNOWN / probabile AI**.

## Valori (testo invariato)

- **Title parent:** `Spiraea Trilobata - Spirea`
- **Title child:** `Spiraea Trilobata - Spirea - Ø Vaso: 19cm - Altezza Pianta: 25cm`
- **Description parent:** testo piano in due paragrafi (inizia “La Spiraea trilobata è un arbusto deciduo…”, termina “…semplicità di gestione e durata nel tempo.”). Contiene la sequenza letterale `\n` tra i paragrafi, non HTML.
- **Short description:** “La Spiraea trilobata è un arbusto ornamentale compatto e rustico… unisce eleganza naturale e grande adattabilità.”
- **Prezzo child:** 8.9
- **Immagine:** `https://<backend>/storage/v1/object/public/sync/product-images/OG_736435.png`
- **Categoria raw:** Piante da Esterno > Arbusti
- **Handle:** assente nel database
- **Option names / values:** assenti (snapshot `variant_options = {}`); il formato è solo nel titolo del child
- **SEO title/description, optimized_description:** presenti, AI, publish_blocked

## Tabella

| FIELD | VALUE | SOURCE | SAFE_FOR_CANARY | REASON |
|---|---|---|---|---|
| parent SKU | OG_736435 | ORIGINAL | YES | manifest + DB coerenti |
| child SKU | OG_736435-01 | ORIGINAL | YES | unica variante |
| title | Spiraea Trilobata - Spirea | ORIGINAL | YES | approved, non bloccato |
| description | testo Woo (vedi sopra) | ORIGINAL | NO | contiene `\n` letterale, non HTML; da confermare o correggere da parte del proprietario |
| short_description | testo Woo | ORIGINAL | YES | non usato dall'executor |
| handle | — | UNKNOWN | NO | assente; richiesto dal contratto |
| option names | — | UNKNOWN | NO | assenti |
| option values | — | UNKNOWN | NO | solo nel titolo child, non strutturati |
| price | 8.9 | ORIGINAL | YES | > 0, due decimali ammessi |
| media | OG_736435.png (bucket sync) | UNKNOWN (probabile AI) | NO | non dal sito originale; nessuna approvazione registrata |
| seo_title / seo_description | testi AI | AI | NO | publish_blocked |
| optimized_description | testi AI | AI | NO | publish_blocked |
| stock target | 20 | ORIGINAL | YES | manifest |

## Esito

**CANARY EDITORIAL DRAFT — BLOCKED: handle e opzioni assenti nel database, immagine di provenienza non verificata (probabile AI), descrizione con `\n` letterale.**

Problemi a livello di catalogo: 0 handle salvati, 0 opzioni strutturate, 1.056/1.517 liste immagini su `http://`.
