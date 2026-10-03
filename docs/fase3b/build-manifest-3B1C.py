import csv,json,collections,hashlib
sf=json.load(open("sf.json"))
vsku={};prod_by_id={}
for p in sf:
  prod_by_id[p["id"].split("/")[-1]]=p
  for v in p["variants"]["nodes"]:
    if v["sku"]: vsku.setdefault(v["sku"],[]).append((p,v))
cat={}
for r in csv.reader(open("cat.csv")):
  cat[r[1]]=dict(id=r[0],sku=r[1],et=r[2],psku=r[3],sid=r[5],handle=r[6],stitle=r[7],sprice=r[8],sstat=r[9])
m=list(csv.DictReader(open("/mnt/documents/manifest-3B1B-stock20-dryrun.csv")))
ready={r["sku"]:r for r in m if r["readiness"]=="READY_FOR_SALE"}
def sp(sku):
  c=cat.get(sku,{});sid=c.get("sid") or ""
  p=prod_by_id.get(sid); v=None
  hits=vsku.get(sku,[])
  if not p and hits: p,v=hits[0]
  if p and not v:
    v=next((x for _p,x in hits if _p is p),None) or (p["variants"]["nodes"][0] if len(p["variants"]["nodes"])==1 else None)
  if not sid and p: sid=p["id"].split("/")[-1]
  return sid,p,v,len(hits)
# 165 variant-as-product
vap=[];cls=collections.Counter()
for s,r in ready.items():
  c=cat[s]
  if c["et"]!="variation" or not (c["sid"] or vsku.get(s)): continue
  sid,p,v,nh=sp(s); par=cat.get(c["psku"],{})
  psid=sp(c["psku"])[0] if c["psku"] else ""
  if nh>1 or (psid and psid==sid): k="C_DUPLICATE"
  elif not p: k="E_UNKNOWN_NEEDS_REVIEW"
  elif psid: k="A_LEGACY_STANDALONE_TO_MERGE"
  else: k="D_PARENT_MISSING"
  cls[k]+=1
  vap.append(dict(internal_product_id=c["id"],sku=s,parent_sku=c["psku"],parent_internal_id=par.get("id",""),shopify_product_id=sid,shopify_handle=(p or {}).get("handle") or c["handle"],shopify_title=(p or {}).get("title") or c["stitle"],shopify_variant_id=(v["id"].split("/")[-1] if v else ""),shopify_price=(v["price"]["amount"] if v else c["sprice"]),shopify_status=("ACTIVE_PUBLISHED" if p else (c["sstat"] or "NOT_ON_STOREFRONT")),parent_shopify_exists="yes" if psid else "no",classification=k))
vapsk={x["sku"] for x in vap}
out=[];A=collections.Counter();unres=0;noimg=[]
parent_restruct={x["parent_sku"] for x in vap}
for r in m:
  s=r["sku"];c=cat[s];sid,p,v,nh=sp(s)
  et=r["entity_type"];psid=sp(c["psku"])[0] if c["psku"] else ""
  cur = "NOT_PRESENT" if not sid else ("STANDALONE_PRODUCT" if (p and len(p["variants"]["nodes"])==1) or not p else "MULTI_VARIANT_PRODUCT")
  if sid and not p: cur="MAPPED_NOT_ON_STOREFRONT"
  tgt={"simple":"SIMPLE_PRODUCT","variable":"PARENT_PRODUCT","variation":"VARIANT_OF_"+(c["psku"] or "?")}.get(et,"NONE")
  br=r["block_reason"];stock=""
  if r["readiness"]!="READY_FOR_SALE": act="SKIP"; br=br or r["readiness"]
  elif s=="OG_152965": act="SKIP"; br="KEEP_CURRENT_SAFE_STATE"
  elif s in vapsk or (et=="variable" and s in parent_restruct): act="RESTRUCTURE_REQUIRED"; br="VARIANT_AS_PRODUCT" if s in vapsk else "CHILDREN_STANDALONE_ON_SHOPIFY"
  elif sid:
    ok=(et=="simple" and cur=="STANDALONE_PRODUCT") or (et=="variable" and cur=="MULTI_VARIANT_PRODUCT")
    act="UPDATE_EXISTING" if ok else "RESTRUCTURE_REQUIRED"
    if not ok: br="STRUCTURE_MISMATCH:"+cur
  elif et=="variation" and psid: act="RESTRUCTURE_REQUIRED"; br="PARENT_EXISTS_VARIANT_MISSING"
  else: act={"simple":"CREATE_SIMPLE","variable":"CREATE_VARIABLE_PARENT","variation":"CREATE_VARIANT"}[et]
  if act in("CREATE_SIMPLE","CREATE_VARIANT","UPDATE_EXISTING","RESTRUCTURE_REQUIRED") and et!="variable" and r["readiness"]=="READY_FOR_SALE" and s!="OG_152965": stock="20"
  if sid and not v and et!="variable": unres+=1
  if r["readiness"]=="READY_FOR_SALE" and et!="variation" and r["has_image"]!="t": noimg.append(s)
  A[act]+=1
  out.append(dict(internal_product_id=c["id"],sku=s,entity_type=et,parent_sku=c["psku"],shopify_product_id=sid,shopify_variant_id=(v["id"].split("/")[-1] if v else ""),current_shopify_structure=cur,target_shopify_structure=tgt,action=act,price=r["price"],content_ready="YES" if r["has_description"]=="t" or et=="variation" else "NO",image_ready="YES" if r["has_image"]=="t" else ("INHERIT_PARENT" if et=="variation" else "NO"),stock_target=stock,block_reason=br))
def w(f,rows):
  with open(f,"w",newline="") as h:
    W=csv.DictWriter(h,rows[0].keys());W.writeheader();W.writerows(rows)
w("/mnt/documents/manifest-3B1C-shopify-final.csv",out);w("/mnt/documents/variant-as-product-3B1C.csv",vap)
print(len(vap),dict(cls));print(dict(A));print("stock20",sum(1 for o in out if o["stock_target"]=="20"),"unres",unres,"noimg",len(noimg),noimg[:10])
mapped=[o for o in out if o["shopify_product_id"]];print("mapped",len(mapped),"with variant id",sum(1 for o in mapped if o["shopify_variant_id"]))
for f in["manifest-3B1C-shopify-final.csv","variant-as-product-3B1C.csv"]:print(f,hashlib.sha256(open("/mnt/documents/"+f,"rb").read()).hexdigest())
