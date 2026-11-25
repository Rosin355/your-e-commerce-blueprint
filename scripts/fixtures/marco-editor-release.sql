INSERT INTO public.product_field_definitions(key,label,editable,visible,publishable,editor_type,shopify_mapping)
VALUES ('short_intro','Introduzione',true,true,true,'textarea','{"type":"metafield","namespace":"custom","key":"short_intro"}'),
       ('short_description','Sintesi',true,true,true,'textarea','{}'),
       ('tags','Tag',true,true,true,'multiselect','{"type":"core","field":"tags"}'),
       ('seo_title','SEO',true,true,true,'text','{}'),('seo_description','SEO meta',true,true,true,'textarea','{}');
INSERT INTO public.admin_draft_ai_field_opt_ins(actor,field_key,approved_reference)
SELECT '00000000-0000-4000-8000-000000000001'::uuid, unnest(ARRAY['seo_title','seo_description','tags']), 'SYNTHETIC-QA';
UPDATE public.admin_catalog_capabilities SET enabled=true, capabilities=ARRAY['edit','sync','drafts','images','prices'] WHERE user_id='00000000-0000-4000-8000-000000000001';
