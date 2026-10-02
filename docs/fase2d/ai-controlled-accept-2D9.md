# Fase 2D.9 — Controlled accept + idempotency live smoke (2026-10-02)

Nessuna nuova generazione, nessun provider AI, nessuna Shopify. Canary attivo.

## Preflight (PASS)
Suggestion `72d271c6-d998-47b3-98fe-2321fef6d829` pending, product_id coerente con OG_264361 (`d6492fb1-…`), field `seo_title`, base_version 1 = current version 1, prodotto attivo, ai_allowed=true, manual_only=false, current non locked, una sola pending sul target.

Baseline: value `Hemerocallis "Rosy" | Giglio Diurno Rosa - Online Garden`, v1, review `legacy_unverified`, origin `import`, value_origin `legacy_ai_unknown_approval`, source_snapshot_id NULL, is_locked false, protected_on_reimport true. Conteggi: current 24.467, history 5, command 5, suggestions 1, reservations 1; history/command sul target: 0/0.

## Accept via UI
Admin V2 (stessa build pubblicata, sessione Admin, stesso backend live), un solo click su "Accetta". Request `accept_ai_suggestion`, idempotency key `96718ff6…`, expectedVersion 1, value invariato. Risposta 200, `code=APPLIED`, version 2, suggestion `accepted`.

## Verifiche
- Current: nuovo valore `Hemerocallis "Rosy" - Giglio Diurno Rosa | Online Garden`, v2, sku/product_id/field invariati, protected_on_reimport true, source_snapshot_id NULL, non locked, review `approved`, value_origin `manual`.
- History +1 (`815fcfbf-…`): `manual_update`, v1→v2, previous/new corretti, actor = Admin autenticato, request_key = idempotency key.
- Command +1 (`0562ac33-…`): action `update_field` (stessa RPC Admin V2 `admin_update_product_field`), key `96718ff6…`, result APPLIED v2.
- Suggestion: accepted, resolved_at 2026-10-02 10:01:13Z, resolved_by Admin, base_version 1, testo originale preservato.
- Exact replay (stessa key/payload, una volta): 200, `replayed=true`, v2; nessuna seconda write.
- Idempotency conflict (stessa key, value + spazio finale): 409 `IDEMPOTENCY_CONFLICT`, zero write.
- Conteggi finali: current 24.467, history 6, command 6, suggestions 1, reservations 1.
- Reload desktop 1280 e mobile 390: nuovo valore persistente, nessun pulsante Accetta residuo, nessun overflow; solo `get_admin_context`, `get_product`, `get_ai_suggestions`.
- Richieste di rete durante il test: solo `product-admin-api` e `product-admin-ai`. Nessuna Shopify, shopify-admin-proxy, Smart Sync, inventory, publication, AI Writer legacy, create-product-ai. Provider AI: 0 chiamate.
- Risposte senza secret/stack; console: solo warning React forwardRef noto.

## Warning
- P3: provenance dopo accept registrata come `manual` / `manual_update`; il legame con l'AI è nella suggestion accepted (stesso request_key), non nella riga current/history. Valutare un'origine `ai_accepted` dedicata.
- Accept eseguito dalla preview autenticata (stesso codice e backend del sito pubblicato): il login sul dominio pubblicato non è disponibile all'agente.

## Restore
Non eseguito: il nuovo valore resta in attesa della decisione keep/restore.

Stato: AI GENERATION LIVE PASS · CONTROLLED ACCEPT LIVE PASS · IDEMPOTENT REPLAY PASS · SHOPIFY ISOLATION PASS · CANARY ACTIVE
