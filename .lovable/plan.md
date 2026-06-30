
# Piano tecnico — Richieste cliente 12 giugno

Lavorerò per step piccoli e verificabili. Ogni step si chiude con una validazione prima di passare al successivo. Nessuna modifica a checkout, nessuna creazione automatica di prodotti, nessuna migration DB senza tua approvazione esplicita.

Legenda tag:
- **[FE]** solo frontend
- **[FN]** Edge Function / Shopify Admin API
- **[DB]** richiede migration Supabase (te la propongo prima)
- **[SHOPIFY-MANUAL]** azione manuale in Shopify Admin (o dry-run con lista azioni da confermare)

---

## STEP 1 — Riorganizzazione categorie NavBar + Footer  [FE + SHOPIFY-MANUAL]

**Obiettivo:** allineare menu NavBar e Footer alle nuove categorie del cliente, e preparare le collezioni Shopify (in dry-run) prima di crearle.

**Sotto-step:**
1.1 Mappare la lista finale `aggiungi/togli` in una struttura unica condivisa NavBar+Footer.
1.2 Aggiornare i componenti di navigazione.
1.3 Generare un report "collezioni da creare su Shopify" con handle proposti — **NON** le creo, te lo do come lista da confermare.
1.4 Solo dopo OK, eseguo creazione collezioni via Admin API (vuote, il cliente aggiunge i prodotti).

**Modifiche nette dalla lista cliente:**
- Piante da frutto: rimuovi `Agrumi`, `Varietà da terrazzo`; aggiungi `Albero da frutto`
- Rose: rimuovi `Idee regalo`; aggiungi `Paesaggistiche`, `Fiore grande`
- Altre Categorie: aggiungi `Bulbi` (scheda prodotti)
- Piante da esterno: rimuovi `Balconi e terrazze`, `Fioriture stagionali`; aggiungi `Arbusti`, `Alberi`, `Erbacee perenni e graminacee`, `Piante da siepe`, `Piante grasse e succulente`, `Aromatiche`, `Rampicanti arbusti spalliera`
- Nuova top-level: `Conifere` (in attesa lista + foto da Marco)

**File toccati:**
- `src/components/Header.tsx` (menu desktop)
- `src/components/storefront/SiteHeader.tsx` (eventuale variante)
- `src/components/Footer.tsx`
- nuovo `src/config/categories.ts` (single source of truth)
- nuovo `scripts/shopify-collections-dryrun.ts` (genera CSV/JSON di handle proposti)

**Validazione:** screenshot Nav+Footer prima/dopo, file dry-run consegnato.

---

## STEP 2 — Metafield "Ibridatore", "Colore", "Colore foglia" per Rose  [SHOPIFY-MANUAL + FE]

**Obiettivo:** aggiungere 3 metafield in "specifiche rapide" PDP, con dropdown precompilato per Ibridatore (solo categoria Rose).

**Sotto-step:**
2.1 Ricerca web → lista canonica di ibridatori di rose (Meilland, Kordes, Austin, Tantau, Delbard, Guillot, Barni, ecc.).
2.2 Proporti la definizione metafield (namespace/key/type — single line `list.single_line_text_field` con choices) come **dry-run**: ti consegno SQL/JSON delle 3 definizioni da approvare.
2.3 Solo dopo OK, le creo via `metafieldDefinitionCreate` con uno script dedicato (NON tocca prodotti).
2.4 Estendere il rendering PDP per mostrarli nella sezione "specifiche rapide" + scrivere/leggere il valore.
2.5 Estendere AI enrichment (19 → 22 campi) **opzionale, da decidere dopo**.

**File toccati:**
- nuovo `scripts/create-rose-metafield-definitions.ts` (dry-run + apply)
- `src/components/storefront/pdpMetafields.ts`
- `src/components/storefront/Pdp.tsx`
- `src/admin/types/productEnrichment.ts` (solo se decidiamo di aggiungerli all'AI)

**Validazione:** PDP di una rosa mostra i 3 nuovi campi quando popolati; assenti se vuoti.

---

## STEP 3 — Sostituire "Spedizione e resi" con "Curiosità" (metafield)  [SHOPIFY-MANUAL + FE]

**Obiettivo:** in PDP rimuovere la card "Spedizione e resi" e mettere "Curiosità", popolata via metafield che il cliente compila a mano.

**Sotto-step:**
3.1 Verificare se esiste già `custom.curiosita` — se no, dry-run definizione metafield.
3.2 Rendering nuovo blocco "Curiosità" in PDP, fallback nascosto se vuoto.
3.3 Rimuovere blocco "Spedizione e resi" dal layout PDP.

**File toccati:**
- `src/components/storefront/Pdp.tsx`
- `src/components/storefront/pdpMetafields.ts`
- (eventuale) `scripts/create-curiosita-metafield-definition.ts`

**Validazione:** PDP mostra "Curiosità" al posto di "Spedizione e resi".

---

## STEP 4 — Banner verde sconto + bollino "Varietà garantita"  [FE + asset]

**Obiettivo:** sostituire l'attuale badge sconto con il banner verde stile sito vecchio; aggiungere bollino fidelizzazione "Varietà garantita".

**Sotto-step:**
4.1 Recuperare screenshot banner verde dal sito vecchio (te lo chiedo se non ce l'ho).
4.2 Implementare banner verde in PDP (componente dedicato).
4.3 Generare con AI immagine `varieta-garantita.png` (PNG trasparente, premium per testo leggibile).
4.4 Posizionarlo in PDP come trust badge.

**File toccati:**
- `src/components/storefront/Pdp.tsx`
- nuovo `src/components/storefront/PromoBanner.tsx`
- nuovo asset `src/assets/varieta-garantita.png`

**Validazione:** PDP mostra banner verde + bollino.

---

## STEP 5 — Recensioni Google + Trustpilot  [FE]

**Obiettivo:** integrare widget/dati recensioni Google e Trustpilot. **Solo recensioni reali**, mai fake.

**Sotto-step:**
5.1 Ti chiedo: Place ID Google Business e Business Unit ID Trustpilot.
5.2 Decidere modalità: widget ufficiali (script embed) vs API (Trustpilot Business API a pagamento, Google Places API a consumo).
5.3 Proporre approccio (widget embed = zero costi, integrazione in 1 step).
5.4 Aggiungere sezione "Dicono di noi" in homepage o footer.

**File toccati:**
- nuovo `src/components/storefront/ReviewsSection.tsx`
- `src/pages/Index.tsx` o `src/components/storefront/HomepageV3.tsx`

**Validazione:** widget visibili con dati live reali.

---

## STEP 6 — Pagina Admin "AI SEO Enrichment dashboard"  [FE]

**Obiettivo:** UI dedicata per avviare/monitorare l'AI enrichment, già parzialmente esistente in `ProductEnrichmentPanel`. Migliorie:
- vista risultati con diff "prima/dopo"
- modifiche proposte (review prima del publish)
- stato completamento per batch

**File toccati:**
- `src/admin/pages/AdminEnrichment.tsx` (nuova rotta) o estensione `ProductEnrichmentPanel.tsx`
- `src/admin/components/EnrichmentDiffView.tsx` (nuovo)

**Validazione:** admin può lanciare batch e vedere proposte review-then-publish.

---

## STEP 7 — Logging + alerting Edge Functions Admin API  [FN + DB opzionale]

**Obiettivo:** retry standardizzati e report errori comuni per le edge function che chiamano Shopify Admin API.

**Sotto-step:**
7.1 Estrarre helper condiviso `withAdminApiRetry()` in `supabase/functions/_shared/shopify-admin-client.ts` (già parziale).
7.2 Tabella `edge_function_error_log` per persistere errori — **ti propongo la migration prima**.
7.3 Pannello admin per vedere top errori ultimi 7gg.

**File toccati:**
- `supabase/functions/_shared/shopify-admin-client.ts`
- `supabase/functions/shopify-admin-proxy/index.ts` (uso helper)
- nuova migration (te la propongo) `edge_function_error_log`
- nuovo `src/admin/components/EdgeFunctionErrorsPanel.tsx`

**Validazione:** errore simulato compare nel pannello.

---

## STEP 8 — Webhook Shopify product create/update/delete  [FN + DB]

**Obiettivo:** sync immediato modifiche Shopify → DB locale.

**Sotto-step:**
8.1 **Migration da proporti**: aggiungere colonne `shopify_webhook_last_event`, `shopify_webhook_received_at` su `product_sync_csv_products`.
8.2 Nuova edge function pubblica `shopify-product-webhook` con verifica HMAC.
8.3 Script di registrazione webhook (dry-run lista azioni prima di chiamare `webhookSubscriptionCreate`).

**File toccati:**
- nuova `supabase/functions/shopify-product-webhook/index.ts`
- migration (proposta separata)
- nuovo `scripts/register-shopify-webhooks.ts` (dry-run)

**Validazione:** modifica manuale in Shopify → riga DB aggiornata entro pochi secondi.

---

## STEP 9 — Sincronizzazione automatica prodotti con paginazione  [FN]

**Obiettivo:** job periodico full-sync Shopify → DB con pagination cursor e stato avanzamento.

**Sotto-step:**
9.1 Estendere `start-product-sync` / `process-product-sync` per usare cursor GraphQL.
9.2 Job pg_cron (te lo propongo separato) per trigger schedulato.
9.3 UI stato avanzamento (riusa `ProductSyncPanel`).

**File toccati:**
- `supabase/functions/process-product-sync/index.ts`
- `supabase/functions/start-product-sync/index.ts`
- nuovo cron SQL (te lo propongo separato via insert tool — non migration)

**Validazione:** sync completo di 2706 prodotti senza timeout.

---

## Ordine consigliato di esecuzione

1. STEP 1 (categorie) — alto valore, basso rischio
2. STEP 3 (Curiosità) — quick win PDP
3. STEP 4 (banner + bollino) — quick win PDP
4. STEP 2 (metafield rose) — richiede ricerca + dry-run definizioni
5. STEP 5 (recensioni) — serve input cliente (Place ID + Trustpilot)
6. STEP 6 (admin enrichment UI) — solo frontend
7. STEP 7 (logging) — qualità infrastrutturale
8. STEP 8 (webhook) — sync live
9. STEP 9 (full sync) — sync batch

## Cosa mi serve da te per partire

- **STEP 1:** OK su mapping categorie + OK a creazione collezioni Shopify dopo dry-run
- **STEP 2:** OK su lista ibridatori che ti propongo
- **STEP 4:** screenshot banner verde sito vecchio
- **STEP 5:** Google Place ID + Trustpilot Business Unit ID
- **STEP 8 + 9:** OK su migration proposte prima dell'esecuzione

Confermi questo ordine o vuoi partire da uno step specifico?
