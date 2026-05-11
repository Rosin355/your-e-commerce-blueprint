## Obiettivo

Sostituire i 2 placeholder a gradiente in ogni categoria del mega menu con foto realistiche generate con AI, far puntare ogni card alla collezione specifica, e collegare il bottone "Scopri tutto" alla collezione macro corretta (ora va a `/collections/all` ma è inerte sulla riga in cui si trova).

## Mappatura categorie → collezioni → immagini

Per ognuna delle 4 categorie del mega menu (`src/components/Header.tsx`), 2 card preview con foto dedicata e link a collezione esistente (collezioni create dal precedente setup):

| Categoria | Card 1 → handle | Card 2 → handle |
|---|---|---|
| Piante da esterno | "Vivere l'esterno" → `piante-da-esterno` | "Giardino essenziale" → `sempreverdi` |
| Rose | "Rose selezionate" → `rose` | "Regali floreali" → `rose-profumate` |
| Piante da frutto | "Agrumi" → `agrumi` | "Piccoli frutti" → `piccoli-frutti` |
| Altre categorie | "Vasi e accessori" → `vasi-da-esterno` | "Bulbi e stagionalità" → `bulbi` |

Bottone "Scopri tutto" → punta alla collezione macro della categoria attiva (es. `piante-da-frutto`, `rose`, `piante-da-esterno`, `vasi-da-esterno`), non più a `/collections/all`.

## Step di implementazione

1. **Generare 8 immagini** in `src/assets/megamenu/` con `imagegen` (modello `standard`, formato landscape, sfondo editoriale luminoso, stile coerente con brand premium):
   - `outdoor-living.jpg`, `evergreen-garden.jpg`
   - `rose-selection.jpg`, `rose-gift.jpg`
   - `citrus.jpg`, `berries.jpg`
   - `pots-accessories.jpg`, `bulbs-seasonal.jpg`

2. **Refactor `categories` in `src/components/Header.tsx`**:
   - Aggiungere campo `href` a ogni categoria (collezione macro) e a ogni `previewCards[i]` (collezione specifica + import immagine).
   - Sostituire il `div` con `bg-gradient-to-br ${card.tone}` con `<img src={card.image} ... className="h-48 w-full object-cover ...">`.
   - Aggiornare `<a href="/collections/all">` delle card con `card.href`.
   - Aggiornare il link "Scopri tutto" da `/collections/all` ad `activeCategoryData.href`.

3. **QA visivo**: aprire `/` in preview, hoverare ogni voce del mega menu, verificare che le 8 immagini si carichino correttamente e che i click portino alle collezioni giuste (incluso `bulbi` vuoto, comportamento atteso).

## Note tecniche

- Le immagini sono importate come asset ES6 (no `lovable-assets`), così Vite le ottimizza.
- Nessuna modifica al backend: tutte le collezioni target esistono già su Shopify dal precedente `setup-collections`.
- Il campo `tone` nelle card viene rimosso (non più usato).
- Mobile sheet: i link delle categorie continuano a usare la collezione macro (`category.href`) invece di `/collections/all` per coerenza.
