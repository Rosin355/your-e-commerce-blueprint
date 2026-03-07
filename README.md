# ONLINEGARDEN PROJECT

Frontend e-commerce (tema piante) costruito con React + Vite, con catalogo prodotti e checkout integrati tramite Shopify Storefront API.

## Stack Tecnologico

### Frontend
- `Vite` (build tool / dev server)
- `React 18` + `TypeScript`
- `React Router DOM` (routing SPA)
- `Tailwind CSS` (styling)
- `shadcn/ui` + `Radix UI` (componenti UI)
- `Zustand` (stato globale carrello con persistenza)
- `Sonner` + toaster UI (notifiche)
- `TanStack React Query` (provider presente; estendibile per data fetching)

### Backend / Commerce Layer
- `Shopify Storefront GraphQL API` come backend esterno per:
  - recupero catalogo prodotti
  - recupero dettaglio prodotto per `handle`
  - creazione del checkout/cart Shopify

Nota: il progetto non include un backend custom (Node/Express/Nest ecc.). La logica server-side è delegata a Shopify tramite API client-side.

## Requisiti Locali

- `Node.js` 18+ (consigliato 20+)
- `npm`

## Avvio in Locale

1. Installa le dipendenze:

```bash
npm install
```

2. Avvia il server di sviluppo:

```bash
npm run dev
```

3. Apri l'URL mostrato in console (di solito `http://localhost:5173`).

## Script Disponibili

- `npm run dev` avvia il dev server Vite
- `npm run build` build di produzione
- `npm run build:dev` build in modalità development
- `npm run preview` preview locale della build
- `npm run lint` lint del codice

## Architettura del Progetto (FE / BE)

## Frontend (SPA React)

### Routing
- `/` Home page (hero, catalogo, sezioni contenuto)
- `/products/:handle` Pagina dettaglio prodotto
- `*` Pagina 404

File chiave:
- `src/main.tsx` bootstrap React
- `src/App.tsx` provider globali + routing
- `src/pages/*` pagine applicative

### UI Layer
- `src/components/` componenti di dominio (Header, ProductCard, CartDrawer, sezioni homepage)
- `src/components/ui/` componenti base shadcn/ui (button, sheet, dialog, tabs, ecc.)

### State Management (Carrello)
- `src/stores/cartStore.ts`
- Stato globale con Zustand:
  - items carrello
  - loading checkout
  - azioni add/remove/update quantity
  - persistenza in `localStorage` (`shopify-cart`)

### Data Access Layer (Frontend -> Shopify)
- `src/lib/shopify.ts`
  - endpoint Storefront API
  - query GraphQL prodotti e dettaglio
  - helper `storefrontApiRequest`
- `src/lib/shopify-checkout.ts`
  - mutation `cartCreate`
  - costruzione URL checkout Shopify

## Backend (esterno: Shopify)

Il progetto usa Shopify come backend commerce esterno.

Responsabilità Shopify in questo progetto:
- catalogo prodotti
- varianti e prezzi
- disponibilità (`availableForSale`)
- generazione checkout URL
- gestione finale del pagamento (nel checkout Shopify)

### Flusso dati end-to-end
1. Il frontend carica i prodotti con query GraphQL Storefront API.
2. L'utente aggiunge prodotti al carrello (stato locale Zustand).
3. Al checkout, il frontend invia le linee carrello a Shopify (`cartCreate`).
4. Shopify restituisce `checkoutUrl`.
5. Il frontend apre il checkout Shopify in una nuova tab.

## Struttura del Progetto (overview)

```text
.
├── public/                 # asset statici
├── src/
│   ├── components/         # componenti UI di dominio (Header, CartDrawer, ecc.)
│   ├── components/ui/      # componenti base shadcn/ui
│   ├── hooks/              # hook custom
│   ├── lib/                # integrazioni e helper (Shopify, utils)
│   ├── pages/              # pagine route-level
│   ├── stores/             # stato globale (Zustand)
│   ├── App.tsx             # routing + providers
│   ├── main.tsx            # bootstrap app
│   └── index.css           # stili globali Tailwind
├── index.html              # entry HTML Vite
├── tailwind.config.ts      # config Tailwind
├── vite.config.ts          # config Vite
├── tsconfig*.json          # config TypeScript
└── package.json            # script e dipendenze
```

## Note Importanti

- Attualmente la configurazione Shopify (dominio e token storefront) è gestita nel frontend (`src/lib/shopify.ts`).
- Per ambienti production, è consigliato spostare le configurazioni sensibili in variabili d'ambiente e/o introdurre un backend/proxy per maggiore controllo.
- Alcune UI (es. filtri e ricerca in header) sono presenti ma non ancora collegate a logica di filtro/search reale.

## Possibili Evoluzioni Architetturali

- Introdurre un backend BFF (Backend for Frontend) per:
  - protezione/separazione configurazioni API
  - caching query Shopify
  - logging / rate limit / osservabilità
  - integrazioni con CMS, CRM, email marketing
- Portare il data fetching a `React Query` in modo consistente
- Aggiungere gestione auth/account cliente Shopify
- Aggiungere test (unit + integration + e2e)

## Prompt Lovable Consigliato

- Prompt pronto per sezione admin import/sync Shopify (safe preview):
  - `docs/lovable-admin-import-sync-prompt.md`
- Prompt/analisi per AI Product Writer (generazione e rigenerazione testi su prodotti Shopify esistenti):
  - `docs/lovable-ai-product-writer-compatible.md`

## Admin AI Writer (implementato)

- L'admin `/admin/import` include ora la tab `AI Writer`.
- Funzioni principali:
  - filtro prodotti Shopify (default `ACTIVE + tag woo-import`)
  - generazione bozza AI
  - rigenerazione versionata
  - approvazione e publish su Shopify (descrizione, SEO, alt immagini)
- Feature flag:
  - `VITE_ENABLE_AI_PRODUCT_WRITER=false` per nascondere la tab.

### Env server-side richieste (Edge Function)

- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_STORE` (opzionale, default attuale del progetto)
- `SHOPIFY_API_VERSION` (opzionale)
- `OPENAI_API_KEY`
- `OPENAI_VISION_MODEL` (opzionale)
- `OPENAI_COPY_MODEL` (opzionale)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
