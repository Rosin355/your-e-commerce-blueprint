"""Compare a sanitized checkout/quote export to the frozen 23-destination QA contract.
Usage: python3 scripts/qa/check-island-quotes.py [candidate.csv]
Exit 0 = matches the sample, 1 = prices/options differ, 2 = incomplete or invalid data.
"""
import argparse
import csv
import sys
from pathlib import Path

BASELINE = Path(__file__).resolve().parents[2] / "docs/release/evidence/shipping-islands-2026-11-22.csv"


def read_rows(path):
    with path.open(newline="", encoding="utf-8") as stream:
        rows = {}
        for row in csv.DictReader(stream):
            key = row["province"], row["zip"], row["city"], row["basket"]
            if key in rows:
                raise ValueError(f"Caso duplicato: {key}")
            rows[key] = row
        return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("candidate", nargs="?", type=Path, default=BASELINE)
    args = parser.parse_args()
    expected, actual = read_rows(BASELINE), read_rows(args.candidate)
    if len(expected) != 69 or actual.keys() != expected.keys():
        raise ValueError("La matrice deve contenere i 69 casi di riferimento, ciascuno una volta")
    failures = 0
    for key, reference in expected.items():
        row = actual[key]
        if row["currency"] != "EUR" or int(row["subtotal_cents"]) != int(reference["subtotal_cents"]):
            raise ValueError(f"Valuta o subtotale non confrontabile: {key}")
        if int(row["option_count"]) != 1 or int(row["quoted_cents"]) != int(reference["expected_cents"]):
            failures += 1
            print(f"{key}: opzioni {row['option_count']}, centesimi {row['quoted_cents']}, attesi {reference['expected_cents']}")
    print(f"{len(expected) - failures}/{len(expected)} corrispondenti, {failures} difformi")
    return int(failures != 0)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Matrice non verificabile: {exc}", file=sys.stderr)
        sys.exit(2)
