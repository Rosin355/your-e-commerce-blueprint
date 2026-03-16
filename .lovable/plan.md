
Obiettivo: aggiornare la hero della homepage V3 per renderla più vicina al riferimento “home 1”, con immagine full width immersiva, contenuto testuale in overlay a sinistra con glass effect, e palette accent quasi-fluo ispirata a “home 3” per CTA, badge e overlay.

Piano di implementazione

1. Ridisegnare la hero V3 come banner full width
- Sostituire l’attuale composizione a due colonne con una singola hero full width.
- Mantenere l’immagine hero esistente, ma trattarla come sfondo dominante con altezza più importante su desktop e mobile.
- Impostare il contenuto in overlay sul lato sinistro, come da scelta “Testo a sinistra”.

2. Introdurre un sistema overlay più premium
- Aggiungere un overlay scuro-botanico stratificato sopra l’immagine per leggibilità.
- Combinare:
  - gradiente scuro profondo per contrasto testo
  - accento verde lime/quasi fluo in punti focali
  - pannello glass per headline, copy, CTA e trust cues
- Usare blur, bordo soft e trasparenze per dare effetto glass elegante, non troppo “frosted”.

3. Aggiornare CTA e accenti con il verde quasi fluo
- Portare nel design token una variante accent bright ispirata all’allegato home 3.
- Usarla per:
  - bottone primario
  - piccoli indicatori/badge
  - highlight nell’overlay hero
  - eventuali micro-accent nelle trust pills
- Mantenere il bottone secondario più soft/trasparente per non competere col primario.

4. Rifinire contenuto hero e gerarchia visiva
- Rafforzare la gerarchia:
  - eyebrow/badge piccolo
  - headline grande e più incisiva
  - supporting copy più corta e concreta
  - CTA primario e secondario
  - trust cues compatti sotto le CTA
- Ridurre il rumore visivo rispetto alla hero attuale, rendendo il blocco più cinematografico e più commerciale.

5. Estendere il design system senza rompere il resto
- Aggiornare i token in `src/index.css` per introdurre il bright green e, se utile, utility/gradient dedicati.
- Verificare se serve ampliare gli alias Tailwind/background helpers già presenti, senza toccare logica storefront.
- Lasciare invariati fetch prodotti, routing, cart, checkout e feature flags.

File da toccare
- `src/components/storefront/HomepageV3.tsx`
  - refactor completo della sezione hero
- `src/index.css`
  - nuovi token colore/gradienti/glass helpers
- opzionale: `tailwind.config.ts`
  - solo se serve esporre nuovi colori o backgroundImage in modo pulito

Risultato atteso
- Hero molto più immersiva e “premium”
- Immagine full width come nel riferimento home 1
- Testo a sinistra in pannello glass elegante
- CTA con verde quasi fluo ispirato a home 3
- Migliore leggibilità, atmosfera più moderna, forte impatto above the fold

Dettagli tecnici
- Nessun cambiamento a logica ecommerce o integrazioni.
- Implementazione confinata alla visual layer V3 dietro feature flag esistente.
- Responsive:
  - mobile: hero alta, copy leggibile, CTA stacked
  - tablet/desktop: contenuto ancorato a sinistra con migliore uso dello spazio negativo dell’immagine
- Accessibilità:
  - contrasto testo/overlay verificato
  - CTA ben distinguibili
  - immagine con layout stabile e caricamento eager mantenuto

QA da eseguire dopo implementazione
- Verificare la hero su desktop e mobile
- Controllare leggibilità del testo sopra immagine
- Verificare effetto glass e resa del verde accent
- Controllare che header sticky + hero non creino stacchi visivi bruschi
- Testare end-to-end il flusso homepage → PDP → add to cart → cart drawer → checkout redirect per assicurarsi che il refresh resti solo visivo

<lov-actions>
<lov-suggestion message="Testa la hero e il flusso storefront end-to-end su mobile e desktop per verificare leggibilità, CTA e continuità visuale.">Verifica che funzioni</lov-suggestion>
<lov-suggestion message="Implementa la nuova hero full width con testo a sinistra in glass effect e CTA verde quasi fluo ispirata ai riferimenti home 1 e home 3.">Aggiorna Hero V3</lov-suggestion>
<lov-suggestion message="Estendi il design system V3 con token per verde accent quasi fluo, overlay botanici e superfici glass da riutilizzare anche nelle altre sezioni.">Rafforza Design System</lov-suggestion>
</lov-actions>
