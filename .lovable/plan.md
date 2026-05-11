## Obiettivo
Risolvere i 404 del mega menu creando le collezioni **manuali** su Shopify (popolate da me con prodotti coerenti) e collegando la storefront con una nuova pagina `/collections/:handle`. Sistemo anche tutti gli `href` "/n…" rotti.

## 1. Collezioni Shopify (manuali)
Per ogni handle del mega menu creo una collezione manuale e ci aggiungo i prodotti pertinenti già presenti nel catalogo (faccio prima un censimento via `shopify--search_products` per categoria/tag/titolo, poi popolo). Le collezioni:

- `fioriture-stagionali`, `rampicanti`, `balconi-e-terrazze`, `sempreverdi`, `piante-da-esterno`
- `rose-cespuglio`, `rose-rampicanti`, `rose-profumate`, `rose`
- `agrumi`, `piccoli-frutti`, `alberi-da-frutto`, `varieta-da-terrazzo`, `piante-da-frutto`
- `vasi-da-esterno`, `accessori`, `aromatiche`, `bulbi`, `idee-regalo`, `altre-categorie`

Se per una collezione non trovo prodotti coerenti la creo comunque vuota (così il cliente la potrà popolare in autonomia da admin) e la pagina mostrerà lo stato "nessun prodotto".

## 2. Frontend – pagina collezione
- Aggiungo `fetchCollectionByHandle(handle, first)` in `src/lib/shopify.ts` (Storefront API `collectionByHandle`, versione `2025-07`).
- Nuova pagina `src/pages/CollectionPage.tsx` che riusa il layout di `AllProducts` filtrato per collection (titolo + descrizione collezione, stato vuoto, loading skeleton).
- Registro route `/collections/:handle` in `src/App.tsx`. Mantengo `/nall` per retrocompatibilità.

## 3. Fix degli href rotti
Sostituzione mirata in:
- `src/components/storefront/HomeHeaderOverlay.tsx` (mega menu: `nxxx` → `/collections/xxx`)
- `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/storefront/HomeHero.tsx`, `src/components/storefront/HomepageV3.tsx` (`nall` → `/collections/all` o rotta esistente di "tutti i prodotti")

## 4. QA
- Apro 4-5 voci diverse del mega menu in preview, verifico che la pagina carichi i prodotti della collezione corrispondente.
- Verifico stato vuoto sulle collezioni senza prodotti.
- Controllo che "Tutti i prodotti" continui a funzionare.

## Note tecniche
- Le collezioni sono **manuali** (non smart): il tuo cliente potrà aggiungere/togliere prodotti uno a uno dall'admin Shopify.
- Per popolare ora, scelgo prodotti per affinità di titolo/tag/tipo (es. agrumi → limoni/arance, rampicanti → glicine/gelsomino, ecc.). Tutto reversibile dall'admin.
