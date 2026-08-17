-- =========================================================
-- F5.1 — Admin API foundation (additive)
-- =========================================================

-- 1) Optimistic concurrency on current values
ALTER TABLE public.product_current_values
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.product_current_values
  DROP CONSTRAINT IF EXISTS chk_pcv_version_positive;
ALTER TABLE public.product_current_values
  ADD CONSTRAINT chk_pcv_version_positive CHECK (version > 0);

-- 2) History enrichment
ALTER TABLE public.product_field_history
  ADD COLUMN IF NOT EXISTS previous_origin text,
  ADD COLUMN IF NOT EXISTS new_origin text,
  ADD COLUMN IF NOT EXISTS previous_review_status text,
  ADD COLUMN IF NOT EXISTS new_review_status text,
  ADD COLUMN IF NOT EXISTS previous_version integer,
  ADD COLUMN IF NOT EXISTS new_version integer,
  ADD COLUMN IF NOT EXISTS request_key text;

ALTER TABLE public.product_field_history
  DROP CONSTRAINT IF EXISTS product_field_history_change_type_check;
ALTER TABLE public.product_field_history
  ADD CONSTRAINT product_field_history_change_type_check CHECK (
    change_type = ANY (ARRAY[
      'import','manual','ai_accepted','ai_discarded','restore_original',
      'publish','publish_failed','inventory_proposal',
      'manual_update','explicit_clear','confirm_legacy','reject_legacy'
    ])
  );

-- 3) Command idempotency log
CREATE TABLE IF NOT EXISTS public.product_admin_command_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor uuid NOT NULL,
  idempotency_key text NOT NULL,
  action text NOT NULL,
  payload_hash text NOT NULL,
  product_id uuid,
  field_key text,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_admin_command_log_actor_key
  ON public.product_admin_command_log (actor, idempotency_key);

GRANT ALL ON public.product_admin_command_log TO service_role;
ALTER TABLE public.product_admin_command_log ENABLE ROW LEVEL SECURITY;
-- no policies: unreachable from anon/authenticated on purpose

-- 4) Atomic command function
CREATE OR REPLACE FUNCTION public.admin_update_product_field(
  p_actor uuid,
  p_action text,
  p_product_id uuid,
  p_field_key text,
  p_value jsonb,
  p_expected_version integer,
  p_idempotency_key text,
  p_payload_hash text,
  p_actor_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing        public.product_admin_command_log%ROWTYPE;
  v_def             public.product_field_definitions%ROWTYPE;
  v_cur             public.product_current_values%ROWTYPE;
  v_result          jsonb;
  v_new_text        text;
  v_new_number      numeric;
  v_new_json        jsonb;
  v_prev_value      jsonb;
  v_new_value       jsonb;
  v_change_type     text;
  v_new_review      text;
  v_new_blocked     boolean;
  v_new_origin      text;
  v_next_version    integer;
  v_protected_groups text[] := ARRAY['inventory','shopify_state','system','other_imported'];
  v_protected_keys   text[] := ARRAY[
    'sku','woo_product_id','entity_type','parent_sku','handle',
    'product_category_raw','category_effective','raw_unmapped'
  ];
BEGIN
  IF p_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED');
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR',
                              'message', 'idempotencyKey mancante o troppo corto');
  END IF;
  IF p_action NOT IN ('update_field','clear_field','confirm_legacy_value','reject_legacy_value') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'azione non supportata');
  END IF;

  -- Idempotent replay
  SELECT * INTO v_existing
    FROM public.product_admin_command_log
   WHERE actor = p_actor AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RETURN jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    END IF;
    RETURN v_existing.result_json || jsonb_build_object('replayed', true);
  END IF;

  SELECT * INTO v_def FROM public.product_field_definitions WHERE key = p_field_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'field key sconosciuta');
  END IF;

  IF v_def.editable = false
     OR v_def.visible = false
     OR v_def.field_group = ANY (v_protected_groups)
     OR v_def.key = ANY (v_protected_keys) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FIELD_NOT_EDITABLE');
  END IF;

  SELECT * INTO v_cur
    FROM public.product_current_values
   WHERE product_id = p_product_id AND field_key = p_field_key
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'valore corrente inesistente');
  END IF;

  IF v_cur.is_locked AND p_action <> 'confirm_legacy_value' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FIELD_NOT_EDITABLE', 'message', 'valore bloccato');
  END IF;

  IF p_expected_version IS NULL OR p_expected_version <> v_cur.version THEN
    RETURN jsonb_build_object(
      'ok', false, 'code', 'VERSION_CONFLICT',
      'currentVersion', v_cur.version,
      'currentValue', COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number))
    );
  END IF;

  v_prev_value := COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number));
  v_new_text := v_cur.value_text;
  v_new_number := v_cur.value_number;
  v_new_json := v_cur.value_json;
  v_new_origin := v_cur.value_origin;
  v_new_review := v_cur.review_status;
  v_new_blocked := v_cur.publish_blocked;

  IF p_action = 'update_field' THEN
    IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'valore mancante');
    END IF;
    v_new_text := NULL; v_new_number := NULL; v_new_json := NULL;
    IF v_def.data_type = 'number' THEN
      IF jsonb_typeof(p_value) <> 'number' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'atteso numero');
      END IF;
      v_new_number := (p_value #>> '{}')::numeric;
      v_new_value := p_value;
    ELSIF v_def.data_type IN ('json','array') THEN
      IF jsonb_typeof(p_value) NOT IN ('object','array') THEN
        RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'atteso oggetto o array');
      END IF;
      v_new_json := p_value;
      v_new_value := p_value;
    ELSIF v_def.data_type = 'boolean' THEN
      IF jsonb_typeof(p_value) <> 'boolean' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'atteso booleano');
      END IF;
      v_new_text := p_value #>> '{}';
      v_new_value := p_value;
    ELSE
      IF jsonb_typeof(p_value) <> 'string' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'atteso testo');
      END IF;
      v_new_text := p_value #>> '{}';
      IF length(btrim(v_new_text)) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR',
                                  'message', 'stringa vuota: usa clear_field');
      END IF;
      v_new_value := to_jsonb(v_new_text);
    END IF;
    v_change_type := 'manual_update';
    v_new_origin := 'manual';
    v_new_review := 'approved';
    v_new_blocked := false;

  ELSIF p_action = 'clear_field' THEN
    IF v_def.required THEN
      RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'campo obbligatorio');
    END IF;
    IF COALESCE(p_value->>'confirm','') <> 'true' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'conferma mancante');
    END IF;
    v_new_text := NULL; v_new_number := NULL; v_new_json := NULL;
    v_new_value := 'null'::jsonb;
    v_change_type := 'explicit_clear';
    v_new_origin := 'manual';
    v_new_review := 'approved';
    v_new_blocked := false;

  ELSIF p_action = 'confirm_legacy_value' THEN
    IF v_cur.review_status <> 'legacy_unverified' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_STATE_INVALID');
    END IF;
    v_new_value := v_prev_value;
    v_change_type := 'confirm_legacy';
    v_new_origin := 'manual';
    v_new_review := 'approved';
    v_new_blocked := false;

  ELSE -- reject_legacy_value
    IF v_cur.review_status <> 'legacy_unverified' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_STATE_INVALID');
    END IF;
    v_new_value := v_prev_value;
    v_change_type := 'reject_legacy';
    v_new_origin := 'manual';
    v_new_review := 'rejected';
    v_new_blocked := true;
  END IF;

  -- No-op detection (only for value-changing actions)
  IF p_action IN ('update_field','clear_field')
     AND v_new_text IS NOT DISTINCT FROM v_cur.value_text
     AND v_new_number IS NOT DISTINCT FROM v_cur.value_number
     AND v_new_json IS NOT DISTINCT FROM v_cur.value_json
     AND v_new_review = v_cur.review_status
     AND v_new_origin = v_cur.value_origin THEN
    RETURN jsonb_build_object('ok', true, 'code', 'NO_CHANGE', 'version', v_cur.version);
  END IF;

  v_next_version := v_cur.version + 1;

  UPDATE public.product_current_values
     SET value_text = v_new_text,
         value_number = v_new_number,
         value_json = v_new_json,
         value_origin = v_new_origin,
         origin = 'manual',
         review_status = v_new_review,
         publish_blocked = v_new_blocked,
         protected_on_reimport = true,
         reviewed_by = p_actor,
         reviewed_at = now(),
         updated_by = p_actor,
         version = v_next_version,
         updated_at = now()
   WHERE id = v_cur.id;

  INSERT INTO public.product_field_history (
    sku, entity_type, field_key, previous_value, new_value, change_type,
    actor, actor_label, product_id,
    previous_origin, new_origin, previous_review_status, new_review_status,
    previous_version, new_version, request_key
  ) VALUES (
    v_cur.sku, v_cur.entity_type, v_cur.field_key, v_prev_value, v_new_value, v_change_type,
    p_actor, p_actor_label, v_cur.product_id,
    v_cur.value_origin, v_new_origin, v_cur.review_status, v_new_review,
    v_cur.version, v_next_version, p_idempotency_key
  );

  v_result := jsonb_build_object(
    'ok', true, 'code', 'APPLIED', 'action', p_action,
    'productId', v_cur.product_id, 'fieldKey', v_cur.field_key,
    'value', v_new_value, 'version', v_next_version,
    'reviewStatus', v_new_review, 'publishBlocked', v_new_blocked,
    'valueOrigin', v_new_origin
  );

  INSERT INTO public.product_admin_command_log (
    actor, idempotency_key, action, payload_hash, product_id, field_key, result_json
  ) VALUES (
    p_actor, p_idempotency_key, p_action, p_payload_hash, v_cur.product_id, v_cur.field_key, v_result
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

REVOKE ALL ON FUNCTION public.admin_update_product_field(uuid, text, uuid, text, jsonb, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_product_field(uuid, text, uuid, text, jsonb, integer, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_update_product_field(uuid, text, uuid, text, jsonb, integer, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_product_field(uuid, text, uuid, text, jsonb, integer, text, text, text) TO service_role;

-- 5) Restrict direct writes from the browser: reads stay intact
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.products FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_current_values FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_field_history FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_source_snapshots FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_import_batches FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_publication_jobs FROM authenticated;