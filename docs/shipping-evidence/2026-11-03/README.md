# Evidenze spedizioni — 3 novembre 2026

**Aggiornamento motore PR #45:** [evidenze mirate, fonti e riproduzione](engine-selection/README.md). Spedizione per Mercati attiva sul Grow reale; vecchio input merchant DeliveryProfile superato. Intuitive candidato a collaudo isolato, non installato/certificato.

Follow-up Sendcloud: `sendcloud-followup-audit.json` registra la nuova lettura API e le osservazioni UI dell'app installata; `sendcloud-reaudit-*.graphql` e `sendcloud-schema-validation.json` conservano le tre query validate; `sendcloud-followup-local-checks.json` contiene 302 test spedizioni / 645 dominio, distinti dallo storico iniziale 295 / 638. Nessun nuovo servizio selezionato e nessuna configurazione live modificata. [Audit e limiti](../../SHIPPING-SENDCLOUD-AUDIT.md).

Letture dello store Shopify autorizzato, senza mutation. Nessun ordine o dato cliente letto.

- `audit.json`: identità store, piano Grow, EUR, imposte/fuso e scope del connettore.
- `profile.json`: backup integrale dei profili/zone/metodi/condizioni raccolti, con province e sedi; connessioni complete.
- `coverage.json`: contatore aggregato AT_LEAST; non usato come numero totale.
- `variants-profile-coverage.json`: paginazione completa delle associazioni di tutte le 1.392 varianti.
- `apps.json`, `carriers.json`, `customs.json`: app installate, zero servizi carrier, errore scope per Delivery Customization.
- `defs.json`, `variant-defs.json`, `shop-geo.json`: definizioni metafield e letture geografiche nei namespace controllati.
- `catalog.json`: 46 pagine, 1.364 prodotti, 1.392 varianti; campi e namespace logistici documentati, non un export generale di tutti i metafield.
- `classification-review.json`: matrice generata per ID variante/SKU, suggerimenti e campi di approvazione separati.
- `release-plan.json`: piano aggiornato al modello Mercati; `proposedVariables=null`, `rollback=null`, `deploymentCandidate=null`, gate bloccati. Le 18 specifiche restano solo riferimento commerciale.
- `checkout-matrix.json`: 720 casi di riferimento, nessuno eseguito nel checkout nativo.
- `validation-summary.json`, `schema-validation-final.json`: validazioni schema e correzione query portabile.
- `profile-target-input.graphql`: input storico di profilo **SUPERATO, NON ESEGUIRE** sul negozio migrato a Mercati. `classification-definition-input.graphql`: input separato validato, mai eseguito; nessuna classificazione è approvata per scrittura.
- `backup-manifest.json`: integrità SHA-256 delle evidenze di lettura e limiti del backup.
- `local-checks.json`: risultati locali, distinti dalle verifiche live mancanti.

Gli export sono dati commerciali di catalogo/configurazione, senza token o credenziali. Il backup copre lo scope letto, non le impostazioni interne delle app o l'intero negozio. Per il rilascio servirà ripetere il backup e confrontare lo stato corrente; nessuna prova di oggi autorizza modifiche future a uno stato cambiato.
