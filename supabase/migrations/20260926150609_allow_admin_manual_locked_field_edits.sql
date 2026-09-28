-- Fase 2C.1 — salvataggi manual_only locked tramite il solo canale Admin.
--
-- Modifica esclusivamente la RPC atomica esistente. Non rimuove is_locked,
-- non aggiorna righe e non cambia RLS, GRANT o tabelle. La firma resta identica.

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
  v_existing         public.product_admin_command_log%ROWTYPE;
  v_def              public.product_field_definitions%ROWTYPE;
  v_cur              public.product_current_values%ROWTYPE;
  v_product          public.products%ROWTYPE;
  v_result           jsonb;
  v_new_text         text;
  v_new_number       numeric;
  v_new_json         jsonb;
  v_prev_value       jsonb;
  v_new_value        jsonb;
  v_change_type      text;
  v_new_review       text;
  v_new_blocked      boolean;
  v_new_origin       text;
  v_next_version     integer;
  v_parent_sku       text;
  v_actor_is_admin   boolean := false;
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

  -- Il replay viene risolto prima di leggere o bloccare il current value.
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
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'field key sconosciuta');
  END IF;

  IF v_def.editable = false
     OR v_def.visible = false
     OR v_def.field_group = ANY (v_protected_groups)
     OR v_def.key = ANY (v_protected_keys) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FIELD_NOT_EDITABLE');
  END IF;

  -- Non si accettano claim dal payload: l'autorizzazione deriva dal registro ruoli.
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles ur
     WHERE ur.user_id = p_actor
       AND ur.role::text IN ('admin', 'tech_admin')
  ) INTO v_actor_is_admin;

  SELECT * INTO v_cur
    FROM public.product_current_values
   WHERE product_id = p_product_id AND field_key = p_field_key
   FOR UPDATE;

  -- Creazione atomica: solo Admin, solo manual_only, solo update_field e versione 0.
  IF NOT FOUND THEN
    IF p_expected_version IS NULL OR p_expected_version <> 0 THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'VERSION_CONFLICT',
        'currentVersion', 0, 'currentValue', NULL
      );
    END IF;
    IF p_action <> 'update_field' OR NOT v_def.manual_only OR NOT v_actor_is_admin THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'FIELD_NOT_EDITABLE',
        'message', 'creazione consentita solo a un Admin per campi manual_only'
      );
    END IF;
    IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'VALIDATION_ERROR', 'message', 'valore mancante');
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'prodotto inesistente');
    END IF;
    IF NOT (
      v_def.applies_to = 'both'
      OR (v_product.entity_type = 'variation' AND v_def.applies_to = 'variant')
      OR (v_product.entity_type IN ('simple','variable') AND v_def.applies_to = 'product')
    ) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'FIELD_NOT_EDITABLE',
                                'message', 'campo non applicabile al tipo prodotto');
    END IF;

    v_new_text := NULL;
    v_new_number := NULL;
    v_new_json := NULL;
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
                                  'message', 'stringa vuota non ammessa');
      END IF;
      v_new_value := to_jsonb(v_new_text);
    END IF;

    IF v_product.parent_product_id IS NOT NULL THEN
      SELECT sku INTO v_parent_sku
        FROM public.products
       WHERE id = v_product.parent_product_id;
    END IF;

    INSERT INTO public.product_current_values (
      product_id, sku, parent_sku, entity_type, field_key,
      value_text, value_number, value_json,
      origin, source_batch_id, source_snapshot_id, is_locked,
      publish_state, value_origin, review_status, publish_blocked,
      protected_on_reimport, reviewed_by, reviewed_at, updated_by, version
    ) VALUES (
      v_product.id, v_product.sku, v_parent_sku,
      CASE WHEN v_product.entity_type = 'variation' THEN 'variant' ELSE 'product' END,
      v_def.key,
      v_new_text, v_new_number, v_new_json,
      'manual', NULL, NULL, true,
      'draft', 'manual', 'approved', false,
      true, p_actor, now(), p_actor, 1
    )
    ON CONFLICT (product_id, field_key) DO NOTHING
    RETURNING * INTO v_cur;

    IF NOT FOUND THEN
      SELECT * INTO v_cur
        FROM public.product_current_values
       WHERE product_id = p_product_id AND field_key = p_field_key
       FOR UPDATE;
      RETURN jsonb_build_object(
        'ok', false, 'code', 'VERSION_CONFLICT',
        'currentVersion', v_cur.version,
        'currentValue', COALESCE(v_cur.value_json, to_jsonb(v_cur.value_text), to_jsonb(v_cur.value_number))
      );
    END IF;

    INSERT INTO public.product_field_history (
      sku, entity_type, field_key, previous_value, new_value, change_type,
      actor, actor_label, product_id,
      previous_origin, new_origin, previous_review_status, new_review_status,
      previous_version, new_version, request_key
    ) VALUES (
      v_cur.sku, v_cur.entity_type, v_cur.field_key, NULL, v_new_value, 'manual_update',
      p_actor, p_actor_label, v_cur.product_id,
      NULL, 'manual', NULL, 'approved',
      0, 1, p_idempotency_key
    );

    v_result := jsonb_build_object(
      'ok', true, 'code', 'APPLIED', 'action', p_action,
      'productId', v_cur.product_id, 'fieldKey', v_cur.field_key,
      'value', v_new_value, 'version', 1,
      'reviewStatus', 'approved', 'publishBlocked', false,
      'valueOrigin', 'manual', 'created', true
    );

    INSERT INTO public.product_admin_command_log (
      actor, idempotency_key, action, payload_hash, product_id, field_key, result_json
    ) VALUES (
      p_actor, p_idempotency_key, p_action, p_payload_hash,
      v_cur.product_id, v_cur.field_key, v_result
    );
    RETURN v_result;
  END IF;

  -- Il lock resta effettivo per ogni canale salvo editing manuale Admin di manual_only.
  IF v_cur.is_locked
     AND p_action <> 'confirm_legacy_value'
     AND NOT (
       v_def.manual_only
       AND v_actor_is_admin
       AND p_action IN ('update_field','clear_field')
     ) THEN
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

  ELSE
    IF v_cur.review_status <> 'legacy_unverified' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_STATE_INVALID');
    END IF;
    v_new_value := v_prev_value;
    v_change_type := 'reject_legacy';
    v_new_origin := 'manual';
    v_new_review := 'rejected';
    v_new_blocked := true;
  END IF;

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
    p_actor, p_idempotency_key, p_action, p_payload_hash,
    v_cur.product_id, v_cur.field_key, v_result
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
