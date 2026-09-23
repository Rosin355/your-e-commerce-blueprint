-- ONLINE GARDEN — FASE 1A.6
-- Dry-run read-only per il futuro backfill di
-- public.product_current_values.source_snapshot_id.
--
-- Non contiene DML. Non restituisce valori prodotto: soltanto identificativi
-- tecnici, classificazione, motivazione e conteggi candidato.
-- Eseguire solo DOPO l'applicazione approvata della migration 1A.6.

begin;
set transaction read only;
set local statement_timeout = '120s';

with base as (
  select
    pcv.id as current_value_id,
    pcv.product_id,
    pcv.sku,
    pcv.entity_type,
    pcv.field_key,
    pcv.source_batch_id,
    pcv.origin,
    pcv.value_origin,
    pcv.value_text,
    pcv.value_json,
    pcv.value_number,
    pcv.source_snapshot_id,
    p.entity_type as canonical_entity_type,
    p.sku as canonical_sku,
    pfd.data_type,
    pfd.source_aliases
  from public.product_current_values pcv
  join public.products p
    on p.id = pcv.product_id
  left join public.product_field_definitions pfd
    on pfd.key = pcv.field_key
  where pcv.source_snapshot_id is null
),
eligible as (
  select
    base.*,
    case
      when origin <> 'import' then false
      when value_origin not in ('source_csv', 'legacy_db_baseline') then false
      when canonical_sku <> sku then false
      when data_type is null then false
      when coalesce(cardinality(source_aliases), 0) = 0 then false
      when data_type not in ('text', 'html', 'number', 'boolean') then false
      when data_type in ('text', 'html') and value_text is null then false
      when data_type = 'number' and value_number is null then false
      when data_type = 'boolean'
        and value_json is null
        and value_text is null then false
      else true
    end as is_applicable,
    case
      when origin <> 'import' then 'NON_SOURCE_ORIGIN'
      when value_origin = 'legacy_ai_unknown_approval' then 'AI_LEGACY_PRESERVED'
      when value_origin not in ('source_csv', 'legacy_db_baseline') then 'NON_SOURCE_VALUE_ORIGIN'
      when canonical_sku <> sku then 'CANONICAL_SKU_MISMATCH'
      when data_type is null then 'FIELD_DEFINITION_MISSING'
      when coalesce(cardinality(source_aliases), 0) = 0 then 'SOURCE_ALIAS_MISSING'
      when data_type not in ('text', 'html', 'number', 'boolean') then 'NO_SAFE_COMPARATOR'
      when data_type in ('text', 'html') and value_text is null then 'CURRENT_SCALAR_MISSING'
      when data_type = 'number' and value_number is null then 'CURRENT_SCALAR_MISSING'
      when data_type = 'boolean'
        and value_json is null
        and value_text is null then 'CURRENT_SCALAR_MISSING'
      else null
    end as not_applicable_reason
  from base
),
identity_candidates as (
  select
    eligible.*,
    pss.id as candidate_snapshot_id,
    pss.raw_row
  from eligible
  join public.product_source_snapshots pss
    on eligible.is_applicable
   and pss.product_id = eligible.product_id
   and pss.batch_id = eligible.source_batch_id
   and pss.sku = eligible.sku
   and (
     (
       eligible.canonical_entity_type in ('simple', 'variable')
       and eligible.entity_type = 'product'
       and pss.row_type in ('simple', 'parent')
     )
     or (
       eligible.canonical_entity_type = 'variation'
       and eligible.entity_type = 'variant'
       and pss.row_type = 'variation'
     )
   )
),
verified_candidates as (
  select distinct
    identity_candidates.current_value_id,
    identity_candidates.candidate_snapshot_id
  from identity_candidates
  cross join lateral unnest(identity_candidates.source_aliases) as source_alias
  where identity_candidates.raw_row ? source_alias
    and case identity_candidates.data_type
      when 'text' then
        identity_candidates.value_text = identity_candidates.raw_row ->> source_alias
      when 'html' then
        identity_candidates.value_text = identity_candidates.raw_row ->> source_alias
      when 'number' then
        (identity_candidates.raw_row ->> source_alias)
          ~ '^[+-]?([0-9]+([.,][0-9]+)?|[.,][0-9]+)$'
        and identity_candidates.value_number =
          replace(identity_candidates.raw_row ->> source_alias, ',', '.')::numeric
      when 'boolean' then
        coalesce(
          case
            when jsonb_typeof(identity_candidates.value_json) = 'boolean'
              then identity_candidates.value_json #>> '{}'
          end,
          lower(identity_candidates.value_text)
        ) = case lower(btrim(identity_candidates.raw_row ->> source_alias))
          when '1' then 'true'
          when 'true' then 'true'
          when 'yes' then 'true'
          when 'sì' then 'true'
          when 'si' then 'true'
          when '0' then 'false'
          when 'false' then 'false'
          when 'no' then 'false'
          else null
        end
      else false
    end
),
candidate_stats as (
  select
    eligible.current_value_id,
    eligible.product_id,
    eligible.sku,
    eligible.field_key,
    eligible.source_batch_id,
    eligible.is_applicable,
    eligible.not_applicable_reason,
    count(distinct identity_candidates.candidate_snapshot_id) as identity_candidate_count,
    count(distinct verified_candidates.candidate_snapshot_id) as verified_candidate_count,
    (
      array_agg(
        distinct verified_candidates.candidate_snapshot_id
        order by verified_candidates.candidate_snapshot_id
      ) filter (where verified_candidates.candidate_snapshot_id is not null)
    )[1] as sole_verified_snapshot_id
  from eligible
  left join identity_candidates
    on identity_candidates.current_value_id = eligible.current_value_id
  left join verified_candidates
    on verified_candidates.current_value_id = eligible.current_value_id
  group by
    eligible.current_value_id,
    eligible.product_id,
    eligible.sku,
    eligible.field_key,
    eligible.source_batch_id,
    eligible.is_applicable,
    eligible.not_applicable_reason
),
classified as (
  select
    current_value_id,
    product_id,
    sku,
    field_key,
    case
      when not is_applicable then 'NOT_APPLICABLE'
      when source_batch_id is null then 'NO_MATCH'
      when verified_candidate_count = 0 then 'NO_MATCH'
      when verified_candidate_count = 1 then 'MATCH_READY'
      else 'AMBIGUOUS_SOURCE'
    end as classification,
    case
      when not is_applicable then not_applicable_reason
      when source_batch_id is null then 'SOURCE_BATCH_MISSING'
      when identity_candidate_count = 0 then 'NO_EXACT_IDENTITY_CANDIDATE'
      when verified_candidate_count = 0 then 'VALUE_NOT_VERIFIED'
      when verified_candidate_count = 1 then 'EXACT_IDENTITY_VALUE_AND_CARDINALITY'
      else 'MULTIPLE_VALUE_VERIFIED_CANDIDATES'
    end as reason,
    identity_candidate_count,
    verified_candidate_count,
    case
      when verified_candidate_count = 1 then sole_verified_snapshot_id
      else null
    end as proposed_source_snapshot_id
  from candidate_stats
)
select
  current_value_id,
  product_id,
  sku,
  field_key,
  classification,
  reason,
  identity_candidate_count,
  verified_candidate_count,
  proposed_source_snapshot_id,
  count(*) over (partition by classification) as classification_count
from classified
order by classification, sku, field_key, current_value_id;

rollback;
