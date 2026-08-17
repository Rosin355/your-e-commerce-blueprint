-- =====================================================================
-- FASE 4.1 — SEED TASSONOMIA · revisione 3 (stable key gerarchiche)
-- 8 categorie principali + 14 sottocategorie = 22.
-- Idempotente: INSERT ... WHERE NOT EXISTS. Nessun ON CONFLICT DO UPDATE,
-- nessuna cancellazione, nessuna assegnazione prodotto, nessun mapping
-- Shopify, nessuna matrice Bulbi.
-- level e path_keys sono calcolati dai trigger: i valori passati sono
-- irrilevanti e vengono sovrascritti.
-- Visibilità iniziale: is_active = true, visible_admin = true,
-- visible_storefront = FALSE (lo storefront pubblico resta invariato).
-- taxonomy_version = '2026-v1'.
-- =====================================================================

-- 1. Root (8)
INSERT INTO public.product_categories
  (stable_key, display_name, slug, parent_id, sort_order,
   is_active, visible_admin, visible_storefront, taxonomy_version)
SELECT v.stable_key, v.display_name, v.slug, NULL, v.sort_order,
       true, true, false, '2026-v1'
FROM (VALUES
  ('piante-da-esterno',  'Piante da Esterno',    'piante-da-esterno',    10),
  ('rose',               'Rose',                 'rose',                 20),
  ('rampicanti',         'Rampicanti',           'rampicanti',           30),
  ('erbacee-graminacee', 'Erbacee e Graminacee', 'erbacee-e-graminacee', 40),
  ('grasse-succulente',  'Grasse e Succulente',  'grasse-e-succulente',  50),
  ('piante-da-frutto',   'Piante da Frutto',     'piante-da-frutto',     60),
  ('aromatiche',         'Aromatiche',           'aromatiche',           70),
  ('bulbi',              'Bulbi',                'bulbi',                80)
) AS v(stable_key, display_name, slug, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_categories c WHERE c.stable_key = v.stable_key
);

-- 2. Sottocategorie (14) — parent risolto per stable_key
INSERT INTO public.product_categories
  (stable_key, display_name, slug, parent_id, sort_order,
   is_active, visible_admin, visible_storefront, taxonomy_version)
SELECT v.stable_key, v.display_name, v.slug, p.id, v.sort_order,
       true, true, false, '2026-v1'
FROM (VALUES
  ('piante-da-esterno.alberi',   'Alberi',                'alberi',                'piante-da-esterno', 10),
  ('piante-da-esterno.arbusti',  'Arbusti',               'arbusti',               'piante-da-esterno', 20),
  ('piante-da-esterno.conifere', 'Conifere',              'conifere',              'piante-da-esterno', 30),
  ('piante-da-esterno.siepi',    'Siepi',                 'siepi',                 'piante-da-esterno', 40),
  ('rose.rampicanti',            'Rose Rampicanti',       'rose-rampicanti',       'rose',              10),
  ('rose.paesaggistiche',        'Rose Paesaggistiche',   'rose-paesaggistiche',   'rose',              20),
  ('rose.cespuglio',             'Rose a Cespuglio',      'rose-a-cespuglio',      'rose',              30),
  ('rose.tappezzanti',           'Rose Tappezzanti',      'rose-tappezzanti',      'rose',              40),
  ('rose.fiore-grande',          'Rose a Fiore Grande',   'rose-a-fiore-grande',   'rose',              50),
  ('piante-da-frutto.alberi',        'Alberi da Frutto',  'alberi-da-frutto',      'piante-da-frutto',  10),
  ('piante-da-frutto.piccoli-frutti','Piccoli Frutti',    'piccoli-frutti',        'piante-da-frutto',  20),
  ('bulbi.fioritura-primaverile','Fioritura Primaverile', 'fioritura-primaverile', 'bulbi',             10),
  ('bulbi.fioritura-estiva',     'Fioritura Estiva',      'fioritura-estiva',      'bulbi',             20),
  ('bulbi.fioritura-autunnale',  'Fioritura Autunnale',   'fioritura-autunnale',   'bulbi',             30)
) AS v(stable_key, display_name, slug, parent_stable, sort_order)
JOIN public.product_categories p ON p.stable_key = v.parent_stable
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_categories c WHERE c.stable_key = v.stable_key
);

-- NOTE
-- * Nome confermato: 'Rose a Fiore Grande' (mai 'Rose Gradifiore').
-- * Le stable_key NON sono handle Shopify: nomi e slug pubblici possono
--   cambiare senza toccare stable_key, id o relazioni.
-- * Una seconda esecuzione inserisce 0 righe e non modifica nulla:
--   eventuali differenze su nomi/ordinamento vanno confrontate a parte
--   e non sono corrette automaticamente.
