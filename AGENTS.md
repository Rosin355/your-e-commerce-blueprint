# Architecture rules

- Legacy privileged export, enrichment, image, collection and connection tools must await `denyUnlessAdmin` before reading input or contacting providers; it delegates to the existing verified-token/database-admin-role check to preserve staff access without trusting client claims.
- Security endpoint regression tests execute actual handlers with closed synthetic providers; production mutations and paid AI must never be used to validate an authorization fix.