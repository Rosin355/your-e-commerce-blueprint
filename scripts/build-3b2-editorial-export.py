#!/usr/bin/env python3
"""3B.2 deterministic editorial export (owner-approved rules).

Reads 3B.1C manifest + live DB (read-only) and writes a PRIVATE content
export + classification. No AI, no semantic rewriting. Output must never be
committed (contains catalogue content); write it under /tmp or /mnt/documents.

Usage: build-3b2-editorial-export.py <3B1C.csv> <out_content.json> <out_classification.csv>
"""
import csv, html, json, os, re, subprocess, sys, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor

DENIED = {"OG_393883", "OG_152965", "OG_891874", "OG_758263"}
IMG_PREFIX = "://www.onlinegarden.it/wp-content/uploads/"
BAD_MEDIA = re.compile(r"(generated|placeholder|/ai[-_/]|ai-gen)", re.I)


def root(s):
    return re.sub(r"[-_]\d+$", "", s.upper())


def denied(s):
    s = s.upper()
    return s in DENIED or root(s) in DENIED or re.match(r"^TEST([-_]|$)", s)


def slug(title):
    t = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", "-", t.lower())
    return re.sub(r"-+", "-", t).strip("-")


BLOCK = re.compile(r"<(p|ul|ol|h[1-6]|div|table|li)\b", re.I)


def desc_html(raw):
    t = raw.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\r\n", "\n").strip()
    if BLOCK.search(t):
        return t
    paras = [p.strip() for p in re.split(r"\n\s*\n", t) if p.strip()]
    return "".join("<p>" + p.replace("\n", "<br>") + "</p>" for p in paras)


def option_value(suffix):
    v = re.sub(r"\s*:\s*", " ", suffix.strip())
    return re.sub(r"\s+", " ", v).strip()


def db_rows():
    q = """select coalesce(json_agg(r),'[]') from (
      select p.sku, p.id, v.field_key k,
        coalesce(v.value_text, v.value_json::text, v.value_number::text) val,
        v.value_origin o, v.publish_blocked b
      from products p join product_current_values v on v.product_id=p.id
      where v.field_key in ('title','description','image_urls','price','parent_sku')) r"""
    out = subprocess.run(["psql", os.environ["SUPABASE_DB_URL"], "-At", "-c", q],
                         check=True, capture_output=True, text=True).stdout
    data = {}
    for r in json.loads(out):
        data.setdefault(r["sku"], {"id": r["id"]})[r["k"]] = r
    q2 = "select coalesce(json_agg(sku),'[]') from product_sync_csv_products where coalesce(shopify_product_id,'')<>''"
    mapped = set(json.loads(subprocess.run(["psql", os.environ["SUPABASE_DB_URL"], "-At", "-c", q2],
                                          check=True, capture_output=True, text=True).stdout))
    return data, mapped


def check_img(url):
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "OG-3B2-check"})
        with urllib.request.urlopen(req, timeout=20) as r:
            ok = r.status == 200 and r.headers.get("Content-Type", "").startswith("image/")
            final = r.geturl()
            return ok and final.split("?")[0] == url
    except Exception:
        return False


def ok_field(f):
    return f and f["o"] == "legacy_db_baseline" and not f["b"] and (f["val"] or "").strip()


def main(manifest, out_json, out_csv):
    rows = list(csv.DictReader(open(manifest, encoding="utf-8")))
    data, mapped = db_rows()
    kids = {}
    for r in rows:
        if r["action"] == "CREATE_VARIANT":
            kids.setdefault(r["parent_sku"], []).append(r)
    cands, cls = [], []
    for r in rows:
        if r["action"] != "CREATE_VARIABLE_PARENT":
            continue
        sku = r["sku"]
        def mark(c, why):
            cls.append({"parent_sku": sku, "classification": c, "reason": why})
        if denied(sku) or r["block_reason"]:
            mark("SKIPPED_STRUCTURAL", "denylist/test/block_reason"); continue
        d = data.get(sku, {})
        ch = kids.get(sku, [])
        if not ch or any(denied(c["sku"]) or c["block_reason"] for c in ch):
            mark("SKIPPED_STRUCTURAL", "no children or denied child"); continue
        if r["shopify_product_id"] or sku in mapped or any(
                c["shopify_variant_id"] or c["shopify_product_id"] or c["sku"] in mapped for c in ch):
            mark("SKIPPED_EXISTING_MAPPING", "shopify mapping present"); continue
        if not ok_field(d.get("title")) or not ok_field(d.get("description")):
            mark("SKIPPED_CONTENT", "title/description not ORIGINAL"); continue
        title = d["title"]["val"].strip()
        dh = desc_html(d["description"]["val"])
        if len(re.sub(r"<[^>]+>", "", dh).strip()) < 20:
            mark("SKIPPED_CONTENT", "description too short"); continue
        handle = slug(title)
        if not handle:
            mark("SKIPPED_CONTENT", "empty handle"); continue
        variants, bad = [], None
        for c in ch:
            cd = data.get(c["sku"], {})
            ct = cd.get("title")
            if not ok_field(ct):
                bad = "variant title not ORIGINAL"; break
            pfx = title + " - "
            if not ct["val"].startswith(pfx):
                bad = "suffix not derivable"; break
            ov = option_value(ct["val"][len(pfx):])
            if not ov:
                bad = "empty suffix"; break
            price = c["price"]
            if not re.match(r"^\d+(\.\d{1,2})?$", price or "") or float(price) <= 0:
                bad = "missing price"; break
            variants.append({"sku": c["sku"], "internalProductId": c["internal_product_id"],
                             "optionValues": [{"name": "Formato", "value": ov}], "price": price})
        if bad:
            mark("SKIPPED_CONTENT" if "price" in bad else "SKIPPED_AMBIGUOUS_OPTIONS", bad); continue
        if len({v["optionValues"][0]["value"] for v in variants}) != len(variants):
            mark("SKIPPED_AMBIGUOUS_OPTIONS", "duplicate option values"); continue
        img = d.get("image_urls")
        try:
            urls = json.loads(img["val"]) if ok_field(img) else []
        except Exception:
            urls = []
        url = urls[0] if urls and isinstance(urls[0], str) else ""
        if IMG_PREFIX not in url or BAD_MEDIA.search(url) or not re.match(r"^https?://", url):
            mark("SKIPPED_MEDIA", "no original wp-content image"); continue
        https = "https" + url[url.index("://"):]
        cands.append((sku, d["id"], title, dh, handle, variants, https))
    with ThreadPoolExecutor(16) as ex:
        res = list(ex.map(lambda c: check_img(c[6]), cands))
    products, seen = [], set()
    for c, ok in zip(cands, res):
        sku, pid, title, dh, handle, variants, https = c
        if not ok:
            cls.append({"parent_sku": sku, "classification": "SKIPPED_MEDIA", "reason": "https check failed"}); continue
        if handle in seen:
            cls.append({"parent_sku": sku, "classification": "SKIPPED_AMBIGUOUS_OPTIONS", "reason": "duplicate handle"}); continue
        seen.add(handle)
        cls.append({"parent_sku": sku, "classification": "SAFE_CREATE", "reason": ""})
        products.append({"sku": sku, "internalProductId": pid, "title": title, "descriptionHtml": dh,
                         "descriptionSource": "ORIGINAL", "handle": handle, "optionNames": ["Formato"],
                         "publishBlockedFields": [], "publicationIntent": "CREATE_DRAFT",
                         "media": [{"originalSource": https, "alt": title, "approved": True}]})
        for v in variants:
            products.append({"sku": v["sku"], "internalProductId": v["internalProductId"],
                             "optionValues": v["optionValues"]})
    with open(out_json, "w") as f:
        json.dump({"products": products}, f, ensure_ascii=False)
    os.chmod(out_json, 0o600)
    with open(out_csv, "w", newline="") as f:
        w = csv.DictWriter(f, ["parent_sku", "classification", "reason"]); w.writeheader(); w.writerows(cls)
    from collections import Counter
    print(json.dumps(Counter(x["classification"] for x in cls)))


if __name__ == "__main__":
    main(*sys.argv[1:4])
