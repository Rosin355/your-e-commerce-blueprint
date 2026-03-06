

# Piano: Dashboard Admin Import CSV per Shopify

## Panoramica

Creare una sezione admin protetta (`/admin/import`) per importare clienti e prodotti da file CSV WooCommerce verso Shopify, con validazione, dry run, sync reale e reportistica.

## Prerequisito: Abilitare Lovable Cloud

Il progetto attualmente NON ha un backend (nessun Supabase/Cloud configurato). Le chiamate all'Admin API Shopify richiedono il token privato `SHOPIFY_ACCESS_TOKEN` che NON deve mai essere esposto nel frontend.

**Prima di implementare**, sara necessario abilitare Lovable Cloud per creare Edge Functions server-side che gestiscano le chiamate Admin API in sicurezza.

---

## Architettura

```text
+-------------------+       +---------------------+       +------------------+
|  Frontend React   | ----> | Edge Function        | ----> | Shopify Admin API|
|  /admin/import    |       | (server-side proxy)  |       |                  |
|  CSV parsing      |       | - upsert products    |       |                  |
|  Validazione      |       | - upsert customers   |       |                  |
|  UI/Progress      |       | - rate limit/retry   |       |                  |
+-------------------+       +---------------------+       +------------------+
```

---

## Struttura File

```text
src/
  admin/
    components/
      AdminLogin.tsx          -- Form login con email allowlist
      AdminLayout.tsx         -- Layout admin con sidebar/header
      CsvUploader.tsx         -- Drag&drop + input file
      CsvPreview.tsx          -- Tabella preview prime 20 righe
      ValidationReport.tsx    -- Report validazione colonne
      ImportProgress.tsx      -- Progress bar + log in tempo reale
      ImportReport.tsx        -- Report finale con download JSON/CSV
      ImportHistory.tsx       -- Storico ultime importazioni
    pages/
      AdminImport.tsx         -- Pagina principale con tab Clienti/Prodotti
    lib/
      csvParser.ts            -- parseCsvCustomers(), parseCsvProducts()
      csvValidator.ts         -- Validazione colonne, email, campi obbligatori
      shopifyMapper.ts        -- mapToShopifyCustomerInput(), mapToShopifyProductInput()
      importEngine.ts         -- Logica dry run, sync, batching, progress
      auditLog.ts             -- Audit log locale (localStorage)
      adminAuth.ts            -- Auth con email allowlist
    stores/
      importStore.ts          -- Zustand store per stato import
    types/
      import.ts               -- Tipi TypeScript per import

supabase/
  functions/
    shopify-admin-proxy/
      index.ts                -- Edge function proxy per Admin API Shopify
```

---

## Fasi di Implementazione

### Fase 1 -- Backend (Edge Function)

Creare una Edge Function `shopify-admin-proxy` che:
- Riceve richieste dal frontend (POST con payload prodotti/clienti)
- Usa `SHOPIFY_ACCESS_TOKEN` (secret server-side) per chiamare Shopify Admin REST API
- Gestisce rate limiting (rispetta header `Retry-After`)
- Supporta operazioni: create/update prodotti, create/update clienti
- Supporta batching (elabora batch di 10-50 record alla volta)
- Restituisce risultati per ogni record (creato/aggiornato/errore)

### Fase 2 -- Autenticazione Admin

- Login semplice con email (nessuna password)
- Allowlist di email autorizzate configurabile
- Stato sessione in localStorage con scadenza
- Componente `AdminLogin` con form email
- Route guard che verifica autenticazione

### Fase 3 -- Parsing e Validazione CSV

- Parser CSV client-side (senza librerie esterne, usando FileReader + split)
- Supporto formato WooCommerce per clienti e prodotti
- Validazione colonne obbligatorie:
  - Clienti: email (valida), first_name, last_name
  - Prodotti: title/name, price (numerico)
- Sanitizzazione input (rimozione campi sensibili come password hash)
- Preview prime 20 righe in tabella

### Fase 4 -- UI Dashboard Import

- Route `/admin/import` con layout dedicato
- Tab "Import Clienti" e "Import Prodotti"
- Flusso: Upload CSV -> Preview -> Valida -> Dry Run -> Sync
- Pulsanti: "Valida", "Dry Run", "Sync Shopify"
- Progress bar con percentuale e log in tempo reale
- Report finale con conteggi (creati/aggiornati/scartati/errori)
- Download errori in JSON/CSV

### Fase 5 -- Logica Import

- **Dry Run**: simula operazioni senza scrivere su Shopify, mostra anteprima risultati
- **Sync reale**: upsert idempotente (cerca per email/handle, aggiorna se esiste, crea se no)
- Batching: invia 10 record per batch alla Edge Function
- Retry con backoff esponenziale per rate limits
- Progress tracking tramite Zustand store

### Fase 6 -- Audit Log e Storico

- Salva in localStorage: timestamp, email admin, nome file, tipo import, risultati
- Sezione "Storico Importazioni" con ultime 20 operazioni
- Possibilita di consultare log passati

---

## Dettagli Tecnici

### Routing

Aggiunta in `App.tsx`:
```text
/admin/import  -->  AdminImport (protetto da auth guard)
```

Le pagine pubbliche (`/`, `/products/:handle`) restano invariate.

### Edge Function - Shopify Admin Proxy

L'endpoint accetta:
- `action`: "create_product", "update_product", "create_customer", "update_customer", "search_product", "search_customer"
- `data`: payload formattato per Shopify Admin API
- Usa Admin REST API 2025-01 con `SHOPIFY_ACCESS_TOKEN`

### Formato CSV Supportato

**Clienti WooCommerce:**
```text
email, first_name, last_name, billing_phone, billing_address_1, billing_city, billing_postcode, billing_country
```

**Prodotti WooCommerce:**
```text
name/title, sku, regular_price, sale_price, description, short_description, categories, tags, stock_quantity, images
```

### Sicurezza

- Token Admin API mai esposto nel frontend (solo in Edge Function)
- Nessun import di campi password/hash/session dal CSV
- Sanitizzazione di tutti i campi CSV prima dell'invio
- Messaggi di errore generici (nessun dato sensibile esposto)
- Email allowlist per accesso admin

