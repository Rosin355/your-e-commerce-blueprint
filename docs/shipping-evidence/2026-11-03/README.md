# Evidenze spedizioni — 3 novembre 2026

Letture dello store Shopify autorizzato, senza mutation. Nessun ordine o dato cliente letto.

- `audit.json`: identità store, piano Grow, EUR, imposte/fuso e scope del connettore.
- `profile.json`: backup integrale dei profili/zone/metodi/condizioni raccolti, con province e sedi; connessioni complete.
- `coverage.json`: contatore aggregato AT_LEAST; non usato come numero totale.
- `variants-profile-coverage.json`: paginazione completa delle associazioni di tutte le 1.392 varianti.
- `apps.json`, `carriers.json`, `customs.json`: app installate, zero servizi carrier, errore scope per Delivery Customization.
- `defs.json`, `variant-defs.json`, `shop-geo.json`: definizioni metafield e letture geografiche nei namespace controllati.
- `catalog.json`: 46 pagine, 1.364 prodotti, 1.392 varianti; campi e namespace logistici documentati, non un export generale di tutti i metafield.
- `classification-review.json`: matrice generata per ID variante/SKU, suggerimenti e campi di approvazione separati.
- `release-plan.json`: payload proposto delle 18 regole, ID legacy per rollback, fingerprint e gate bloccati. **Non eseguibile come autorizzazione al live.**
- `checkout-matrix.json`: 720 casi di riferimento, nessuno eseguito nel checkout nativo.
- `validation-summary.json`, `schema-validation-final.json`: validazioni schema e correzione query portabile.
- `profile-target-input.graphql`, `classification-definition-input.graphql`: input completi validati, **mai eseguiti**.
- `backup-manifest.json`: integrità SHA-256 delle evidenze di lettura e limiti del backup.
- `local-checks.json`: risultati locali, distinti dalle verifiche live mancanti.

Gli export sono dati commerciali di catalogo/configurazione, senza token o credenziali. Il backup copre lo scope letto, non le impostazioni interne delle app o l'intero negozio. Per il rilascio servirà ripetere il backup e confrontare lo stato corrente; nessuna prova di oggi autorizza modifiche future a uno stato cambiato.
