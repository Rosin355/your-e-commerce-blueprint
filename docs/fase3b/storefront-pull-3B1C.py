import requests,json
U="https://ecom-blueprint-gen-6ud1s.myshopify.com/api/2025-07/graphql.json"
H={"X-Shopify-Storefront-Access-Token":"<STOREFRONT_PUBLIC_TOKEN from src/lib/shopify.ts>","Content-Type":"application/json"}
Q="""query($c:String){products(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title availableForSale variants(first:100){nodes{id sku title availableForSale price{amount currencyCode}}}}}}"""
out=[];c=None
while True:
  r=requests.post(U,headers=H,json={"query":Q,"variables":{"c":c}}).json()
  d=r["data"]["products"];out+=d["nodes"]
  if not d["pageInfo"]["hasNextPage"]:break
  c=d["pageInfo"]["endCursor"]
json.dump(out,open("sf.json","w"));print(len(out),sum(len(p["variants"]["nodes"]) for p in out))
