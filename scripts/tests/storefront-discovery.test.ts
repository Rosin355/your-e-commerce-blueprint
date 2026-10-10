import assert from "node:assert/strict";
import test from "node:test";
import type { ShopifyProduct } from "../../src/lib/shopify.ts";
import {
  normalizeSearchText,
  searchCatalogProducts,
  selectHomepageProducts,
  selectRelatedProducts,
} from "../../src/lib/storefrontDiscovery.ts";

function product(input: {
  id: string;
  title?: string;
  collections?: string[];
  publishedAt?: string;
  image?: boolean;
  available?: boolean;
  description?: string;
  productType?: string;
  tags?: string[];
}): ShopifyProduct {
  return {
    node: {
      id: input.id,
      title: input.title ?? input.id,
      handle: input.id.toLowerCase(),
      description: input.description ?? "",
      publishedAt: input.publishedAt ?? "2026-01-01T00:00:00Z",
      availableForSale: input.available ?? true,
      collections: {
        edges: (input.collections ?? []).map((handle) => ({
          node: { handle, title: handle },
        })),
      },
      productType: input.productType ?? null,
      tags: input.tags ?? [],
      vendor: "Online Garden",
      priceRange: { minVariantPrice: { amount: "10.00", currencyCode: "EUR" } },
      images: {
        edges: input.image === false ? [] : [{ node: { url: `https://example.test/${input.id}.jpg`, altText: null } }],
      },
      variants: {
        edges: [{
          node: {
            id: `${input.id}-variant`,
            title: "Default",
            price: { amount: "10.00", currencyCode: "EUR" },
            availableForSale: input.available ?? true,
            selectedOptions: [],
          },
        }],
      },
      options: [],
    },
  };
}

test("ricerca normalizza accenti e conserva la priorità del titolo", () => {
  assert.equal(normalizeSearchText("  Novità d’Estate  "), "novita d estate");
  const exact = product({ id: "exact", title: "Arbusti" });
  const collection = product({ id: "collection", title: "Viburno", collections: ["arbusti"] });
  assert.deepEqual(searchCatalogProducts([collection, exact], "arbusti").map((item) => item.node.id), [
    "exact",
    "collection",
  ]);
});

test("ricerca riconosce categorie canoniche, sottocategorie e singolare/plurale", () => {
  const catalog = [
    product({ id: "outdoor", collections: ["piante-da-esterno"] }),
    product({ id: "shrub", collections: ["arbusti"] }),
    product({ id: "hedge", collections: ["piante-da-siepe"] }),
    product({ id: "climbing-rose", collections: ["rose-rampicanti"] }),
    product({ id: "fruit", collections: ["piante-da-frutto"] }),
  ];

  assert.deepEqual(searchCatalogProducts(catalog, "piante da esterno").map((item) => item.node.id), [
    "outdoor",
    "shrub",
    "hedge",
  ]);
  assert.deepEqual(searchCatalogProducts(catalog, "arbusto").map((item) => item.node.id), ["shrub"]);
  assert.deepEqual(searchCatalogProducts(catalog, "siepe").map((item) => item.node.id), ["hedge"]);
  assert.deepEqual(searchCatalogProducts(catalog, "rose rampicanti").map((item) => item.node.id), ["climbing-rose"]);
  assert.deepEqual(searchCatalogProducts(catalog, "piante da frutto").map((item) => item.node.id), ["fruit"]);
});

test("ricerca parziale del titolo riconosce termini separati e singolare/plurale", () => {
  const climbingRose = product({ id: "climbing-rose", title: "Rosa Michka - Rampicante" });
  const genericRose = product({ id: "generic-rose", title: "Rosa rugosa" });

  assert.deepEqual(
    searchCatalogProducts([genericRose, climbingRose], "rose rampicanti").map((item) => item.node.id),
    ["climbing-rose"],
  );
});

test("ricerca mantiene fallback su product type, tag e descrizione", () => {
  const byType = product({ id: "type", productType: "Perenne" });
  const byTag = product({ id: "tag", tags: ["ombra"] });
  const byDescription = product({ id: "description", description: "Ideale per terreni drenanti" });
  assert.deepEqual(searchCatalogProducts([byDescription, byTag, byType], "perenne").map((item) => item.node.id), ["type"]);
  assert.deepEqual(searchCatalogProducts([byDescription, byTag, byType], "ombra").map((item) => item.node.id), ["tag"]);
  assert.deepEqual(searchCatalogProducts([byDescription, byTag, byType], "drenanti").map((item) => item.node.id), ["description"]);
});

test("homepage seleziona tre sezioni stabili senza duplicati", () => {
  const products = [
    product({ id: "new-unavailable", collections: ["accessori"], publishedAt: "2026-10-10T00:00:00Z", available: false }),
    ...Array.from({ length: 4 }, (_, index) => product({
      id: `new-${index}`,
      collections: ["accessori"],
      publishedAt: `2026-10-0${9 - index}T00:00:00Z`,
    })),
    product({ id: "out-1", collections: ["arbusti"], publishedAt: "2026-09-10T00:00:00Z" }),
    product({ id: "out-2", collections: ["alberi"], publishedAt: "2026-09-09T00:00:00Z" }),
    product({ id: "out-3", collections: ["aromatiche"], publishedAt: "2026-09-08T00:00:00Z" }),
    product({ id: "out-4", collections: ["rampicanti"], publishedAt: "2026-09-07T00:00:00Z" }),
    product({ id: "bot-1", collections: ["rose"], publishedAt: "2026-08-10T00:00:00Z" }),
    product({ id: "bot-2", collections: ["alberi-da-frutto"], publishedAt: "2026-08-09T00:00:00Z" }),
    product({ id: "bot-3", collections: ["conifere"], publishedAt: "2026-08-08T00:00:00Z" }),
    product({ id: "bot-4", collections: ["bulbi"], publishedAt: "2026-08-07T00:00:00Z" }),
  ];
  const first = selectHomepageProducts(products);
  const second = selectHomepageProducts(products);
  const allIds = [...first.newest, ...first.outdoor, ...first.botanical].map((item) => item.node.id);

  assert.deepEqual(first, second);
  assert.equal(first.newest.length, 4);
  assert.equal(first.newest.some((item) => item.node.id === "new-unavailable"), false);
  assert.equal(first.outdoor.length, 4);
  assert.equal(first.botanical.length, 4);
  assert.equal(new Set(allIds).size, allIds.length);
});

test("raccomandazioni privilegiano collezione, sibling e disponibilità senza duplicati", () => {
  const current = product({ id: "current", collections: ["rose-rampicanti"] });
  const sameUnavailable = product({ id: "same-unavailable", collections: ["rose-rampicanti"], available: false });
  const sameAvailable = product({ id: "same-available", collections: ["rose-rampicanti"] });
  const sibling = product({ id: "sibling", collections: ["rose-profumate"] });
  const fallback = product({ id: "fallback", collections: ["arbusti"] });
  const fallbackTwo = product({ id: "fallback-two", collections: ["alberi"] });
  const withoutImage = product({ id: "without-image", collections: ["rose-rampicanti"], image: false });

  assert.deepEqual(
    selectRelatedProducts(
      current,
      [current, sameUnavailable, sibling, fallback, sameAvailable, withoutImage, sameAvailable, fallbackTwo],
      4,
    ).map((item) => item.node.id),
    ["same-available", "sibling", "fallback", "fallback-two"],
  );
});
