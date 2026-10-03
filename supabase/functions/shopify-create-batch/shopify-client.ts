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
  type ShopifyMediaIdentity,
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
  id handle title descriptionHtml status
  variantsCount { count }
  mediaCount { count }
  options { name values }
  variants(first: 100) {
    nodes {
      id sku price inventoryPolicy
      selectedOptions { name value }
      inventoryItem {
        id tracked
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) { name quantity }
        }
      }
      product { id handle }
    }
  }
  media(first: 100) { nodes { id alt status mediaContentType } }
`;

const FIND_PRODUCT = `
query CreateIdentity(
  $identifier: ProductIdentifierInput!,
  $variantQuery: String!,
  $locationId: ID!
) {
  product: productByIdentifier(identifier: $identifier) { ${PRODUCT_FIELDS} }
  productVariants(first: 100, query: $variantQuery) {
    nodes {
      id sku price inventoryPolicy selectedOptions { name value }
      inventoryItem {
        id tracked
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) { name quantity }
        }
      }
      product { id handle title options { name values } }
    }
  }
}`;

const FIND_VARIANTS = `
query CreateVariantsBySku($query: String!, $locationId: ID!) {
  productVariants(first: 100, query: $query) {
    nodes {
      id sku price inventoryPolicy selectedOptions { name value }
      inventoryItem {
        id tracked
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) { name quantity }
        }
      }
      product { id handle }
    }
  }
}`;

const CREATE_PRODUCT = `
mutation CreateProductShell($product: ProductCreateInput!, $locationId: ID!) {
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

const GET_MEDIA = `
query VerifyProductMedia($id: ID!) {
  product(id: $id) {
    id
    media(first: 100) { nodes { id alt status mediaContentType } }
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
query VerifyCreatedProduct($id: ID!, $locationId: ID!) {
  product(id: $id) { ${PRODUCT_FIELDS} }
}`;

function searchQuery(skus: string[]): string {
  return skus.map((sku) => `sku:${JSON.stringify(sku)}`).join(" OR ");
}

function variantIdentity(
  value: {
    id: string;
    sku: string | null;
    price: string;
    inventoryPolicy: "DENY" | "CONTINUE";
    inventoryItem: {
      id: string;
      tracked: boolean;
      inventoryLevel: {
        quantities: Array<{ name: string; quantity: number }>;
      } | null;
    };
    selectedOptions: CreateOptionValue[];
    product: { id: string; handle: string };
  },
): ShopifyVariantIdentity {
  const available = value.inventoryItem.inventoryLevel?.quantities.find(
    (entry) => entry.name === "available",
  )?.quantity ?? null;
  return {
    id: value.id,
    sku: value.sku ?? "",
    productId: value.product.id,
    productHandle: value.product.handle,
    inventoryItemId: value.inventoryItem.id,
    price: value.price,
    tracked: value.inventoryItem.tracked,
    inventoryPolicy: value.inventoryPolicy,
    available,
    selectedOptions: value.selectedOptions,
  };
}

function mediaIdentity(value: {
  id: string;
  alt: string | null;
  status: ShopifyMediaIdentity["status"];
  mediaContentType: string;
}): ShopifyMediaIdentity {
  return {
    id: value.id,
    alt: value.alt ?? "",
    status: value.status,
    mediaContentType: value.mediaContentType,
  };
}

function productIdentity(value: any): ShopifyProductIdentity {
  return {
    id: value.id,
    handle: value.handle,
    title: value.title,
    descriptionHtml: value.descriptionHtml,
    status: value.status,
    options: (value.options ?? []).map((entry: any) => ({
      name: entry.name,
      values: entry.values ?? [],
    })),
    variantCount: value.variantsCount?.count ?? 0,
    variants: (value.variants?.nodes ?? []).map(variantIdentity),
    mediaCount: value.mediaCount?.count ?? 0,
    media: (value.media?.nodes ?? []).map(mediaIdentity),
  };
}

export class AdminGraphqlCreateClient implements ShopifyCreateClient {
  async findProduct(family: CreateFamily) {
    const data = await graphql<any>(FIND_PRODUCT, {
      identifier: { handle: family.handle },
      variantQuery: searchQuery(family.variants.map((entry) => entry.sku)),
      locationId: SHOPIFY_CREATE_LOCATION_ID,
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
      locationId: SHOPIFY_CREATE_LOCATION_ID,
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
    const existing = await graphql<any>(VERIFY_PRODUCT, {
      id: productId,
      locationId: SHOPIFY_CREATE_LOCATION_ID,
    });
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
      locationId: SHOPIFY_CREATE_LOCATION_ID,
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
    if (media.length === 0) return [];
    const data = await graphql<any>(ATTACH_MEDIA, {
      product: { id: productId },
      media: media.map((entry) => ({
        originalSource: entry.originalSource,
        alt: entry.alt,
        mediaContentType: "IMAGE",
      })),
    });
    assertNoErrors(data.productUpdate?.userErrors, "productUpdate.media");
    const expectedAlts = new Set(media.map((entry) => entry.alt));
    const nodes: ShopifyMediaIdentity[] = (
      data.productUpdate?.product?.media?.nodes ?? []
    ).map(mediaIdentity).filter((entry: ShopifyMediaIdentity) =>
      expectedAlts.has(entry.alt)
    );
    if (nodes.length !== media.length) {
      throw new ShopifyCreateError(
        "MEDIA_CONFIRMATION_FAILED",
        "Shopify non ha restituito gli ID di tutti i media approvati",
      );
    }
    return nodes;
  }

  async getMedia(productId: string, mediaIds: string[]) {
    const data = await graphql<any>(GET_MEDIA, { id: productId });
    if (!data.product) {
      throw new ShopifyCreateError(
        "PRODUCT_VERIFICATION_FAILED",
        "Prodotto non trovato durante la verifica media",
      );
    }
    const expectedIds = new Set(mediaIds);
    return (data.product.media?.nodes ?? []).map(mediaIdentity).filter(
      (entry: ShopifyMediaIdentity) => expectedIds.has(entry.id),
    );
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

  async verifyProduct(productId: string, _family: CreateFamily) {
    const data = await graphql<any>(VERIFY_PRODUCT, {
      id: productId,
      locationId: SHOPIFY_CREATE_LOCATION_ID,
    });
    if (!data.product) {
      throw new ShopifyCreateError(
        "PRODUCT_VERIFICATION_FAILED",
        "Prodotto Shopify non trovato dopo la creazione",
      );
    }
    return productIdentity(data.product);
  }
}
