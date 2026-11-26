# Architecture rules

- Legacy privileged export, enrichment, image, collection and connection tools must await `denyUnlessAdmin` before reading input or contacting providers; it delegates to the existing verified-token/database-admin-role check to preserve staff access without trusting client claims.
- Security endpoint regression tests execute actual handlers with closed synthetic providers; production mutations and paid AI must never be used to validate an authorization fix.
- Role predicates allow only self checks, verified service-role claims, or the postgres session identity; use session_user rather than SECURITY DEFINER current_user to prevent owner-based authorization bypass.
- Confirmed-fact descriptions use evidence-indexed editorial sections rendered through the shared HTML sanitizer; provider failures or extractive copies fail closed, because AI proposals must remain separate from manually approved drafts.
- Gallery/format reads use a lean paginated Shopify query after the existing scoped grant and family identity checks; mutation snapshots retain their stricter completeness limits to avoid requiring shipping data for display.