import { shopifyAdminGraphQLAtVersion } from "../_shared/shopify-admin-client.ts";
import { Stock20Error } from "./executor.ts";
import type {
  Stock20LiveState,
  Stock20ManifestItem,
  Stock20ShopifyClient,
} from "./types.ts";

type UserError = { code?: string; field?: string[]; message: string };

const STOCK20_API_VERSION = "2026-01";

function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  return shopifyAdminGraphQLAtVersion<T>(
    STOCK20_API_VERSION,
    query,
    variables,
  );
}

const READ_STATE = `
query Stock20State($inventoryItemId: ID!, $locationId: ID!) {
  inventoryItem(id: $inventoryItemId) {
    id
    sku
    tracked
    inventoryLevel(locationId: $locationId) {
      quantities(names: ["available", "on_hand"]) { name quantity }
    }
    variant {
      id
      sku
      inventoryPolicy
      product { id }
    }
  }
}`;

const ENABLE_TRACKING = `
mutation Stock20EnableTracking($id: ID!) {
  inventoryItemUpdate(id: $id, input: { tracked: true }) {
    inventoryItem { id tracked }
    userErrors { field message }
  }
}`;

const SET_POLICY = `
mutation Stock20SetPolicy($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id inventoryPolicy }
    userErrors { field message }
  }
}`;

// 2026-01 introduce @idempotent e changeFromQuantity. Questa funzione usa
// esplicitamente tale versione, senza cambiare il default dei runtime legacy.
const SET_AVAILABLE = `
mutation Stock20SetAvailable($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
  inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
    inventoryAdjustmentGroup {
      reason
      referenceDocumentUri
      changes { name delta }
    }
    userErrors { code field message }
  }
}`;

function assertNoUserErrors(
  errors: UserError[] | undefined,
  operation: string,
) {
  if (!errors?.length) return;
  const message = errors.map((entry) =>
    `${entry.code ? `${entry.code}:` : ""}${entry.message}`
  ).join(" | ");
  const systemic =
    /access.denied|permission|scope|invalid.location|location.*not found|throttl/i
      .test(message);
  throw new Stock20Error(
    systemic ? "SYSTEMIC_SHOPIFY_ERROR" : "ITEM_SHOPIFY_ERROR",
    `${operation}: ${message}`,
    systemic,
  );
}

function quantity(
  values: Array<{ name: string; quantity: number }> | undefined,
  name: string,
): number | null {
  const value = values?.find((entry) => entry.name === name)?.quantity;
  return typeof value === "number" ? value : null;
}

export class AdminGraphqlStock20Client implements Stock20ShopifyClient {
  async readState(item: Stock20ManifestItem): Promise<Stock20LiveState> {
    const data = await graphql<{
      inventoryItem: null | {
        id: string;
        sku: string | null;
        tracked: boolean;
        inventoryLevel: null | {
          quantities: Array<{ name: string; quantity: number }>;
        };
        variant: null | {
          id: string;
          sku: string | null;
          inventoryPolicy: "DENY" | "CONTINUE";
          product: { id: string };
        };
      };
    }>(READ_STATE, {
      inventoryItemId: item.inventoryItemId,
      locationId: item.locationId,
    });
    const inventoryItem = data.inventoryItem;
    const level = inventoryItem?.inventoryLevel;
    const variant = inventoryItem?.variant;
    const available = quantity(level?.quantities, "available");
    if (!inventoryItem || !level || !variant || available === null) {
      throw new Stock20Error(
        "INVENTORY_STATE_INCOMPLETE",
        "Inventory item, variante o livello location non disponibile",
      );
    }
    return {
      sku: variant.sku || inventoryItem.sku || "",
      shopifyProductId: variant.product.id,
      shopifyVariantId: variant.id,
      inventoryItemId: inventoryItem.id,
      // Il livello è stato richiesto con questo ID esatto. Non selezioniamo
      // level.location, così la preparazione non dipende da read_locations.
      locationId: item.locationId,
      tracked: inventoryItem.tracked,
      inventoryPolicy: variant.inventoryPolicy,
      available,
      onHand: quantity(level.quantities, "on_hand"),
    };
  }

  async enableTracking(inventoryItemId: string): Promise<void> {
    const data = await graphql<{
      inventoryItemUpdate: {
        inventoryItem: { id: string; tracked: boolean } | null;
        userErrors: UserError[];
      };
    }>(ENABLE_TRACKING, { id: inventoryItemId });
    assertNoUserErrors(
      data.inventoryItemUpdate?.userErrors,
      "inventoryItemUpdate",
    );
    if (!data.inventoryItemUpdate?.inventoryItem?.tracked) {
      throw new Stock20Error(
        "TRACKING_POSTCONDITION_FAILED",
        "Shopify non ha confermato tracked=true",
      );
    }
  }

  async setInventoryPolicy(
    productId: string,
    variantId: string,
    policy: "DENY",
  ): Promise<void> {
    const data = await graphql<{
      productVariantsBulkUpdate: {
        productVariants: Array<{ id: string; inventoryPolicy: string }>;
        userErrors: UserError[];
      };
    }>(SET_POLICY, {
      productId,
      variants: [{ id: variantId, inventoryPolicy: policy }],
    });
    assertNoUserErrors(
      data.productVariantsBulkUpdate?.userErrors,
      "productVariantsBulkUpdate",
    );
  }

  async setAvailableAbsolute(input: {
    inventoryItemId: string;
    locationId: string;
    quantity: 20;
    compareQuantity: number;
    idempotencyKey: string;
  }): Promise<void> {
    const referenceKey = encodeURIComponent(input.idempotencyKey);
    const data = await graphql<{
      inventorySetQuantities: { userErrors: UserError[] };
    }>(SET_AVAILABLE, {
      input: {
        name: "available",
        reason: "correction",
        referenceDocumentUri: `online-garden://inventory/${referenceKey}`,
        quantities: [{
          inventoryItemId: input.inventoryItemId,
          locationId: input.locationId,
          quantity: input.quantity,
          changeFromQuantity: input.compareQuantity,
        }],
      },
      idempotencyKey: input.idempotencyKey,
    });
    assertNoUserErrors(
      data.inventorySetQuantities?.userErrors,
      "inventorySetQuantities",
    );
  }
}
