console.warn(
  "[deprecated] sync/woocommerce-to-shopify-template.mjs ora delega a sync/product-enrich-and-build-draft-csv.mjs",
);

await import("./product-enrich-and-build-draft-csv.mjs");
