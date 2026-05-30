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
- `npm run typecheck` controllo tipi TypeScript (`tsc -b --noEmit`)

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

## Variabili d'Ambiente e Sicurezza

### Variabili PUBBLICHE (frontend, prefisso `VITE_`)

Queste finiscono nel bundle del browser e sono **pubbliche per design** (vedi `.env.example`):

| Variabile | Descrizione |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del progetto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chiave publishable/anon Supabase (pubblica) |
| `VITE_SUPABASE_PROJECT_ID` | ID progetto Supabase |
| `VITE_SHOPIFY_STORE_PERMANENT_DOMAIN` | Dominio `*.myshopify.com` |
| `VITE_SHOPIFY_STOREFRONT_TOKEN` | Token Storefront API (pubblico per design) |
| `VITE_SHOPIFY_STOREFRONT_API_VERSION` | Versione Storefront API (default `2025-07`) |

`src/lib/shopify.ts` legge queste variabili con fallback sicuri, così la preview Lovable
funziona anche senza configurazione esplicita.

### Variabili SERVER-SIDE (solo Supabase Edge Function secrets)

**Mai** nel frontend e **mai** con prefisso `VITE_` (lo esporrebbe al browser):

- `SHOPIFY_STORE_PERMANENT_DOMAIN`
- `SHOPIFY_ACCESS_TOKEN` (token Shopify **Admin** API)
- `SHOPIFY_ADMIN_API_VERSION` (es. `2025-07`)
- `OPENAI_API_KEY`, `OPENAI_VISION_MODEL`, `OPENAI_COPY_MODEL`
- `LOVABLE_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Nota versione API Shopify

Shopify supporta ogni versione API per ~12 mesi. Default attuale: **`2025-07`**, env-driven sia
lato storefront (`VITE_SHOPIFY_STOREFRONT_API_VERSION`) sia lato admin (`SHOPIFY_ADMIN_API_VERSION`).
Verificare i campi GraphQL/REST usati prima di passare a `2026-04`.

### Nota sicurezza admin

- Tutte le operazioni admin passano da Supabase Edge Functions (`shopify-admin-proxy`,
  `create-product-ai`) e richiedono un JWT con ruolo `admin` (`assertAdminRequest`).
- I token Shopify Admin, le chiavi OpenAI e la service role key restano **solo server-side**.
- L'area `/admin` è protetta da Supabase Auth + `user_roles`.

### Checklist di prelancio

Prima del go-live, seguire `docs/prelaunch-checklist.md`.

### Test del checkout in sicurezza

1. Usare la **modalità test** di Shopify (Bogus Gateway) o un development store.
2. Aggiungere un prodotto e cliccare **Procedi al Checkout**: deve aprirsi un URL di checkout fresco.
3. Forzare un errore (token storefront non valido) per verificare che compaia un toast di errore
   e che **non** venga mai aperto un URL stale. Ripristinare poi il token.
4. Completare un ordine di test end-to-end prima di attivare i pagamenti reali.

## Note Importanti

- La configurazione Shopify (dominio e token storefront) è ora **env-driven** (`src/lib/shopify.ts`)
  con fallback sicuri; i token Admin restano server-side nelle Edge Functions.
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
