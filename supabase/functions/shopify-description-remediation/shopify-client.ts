// deno-lint-ignore-file no-explicit-any
import { shopifyAdminGraphQLAtVersion } from "../_shared/shopify-admin-client.ts";
import {
  REMEDIATION_API_VERSION,
  type RemediationProductState,
  type RemediationShopifyClient,
} from "./types.ts";

const READ_PRODUCT = `
query RemediationReadProduct($id: ID!, $locationId: ID!) {
  product(id: $id) {
    id title handle descriptionHtml status
    variantsCount { count }
    mediaCount { count }
    variants(first: 100) {
      nodes {
        id sku price inventoryPolicy selectedOptions { name value }
        inventoryItem {
          id tracked
          inventoryLevel(locationId: $locationId) {
            quantities(names: ["available"]) { name quantity }
          }
        }
      }
    }
    media(first: 100) { nodes { id alt status mediaContentType } }
    resourcePublicationsV2(first: 100) {
      nodes { isPublished publication { id } }
    }
  }
}`;

const UPDATE_DESCRIPTION = `
mutation RemediateDescription($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id descriptionHtml }
    userErrors { field message }
  }
}`;

function graphql<T>(query: string, variables: Record<string, unknown>) {
  return shopifyAdminGraphQLAtVersion<T>(
    REMEDIATION_API_VERSION,
    query,
    variables,
  );
}

function assertNoErrors(errors: Array<{ message: string }> | undefined) {
  if (!errors?.length) return;
  throw new Error(
    `ITEM_SHOPIFY_ERROR: ${errors.map((e) => e.message).join(" | ")}`,
  );
}

function productState(value: any): RemediationProductState {
  return {
    id: value.id,
    title: value.title,
    handle: value.handle,
    descriptionHtml: value.descriptionHtml,
    status: value.status,
    variantCount: value.variantsCount?.count ?? 0,
    variants: (value.variants?.nodes ?? []).map((variant: any) => ({
      id: variant.id,
      sku: variant.sku ?? "",
      price: variant.price,
      inventoryItemId: variant.inventoryItem?.id ?? "",
      tracked: variant.inventoryItem?.tracked === true,
      inventoryPolicy: variant.inventoryPolicy,
      available: variant.inventoryItem?.inventoryLevel?.quantities?.find(
        (quantity: any) => quantity.name === "available",
      )?.quantity ?? null,
      selectedOptions: variant.selectedOptions ?? [],
    })),
    mediaCount: value.mediaCount?.count ?? 0,
    media: (value.media?.nodes ?? []).map((media: any) => ({
      id: media.id,
      alt: media.alt ?? "",
      status: media.status,
      mediaContentType: media.mediaContentType,
    })),
    publicationIds: (value.resourcePublicationsV2?.nodes ?? [])
      .filter((entry: any) => entry.isPublished)
      .map((entry: any) => entry.publication.id),
    scheduledPublicationIds: (value.resourcePublicationsV2?.nodes ?? [])
      .filter((entry: any) => !entry.isPublished)
      .map((entry: any) => entry.publication.id),
  };
}

export class AdminGraphqlRemediationClient implements RemediationShopifyClient {
  constructor(
    private locationId = "gid://shopify/Location/117678014804",
  ) {}

  async readProduct(productId: string) {
    const data = await graphql<any>(READ_PRODUCT, {
      id: productId,
      locationId: this.locationId,
    });
    return data.product ? productState(data.product) : null;
  }

  async updateDescription(productId: string, descriptionHtml: string) {
    const data = await graphql<any>(UPDATE_DESCRIPTION, {
      product: { id: productId, descriptionHtml },
    });
    assertNoErrors(data.productUpdate?.userErrors);
    if (data.productUpdate?.product?.id !== productId) {
      throw new Error("DESCRIPTION_UPDATE_CONFIRMATION_FAILED");
    }
  }
}
