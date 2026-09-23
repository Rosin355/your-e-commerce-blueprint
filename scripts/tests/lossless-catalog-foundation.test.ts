import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readCsvFile, readCsvHeaders, writeCsvFile } from "../../sync/lib/csv-utils.mjs";
import { fieldForRawColumn, PROTECTED_FIELD_KEYS, WORDPRESS_RAW_COLUMNS } from "../../src/catalog/lossless/fieldRegistry.ts";
import { compareWithLegacy, decideIdentity, MASTER_SOURCE_FILE, resolveField, resolveProduct } from "../../src/catalog/lossless/sourceResolver.ts";
import type { SourceSnapshot } from "../../src/catalog/lossless/types.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function snapshot(sourceFile: string, row: Record<string, string>, rowNumber = 2): SourceSnapshot {
  return {
    sourceFile,
    sourceRowNumber: rowNumber,
    sourceHash: `${sourceFile}:${rowNumber}`,
    sourceSku: row.SKU?.trim() || null,
    sourceParentReference: row.Genitore?.trim() || null,
    sourceType: row.Tipo?.trim() || null,
    rawRow: { ...row },
  };
}

const verticalFile = "wc-product-export-27-7-2026-1785163338872.csv";

test("1. raw_row conserva la riga completa senza rinominare colonne", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lossless-raw-row-"));
  try {
    const file = path.join(tmpDir, MASTER_SOURCE_FILE);
    const fixture = Object.fromEntries(WORDPRESS_RAW_COLUMNS.map((header) => [header, header === "SKU" ? "TEST-001" : `valore:${header}`]));
    writeCsvFile(file, [fixture], WORDPRESS_RAW_COLUMNS);
    const headers = readCsvHeaders(file);
    const row = readCsvFile(file)[0];
    const rawRow = Object.fromEntries(headers.map((header) => [header, row[header]]));
    assert.deepEqual(Object.keys(rawRow), headers);
    assert.equal("__rowNumber" in rawRow, false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("2. le 46 colonne del master sono tutte registrate", () => {
  assert.equal(WORDPRESS_RAW_COLUMNS.length, 46);
  assert.equal(new Set(WORDPRESS_RAW_COLUMNS).size, 46);
  for (const required of ["ID", "Tipo", "SKU", "Nome", "Descrizione", "Genitore"]) {
    assert.ok(WORDPRESS_RAW_COLUMNS.includes(required), `${required} deve essere registrata`);
  }
});

test("3. una colonna sconosciuta usa il namespace raw_source e resta protetta", () => {
  const field = fieldForRawColumn("Meta futura non nota");
  assert.equal(field.key, "raw_source.Meta futura non nota");
  assert.equal(field.protected, true);
  assert.equal(field.aiAllowed, false);
});

test("4. master wins quando la verticale è vuota", () => {
  const field = resolveField("Nome", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Nome: "Master" }), snapshot(verticalFile, { SKU: "A", Nome: "" })]);
  assert.equal(field.resolution, "MASTER");
  assert.equal(field.value, "Master");
});

test("5. vertical fill riempie solo un master vuoto", () => {
  const field = resolveField("Descrizione", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Descrizione: "" }), snapshot(verticalFile, { SKU: "A", Descrizione: "Verticale" })]);
  assert.equal(field.resolution, "VERTICAL_FILL");
  assert.equal(field.value, "Verticale");
});

test("6. source conflict non viene risolto automaticamente", () => {
  const field = resolveField("Nome", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Nome: "Master" }), snapshot(verticalFile, { SKU: "A", Nome: "Diverso" })]);
  assert.equal(field.resolution, "SOURCE_CONFLICT");
  assert.equal(field.value, null);
});

test("7. un valore vuoto non cancella un valore non vuoto", () => {
  const field = resolveField("Nome", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Nome: "Valore" }), snapshot(verticalFile, { SKU: "A", Nome: "   " })]);
  assert.equal(field.value, "Valore");
  assert.equal(field.resolution, "MASTER");
});

test("8. parent mantiene identità e tipo parent", () => {
  const product = resolveProduct("PARENT", [snapshot(MASTER_SOURCE_FILE, { SKU: "PARENT", Tipo: "variable", Nome: "Parent", Genitore: "" })]);
  assert.equal(product.entityType, "parent");
  assert.equal(product.parentReference, null);
});

test("9. variation conserva la relazione sorgente senza correggerla", () => {
  const product = resolveProduct("VAR", [snapshot(MASTER_SOURCE_FILE, { SKU: "VAR", Tipo: "variation", Nome: "Variante", Genitore: "id:16967" })]);
  assert.equal(product.entityType, "variation");
  assert.equal(product.parentReference, "id:16967");
  assert.equal(product.parentSku, null);

});

test("10. SKU mancante richiede review e non crea entità canonica", () => {
  const decision = decideIdentity({ ID: "16968", Tipo: "variation", SKU: "", Genitore: "id:16967", Nome: "Senza SKU" });
  assert.equal(decision.identityStatus, "identity_review_required");
  assert.equal(decision.createCanonicalEntity, false);
  assert.equal(decision.parentReference, "id:16967");

});

test("11. i campi manuali noti sono protetti", () => {
  for (const key of ["ibridatore", "colore_fiore", "colore_foglia", "curiosita", "nome_comune"]) {
    assert.ok(PROTECTED_FIELD_KEYS.includes(key), `${key} deve essere protetto`);
  }
});

test("12. il resolver non contiene né importa un invocatore AI", () => {
  const source = fs.readFileSync(path.join(ROOT, "src/catalog/lossless/sourceResolver.ts"), "utf8");
  assert.equal(/enrichProduct|ai-product-enricher|openai/i.test(source), false);
});

test("13. un valore legacy non vuoto e diverso è preservato", () => {
  const product = resolveProduct("A", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Tipo: "simple", Nome: "Titolo WP" })]);
  const comparisons = compareWithLegacy(product, { sku: "A", title: "Titolo approvato", source_file: "legacy.csv" });
  const title = comparisons.find((item) => item.fieldKey === "title");
  assert.equal(title?.classification, "LEGACY_VALUE_TO_PRESERVE");
  assert.equal(title?.proposedCurrentValue, "Titolo approvato");

  const legacyOnlyDescription = compareWithLegacy(
    resolveProduct("B", [snapshot(MASTER_SOURCE_FILE, { SKU: "B", Tipo: "simple", Descrizione: "" })]),
    { sku: "B", description: "Descrizione legacy approvata" },
  ).find((item) => item.fieldKey === "description");
  assert.equal(legacyOnlyDescription?.classification, "LEGACY_VALUE_TO_PRESERVE");
  assert.equal(legacyOnlyDescription?.sameOrDifferent, "LEGACY_ONLY");
});

test("13b. prezzo regolare confronta price senza offerta e compare_at_price con offerta", () => {
  const withoutSale = resolveProduct("A", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Tipo: "simple", "Prezzo di listino": "12,50", "Prezzo in offerta": "" })]);
  const withoutSalePrice = compareWithLegacy(withoutSale, { sku: "A", price: 12.5, compare_at_price: 99 }).find((item) => item.fieldKey === "regular_price");
  assert.equal(withoutSalePrice?.sameOrDifferent, "SAME");

  const withSale = resolveProduct("B", [snapshot(MASTER_SOURCE_FILE, { SKU: "B", Tipo: "simple", "Prezzo di listino": "20", "Prezzo in offerta": "15" })]);
  const withSaleRegular = compareWithLegacy(withSale, { sku: "B", price: 15, compare_at_price: 20 }).find((item) => item.fieldKey === "regular_price");
  const withSaleDiscount = compareWithLegacy(withSale, { sku: "B", price: 15, compare_at_price: 20 }).find((item) => item.fieldKey === "sale_price");
  assert.equal(withSaleRegular?.sameOrDifferent, "SAME");
  assert.equal(withSaleDiscount?.sameOrDifferent, "SAME");
});

test("14. baseline WordPress e current legacy restano distinti", () => {
  const product = resolveProduct("A", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Tipo: "simple", Descrizione: "Originale" })]);
  const description = compareWithLegacy(product, { sku: "A", description: "Corrente" }).find((item) => item.fieldKey === "description");
  assert.equal(description?.wordpressOriginal, "Originale");
  assert.equal(description?.legacyCurrent, "Corrente");
  assert.equal(description?.proposedCurrentSource, "legacy");
});

test("15. provenance conserva file e riga della sorgente selezionata", () => {
  const field = resolveField("Descrizione", [snapshot(MASTER_SOURCE_FILE, { SKU: "A", Descrizione: "" }, 11), snapshot(verticalFile, { SKU: "A", Descrizione: "Testo" }, 27)]);
  assert.equal(field.sourceFile, verticalFile);
  assert.equal(field.sourceRow, 27);
  assert.equal(field.candidates.length, 2);
});

test("16. round-trip CSV lossless su otto fixture sintetiche", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lossless-roundtrip-"));
  try {
    const files = Array.from({ length: 8 }, (_, index) => `fixture-${index + 1}.csv`);
    for (const file of files) {
      const headers = WORDPRESS_RAW_COLUMNS;
      const rows = [Object.fromEntries(headers.map((header) => [header, header === "SKU" ? file : `valore, \"quoted\"\n${header}`]))];
      const output = path.join(tmpDir, file);
      writeCsvFile(output, rows, headers);
      assert.deepEqual(readCsvHeaders(output), headers, `${file}: header`);
      assert.deepEqual(readCsvFile(output).map(({ __rowNumber: _, ...row }) => row), rows, `${file}: rows`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("17. il confronto legacy usa tutte le classificazioni richieste", () => {
  const product = resolveProduct("A", [snapshot(MASTER_SOURCE_FILE, {
    SKU: "A",
    Tipo: "simple",
    Nome: "Uguale",
    Descrizione: "Solo WordPress",
    "Breve descrizione": "Prima versione",
  }), snapshot(verticalFile, {
    SKU: "A",
    Tipo: "simple",
    Nome: "Uguale",
    "Breve descrizione": "Seconda versione",
  })]);
  const comparisons = compareWithLegacy(product, {
    sku: "A",
    title: "Uguale",
    optimized_description: "Solo legacy",
  });

  assert.equal(comparisons.find((item) => item.fieldKey === "title")?.classification, "SAME");
  assert.equal(comparisons.find((item) => item.fieldKey === "description")?.classification, "SOURCE_ONLY");
  assert.equal(comparisons.find((item) => item.fieldKey === "optimized_description")?.classification, "LEGACY_VALUE_TO_PRESERVE");
  assert.equal(comparisons.find((item) => item.fieldKey === "short_description")?.classification, "CONFLICT");
});

test("18. il dry-run golden non carica client DB né file ambiente", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/lossless-catalog-golden-dry-run.mjs"), "utf8");
  assert.equal(/createClient|loadEnvFile|VITE_SUPABASE|\.from\s*\(/.test(source), false);
  assert.match(source, /EXPECTED_LEGACY_SHA256/);
  assert.match(source, /PRIVATE_WORDPRESS_RAW_FILE_COUNT_MISMATCH/);
});
