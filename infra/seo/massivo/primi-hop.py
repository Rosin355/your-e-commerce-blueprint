"""Rileva i primi hop del censimento GSC o verifica il contratto di un lotto generato.
Uso: python3 primi-hop.py baseline ricevuta.csv | stage ricevuta.csv --map mapping.json
Lavora dalla radice del repository. Richiede curl con %header e %output non necessario.
"""
import argparse
import csv
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode', choices=['baseline','stage'])
parser.add_argument('output', type=Path)
parser.add_argument('--map', type=Path)
parser.add_argument('--registry',type=Path,default=Path('docs/seo/recupero-massivo/registro-redirect.csv'))
parser.add_argument('--only-extra',action='store_true')
parser.add_argument('--paths-file',type=Path,help='Sottoinsieme della baseline, un percorso osservato per riga')
args = parser.parse_args()
source = Path('docs/seo/LEGACY-URL-REDIRECT-MAP.csv')
with source.open(newline='') as f:
    paths = sorted({urlsplit(r['old_url']).path for r in csv.DictReader(f)})
if args.registry.exists():
    with args.registry.open(newline='') as f:
        registry=list(csv.DictReader(f))
    paths=sorted(r['old_path'] for r in registry if not args.only_extra or r['inventario']=='ARCHIVIO_AGGIUNTIVO')
elif args.only_extra or args.mode=='stage':
    parser.error('Registro completo richiesto')
if args.paths_file:
    selected=set(args.paths_file.read_text().splitlines())
    if args.mode!='baseline' or not selected or selected-set(paths):parser.error('Sottoinsieme non valido')
    paths=sorted(selected)
mapping = json.loads(args.map.read_text()) if args.map else {}
if args.mode == 'stage' and (not mapping or set(mapping)-set(paths) or any(mapping.get(r['old_path'],r['new_url'])!=r['new_url'] or (r['old_path'] in mapping and r['status']!='APPROVED') for r in registry)):
    parser.error('Mappa del lotto assente o estranea al censimento')
targets = []
for path in (sorted(mapping) if args.mode == 'stage' else paths):
    if not path.startswith('/prodotto/') or any(c in path for c in '\r\n"?#\\'):
        raise ValueError('Percorso GSC non valido')
    for host in ['onlinegarden.it','www.onlinegarden.it']:
        for scheme,query,retained in ([('https','','')] if args.mode=='baseline' else [
                ('https','',''),('http','',''),('https','?utm_source=qa&utm_source=b&attribute_dimensioni=test','?utm_source=qa&utm_source=b')]):
            targets.append((scheme+'://'+host+path+query,mapping.get(path,'')+retained))
expect = dict(targets)
terminal=set(mapping.values()) if args.mode=='stage' else set()
for destination in terminal:
    if not re.fullmatch(r'https://onlinegarden\.it/products/[a-z0-9]+(?:-[a-z0-9]+)*',destination):
        parser.error('Destinazione esterna o non canonica')
    expect[destination]=''
negative=set()
if args.mode=='stage':
    for host in ('onlinegarden.it','www.onlinegarden.it'):
        # Sul www il solo redirect al medesimo path apex è ammesso per l’origine.
        for path in ('/','/collections/all','/products/rosa-jasmina-rampicante','/prodotto/controllo-inesistente-301/'):
            negative.add('https://'+host+path)
        for r in registry:
            if r['old_path'] not in mapping:
                negative.add('https://'+host+r['old_path'])
    negative-=terminal
    expect.update({url:'' for url in negative})
start = datetime.now(timezone.utc).isoformat(timespec='seconds')
def read(method, urls, parallel):
    config = ''.join('url = '+json.dumps(u)+'\noutput = "/dev/null"\n' for u in urls)
    command = ['curl','--disable','--globoff','--silent','--parallel','--parallel-max',str(parallel),
               '--connect-timeout','6','--max-time','14','--write-out','%{url_effective}\t%{http_code}\t%header{location}\t%header{server}\t%{exitcode}\n']
    if method=='HEAD':
        command.append('--head')
    out = subprocess.run(command+['--config','-'],input=config,text=True,capture_output=True)
    rows = {}
    for line in out.stdout.splitlines():
        u,status,loc,server,err = line.split('\t')
        if u not in expect or u in rows:
            raise ValueError('Ricevuta inattesa o duplicata')
        rows[u] = [method,u,status,loc,server,err]
    return rows

if args.output.exists():
    parser.error('Scegliere un file di ricevuta nuovo')
failed = 0
with args.output.open('x',newline='') as f:
    writer = csv.writer(f,lineterminator='\n')
    writer.writerow(['method','url','status','location','server','curl_exit','run_utc'])
    for method in ['HEAD','GET']:
        urls = list(expect)
        for offset in range(0,len(urls),100):
            group = urls[offset:offset+100]
            rows = read(method,group,4)
            missing = [u for u in group if u not in rows or rows[u][-1]!='0']
            if missing:
                rows.update(read(method,missing,2))
            for u in group:
                row = rows.get(u,[method,u,'000','','','99'])
                bad=row[-1]!='0'
                if args.mode=='stage' and not bad:
                    if u in terminal:
                        bad=row[2]!='200' or bool(row[3])
                    elif u in negative:
                        parsed=urlsplit(u)
                        normalised='https://onlinegarden.it'+parsed.path
                        bad=not ((row[2] in {'200','404','410'} and not row[3]) or
                                 (parsed.hostname=='www.onlinegarden.it' and row[2] in {'301','302','307','308'} and row[3]==normalised))
                    else:
                        bad=row[2]!='301' or row[3]!=expect[u] or row[4].lower()!='cloudflare'
                failed+=int(bad)
                writer.writerow(row+[start])
            f.flush()
print(len(expect)*2,'richieste;',failed,'errori o differenze')
raise SystemExit(bool(failed))
