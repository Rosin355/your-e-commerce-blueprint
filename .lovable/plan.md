# Riattivare il megamenu

## Causa
Nella `<section>` dell'hero homepage ci sono due overlay sopra all'header che intercettano gli eventi del mouse:

- lo "scrim" gradiente (`HomeHero.tsx` ~r.174) ha `z-index: 30` ma **manca** `pointer-events-none`
- il wrapper del contenuto hero (`HomeHero.tsx` ~r.181) ha `z-index: 35` e copre l'intera area (`inset-0`)

L'header (`HomeHeaderOverlay.tsx` r.186) è a `z-30` per `variant="hero"`. Risultato: il bottone "Piante da esterno" è visibile ma l'`onMouseEnter` non scatta perché l'evento viene catturato dal div contenuto a `z-35`. Quindi `activeItem` resta `null` e il pannello non appare.

## Modifiche

1. **`src/components/storefront/HomeHero.tsx`**
   - Aggiungere `pointer-events-none` al gradient scrim (è già `aria-hidden`, puramente decorativo).
   - Aggiungere `pointer-events-none` al wrapper di contenuto hero, e `pointer-events-auto` agli elementi realmente interattivi al suo interno (link "Scopri il catalogo outdoor" e i due bottoni di navigazione slide).

2. **`src/components/storefront/HomeHeaderOverlay.tsx`**
   - Portare l'header sopra a tutti gli overlay dell'hero: alzare lo z-index del wrapper `<header>` da `z-30` → `z-40` per `variant="hero"` (la versione `page` è già `z-40`).
   - Allineare anche `HomeAnnouncementBar` (`top-0 z-30` → `z-40`) per restare coerente sopra.

3. **Verifica pagine interne**
   - Aprire `/products` e una `/collections/...` per controllare che il menu si apra. Se in qualche pagina ci fosse un altro overlay con z-index superiore (es. wrapper `Pdp` o sezione hero di lista), valutare un eventuale `z-40` → `z-50` mirato sull'header senza creare conflitti con drawer/dialog (che usano `z-50` di Radix).

4. **Smoke test in preview**
   - Hover su ciascuna voce del nav nella homepage → il pannello compare e resta aperto mentre il mouse è sopra.
   - Uscendo dal nav il pannello si chiude.
   - Verificare che gli overlay decorativi non blocchino più il pulsante "Scopri il catalogo outdoor" e i bottoni slide.

## Note
Le ultime modifiche all'AI Writer (auto-save bozze + "Interrompi") non toccano questi file: la regressione era già latente, è probabilmente emersa con l'introduzione del wrapper contenuto a `z-35` nell'hero.
