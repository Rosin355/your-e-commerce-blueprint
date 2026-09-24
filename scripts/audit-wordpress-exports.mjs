import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "imports/wordpress/raw");
const DOCS_DIR = path.join(ROOT, "docs");
const CHECK_ONLY = process.argv.includes("--check-only");

const TECHNICAL_FIELDS = new Set([
  "ID", "Tipo", "SKU", "GTIN, UPC, EAN, o ISBN", "Pubblicato", "In primo piano?",
  "Visibilità nel catalogo", "Data di partenza del prezzo in saldo",
  "Data in cui termina l'offerta", "Stato delle imposte", "Aliquota di imposta",
  "In stock?", "Magazzino", "Quantità in magazzino bassa",
  "Abilita gli ordini arretrati?", "Venduto singolarmente?", "Peso (kg)",
  "Lunghezza (cm)", "Larghezza (cm)", "Altezza (cm)",
  "Permetti le recensioni clienti?", "Prezzo in offerta", "Prezzo di listino",
  "Categorie", "Tag", "Classe di spedizione", "Immagine", "Limite di download",
  "Scarica i giorni di scadenza", "Genitore", "Prodotti raggruppati", "Up-sell",
  "Cross-sell", "URL esterno", "Posizione", "EAN", "Marchi",
  "Nome dell'attributo 1", "Valore dell'attributo 1", "Attributo 1 visibile",
  "Attributo 1 globale",
]);

const FIELD_CONFIG = {
  ID: ["woo_id", "wooCommerce.id", false, false, true, true, true, "read_only", "Identificativo prodotto WooCommerce"],
  Tipo: ["product_type", "product.status/type", false, false, true, true, true, "read_only", "Tipo record WooCommerce"],
  SKU: ["sku", "variant.sku", false, false, true, true, true, "read_only", "Codice articolo"],
  "GTIN, UPC, EAN, o ISBN": ["gtin", "variant.barcode", true, false, true, true, true, "text", "Identificativo commerciale"],
  Nome: ["title", "product.title", true, true, false, false, false, "text", "Titolo prodotto"],
  Pubblicato: ["published", "product.status/published", true, false, true, true, true, "boolean", "Stato pubblicazione sorgente"],
  "In primo piano?": ["featured", "metafield.legacy.featured", true, false, true, true, false, "boolean", "Flag prodotto in evidenza"],
  "Visibilità nel catalogo": ["catalog_visibility", "metafield.legacy.catalog_visibility", true, false, true, true, true, "select", "Visibilità WooCommerce"],
  "Breve descrizione": ["short_description", "metafield.content.short_description", true, true, false, false, false, "rich_text", "Descrizione breve editoriale"],
  Descrizione: ["description_html", "product.descriptionHtml", true, true, false, false, false, "rich_text", "Descrizione completa HTML"],
  "Data di partenza del prezzo in saldo": ["sale_start_at", "metafield.legacy.sale_start_at", true, false, true, true, true, "read_only", "Inizio prezzo promozionale"],
  "Data in cui termina l'offerta": ["sale_end_at", "metafield.legacy.sale_end_at", true, false, true, true, true, "read_only", "Fine prezzo promozionale"],
  "Stato delle imposte": ["tax_status", "variant.taxable", true, false, true, true, true, "select", "Stato fiscale"],
  "Aliquota di imposta": ["tax_class", "metafield.legacy.tax_class", true, false, true, true, true, "select", "Classe fiscale"],
  "In stock?": ["in_stock", "inventory.available", true, false, true, true, true, "boolean", "Disponibilità sorgente"],
  Magazzino: ["manage_stock", "inventory.tracked", true, false, true, true, true, "boolean", "Gestione inventario"],
  "Quantità in magazzino bassa": ["low_stock_threshold", "metafield.legacy.low_stock_threshold", true, false, true, true, true, "number", "Soglia scorta bassa"],
  "Abilita gli ordini arretrati?": ["backorders", "inventory.policy", true, false, true, true, true, "select", "Politica backorder"],
  "Venduto singolarmente?": ["sold_individually", "metafield.legacy.sold_individually", true, false, true, true, true, "boolean", "Acquisto singolo"],
  "Peso (kg)": ["weight_kg", "variant.weight", true, false, true, true, true, "number", "Peso in kg"],
  "Lunghezza (cm)": ["length_cm", "metafield.shipping.length_cm", true, false, true, true, true, "number", "Lunghezza imballo"],
  "Larghezza (cm)": ["width_cm", "metafield.shipping.width_cm", true, false, true, true, true, "number", "Larghezza imballo"],
  "Altezza (cm)": ["height_cm", "metafield.shipping.height_cm", true, false, true, true, true, "number", "Altezza imballo"],
  "Permetti le recensioni clienti?": ["reviews_allowed", "metafield.legacy.reviews_allowed", true, false, true, true, false, "boolean", "Abilitazione recensioni"],
  "Nota di acquisto": ["purchase_note", "metafield.content.purchase_note", true, true, false, false, false, "textarea", "Nota editoriale post-acquisto"],
  "Prezzo in offerta": ["sale_price", "variant.price", true, false, true, true, true, "currency", "Prezzo promozionale"],
  "Prezzo di listino": ["regular_price", "variant.compareAtPrice/price", true, false, true, true, true, "currency", "Prezzo ordinario"],
  Categorie: ["source_categories", "collections (mapping successivo)", false, false, true, true, true, "read_only", "Categorie WooCommerce gerarchiche"],
  Tag: ["source_tags", "product.tags", true, false, true, true, false, "tags", "Tag sorgente"],
  "Classe di spedizione": ["shipping_class", "metafield.shipping.class", true, false, true, true, true, "select", "Classe di spedizione"],
  Immagine: ["image_urls", "product.media", true, false, true, true, true, "image_list", "Elenco URL immagini"],
  "Limite di download": ["download_limit", "metafield.legacy.download_limit", true, false, true, true, true, "number", "Limite download"],
  "Scarica i giorni di scadenza": ["download_expiry_days", "metafield.legacy.download_expiry_days", true, false, true, true, true, "number", "Scadenza download"],
  Genitore: ["parent_sku", "product/variant relation", false, false, true, true, true, "read_only", "Riferimento SKU parent"],
  "Prodotti raggruppati": ["grouped_products", "metafield.legacy.grouped_products", true, false, true, true, true, "read_only", "Relazioni prodotti raggruppati"],
  "Up-sell": ["upsell_skus", "metafield.merchandising.upsell_skus", true, false, true, true, false, "multiselect", "SKU up-sell"],
  "Cross-sell": ["cross_sell_skus", "metafield.merchandising.cross_sell_skus", true, false, true, true, false, "multiselect", "SKU cross-sell"],
  "URL esterno": ["external_url", "metafield.legacy.external_url", true, false, true, true, true, "text", "URL prodotto esterno"],
  "Testo del pulsante": ["button_text", "metafield.content.button_text", true, true, false, false, false, "text", "Testo editoriale del pulsante"],
  Posizione: ["menu_order", "metafield.legacy.menu_order", true, false, true, true, true, "number", "Ordinamento sorgente"],
  EAN: ["ean", "variant.barcode", true, false, true, true, true, "text", "Codice EAN alternativo"],
  Marchi: ["brands", "product.vendor/tags", true, false, true, true, false, "multiselect", "Tassonomia marchi"],
  "Nome dell'attributo 1": ["attribute_1_name", "product.option1.name", false, false, true, true, true, "read_only", "Nome opzione variante"],
  "Valore dell'attributo 1": ["attribute_1_value", "variant.option1", false, false, true, true, true, "read_only", "Valore opzione variante"],
  "Attributo 1 visibile": ["attribute_1_visible", "metafield.legacy.attribute_1_visible", false, false, true, true, true, "read_only", "Visibilità attributo"],
  "Attributo 1 globale": ["attribute_1_global", "metafield.legacy.attribute_1_global", false, false, true, true, true, "read_only", "Attributo globale WooCommerce"],
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function detectDelimiter(text) {
  const candidates = [",", ";", "\t", "|"];
  const counts = Object.fromEntries(candidates.map((candidate) => [candidate, 0]));
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r")) break;
    if (!inQuotes && Object.hasOwn(counts, char)) counts[char] += 1;
  }
  return candidates.sort((left, right) => counts[right] - counts[left])[0];
}

function parseCsv(text, delimiter) {
  const source = text.replace(/^\uFEFF/, "");
  const rows = [];
  const errors = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let rowNumber = 1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
      rowNumber += 1;
    } else {
      field += char;
    }
  }
  if (inQuotes) errors.push({ rowNumber, code: "UNCLOSED_QUOTE", message: "Campo quoted non chiuso" });
  if (field.length || row.length) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  const expectedColumns = rows[0]?.length || 0;
  rows.forEach((cells, index) => {
    if (cells.length !== expectedColumns) errors.push({ rowNumber: index + 1, code: "COLUMN_COUNT", expected: expectedColumns, actual: cells.length });
  });
  return { rows, errors };
}

function quoteCsv(value, delimiter) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(delimiter) || text.includes("\n") || text.includes("\r")) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function serializeCsv(rows, delimiter) {
  return `${rows.map((row) => row.map((value) => quoteCsv(value, delimiter)).join(delimiter)).join("\n")}\n`;
}

function arraysEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let rowIndex = 0; rowIndex < left.length; rowIndex += 1) {
    if (left[rowIndex].length !== right[rowIndex].length) return false;
    for (let columnIndex = 0; columnIndex < left[rowIndex].length; columnIndex += 1) {
      if (left[rowIndex][columnIndex] !== right[rowIndex][columnIndex]) return false;
    }
  }
  return true;
}

function splitList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function splitImages(value) {
  return String(value || "").split(/\s*[|,]\s*/).map((item) => item.trim()).filter(Boolean);
}

function findHeader(headers, candidates) {
  const normalized = new Map(headers.map((header) => [normalizeName(header), header]));
  for (const candidate of candidates) {
    const found = normalized.get(normalizeName(candidate));
    if (found) return found;
  }
  return null;
}

function rowObject(headers, cells) {
  return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
}

function inferType(values) {
  const nonEmpty = values.filter((value) => value !== "");
  if (!nonEmpty.length) return "empty";
  if (nonEmpty.every((value) => /^(?:0|1|-1|true|false|yes|no|si|sì)$/i.test(value.trim()))) return "boolean";
  if (nonEmpty.every((value) => /^-?\d+(?:[.,]\d+)?$/.test(value.trim()))) return "number";
  if (nonEmpty.every((value) => /^\d{4}-\d{2}-\d{2}/.test(value.trim()))) return "date_or_datetime";
  if (nonEmpty.some((value) => /<[^>]+>/.test(value))) return "html";
  if (nonEmpty.some((value) => /^https?:\/\//i.test(value.trim()))) return "url_or_url_list";
  if (nonEmpty.some((value) => value.includes(","))) return "list_or_text";
  return "text";
}

function fieldDefinition(rawColumn) {
  const configured = FIELD_CONFIG[rawColumn];
  if (configured) {
    const [proposedInternalKey, proposedShopifyMapping, editable, aiAllowed, manualOnly, sourceControlled, protectedField, editorType, probableMeaning] = configured;
    return { canonicalCandidate: proposedInternalKey, probableMeaning, proposedInternalKey, proposedShopifyMapping, editable, aiAllowed, manualOnly, sourceControlled, protected: protectedField, editorType, origin: "WooCommerce core/export" };
  }
  const normalized = normalizeName(rawColumn);
  const customCategory = /faq/.test(normalized) ? "FAQ custom" : /colore|color/.test(normalized) ? "Colore custom" : /botanic|comune|ibrid|curios/.test(normalized) ? "Botanica/custom editoriale" : "Campo custom non riconosciuto";
  return { canonicalCandidate: `raw_source.${rawColumn}`, probableMeaning: customCategory, proposedInternalKey: `raw_source.${rawColumn}`, proposedShopifyMapping: "metafield da definire", editable: true, aiAllowed: /faq|descr|cura|botanic|comune|curios|promo/.test(normalized), manualOnly: false, sourceControlled: true, protected: /sku|prezzo|stock|peso|parent|variant|shipping|tax|categoria|immagin|nome_comune/.test(normalized), editorType: "key_value_repeater", origin: "WordPress/WooCommerce custom/unknown" };
}

function classifyCustomField(header) {
  if (TECHNICAL_FIELDS.has(header) || ["Nome", "Breve descrizione", "Descrizione", "Nota di acquisto", "Testo del pulsante"].includes(header)) return null;
  const normalized = normalizeName(header);
  if (/botanic|nome_scientifico/.test(normalized)) return "botanica";
  if (/descr/.test(normalized)) return "descrizioni";
  if (/cura|esposizione|terreno|irrig|fioritura|raccolta|potatura/.test(normalized)) return normalized;
  if (/nome_comune/.test(normalized)) return "nome_comune";
  if (/faq/.test(normalized)) return "faq";
  if (/feature|caratteristic/.test(normalized)) return "key_features";
  if (/promo/.test(normalized)) return "promo";
  if (/colore|color/.test(normalized)) return "colori";
  if (/ibrid/.test(normalized)) return "ibridatore";
  if (/curios/.test(normalized)) return "curiosita";
  return "altri_custom_field";
}

function markdownEscape(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ↵ ");
}

function truncate(value, max = 120) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function typeLabel(type) {
  const normalized = normalizeName(type);
  if (normalized === "simple" || normalized === "semplice") return "simple";
  if (normalized === "variable" || normalized === "variabile") return "parent";
  if (normalized === "variation" || normalized === "variazione") return "variation";
  return normalized || "unknown";
}

function relationAudit(records) {
  const bySku = new Map();
  const recordsWithoutSku = records.filter((record) => !record.sku).map((record) => ({ file: record.file, rowNumber: record.rowNumber, type: record.type, title: record.title, parentReference: record.parentSku, wooId: record.raw.ID || "" }));
  const variationsWithoutSku = recordsWithoutSku.filter((record) => record.type === "variation");
  const parentsWithoutSku = recordsWithoutSku.filter((record) => record.type === "parent");
  const nonSkuParentReferences = records.filter((record) => record.type === "variation" && record.parentSku && !/^OG_/i.test(record.parentSku)).map((record) => ({ sku: record.sku, file: record.file, rowNumber: record.rowNumber, parentReference: record.parentSku, title: record.title }));
  for (const record of records) {
    if (!record.sku) continue;
    if (!bySku.has(record.sku)) bySku.set(record.sku, []);
    bySku.get(record.sku).push(record);
  }
  const orphanVariations = [];
  const inconsistentParents = [];
  const duplicateRows = [];
  for (const [sku, entries] of bySku) {
    if (entries.length > 1) duplicateRows.push({ sku, occurrences: entries.length, files: [...new Set(entries.map((entry) => entry.file))] });
    for (const entry of entries.filter((item) => item.type === "variation")) {
      const parentCandidates = bySku.get(entry.parentSku) || [];
      if (!entry.parentSku || !parentCandidates.length) orphanVariations.push({ sku, parentSku: entry.parentSku, file: entry.file, rowNumber: entry.rowNumber });
      else if (!parentCandidates.some((candidate) => candidate.type === "parent")) inconsistentParents.push({ sku, parentSku: entry.parentSku, parentTypes: [...new Set(parentCandidates.map((candidate) => candidate.type))] });
    }
  }
  return { orphanVariations, inconsistentParents, duplicateRows, recordsWithoutSku, variationsWithoutSku, parentsWithoutSku, nonSkuParentReferences };
}

function buildConflicts(records, unionHeaders) {
  const bySku = new Map();
  for (const record of records) {
    if (!record.sku) continue;
    if (!bySku.has(record.sku)) bySku.set(record.sku, []);
    bySku.get(record.sku).push(record);
  }
  const details = [];
  const summary = { SAME: 0, SOURCE_ONLY: 0, MISSING: 0, SOURCE_CONFLICT: 0 };
  for (const [sku, entries] of bySku) {
    const files = [...new Set(entries.map((entry) => entry.file))];
    if (files.length < 2) continue;
    for (const field of unionHeaders) {
      const observations = entries.map((entry) => ({ file: entry.file, rowNumber: entry.rowNumber, value: entry.raw[field], columnPresent: entry.headers.includes(field) }));
      const nonEmpty = observations.filter((item) => item.value !== "");
      const uniqueValues = [...new Set(nonEmpty.map((item) => item.value))];
      let classification;
      if (uniqueValues.length > 1) classification = "SOURCE_CONFLICT";
      else if (observations.some((item) => !item.columnPresent) && nonEmpty.length) classification = "SOURCE_ONLY";
      else if (nonEmpty.length !== observations.length) classification = "MISSING";
      else classification = "SAME";
      summary[classification] += 1;
      if (classification !== "SAME") details.push({ sku, field, classification, observations });
    }
  }
  return { repeatedSkuCount: [...bySku.values()].filter((entries) => new Set(entries.map((entry) => entry.file)).size > 1).length, summary, details };
}

function buildGoldenDataset(records, repeatedSkus, conflictSkus) {
  const unique = new Map();
  for (const record of records) if (record.sku && !unique.has(record.sku)) unique.set(record.sku, record);
  const selected = new Map();
  const add = (record, reason) => {
    if (!record || !record.sku || selected.size >= 20) return;
    const current = selected.get(record.sku);
    if (current) current.reasons.add(reason);
    else selected.set(record.sku, { sku: record.sku, title: record.title, type: record.type, categories: record.categories, reasons: new Set([reason]) });
  };
  add(unique.get("OG_393883"), "SKU richiesto esplicitamente");
  const all = [...unique.values()];
  const find = (predicate) => all.find((record) => !selected.has(record.sku) && predicate(record));
  add(find((record) => /^Rosa\b/i.test(record.title) || record.categories.includes("Rose")), "Seconda rosa rappresentativa");
  add(find((record) => /arbust/i.test(record.categories.join(" "))), "Arbusto");
  add(find((record) => /alber/i.test(record.categories.join(" "))), "Albero");
  add(find((record) => /conifer/i.test(record.categories.join(" "))), "Conifera");
  add(find((record) => /bulb/i.test(record.categories.join(" "))), "Bulbo");
  add(find((record) => /piante da frutto/i.test(record.categories.join(" "))), "Pianta da frutto");
  add(find((record) => /piccoli frutti|mirtill|lampone|ribes|uva spina|goji|mora\b/i.test(`${record.title} ${record.categories.join(" ")}`)), "Piccolo frutto");
  add(find((record) => /aromatic/i.test(record.categories.join(" "))), "Aromatica");
  add(find((record) => record.type === "simple"), "Prodotto simple");
  add(find((record) => record.type === "parent"), "Prodotto parent");
  add(find((record) => record.type === "variation"), "Variation");
  add(find((record) => record.images.length > 1), "Più immagini");
  add(find((record) => record.categories.length > 1), "Categorie multiple");
  add(find((record) => repeatedSkus.has(record.sku)), "Presente in più CSV");
  add(find((record) => conflictSkus.has(record.sku)), "SOURCE_CONFLICT");
  const byCompleteness = all.filter((record) => !selected.has(record.sku)).sort((left, right) => Object.values(left.raw).filter(Boolean).length - Object.values(right.raw).filter(Boolean).length);
  add(byCompleteness[0], "Record con pochi campi compilati");
  add(byCompleteness.at(-1), "Record ad alta compilazione");
  for (const record of all.sort((left, right) => right.images.length - left.images.length || right.categories.length - left.categories.length)) {
    add(record, "Copertura rappresentativa aggiuntiva");
    if (selected.size >= 20) break;
  }
  return [...selected.values()].map((item) => ({ ...item, reasons: [...item.reasons] }));
}

function proposeSourceRoles(fileAudits) {
  const sorted = [...fileAudits].sort((left, right) => right.uniqueSkuCount - left.uniqueSkuCount || right.rowCount - left.rowCount);
  return sorted.map((file, index) => ({
    file: file.filename,
    proposedRole: index === 0 ? "master export candidate" : file.typeCounts.variation > 0 && file.typeCounts.parent > 0 ? "category export with parent/variation pairs" : file.typeCounts.simple === file.rowCount ? "category export of simple products" : "partial/category export",
    precedence: index === 0 ? 1 : 2,
    rationale: index === 0 ? "Massima copertura SKU e righe; usare solo come baseline proposta, non come vincitore automatico." : "Fonte verticale utile per categorie e campi compilati; i conflitti restano da approvare manualmente.",
  }));
}

async function analyzeFile(filePath) {
  const bytes = await fs.readFile(filePath);
  let encoding = "utf-8";
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    encoding = "non-utf8/unknown";
    text = new TextDecoder("utf-8").decode(bytes);
  }
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const delimiter = detectDelimiter(text);
  const parsed = parseCsv(text, delimiter);
  const headers = parsed.rows[0] || [];
  const dataRows = parsed.rows.slice(1).filter((row) => !(row.length === 1 && row[0] === ""));
  const skuHeader = findHeader(headers, ["SKU", "sku"]);
  const typeHeader = findHeader(headers, ["Tipo", "type"]);
  const titleHeader = findHeader(headers, ["Nome", "name", "title"]);
  const categoryHeader = findHeader(headers, ["Categorie", "categories", "category"]);
  const imageHeader = findHeader(headers, ["Immagine", "Immagini", "images", "image"]);
  const parentHeader = findHeader(headers, ["Genitore", "parent"]);
  const priceHeaders = headers.filter((header) => /prezzo|price/i.test(header));
  const stockHeaders = headers.filter((header) => /stock|magazzino/i.test(header));
  const shippingHeaders = headers.filter((header) => /spedizione|shipping/i.test(header));
  const attributeHeaders = headers.filter((header) => /attribut|attribute/i.test(header));
  const objects = dataRows.map((row, index) => ({ raw: rowObject(headers, row), rowNumber: index + 2 }));
  const skuValues = objects.map(({ raw }) => skuHeader ? raw[skuHeader].trim() : "");
  const typeCounts = { simple: 0, parent: 0, variation: 0, unknown: 0 };
  for (const { raw } of objects) typeCounts[typeLabel(typeHeader ? raw[typeHeader] : "unknown")] += 1;
  const categoryValues = [...new Set(objects.flatMap(({ raw }) => categoryHeader ? splitList(raw[categoryHeader]) : []))].sort();
  const imageRows = objects.filter(({ raw }) => imageHeader && raw[imageHeader] !== "").length;
  const imageUrls = objects.reduce((total, { raw }) => total + (imageHeader ? splitImages(raw[imageHeader]).length : 0), 0);
  const serialized = serializeCsv(parsed.rows, delimiter);
  const reparsed = parseCsv(serialized, delimiter);
  const roundTripPassed = arraysEqual(parsed.rows, reparsed.rows);
  return {
    filename: path.basename(filePath), path: path.relative(ROOT, filePath), byteSize: bytes.length,
    sha256: sha256(bytes), encoding, hasBom, delimiter: delimiter === "\t" ? "TAB" : delimiter,
    rowCount: dataRows.length, columnCount: headers.length, headers, skuHeader,
    uniqueSkuCount: new Set(skuValues.filter(Boolean)).size, rowsWithoutSku: skuValues.filter((value) => !value).length,
    rowsWithoutSkuDetails: objects.filter(({ raw }) => !skuHeader || !raw[skuHeader].trim()).map(({ raw, rowNumber }) => ({ rowNumber, id: raw.ID || "", type: typeLabel(typeHeader ? raw[typeHeader] : ""), title: titleHeader ? raw[titleHeader] : "" })),
    duplicateSkuWithinFile: skuValues.filter(Boolean).length - new Set(skuValues.filter(Boolean)).size,
    typeCounts, categories: categoryValues, imageRows, imageUrls, priceHeaders, stockHeaders,
    shippingHeaders, attributeHeaders, customFields: headers.map(classifyCustomField).filter(Boolean),
    parseErrors: parsed.errors, roundTripPassed, roundTripErrors: reparsed.errors, objects,
    semanticHeaders: { skuHeader, typeHeader, titleHeader, categoryHeader, imageHeader, parentHeader },
  };
}

function buildRecords(fileAudits) {
  return fileAudits.flatMap((audit) => audit.objects.map(({ raw, rowNumber }) => {
    const h = audit.semanticHeaders;
    return {
      file: audit.filename, rowNumber, headers: audit.headers, raw,
      sku: h.skuHeader ? raw[h.skuHeader].trim() : "",
      type: typeLabel(h.typeHeader ? raw[h.typeHeader] : ""),
      title: h.titleHeader ? raw[h.titleHeader] : "",
      parentSku: h.parentHeader ? raw[h.parentHeader].trim() : "",
      categories: h.categoryHeader ? splitList(raw[h.categoryHeader]) : [],
      images: h.imageHeader ? splitImages(raw[h.imageHeader]) : [],
      sourceHash: sha256(JSON.stringify(audit.headers.map((header) => raw[header]))),
    };
  }));
}

function buildFieldMap(fileAudits, unionHeaders) {
  return unionHeaders.map((rawColumn) => {
    const values = [];
    const filesPresent = [];
    let possibleRows = 0;
    for (const file of fileAudits) {
      if (!file.headers.includes(rawColumn)) continue;
      filesPresent.push(file.filename);
      possibleRows += file.rowCount;
      values.push(...file.objects.map(({ raw }) => raw[rawColumn]));
    }
    const populated = values.filter((value) => value !== "");
    return {
      rawColumn, ...fieldDefinition(rawColumn), filesPresent,
      populatedRows: populated.length,
      populatedPercentage: possibleRows ? Number(((populated.length / possibleRows) * 100).toFixed(2)) : 0,
      inferredType: inferType(values), sampleValues: [...new Set(populated)].slice(0, 5).map((value) => truncate(value, 100)),
    };
  });
}

function renderAuditMarkdown(report) {
  const lines = [
    "# Audit lossless export WordPress/WooCommerce",
    "",
    `Data audit: ${report.generatedAt}`,
    `Baseline Git: \`${report.baselineCommit}\``,
    `Branch: \`${report.branch}\``,
    "",
    "## Sintesi",
    "",
    `- CSV analizzati: ${report.summary.fileCount}`,
    `- Righe complessive: ${report.summary.totalRows}`,
    `- SKU unici complessivi: ${report.summary.uniqueSkus}`,
    `- Simple: ${report.summary.typeCounts.simple}`,
    `- Parent/variable: ${report.summary.typeCounts.parent}`,
    `- Variations: ${report.summary.typeCounts.variation}`,
    `- Colonne uniche: ${report.summary.uniqueColumns}`,
    `- Categorie/path unici: ${report.summary.uniqueCategories}`,
    `- SKU presenti in più file: ${report.conflicts.repeatedSkuCount}`,
    `- Orphan variations: ${report.relations.orphanVariations.length}`,
    `- Round-trip superati: ${report.files.filter((file) => file.roundTripPassed).length}/${report.files.length}`,
    "",
    "## Inventario file e integrità",
    "",
    "| File | Byte | SHA256 | Encoding | Delimiter | Righe | Colonne | SKU unici | Senza SKU | Simple | Parent | Variation | Parse errors | Round-trip |",
    "|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ...report.files.map((file) => `| ${markdownEscape(file.filename)} | ${file.byteSize} | \`${file.sha256}\` | ${file.encoding}${file.hasBom ? " + BOM" : ""} | ${markdownEscape(file.delimiter)} | ${file.rowCount} | ${file.columnCount} | ${file.uniqueSkuCount} | ${file.rowsWithoutSku} | ${file.typeCounts.simple} | ${file.typeCounts.parent} | ${file.typeCounts.variation} | ${file.parseErrors.length} | ${file.roundTripPassed ? "PASS" : "FAIL"} |`),
    "",
    "## Header esatti per file",
    "",
    ...report.files.flatMap((file) => [`### ${file.filename}`, "", file.headers.map((header, index) => `${index + 1}. \`${header}\``).join("\n"), ""]),
    "## Copertura dati",
    "",
    ...report.files.flatMap((file) => [
      `### ${file.filename}`,
      "",
      `- Prezzo: ${file.priceHeaders.length ? file.priceHeaders.map((h) => `\`${h}\``).join(", ") : "nessuna colonna"}`,
      `- Stock: ${file.stockHeaders.length ? file.stockHeaders.map((h) => `\`${h}\``).join(", ") : "nessuna colonna"}`,
      `- Shipping class: ${file.shippingHeaders.length ? file.shippingHeaders.map((h) => `\`${h}\``).join(", ") : "nessuna colonna"}`,
      `- Attributi: ${file.attributeHeaders.length ? file.attributeHeaders.map((h) => `\`${h}\``).join(", ") : "nessuna colonna"}`,
      `- Righe con immagini: ${file.imageRows}; URL/elementi immagine: ${file.imageUrls}`,
      `- Categorie/path distinti nel file: ${file.categories.length}`,
      `- Righe senza SKU: ${file.rowsWithoutSku}${file.rowsWithoutSkuDetails.length ? ` (${file.rowsWithoutSkuDetails.map((row) => `riga ${row.rowNumber}, ID ${row.id || "N/D"}, ${truncate(row.title, 60)}`).join("; ")})` : ""}`,
      "",
    ]),
    "## Parent e variations",
    "",
    `- Orphan variations: ${report.relations.orphanVariations.length}`,
    `- Parent con tipo incoerente: ${report.relations.inconsistentParents.length}`,
    `- SKU ripetuti (tra file o nello stesso file): ${report.relations.duplicateRows.length}`,
    `- Variation senza SKU: ${report.relations.variationsWithoutSku.length}`,
    `- Parent senza SKU: ${report.relations.parentsWithoutSku.length}`,
    `- Riferimenti parent non espressi come SKU: ${report.relations.nonSkuParentReferences.length}`,
    "",
    "Nessuna relazione è stata corretta automaticamente. Le variation senza SKU restano import-blocking fino a una decisione esplicita; il riferimento `id:<Woo ID>` deve essere preservato nel raw snapshot.",
    "",
    "## Custom/ACF",
    "",
    report.customFields.length ? report.customFields.map((item) => `- \`${item.field}\`: ${item.group}`).join("\n") : "Non sono state trovate colonne ACF/custom esplicite oltre allo schema WooCommerce export e alle colonne attributo standard.",
    "",
    "I campi manuali `ibridatore`, `colore_fiore`, `colore_foglia`, `curiosita` e il campo protetto `nome_comune` non compaiono negli otto export. Lo schema futuro deve comunque preservarli e impedire overwrite distruttivi.",
    "",
    "## Round-trip lossless",
    "",
    "Ogni file è stato letto come byte UTF-8, parsato mantenendo stringhe vuote, HTML e newline nei campi quoted, serializzato in memoria e parsato nuovamente. Il confronto è cella-per-cella, inclusi header e numero colonne.",
    "",
    `Risultato: ${report.files.every((file) => file.roundTripPassed) ? "PASS su tutti i file" : "FAIL su almeno un file"}.`,
    "",
    "## Vincoli rispettati",
    "",
    "- Nessun import database.",
    "- Nessuna chiamata o modifica Shopify.",
    "- Nessuna AI eseguita.",
    "- Nessuna migration o Edge Function modificata.",
    "- Nessuna modifica a storefront o Admin V2.",
  ];
  return `${lines.join("\n")}\n`;
}

function renderFieldMapMarkdown(fieldMap) {
  const lines = [
    "# WordPress Master Field Map",
    "",
    "La mappa è l'unione lossless degli header esatti. Le colonne sconosciute devono essere conservate in `raw_source.<original_column_name>`.",
    "",
    "| rawColumn | canonicalCandidate | filesPresent | populated | type | sampleValues | probableMeaning | origin | internalKey | Shopify mapping | editable | AI | manualOnly | sourceControlled | protected | editorType |",
    "|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...fieldMap.map((field) => `| ${markdownEscape(field.rawColumn)} | ${markdownEscape(field.canonicalCandidate)} | ${markdownEscape(field.filesPresent.join("; "))} | ${field.populatedRows} (${field.populatedPercentage}%) | ${field.inferredType} | ${markdownEscape(field.sampleValues.join("; "))} | ${markdownEscape(field.probableMeaning)} | ${markdownEscape(field.origin)} | ${markdownEscape(field.proposedInternalKey)} | ${markdownEscape(field.proposedShopifyMapping)} | ${field.editable} | ${field.aiAllowed} | ${field.manualOnly} | ${field.sourceControlled} | ${field.protected} | ${field.editorType} |`),
    "",
    "## Regola fallback",
    "",
    "Qualunque colonna futura non riconosciuta deve essere salvata integralmente nel `raw_row` e resa indirizzabile come `raw_source.<original_column_name>`. Nessun campo può essere scartato in fase di ingestione.",
  ];
  return `${lines.join("\n")}\n`;
}

function renderConflictsMarkdown(report) {
  const conflictDetails = report.conflicts.details.filter((item) => item.classification === "SOURCE_CONFLICT");
  const lines = [
    "# Conflitti sorgenti WordPress/WooCommerce",
    "",
    `SKU presenti in più export: ${report.conflicts.repeatedSkuCount}`,
    "",
    "| Classificazione | Occorrenze campo |",
    "|---|---:|",
    ...Object.entries(report.conflicts.summary).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Source precedence proposta",
    "",
    "La precedence seguente è una proposta e non è stata applicata. Ogni `SOURCE_CONFLICT` resta in attesa di decisione umana.",
    "",
    "| Priorità | File | Ruolo proposto | Motivazione |",
    "|---:|---|---|---|",
    ...report.sourceRoles.map((item) => `| ${item.precedence} | ${item.file} | ${item.proposedRole} | ${item.rationale} |`),
    "",
    "Regole consigliate:",
    "",
    "1. Usare il master candidate come baseline di copertura, senza sovrascrivere automaticamente valori diversi.",
    "2. Integrare da export verticali solo campi assenti nella baseline e chiaramente valorizzati.",
    "3. Un valore diverso non vuoto genera sempre revisione manuale.",
    "4. Categorie, relazioni parent/variation e campi commerciali restano source-controlled.",
    "5. Conservare tutte le osservazioni nel raw snapshot, anche dopo l'approvazione di un current value.",
    "",
    "## SOURCE_CONFLICT rilevati",
    "",
    "| SKU | Campo | Osservazioni sorgenti |",
    "|---|---|---|",
    ...conflictDetails.slice(0, 300).map((item) => `| ${markdownEscape(item.sku)} | ${markdownEscape(item.field)} | ${markdownEscape(item.observations.map((observation) => `${observation.file}: ${truncate(observation.value, 80) || "<vuoto>"}`).join(" / "))} |`),
    "",
    conflictDetails.length > 300 ? `La tabella mostra i primi 300 di ${conflictDetails.length} conflitti. Il dettaglio completo è in \`docs/wordpress-import-audit-data.json\`.` : "La tabella contiene tutti i SOURCE_CONFLICT rilevati.",
  ];
  return `${lines.join("\n")}\n`;
}

function renderAdminPlanMarkdown(report) {
  const lines = [
    "# Piano admin prodotto lossless",
    "",
    "## Flusso dati",
    "",
    "`WordPress original → snapshot immutabile → current value → proposta AI per singolo campo → accetta/scarta → current value approvato → Shopify`",
    "",
    "## Schema futuro proposto",
    "",
    "### product_import_batches",
    "",
    "Traccia file, hash, stato audit/import, conteggi, autore e timestamp. Non contiene dati prodotto modificabili.",
    "",
    "### product_source_snapshots",
    "",
    "- `id uuid primary key`",
    "- `batch_id uuid not null`",
    "- `source_file text not null`",
    "- `source_row_number integer not null`",
    "- `source_hash text not null`",
    "- `source_sku text`",
    "- `raw_row jsonb not null` con ogni colonna originale",
    "- `imported_at timestamptz not null`",
    "- policy append-only: vietare UPDATE e DELETE applicativi",
    "- unique consigliata: `(batch_id, source_file, source_row_number, source_hash)`",
    "",
    "### product_current_values",
    "",
    "Contiene un valore corrente per campo e prodotto, con riferimento allo snapshot da cui deriva, stato approvazione, versione e lock per i campi protetti. Separare i campi indicizzati principali da un contenitore JSONB per campi dinamici.",
    "",
    "### product_ai_suggestions",
    "",
    "Una proposta per singolo campo: `product_id`, `field_key`, `source_value`, `suggested_value`, `status pending|accepted|rejected`, modello/prompt/versione, autore decisione e timestamp. L'accettazione crea storia e aggiorna solo il current value del campo.",
    "",
    "### product_field_history",
    "",
    "Registro append-only delle transizioni campo-per-campo: valore precedente, nuovo valore, origine (`source`, `manual`, `ai_accepted`, `restore_source`), utente e timestamp.",
    "",
    "## Strategia admin field-by-field",
    "",
    "Per ogni campo mostrare: valore WordPress originale, valore corrente, stato/provenienza, eventuale conflitto sorgente, cronologia e azioni consentite. I JSON raw restano disponibili all'audit tecnico ma non vengono mostrati come editor principale.",
    "",
    "Azioni:",
    "",
    "- `Ripristina originale WordPress` per campi modificabili.",
    "- `Migliora con AI` solo per campi editoriali.",
    "- `Accetta` e `Scarta` sulla proposta separata.",
    "- Confronto sorgenti per `SOURCE_CONFLICT` senza selezione automatica.",
    "- Campi strutturali in sola lettura o modifica manuale privilegiata.",
    "",
    "## Configurazione AI field-by-field",
    "",
    "AI consentita: `Nome/title`, `Breve descrizione`, `Descrizione`, `Nota di acquisto`, `Testo del pulsante`, SEO title/description futuri, FAQ, testi cura/botanica/promo/curiosità quando disponibili.",
    "",
    "AI vietata: SKU, Woo ID, Shopify ID, tipo record, prezzo, stock, peso/dimensioni, immagini, parent, relazioni variante, shipping class, tax, categorie sorgente, GTIN/EAN, attributi tecnici.",
    "",
    "`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia` e `curiosita` devono essere protetti dall'import distruttivo. `curiosita` può ricevere una proposta AI solo senza sovrascrittura automatica.",
    "",
    "## Golden dataset (20 SKU)",
    "",
    "| SKU | Titolo | Tipo | Categorie | Motivo |",
    "|---|---|---|---|---|",
    ...report.goldenDataset.map((item) => `| ${markdownEscape(item.sku)} | ${markdownEscape(truncate(item.title, 100))} | ${item.type} | ${markdownEscape(item.categories.join("; "))} | ${markdownEscape(item.reasons.join("; "))} |`),
    "",
    "Criteri richiesti ma non disponibili negli export: prodotti con colonne ACF esplicite e prodotti con `SOURCE_CONFLICT`. Non sono stati inventati sostituti per questi due casi.",
    "",
    "## Decisioni aperte prima dell'importer",
    "",
    "- Approvare source precedence e regole per i conflitti.",
    "- Definire il mapping finale categorie WooCommerce → Shopify Collections.",
    "- Definire la gestione dei parent senza SKU o delle variation orfane, se presenti.",
    "- Confermare quali campi dinamici meritano colonne indicizzate oltre al `raw_row`.",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const files = (await fs.readdir(RAW_DIR)).filter((name) => name.toLowerCase().endsWith(".csv")).sort();
  if (!files.length) throw new Error(`Nessun CSV trovato in ${RAW_DIR}`);
  const fileAudits = [];
  for (const file of files) fileAudits.push(await analyzeFile(path.join(RAW_DIR, file)));
  const records = buildRecords(fileAudits);
  const unionHeaders = [...new Set(fileAudits.flatMap((file) => file.headers))];
  const fieldMap = buildFieldMap(fileAudits, unionHeaders);
  const conflicts = buildConflicts(records, unionHeaders);
  const relations = relationAudit(records);
  const repeatedSkus = new Set(relations.duplicateRows.map((item) => item.sku));
  const conflictSkus = new Set(conflicts.details.filter((item) => item.classification === "SOURCE_CONFLICT").map((item) => item.sku));
  const categories = [...new Set(records.flatMap((record) => record.categories))].sort();
  const categoryMatrix = records.filter((record) => record.sku && record.categories.length).map((record) => ({ sku: record.sku, categories: record.categories, hierarchies: record.categories.map((category) => category.split(" > ").map((level) => level.trim())), sourceFile: record.file, sourceRowNumber: record.rowNumber }));
  const customFields = unionHeaders.map((field) => ({ field, group: classifyCustomField(field) })).filter((item) => item.group);
  const typeCounts = records.reduce((accumulator, record) => { accumulator[record.type] = (accumulator[record.type] || 0) + 1; return accumulator; }, { simple: 0, parent: 0, variation: 0, unknown: 0 });
  const baselineCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const branch = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim();
  const report = {
    generatedAt: new Date().toISOString(),
    baselineCommit,
    branch,
    summary: { fileCount: fileAudits.length, totalRows: records.length, uniqueSkus: new Set(records.map((record) => record.sku).filter(Boolean)).size, typeCounts, uniqueColumns: unionHeaders.length, uniqueCategories: categories.length },
    files: fileAudits.map(({ objects, semanticHeaders, ...file }) => file),
    fieldMap, categories, categoryMatrix, customFields, conflicts, relations,
    sourceRoles: proposeSourceRoles(fileAudits),
    goldenDataset: buildGoldenDataset(records, repeatedSkus, conflictSkus),
  };

  const failures = [];
  if (fileAudits.length !== 8) failures.push(`Attesi 8 CSV, trovati ${fileAudits.length}`);
  for (const file of fileAudits) {
    if (file.parseErrors.length) failures.push(`${file.filename}: ${file.parseErrors.length} errori parsing`);
    if (!file.roundTripPassed) failures.push(`${file.filename}: round-trip non lossless`);
  }
  if (failures.length) throw new Error(failures.join("\n"));

  if (!CHECK_ONLY) {
    await fs.mkdir(DOCS_DIR, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(DOCS_DIR, "wordpress-import-audit.md"), renderAuditMarkdown(report), "utf8"),
      fs.writeFile(path.join(DOCS_DIR, "wordpress-master-field-map.md"), renderFieldMapMarkdown(fieldMap), "utf8"),
      fs.writeFile(path.join(DOCS_DIR, "wordpress-source-conflicts.md"), renderConflictsMarkdown(report), "utf8"),
      fs.writeFile(path.join(DOCS_DIR, "wordpress-admin-product-plan.md"), renderAdminPlanMarkdown(report), "utf8"),
      fs.writeFile(path.join(DOCS_DIR, "wordpress-import-audit-data.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    ]);
  }

  console.log(JSON.stringify({ success: true, checkOnly: CHECK_ONLY, summary: report.summary, conflicts: report.conflicts.summary, repeatedSkuCount: report.conflicts.repeatedSkuCount, relationIssues: { orphanVariations: relations.orphanVariations.length, inconsistentParents: relations.inconsistentParents.length, duplicateRows: relations.duplicateRows.length, variationsWithoutSku: relations.variationsWithoutSku.length, parentsWithoutSku: relations.parentsWithoutSku.length, nonSkuParentReferences: relations.nonSkuParentReferences.length }, roundTrip: `${fileAudits.filter((file) => file.roundTripPassed).length}/${fileAudits.length}` }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
