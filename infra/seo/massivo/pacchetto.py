"""Impacchetta deterministicamente i sei lotti. Non accede a Cloudflare."""
import argparse
import hashlib
import json
import subprocess
import tempfile
import zipfile
from pathlib import Path

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('output',type=Path)
args=p.parse_args()
docs=Path('docs/seo/recupero-massivo')
stages=('pilot','50','250','500','1000','full')
with tempfile.TemporaryDirectory() as tmp:
    files={}
    for stage in stages:
        target=Path(tmp)/stage
        subprocess.run(['node','infra/seo/build-rollout.mjs',stage,str(target)],check=True)
        for file in sorted(target.iterdir()):
            files[stage+'/'+file.name]=file.read_bytes()
    files['rollback/pilota-originale.mjs']=(docs/'pilota-originale.mjs').read_bytes()
    if hashlib.sha256(files['rollback/pilota-originale.mjs']).hexdigest()!='54686b0b7c0cf55e37afed0c8faff34a156901e794f13834f6c5811c9d4f8c14':
        raise ValueError('Impronta del pilota originale diversa dal verbale')
    files['OPERAZIONI.md']=(docs/'OPERAZIONI.md').read_bytes()
    files['release.json']=(docs/'release.json').read_bytes()
    files['SHA256SUMS']=''.join(hashlib.sha256(data).hexdigest()+'  '+name+'\n' for name,data in sorted(files.items())).encode()
    with zipfile.ZipFile(args.output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,11,28,0,0,0))
            info.external_attr=0o100644<<16
            z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
print(hashlib.sha256(args.output.read_bytes()).hexdigest(),args.output)
