import json,csv,pathlib,datetime,collections
# Offline only: build a review proposal from recorded read-only evidence.
p=pathlib.Path(__file__).resolve().parents[1];e=p/'docs/seo/evidence'
load=lambda name:json.loads((e/name).read_text())
identity={x['path']:x for x in load('legacy-source-identity.json')}
current={x['sku']:x for x in load('current-source-mappings.json')['rows']}
shop={x['id']:x for x in load('shopify-mapped-products.json')['data']['nodes']}
public={x['id']:x for x in load('public-catalog-snapshot.json')['products']}
dests={x['url']:x for x in load('destinations-2026-11-10.json')['responses']}
http={x['url']:x for x in load('http-2026-11-10.json')['responses']}
paths=load('legacy-priorities.json');pathmap={x['path']:x for x in paths}
mappings={};rules=[]
for path,source in identity.items():
 row=current.get(source['sku']);gid=row.get('shopify_product_id') if row else None
 if gid and not gid.startswith('gid:'):gid='gid://shopify/Product/'+gid
 product=shop.get(gid);pub=public.get(gid)
 sku_matches=product and any(x['sku']==source['sku'] or x['sku'].startswith(source['sku']+'-') for x in product['variants']['nodes'])
 url='https://onlinegarden.it/products/'+product['handle'] if product else ''
 valid=bool(product and pub and product['status']=='ACTIVE' and pub['handle']==product['handle'] and sku_matches and dests.get(url,{}).get('status')==200)
 confidence='HIGH' if valid else 'MEDIUM' if product else 'UNRESOLVED'
 reason='Woo ID + SKU lineage + original category/image slug + live Shopify GID/variant SKU + public Storefront + HTTP 200' if valid else 'Variant SKU conflict: owner decision' if product and not sku_matches else 'No verified current GID; do not guess destination'
 mappings[path]=dict(**source,new_url=url,shopify_gid=gid,current_variant_skus=[x['sku'] for x in product['variants']['nodes']] if product else [],confidence=confidence,reason=reason,destination_status=dests.get(url,{}).get('status'))
 if valid:rules.append(dict(oldPath=path,newUrl=url,confidence='HIGH',destinationStatus=200,qaStatus='PASS',reviewApproved=False,sourceSku=source['sku'],wooId=source['woo_id'],shopifyGid=gid))
(e/'mapping-evidence.json').write_text(json.dumps(dict(checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),method='Technical confidence only; original CSV does not include permalink/post_name. GSC path is corroborated by source category/image basename, then joined by SKU and GID; owner review required.',mappings=list(mappings.values())),indent=2)+'\n')
(p/'infra/seo/redirect-candidates.json').write_text(json.dumps(dict(enabled=False,approvalReference=None,rules=rules),indent=2)+'\n')
aggregate={}
from urllib.parse import urlsplit
for period in ['pages_oct','pages_nov']:
 for row in load('gsc-2026-11-10.json')[period]['data']:
  v=aggregate.setdefault(row['page'],dict(clicks=0,impressions=0));v['clicks']+=row['clicks'];v['impressions']+=row['impressions']
fields='old_url old_status new_url destination_status product_match clicks impressions priority confidence decision qa_status'.split()
with (p/'docs/seo/LEGACY-URL-REDIRECT-MAP.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for url,stats in sorted(aggregate.items(),key=lambda x:(-x[1]['clicks'],-x[1]['impressions'],x[0])):
  path=urlsplit(url).path;m=mappings.get(path,{});tested=http.get(url);current_product=m.get('new_url','')
  decision='PROPOSE_301_REVIEW_REQUIRED' if m.get('confidence')=='HIGH' else 'OWNER_DECISION' if m else 'IDENTITY_REQUIRED'
  w.writerow(dict(old_url=url,old_status=tested.get('first_status',tested['status']) if tested else 'NOT_TESTED',new_url=current_product,destination_status=m.get('destination_status') or '',product_match=('Woo:'+m['woo_id']+'; SKU:'+m['sku']+'; '+(m['shopify_gid'] or 'GID_UNVERIFIED')) if m else '',clicks=stats['clicks'],impressions=stats['impressions'],priority='P1' if stats['clicks']>0 else 'P2' if stats['impressions']>=100 else 'P3',confidence=m.get('confidence','UNRESOLVED'),decision=decision,qa_status='DESTINATION_PASS_REVIEW_PENDING' if m.get('confidence')=='HIGH' else 'PENDING_IDENTITY'))
print(json.dumps(dict(raw_urls=len(aggregate),paths=len(paths),technical_candidates=len(rules),mapped_needing_owner=[dict(path=x['path'],reason=x['reason']) for x in mappings.values() if x['confidence']!='HIGH'],priorities=[dict(path=x['path'],oct_clicks=x['oct_clicks'],nov_clicks=x['nov_clicks'],oct_impressions=x['oct_impressions'],nov_impressions=x['nov_impressions']) for x in paths[:6]]),indent=2))
