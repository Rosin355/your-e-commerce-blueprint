# Piano — Rifinitura UI immagini categoria nel mega-menu

## Scope (solo UI/presentation)

File toccati:
- `src/components/storefront/HomeHeaderOverlay.tsx` — mega-menu desktop overlay (home + pagine)
- `src/components/Header.tsx` — nav secondario desktop + drawer mobile

Non tocco: `categories.ts`, `categoryImages.ts`, asset in `src/assets/categories/`, checkout, admin/AI, Edge Functions, sync Shopify, prodotti, handle collezioni. Nessun link `/collections/...` cambia. Nessuna nuova dipendenza.

## Cambiamenti UI

### Mega-menu desktop (HomeHeaderOverlay + Header)

**Preview cards immagine grande:**
- Crop uniforme con `aspect-[4/5]` (verticale, editoriale) o `aspect-[3/4]` invece dell'attuale `h-52`/`h-48` fisso → coerenza fra card.
- Overlay leggero: gradient `from-black/55 via-black/10 to-transparent` sul bordo inferiore per far respirare i testi.
- Titolo card portato **dentro** l'immagine in basso (versione overlay) su HomeHeaderOverlay (già scuro); su Header (light) mantengo titolo sotto ma con radius uniforme `rounded-2xl` e bordo `border-white/10` / `border-border/60`.
- Hover: `scale-[1.04]` + transizione più morbida `duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]`, ombra `shadow-lg` in ingresso.
- Ring focus-visible per accessibilità.

**Thumbnail link laterali (44×44 / 40×40):**
- Radius uniforme `rounded-lg`, bordo sottile `ring-1 ring-white/10` (overlay) o `ring-border/50` (Header).
- Fallback (nessuna immagine): icona `Leaf` su gradient `from-primary/15 to-accent/10` invece che grigio piatto.
- Hover: leggero brighten (`brightness-105`) + scale 1.05.

**Coerenza radius/bordi:** tutte le card mega-menu passano a `rounded-2xl` con `border-white/10` (dark) / `border-border/60` (light). Nessun mix di radius.

### Menu mobile

- Drawer di `Header.tsx`: attualmente NON mostra immagini → resta invariato (leggero, veloce).
- Drawer di `HomeHeaderOverlay.tsx`: attualmente elenca solo testo dei sub-link. Aggiungo **thumbnail leggera 32×32** a sinistra del label quando `link.image` è definito, con fallback icona `Leaf`. Nessuna preview card grande in mobile per non allungare la lista.

### Fallback

- Preview card senza immagine: gradient tonale esistente (già presente via `card.tone`) — mantenuto.
- Thumbnail link senza immagine: icona `Leaf` in placeholder con gradient soft (vedi sopra) invece del grigio piatto attuale.
- `onError` handler sulle `<img>` che nasconde l'elemento e mostra il fallback (evita immagini rotte visibili).

### Performance

- `loading="lazy"` già presente sulle immagini secondarie, mantenuto.
- `decoding="async"` aggiunto.
- Nessun asset nuovo, nessun import nuovo, nessuna libreria.
- `width`/`height` espliciti mantenuti per evitare layout shift.

## Verifiche post-modifica

1. Nav desktop (`/`) — hover su ogni categoria → mega-menu con card uniformi.
2. Menu mobile — drawer apre, thumbnail leggibili, lista scorrevole.
3. Ispezione link: tutti gli `href` verso `/collections/<handle>` invariati (uso sempre `collectionHref(handle)`).
4. `npm run build` (typecheck incluso via Vite/tsc). Nessun cambio a tipi.
5. Screenshot Playwright del mega-menu desktop e drawer mobile per conferma visiva.

## Fuori scope (confermato)

- Nessuna modifica a checkout, admin AI, sync Shopify, prodotti, Edge Functions, handle collezioni, categorie, mapping immagini.
