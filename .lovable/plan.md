# Aggiornamento slider hero homepage

## Obiettivo
Migliorare la coerenza testo/immagine dello slider hero e aggiungere una terza slide dedicata a terrazze e balconi.

## Modifiche

### 1. Nuova immagine — `src/assets/hero-outdoor-custom-3.png`
Generata con `imagegen` (modello `standard`, 1920×1280).

Prompt: terrazza residenziale elegante in stile mediterraneo, grandi vasi in terracotta e ceramica con ortensie in fiore, ulivo decorativo, agrumi in vaso, lavanda, pavimento in pietra naturale, ringhiera moderna con vista aperta sul verde, luce naturale del primo mattino, mood premium, editoriale, nessuna persona, nessun testo.

### 2. `src/components/storefront/HomeHero.tsx`
- Import nuova immagine `heroOutdoorCustom3`.
- Slide 1 (`spring`):
  - title → `"Piante da giardino,\nscelte con cura"`
  - subtitle → `"Aceri, arbusti ornamentali e fioriture pensate per dare carattere al tuo giardino, stagione dopo stagione."`
- Slide 2 (`editorial`): invariata.
- Nuova slide 3 (`terrace`):
  - image: `heroOutdoorCustom3`
  - title: `"Trasforma il tuo balcone\nin un giardino"`
  - subtitle: `"Vasi di carattere, ortensie, agrumi e fioriture stagionali per vestire terrazzi e balconi con stile mediterraneo."`

Nessuna modifica alla logica di rotazione, agli indicatori, alle animazioni o al resto della homepage — il contatore e il loop si adattano automaticamente a `slides.length`.
