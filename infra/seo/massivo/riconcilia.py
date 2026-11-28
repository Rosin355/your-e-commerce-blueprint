"""Genera il registro GSC da export Woo originali, catalogo Admin e ricevute PDP.
Nessuna rete. Eseguire dalla radice della PR. Gli export privati rimangono fuori da Git.
"""
import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path('docs/seo/recupero-2026-11-27')
EVIDENCE = Path('docs/seo/evidence')
PILOT = '/prodotto/rose/rosa-jasmina-rampicante/'
PUBLIC = 'https://onlinegarden.it'
PATH_RE = re.compile(r'/prodotto/(?:[a-z0-9-]+/)+')

def csv_rows(path):
    with path.open(encoding='utf-8-sig',newline='') as f:
        return list(csv.DictReader(f))

def write_csv(path, rows):
    with path.open('w',encoding='utf-8',newline='') as f:
        w = csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n')
        w.writeheader()
        w.writerows(rows)

def slug(s):
    s = unicodedata.normalize('NFKD',s.casefold()).encode('ascii','ignore').decode()
    return re.sub('[^a-z0-9]+','-',s).strip('-')

def categories(value):
    # Le due forme abbreviate frutto e succulente compaiono nel fascicolo iniziale.
    aliases = {'piante-da-frutto':'da-frutto','piante-grasse-e-succulente':'grasse-e-succulente',
               'piante-acquatiche':'acquatiche','piante-carnivore':'carnivore'}
    for hierarchy in value.split(','):
        yield '/'.join(aliases.get(t,t) for t in map(slug,hierarchy.split('>')))

def image_keys(url):
    image = urlsplit(url)
    if image.hostname not in ('onlinegarden.it','www.onlinegarden.it') or not image.path.startswith('/wp-content/uploads/'):
        return set()
    name = Path(unquote(image.path))
    if name.suffix.lower() not in {'.jpg','.jpeg','.png','.webp','.gif'}:
        return set()
    stem = slug(name.stem)
    keys = {stem}
    while True:
        base = re.sub(r'-(?:[0-9]{2,5}x[0-9]{2,5}|e[0-9]{10,}|scaled|rotated|[1-9][0-9]?)$','',stem)
        if base == stem:
            return keys
        keys.add(base)
        stem = base

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--woo',type=Path,nargs='+',required=True)
    parser.add_argument('--inventory',type=Path,required=True)
    parser.add_argument('--catalog',type=Path,required=True)
    parser.add_argument('--pdp',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--archives',type=Path,required=True,help='Ricevute generate da archivi.py')
    args=parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    matrix={r['woo_id']:r for r in csv_rows(ROOT/'matrice-prodotti.csv')}
    old=defaultdict(list)
    for row in csv_rows(Path('docs/seo/LEGACY-URL-REDIRECT-MAP.csv')):
        u=urlsplit(row['old_url'])
        if u.hostname not in ('www.onlinegarden.it','onlinegarden.it') or not u.path.startswith('/prodotto/'):
            raise ValueError('Inventario GSC non valido')
        old[u.path].append(row)
    inventory={r['woo_product_id']:r for r in csv_rows(args.inventory)}
    if set(matrix)!=set(inventory):
        raise ValueError('Inventario Woo divergente')
    catalog={p['id']:p for p in json.loads(args.catalog.read_text())}
    sku_to_gid=defaultdict(set)
    for gid,p in catalog.items():
        if p['variants']['pageInfo']['hasNextPage']:
            raise ValueError('Snapshot varianti parziale')
        for v in p['variants']['nodes']:
            if v['sku']: sku_to_gid[v['sku']].add(gid)
    receipts={}
    for line in args.pdp.read_text().splitlines():
        q=json.loads(line)
        if q['gid'] in receipts:raise ValueError('Ricevuta PDP duplicata')
        receipts[q['gid']]=q
    curated={r['oldPath']:r for r in json.loads(Path('infra/seo/redirect-candidates.json').read_text())['rules']}
    prior={r['path']:r for r in json.loads((EVIDENCE/'legacy-source-identity.json').read_text())}
    archives={r['old_path']:r for r in csv_rows(args.archives)}
    sku_to_woo=defaultdict(set)
    for wid,r in matrix.items():
        for sku in set(r['sku_concordanti'].split('|')+[r['sku']])-{''}:
            sku_to_woo[sku].add(wid)
    paths=set(old)|set(archives)
    asset_owners=defaultdict(set)
    asset_sources=defaultdict(list)
    owner_names=defaultdict(set)
    images=defaultdict(lambda:defaultdict(list))
    woo=defaultdict(list)
    for wid,r in inventory.items():
        owner_names[r['old_slug_candidate_unverified']].add(wid)
    for source in sorted(args.woo):
        for r in csv_rows(source):
            if r['Tipo']=='variation':continue
            wid=r['ID']
            woo[wid].append((source.name,r))
            owner_names[slug(r['Nome'])].add(wid)
            for image in (r['Immagine'] or '').split(','):
                image=image.strip()
                if image_keys(image):
                    asset_path=unquote(urlsplit(image).path)
                    asset_owners[asset_path].add(wid)
                    asset_sources[(asset_path,wid)].append((source.name,r,image))
                for key in image_keys(image):
                    images[key][wid].append((source.name,r,image.strip()))
    if not set(matrix)<=set(woo):
        raise ValueError('Esportazione originale incompleta')
    rows=[]
    for path in sorted(paths):
        observed=old.get(path,[])
        archive=archives.get(path,{})
        matched_assets=[]
        for link in filter(None,archive.get('images','').split('|')):
            asset=urlsplit(link)
            if asset.hostname not in ('onlinegarden.it','www.onlinegarden.it'):continue
            asset_path=unquote(asset.path)
            # A shared gallery image cannot identify a parent.
            if len(asset_owners[asset_path])==1:
                matched_assets.append((next(iter(asset_owners[asset_path])),asset_path,link))
        sitemap_ids={wid for wid,_,_ in matched_assets}
        captured=archive.get('html_woo_id','')
        archived_skus=set(filter(None,archive.get('html_skus','').split('|')))
        card_ids=set(filter(None,archive.get('category_ids','').split('|')))
        card_skus=set(filter(None,archive.get('category_skus','').split('|')))
        slug_key=path.rstrip('/').split('/')[-1]
        category='/'.join(path.strip('/').split('/')[1:-1])
        hinted=owner_names[slug_key]
        evidenced=images[slug_key]
        sku_owners=set().union(*(sku_to_woo[s] for s in archived_skus|card_skus))
        ids=(card_ids & matrix.keys()) | sku_owners | hinted | set(evidenced) | sitemap_ids | ({captured} if captured in matrix else set())
        if path in prior:ids.add(str(prior[path]['woo_id']))
        wids=sorted(ids)
        wid=wids[0] if len(wids)==1 else ''
        r=matrix.get(wid,{})
        gid=r.get('gid_candidati','') if r.get('stato')=='esatto' else ''
        prod=catalog.get(gid,{})
        url=PUBLIC+'/products/'+prod['handle'] if prod else ''
        q=receipts.get(gid,{})
        if q and (q['url']!=url or q['title']!=prod.get('title')):raise ValueError('Ricevuta Shopify divergente')
        cite_skus=r.get('sku_concordanti','').split('|')
        sku_ok=bool(gid and cite_skus and all(sku_to_gid.get(s)=={gid} for s in cite_skus))
        source_name=image_src=woo_cat=proof_url=''
        valid_images=[e for e in evidenced.get(wid,[]) if category in categories(e[1]['Categorie']) and
                      e[1]['SKU']==r.get('sku') and (wid in hinted)]
        if valid_images:
            source_name,record,image_src=sorted(valid_images,key=lambda x:(x[0],x[2]))[0]
            woo_cat=record['Categorie']
        sitemap_proof=False
        for ident,asset_path,link in sorted(matched_assets):
            compatible=[e for e in asset_sources[asset_path,ident] if category in categories(e[1]['Categorie']) and e[1]['SKU']==r.get('sku')]
            if ident==wid and compatible:
                source_name,record,image_src=compatible[0]
                woo_cat=record['Categorie'];proof_url=archive['sitemaps']
                sitemap_proof=True
                break
        # A full archived PDP must identify the current original Woo parent, not
        # a related card or a legacy post ID recycled on an earlier installation.
        sku_agrees=not archived_skus or archived_skus <= ({r.get('sku','')}|set(cite_skus))
        page_proof=bool(captured and captured==wid and sku_agrees)
        different_id=bool(captured and captured!=wid)
        card_proof=bool(wid and card_ids=={wid} and card_skus and card_skus <= ({r.get('sku','')} | set(cite_skus)))
        historical=bool(valid_images or sitemap_proof or page_proof or card_proof)
        if card_proof:proof_url=archive['category_pages']
        if page_proof or card_proof:
            if page_proof:proof_url=archive['html']
            if not source_name:
                source_name,record=next((name,record) for name,record in woo[wid] if record['SKU']==r['sku'])
                woo_cat=record['Categorie']
        curated_ok=bool(path in curated and wid and curated[path]['wooId']==wid and curated[path]['shopifyGid']==gid)
        if curated_ok:
            evidence=prior[path]; historical=True
            if not source_name:
                source_name=evidence.get('source_file') or 'legacy-source-identity.json'
                image_src='|'.join(evidence.get('source_images',[]))
                woo_cat=evidence['source_categories']
        state='BLOCKED'
        if not PATH_RE.fullmatch(path):reason='PERCORSO_FUORI_CONTRATTO'
        elif len(ids)>1:reason='COLLISIONE_IDENTITA_WOO'
        elif not wid and (captured or card_ids):reason='ID_STORICO_SENZA_SUCCESSORE_VERIFICATO'
        elif not wid:state,reason='REVIEW','NESSUN_LEGAME_URL_ID'
        elif not gid:reason='IDENTITA_SHOPIFY_'+r.get('stato','ASSENTE').upper()
        elif path in curated and not curated_ok:reason='FASCICOLO_ORIGINALE_DIVERGENTE'
        elif not sku_ok:reason='SKU_O_GID_DIVERGENTE'
        elif different_id or (captured and not sku_agrees) or (card_ids and not card_proof):reason='IDENTITA_ARCHIVIATA_DIVERGENTE'
        elif prod.get('status')!='ACTIVE':reason='PRODOTTO_NON_ATTIVO'
        elif not q.get('pass'):reason='PDP_NON_VERIFICATA'
        elif not historical:state,reason='REVIEW','PERMALINK_NON_CORROBORATO'
        else:
            state='APPROVED'
            reason='FASCICOLO_16' if curated_ok else 'PDP_STORICA_ID' if page_proof else 'CATEGORIA_ARCHIVIATA_ID_SKU' if card_proof else 'SITEMAP_IMMAGINE_ESATTA' if sitemap_proof else 'CATEGORIA_E_MEDIA_WOO_UNIVOCA'
        rows.append(dict(old_path=path,old_url=(next((x['old_url'] for x in observed if not urlsplit(x['old_url']).query),observed[0]['old_url']) if observed else archive['original_url']),
            inventario='GSC' if observed else 'ARCHIVIO_AGGIUNTIVO',
            woo_id=wid,woo_id_archiviato=captured,sku_archiviati='|'.join(sorted(archived_skus)),pdp_archiviata=archive.get('html',''),categoria_archiviata=archive.get('category_pages',''),id_categoria_archiviata='|'.join(sorted(card_ids)),sku_categoria_archiviata='|'.join(sorted(card_skus)),candidati_woo='|'.join(wids),sku=r.get('sku',''),sku_concordanti=r.get('sku_concordanti',''),
            sku_candidati='|'.join(sorted({matrix[i]['sku'] for i in wids if i in matrix and matrix[i]['sku']})),
            shopify_gid=gid,shopify_status=prod.get('status',''),gid_candidati='|'.join(sorted({g for i in wids for g in matrix.get(i,{}).get('gid_candidati','').split('|') if g})),
            new_url=url,gsc_urls=len(observed),gsc_clicks=sum(int(x['clicks']) for x in observed),
            gsc_impressions=sum(int(x['impressions']) for x in observed),export_woo=source_name,
            categoria_woo=woo_cat,immagine_woo=image_src,prova_archivio=proof_url,percorso_archiviato=archive.get('cdx','') or archive.get('sitemaps','') or archive.get('category_pages','') or archive.get('html',''),
            qa_pdp='PASS' if q.get('pass') else 'FAIL' if q else '',status=state,reason=reason))
    approved=[r for r in rows if r['status']=='APPROVED']
    by_gid=defaultdict(list)
    for row in approved:
        by_gid[row['shopify_gid']].append(row)
    for group in by_gid.values():
        if len(group)<2:continue
        for row in group:
            if len({v['woo_id'] for v in group})>1:
                row.update(status='BLOCKED',reason='COLLISIONE_DESTINAZIONE')
            elif row['reason']=='CATEGORIA_E_MEDIA_WOO_UNIVOCA':
                row.update(status='REVIEW',reason='ALIAS_SENZA_PROVA_DIRETTA')
    write_csv(args.out/'registro-redirect.csv',rows)
    rules={r['old_path']:r['new_url'] for r in rows if r['status']=='APPROVED'}
    if PILOT not in rules:raise ValueError('Pilota privo di prove correnti')
    (args.out/'mapping.json').write_text(json.dumps(rules,indent=2,ensure_ascii=False)+'\n')
    print(dict(Counter(r['status'] for r in rows)));print(dict(Counter(r['reason'] for r in rows)))

if __name__=='__main__':main()
