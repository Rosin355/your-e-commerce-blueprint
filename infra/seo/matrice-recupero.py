"""Dalla radice repo: export Woo, inventario, snapshot prodotti Admin JSON, directory output."""
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

export, review, catalog, out = map(Path, sys.argv[1:])
def read(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))

def write(name, fields, rows):
    with (out/name).open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fields)
        writer.writeheader()
        writer.writerows(rows)

woo = read(export)
inventory = read(review)
parents = {r['ID']:r for r in woo if r['Tipo'] in ('simple','variable')}
assert len(inventory) == len(parents) and set(parents) == {r['woo_product_id'] for r in inventory}
owners = defaultdict(set)
skus = defaultdict(set)
for wid, row in parents.items():
    if row['SKU']:
        owners[row['SKU']].add(wid)
        skus[wid].add(row['SKU'])
orphans = 0
for row in woo:
    if row['Tipo'] == 'variation':
        ref = row['Genitore']
        ids = {ref[3:]} & parents.keys() if ref.startswith('id:') else owners[ref]
        if len(ids) == 1 and row['SKU']:
            skus[next(iter(ids))].add(row['SKU'])
        else:
            orphans += 1
by_sku, by_name, source_sku = defaultdict(set), defaultdict(set), defaultdict(set)
for wid, keys in skus.items():
    for sku in keys:
        source_sku[sku].add(wid)
products = json.loads(catalog.read_text())
by_gid = {p['id']:p for p in products}
assert len(by_gid) == len(products) and all(not p['variants']['pageInfo']['hasNextPage'] for p in products)
for p in products:
    by_name[p['title'].strip().casefold()].add(p['id'])
    for v in p['variants']['nodes']:
        if v['sku']:
            by_sku[v['sku']].add(p['id'])
historical = read(Path('docs/seo/LEGACY-URL-REDIRECT-MAP.csv'))
paths = defaultdict(set)
for row in historical:
    path = urlsplit(row['old_url']).path
    paths[path.rstrip('/').split('/')[-1]].add(path)
curated = {r['wooId']:r for r in json.loads(Path('infra/seo/redirect-candidates.json').read_text())['rules']}
matches = []
for row in inventory:
    wid = row['woo_product_id']
    parent = parents[wid]
    assert row['woo_sku'] == parent['SKU'] and row['woo_type'] == parent['Tipo']
    hits = {sku for sku in skus[wid] if by_sku[sku]}
    candidates = set().union(*(by_sku[s] for s in hits))
    if hits:
        state = 'esatto' if len(candidates)==1 and all(len(source_sku[s])==1 for s in hits) else 'ambiguo'
    else:
        candidates = by_name[parent['Nome'].strip().casefold()]
        state = 'probabile' if len(candidates)==1 else 'ambiguo' if candidates else 'assente'
    proof = curated.get(wid)
    if proof:
        assert candidates == {proof['shopifyGid']} and state == 'esatto'
    matches.append(dict(woo_id=wid,sku=parent['SKU'],tipo=parent['Tipo'],stato=state,
                        sku_concordanti='|'.join(sorted(hits)),gid_candidati='|'.join(sorted(candidates)),
                        percorso_documentato=proof['oldPath'] if proof else '',
                        percorsi_gsc_da_verificare='' if proof else '|'.join(sorted(paths[row['old_slug_candidate_unverified']]))))
# Uno stesso prodotto Shopify condiviso da più padri richiede revisione.
reverse = Counter(r['gid_candidati'] for r in matches if r['stato']=='esatto')
for r in matches:
    if r['stato']=='esatto' and reverse[r['gid_candidati']]>1:
        r['stato']='ambiguo'
assert all(r['stato']=='esatto' for r in matches if r['percorso_documentato'])
write('matrice-prodotti.csv',matches[0].keys(),matches)
print(dict(stati=Counter(r['stato'] for r in matches), varianti_senza_legame=orphans,
           sku_woo_condivisi=sum(len(x)>1 for x in source_sku.values()),
           sku_shopify_condivisi=sum(len(x)>1 for x in by_sku.values()),
           prodotti_con_indizio_url=sum(bool(r['percorsi_gsc_da_verificare']) for r in matches)))
