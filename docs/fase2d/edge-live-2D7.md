# Fase 2D.7 — Live Edge Deploy + read-only smoke (2026-10-02)

- main verificato: `93b6f61a666aecfcf13c17d8b55845cb6a4a4106`; nessuna nuova migration (ultime tre AI registrate in Drizzle id 4–6).
- ACL: suggestions/reservations → PUBLIC/anon/authenticated nessuno; service_role SELECT,INSERT,UPDATE; RLS ON; policy `ai_suggestions_read` invariata; RPC `reserve_product_ai_generation` SECURITY INVOKER, `search_path=""`, EXECUTE service_role (+ sandbox_exec).
- Packaging: zero import tra `product-admin-api` e `product-admin-ai`; `deno check` PASS.
- Deploy `product-admin-api` PASS; deploy `product-admin-ai` PASS (prima non esisteva live: 404).
- Auth smoke (entrambe): senza token 401, token invalido 401, admin 200. Non-Admin e tech_admin non testabili live (unico utente: admin).
- Capability (OG_264361): canSuggestAi=true solo su title, description, optimized_description, seo_title, seo_description; false su manual_only, strutturali, Shopify/sistemici. Nessun prodotto inattivo esistente: caso `product_inactive` non testabile live.
- get_ai_suggestions su OG_264361: 200, `[]`.
- Conteggi prima=dopo: products 2706, current 24467, history 5, command 5, suggestions 0, reservations 0.
- Non invocati: generate/accept/reject, provider AI, create-product-ai, AI Writer legacy, shopify-admin-proxy, Shopify, inventory, Smart Sync.
- sandbox_exec, sandbox_exec_iekwvvihjwghosqdxrdi: LOGIN, non superuser, membri di postgres; SELECT,INSERT sulle due tabelle AI (+EXECUTE RPC per il secondo). Ruoli tooling Lovable, non assumibili da utenti applicativi (JWT → anon/authenticated). Classificazione: PLATFORM_MANAGED_EXPECTED (da confermare con piattaforma). Nessuna revoca.
- Frontend: AiSuggestionCard, integrazione FieldCard, client API AI presenti in main; NON pubblicato.

Stato: 2D EDGE BACKEND LIVE · READ-ONLY SMOKE PASS · FRONTEND NOT PUBLISHED · AI PROVIDER NOT CALLED · AI GENERATION NOT YET TESTED · CANARY ACTIVE
