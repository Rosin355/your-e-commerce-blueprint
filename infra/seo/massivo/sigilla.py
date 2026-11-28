"""Sigilla i risultati del censimento e rifiuta ricevute mancanti, duplicate o incoerenti."""
import argparse
import csv
import gzip
import hashlib
import io
import json
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--out',type=Path,required=True)
p.add_argument('--pdp',type=Path,required=True)
p.add_argument('--hops',type=Path,nargs='+',required=True)
p.add_argument('--expected-catalog-size',type=int,default=1173)
args=p.parse_args()
def rows(path):
    with path.open(newline='') as f:return list(csv.DictReader(f))
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def archive(name,data):
    (args.out/name).write_bytes(gzip.compress(data.encode(),mtime=0))
register=args.out/'registro-redirect.csv'
mapping=args.out/'mapping.json'
items=rows(register)
approved={r['old_path']:r['new_url'] for r in items if r['status']=='APPROVED'}
assert len({r['old_path'] for r in items})==len(items)
assert set(r['status'] for r in items)=={'APPROVED','REVIEW','BLOCKED'}
assert approved==json.loads(mapping.read_text())
receipts=[json.loads(s) for s in args.pdp.read_text().splitlines()]
by_gid={r['gid']:r for r in receipts}
assert len(receipts)==len(by_gid)==args.expected_catalog_size
for row in items:
    if row['status']=='APPROVED':
        q=by_gid[row['shopify_gid']]
        assert q['pass'] and q['http']==200 and not q['hop'] and q['canonical']==[row['new_url']]
        assert q['url']==q['final']==row['new_url'] and q['h1']==q['product']==[q['title']]
        assert row['qa_pdp']=='PASS' and row['woo_id'] and row['sku_concordanti'] and row['shopify_status']=='ACTIVE'
matrix=rows(Path('docs/seo/recupero-2026-11-27/matrice-prodotti.csv'))
original=defaultdict(set)
for r in matrix:
    if r['stato']=='esatto' and not r['percorso_documentato']:
        for path in filter(None,r['percorsi_gsc_da_verificare'].split('|')):
            original[path].add(r['woo_id'])
indexed={r['old_path']:r for r in items}
assert sum(len(v)==1 for v in original.values())==1048
collisioni=[p for p,ids in original.items() if len(ids)>1]
assert len(collisioni)==5 and all(indexed[p]['status']=='BLOCKED' for p in collisioni)
audit1048=Counter(indexed[p]['status'] for p,ids in original.items() if len(ids)==1)
archive('pdp.jsonl.gz',''.join(json.dumps(q,ensure_ascii=False,separators=(',',':'))+'\n' for q in sorted(receipts,key=lambda x:x['gid'])))
hops=[v for path in args.hops for v in rows(path)]
hosts=['onlinegarden.it','www.onlinegarden.it']
methods=['HEAD','GET']
expect={(m,'https://'+host+r['old_path']) for r in items for host in hosts for m in methods}
assert {(r['method'],r['url']) for r in hops}==expect and len(hops)==len(expect)
assert all(r['curl_exit']=='0' and r['status']!='000' for r in hops)
buffer=io.StringIO(newline='')
w=csv.DictWriter(buffer,fieldnames=list(hops[0]),lineterminator='\n')
w.writeheader();w.writerows(sorted(hops,key=lambda r:(r['url'],r['method'])))
archive('primi-hop.csv.gz',buffer.getvalue())
direct={host:Counter() for host in hosts}
for r in hops:
    u=urlsplit(r['url'])
    if r['status']=='301' and r['location'] and r['location']==approved.get(u.path):
        direct[u.hostname][u.path]+=1
live={host:sorted(path for path,n in direct[host].items() if n==len(methods)) for host in hosts}
release=dict(paths=len(items),approved=len(approved),status=dict(Counter(r['status'] for r in items)),
    reasons=dict(Counter(r['reason'] for r in items)),sources={k:dict(Counter(r['status'] for r in items if r['inventario']==k)) for k in sorted({r['inventario'] for r in items})},
    audit_1048=dict(audit1048),original_collisions_blocked=len(collisioni),unique_approved_destinations=len(set(approved.values())),pdp_total=len(by_gid),pdp_pass=sum(r['pass'] for r in receipts),
    first_hop_requests=len(hops),first_hop_direct=live,mapping_sha256=digest(mapping),registro_sha256=digest(register))
(args.out/'release.json').write_text(json.dumps(release,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(release,ensure_ascii=False))
