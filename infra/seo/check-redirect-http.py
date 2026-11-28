"""From repository root: python3 infra/seo/check-redirect-http.py [--expect-active].
Requires curl >= 7.84. Public GET/HEAD only. Output CSV, one line per first response. Never follows redirects.
"""
import argparse
import csv
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--expect-active", action="store_true",
                    help="Exit nonzero unless all 16 redirects pass, for a fully approved rollout.")
parser.add_argument("--pilot", action="store_true", help="Check only the first approved legacy path on both hosts.")
args = parser.parse_args()
rules = json.loads(Path("infra/seo/redirect-candidates.json").read_text())["rules"]
if args.pilot:
    rules = rules[:1]
with open("docs/seo/LEGACY-URL-REDIRECT-MAP.csv", newline="") as stream:
    historical = list(csv.DictReader(stream))
tasks = []
for rule in rules:
    path, target = rule["oldPath"], rule["newUrl"]
    queries = {"", "?utm_source=collaudo&utm_medium=seo&attribute_dimensioni=test"}
    rows = [r for r in historical if urlsplit(r["old_url"]).path == path and r["confidence"] == "HIGH"]
    assert rows and all(r["new_url"] == target for r in rows)
    queries.update("?" + q for r in rows if (q := urlsplit(r["old_url"]).query))
    for method in ("GET", "HEAD"):
        tasks.append((method, target, "200", ""))
        tasks.append((method, target + "?utm_source=collaudo&utm_medium=seo", "200", ""))
        for host in ("onlinegarden.it", "www.onlinegarden.it"):
            for scheme in ("http", "https"):
                for query in (queries if scheme == "https" else [""]):
                    retained = "?utm_source=collaudo&utm_medium=seo" if "utm_source=" in query else ""
                    tasks.append((method, scheme + "://" + host + path + query, "301", target + retained))

def read(task):
    method, url, expected, destination = task
    cmd = ["curl", "--disable", "--silent", "--max-time", "15", "--output", "/dev/null",
           "--write-out", "%{http_code}\\t%header{location}"]
    if method == "HEAD":
        cmd.append("--head")
    result = subprocess.run(cmd + [url], capture_output=True, text=True)
    status, _, location = result.stdout.partition("\t")
    passed = not result.returncode and status == expected and location == destination
    return method, url, status, location, result.returncode, expected, destination, passed

writer = csv.writer(sys.stdout, lineterminator="\n")
writer.writerow(("method", "url", "status", "location", "curl_exit", "expected_after", "target_after", "matches_after"))
with ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(read, sorted(set(tasks))))
writer.writerows(results)
sys.exit(int(any(r[4] or r[2] == "000" or (args.expect_active and not r[-1]) for r in results)))
