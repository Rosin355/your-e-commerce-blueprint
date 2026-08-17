-- FASE 3 · Correttiva additiva: rimuove i grant ereditati dal ruolo anonimo
-- sulle sette nuove tabelle. Nessun dato modificato.
REVOKE ALL ON public.product_field_definitions FROM anon;
REVOKE ALL ON public.product_import_batches FROM anon;
REVOKE ALL ON public.product_source_snapshots FROM anon;
REVOKE ALL ON public.product_current_values FROM anon;
REVOKE ALL ON public.product_ai_suggestions FROM anon;
REVOKE ALL ON public.product_field_history FROM anon;
REVOKE ALL ON public.product_publication_jobs FROM anon;

-- Snapshot e storico: nessuna cancellazione/modifica nemmeno per i servizi applicativi.
REVOKE UPDATE, DELETE, TRUNCATE ON public.product_source_snapshots FROM authenticated, service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.product_field_history FROM authenticated, service_role;