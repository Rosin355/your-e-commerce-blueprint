-- =====================================================================
-- FASE 4 — SEED TASSONOMIA · PREPARATO, NON APPLICATO
-- Idempotente su stable_key. Nessuna cancellazione. Nessun prodotto toccato.
-- Prerequisito: docs/fase3/003-taxonomy-additive-F3.1.sql applicata.
-- =====================================================================

WITH root AS (
  INSERT INTO public.product_categories
    (stable_key, display_name, slug, parent_id, level, path_keys, sort_order, visible_storefront)
  VALUES
    ('esterno',      'Piante da Esterno',   'piante-da-esterno',    NULL, 1, ARRAY['esterno'],      10, true),
    ('rose',         'Rose',                'rose',                 NULL, 1, ARRAY['rose'],         20, true),
    ('rampicanti',   'Rampicanti',          'rampicanti',           NULL, 1, ARRAY['rampicanti'],   30, true),
    ('erbacee',      'Erbacee e Graminacee','erbacee-e-graminacee', NULL, 1, ARRAY['erbacee'],      40, true),
    ('succulente',   'Grasse e Succulente', 'grasse-e-succulente',  NULL, 1, ARRAY['succulente'],   50, true),
    ('frutto',       'Piante da Frutto',    'piante-da-frutto',     NULL, 1, ARRAY['frutto'],       60, true),
    ('aromatiche',   'Aromatiche',          'aromatiche',           NULL, 1, ARRAY['aromatiche'],   70, true),
    ('bulbi',        'Bulbi',               'bulbi',                NULL, 1, ARRAY['bulbi'],        80, true)
  ON CONFLICT (stable_key) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        sort_order   = EXCLUDED.sort_order
  RETURNING id, stable_key
)
SELECT count(*) AS categorie_principali FROM root;

-- Sottocategorie: risolvono il parent per stable_key, quindi il seed resta
-- rieseguibile e indipendente dagli uuid generati.
INSERT INTO public.product_categories
  (stable_key, display_name, slug, parent_id, level, path_keys, sort_order, visible_storefront)
SELECT v.stable_key, v.display_name, v.slug, p.id, 2,
       ARRAY[p.stable_key, v.stable_key], v.sort_order, true
FROM (VALUES
  ('esterno.alberi',      'Alberi',                'alberi',                'esterno', 10),
  ('esterno.arbusti',     'Arbusti',               'arbusti',               'esterno', 20),
  ('esterno.conifere',    'Conifere',              'conifere',              'esterno', 30),
  ('esterno.siepi',       'Siepi',                 'siepi',                 'esterno', 40),
  ('rose.rampicanti',     'Rose Rampicanti',       'rose-rampicanti',       'rose',    10),
  ('rose.paesaggistiche', 'Rose Paesaggistiche',   'rose-paesaggistiche',   'rose',    20),
  ('rose.cespuglio',      'Rose a Cespuglio',      'rose-a-cespuglio',      'rose',    30),
  ('rose.tappezzanti',    'Rose Tappezzanti',      'rose-tappezzanti',      'rose',    40),
  ('rose.fiore_grande',   'Rose a Fiore Grande',   'rose-a-fiore-grande',   'rose',    50),
  ('frutto.alberi',       'Alberi da Frutto',      'alberi-da-frutto',      'frutto',  10),
  ('frutto.piccoli',      'Piccoli Frutti',        'piccoli-frutti',        'frutto',  20),
  ('bulbi.primaverile',   'Fioritura Primaverile', 'fioritura-primaverile', 'bulbi',   10),
  ('bulbi.estiva',        'Fioritura Estiva',      'fioritura-estiva',      'bulbi',   20),
  ('bulbi.autunnale',     'Fioritura Autunnale',   'fioritura-autunnale',   'bulbi',   30)
) AS v(stable_key, display_name, slug, parent_stable, sort_order)
JOIN public.product_categories p
  ON p.stable_key = v.parent_stable AND p.taxonomy_version = 'v1'
ON CONFLICT (stable_key) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      parent_id    = EXCLUDED.parent_id,
      sort_order   = EXCLUDED.sort_order;

-- NOTA: 'Rose a Fiore Grande' è il nome provvisorio corretto.
-- Una futura rinomina modifica solo display_name/slug: stable_key, id,
-- parent_id, mapping legacy e mapping Shopify restano invariati.

-- NOTE (revisione 2, post-audit F3.1):
-- * `stable_key` è ora univoca globalmente: l'idempotenza si basa su di essa.
-- * `level` e `path_keys` sono calcolati dal trigger enforce_category_hierarchy();
--   i valori indicati qui sono ignorati e ricalcolati dal database.
-- * Il seed crea 8 categorie principali e 14 sottocategorie, non inserisce
--   prodotti, non crea collezioni Shopify, non cancella nulla.
