# Fase 2D.8S — Post-publish security recheck (2026-10-02)

Read-only. Nessuna generate/accept/reject, nessuna scrittura prodotto, nessuna Shopify/inventory/Smart Sync/migration. Canary attivo.

Target: frontend pubblicato `https://romeshbigbird.com` (bundle `index-CbEUUYHP.js` + 23 chunk), Edge `product-admin-api` e `product-admin-ai` live (backend `93b6f61`).

| Area | Esito | Evidenza |
|---|---|---|
| Auth / sessione | PASS | Route Admin servita come SPA ma il guard richiede sessione e ruoli restituiti da `get_admin_context` server-side; ruoli assenti/errore → "Accesso non consentito". Token assente → 401 `Token mancante`; token invalido o chiave pubblica come Bearer → 401 `Token non valido o scaduto` (entrambe le funzioni). |
| Edge authorization | PASS | `_shared/admin-v2-auth.ts`: identità solo da `auth.getUser()` sul bearer, ruoli da `user_roles` via service client. Campi `userId`/`role` nel body ignorati (test: 401 con body falsificato). |
| Service role exposure | PASS | 0 occorrenze `service_role`/`SERVICE_ROLE`/`sb_secret` in tutti i 24 chunk; unico JWT nel bundle ha role `anon`. |
| Provider secret | PASS | 0 occorrenze `LOVABLE_API_KEY` nel bundle; risposte di errore senza secret. Valore non stampato. |
| CORS | P3 | `Access-Control-Allow-Origin: *`, metodi GET/POST/PUT/PATCH/DELETE/OPTIONS. Autenticazione solo via Bearer (nessun cookie), quindi rischio basso; restringere all'origin pubblicato in fase dedicata. Non modificato. |
| Input validation | PASS | Azione sconosciuta → 422 VALIDATION_ERROR; payload non JSON → 422; GET → 422 `Metodo non supportato`; UUID invalido → VALIDATION_ERROR (codice). Allowlist 4 azioni AI. Nota P3: in `product-admin-ai` la validazione azione precede l'auth (rivela solo "azione non riconosciuta", nessun dato). |
| AI boundaries server-side | PASS (codice) | `admin-ai-core.ts`: ai_allowed, manual_only, denylist strutturale, strategy non supportata, current locked; `service.ts`: prodotto inattivo, valore vuoto/non supportato; canary verificato server-side (`isCanaryField`, `canWriteCanary`). |
| Suggestion access | PASS | REST diretto con chiave pubblica su `product_ai_suggestions`/`product_ai_generation_reservations` → `42501 permission denied`. Lettura solo via `product-admin-ai` autenticato. |
| DB ACL | PASS | Entrambe le tabelle: PUBLIC/anon/authenticated nessun privilegio; service_role SELECT,INSERT,UPDATE (no DELETE/TRUNCATE/REFERENCES/TRIGGER); RLS ON. `postgres` owner. |
| sandbox_exec* | PLATFORM_MANAGED_EXPECTED | LOGIN, non superuser, SELECT/INSERT sulle due tabelle. anon/authenticated/authenticator/service_role non membri (`pg_has_role` false) → non assumibili da utenti applicativi. Nessuna revoca. |
| Frontend direct DB | PASS | Nessun `from("product_ai_*")` o accesso diretto a current values nei chunk; Admin V2 usa solo `functions.invoke` (`src/adminv2/lib/adminApi.ts`). |
| Legacy isolation | PASS | `create-product-ai`/`shopify-admin-proxy` presenti solo nel chunk `AdminGuard` (Admin legacy `/admin/import`), assenti dai chunk Admin V2 (`useAdminData`, `ProductDetailPage`). |
| Errori sanitizzati | PASS | Risposte `{ok:false,error:{code,message}}` senza stack, JWT, connection info; log `redactedLog`. |

## Stato finale (post-check)
- Suggestion `72d271c6-…` status `pending`, field `seo_title`.
- OG_264361 `seo_title`: version 1, impronta riga invariata.
- Conteggi: products 2.706, current 24.467, history 5, command 5, suggestions 1, reservations 1.
- Nuove chiamate provider AI: 0. Nuove scritture DB: 0.

## Finding
- P1: nessuno. P2: nessuno.
- P3: CORS `*`; validazione azione prima dell'auth in `product-admin-ai`; Admin legacy ancora nel bundle (route separata, protetta da assertAdmin server-side).

Stato: AI GENERATION SMOKE PASS · POST-PUBLISH SECURITY PASS · CONTROLLED ACCEPT NOT YET TESTED · CANARY ACTIVE
