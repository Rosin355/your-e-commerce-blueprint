# AI Product Writer: Analisi + Prompt Compatibile Lovable

## 1) Analisi della risposta originale (adattata al progetto attuale)

La proposta originale è valida come direzione, ma nel tuo progetto ci sono vincoli specifici da rispettare:

1. Backend reale: oggi sei Shopify-first, non DB-first.
   - I prodotti pubblici arrivano da Shopify.
   - Quindi il tool deve leggere/scrivere su Shopify (non solo su tabelle locali).

2. Admin esistente:
   - Hai già `/admin/import` con validazione, dry-run e sync via proxy Supabase.
   - Conviene estendere questa base con una nuova sezione "AI Writer", non creare un sistema parallelo.

3. Sicurezza e preview:
   - La preview pubblica non deve cambiare.
   - Le nuove route devono stare sotto `/admin/*` e dietro guard + feature flag.

4. Rigenerazione prodotti già esistenti:
   - Requisito critico: non solo nuovi prodotti.
   - Serve browsing dei prodotti già su Shopify + azione "Genera/Rigenera".

5. Architettura consigliata:
   - UI Admin in Lovable (upload/preview/generate/approve)
   - Edge Function Supabase per:
     - leggere prodotti Shopify esistenti
     - invocare AI (vision + copy)
     - aggiornare Shopify (description/meta/alt)
   - Draft storage opzionale in Supabase per audit e approval flow.

## 2) Prompt Lovable aggiornato (pronto da incollare)

```txt
Aggiorna il progetto esistente senza rompere il frontend pubblico.

Contesto reale del progetto:
- Frontend: React + Vite + TypeScript
- Catalogo pubblico: Shopify Storefront API
- Admin import già presente su /admin/import
- Proxy Shopify già presente via Supabase Edge Function (shopify-admin-proxy)

Obiettivo:
Implementare un nuovo tool admin "AI Product Writer" per generare e rigenerare testi SEO dei prodotti Shopify, inclusi quelli già esistenti.

Vincolo non negoziabile:
Non compromettere la preview pubblica.
- Non cambiare comportamento di `/` e `/products/:handle`
- Tutto sotto `/admin/*`
- Route protetta con guard admin
- Feature flag obbligatoria: `VITE_ENABLE_AI_PRODUCT_WRITER=true`

Requisiti funzionali:
1) Pagina admin:
- Nuova route: `/admin/ai-writer`
- Tabs:
  - "Prodotti Shopify" (elenco esistenti con ricerca/filtro)
  - "Bulk Generate" (selezione multipla + queue)
  - "Drafts & History"

2) Prodotti esistenti Shopify:
- Mostra elenco prodotti già su Shopify (id, title, handle, updated_at)
- Azioni per riga:
  - "Genera bozza AI"
  - "Rigenera"
  - "Approva e pubblica su Shopify"
- Supporta rigenerazione anche se il prodotto è già completo

3) Pipeline AI (2-step):
- Step A: Vision/Facts (se immagini disponibili)
  - Estrai facts JSON plausibili, no invenzioni
- Step B: Copy SEO
  - Genera: short, long, care guide, faq, seo meta, alt text, internal links

4) Modalità:
- Dry Run: genera bozza ma non scrive su Shopify
- Publish: aggiorna Shopify per il prodotto selezionato
- Bulk: batch (es. 10 alla volta) con progress bar e retry/backoff

5) Salvare bozza/storico:
- Crea tabella Supabase `product_ai_drafts`:
  - id, shopify_product_id, language, seed_style, facts_json, copy_json, status(draft|approved|published), created_by, created_at, published_at, error
- Ogni rigenerazione crea nuova bozza versionata

6) Aggiornamento Shopify:
- Aggiorna almeno:
  - descrizione prodotto (body_html / description)
  - seo title + seo description
  - alt text immagini quando disponibili
- Non sovrascrivere campi non coinvolti
- Scrittura idempotente dove possibile

7) Sicurezza:
- Nessuna API key hardcoded nel frontend
- Chiavi in Edge Function env
- UI chiama solo funzioni server-side
- Log sanitizzati (no dati sensibili)

8) Compatibilità con codice esistente:
- Riusa pattern di `/admin/import` (store, progress, report, audit)
- Non introdurre regressioni su import clienti/prodotti già esistente

9) Nuove azioni richieste nel proxy Shopify:
- `list_products` (paginato, ricerca per titolo/handle)
- `get_product`
- `update_product_content`
- `update_product_seo`
- `update_product_image_alt`

10) UX:
- Pulsanti:
  - "Genera testi SEO"
  - "Rigenera"
  - "Approva"
  - "Pubblica su Shopify"
- Evidenzia differenza tra testo attuale Shopify e bozza AI
- Mostra indicatori: draft/published/error

Prompt AI da usare (adattati):

Prompt Vision (facts JSON)
Sei un botanico e content editor per e-commerce di piante (Italia).
Analizza immagini + nome prodotto + categoria.
Estrarre solo informazioni plausibili; se non deducibile usare null.
Output JSON con: common_name, botanical_guess, plant_type, visual_traits, flower_color_guess, leaf_shape_guess, pot_or_garden, seasonality_guess, care_difficulty_guess, warnings, confidence.

Prompt Copy SEO (output JSON)
Sei un copywriter SEO italiano per e-commerce piante.
Scrivi testi umani, utili, senza keyword stuffing.
Niente promesse mediche, niente invenzioni.
Input: nome prodotto, categoria, attributi certi, facts_json, seed_style, brand voice.
Output JSON con:
- h1_title
- short_description (<=260 chars)
- long_description (400-800 parole)
- key_benefits (5)
- care_guide { light, watering, soil, temperature, notes }
- faq (4)
- seo { meta_title<=60, meta_description<=155, slug, keywords_suggested }
- image_alt_texts (3-6)
- internal_links_suggestions (2-4)

Seed styles supportati:
- Pratico e tecnico
- Caldo e narrativo
- Minimal e diretto
- Guida step-by-step

Deliverable richiesti:
- Nuove route/componenti admin
- Edge Function aggiornata con azioni Shopify richieste
- Migrazione Supabase per `product_ai_drafts`
- Nessun impatto sulle route pubbliche
- README aggiornato con setup, env e flusso operativo
```

## 3) Criteri di accettazione rapidi

- `/admin/ai-writer` accessibile solo ad admin
- elenco prodotti Shopify esistenti visibile
- dry-run funziona senza pubblicare
- publish aggiorna Shopify per prodotto selezionato
- rigenerazione su prodotto esistente funziona
- homepage/prodotto pubblico invariati
