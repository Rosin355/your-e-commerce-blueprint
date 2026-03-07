const TECH_TAGS = ["woo-import", "legacy-onlinegarden-products"];

export function pick(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== "") {
      return String(row[name]).trim();
    }
  }
  return "";
}

export function toDecimalString(value) {
  if (!value) return "";
  const normalized = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const num = Number(normalized);
  if (Number.isNaN(num)) return "";
  return num.toFixed(2);
}

export function toInt(value, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const parsed = parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function boolToCsv(value) {
  const s = String(value || "").toLowerCase().trim();
  return ["1", "true", "yes", "si", "sì"].includes(s) ? "TRUE" : "FALSE";
}

export function splitImages(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

export function sanitizeHandle(value, fallback, taken) {
  let base = (value || fallback || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) base = "product";
  if (!taken) return base;
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  const out = `${base}-${i}`;
  taken.add(out);
  return out;
}

export function mergeTags({ categories, tags, extra = [] }) {
  const list = [];
  for (const source of [categories, tags]) {
    list.push(
      ...String(source || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  list.push(...TECH_TAGS, ...extra.filter(Boolean));
  return [...new Set(list)].join(", ");
}

export function mapPublishedAndStatus(row) {
  const published = pick(row, ["Pubblicato", "Published"]);
  if (published === "1") {
    return { publishedOnOnlineStore: "FALSE", status: "Draft" };
  }
  return { publishedOnOnlineStore: "FALSE", status: "Draft" };
}

export function extractWooFields(row) {
  const type = pick(row, ["Tipo", "Type"]).toLowerCase();
  return {
    type,
    id: pick(row, ["ID", "Id"]),
    title: pick(row, ["Nome", "Name"]),
    shortDescription: pick(row, ["Breve descrizione", "Short description"]),
    descriptionHtml: pick(row, ["Descrizione", "Description"]),
    sku: pick(row, ["SKU"]),
    barcode: pick(row, ["GTIN, UPC, EAN, o ISBN", "GTIN, UPC, EAN, or ISBN", "EAN"]),
    regularPrice: toDecimalString(pick(row, ["Prezzo di listino", "Regular price"])),
    salePrice: toDecimalString(pick(row, ["Prezzo in offerta", "Sale price"])),
    categories: pick(row, ["Categorie", "Categories"]),
    tags: pick(row, ["Tag", "Tags"]),
    brand: pick(row, ["Marchi", "Brand"]),
    parentSku: pick(row, ["Genitore", "Parent"]),
    stock: toInt(pick(row, ["Magazzino", "Stock"])),
    inStock: boolToCsv(pick(row, ["In stock?", "In stock"])),
    backorders: boolToCsv(pick(row, ["Abilita gli ordini arretrati?", "Backorders allowed?"])),
    taxStatus: pick(row, ["Stato delle imposte", "Tax status"]),
    weightKg: pick(row, ["Peso (kg)", "Weight (kg)"]),
    images: splitImages(pick(row, ["Immagine", "Immagini", "Images", "Image"])),
    option1Name: pick(row, ["Nome dell'attributo 1", "Attribute 1 name"]),
    option1Value: pick(row, ["Valore dell'attributo 1", "Attribute 1 value(s)"]),
    option2Name: pick(row, ["Nome dell'attributo 2", "Attribute 2 name"]),
    option2Value: pick(row, ["Valore dell'attributo 2", "Attribute 2 value(s)"]),
    option3Name: pick(row, ["Nome dell'attributo 3", "Attribute 3 name"]),
    option3Value: pick(row, ["Valore dell'attributo 3", "Attribute 3 value(s)"]),
    yoastTitle: pick(row, ["Meta: _yoast_wpseo_title"]),
    yoastDescription: pick(row, ["Meta: _yoast_wpseo_metadesc"]),
    exposure: pick(row, ["Meta: esposizione_pianta_acf", "Meta: _esposizione_pianta_acf"]),
    soil: pick(row, ["Meta: tipo_terreno_acf", "Meta: _tipo_terreno_acf"]),
    watering: pick(row, ["Meta: irrigazione_acf", "Meta: _irrigazione_acf", "Meta: _qta_acqua_acf"]),
    petSafe: pick(row, ["Meta: tossicita_per_animali_acf", "Meta: _tossicita_per_animali_acf"]),
    heightCm: pick(row, ["Meta: altezza_massima_pianta_acf", "Meta: _altezza_massima_pianta_acf"]),
  };
}

export function gramsFromKg(weightKg) {
  if (!weightKg) return "";
  const kg = Number(String(weightKg).replace(",", "."));
  if (Number.isNaN(kg)) return "";
  return String(Math.round(kg * 1000));
}
