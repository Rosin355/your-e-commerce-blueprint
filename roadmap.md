# Security audit — Online Garden

- [x] Validate all 15 existing findings against current source and live read-only evidence; runtime order retirement remains unverified.
- [x] Prepare and test source-only fixes for confirmed endpoint vulnerabilities.
- [x] Verify Admin V2, storefront and cart without purchases or catalog writes.
- [ ] Complete checkout verification — pre-Publish check again stuck on checkout creation; requires diagnosis authorization.
- [x] Repeat quick security scan.
- [ ] Obtain final deep scan — final saved migration requires asynchronous scan result.
- [x] Report every finding and request approval before preparing production permission changes.
- [x] Apply approved role-disclosure restriction; preserve grants, roles, capabilities and policies.
- [ ] Verify Marco's authenticated UI — existing Admin session available, no Marco session authorized.
- [ ] Publish authorized but stopped: checkout verification failed; no frontend publication performed.