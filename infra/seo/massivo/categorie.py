"""Legge le schede prodotto nelle categorie storiche collegate dal sito, inclusa la paginazione osservata."""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urlencode

def original(url,kind):
    u=urlsplit(url or '')
    if u.hostname not in {'www.onlinegarden.it','onlinegarden.it'} or u.scheme not in {'http','https'} or u.query or u.fragment:return ''
    if not re.fullmatch('/'+kind+r'/(?:[a-z0-9-]+/)+',u.path):return ''
    return u.path

class Category(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=set();self.cards=[];self.canonical=[];self.depth=0;self.card=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);cl=(a.get('class') or '').split();url=a.get('href','')
        if tag=='link' and 'canonical' in (a.get('rel') or '').split():self.canonical.append(url)
        if tag=='a' and original(url,'categoria'):self.links.add(url)
        if tag=='div':
            self.depth+=1
            if 'product-grid-item' in cl and 'type-product' in cl:
                ident=a.get('data-id','')
                if ident.isdigit() and ('post-'+ident) in cl:
                    self.card=dict(depth=self.depth,wid=ident,urls=set(),ids=set(),skus=set())
        if tag=='a' and self.card:
            if 'product-image-link' in cl and original(url,'prodotto'):self.card['urls'].add(url)
            if a.get('data-product_id'):
                self.card['ids'].add(a['data-product_id'])
                if a.get('data-product_sku'):self.card['skus'].add(a['data-product_sku'])
    def handle_endtag(self,tag):
        if tag!='div':return
        c=self.card
        if c and c['depth']==self.depth:
            if len(c['urls'])==1 and c['ids']=={c['wid']} and len(c['skus'])==1:
                self.cards.append(dict(url=next(iter(c['urls'])),woo_id=c['wid'],sku=next(iter(c['skus']))))
            self.card=None
        self.depth=max(0,self.depth-1)

def collect(url,directory,recheck):
    file=directory/(hashlib.sha256(url.encode()).hexdigest()+'.json')
    lookup='https://web.archive.org/web/20260301id_/'+url
    if file.exists():
        saved=json.loads(file.read_text())
        if not recheck or saved['sha256'] or saved.get('availability_checked'):return saved
        api='https://archive.org/wayback/available?'+urlencode({'url':url,'timestamp':'20260301'})
        res=subprocess.run(['curl','--disable','--silent','--max-time','12',api],capture_output=True,text=True)
        try:closest=json.loads(res.stdout).get('archived_snapshots',{}).get('closest',{})
        except ValueError:closest={}
        m=re.fullmatch(r'https?://web\.archive\.org/web/(\d{14})/(https?://.+)',closest.get('url',''))
        if not m or m[1]>='20261101' or original(m[2],'categoria')!=original(url,'categoria'):
            saved['availability_checked']=True
            file.write_text(json.dumps(saved));return saved
        lookup='https://web.archive.org/web/'+m[1]+'id_/'+m[2]
    with tempfile.NamedTemporaryFile() as temp:
        cmd=['curl','--disable','--silent','--location','--connect-timeout','5','--max-time','16','--max-filesize','3500000','--max-redirs','3','--output',temp.name,'--write-out','%{http_code} %{url_effective}',lookup]
        result=subprocess.run(cmd,capture_output=True,text=True)
        status,_,capture=result.stdout.partition(' ')
        row=dict(url=url,availability_checked=recheck,http=status,capture=capture,sha256='',cards=[],pages=[])
        source=re.fullmatch(r'https://web\.archive\.org/web/(\d{14})id_/(https?://.+)',capture)
        if not result.returncode and status=='200' and source and source[1]<'20261101' and original(source[2],'categoria')==original(url,'categoria'):
            raw=Path(temp.name).read_bytes();parser=Category();parser.feed(raw.decode('utf-8',errors='replace'))
            path=original(url,'categoria')
            if len(parser.canonical)==1 and original(parser.canonical[0],'categoria')==path:
                section=re.sub(r'/page/\d+/$','/',path)
                row.update(sha256=hashlib.sha256(raw).hexdigest(),cards=parser.cards,
                           pages=sorted(u for u in parser.links if re.fullmatch(re.escape(section)+r'page/\d+/',original(u,'categoria'))))
    file.write_text(json.dumps(row,ensure_ascii=False))
    return row

if __name__=='__main__':
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--seed-html',type=Path,nargs='+',required=True)
    a.add_argument('--out',type=Path,required=True)
    a.add_argument('--retry-availability',action='store_true')
    args=a.parse_args();args.out.mkdir(exist_ok=True,parents=True)
    urls=set();seen=set()
    for f in args.seed_html:
        parser=Category();parser.feed(f.read_text(errors='replace'));urls.update(parser.links)
    while urls-seen:
        todo=sorted(urls-seen);seen.update(todo)
        with ThreadPoolExecutor(3) as pool:
            for row in pool.map(lambda u:collect(u,args.out,args.retry_availability),todo):
                urls.update(row['pages'])
    print('Pagine categoria osservate',len(seen))
