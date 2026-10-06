-- Admin V2 — editing client-safe e sincronizzazione Shopify a campo singolo.
-- Additiva: nessun dato catalogo viene riscritto e nessuna sync viene avviata.

ALTER TABLE public.product_current_values
  ADD COLUMN IF NOT EXISTS shopify_verified_value jsonb,
  ADD COLUMN IF NOT EXISTS shopify_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_sync_error_code text,
  ADD COLUMN IF NOT EXISTS shopify_sync_error_message text;

-- I quattro periodi hanno una rappresentazione interna canonica string[].
UPDATE public.product_field_definitions
   SET editor_type = 'multiselect',
       data_type = 'array',
       validation_rules = jsonb_build_object(
         'enum', jsonb_build_array(
           'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
           'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
         )
       ),
       help_text = 'Seleziona uno o più mesi. Il sistema convertirà automaticamente il valore nel formato richiesto da Shopify.'
 WHERE key IN (
   'periodo_di_fioritura',
   'periodo_di_messa_a_dimora',
   'periodo_di_raccolta',
   'periodo_ottimale_di_potatura'
 );

UPDATE public.product_field_definitions
   SET editor_type = 'select',
       data_type = 'text',
       validation_rules = jsonb_build_object(
         'enum', jsonb_build_array('Facile','Media','Difficile')
       ),
       help_text = 'Seleziona Facile, Media o Difficile. Il valore descrive l’impegno richiesto per la coltivazione.'
 WHERE key = 'difficolta_di_coltivazione';

-- Un salvataggio interno manuale diventa PENDING_SYNC nella stessa transazione
-- della RPC esistente. La feature flag Edge decide separatamente se Shopify è
-- scrivibile: questa trigger non effettua mai chiamate esterne.
CREATE OR REPLACE FUNCTION public.mark_admin_field_pending_shopify_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_def public.product_field_definitions%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.value_text IS NOT DISTINCT FROM OLD.value_text
     AND NEW.value_number IS NOT DISTINCT FROM OLD.value_number
     AND NEW.value_json IS NOT DISTINCT FROM OLD.value_json THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_def
    FROM public.product_field_definitions
   WHERE key = NEW.field_key;

  IF FOUND
     AND v_def.publishable
     AND COALESCE(v_def.shopify_mapping, '{}'::jsonb) <> '{}'::jsonb
     AND v_def.shopify_mapping->>'type' IN ('core','seo','metafield','variant')
     AND NEW.value_origin IN ('manual','ai_accepted') THEN
    NEW.publish_state := 'pending_publish';
    NEW.shopify_sync_error_code := NULL;
    NEW.shopify_sync_error_message := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_pcv_mark_pending_shopify_sync
  ON public.product_current_values;
CREATE TRIGGER trg_pcv_mark_pending_shopify_sync
BEFORE INSERT OR UPDATE OF value_text, value_number, value_json
ON public.product_current_values
FOR EACH ROW EXECUTE FUNCTION public.mark_admin_field_pending_shopify_sync();

REVOKE ALL ON FUNCTION public.mark_admin_field_pending_shopify_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_admin_field_pending_shopify_sync() FROM anon;
REVOKE ALL ON FUNCTION public.mark_admin_field_pending_shopify_sync() FROM authenticated;

-- Completa esclusivamente i metadati della sync. expectedVersion viene
-- ricontrollata sotto lock; la versione editoriale non viene incrementata.
CREATE OR REPLACE FUNCTION public.admin_complete_product_field_sync(
  p_actor uuid,
  p_product_id uuid,
  p_field_key text,
  p_expected_version integer,
  p_idempotency_key text,
  p_payload_hash text,
  p_success boolean,
  p_verified_value jsonb DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.product_admin_command_log%ROWTYPE;
  v_cur public.product_current_values%ROWTYPE;
  v_def public.product_field_definitions%ROWTYPE;
  v_result jsonb;
  v_change_type text;
BEGIN
  IF p_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = p_actor AND role::text IN ('admin','tech_admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR');
  END IF;

  SELECT * INTO v_existing
    FROM public.product_admin_command_log
   WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    END IF;
    RETURN v_existing.result_json || jsonb_build_object('replayed', true);
  END IF;

  SELECT * INTO v_def
    FROM public.product_field_definitions
   WHERE key = p_field_key;
  IF NOT FOUND OR NOT v_def.publishable
     OR COALESCE(v_def.shopify_mapping, '{}'::jsonb) = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BLOCK_SYNC');
  END IF;

  SELECT * INTO v_cur
    FROM public.product_current_values
   WHERE product_id = p_product_id AND field_key = p_field_key
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_cur.version <> p_expected_version THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'VERSION_CONFLICT',
      'currentVersion', v_cur.version
    );
  END IF;
  IF v_cur.review_status <> 'approved' OR v_cur.publish_blocked THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BLOCK_SYNC');
  END IF;
  IF NOT p_success AND p_error_code NOT IN (
    'BLOCK_SYNC','STATE_DRIFT','SYNC_VERIFY_FAILED','SHOPIFY_WRITE_FAILED'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR');
  END IF;

  v_change_type := CASE WHEN p_success THEN 'publish' ELSE 'publish_failed' END;

  UPDATE public.product_current_values
     SET publish_state = CASE WHEN p_success THEN 'published' ELSE 'failed' END,
         published_at = CASE WHEN p_success THEN now() ELSE published_at END,
         shopify_verified_value = CASE
           WHEN p_success THEN p_verified_value
           ELSE shopify_verified_value
         END,
         shopify_verified_at = CASE
           WHEN p_success THEN now()
           ELSE shopify_verified_at
         END,
         shopify_sync_error_code = CASE WHEN p_success THEN NULL ELSE p_error_code END,
         shopify_sync_error_message = CASE
           WHEN p_success THEN NULL
           ELSE left(COALESCE(p_error_message, 'Sincronizzazione non riuscita'), 500)
         END,
         updated_by = p_actor,
         updated_at = now()
   WHERE id = v_cur.id;

  INSERT INTO public.product_field_history (
    sku, entity_type, field_key, previous_value, new_value, change_type,
    actor, product_id, previous_origin, new_origin,
    previous_review_status, new_review_status,
    previous_version, new_version, request_key
  ) VALUES (
    v_cur.sku, v_cur.entity_type, v_cur.field_key,
    COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number)),
    COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number)),
    v_change_type, p_actor, v_cur.product_id,
    v_cur.value_origin, v_cur.value_origin,
    v_cur.review_status, v_cur.review_status,
    v_cur.version, v_cur.version, p_idempotency_key
  );

  v_result := jsonb_build_object(
    'ok', p_success,
    'code', CASE WHEN p_success THEN 'SYNCED' ELSE p_error_code END,
    'productId', p_product_id,
    'fieldKey', p_field_key,
    'version', v_cur.version,
    'syncState', CASE WHEN p_success THEN 'SYNCED' ELSE 'SYNC_ERROR' END
  );

  INSERT INTO public.product_admin_command_log (
    actor, idempotency_key, action, payload_hash, product_id, field_key, result_json
  ) VALUES (
    p_actor, p_idempotency_key, 'sync_field', p_payload_hash,
    p_product_id, p_field_key, v_result
  );
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
      FROM public.product_admin_command_log
     WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
    IF FOUND AND v_existing.payload_hash = p_payload_hash THEN
      RETURN v_existing.result_json || jsonb_build_object('replayed', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_complete_product_field_sync(
  uuid, uuid, text, integer, text, text, boolean, jsonb, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_complete_product_field_sync(
  uuid, uuid, text, integer, text, text, boolean, jsonb, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.admin_complete_product_field_sync(
  uuid, uuid, text, integer, text, text, boolean, jsonb, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_product_field_sync(
  uuid, uuid, text, integer, text, text, boolean, jsonb, text, text
) TO service_role;
