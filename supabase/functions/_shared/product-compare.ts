import type {
  ComparisonResult,
  CsvProductRow,
  ShopifyProductSnapshot,
  ShopifyVariantSnapshot,
} from "./product-sync-types.ts";

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizePrice(value: unknown): string {
  const num = Number.parseFloat(String(value ?? "0").replace(",", "."));
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}

function normalizeTags(tags: string[] = []): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function equalTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => entry === b[index]);
}

function safeDescription(value: string | null | undefined): string {
  return normalizeString(value).replace(/\s+/g, " ");
}

function compareVariant(variant: ShopifyVariantSnapshot, csvRow: CsvProductRow): ComparisonResult {
  const changedFields: string[] = [];
  const variantInput: Record<string, unknown> = { id: variant.id };
  let inventoryQuantity: number | undefined;

  if (csvRow.price !== undefined && normalizePrice(variant.price) !== normalizePrice(csvRow.price)) {
    variantInput.price = normalizePrice(csvRow.price);
    changedFields.push("price");
  }

  if (
    csvRow.compareAtPrice !== undefined &&
    normalizePrice(variant.compareAtPrice) !== normalizePrice(csvRow.compareAtPrice)
  ) {
    variantInput.compareAtPrice = normalizePrice(csvRow.compareAtPrice);
    changedFields.push("compareAtPrice");
  }

  if (csvRow.barcode !== undefined && normalizeString(variant.barcode) !== normalizeString(csvRow.barcode)) {
    variantInput.barcode = normalizeString(csvRow.barcode);
    changedFields.push("barcode");
  }

  if (csvRow.weight !== undefined) {
    const currentWeight = Number(variant.weight ?? 0);
    if (Math.abs(currentWeight - csvRow.weight) > 0.0001) {
      variantInput.inventoryItem = {
        measurement: {
          weight: {
            value: Number(csvRow.weight),
            unit: variant.weightUnit || "GRAMS",
          },
        },
      };
      changedFields.push("weight");
    }
  }

  if (csvRow.inventoryQuantity !== undefined && variant.inventoryQuantity !== csvRow.inventoryQuantity) {
    inventoryQuantity = csvRow.inventoryQuantity;
    changedFields.push("inventoryQuantity");
  }

  return {
    needsUpdate: changedFields.length > 0,
    fieldsToUpdate: {
      variantInput,
      inventoryQuantity,
    },
    changedFields,
  };
}

export function compareProducts(
  shopifyProduct: ShopifyProductSnapshot,
  csvProduct: CsvProductRow,
  variant?: ShopifyVariantSnapshot,
): ComparisonResult {
  const changedFields: string[] = [];
  const productInput: Record<string, unknown> = { id: shopifyProduct.id };

  if (csvProduct.title && normalizeString(shopifyProduct.title) !== normalizeString(csvProduct.title)) {
    productInput.title = normalizeString(csvProduct.title);
    changedFields.push("title");
  }

  if (
    csvProduct.description !== undefined &&
    safeDescription(shopifyProduct.descriptionHtml) !== safeDescription(csvProduct.description)
  ) {
    productInput.descriptionHtml = csvProduct.description;
    changedFields.push("description");
  }

  if (csvProduct.tags && csvProduct.tags.length > 0) {
    const currentTags = normalizeTags(shopifyProduct.tags);
    const incomingTags = normalizeTags(csvProduct.tags);
    if (!equalTags(currentTags, incomingTags)) {
      productInput.tags = incomingTags;
      changedFields.push("tags");
    }
  }

  if (csvProduct.productCategoryId) {
    if (normalizeString(shopifyProduct.productCategoryId) !== normalizeString(csvProduct.productCategoryId)) {
      productInput.productCategory = { productTaxonomyNodeId: csvProduct.productCategoryId };
      changedFields.push("productCategory");
    }
  } else if (
    csvProduct.productCategory &&
    normalizeString(shopifyProduct.productCategoryName) !== normalizeString(csvProduct.productCategory)
  ) {
    changedFields.push("productCategory_unresolved");
  }

  const result: ComparisonResult = {
    needsUpdate: changedFields.length > 0,
    fieldsToUpdate: {
      productInput: Object.keys(productInput).length > 1 ? productInput : undefined,
    },
    changedFields,
  };

  if (!variant) {
    return result;
  }

  const variantResult = compareVariant(variant, csvProduct);
  return {
    needsUpdate: result.needsUpdate || variantResult.needsUpdate,
    fieldsToUpdate: {
      productInput: result.fieldsToUpdate.productInput,
      variantInput: variantResult.fieldsToUpdate.variantInput,
      inventoryQuantity: variantResult.fieldsToUpdate.inventoryQuantity,
    },
    changedFields: [...result.changedFields, ...variantResult.changedFields],
  };
}
