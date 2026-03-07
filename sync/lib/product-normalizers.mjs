export function safeString(value) {
  return String(value ?? "").trim();
}

export function normalizeWhitespace(value) {
  return safeString(value).replace(/\s+/g, " ").trim();
}

export function pick(row, names) {
  for (const name of names) {
    const value = row?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

export function splitMultiValueField(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseImages(value) {
  return splitMultiValueField(value).filter((url) => /^https?:\/\//i.test(url));
}

export function parseTags(value) {
  return splitMultiValueField(value);
}

export function parseCategories(value) {
  return splitMultiValueField(value);
}

export function toBoolean(value, fallback = false) {
  const s = String(value || "").toLowerCase().trim();
  if (!s) return fallback;
  return ["1", "true", "yes", "si", "sì"].includes(s);
}

export function normalizePrice(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const canonical = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const num = Number(canonical);
  if (Number.isNaN(num)) return "";
  return num.toFixed(2);
}

export function toInteger(value, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const parsed = parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function slugifyHandle(value) {
  const slug = safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "";
}

export function kgToGrams(value) {
  const s = safeString(value);
  if (!s) return "";
  const n = Number(s.replace(",", "."));
  if (Number.isNaN(n)) return "";
  return Math.round(n * 1000);
}

export function normalizeInventoryPolicy(stockStatus, backorders) {
  const inStock = toBoolean(stockStatus, false);
  const allowBackorders = toBoolean(backorders, false);
  if (allowBackorders) return "continue";
  return inStock ? "deny" : "deny";
}

export function pickBestDescription(fullHtml, shortHtml) {
  const full = safeString(fullHtml);
  const short = safeString(shortHtml);
  if (full) return full;
  if (short) return `<p>${short}</p>`;
  return "";
}

export function normalizeWooProduct(rawRow, options = {}) {
  const defaultVendor = options.defaultVendor || "Online Garden";
  const sourceRowNumber = Number(rawRow.__rowNumber || 0);
  const sourceType = pick(rawRow, ["Tipo", "Type"]).toLowerCase();
  const title = normalizeWhitespace(pick(rawRow, ["Nome", "Name", "Title"]));
  const handleCandidate = slugifyHandle(pick(rawRow, ["Slug", "Permalink", "URL handle", "Nome", "Name"]));
  const shortDescription = safeString(pick(rawRow, ["Breve descrizione", "Short description"]));
  const descriptionHtml = pickBestDescription(pick(rawRow, ["Descrizione", "Description"]), shortDescription);
  const sku = safeString(pick(rawRow, ["SKU"]));
  const barcode = safeString(pick(rawRow, ["GTIN, UPC, EAN, o ISBN", "GTIN, UPC, EAN, or ISBN", "EAN"]));
  const vendor = safeString(pick(rawRow, ["Marchi", "Brand", "Vendor"])) || defaultVendor;
  const categories = parseCategories(pick(rawRow, ["Categorie", "Categories"]));
  const tags = parseTags(pick(rawRow, ["Tag", "Tags"]));
  const images = parseImages(pick(rawRow, ["Immagini", "Immagine", "Images", "Image"]));

  const regularPrice = normalizePrice(pick(rawRow, ["Prezzo di listino", "Regular price"]));
  const salePrice = normalizePrice(pick(rawRow, ["Prezzo in offerta", "Sale price"]));
  const price = salePrice || regularPrice;
  const compareAtPrice = salePrice && regularPrice ? regularPrice : "";

  const inventoryQuantity = toInteger(pick(rawRow, ["Magazzino", "Stock", "Quantità in magazzino"]));
  const stockStatus = pick(rawRow, ["In stock?", "In stock"]);
  const backorders = pick(rawRow, ["Abilita gli ordini arretrati?", "Backorders allowed?"]);
  const continueSelling = normalizeInventoryPolicy(stockStatus, backorders);
  const weightGrams = kgToGrams(pick(rawRow, ["Peso (kg)", "Weight (kg)"]));
  const requiresShipping = !sourceType.includes("virtual") && !sourceType.includes("gift_card");
  const taxCode = "";
  const chargeTax = pick(rawRow, ["Stato delle imposte", "Tax status"]).toLowerCase() !== "none";

  const attributes = {
    exposure: pick(rawRow, ["Meta: esposizione_pianta_acf", "Meta: _esposizione_pianta_acf"]),
    soil: pick(rawRow, ["Meta: tipo_terreno_acf", "Meta: _tipo_terreno_acf"]),
    watering: pick(rawRow, ["Meta: irrigazione_acf", "Meta: _irrigazione_acf", "Meta: _qta_acqua_acf"]),
    petSafe: pick(rawRow, ["Meta: tossicita_per_animali_acf", "Meta: _tossicita_per_animali_acf"]),
    heightCm: pick(rawRow, ["Meta: altezza_massima_pianta_acf", "Meta: _altezza_massima_pianta_acf"]),
    option1Name: pick(rawRow, ["Nome dell'attributo 1", "Attribute 1 name"]),
    option1Value: pick(rawRow, ["Valore dell'attributo 1", "Attribute 1 value(s)"]),
    option2Name: pick(rawRow, ["Nome dell'attributo 2", "Attribute 2 name"]),
    option2Value: pick(rawRow, ["Valore dell'attributo 2", "Attribute 2 value(s)"]),
    option3Name: pick(rawRow, ["Nome dell'attributo 3", "Attribute 3 name"]),
    option3Value: pick(rawRow, ["Valore dell'attributo 3", "Attribute 3 value(s)"]),
    parentReference: pick(rawRow, ["Genitore", "Parent"]),
  };

  return {
    sourceRowNumber,
    sourceType,
    title,
    handleCandidate,
    descriptionHtml,
    shortDescription,
    sku,
    barcode,
    vendor,
    categories,
    tags,
    images,
    price,
    compareAtPrice,
    inventoryQuantity,
    continueSelling,
    weightGrams,
    requiresShipping,
    taxCode,
    chargeTax,
    attributes,
    raw: rawRow,
  };
}
