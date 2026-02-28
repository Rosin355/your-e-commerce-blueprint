# Prompt Lovable: Admin Import + Sync Shopify (Safe Preview)

Usa questo prompt in Lovable per implementare un pannello admin senza impattare la preview pubblica.

```txt
Aggiorna il progetto esistente senza rompere il frontend pubblico.

Contesto tecnico reale:
- Frontend: React + Vite + TypeScript
- Commerce backend: Shopify (Storefront già usato lato pubblico)
- Esistono script locali in `sync/` per import/sync CSV
- Voglio una sezione Admin in-app per caricare CSV e sincronizzare con Shopify Admin API

Obiettivo:
Creare una pagina admin protetta (email allowlist) da cui:
1) caricare CSV clienti/prodotti
2) validare i dati
3) fare dry-run
4) fare sync reale su Shopify
5) vedere log e report finale

Vincolo critico:
Non compromettere la preview pubblica Lovable.
Quindi:
- nessuna modifica breaking alle route pubbliche `/` e `/products/:handle`
- nuove route admin isolate sotto `/admin/*`
- guard di accesso obbligatorio
- feature flag: se `VITE_ENABLE_ADMIN_IMPORT !== "true"`, la UI admin non deve essere visibile o raggiungibile

Architettura richiesta:

1) Routing + guard
- Aggiungi route `/admin/import`
- Crea `AdminRouteGuard` con login email (allowlist via env)
- logout e sessione locale (es. localStorage token semplice)

2) Moduli separati
- `src/admin/pages/AdminImportPage.tsx`
- `src/admin/components/*` (UploadPanel, ValidationTable, SyncRunner, SyncReport)
- `src/admin/lib/csv.ts` (parser/validator)
- `src/admin/lib/shopify-admin.ts` (client GraphQL Admin API)
- `src/admin/lib/mappers.ts` (CSV -> input Shopify)

3) Import modes
- Tab `Clienti`
- Tab `Prodotti`
- Preview prime 20 righe
- Validazione colonne minime
- Dry-run: calcola create/update/skip senza scrivere
- Sync reale: upsert idempotente

4) Shopify sync rules
- Clienti: match per email
- Prodotti: match per SKU, fallback handle
- Retry con backoff su rate limits
- Batch processing con progress bar
- Error log esportabile CSV/JSON

5) Sicurezza
- mai hardcodare token/API key
- variabili in `.env`:
  - `VITE_ENABLE_ADMIN_IMPORT`
  - `VITE_ADMIN_ALLOWED_EMAILS` (comma-separated)
  - `VITE_SHOPIFY_ADMIN_SHOP`
  - `VITE_SHOPIFY_ADMIN_API_VERSION`
  - `VITE_SHOPIFY_ADMIN_ACCESS_TOKEN`
- non importare mai password hash/session tokens da CSV

6) Compatibilità con assetto attuale
- non alterare `src/lib/shopify.ts` usato dal catalogo pubblico
- non cambiare comportamento carrello/checkout
- mantenere UI pubblica invariata

7) Deliverable
- codice completo admin
- route isolate e protette
- README aggiornato con sezione “Admin Import + Sync”
- fallback sicuro: con feature flag off non cambia nulla nella preview pubblica
```

## Note operative

- Questo prompt è allineato allo stato attuale del repo (Shopify-first, non Supabase-first).
- Per sicurezza, abilita la feature solo in ambienti controllati:
  - `VITE_ENABLE_ADMIN_IMPORT=true` solo quando vuoi testare la sezione admin.
