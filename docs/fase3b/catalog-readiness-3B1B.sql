with v as (select product_id,
 max(value_text) filter (where field_key='title') title,
 max(coalesce(value_text,value_json#>>'{}')) filter (where field_key='description') descr,
 max(value_text) filter (where field_key='optimized_description') opt,
 max(coalesce(value_number, nullif(regexp_replace(coalesce(value_text,value_json#>>'{}'),'[^0-9.,]','','g'),'')::text::numeric)) filter (where field_key='price') price,
 bool_or(field_key='image_urls' and coalesce(jsonb_array_length(case when jsonb_typeof(value_json)='array' then value_json end),0)>0 or (field_key='image_urls' and length(coalesce(value_text,''))>5)) has_img,
 bool_or(publish_blocked and field_key in ('title','description','price','sku','entity_type','parent_sku')) blocked, bool_or(publish_blocked) opt_blocked
 from product_current_values group by 1),
p as (select p.*, pp.sku parent_sku, pp.entity_type parent_type,
 count(*) over (partition by p.sku_norm) dup,
 (select count(*) from products c where c.parent_product_id=p.id) nchild
 from products p left join products pp on pp.id=p.parent_product_id),
b as (select p.id,p.sku,p.entity_type,p.parent_sku,p.parent_product_id,v.title,v.price,
 length(trim(regexp_replace(coalesce(v.descr,''),'<[^>]+>','','g')))>=30 has_desc,
 length(coalesce(v.opt,''))>30 has_opt, coalesce(v.has_img,false) has_img,
 s.shopify_product_id, s.shopify_sync_status,
 array_remove(array[
  case when not p.is_active then 'INACTIVE' end,
  case when p.sku is null or p.sku='' then 'MISSING_SKU' end,
  case when p.dup>1 then 'DUPLICATE_SKU' end,
  case when coalesce(v.blocked,false) then 'PUBLISH_BLOCKED' end,
  case when p.entity_type not in ('simple','variable','variation') then 'INVALID_ENTITY_TYPE' end,
  case when p.entity_type='variation' and (p.parent_product_id is null or p.parent_type<>'variable') then 'INVALID_PARENT' end,
  case when p.entity_type='variable' and p.nchild=0 then 'STRUCTURAL_CONFLICT' end,
  case when p.sku in ('OG_891874','OG_758263') or p.parent_sku in ('OG_891874','OG_758263') then 'STRUCTURAL_CONFLICT' end,
  case when p.entity_type<>'variable' and coalesce(v.price,0)<=0 then 'MISSING_PRICE' end,
  case when p.entity_type='variable' and not exists(select 1 from products c join product_current_values cv on cv.product_id=c.id and cv.field_key='price' where c.parent_product_id=p.id and coalesce(cv.value_number,0)>0) then 'MISSING_PRICE' end,
  case when coalesce(v.title,'')='' then 'MISSING_TITLE' end
 ],null) hard
 from p join v on v.product_id=p.id left join product_sync_csv_products s on s.sku=p.sku),
d as (select b.*, (select bb.has_desc from b bb where bb.id=b.parent_product_id) parent_desc from b),
r as (select d.*, (d.has_desc or (d.entity_type='variation' and coalesce(d.parent_desc,false))) desc_ok from d),
f as (select r.*, case
 when hard && array['INVALID_PARENT','STRUCTURAL_CONFLICT','DUPLICATE_SKU','INVALID_ENTITY_TYPE'] then 'STRUCTURAL_REVIEW'
 when hard && array['INACTIVE','MISSING_SKU','MISSING_PRICE','MISSING_TITLE'] then 'NOT_READY'
 when cardinality(hard)>0 or not desc_ok then 'NEEDS_REVIEW' else 'READY_FOR_SALE' end readiness,
 array_to_string(hard || case when not desc_ok then array['MISSING_DESCRIPTION'] else '{}' end,'|') block_reason from r)
select id internal_product_id,sku,entity_type,parent_sku,title,price,desc_ok has_description,has_img has_image,
 shopify_product_id, null::text shopify_variant_id, coalesce(shopify_sync_status, case when shopify_product_id is null then 'NOT_PRESENT' end) current_shopify_status,
 readiness, block_reason, case when readiness='READY_FOR_SALE' then 'YES' else 'NO' end publication_target,
 case when readiness='READY_FOR_SALE' and entity_type<>'variable' then 20 end stock_target
from f order by sku
