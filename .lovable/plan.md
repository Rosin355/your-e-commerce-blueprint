

## Piano: Integrazione Customer Account API di Shopify

### Analisi degli screenshot

Dalla configurazione della tua app Headless:
- **Client ID**: `c8bde26b-256c-4534-87d1-26a2a3c72bef`
- **Tipo client**: Pubblico (app web) — nessun client secret necessario
- **Scope abilitati**: customer_read_customers, customer_write_customers, customer_read_orders, customer_write_orders, customer_read_draft_orders, customer_read_store_credit_accounts, customer_read_markets, customer_read_companies, customer_write_companies, customer_read_subscription_contracts, customer_write_subscription_contracts
- **Campi da configurare**: URI di callback, Origini JavaScript, URI di logout

### Step 1: Configurazione nell'app Headless su Shopify

Devi inserire questi valori nella sezione "Configurazione dell'applicazione":

| Campo | Valore |
|---|---|
| **URI di callback** | `https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app/account/callback` |
| **Origini JavaScript** | `https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app` |
| **URI di logout** | `https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app` |

Quando pubblicherai il sito con un dominio personalizzato, dovrai aggiungere anche quegli URL.

### Step 2: Implementazione nel codice

Il Customer Account API usa **OAuth 2.1 con PKCE** (nessun secret lato server necessario per client pubblici). Il flusso:

1. Utente clicca "Accedi" → genera PKCE parameters (code_verifier, code_challenge, state, nonce) → redirect a Shopify
2. Shopify autentica il cliente (via email OTP, no password) → redirect back con authorization code
3. Il frontend scambia il code per un access token
4. Con il token si interroga la Customer Account API GraphQL

**File da creare:**

- **`src/lib/shopify-customer-auth.ts`** — Utility OAuth PKCE: generazione code_verifier/challenge, state, nonce, costruzione URL di autorizzazione, scambio token
- **`src/stores/customerStore.ts`** — Zustand store per stato autenticazione cliente (token, profilo, loading)
- **`src/pages/AccountCallback.tsx`** — Pagina callback che riceve il code da Shopify e scambia per token
- **`src/pages/Account.tsx`** — Dashboard account cliente con: profilo, storico ordini, indirizzi, logout
- **`src/components/AccountButton.tsx`** — Bottone header "Accedi" / "Il mio account"

**File da modificare:**

- **`src/App.tsx`** — Aggiungere route `/account`, `/account/callback`
- **`src/components/Header.tsx`** — Aggiungere bottone account

**Endpoint Customer Account API GraphQL:**
```
https://shopify.com/{SHOP_ID}/account/customer/api/2025-07/graphql
```

### Step 3: Funzionalita account

- Visualizzazione profilo (nome, email)
- Storico ordini con dettagli
- Gestione indirizzi
- Logout sicuro

### Sicurezza

- PKCE garantisce sicurezza senza client secret
- Token salvati in sessionStorage (non localStorage) per maggiore sicurezza
- Refresh token gestito automaticamente

### Prerequisito

Prima di implementare, devi configurare i 3 campi (callback, origins, logout) nell'app Headless su Shopify con i valori indicati sopra. Conferma quando fatto.

