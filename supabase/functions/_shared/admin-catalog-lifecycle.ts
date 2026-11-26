import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { AuthContext } from "./admin-v2-types.ts";
import type { CatalogProduct } from "./admin-catalog-commerce.ts";
import { catalogAllowed } from "./admin-catalog-policy.ts";
import { demand } from "./admin-operational-core.ts";
import { payloadHash, writesEnabled } from "./admin-v2-commands.ts";
import { shopifySyncEnabled } from "./admin-v2-shopify-field-sync.ts";
import { shopifyAdminGraphQLAtVersion } from "./shopify-admin-client.ts";
import { shopifyStorefrontGraphQL } from "./shopify-storefront-server.ts";

export const lifecycleGrants = {
  unpublish_catalog_product: "product_unpublish",
  archive_catalog_product: "product_archive",
  restore_catalog_product: "product_archive",
  delete_catalog_product: "product_delete",
} as const;
export type LifecycleAction = keyof typeof lifecycleGrants;
export const lifecycleWrites = Object.keys(lifecycleGrants);
export function lifecycleAllowed(auth: AuthContext, action: string) {
  return Object.hasOwn(lifecycleGrants, action) &&
    catalogAllowed(auth, "sync") &&
    auth.catalogGrant?.fieldKeys.includes(
        lifecycleGrants[action as LifecycleAction],
      ) === true;
}

const admin = <T>(q: string, v: Record<string, unknown>) =>
  shopifyAdminGraphQLAtVersion<T>("2026-10", q, v, true);
const sf = <T>(q: string, v: Record<string, unknown>) =>
  shopifyStorefrontGraphQL<T>(q, v, "2026-01");

type PageInfo = { hasNextPage: boolean; endCursor: string | null };
type ProductPage = {
  products: { nodes: { id: string }[]; pageInfo: PageInfo };
};
type OrderLines = {
  nodes: {
    product: { id: string } | null;
    variant: { id: string } | null;
    sku: string | null;
  }[];
  pageInfo: { hasNextPage: boolean };
};
type OrderPage = {
  orders: { nodes: { lineItems: OrderLines }[]; pageInfo: PageInfo };
};
type RedirectPage = {
  urlRedirects: {
    nodes: { path: string; target: string }[];
    pageInfo: PageInfo;
  };
};
export async function verifyStorefrontAbsence(id: string, query = sf) {
  const detail = await query<{ product: { id: string } | null }>(
    "query RemovedProduct($id:ID!){product(id:$id){id}}",
    { id },
  );
  demand(
    detail.product === null,
    "Scheda ancora presente sul sito. Riconciliare senza ripetere la modifica.",
  );
  let after: string | null = null;
  for (let page = 0; page < 20; page++) {
    const result: ProductPage = await query<ProductPage>(
      "query RemovedFromIndex($after:String){products(first:100,after:$after){nodes{id} pageInfo{hasNextPage endCursor}}}",
      { after },
    );
    const { nodes, pageInfo } = result.products;
    demand(
      !nodes.some((p) => p.id === id),
      "Il catalogo del sito contiene ancora il prodotto. Riconciliare senza reinviare.",
    );
    if (pageInfo.hasNextPage === false) return;
    demand(
      pageInfo.hasNextPage === true && pageInfo.endCursor &&
        pageInfo.endCursor !== after,
      "Indice del sito incompleto.",
    );
    after = pageInfo.endCursor;
  }
  throw new Error(
    "Indice oltre il limite verificabile. Rileggere lo stato prima di proseguire.",
  );
}

type Channel = {
  publication: { id: string; name: string };
  isPublished: boolean;
  publishDate?: string | null;
};

// Orders and redirects lack a reliable historical filter by product GID. Stop on
// incomplete pagination or missing scope instead of treating a partial scan as clearance.
export async function checkDeletionReferences(
  product: CatalogProduct,
  query = admin,
) {
  const scopes = await query<
    { currentAppInstallation: { accessScopes: { handle: string }[] } }
  >(
    "query DeletionScopes{currentAppInstallation{accessScopes{handle}}}",
    {},
  );
  const access = new Set(
    scopes.currentAppInstallation.accessScopes.map((s) => s.handle),
  );
  demand(
    access.has("read_all_orders") &&
      (access.has("read_orders") || access.has("write_orders")),
    "Lo storico completo degli ordini non è verificabile con gli accessi attuali.",
  );
  const variantIds = new Set(product.variants.nodes.map((v) => v.id));
  const skus = new Set(product.variants.nodes.map((v) => v.sku));
  let after: string | null = null;
  for (let page = 0;; page++) {
    demand(
      page < 40,
      "Storico ordini oltre il limite verificabile. Eliminazione bloccata.",
    );
    const data: OrderPage = await query<OrderPage>(
      "query DeletionOrderRefs($after:String){orders(first:10,after:$after){nodes{lineItems(first:25){nodes{product{id} variant{id} sku} pageInfo{hasNextPage}}} pageInfo{hasNextPage endCursor}}}",
      { after },
    );
    for (const order of data.orders.nodes) {
      demand(
        order.lineItems.pageInfo.hasNextPage === false,
        "Ordine con righe non verificate. Eliminazione bloccata.",
      );
      demand(
        order.lineItems.nodes.every((l) =>
          l.product?.id !== product.id &&
          !variantIds.has(l.variant?.id ?? "") && !skus.has(l.sku ?? "")
        ),
        "Esistono riferimenti a questo prodotto negli ordini. Conserva il prodotto archiviato.",
      );
    }
    if (data.orders.pageInfo.hasNextPage === false) break;
    const next: string | null = data.orders.pageInfo.endCursor;
    demand(next && next !== after, "Paginazione ordini incompleta.");
    after = next;
  }
  const path = "/products/" + product.handle;
  after = null;
  for (let page = 0;; page++) {
    demand(page < 20, "Elenco redirect oltre il limite verificabile.");
    const data: RedirectPage = await query<RedirectPage>(
      "query DeletionRedirectRefs($after:String){urlRedirects(first:100,after:$after){nodes{path target} pageInfo{hasNextPage endCursor}}}",
      { after },
    );
    for (const r of data.urlRedirects.nodes) {
      demand(
        [r.path, r.target].every((s) =>
          !decodeURIComponent(new URL(s, "https://onlinegarden.it").pathname)
            .replace(/\/$/, "").endsWith(path)
        ),
        "Un redirect usa il percorso del prodotto. Verificare i collegamenti prima di eliminare.",
      );
    }
    if (data.urlRedirects.pageInfo.hasNextPage === false) break;
    const next: string | null = data.urlRedirects.pageInfo.endCursor;
    demand(next && next !== after, "Paginazione redirect incompleta.");
    after = next;
  }
}
export async function checkDeletionStock(
  product: CatalogProduct,
  query = admin,
) {
  type Stock = {
    id: string;
    inventoryItem: {
      inventoryLevels: {
        nodes: { quantities: { name: string; quantity: number }[] }[];
        pageInfo: { hasNextPage: boolean };
      };
    };
  };
  const names = [
    "on_hand",
    "available",
    "committed",
    "reserved",
    "incoming",
    "damaged",
    "safety_stock",
    "quality_control",
  ];
  // Read each variant separately to stay within the Shopify query cost limit.
  for (const variant of product.variants.nodes) {
    const { productVariant } = await query<{ productVariant: Stock | null }>(
      "query DeletionStock($id:ID!,$names:[String!]!){productVariant(id:$id){id inventoryItem{inventoryLevels(first:50){nodes{quantities(names:$names){name quantity}} pageInfo{hasNextPage}}}}}",
      { id: variant.id, names },
    );
    const levels = productVariant?.inventoryItem.inventoryLevels;
    demand(
      productVariant?.id === variant.id &&
        levels?.pageInfo.hasNextPage === false && levels.nodes.every((level) =>
          names.every((name) =>
            level.quantities.some((q) =>
              q.name === name && q.quantity === 0
            )
          )
        ),
      "Giacenze o impegni per sede presenti o non verificabili.",
    );
  }
}
export async function checkInternalReferences(
  db: SupabaseClient,
  localId: string,
  product: CatalogProduct,
) {
  const [family, linked, legacy, drafts] = await Promise.all([
    db.from("products").select("id,sku").or(
      "id.eq." + localId + ",parent_product_id.eq." + localId,
    ).limit(52),
    db.from("admin_product_shopify_links").select(
      "product_id,shopify_variant_gid",
    ).eq("shopify_product_gid", product.id).limit(52),
    db.from("product_sync_csv_products").select("sku").in(
      "shopify_product_id",
      [product.id, product.id.split("/").at(-1)],
    ).limit(52),
    db.from("admin_product_operations").select("id").eq("product_id", localId)
      .in("state", ["LOCAL_DRAFT", "IN_FLIGHT", "NEEDS_RECONCILIATION"]).limit(
        1,
      ),
  ]);
  demand(
    !family.error && !linked.error && !legacy.error && !drafts.error &&
      family.data && linked.data && legacy.data && drafts.data,
    "Riferimenti interni non verificabili.",
  );
  const ids = new Map(family.data.map((r) => [r.id, r.sku]));
  const skus = new Set(ids.values());
  const variants = new Map(product.variants.nodes.map((v) => [v.id, v.sku]));
  demand(
    ids.has(localId) && ids.size <= 51 && linked.data.length <= 51 &&
      legacy.data.length <= 51 && !drafts.data.length &&
      linked.data.every((l) =>
        ids.has(l.product_id) &&
        (l.shopify_variant_gid
          ? variants.get(l.shopify_variant_gid) === ids.get(l.product_id)
          : l.product_id === localId)
      ) &&
      legacy.data.every((l) => skus.has(l.sku)),
    "Famiglia, mapping o operazioni interne da riconciliare. Conserva il prodotto archiviato.",
  );
}

export async function lifecyclePlan(
  db: SupabaseClient,
  auth: AuthContext,
  action: string,
  localId: string,
  product: CatalogProduct,
  channelId: string,
) {
  demand(
    lifecycleAllowed(auth, action) && writesEnabled() && shopifySyncEnabled(),
    "Operazione non autorizzata.",
  );
  const channels = await admin<
    {
      product: {
        resourcePublicationsV2: {
          nodes: Channel[];
          pageInfo: { hasNextPage: boolean };
        };
      } | null;
    }
  >(
    "query LifecycleChannels($id:ID!){product(id:$id){resourcePublicationsV2(first:100,onlyPublished:false){nodes{isPublished publishDate publication{id name}} pageInfo{hasNextPage}}}}",
    { id: product.id },
  );
  const publications = channels.product?.resourcePublicationsV2;
  demand(
    publications?.pageInfo.hasNextPage === false,
    "Elenco dei canali incompleto.",
  );
  const active = publications.nodes.filter((c) => c.isPublished).map((c) =>
    c.publication
  ).sort((a, b) => a.id.localeCompare(b.id));
  demand(
    active.some((c) => c.id === channelId) === product.publishedOnPublication,
    "Lo stato dei canali è cambiato.",
  );
  if (action === "unpublish_catalog_product") {
    demand(
      product.publishedOnPublication,
      "Prodotto già fuori dal canale del sito.",
    );
  }
  if (action === "archive_catalog_product") {
    demand(
      ["ACTIVE", "DRAFT", "UNLISTED"].includes(product.status),
      "Prodotto già archiviato o stato inatteso.",
    );
  }
  if (action === "restore_catalog_product") {
    demand(
      product.status === "ARCHIVED",
      "Puoi ripristinare solo un prodotto archiviato.",
    );
  }
  let mandate: string | null = null;
  if (action === "delete_catalog_product") {
    demand(
      product.status === "ARCHIVED" && !active.length &&
        publications.nodes.every((c) =>
          !c.publishDate || Date.parse(c.publishDate) <= Date.now()
        ) && !product.media.nodes.length &&
        product.variants.nodes.every((v) => v.inventoryQuantity === 0),
      "Per eliminare occorre un prodotto archiviato, senza canali, media o giacenze.",
    );
    const { data, error } = await db.from("admin_product_deletion_clearances")
      .select("reference")
      .eq("actor", auth.userId).eq("product_id", localId).eq(
        "shopify_gid",
        product.id,
      )
      .eq("shopify_updated_at", product.updatedAt).gt(
        "expires_at",
        new Date().toISOString(),
      ).maybeSingle();
    demand(
      !error && data?.reference,
      "Manca un mandato commerciale valido per questo prodotto e la verifica documentata di ordini, riferimenti, media e redirect.",
    );
    await checkInternalReferences(db, localId, product);
    await checkDeletionStock(product);
    await checkDeletionReferences(product);
    mandate = data.reference;
  }
  return {
    action,
    id: product.id,
    title: product.title,
    handle: product.handle,
    updatedAt: product.updatedAt,
    status: product.status,
    channels: active,
    variants: product.variants.nodes.map((v) => ({ id: v.id, sku: v.sku })),
    mandate,
  };
}

export async function executeLifecycle(
  plan: Awaited<ReturnType<typeof lifecyclePlan>>,
  channelId: string,
  typed: unknown,
  query = admin,
  verifyAbsence = verifyStorefrontAbsence,
) {
  demand(Object.hasOwn(lifecycleGrants, plan.action), "Azione non supportata.");
  const id = plan.id;
  const mutation = async (
    q: string,
    vars: Record<string, unknown>,
    key: string,
  ) => {
    const result = await query<
      Record<
        string,
        { userErrors: { message: string }[]; deletedProductId?: string }
      >
    >(q, vars);
    demand(
      Array.isArray(result[key]?.userErrors) && !result[key].userErrors.length,
      "Shopify ha respinto la modifica. Rileggere il prodotto.",
    );
    return result[key];
  };
  if (plan.action === "delete_catalog_product") {
    demand(
      plan.mandate && typeof typed === "string" && typed === plan.title,
      "Digita il nome esatto del prodotto per confermare.",
    );
    const result = await mutation(
      "mutation DeleteOne($input:ProductDeleteInput!){productDelete(input:$input,synchronous:true){deletedProductId userErrors{message}}}",
      { input: { id } },
      "productDelete",
    );
    demand(result.deletedProductId === id, "Cancellazione da riconciliare.");
  } else if (plan.action === "unpublish_catalog_product") {
    await mutation(
      "mutation RemoveFromSite($id:ID!,$input:[PublicationInput!]!){publishableUnpublish(id:$id,input:$input){userErrors{message}}}",
      { id, input: [{ publicationId: channelId }] },
      "publishableUnpublish",
    );
  } else {
    const status = plan.action === "archive_catalog_product"
      ? "ARCHIVED"
      : "DRAFT";
    await mutation(
      "mutation SetCatalogStatus($input:ProductUpdateInput!){productUpdate(product:$input){userErrors{message}}}",
      { input: { id, status } },
      "productUpdate",
    );
  }
  const result = await query<
    {
      product:
        | { id: string; status: string; publishedOnPublication: boolean }
        | null;
    }
  >(
    "query ReadLifecycle($id:ID!,$channel:ID!){product(id:$id){id status publishedOnPublication(publicationId:$channel)}}",
    { id, channel: channelId },
  );
  const expected = plan.action === "archive_catalog_product"
    ? "ARCHIVED"
    : plan.action === "restore_catalog_product"
    ? "DRAFT"
    : plan.status;
  demand(
    plan.action === "delete_catalog_product"
      ? result.product === null
      : result.product?.id === id && result.product.status === expected &&
        (plan.action !== "unpublish_catalog_product" ||
          result.product.publishedOnPublication === false),
    "Esito Shopify incerto. Riconciliare prima di una nuova azione.",
  );
  await verifyAbsence(id);
  return {
    ok: true,
    result: {
      state: plan.action === "delete_catalog_product" ? "DELETED" : expected,
      siteVisible: false,
      shopifyProductId: id,
    },
  };
}
export const lifecycleDigest = (
  plan: Awaited<ReturnType<typeof lifecyclePlan>>,
) => payloadHash({ plan });
