import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { AuthContext } from "./admin-v2-types.ts";
import {
  CANONICAL_HANDLES,
  demand,
  OperationalError,
  UUID,
} from "./admin-operational-core.ts";
import { requireCatalog } from "./admin-catalog-policy.ts";
import {
  getExactShopifyProductMapping,
  getProduct,
} from "./admin-v2-queries-deferred.ts";
import { shopifyAdminGraphQLAtVersion } from "./shopify-admin-client.ts";
import { shopifyStorefrontGraphQL } from "./shopify-storefront-server.ts";
import { writesEnabled } from "./admin-v2-commands.ts";
import { shopifySyncEnabled } from "./admin-v2-shopify-field-sync.ts";
const gql = <T>(q: string, v: Record<string, unknown> = {}) =>
  shopifyAdminGraphQLAtVersion<T>("2026-10", q, v);
const A = "gid://shopify/Collection/734709547348",
  B = "gid://shopify/Collection/734709514580";
const HEADLESS = "gid://shopify/Publication/338862113108";
export const COMMERCE_ACTIONS = [
  "list_editorial_collections",
  "get_catalog_prices",
  "set_catalog_prices",
  "get_catalog_collections",
  "set_catalog_collections",
  "preview_catalog_publication",
  "publish_catalog_product",
];
export interface CatalogVariant {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number;
  inventoryItem: { tracked: boolean; requiresShipping: boolean };
  deliveryProfile: { id: string } | null;
}
export interface CatalogProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  updatedAt: string;
  description: string;
  seo: { title: string | null; description: string | null };
  tags: string[];
  media: { nodes: { status: string; image?: { url: string } | null }[] };
  variants: { nodes: CatalogVariant[]; pageInfo: { hasNextPage: boolean } };
  collections: {
    nodes: { id: string; handle: string }[];
    pageInfo: { hasNextPage: boolean };
  };
  publishedOnPublication: boolean;
}
export async function mappedCatalogProduct(
  db: SupabaseClient,
  p: Record<string, unknown>,
): Promise<CatalogProduct> {
  demand(
    typeof p.productId === "string" && UUID.test(p.productId),
    "Prodotto non valido.",
  );
  const product = await getProduct(db, p.productId);
  demand(product, "Prodotto non disponibile.");
  const mapping = await getExactShopifyProductMapping(db, product.sku);
  demand(mapping?.shopify_product_id, "Mapping Shopify non verificato.");
  const id = String(mapping.shopify_product_id).startsWith("gid:")
    ? mapping.shopify_product_id
    : `gid://shopify/Product/${mapping.shopify_product_id}`;
  const data = await gql<{ product: CatalogProduct | null }>(
    `query DeliveryProduct($id:ID!,$publication:ID!){product(id:$id){id title handle status updatedAt description seo{title description} tags
    publishedOnPublication(publicationId:$publication)
    media(first:20){nodes{status ... on MediaImage{image{url}}}}
    variants(first:50){nodes{id sku price compareAtPrice inventoryQuantity inventoryItem{tracked requiresShipping} deliveryProfile{id}} pageInfo{hasNextPage}}
    collections(first:50){nodes{id handle} pageInfo{hasNextPage}}
  }}`,
    { id, publication: HEADLESS },
  );
  demand(
    data.product?.id === id && !data.product.variants.pageInfo.hasNextPage &&
      !data.product.collections.pageInfo.hasNextPage,
    "Stato Shopify incompleto o prodotto oltre il limite del gestionale.",
  );
  return data.product;
}
export async function editorialCollections() {
  const items: {
    id: string;
    handle: string;
    title: string;
    ruleSet: unknown;
  }[] = [];
  let after: string | null = null;
  for (let n = 0; n < 20; n++) {
    const data: {
      collections: {
        nodes: {
          id: string;
          handle: string;
          title: string;
          ruleSet: unknown;
        }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await shopifyAdminGraphQLAtVersion<
      {
        collections: {
          nodes: {
            id: string;
            handle: string;
            title: string;
            ruleSet: unknown;
          }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }
    >(
      "2026-01",
      "query EditorialCollections($after:String){collections(first:50,after:$after){nodes{id handle title ruleSet{appliedDisjunctively}} pageInfo{hasNextPage endCursor}}}",
      { after },
    );
    for (const c of data.collections.nodes) {
      if (
        c.id !== A && c.id !== B &&
        (CANONICAL_HANDLES as readonly string[]).includes(c.handle) &&
        c.ruleSet === null
      ) items.push(c);
    }
    if (!data.collections.pageInfo.hasNextPage) {
      demand(
        new Set(items.map((c) => c.handle)).size === items.length,
        "Handle collezione non univoco.",
      );
      return items.map(({ id, handle, title }) => ({ id, handle, title }));
    }
    const next: string | null = data.collections.pageInfo.endCursor;
    demand(next && next !== after, "Paginazione collezioni non valida.");
    after = next;
  }
  throw new OperationalError(
    "CATALOG_UNAVAILABLE",
    "Collezioni oltre il limite verificato.",
  );
}
export function priceProposal(
  product: CatalogProduct,
  p: Record<string, unknown>,
) {
  demand(
    Array.isArray(p.prices) && p.prices.length > 0 && p.prices.length <= 50,
    "Prezzi non validi.",
  );
  const ids = new Set<string>();
  return (p.prices as Record<string, unknown>[]).map((row) => {
    const variant = product.variants.nodes.find((v) => v.id === row.id);
    demand(variant && !ids.has(variant.id), "Variante assente o duplicata.");
    ids.add(variant.id);
    demand(
      typeof row.price === "string" &&
        /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(row.price),
      "Prezzo non valido.",
    );
    const compare = row.compareAtPrice;
    demand(
      compare === null ||
        (typeof compare === "string" &&
          /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(compare) &&
          Number(compare) > Number(row.price)),
      "Prezzo di confronto non valido.",
    );
    return {
      id: variant.id,
      price: Number(row.price).toFixed(2),
      compareAtPrice: compare === null ? null : Number(compare).toFixed(2),
    };
  });
}
function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
export async function commerceSnapshot(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
) {
  const product = await mappedCatalogProduct(db, p);
  demand(
    p.expectedUpdatedAt === product.updatedAt,
    "Shopify è cambiato: ricarica e confronta i dati prima della conferma.",
  );
  if (p.action === "set_catalog_prices") {
    priceProposal(product, p);
    return {
      updatedAt: product.updatedAt,
      variants: product.variants.nodes.filter((v) =>
        (p.prices as { id: string }[]).some((x) => x.id === v.id)
      ).map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
      })),
    };
  }
  if (p.action === "set_catalog_collections") {
    return {
      updatedAt: product.updatedAt,
      collections: product.collections.nodes,
    };
  }
  if (p.action === "publish_catalog_product") {
    await publicationChecks(product, p.logistics);
    demand(
      !product.variants.nodes.every((v) => v.inventoryQuantity <= 0) ||
        p.allowSoldOut === true,
      "Il prodotto è esaurito: confermare esplicitamente la pubblicazione senza disponibilità.",
    );
    return {
      updatedAt: product.updatedAt,
      status: product.status,
      publishedOnPublication: product.publishedOnPublication,
      variantIds: product.variants.nodes.map((v) => v.id),
      logistics: p.logistics,
    };
  }
  throw new OperationalError("FORBIDDEN", "Conferma catalogo non supportata.");
}
/** Read current native A/B sources, not editorial categories or product tags. */
async function shippingClasses(product: CatalogProduct) {
  const bIds = new Set<string>();
  let after: string | null = null;
  let complete = false;
  for (let n = 0; n < 20; n++) {
    const result: {
      a: {
        sources: {
          targetType: string;
          inclusion: {
            matchType: string;
            conditions: {
              __typename: string;
              relation?: string;
              value?: { amount: string };
            }[];
          };
          exclusion: {
            matchType: string;
            conditions: { __typename: string; values?: { id: string }[] }[];
          };
        }[];
      } | null;
      b: {
        sources: {
          targetType: string;
          inclusion: {
            conditions: unknown[];
            selections: {
              nodes: { product: { id: string }; variantIds: string[] | null }[];
              pageInfo: { hasNextPage: boolean; endCursor: string | null };
            };
          };
          exclusion: { conditions: unknown[] };
        }[];
      } | null;
    } = await gql<
      {
        a: {
          sources: {
            targetType: string;
            inclusion: {
              matchType: string;
              conditions: {
                __typename: string;
                relation?: string;
                value?: { amount: string };
              }[];
            };
            exclusion: {
              matchType: string;
              conditions: { __typename: string; values?: { id: string }[] }[];
            };
          }[];
        } | null;
        b: {
          sources: {
            targetType: string;
            inclusion: {
              conditions: unknown[];
              selections: {
                nodes: {
                  product: { id: string };
                  variantIds: string[] | null;
                }[];
                pageInfo: { hasNextPage: boolean; endCursor: string | null };
              };
            };
            exclusion: { conditions: unknown[] };
          }[];
        } | null;
      }
    >(
      `query DeliveryShipping($a:ID!,$b:ID!,$after:String){
      a:collection(id:$a){sources{... on CollectionConditionsSource{targetType inclusion{matchType conditions{__typename ... on CollectionSourceInclusionConditionVariantPrice{relation value{amount}}}} exclusion{matchType conditions{__typename ... on CollectionSourceExclusionConditionCollection{values{id}}}}}}}
      b:collection(id:$b){sources{... on CollectionConditionsSource{targetType inclusion{conditions{__typename} selections(first:50,after:$after){nodes{product{id} variantIds} pageInfo{hasNextPage endCursor}}} exclusion{conditions{__typename}}}}}
    }`,
      { a: A, b: B, after },
    );
    const a = result.a?.sources, b = result.b?.sources;
    demand(
      a?.length === 1 && b?.length === 1 && a[0].targetType === "VARIANTS" &&
        b[0].targetType === "VARIANTS",
      "Configurazione logistica non verificabile.",
    );
    const ac = a[0].inclusion.conditions, ae = a[0].exclusion.conditions;
    demand(
      a[0].inclusion.matchType === "ALL" && ac.length === 1 &&
        ac[0].__typename === "CollectionSourceInclusionConditionVariantPrice" &&
        ac[0].relation === "GREATER_THAN" &&
        Number(ac[0].value?.amount) === -0.01 &&
        a[0].exclusion.matchType === "ANY" && ae.length === 1 &&
        ae[0].__typename === "CollectionSourceExclusionConditionCollection" &&
        ae[0].values?.length === 1 && ae[0].values[0].id === B,
      "Regole A/B cambiate: pubblicazione sospesa, nessuna tariffa modificata.",
    );
    demand(
      b[0].inclusion.conditions.length === 0 &&
        b[0].exclusion.conditions.length === 0,
      "Sorgente B diversa dalla selezione approvata.",
    );
    for (const selection of b[0].inclusion.selections.nodes) {
      demand(
        Array.isArray(selection.variantIds),
        "Selezione B non verificabile per variante.",
      );
      if (selection.product.id === product.id) {
        selection.variantIds.forEach((id) => bIds.add(id));
      }
    }
    const info: { hasNextPage: boolean; endCursor: string | null } =
      b[0].inclusion.selections.pageInfo;
    if (!info.hasNextPage) {
      complete = true;
      break;
    }
    demand(
      info.endCursor && info.endCursor !== after,
      "Paginazione B non valida.",
    );
    after = info.endCursor;
  }
  demand(complete, "Classificazione B non completamente verificata.");
  return product.variants.nodes.map((v) => ({
    id: v.id,
    class: bIds.has(v.id) ? "B" : "A",
  }));
}
async function publicationChecks(
  product: CatalogProduct,
  rawLogistics: unknown,
) {
  demand(
    !product.title.includes("TEST ADMIN") &&
      !product.variants.nodes.some((v) => v.sku.startsWith("OG-ADMIN-CHECK-")),
    "Il prodotto tecnico non può essere pubblicato.",
  );
  demand(
    ["DRAFT", "ACTIVE"].includes(product.status) && product.title.trim() &&
      product.description.trim().length >= 20 && product.seo.title?.trim() &&
      product.seo.description?.trim(),
    "Completare nome, descrizione e SEO prima della pubblicazione.",
  );
  demand(
    product.media.nodes.some((m) => m.status === "READY" && m.image?.url),
    "Caricare e attendere almeno un’immagine disponibile.",
  );
  demand(
    product.variants.nodes.length > 0 &&
      product.variants.nodes.every((v) =>
        v.sku.trim() && Number(v.price) > 0 && v.inventoryItem.tracked &&
        v.inventoryItem.requiresShipping &&
        v.deliveryProfile?.id === "gid://shopify/DeliveryProfile/139796676948"
      ),
    "SKU, prezzo o configurazione fisica/inventario non verificati. Nessuna quantità viene inventata.",
  );
  const classes = await shippingClasses(product);
  demand(
    Array.isArray(rawLogistics) && rawLogistics.length === classes.length &&
      classes.every((c) =>
        rawLogistics.some((x) => x?.id === c.id && x?.class === c.class)
      ) && new Set(classes.map((c) => c.class)).size === 1,
    "Confermare la classe A/B reale di ogni variante; classi miste non pubblicabili da questo flusso.",
  );
  const channel = await gql<
    { publication: { id: string; catalog: { title: string } } | null }
  >("query DeliveryChannel($id:ID!){publication(id:$id){id catalog{title}}}", {
    id: HEADLESS,
  });
  demand(
    channel.publication?.id === HEADLESS &&
      channel.publication.catalog.title ===
        "Channel Catalog 338862113108 for Ecom Blueprint Gen 6ud1s Headless",
    "Canale del sito non verificato.",
  );
  return classes;
}
export async function handleCatalogCommerce(
  db: SupabaseClient,
  auth: AuthContext,
  p: Record<string, unknown>,
) {
  const action = String(p.action);
  requireCatalog(
    auth,
    action.includes("prices")
      ? "prices"
      : action.includes("publication") || action.includes("publish")
      ? "publish"
      : "categories",
  );
  if (action === "list_editorial_collections") {
    return { ok: true, collections: await editorialCollections() };
  }
  const product = await mappedCatalogProduct(db, p);
  if (action === "get_catalog_prices") {
    return {
      ok: true,
      updatedAt: product.updatedAt,
      variants: product.variants.nodes.map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
      })),
    };
  }
  if (action === "get_catalog_collections") {
    return {
      ok: true,
      updatedAt: product.updatedAt,
      selected: product.collections.nodes.map((c) => c.id),
      collections: await editorialCollections(),
    };
  }
  if (action === "preview_catalog_publication") {
    const logistics = await shippingClasses(product);
    await publicationChecks(product, logistics);
    const storefront = await shopifyStorefrontGraphQL<
      { product: { id: string } | null }
    >("query DeliveryVisibility($id:ID!){product(id:$id){id}}", {
      id: product.id,
    }, "2026-01");
    return {
      ok: true,
      updatedAt: product.updatedAt,
      logistics,
      status: product.status,
      storefrontVisible: storefront.product?.id === product.id,
      channel: "Sito Online Garden (Headless)",
      soldOut: product.variants.nodes.every((v) => v.inventoryQuantity <= 0),
    };
  }
  demand(
    writesEnabled() && shopifySyncEnabled() && p.confirm === true &&
      auth.catalogApproval?.action === action,
    "Conferma server dell’operazione mancante.",
  );
  demand(
    product.updatedAt === p.expectedUpdatedAt,
    "Shopify è cambiato prima della scrittura.",
  );
  if (action === "set_catalog_prices") {
    const variants = priceProposal(product, p);
    const result = await gql<
      { productVariantsBulkUpdate: { userErrors: unknown[] } }
    >(
      "mutation DeliveryPrices($productId:ID!,$variants:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$productId,variants:$variants){userErrors{message}}}",
      { productId: product.id, variants },
    );
    demand(
      !result.productVariantsBulkUpdate.userErrors.length,
      "Shopify ha rifiutato i prezzi.",
    );
    const after = await mappedCatalogProduct(db, p);
    demand(
      variants.every((v) =>
        after.variants.nodes.some((x) =>
          x.id === v.id && Number(x.price) === Number(v.price) &&
          (v.compareAtPrice === null
            ? x.compareAtPrice === null
            : Number(x.compareAtPrice) === Number(v.compareAtPrice))
        )
      ),
      "Prezzi da riconciliare: non reinviare.",
    );
    return {
      ok: true,
      result: { state: "VERIFIED", updatedAt: after.updatedAt },
    };
  }
  if (action === "set_catalog_collections") {
    demand(Deno.env.get('PRODUCT_ADMIN_CATEGORIES_ENABLED') === 'true','Assegnazioni editoriali temporaneamente disabilitate.');
    const eligible = await editorialCollections();
    demand(
      Array.isArray(p.collectionIds) &&
        new Set(p.collectionIds).size === p.collectionIds.length &&
        p.collectionIds.every((id) => eligible.some((c) => c.id === id)),
      "Selezione editoriale non verificata.",
    );
    const ids = p.collectionIds as string[],
      before = product.collections.nodes.map((c) => c.id),
      allowed = eligible.map((c) => c.id);
    const add = ids.filter((id) => !before.includes(id)),
      remove = before.filter((id) => allowed.includes(id) && !ids.includes(id));
    for (const id of add) {
      const r = await gql<{ collectionAddProducts: { userErrors: unknown[] } }>(
        "mutation DeliveryAssign($id:ID!,$products:[ID!]!){collectionAddProducts(id:$id,productIds:$products){userErrors{message}}}",
        { id, products: [product.id] },
      );
      demand(
        !r.collectionAddProducts.userErrors.length,
        "Associazione rifiutata.",
      );
    }
    for (const id of remove) {
      const r = await gql<
        {
          collectionRemoveProducts: {
            job: { id: string; done: boolean } | null;
            userErrors: unknown[];
          };
        }
      >(
        "mutation DeliveryUnassign($id:ID!,$products:[ID!]!){collectionRemoveProducts(id:$id,productIds:$products){job{id done} userErrors{message}}}",
        { id, products: [product.id] },
      );
      demand(
        !r.collectionRemoveProducts.userErrors.length &&
          r.collectionRemoveProducts.job,
        "Rimozione in verifica: non ripetere.",
      );
      let done = r.collectionRemoveProducts.job.done;
      for (let attempt = 0; !done && attempt < 8; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const checked = await gql<{ job: { done: boolean } | null }>(
          "query DeliveryCollectionJob($id:ID!){job(id:$id){done}}",
          { id: r.collectionRemoveProducts.job.id },
        );
        done = checked.job?.done === true;
      }
      demand(done, "Rimozione in verifica: non ripetere.");
    }
    const after = (await mappedCatalogProduct(db, p)).collections.nodes.map(
        (c) => c.id,
      ).sort(),
      expected = [...before.filter((id) => !remove.includes(id)), ...add]
        .sort();
    demand(same(after, expected), "Associazioni da riconciliare.");
    return { ok: true, result: { state: "VERIFIED" } };
  }
  if (action === "publish_catalog_product") {
    await publicationChecks(product, p.logistics);
    demand(
      !product.variants.nodes.every((v) => v.inventoryQuantity <= 0) ||
        p.allowSoldOut === true,
      "Pubblicazione esaurito non confermata.",
    );
    if (product.status === "DRAFT") {
      const active = await gql<{ productUpdate: { userErrors: unknown[] } }>(
        "mutation DeliveryActivate($product:ProductUpdateInput!){productUpdate(product:$product){userErrors{message}}}",
        { product: { id: product.id, status: "ACTIVE" } },
      );
      demand(
        !active.productUpdate.userErrors.length,
        "Attivazione prodotto rifiutata.",
      );
    }
    if (!product.publishedOnPublication) {
      const published = await gql<
        { publishablePublish: { userErrors: unknown[] } }
      >(
        "mutation DeliveryPublish($id:ID!,$input:[PublicationInput!]!){publishablePublish(id:$id,input:$input){userErrors{message}}}",
        { id: product.id, input: [{ publicationId: HEADLESS }] },
      );
      demand(
        !published.publishablePublish.userErrors.length,
        "Pubblicazione canale non confermata.",
      );
    }
    const after = await mappedCatalogProduct(db, p);
    demand(
      after.status === "ACTIVE" && after.publishedOnPublication,
      "Stato canale da riconciliare.",
    );
    const visible = await shopifyStorefrontGraphQL<
      { product: { id: string } | null }
    >("query DeliveryVisible($id:ID!){product(id:$id){id}}", {
      id: product.id,
    }, "2026-01");
    demand(
      visible.product?.id === product.id,
      "Pubblicazione non ancora leggibile dalla Storefront: attendere verifica senza reinviare.",
    );
    return {
      ok: true,
      result: {
        state: "STOREFRONT_VERIFIED",
        url: `https://onlinegarden.it/products/${product.handle}`,
        updatedAt: after.updatedAt,
      },
    };
  }
  throw new OperationalError("FORBIDDEN", "Azione catalogo non supportata.");
}
