// deno-lint-ignore-file no-explicit-any
import { shopifyAdminGraphQLAtVersion } from "../_shared/shopify-admin-client.ts";
import {
  type CreatedVariant,
  type CreateFamily,
  type CreateMedia,
  type CreateOptionValue,
  type CreateVariant,
  SHOPIFY_CREATE_API_VERSION,
  SHOPIFY_CREATE_LOCATION_ID,
  SHOPIFY_CREATE_STOCK_TARGET,
  type ShopifyCreateClient,
  type ShopifyProductIdentity,
  type ShopifyVariantIdentity,
} from "./types.ts";

type UserError = { code?: string; field?: string[]; message: string };

export class ShopifyCreateError extends Error {
  constructor(
    public code: string,
    message: string,
    public systemic = false,
    public createdVariants: CreatedVariant[] = [],
  ) {
    super(message);
  }
}

function graphql<T>(query: string, variables: Record<string, unknown>) {
  return shopifyAdminGraphQLAtVersion<T>(
    SHOPIFY_CREATE_API_VERSION,
    query,
    variables,
  );
}

function assertNoErrors(errors: UserError[] | undefined, operation: string) {
  if (!errors?.length) return;
  const detail = errors.map((entry) =>
    `${entry.code ? `${entry.code}:` : ""}${entry.message}`
  ).join(" | ");
  const systemic =
    /access.denied|permission|scope|throttl|internal.error|service.unavailable/i
      .test(detail);
  throw new ShopifyCreateError(
    systemic ? "SYSTEMIC_SHOPIFY_ERROR" : "ITEM_SHOPIFY_ERROR",
    `${operation}: ${detail}`,
    systemic,
  );
}

const PRODUCT_FIELDS = `
  id handle title
  options { name values }
  variants(first: 100) {
    nodes {
      id sku
      selectedOptions { name value }
      inventoryItem { id }
      product { id handle }
    }
  }
`;

const FIND_PRODUCT = `
query CreateIdentity($identifier: ProductIdentifierInput!, $variantQuery: String!) {
  product: productByIdentifier(identifier: $identifier) { ${PRODUCT_FIELDS} }
  productVariants(first: 100, query: $variantQuery) {
    nodes {
      id sku selectedOptions { name value } inventoryItem { id }
      product { id handle title options { name values } }
    }
  }
}`;

const FIND_VARIANTS = `
query CreateVariantsBySku($query: String!) {
  productVariants(first: 100, query: $query) {
    nodes {
      id sku selectedOptions { name value } inventoryItem { id }
      product { id handle }
    }
  }
}`;

const CREATE_PRODUCT = `
mutation CreateProductShell($product: ProductCreateInput!) {
  productCreate(product: $product) {
    product { ${PRODUCT_FIELDS} }
    userErrors { field message }
  }
}`;

const CREATE_OPTIONS = `
mutation CreateProductOptions($productId: ID!, $options: [OptionCreateInput!]!) {
  productOptionsCreate(
    productId: $productId,
    options: $options,
    variantStrategy: LEAVE_AS_IS
  ) {
    product { id options { name values } }
    userErrors { code field message }
  }
}`;

const CREATE_VARIANTS = `
mutation CreateProductVariants(
  $productId: ID!,
  $variants: [ProductVariantsBulkInput!]!
) {
  productVariantsBulkCreate(
    productId: $productId,
    variants: $variants,
    strategy: REMOVE_STANDALONE_VARIANT
  ) {
    productVariants {
      id sku selectedOptions { name value }
      inventoryItem { id tracked }
      inventoryPolicy
    }
    userErrors { field message }
  }
}`;

const ATTACH_MEDIA = `
mutation AttachApprovedMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
  productUpdate(product: $product, media: $media) {
    product { id media(first: 100) { nodes { id alt mediaContentType status } } }
    userErrors { field message }
  }
}`;

const VERIFY_VARIANT = `
query VerifyCreatedVariant($id: ID!, $locationId: ID!) {
  productVariant(id: $id) {
    id sku inventoryPolicy selectedOptions { name value }
    product { id handle }
    inventoryItem {
      id tracked
      inventoryLevel(locationId: $locationId) {
        quantities(names: ["available"]) { name quantity }
      }
    }
  }
}`;

const VERIFY_PRODUCT = `
query VerifyCreatedProduct($id: ID!) {
  product(id: $id) { ${PRODUCT_FIELDS} }
}`;

function searchQuery(skus: string[]): string {
  return skus.map((sku) => `sku:${JSON.stringify(sku)}`).join(" OR ");
}

function variantIdentity(
  value: {
    id: string;
    sku: string | null;
    inventoryItem: { id: string };
    selectedOptions: CreateOptionValue[];
    product: { id: string; handle: string };
  },
): ShopifyVariantIdentity {
  return {
    id: value.id,
    sku: value.sku ?? "",
    productId: value.product.id,
    productHandle: value.product.handle,
    inventoryItemId: value.inventoryItem.id,
    selectedOptions: value.selectedOptions,
  };
}

function productIdentity(value: any): ShopifyProductIdentity {
  return {
    id: value.id,
    handle: value.handle,
    title: value.title,
    options: (value.options ?? []).map((entry: any) => ({
      name: entry.name,
      values: entry.values ?? [],
    })),
    variants: (value.variants?.nodes ?? []).map(variantIdentity),
  };
}

function sameOptions(
  actual: CreateOptionValue[],
  expected: CreateOptionValue[],
): boolean {
  if (actual.length !== expected.length) return false;
  const map = new Map(actual.map((entry) => [entry.name, entry.value]));
  return expected.every((entry) => map.get(entry.name) === entry.value);
}

export class AdminGraphqlCreateClient implements ShopifyCreateClient {
  async findProduct(family: CreateFamily) {
    const data = await graphql<any>(FIND_PRODUCT, {
      identifier: { handle: family.handle },
      variantQuery: searchQuery(family.variants.map((entry) => entry.sku)),
    });
    const handleProduct = data.product ? productIdentity(data.product) : null;
    const skuMatches = (data.productVariants?.nodes ?? []).map(variantIdentity);
    const productIds = new Set(skuMatches.map((entry: any) => entry.productId));
    if (productIds.size > 1) {
      return { product: null, ambiguous: true, reason: "SKU_MULTI_PRODUCT" };
    }
    if (
      handleProduct &&
      (handleProduct.title !== family.title ||
        skuMatches.some((entry: any) => entry.productId !== handleProduct.id))
    ) {
      return {
        product: null,
        ambiguous: true,
        reason: "HANDLE_OR_SKU_CONFLICT",
      };
    }
    if (handleProduct) return { product: handleProduct, ambiguous: false };
    if (skuMatches.length > 0) {
      return {
        product: null,
        ambiguous: true,
        reason: "SKU_WITHOUT_HANDLE_MATCH",
      };
    }
    return { product: null, ambiguous: false };
  }

  async createProductShell(family: CreateFamily) {
    const data = await graphql<any>(CREATE_PRODUCT, {
      product: {
        title: family.title,
        descriptionHtml: family.descriptionHtml,
        handle: family.handle,
        status: "DRAFT",
      },
    });
    assertNoErrors(data.productCreate?.userErrors, "productCreate");
    if (!data.productCreate?.product?.id) {
      throw new ShopifyCreateError(
        "PRODUCT_CONFIRMATION_MISSING",
        "Shopify non ha restituito il prodotto creato",
      );
    }
    return productIdentity(data.productCreate.product);
  }

  async createOptions(productId: string, family: CreateFamily) {
    const existing = await graphql<any>(VERIFY_PRODUCT, { id: productId });
    const actual = new Map(
      (existing.product?.options ?? []).map((entry: any) => [
        entry.name,
        new Set(entry.values ?? []),
      ]),
    );
    const required = family.optionNames.map((name) => ({
      name,
      values: [
        ...new Set(
          family.variants.map((variant) =>
            variant.optionValues.find((entry) => entry.name === name)!.value
          ),
        ),
      ],
    }));
    const alreadyExact = required.every((entry) => {
      const values = actual.get(entry.name) as Set<string> | undefined;
      return values && entry.values.every((value) => values.has(value));
    });
    if (alreadyExact) return;
    if (actual.size > 0 && !actual.has("Title")) {
      throw new ShopifyCreateError(
        "AMBIGUOUS_EXISTING_OPTIONS",
        "Le opzioni Shopify esistenti non coincidono col manifest",
      );
    }
    const data = await graphql<any>(CREATE_OPTIONS, {
      productId,
      options: required.map((entry, index) => ({
        name: entry.name,
        position: index + 1,
        values: entry.values.map((name) => ({ name })),
      })),
    });
    assertNoErrors(
      data.productOptionsCreate?.userErrors,
      "productOptionsCreate",
    );
  }

  async findVariantsBySkus(skus: string[]) {
    if (skus.length === 0) return [];
    const data = await graphql<any>(FIND_VARIANTS, {
      query: searchQuery(skus),
    });
    return (data.productVariants?.nodes ?? []).map(variantIdentity);
  }

  async createVariants(productId: string, variants: CreateVariant[]) {
    if (variants.length === 0) return [];
    const data = await graphql<any>(CREATE_VARIANTS, {
      productId,
      variants: variants.map((variant) => ({
        price: variant.price,
        inventoryPolicy: "DENY",
        inventoryItem: {
          sku: variant.sku,
          tracked: true,
          requiresShipping: true,
        },
        inventoryQuantities: [{
          locationId: SHOPIFY_CREATE_LOCATION_ID,
          availableQuantity: SHOPIFY_CREATE_STOCK_TARGET,
        }],
        optionValues: variant.optionValues.map((entry) => ({
          optionName: entry.name,
          name: entry.value,
        })),
      })),
    });
    const created: CreatedVariant[] = (data.productVariantsBulkCreate
      ?.productVariants ?? []).map((entry: any) => ({
        id: entry.id,
        sku: entry.sku,
        inventoryItemId: entry.inventoryItem.id,
        selectedOptions: entry.selectedOptions,
      }));
    try {
      assertNoErrors(
        data.productVariantsBulkCreate?.userErrors,
        "productVariantsBulkCreate",
      );
    } catch (error) {
      if (error instanceof ShopifyCreateError) error.createdVariants = created;
      throw error;
    }
    return created;
  }

  async attachMedia(productId: string, media: CreateMedia[]) {
    if (media.length === 0) return;
    const data = await graphql<any>(ATTACH_MEDIA, {
      product: { id: productId },
      media: media.map((entry) => ({
        originalSource: entry.originalSource,
        alt: entry.alt,
        mediaContentType: "IMAGE",
      })),
    });
    assertNoErrors(data.productUpdate?.userErrors, "productUpdate.media");
    const nodes = data.productUpdate?.product?.media?.nodes ?? [];
    if (
      nodes.length < media.length ||
      nodes.some((entry: any) => entry.status === "FAILED")
    ) {
      throw new ShopifyCreateError(
        "MEDIA_CONFIRMATION_FAILED",
        "Shopify non ha confermato tutti i media approvati",
      );
    }
  }

  async configureInventory(input: {
    productId: string;
    variantId: string;
    inventoryItemId: string;
    sku: string;
    requestKey: string;
  }) {
    const data = await graphql<any>(VERIFY_VARIANT, {
      id: input.variantId,
      locationId: SHOPIFY_CREATE_LOCATION_ID,
    });
    const variant = data.productVariant;
    const available = variant?.inventoryItem?.inventoryLevel?.quantities?.find(
      (entry: any) => entry.name === "available",
    )?.quantity;
    if (
      !variant || variant.product.id !== input.productId ||
      variant.sku !== input.sku ||
      variant.inventoryItem.id !== input.inventoryItemId ||
      variant.inventoryItem.tracked !== true ||
      variant.inventoryPolicy !== "DENY" ||
      available !== SHOPIFY_CREATE_STOCK_TARGET
    ) {
      throw new ShopifyCreateError(
        "INVENTORY_POSTCONDITION_FAILED",
        "Tracking, policy o quantità non conformi dopo la creazione",
      );
    }
  }

  async verifyProduct(productId: string, family: CreateFamily) {
    const data = await graphql<any>(VERIFY_PRODUCT, { id: productId });
    if (!data.product) {
      throw new ShopifyCreateError(
        "PRODUCT_VERIFICATION_FAILED",
        "Prodotto Shopify non trovato dopo la creazione",
      );
    }
    const product = productIdentity(data.product);
    if (
      product.handle !== family.handle || product.title !== family.title ||
      family.variants.some((expected) => {
        const actual = product.variants.find((entry) =>
          entry.sku === expected.sku
        );
        return !actual ||
          !sameOptions(actual.selectedOptions, expected.optionValues);
      })
    ) {
      throw new ShopifyCreateError(
        "PRODUCT_VERIFICATION_FAILED",
        "Mapping parent/varianti diverso dal manifest",
      );
    }
    return product;
  }
}
