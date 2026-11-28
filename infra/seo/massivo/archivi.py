"""Esporta ricevute pubbliche Wayback. Conserva soltanto loc, immagini e identità prodotto.
Input: CDX timestamp,original,statuscode; cartella delle sitemap con receipts.json;
opzionalmente ricevute HTML prodotte con --fetch usando una lista di percorsi osservati.
"""
import argparse
import csv
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

HOSTS={'onlinegarden.it','www.onlinegarden.it'}
def product_url(url):
    u=urlsplit(url)
    return u.path if u.hostname in HOSTS and u.scheme in ('http','https') and re.fullmatch(r'/prodotto/(?:[a-z0-9-]+/)+',u.path) else ''

class ProductHTML(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=set();self.canon=[];self.ld=[];self.in_json=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='body' and 'single-product' in (a.get('class') or '').split():
            self.ids.update(re.findall(r'\bpostid-(\d+)\b',a['class']))
        if tag=='link' and 'canonical' in (a.get('rel') or '').lower().split():
            self.canon.append(a.get('href',''))
        if tag=='script' and a.get('type')=='application/ld+json':self.in_json=True
    def handle_data(self,content):
        if self.in_json:
            try:self.ld.append(json.loads(content))
            except ValueError:pass
    def handle_endtag(self,tag):
        if tag=='script':self.in_json=False

def product_skus(values,path):
    out=set()
    for v in values:
        if isinstance(v,list):out.update(product_skus(v,path))
        if not isinstance(v,dict):continue
        if '@graph' in v:out.update(product_skus(v['@graph'],path))
        if v.get('@type')=='Product' and (not v.get('url') or product_url(v['url'])==path) and v.get('sku'):
            out.add(str(v['sku']))
    return sorted(out)

def download(path,target,directory,exact=''):
    key=hashlib.sha256(path.encode()).hexdigest()
    receipt=directory/(key+'.json')
    if receipt.exists():return
    body=directory/(key+'.html')
    url=re.sub(r'/web/(\d{14})/',r'/web/\1id_/',exact) if exact else 'https://web.archive.org/web/20260401id_/'+target
    cmd=['curl','--disable','--silent','--show-error','--location','--max-time','33','--max-redirs','3','--max-filesize','2500000',
         '--write-out','%{http_code}\t%{url_effective}','--output',str(body),url]
    result=subprocess.run(cmd,capture_output=True,text=True)
    code,_,final=result.stdout.partition('\t')
    row={'old_path':path,'http':code,'source_url':final,'woo_id':'','skus':[]}
    identity=re.fullmatch(r'https://web\.archive\.org/web/(\d{14})id_/(https?://.+)',final)
    if not result.returncode and code=='200' and identity and identity[1]<'20261101' and product_url(identity[2])==path:
        parser=ProductHTML();raw=body.read_bytes();parser.feed(raw.decode('utf-8',errors='replace'))
        if len(parser.ids)==1 and len(parser.canon)==1 and product_url(parser.canon[0])==path:
            row.update(woo_id=next(iter(parser.ids)),skus=product_skus(parser.ld,path),sha256=hashlib.sha256(raw).hexdigest())
    body.unlink(missing_ok=True)
    receipt.write_text(json.dumps(row))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['cdx','sitemaps','html','out']:p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--fetch',type=Path,help='File con un percorso già osservato per riga')
    p.add_argument('--categories',type=Path,help='Ricevute categorie.py')
    p.add_argument('--exact-cdx',action='store_true',help='Usa la cattura CDX puntuale se disponibile')
    args=p.parse_args();rows=defaultdict(lambda:dict(original_url='',cdx='',sitemaps=[],images=set(),html='',html_woo_id='',html_skus=[],html_sha256='',category_pages=set(),category_ids=set(),category_skus=set()))
    cdx=json.loads(args.cdx.read_text());assert cdx[0]==['timestamp','original','statuscode']
    for ts,url,status in cdx[1:]:
        path=product_url(url)
        if path and status=='200' and not urlsplit(url).query and ts<'20261101':
            rows[path].update(original_url=url,cdx='https://web.archive.org/web/'+ts+'/'+url)
    for entry in json.loads((args.sitemaps/'receipts.json').read_text()):
        if not entry.get('paths'):continue
        name=Path(urlsplit(entry['source']).path).name
        raw=(args.sitemaps/name).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=entry['sha256']:raise ValueError('Impronta sitemap diversa')
        capture=entry['result'].split(' ',1)[1]
        if not re.fullmatch(r'https://web\.archive\.org/web/\d{14}id_/https?://(?:www\.)?onlinegarden\.it/product-sitemap\d+\.xml',capture):raise ValueError('Cattura sitemap non valida')
        for item in ET.fromstring(raw).findall('{*}url'):
            url=item.findtext('{*}loc');path=product_url(url)
            if not path:continue
            row=rows[path];row['original_url']=url;row['sitemaps'].append(capture)
            row['images'].update(i.text for i in item.findall('{*}image/{*}loc') if i.text)
    if args.categories:
        for file in sorted(args.categories.glob('*.json')):
            c=json.loads(file.read_text())
            if not c['sha256']:continue
            for card in c['cards']:
                path=product_url(card['url'])
                if not path:continue
                row=rows[path]
                if not row['original_url']:row['original_url']=card['url']
                row['category_pages'].add(c['capture'])
                row['category_ids'].add(card['woo_id'])
                row['category_skus'].add(card['sku'])
    args.html.mkdir(exist_ok=True,parents=True)
    if args.fetch:
        tasks=[s.strip() for s in args.fetch.read_text().splitlines() if s.strip()]
        gsc={}
        with Path('docs/seo/LEGACY-URL-REDIRECT-MAP.csv').open(newline='') as f:
            for row in csv.DictReader(f):
                u=row['old_url'].split('?',1)[0]
                if product_url(u):gsc[product_url(u)]=u
        if set(tasks)-set(rows)-set(gsc):raise ValueError('URL non osservato')
        with ThreadPoolExecutor(4) as pool:list(pool.map(lambda k:download(k,rows[k]['original_url'] if k in rows else gsc[k],args.html,rows.get(k,{}).get('cdx','') if args.exact_cdx else ''),tasks))
    for f in args.html.glob('*.json'):
        h=json.loads(f.read_text())
        if h['woo_id'] and product_url(h['source_url'].split('id_/',1)[-1])==h['old_path']:
            if not rows[h['old_path']]['original_url']:rows[h['old_path']]['original_url']=h['source_url'].split('id_/',1)[1]
            rows[h['old_path']].update(html=h['source_url'],html_woo_id=h['woo_id'],html_skus=h['skus'],html_sha256=h['sha256'])
    with args.out.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['old_path',*next(iter(rows.values()))],lineterminator='\n');w.writeheader()
        for path,v in sorted(rows.items()):
            w.writerow(dict(old_path=path,**{k:'|'.join(sorted(set(a))) if isinstance(a,(list,set)) else a for k,a in v.items()}))
if __name__=='__main__':main()
