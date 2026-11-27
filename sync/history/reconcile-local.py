"""Riconciliazione offline. L'output contiene identificativi personali pseudonimi."""
import csv
import hashlib
import hmac
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path


def reconcile(source, shop, key):
    index = defaultdict(list)
    gids = set()
    for gid, token in shop:
        if gid in gids or not gid.startswith('gid://shopify/Customer/'):
            raise ValueError('Snapshot Shopify incoerente')
        gids.add(gid)
        if token:
            index[token].append(gid)
    projected = []
    for row in source:
        email = row['user_email'].strip().lower()
        digest = hmac.new(key, email.encode(), hashlib.sha256).hexdigest() if email else ''
        projected.append((row['ID'], row['roles'] == 'customer', int(row['orders']), digest))
    if len({row[0] for row in projected}) != len(projected):
        raise ValueError('ID Woo duplicato')
    frequencies = Counter(row[3] for row in projected if row[3])
    result = []
    for woo, eligible, count, token in projected:
        if not woo.isdigit() or count < 0:
            raise ValueError('Identificativo o conteggio non valido')
        candidates = index.get(token, [])
        duplicate = frequencies[token] > 1 or len(candidates) > 1
        state = ('escluso' if not eligible else 'duplicato' if duplicate else
                 'email_da_verificare' if candidates else 'da_verificare' if not token else
                 'senza_corrispondenza_email')
        result.append(dict(woo_id=woo, acquisti_woo=count, stato=state,
                           candidato_shopify=candidates[0] if state == 'email_da_verificare' else None,
                           shopify_verificato=None, duplicato=duplicate))
    return dict(woocommerce=result, shopify=sorted(gids))


def main(raw, workspace, out):
    for folder in (workspace, out):
        if folder.is_symlink() or folder.stat().st_uid != os.getuid() or folder.stat().st_mode & 0o077:
            raise ValueError('Directory privata richiesta')
    with raw.open(encoding='utf-8-sig', newline='') as stream:
        data = reconcile(csv.DictReader(stream), json.loads((workspace/'shop.json').read_text()),
                         (workspace/'key').read_text().strip().encode())
    os.umask(0o077)
    with (out/'riconciliazione.json').open('x') as target:
        json.dump(data, target, separators=(',', ':'))
    rows = data['woocommerce']
    print(json.dumps(dict(woo=len(rows), shopify=len(data['shopify']),
                          stati=Counter(r['stato'] for r in rows),
                          con_acquisti=sum(r['acquisti_woo'] > 0 for r in rows),
                          customer_con_acquisti=sum(r['acquisti_woo'] > 0 and r['stato'] != 'escluso' for r in rows),
                          totale_contatori=sum(r['acquisti_woo'] for r in rows))))


if __name__ == '__main__':
    main(*map(Path, sys.argv[1:]))
