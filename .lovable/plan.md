

## Piano: Sistema Shopify Token Management (ispirato a Radiant Beauty Builder)

### Contesto

Il progetto Radiant Beauty Builder gestisce i token Shopify Admin tramite un sistema completo server-side:
- Tabelle DB: `shopify_connections`, `shopify_oauth_states`, `shopify_tokens`, `shopify_token_locks`
- Edge Functions: `shopify-oauth-start`, `shopify-oauth-callback`, `shopify-status`, `shopify-test-connection`, `shopify-disconnect`, `shopify-save-connection`
- UI Admin: pagina Settings con connessione/disconnessione OAuth e test

L'utente vuole **aggiungere Supabase Auth** per il login utente + **Edge Function server-side per ordini** (come Radiant Beauty), mantenendo anche il Customer Account API attuale come fallback.

### Architettura risultante

```text
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
├─────────────────────────────────────────────────┤
│  Login: Supabase Auth (email/password)           │
│  Account: ordini via Edge Function               │
│  Fallback: Customer Account API (PKCE) se serve  │
│  Admin: Settings con gestione connessione Shopify│
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│               EDGE FUNCTIONS                     │
├─────────────────────────────────────────────────┤
│  shopify-oauth-start    → avvia OAuth flow       │
│  shopify-oauth-callback → scambia code → token   │
│  shopify-status         → stato connessione      │
│  shopify-test-connection→ test API Shopify        │
│  shopify-disconnect     → revoca connessione      │
│  get-customer-orders    → ordini per email utente │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│                DATABASE                          │
├─────────────────────────────────────────────────┤
│  profiles               (user data)              │
│  user_roles              (admin check)           │
│  shopify_connections     (token persistente)      │
│  shopify_oauth_states    (nonce temporaneo)       │
│  shopify_tokens          (cache token)            │
│  shopify_token_locks     (concurrency lock)       │
└─────────────────────────────────────────────────┘
```

---

### 1. Migrazione DB — Creare tabelle

Creare 6 tabelle con RLS:

- **`profiles`** — id (FK auth.users), first_name, last_name, phone, email. Trigger auto-create on signup.
- **`user_roles`** — user_id, role (enum: admin, moderator, user). Funzione `has_role()`.
- **`shopify_connections`** — shop_domain (unique), access_token, scopes, token_type, is_active, installed_by, installed_at, metadata
- **`shopify_oauth_states`** — state (unique), shop_domain, user_id, expires_at, used_at, metadata
- **`shopify_tokens`** — shop_domain (unique), access_token, scope, expires_at, refreshed_at
- **`shopify_token_locks`** — shop_domain (unique), lock_key, locked_until

Tutte con RLS `service_role` only (tranne profiles: utente legge il proprio, admin legge tutti).

Funzione helper `update_updated_at_column()` per trigger automatici.

Inserire ruolo admin per gli utenti esistenti nella allowlist.

### 2. Edge Functions — 6 nuove funzioni

Replicare dal progetto Radiant Beauty:

| Funzione | Scopo |
|---|---|
| `shopify-oauth-start` | Genera URL autorizzazione OAuth, salva state in DB |
| `shopify-oauth-callback` | Valida HMAC, scambia code per token, salva in shopify_connections |
| `shopify-status` | Ritorna stato connessione attiva (senza esporre token) |
| `shopify-test-connection` | Esegue query prodotti per verificare token valido |
| `shopify-disconnect` | Disattiva connessione e revoca token |
| `get-customer-orders` | Cerca ordini per email utente autenticato via Admin API |

Adattamenti rispetto a Radiant Beauty:
- `SHOPIFY_APP_URL` usa URL di questo progetto
- `get-customer-orders` usa lo stesso token manager con fallback chain (client_credentials → shopify_connections → SHOPIFY_ACCESS_TOKEN env)

### 3. Supabase Auth — Login/Signup

- **`src/hooks/useAuth.tsx`** — AuthProvider con Supabase Auth, check admin role
- **`src/pages/Auth.tsx`** — Pagina login/signup con email e password
- **`src/pages/ResetPassword.tsx`** — Reset password
- **`src/pages/Profile.tsx`** — Profilo utente con ordini da Edge Function

### 4. Admin Settings — UI gestione Shopify

- **`src/admin/pages/AdminSettings.tsx`** — Pagina settings nell'admin:
  - Mostra stato connessione Shopify (connesso/disconnesso)
  - Input shop domain + bottone "Connetti" che avvia OAuth
  - Bottone "Testa connessione"
  - Bottone "Disconnetti"
  - Callback route `/api/shopify/callback` → `ShopifyCallback.tsx`

### 5. Pagina Account — Ordini server-side

- Aggiornare `src/pages/Account.tsx` per usare Supabase Auth
- Ordini recuperati tramite `get-customer-orders` Edge Function (cerca per email dell'utente autenticato)
- Mantiene la stessa UI attuale (tab ordini, profilo, indirizzi)

### 6. Routing

Nuove routes:
- `/auth` — Login/Signup
- `/reset-password` — Reset password
- `/profile` — Profilo utente (protetto)
- `/api/shopify/callback` — OAuth callback Shopify
- `/admin/settings` — Settings admin

### 7. Configurazione

- Registrare le nuove edge functions in `supabase/config.toml`
- Il secret `SHOPIFY_APP_URL` va aggiunto (URL dell'app per redirect OAuth)
- I secret `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET` sono già configurati

### File da creare/modificare

**Nuovi file:**
- Migrazione DB (tabelle + RLS + trigger + funzioni)
- `supabase/functions/shopify-oauth-start/index.ts`
- `supabase/functions/shopify-oauth-callback/index.ts`
- `supabase/functions/shopify-status/index.ts`
- `supabase/functions/shopify-test-connection/index.ts`
- `supabase/functions/shopify-disconnect/index.ts`
- `supabase/functions/get-customer-orders/index.ts`
- `src/hooks/useAuth.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/ShopifyCallback.tsx`
- `src/admin/pages/AdminSettings.tsx`

**File modificati:**
- `src/App.tsx` — nuove routes
- `src/pages/Account.tsx` — usa Supabase Auth + Edge Function ordini
- `src/admin/AdminGuard.tsx` — usa Supabase Auth per admin check
- `src/admin/components/AdminLayout.tsx` — link a Settings
- `supabase/config.toml` — registrare nuove functions

**File NON modificati:**
- AI Writer, Export CSV, Sync, Import — nessuna modifica
- `src/lib/shopify.ts` — Storefront API invariata
- `src/lib/shopify-customer-auth.ts` — mantenuto come fallback

### Nota importante

Sarà necessario aggiungere il secret `SHOPIFY_APP_URL` con l'URL dell'app (es. `https://ecom-blueprint-gen.lovable.app`) per il redirect OAuth. Te lo chiederò durante l'implementazione.

