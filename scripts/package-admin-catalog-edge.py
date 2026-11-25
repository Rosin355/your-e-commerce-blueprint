"""Build and verify a restorable product-admin-api source bundle at a Git revision."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def run(*args, cwd=None):
    return subprocess.check_output(args, cwd=cwd)


def build(ref, destination):
    commit = run("git", "rev-parse", "--verify", ref + "^{commit}").decode().strip()
    paths = ["supabase/functions", "supabase/config.toml", "ci/deno-ci.lock"]
    source = run("git", "archive", commit, *paths)
    with tempfile.TemporaryDirectory() as temp:
        tree = Path(temp) / "source"
        with tarfile.open(fileobj=io.BytesIO(source)) as archive:
            archive.extractall(tree, filter="data")
        script = Path("scripts/test-edge-function-packaging.mjs")
        (tree / "scripts").mkdir()
        (tree / script).write_bytes(script.read_bytes())
        graph = json.loads(run("node", "--input-type=module", "--eval",
            "import {auditFunctionGraph} from './scripts/test-edge-function-packaging.mjs';"
            "console.log(JSON.stringify(auditFunctionGraph('product-admin-api').modules))", cwd=tree))
        files = {name: (tree / name).read_bytes() for name in sorted(graph + paths[1:])}
        archive_path = destination / ("product-admin-api-" + commit + ".tar.gz")
        with archive_path.open("wb") as out, gzip.GzipFile(filename="", mode="wb", fileobj=out, mtime=0) as stream:
            with tarfile.open(mode="w|", fileobj=stream) as archive:
                for name, data in files.items():
                    info = tarfile.TarInfo(name)
                    info.mode, info.size = 0o644, len(data)
                    archive.addfile(info, io.BytesIO(data))
        restored = Path(temp) / "restored"
        with tarfile.open(archive_path) as archive:
            archive.extractall(restored, filter="data")
        if any((restored / name).read_bytes() != data for name, data in files.items()):
            raise ValueError("Archivio estratto diverso dalla revisione Git")
        subprocess.run(["deno", "check", "--no-config", "--no-npm", "--frozen", "--lock=ci/deno-ci.lock",
                        "supabase/functions/product-admin-api/index.ts"], cwd=restored, check=True)
        manifest = {"commit": commit, "slug": "product-admin-api", "modules": len(graph),
                    "sha256": digest(archive_path.read_bytes()), "files": {k: digest(v) for k, v in files.items()}}
        archive_path.with_suffix(".json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(commit, len(graph), manifest["sha256"], flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("revision")
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    args.destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    build(args.revision, args.destination)
