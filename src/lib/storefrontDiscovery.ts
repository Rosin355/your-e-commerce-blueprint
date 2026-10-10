import { CATEGORIES } from "@/config/categories";
import type { ShopifyProduct } from "@/lib/shopify";

export interface HomepageProductSelection {
  newest: ShopifyProduct[];
  outdoor: ShopifyProduct[];
  botanical: ShopifyProduct[];
}

interface CanonicalCollection {
  handle: string;
  label: string;
  parentHandle: string | null;
  childHandles: string[];
  depth: 0 | 1;
}

const canonicalByHandle = new Map<string, CanonicalCollection>();

for (const category of CATEGORIES) {
  if (category.handle !== "all") {
    canonicalByHandle.set(category.handle, {
      handle: category.handle,
      label: category.label,
      parentHandle: null,
      childHandles: category.links.map((link) => link.handle),
      depth: 0,
    });
  }
  for (const link of category.links) {
    if (!canonicalByHandle.has(link.handle)) {
      canonicalByHandle.set(link.handle, {
        handle: link.handle,
        label: link.label,
        parentHandle: category.handle === "all" ? null : category.handle,
        childHandles: [],
        depth: 1,
      });
    }
  }
}

export const CANONICAL_COLLECTIONS = Object.freeze([...canonicalByHandle.values()]);

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenMatches(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.length < 4 || right.length < 4) return false;
  return left.slice(0, -1) === right.slice(0, -1);
}

function phraseMatches(query: string, candidate: string): boolean {
  const queryTokens = normalizeSearchText(query).split(" ").filter(Boolean);
  const candidateTokens = normalizeSearchText(candidate).split(" ").filter(Boolean);
  if (queryTokens.length === 0 || queryTokens.length > candidateTokens.length) return false;

  for (let offset = 0; offset <= candidateTokens.length - queryTokens.length; offset += 1) {
    if (queryTokens.every((token, index) => tokenMatches(token, candidateTokens[offset + index]))) {
      return true;
    }
  }
  return false;
}

function allQueryTokensMatch(query: string, candidate: string): boolean {
  const queryTokens = normalizeSearchText(query).split(" ").filter(Boolean);
  const candidateTokens = normalizeSearchText(candidate).split(" ").filter(Boolean);
  return queryTokens.length > 0 && queryTokens.every((queryToken) =>
    candidateTokens.some((candidateToken) => tokenMatches(queryToken, candidateToken)),
  );
}

function matchedCanonicalCollections(query: string): CanonicalCollection[] {
  const normalizedQuery = normalizeSearchText(query);
  const matches = CANONICAL_COLLECTIONS.filter((collection) =>
    phraseMatches(normalizedQuery, collection.label) ||
    phraseMatches(normalizedQuery, collection.handle),
  );
  return matches.sort((left, right) => {
    const leftExact = normalizeSearchText(left.label) === normalizedQuery || normalizeSearchText(left.handle) === normalizedQuery;
    const rightExact = normalizeSearchText(right.label) === normalizedQuery || normalizeSearchText(right.handle) === normalizedQuery;
    if (leftExact !== rightExact) return leftExact ? -1 : 1;
    if (left.depth !== right.depth) return left.depth - right.depth;
    return left.handle.localeCompare(right.handle, "it");
  });
}

export function productCollectionHandles(product: ShopifyProduct): string[] {
  return product.node.collections?.edges.map((edge) => edge.node.handle) ?? [];
}

function collectionScope(collection: CanonicalCollection): Set<string> {
  return new Set([collection.handle, ...collection.childHandles]);
}

function scoreProductSearch(product: ShopifyProduct, query: string): number | null {
  const normalizedTitle = normalizeSearchText(product.node.title);
  if (normalizedTitle === query) return 0;
  if (normalizedTitle.includes(query)) return 10;
  if (allQueryTokensMatch(query, normalizedTitle)) return 15;

  const collectionMatches = matchedCanonicalCollections(query);
  const productHandles = new Set(productCollectionHandles(product));
  for (const collection of collectionMatches) {
    if ([...collectionScope(collection)].some((handle) => productHandles.has(handle))) {
      return collection.depth === 0 ? 20 : 30;
    }
  }

  const taxonomyText = productCollectionHandles(product)
    .map((handle) => canonicalByHandle.get(handle)?.label ?? handle)
    .join(" ");
  if (normalizeSearchText(taxonomyText).includes(query)) return 35;

  const catalogText = [
    product.node.productType ?? "",
    ...(product.node.tags ?? []),
    product.node.vendor ?? "",
    product.node.handle,
  ].join(" ");
  if (normalizeSearchText(catalogText).includes(query)) return 40;
  if (normalizeSearchText(product.node.description ?? "").includes(query)) return 50;
  return null;
}

export function searchCatalogProducts(products: ShopifyProduct[], query: string): ShopifyProduct[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return products;

  return products
    .map((product, index) => ({ product, index, score: scoreProductSearch(product, normalizedQuery) }))
    .filter((entry): entry is { product: ShopifyProduct; index: number; score: number } => entry.score !== null)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((entry) => entry.product);
}

export function productHasImage(product: ShopifyProduct): boolean {
  return Boolean(product.node.images.edges[0]?.node.url);
}

function productIsPublished(product: ShopifyProduct): boolean {
  return typeof product.node.publishedAt === "string" && product.node.publishedAt.length > 0;
}

export function productIsAvailable(product: ShopifyProduct): boolean {
  return product.node.availableForSale ??
    product.node.variants.edges.some((variant) => variant.node.availableForSale);
}

function stableNewest(products: ShopifyProduct[]): ShopifyProduct[] {
  return [...products].sort((left, right) => {
    const leftDate = Date.parse(left.node.publishedAt ?? "") || 0;
    const rightDate = Date.parse(right.node.publishedAt ?? "") || 0;
    return rightDate - leftDate || left.node.id.localeCompare(right.node.id);
  });
}

function uniqueProducts(products: ShopifyProduct[], excludedIds: Set<string>): ShopifyProduct[] {
  const seen = new Set(excludedIds);
  return products.filter((product) => {
    if (seen.has(product.node.id)) return false;
    seen.add(product.node.id);
    return true;
  });
}

function selectDiversified(
  products: ShopifyProduct[],
  handles: string[],
  excludedIds: Set<string>,
  limit: number,
): ShopifyProduct[] {
  const ordered = stableNewest(uniqueProducts(products, excludedIds));
  const selected: ShopifyProduct[] = [];
  const selectedIds = new Set<string>();

  for (const handle of handles) {
    const match = ordered.find((product) =>
      !selectedIds.has(product.node.id) && productCollectionHandles(product).includes(handle),
    );
    if (match) {
      selected.push(match);
      selectedIds.add(match.node.id);
    }
    if (selected.length === limit) return selected;
  }

  for (const product of ordered) {
    if (selected.length === limit) break;
    if (selectedIds.has(product.node.id)) continue;
    if (!productCollectionHandles(product).some((handle) => handles.includes(handle))) continue;
    selected.push(product);
    selectedIds.add(product.node.id);
  }
  return selected;
}

export function selectHomepageProducts(
  products: ShopifyProduct[],
  limitPerSection = 4,
): HomepageProductSelection {
  const eligible = stableNewest(products.filter((product) =>
    productHasImage(product) && productIsPublished(product) && productIsAvailable(product),
  ));
  const newest = uniqueProducts(eligible, new Set()).slice(0, limitPerSection);
  const used = new Set(newest.map((product) => product.node.id));

  const outdoorCategory = CATEGORIES.find((category) => category.handle === "piante-da-esterno");
  const outdoorHandles = [
    outdoorCategory?.handle,
    ...(outdoorCategory?.links.map((link) => link.handle) ?? []),
  ].filter((handle): handle is string => Boolean(handle));
  const outdoor = selectDiversified(eligible, outdoorHandles, used, limitPerSection);
  outdoor.forEach((product) => used.add(product.node.id));

  const botanicalHandles = CATEGORIES
    .filter((category) => ["rose", "piante-da-frutto", "conifere"].includes(category.handle))
    .flatMap((category) => [category.handle, ...category.links.map((link) => link.handle)]);
  const bulbs = CATEGORIES.flatMap((category) => category.links)
    .find((link) => link.handle === "bulbi")?.handle;
  if (bulbs) botanicalHandles.push(bulbs);
  const botanical = selectDiversified(eligible, botanicalHandles, used, limitPerSection);

  return { newest, outdoor, botanical };
}

function canonicalParentHandles(product: ShopifyProduct): Set<string> {
  const parents = new Set<string>();
  for (const handle of productCollectionHandles(product)) {
    const collection = canonicalByHandle.get(handle);
    if (!collection) continue;
    parents.add(collection.parentHandle ?? collection.handle);
  }
  return parents;
}

export function selectRelatedProducts(
  current: ShopifyProduct,
  candidates: ShopifyProduct[],
  limit = 4,
): ShopifyProduct[] {
  const currentHandles = new Set(productCollectionHandles(current));
  const currentParents = canonicalParentHandles(current);
  const eligible = uniqueProducts(
    candidates.filter((product) =>
      product.node.id !== current.node.id &&
      productHasImage(product) &&
      productIsPublished(product),
    ),
    new Set(),
  );

  const score = (product: ShopifyProduct): number => {
    const handles = productCollectionHandles(product);
    if (handles.some((handle) => currentHandles.has(handle))) return 0;
    const parents = canonicalParentHandles(product);
    if ([...parents].some((parent) => currentParents.has(parent))) return 1;
    return 2;
  };

  const ranked = eligible
    .map((product, index) => ({
      product,
      index,
      availability: productIsAvailable(product) ? 0 : 1,
      relevance: score(product),
    }))
    .sort((left, right) =>
      left.relevance - right.relevance ||
      left.availability - right.availability ||
      left.index - right.index,
    );
  const available = ranked.filter((entry) => entry.availability === 0);
  const unavailable = ranked.filter((entry) => entry.availability === 1);

  return [...available, ...unavailable]
    .slice(0, limit)
    .map((entry) => entry.product);
}
