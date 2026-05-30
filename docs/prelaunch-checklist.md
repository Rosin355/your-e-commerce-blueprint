# Prelaunch Checklist — OnlineGarden

Manual smoke checks to run before a production launch. Each item should pass without
silent failures, infinite spinners, or broken flows.

## Storefront (public)

- [ ] **1. Homepage resilience** — Homepage (`/`) loads even if the Shopify API errors.
      Each product section shows products or a graceful "Nessun prodotto disponibile"
      message — never an infinite spinner.
- [ ] **2. Collections** — `/collections/all` loads products or a graceful empty state.
      `/collections/:handle` also resolves or shows empty state.
- [ ] **3. Product detail page** — `/products/:handle` loads the product. When the selected
      variant is unavailable, **Add to cart** and **Buy now** are disabled.
- [ ] **4. Add to cart** — Adding a product updates the cart count and drawer correctly.
- [ ] **5. Cart checkout** — "Procedi al Checkout" opens a **fresh** Shopify checkout URL
      (new tab). The URL is the one returned by the just-created cart.
- [ ] **6. Checkout failure handling** — If checkout creation fails (e.g. Shopify 402/error),
      a clear toast appears and **no stale URL is opened**. The loading state always resets.
- [ ] **7. Buy now** — "Acquista ora" on the PDP opens a fresh Shopify checkout URL for the
      selected variant, with the same failure handling as above.

## Admin security

- [ ] **8. Admin import access** — `/admin/import` is inaccessible to non-admin / signed-out
      users (Supabase Auth + `user_roles`).
- [ ] **9. shopify-admin-proxy auth** — The `shopify-admin-proxy` edge function rejects
      non-admin calls (401/403) via `assertAdminRequest`.
- [ ] **10. create-product-ai auth** — The `create-product-ai` edge function rejects
      non-admin calls (401/403). Anonymous users cannot generate AI content or create products.

## Importer & AI writer

- [ ] **11. Product matching** — CSV product import matches an existing product by **SKU first,
      then handle, then title**. Two products with similar titles are not confused.
      Dry-run reports whether each row would be *created* or *updated* (and the match method).
- [ ] **12. Marketing consent** — Customer import does **not** subscribe customers to email
      marketing unless the CSV has an explicit opt-in column/value
      (`accepts_marketing`, `marketing_opt_in`, or `newsletter`).
- [ ] **13. AI Writer draft** — The AI Writer can generate a draft for an existing product.
- [ ] **14. AI Writer publish** — Publishing updates only `body_html`, SEO fields
      (`metafields_global_title_tag` / `_description_tag`), and image alt text.
- [ ] **AI HTML preview** — The generated-HTML preview is sanitized (no script execution),
      while the intended HTML is still sent to Shopify on publish.

## Build / deploy

- [ ] **15. Lovable preview** — After pushing to `main`, the Lovable preview still builds and
      works. Verify locally first:
      ```bash
      npm ci
      npm run build
      npm run lint
      npm run typecheck
      ```

## How to test checkout safely before launch

1. Use Shopify's **test mode** (Bogus Gateway) or a development store so no real card is charged.
2. Add a product to the cart and click **Procedi al Checkout** — confirm a fresh checkout URL opens.
3. Temporarily break the Storefront token (e.g. set an invalid `VITE_SHOPIFY_STOREFRONT_TOKEN`)
   to confirm the failure path shows a toast and never opens a stale URL. Restore the token after.
4. Complete a full test order end-to-end on the dev/test store before switching to live payments.
