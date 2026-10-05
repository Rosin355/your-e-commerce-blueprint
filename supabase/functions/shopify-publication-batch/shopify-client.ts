// deno-lint-ignore-file no-explicit-any
import { shopifyAdminGraphQLAtVersion } from "../_shared/shopify-admin-client.ts";
import {
  PUBLICATION_API_VERSION,
  type PublicationLiveProduct,
  type PublicationShopifyClient,
} from "./types.ts";

const READ_PUBLICATION = `
query PublicationIdentity($id: ID!) {
  publication(id: $id) { id name }
}`;

const READ_PRODUCT = `
query PublicationProduct($id: ID!, $locationId: ID!) {
  product(id: $id) {
    id title handle descriptionHtml status
    variantsCount { count }
    mediaCount { count }
    options { name values }
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
      nodes { isPublished publication { id name } }
    }
  }
}`;

const SET_ACTIVE = `
mutation PublicationSetActive($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id status }
    userErrors { field message }
  }
}`;

const PUBLISH_ONLINE_STORE = `
mutation PublicationOnlineStore(
  $id: ID!,
  $input: [PublicationInput!]!,
  $publicationId: ID!
) {
  publishablePublish(id: $id, input: $input) {
    publishable { publishedOnPublication(publicationId: $publicationId) }
    userErrors { field message }
  }
}`;

function graphql<T>(query: string, variables: Record<string, unknown>) {
  return shopifyAdminGraphQLAtVersion<T>(
    PUBLICATION_API_VERSION,
    query,
    variables,
  );
}

function assertNoErrors(
  errors: Array<{ message: string }> | undefined,
  operation: string,
) {
  if (!errors?.length) return;
  throw new Error(
    `${operation}: ${errors.map((error) => error.message).join(" | ")}`,
  );
}

function productState(value: any): PublicationLiveProduct {
  return {
    id: value.id,
    title: value.title,
    handle: value.handle,
    descriptionHtml: value.descriptionHtml,
    status: value.status,
    options: (value.options ?? []).map((option: any) => ({
      name: option.name,
      values: option.values ?? [],
    })),
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

export class AdminGraphqlPublicationClient implements PublicationShopifyClient {
  constructor(private locationId = "gid://shopify/Location/117678014804") {}

  async readPublication(publicationId: string) {
    const data = await graphql<any>(READ_PUBLICATION, { id: publicationId });
    return data.publication ?? null;
  }

  async readProduct(productId: string) {
    const data = await graphql<any>(READ_PRODUCT, {
      id: productId,
      locationId: this.locationId,
    });
    return data.product ? productState(data.product) : null;
  }

  async activateProduct(productId: string) {
    const data = await graphql<any>(SET_ACTIVE, {
      product: { id: productId, status: "ACTIVE" },
    });
    assertNoErrors(data.productUpdate?.userErrors, "productUpdate.status");
    if (
      data.productUpdate?.product?.id !== productId ||
      data.productUpdate?.product?.status !== "ACTIVE"
    ) {
      throw new Error("ACTIVATION_CONFIRMATION_FAILED");
    }
  }

  async publishProduct(productId: string, publicationId: string) {
    const data = await graphql<any>(PUBLISH_ONLINE_STORE, {
      id: productId,
      input: [{ publicationId }],
      publicationId,
    });
    assertNoErrors(data.publishablePublish?.userErrors, "publishablePublish");
    if (data.publishablePublish?.publishable?.publishedOnPublication !== true) {
      throw new Error("PUBLICATION_CONFIRMATION_FAILED");
    }
  }
}
