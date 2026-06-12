# Risposte rapide alle 4 domande

### 1. I prodotti in DRAFT restano DRAFT dopo la pubblicazione?
**Sì, restano DRAFT.** Verificato nel codice: `publishReviewedDraft` non invia mai il campo `status` a Shopify. Il proxy `update_product` chiama Shopify `PUT products/{id}.json` solo con `body_html`, SEO e metafield — Shopify quindi mantiene lo stato esistente del prodotto (draft → draft, active → active). I metafield vengono aggiornati in upsert per `namespace+key` senza creare duplicati. Nessun cambio di stato automatico.

### 2. Crea da dati essenziali — funziona?
Il pulsante esiste (`ProductEnrichmentPanel.tsx` → tab "Crea da dati essenziali" → `ModeBPanel`) e chiama `generateFromEssentials(form)` che invoca `create-product-ai` per generare i contenuti AI e produrre un `EnrichedProductDraft` locale. **Manca però l'azione finale di pubblicazione su Shopify**: la bozza viene mostrata in preview e si può scaricare il CSV, ma non c'è un pulsante "Pubblica su Shopify" come nel Mode A. Il pannello "Nuovo Prodotto AI" (`NewProductAIPanel.tsx`) ha invece `createOnShopify` ma è un flusso separato. Sistemo aggiungendo il bottone di pubblicazione in Mode B.

### 3. Bug parentesi quadre `["...","..."]` mostrate nella PDP
Causa identificata: nel salvataggio metafield (`productEnrichmentEngine.ts → mapAiOutputToMetafields`):
- `key_features`, `special_bullets`, `attributi_prodotto` vengono salvati come **stringhe JSON** (`JSON.stringify([...])`)
- Ma lo storefront (`Pdp.tsx`) li legge con `parseMultilineMetafield` che si aspetta righe separate da `\n` → la stringa JSON viene mostrata letterale con tutte le `[]` e `""`
- `attributi_prodotto` inoltre dovrebbe essere un array di oggetti `{key,value}` secondo `parseProductAttributes` — oggi è solo un array di stringhe → non viene mai renderizzato

### 4. Compilare TUTTI i campi con AI (anche periodo fioritura, potatura, ecc.)
Oggi `periodo_di_fioritura`, `periodo_di_messa_a_dimora`, `periodo_di_raccolta`, `periodo_ottimale_di_potatura`, `nome_botanico` e `origini_e_habitat` restano vuoti perché considerati "factual". Il cliente preferisce avere comunque un valore AI (anche da correggere a mano). Si estende il prompt e il mapping per coprirli.

---

# Piano implementativo

## A. Fix formattazione liste (parentesi quadre)

**File: `src/admin/lib/productEnrichmentEngine.ts → mapAiOutputToMetafields`**

- `key_features` → salva come testo multilinea (`(content.key_benefits ?? []).join("\n")`) invece di JSON
- `special_bullets` → idem (`characteristics.join("\n")`)
- `attributi_prodotto` → serializza come JSON array di oggetti `[{ "key": "...", "value": "..." }]` per essere compatibile con `parseProductAttributes`. Il prompt AI verrà aggiornato per restituire `characteristics` come oggetti `{key,value}` (es. `{key:"Fioritura", value:"primavera"}`) oppure si fa un parsing euristico se la frase è del tipo `"Foglie: verdi lucide"`.

**File: `supabase/functions/shopify-admin-proxy/index.ts → METAFIELD_TYPES`**

- `key_features`: `list.single_line_text_field` → `multi_line_text_field`
- `special_bullets`: `list.single_line_text_field` → `multi_line_text_field`
- `attributi_prodotto`: resta `list.single_line_text_field` se ridefinito su Shopify come list di JSON, oppure si imposta come `json` (più sicuro per oggetti). Sceglieremo `json` per allinearsi al parser PDP.

> Nota: il `normalizeMetafieldValue` già adatta il tipo "live" letto dalla definizione Shopify, quindi se il cliente ha già creato la definition come list, viene rispettata. Aggiungeremo log esplicito.

## B. Stato DRAFT preservato + opzione esplicita

**File: `src/admin/lib/aiWriterEngine.ts → publishReviewedDraft`**

- Aggiungere parametro opzionale `keepStatus?: boolean` (default `true`) per documentare il comportamento attuale: NON si invia `status` → Shopify mantiene draft/active.
- Aggiungere parametro `publishStatus?: 'draft' | 'active'` (opzionale, NON usato di default) per attivazioni manuali future.

**File: `ProductEnrichmentPanel.tsx`**

- Aggiungere chip informativo accanto ai pulsanti di pubblicazione:
  > "Lo stato attuale del prodotto (ACTIVE / DRAFT) non viene modificato"

## C. AI compila TUTTI i 19 metafield (umanizzato)

**File: `supabase/functions/create-product-ai/index.ts`** — estendere il prompt:

- Aggiungere allo schema JSON di output:
  - `botanical_name` (stringa)
  - `origins_habitat` (paragrafo 1-2 frasi)
  - `flowering_period`, `pruning_period`, `planting_period`, `harvest_period` (stringhe es. "Aprile-Giugno", oppure "—" se non applicabile)
  - `characteristics` come array di oggetti `{key, value}` (es. `{key:"Portamento", value:"Arbustivo eretto"}`) — necessario per `attributi_prodotto`
- Istruzione al modello: **tono umanizzato, conversazionale, senza claim medici, niente parentesi quadre, niente liste JSON nel testo libero, scrivi in italiano naturale**. Se un campo botanico è incerto, fornisci il valore più probabile e segnala con un breve disclaimer interno (es. "valore stimato — verificare").

**File: `productEnrichmentEngine.ts → mapAiOutputToMetafields`**

- Popolare `nome_botanico` (se `input.nome_botanico` vuoto, usa `content.botanical_name`)
- Popolare `origini_e_habitat` da `content.origins_habitat`
- Popolare i 4 periodi da `content.flowering_period` ecc.
- Aggiornare `attributi_prodotto` per usare i nuovi oggetti `{key,value}`

**File: `src/admin/types/productEnrichment.ts`**

- Spostare i campi periodo + nome_botanico + origini_e_habitat da `MANUAL_KEYS` → `AI_GENERATED_KEYS`
- Aggiornare la UI: rimuovere il banner "campi factual lasciati vuoti per compilazione manuale" e mostrare invece "tutti i 19 metafield compilati da AI — rivedi i campi botanici e correggi se necessario"

## D. Pulsante "Pubblica su Shopify" in Mode B (Crea da dati essenziali)

**File: `ProductEnrichmentPanel.tsx → ModeBPanel`**

Dopo la card di preview della bozza, aggiungere:
- Pulsante **"Pubblica su Shopify"** che invoca `publishReviewedDraft({ handle: draft.input_handle, sku: form.variant_sku, bodyHtml: draft.body_html, seoTitle, seoDescription, metafields: draft.metafields })`
- Se il prodotto non esiste su Shopify (errore "Prodotto non trovato"), mostrare toast con istruzione: "Crea prima il prodotto base via Mode A o tab Nuovo Prodotto AI"
- In alternativa, opzione "Crea nuovo" che invoca `create_product` proxy action con i dati essenziali + AI

## Riepilogo file toccati

1. `src/admin/lib/productEnrichmentEngine.ts` — mapping liste + nuovi campi
2. `src/admin/types/productEnrichment.ts` — riclassificazione AI/MANUAL keys
3. `src/admin/lib/aiWriterEngine.ts` — parametri documentati su status
4. `src/admin/components/ProductEnrichmentPanel.tsx` — UI banner, ModeB pulsante pubblica, badge stato preservato
5. `supabase/functions/create-product-ai/index.ts` — prompt esteso con 6 nuovi campi e tono umano
6. `supabase/functions/shopify-admin-proxy/index.ts` — METAFIELD_TYPES aggiornati

## Cosa NON viene toccato

- Schema DB
- Auth / whitelist admin
- Logica di lookup idempotente (handle/sku) — già corretta
- Stato Shopify del prodotto — non modificato dal flusso (confermato)
