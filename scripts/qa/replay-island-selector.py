"""Offline QA only. Write a candidate CSV to stdout and diagnostics to stderr."""
import csv
import re
import sys
import unicodedata
from decimal import Decimal
from pathlib import Path

EVIDENCE = Path(__file__).resolve().parents[2] / "docs/release/evidence"
# Exact sample and Poste aliases. This is not a complete carrier coverage file.
SPECIAL = {
    ("LI", "57037"): {"portoferraio"},
    ("VE", "30126"): {"lido di venezia", "lido", "venezia lido", "pellestrina", "malamocco", "venezia"},
    ("NA", "80073"): {"capri"},
    ("NA", "80077"): {"ischia"},
    ("NA", "80079"): {"procida"},
    ("LT", "04027"): {"ponza"},
    ("LT", "04031"): {"ventotene"},
    ("FG", "71051"): {"isole tremiti", "san domino", "san nicola di tremiti"},
}
MAINLAND = {
    ("LI", "57123"): {"livorno"}, ("VE", "30171"): {"mestre"},
    ("NA", "80133"): {"napoli"}, ("LT", "04100"): {"latina"}, ("FG", "71121"): {"foggia"},
}
# Fixture market assignment for the five regional provinces actually sampled.
REGIONAL_SAMPLE = {"ME", "TP", "AG", "PA", "CA"}
ORDINARY, ISLAND = "qa-ordinary", "qa-island"


def resolve(province, zip_code, city, ordinary=MAINLAND, special=SPECIAL):
    if not isinstance(city, str) or not isinstance(zip_code, str) or not re.fullmatch(r"[0-9]{5}", zip_code):
        return None
    city = " ".join(unicodedata.normalize("NFC", city).casefold().split())
    key = province, zip_code
    ordinary_match = city in ordinary.get(key, ())
    special_match = city in special.get(key, ())
    if ordinary_match == special_match:
        return None
    return ISLAND if special_match else ORDINARY


def select(market, country, province, zip_code, city, offers, groups=1):
    """Select among already priced (identity, cents) tuples; None means BLOCKED in QA."""
    if market == "foreign" and country and country != "IT":
        return offers
    if country != "IT":
        return None
    if market == "regional":
        return offers
    if market != "italy" or groups != 1:
        return None
    if sorted(handle for handle, _ in offers) != sorted((ORDINARY, ISLAND)):
        return None
    wanted = resolve(province, zip_code, city)
    if wanted is None:
        return None
    return [offer for offer in offers if offer[0] == wanted]


def check_exceptions():
    offers = [(ORDINARY, 890), (ISLAND, 960)]
    cases = [
        ("two names at one CAP", "VE", "30126", "Pellestrina", ISLAND),
        ("case and whitespace", "VE", "30126", "  LiDo   DI Venezia ", ISLAND),
        ("postal locality", "VE", "30126", "Venezia Lido", ISLAND),
        ("municipality plus exact CAP", "VE", "30126", "Venezia", ISLAND),
        ("other postal locality", "VE", "30126", "Malamocco", ISLAND),
        ("postal island alias", "FG", "71051", "San Domino", ISLAND),
        ("leading zero", "LT", "04027", "Ponza", ISLAND),
        ("mainland in same province", "VE", "30171", "Mestre", ORDINARY),
        ("conflicting city", "VE", "30126", "Mestre", None),
        ("unmapped municipality", "VE", "30171", "Venezia", None),
        ("partial wallet CAP", "VE", "301", "Pellestrina", None),
        ("wallet missing city", "VE", "30126", "", None),
        ("wallet null city", "VE", "30126", None, None),
        ("wallet null CAP", "VE", None, "Pellestrina", None),
        ("missing province", "", "30126", "Pellestrina", None),
        ("wrong province", "LI", "30126", "Pellestrina", None),
        ("uncovered hamlet", "LI", "57034", "Seccheto", None),
        ("missing leading zero", "LT", "4027", "Ponza", None),
    ]
    for name, province, zip_code, city, expected in cases:
        assert resolve(province, zip_code, city) == expected, name
    # Synthetic cross-zone CAP and exact collision; no claim that this occurs in 30126.
    key = ("ZZ", "00001")
    ordinary, special = {key: {"a", "c"}}, {key: {"b", "c"}}
    for city, expected in [("a", ORDINARY), ("b", ISLAND), ("c", None), ("", None)]:
        assert resolve(*key, city, ordinary, special) == expected
    address = ("italy", "IT", "LI", "57037", "Portoferraio")
    variants = [
        (offers[::-1], 1, [offers[1]]), ([(ISLAND, 1750), (ORDINARY, 1750)], 1, [(ISLAND, 1750)]),
        ([], 1, None), ([offers[0]], 1, None), ([offers[1]], 1, None),
        (offers + [offers[1]], 1, None), (offers + [("express", 1200)], 1, None),
        (offers, 2, None), (offers, 0, None),
    ]
    for supplied, groups, expected in variants:
        assert select(*address, supplied, groups) == expected
    foreign = [("international", 1999), ("pickup", 0)]
    assert select("foreign", "FR", "", "", "", foreign) == foreign
    assert select("regional", "IT", "PA", "90133", "Palermo", [offers[1]]) == [offers[1]]
    assert select("unknown", "IT", "", "", "", offers) is None
    assert select("italy", "FR", "LI", "57037", "Portoferraio", offers) is None
    assert select("italy", None, "LI", "57037", "Portoferraio", offers) is None
    assert select("foreign", "IT", "LI", "57037", "Portoferraio", foreign) is None
    return len(cases) + 4 + len(variants) + 6


def main():
    if not __debug__:
        raise SystemExit("Run without Python -O so all QA assertions remain active")
    with (EVIDENCE / "shipping-islands-2026-11-22.csv").open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    # Independently observed, hosted checkout controls supply both hypothetical prices.
    # Read cents exactly; avoid binary floats and never copy expected_cents into an offer.
    with (EVIDENCE / "checkout-islands-2026-11-22.csv").open(encoding="utf-8", newline="") as file:
        controls = {(r["city"], r["basket"]): (int(Decimal(r["subtotal_eur"]) * 100),
                    int(Decimal(r["shipping_eur"]) * 100)) for r in csv.DictReader(file)
                    if r["standard_options"] == "1"}
    assertions = check_exceptions()
    writer = csv.DictWriter(sys.stdout, lineterminator="\n", fieldnames=[
        *rows[0], "baseline_cents", "market_fixture", "candidate_handle",
    ])
    writer.writeheader()
    baseline_ok = candidate_ok = 0
    for row in rows:
        basket = row["basket"]
        subtotal = int(row["subtotal_cents"])
        expected = int(row["expected_cents"])
        before = int(row["quoted_cents"])
        assert row["currency"] == "EUR" and int(row["option_count"]) == 1
        if row["province"] in REGIONAL_SAMPLE:
            market, offers = "regional", [("existing-standard", before)]
        else:
            market = "italy"
            offers = []
            for handle, control_city in [(ORDINARY, "Livorno"), (ISLAND, "Lipari")]:
                control_subtotal, price = controls[control_city, basket]
                assert control_subtotal == subtotal
                offers.append((handle, price))
        kept = select(market, "IT", row["province"], row["zip"], row["city"], offers)
        assert kept is not None and len(kept) == 1
        handle, after = kept[0]
        writer.writerow({**row, "baseline_cents": before, "market_fixture": market,
                         "candidate_handle": handle, "quoted_cents": after, "option_count": len(kept)})
        baseline_ok += before == expected
        candidate_ok += after == expected
    print(f"Baseline {baseline_ok}/{len(rows)}; candidate {candidate_ok}/{len(rows)}; "
          f"additional cases {assertions}", file=sys.stderr)
    assert len(rows) == 69 and baseline_ok == 42 and candidate_ok == 69


if __name__ == "__main__":
    main()
