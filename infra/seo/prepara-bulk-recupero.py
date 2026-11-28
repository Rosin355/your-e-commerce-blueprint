"""Genera solo il CSV offline dal fascicolo verificato; nessun accesso di rete."""
import csv
import json
from pathlib import Path
from urllib.parse import urlsplit

root = Path('docs/seo/recupero-2026-11-27')
rules = json.loads(Path('infra/seo/redirect-candidates.json').read_text())['rules']
pages = {r['woo']:r for r in json.loads((root/'schede-pubbliche.json').read_text())}
with (root/'matrice-prodotti.csv').open() as stream:
    exact = {r['woo_id']:r for r in csv.DictReader(stream) if r['stato']=='esatto'}
with Path('docs/seo/LEGACY-URL-REDIRECT-MAP.csv').open() as stream:
    known = {(urlsplit(r['old_url']).path,r['new_url']) for r in csv.DictReader(stream) if r['confidence']=='HIGH'}
with (root/'http.csv').open() as stream:
    direct = {(r['method'],r['url']) for r in csv.DictReader(stream)
              if r['status']=='200' and not r['location'] and r['curl_exit']=='0'}
sources = set()
rows = []
for rule in rules:
    wid, path, target = rule['wooId'], rule['oldPath'], rule['newUrl']
    product, page = exact[wid], pages[wid]
    if not (product['gid_candidati']==rule['shopifyGid'] and product['percorso_documentato']==path
            and (path,target) in known and path.startswith('/prodotto/') and '?' not in path
            and target.startswith('https://onlinegarden.it/products/') and not urlsplit(target).query
            and page['pass'] and page['status']==200 and page['final']==page['canonical']==target
            and all((method,target) in direct for method in ('GET','HEAD'))):
        raise ValueError('Evidenza incompleta per Woo ' + wid)
    for host in ('onlinegarden.it','www.onlinegarden.it'):
        source = host+path
        if source in sources:
            raise ValueError('Sorgente duplicata')
        sources.add(source)
        rows.append((source,target,'301','FALSE','FALSE','FALSE','FALSE'))
with (root/'cloudflare-bulk.csv').open('w', newline='') as stream:
    csv.writer(stream).writerows(rows)
print(f'{len(rows)} righe univoche per {len(rules)} percorsi')
