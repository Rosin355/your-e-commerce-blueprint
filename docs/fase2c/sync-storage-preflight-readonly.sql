-- Fase 2C / STORAGE-003 — preflight esclusivamente read-only.
-- Non seleziona contenuti, non genera URL e non modifica bucket/policy/oggetti.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

-- Configurazione dei soli bucket interessati.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('sync', 'csv-pipeline')
ORDER BY id;

-- Inventario aggregato: non restituisce i nomi completi degli oggetti.
SELECT
  bucket_id,
  CASE
    WHEN name LIKE 'product-images/%' THEN 'product-images/'
    WHEN position('/' IN name) > 0 THEN split_part(name, '/', 1) || '/'
    ELSE '<root>'
  END AS namespace,
  CASE
    WHEN name ~ '\.[A-Za-z0-9]+$' THEN lower(substring(name FROM '\.([A-Za-z0-9]+)$'))
    ELSE '<none>'
  END AS extension,
  count(*) AS object_count,
  sum(
    CASE
      WHEN metadata ->> 'size' ~ '^[0-9]+$' THEN (metadata ->> 'size')::bigint
      ELSE 0
    END
  ) AS total_bytes
FROM storage.objects
WHERE bucket_id IN ('sync', 'csv-pipeline')
GROUP BY bucket_id, namespace, extension
ORDER BY bucket_id, namespace, extension;

-- Conferma mirata del file già noto, senza contenuto o metadata sensibili.
SELECT
  bucket_id,
  count(*) FILTER (WHERE name = 'shopify-ready.csv') AS known_root_csv_count,
  count(*) FILTER (WHERE name LIKE 'product-images/%') AS product_image_count,
  count(*) FILTER (
    WHERE name !~ '^product-images/' AND lower(name) ~ '\.csv$'
  ) AS non_image_csv_count
FROM storage.objects
WHERE bucket_id = 'sync'
GROUP BY bucket_id;

-- Policy effettive applicabili agli oggetti Storage.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    coalesce(qual, '') ILIKE '%sync%'
    OR coalesce(with_check, '') ILIKE '%sync%'
    OR coalesce(qual, '') ILIKE '%csv-pipeline%'
    OR coalesce(with_check, '') ILIKE '%csv-pipeline%'
  )
ORDER BY policyname;

-- GRANT visibili al ruolo esecutore per i ruoli applicativi interessati.
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'storage'
  AND table_name = 'objects'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

ROLLBACK;
