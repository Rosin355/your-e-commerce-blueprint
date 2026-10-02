# Fase 2D.8 — Frontend live + primo smoke di generazione AI (2026-10-02)

Esito: **PASS — READY FOR CONTROLLED ACCEPT**. Accept e reject NON testati. Canary attivo. NON è GO-LIVE COMPLETE.

## Preflight
- Revisione backend live `93b6f61`; HEAD Lovable `2575f64` (solo docs 2D.7 sopra 93b6f61). Nessuna nuova migration (ultime: 20260930152426, 20261001130202, 20261001131926).
- `product-admin-api` e `product-admin-ai` raggiungibili (200 Admin). Canary: `PRODUCT_ADMIN_WRITE_MODE` / `PRODUCT_ADMIN_WRITES_ENABLED` presenti, invariati.
- Provider: `LOVABLE_API_KEY` presente (valore non mostrato). Gateway Lovable AI.
- Scansione sicurezza: nessun finding critico (solo info `sync` pubblico, noto).

## Frontend publish
- Pubblicato senza modifiche al codice. Sito pubblicato risponde 200; bundle `ProductDetailPage-KglYxGo3.js` contiene "Migliora con AI".
- Smoke UI (anteprima, stessa revisione, sessione Admin): dashboard (2.706 prodotti), lista, ricerca OG_264361, dettaglio, FieldCard. Console: solo warning React forwardRef noto (P3). Nessun errore bloccante.

## Fixture e baseline
- Prodotto OG_264361, product_id `d6492fb1-0a61-440b-8db2-74db6eb0ff12`.
- Campo: `seo_title` (prima preferenza, eligible: ai_allowed, non manual_only, non locked, canSuggestAi=true).
- Baseline: valore `Hemerocallis "Rosy" | Giglio Diurno Rosa - Online Garden`, version 1, is_locked false, review_status `legacy_unverified`, value_origin `legacy_ai_unknown_approval`, origin `import`, source_snapshot_id NULL, md5 `a6f5a9d7f94ce9a525229b23c4f8e303`.
- Pulsante "Migliora con AI" presente solo su title, description, optimized_description, seo_title, seo_description (sezione SEO chiusa di default nell'accordion). Nessun JSON grezzo visibile.

## Generazione (una sola volta)
- 1 click, 1 richiesta `generate_ai_suggestion`, risposta 200, `replayed=false`.
- Suggestion `72d271c6-d998-47b3-98fe-2321fef6d829`, status `pending`, base_version 1, prompt `seo-title@1`, model `lovable/google/gemini-3-flash-preview`, created_by = utente Admin.
- Proposta: `Hemerocallis "Rosy" - Giglio Diurno Rosa | Online Garden` — testo semplice, nessun HTML/script, nessun prezzo/disponibilità/dato Shopify/dato botanico inventato, entro limiti SEO.
- Reservation `4eec1aaa-7061-44ba-a483-5a3cbe41a548`, status `completed`, collegata alla suggestion.

## Non-write check
| | prima | dopo |
|---|---|---|
| current values | 24467 | 24467 |
| history | 5 | 5 |
| command log | 5 | 5 |
| suggestions | 0 | 1 |
| reservations | 0 | 1 |
| seo_title version / md5 | 1 / a6f5a9d7… | 1 / a6f5a9d7… |

is_locked, review_status, origin, value_origin, source_snapshot_id, updated_at identici. Nessuna chiamata Shopify.

## Reload e responsive
- Dopo ricarica la proposta pending viene riletta (Attuale/Proposta distinti, Modifica/Rifiuta/Accetta visibili), 0 nuove generazioni, 0 accept/reject.
- Desktop 1280 e mobile 390: nessun overflow orizzontale, testi leggibili, pulsanti visibili.

## Limiti
- Accept/reject non testati (fase successiva). tech_admin e prodotto inattivo non testabili live.
- La proposta pending resta in DB intenzionalmente.
