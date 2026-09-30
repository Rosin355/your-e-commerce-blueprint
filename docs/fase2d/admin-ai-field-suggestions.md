# Fase 2D — Admin AI field-by-field

Stato: **CODE READY FOR REVIEW — NON DEPLOYATO**

Baseline Git: `origin/main@193135224886e8d022e17ddf6e1b4d16f9dc8629`

Branch isolato: `codex/admin-ai-field-suggestions`

## Architecture note

La nuova funzione usa un endpoint dedicato `product-admin-ai`. Il browser invia soltanto
`productId`, `fieldKey`, `baseVersion` e, per accettare, il valore revisionato e una chiave
di idempotenza. Il server ricostruisce identità, ruoli, definizione campo, valore corrente,
snapshot e contesto: il client non può scegliere prompt, contesto o modello.

La proposta viene salvata in `public.product_ai_suggestions`; la generazione non aggiorna
`product_current_values` e non richiama Shopify. L'accettazione passa dallo stesso
`executeCommand(... action: update_field ...)` usato da Admin V2, quindi conserva controllo
`expectedVersion`, command log, history e idempotenza della RPC atomica. Rifiuto e stale
modificano soltanto lo stato della proposta.

### Riuso sicuro

- riusati: `authenticate`, ruoli/canary, `getFieldDefinition`, `getCurrentValue`,
  `validateCommand`, `executeCommand`, serializer e codec tipizzati Admin V2;
- riusata solo la configurazione server-side `LOVABLE_API_KEY` e il protocollo compatibile
  OpenAI del gateway Lovable;
- non riusati: `create-product-ai`, AI Writer legacy, `shopify-admin-proxy`, pipeline bulk,
  fallback mock e qualunque funzione di publish/update Shopify;
- nessun import del client Shopify è presente nel nuovo endpoint.

### Compatibilità schema

`product_ai_suggestions` possiede già `id`, `product_id`, `field_key`, valore proposto
(`suggestion_text`/`suggestion_json`), `base_version`, `prompt_version`, `model`, `status`,
`created_by` e timestamp. Non serve una migration.

La tabella ammette gli stati DB `pending`, `accepted`, `discarded`, `superseded`. Il contratto
API espone rispettivamente `pending`, `accepted`, `rejected`, `stale`; questa mappatura evita
una modifica retroattiva del CHECK live. `model` registra `provider/modello` e `prompt_hint`
registra la strategia, senza memorizzare chiavi o prompt completi.

L'accesso diretto resta invariato: `anon` non ha grant, `authenticated` ha solo
SELECT vincolata dalla policy `can_edit_products(auth.uid())`, `service_role`
gestisce le scritture server-side. Il trigger `assert_ai_field_allowed` resta una
seconda difesa DB sugli INSERT. Nessuna policy, grant o trigger viene modificato.

### Confini di sicurezza

- capability AI autoritativa sul server: `editable`, `visible`, `ai_allowed`, non
  `manual_only`, applicabilità entity, gruppo/chiave non strutturale, strategia supportata;
- i cinque campi manuali (`nome_comune`, `ibridatore`, `colore_fiore`, `colore_foglia`,
  `curiosita`) restano esclusi;
- una proposta parte sempre dalla versione corrente e non può superarne una più recente;
- nessuna generazione automatica, bulk, retry della write o side effect Shopify;
- segreto provider esclusivamente nell'ambiente Edge; log redatti e limite richieste server.

## Campi idonei

Il registry resta la prima fonte (`visible`, `editable`, `ai_allowed`,
`manual_only`, `applies_to`), ma non basta da solo. Il server richiede anche:

- current value esistente, non vuoto, non locked e in formato supportato;
- chiave non strutturale e gruppo modificabile;
- strategia prompt esplicita;
- ruolo di scrittura e gate della modalità corrente.

Strategie disponibili:

- testo: `title`, `commercial_title`, `description`, `short_description`,
  `optimized_description`, `short_intro`, `promo_text`, `titolo_sezione_faq`,
  `care_guide`, `care_info`, `come_prendersene_cura`,
  `conosci_meglio_la_tua_pianta`, `seo_title`, `seo_description`;
- liste: `key_benefits`, `key_features`, `special_bullets`, `image_alt_texts`,
  `keywords_suggested`, `internal_links_suggestions`;
- struttura canonica: `faq` come array ordinato di `{question, answer}`.

In canary la capability effettiva è ulteriormente limitata a `title`,
`short_description`, `description`, `seo_title`, `seo_description` e
`optimized_description`. Non occorre cambiare la UI per ampliare una strategia:
la decisione arriva dal server.

Restano sempre esclusi i cinque manual-only, identità/GTIN/handle, prezzo,
inventario, tipo entità, relazioni, stato pubblicazione, stato Shopify e campi
botanici fattuali senza strategia verificata.

## Contratto API

Endpoint `product-admin-ai`, solo JWT utente verificato e ruoli caricati dal DB.

| Action | Input | Effetto |
|---|---|---|
| `get_ai_suggestions` | `productId` | legge le pending; espone `stale` se la versione corrente è cambiata |
| `generate_ai_suggestion` | `productId`, `fieldKey`, `baseVersion` | una call provider e una riga separata; nessun current value modificato |
| `reject_ai_suggestion` | `suggestionId` | `discarded`/`rejected`; nessuna history prodotto |
| `accept_ai_suggestion` | `suggestionId`, valore revisionato, `expectedVersion`, idempotency key | normale `update_field`, poi stato `accepted` |

Una pending sulla stessa versione viene restituita come replay senza nuova call
AI. Una pending superata viene `superseded`; il nuovo tentativo produce una
nuova riga. Il limite è cinque generazioni per attore in 60 secondi. Non ci sono
polling, job background o retry automatici della write.

## Contesto e provider

Il client non invia prompt o contesto. Il server usa solamente:

- valore corrente del campo;
- originale dello snapshot puntuale, oppure baseline esplicitamente non
  collegata quando `source_snapshot_id` è `NULL`;
- titolo, titolo commerciale, descrizioni, nome botanico e categorie correnti
  pertinenti, troncati a limiti conservativi;
- identità SKU e label del campo.

`source_snapshot_id=NULL` resta `NULL`: il sistema non inventa lineage. I prompt
vietano nuovi fatti botanici, misure, esposizione, rusticità, tossicità,
fioritura, certificazioni, disponibilità, prezzi e claim. Con evidenza limitata
la proposta può solo migliorare forma e chiarezza.

Il provider è il gateway Lovable già configurato, ma in un client nuovo senza
dipendenze Shopify. `LOVABLE_API_KEY` resta server-side; `ADMIN_AI_MODEL` e
`ADMIN_AI_TIMEOUT_MS` sono opzionali. Timeout predefinito 12 secondi, output
strutturato, temperatura 0,2 e massimo 2.000 token. I log contengono solo actor
redatto, field key, replay e consumo aggregato se disponibile.

## UX e stale handling

La FieldCard mostra il bottone solo con `canSuggestAi=true`. Gli stati sono:
idle, loading, proposal, editing, accepted, rejected, stale e provider error.
La proposta usa lo stesso editor tipizzato del campo; le FAQ non mostrano JSON.

Se `base_version` non coincide più, l'UI mostra:

> Il prodotto è stato modificato dopo la creazione di questa proposta. Genera
> una nuova proposta.

Sono disponibili soltanto Scarta e Genera nuova proposta. Non viene ritentata
la write. L'accettazione usa una idempotency key stabile per la durata della
proposta: un retry esatto ritorna il risultato già applicato senza nuova
version/history/command log; un payload diverso resta
`IDEMPOTENCY_CONFLICT`.

Layout e accessibilità offline: griglia a una colonna su 390 px e due colonne
da `md` (copre circa 820/1440 px), azioni wrappabili, focus nativo, label per
editor e `aria-live` per loading/errori. Lo smoke browser reale resta un gate
di rilascio perché il frontend non è stato pubblicato.

## Test eseguiti

| Gate | Esito |
|---|---|
| `npm ci` | PASS, lockfile invariato |
| test AI mirati | PASS 22/22; coprono i casi richiesti inclusi replay pending, conflitto idempotente e markup attivo |
| `npm run test:catalog` | PASS 232/232 |
| `npm run typecheck` | PASS |
| `deno check product-admin-ai` | PASS |
| `deno check product-admin-api` | PASS |
| `npm run build` | PASS; soli warning preesistenti Tailwind/chunk size |
| `git diff --check` | PASS |

I test non chiamano provider, database, AI o Shopify live. Provider e repository
sono fixture sintetiche; il test statico impedisce import di client Shopify o
publish legacy nel nuovo endpoint.

## Piano di rilascio

1. review del diff e conferma che non esistano migration;
2. confermare `LOVABLE_API_KEY` e scegliere `ADMIN_AI_MODEL` senza esporre i
   valori;
3. deploy `product-admin-ai` dalla revisione approvata;
4. deploy `product-admin-api` dalla stessa revisione, mantenendo canary;
5. smoke read-only di auth, capability e lista suggestion;
6. pubblicare il frontend della stessa revisione;
7. test di generazione su un campo/fixture approvati: verificare una sola riga
   pending e zero variazioni di current/history/command log;
8. STOP prima di Accetta finché non è autorizzata la scrittura;
9. dopo approvazione, test accept/replay/conflict e verifica esplicita di zero
   chiamate Shopify.

Non pubblicare il frontend se uno dei due endpoint non è disponibile. Nessuna
migration è richiesta o deve essere applicata.

## Rollback

- mettere temporaneamente il frontend precedente, così il bottone sparisce;
- ripristinare `product-admin-api` alla revisione precedente compatibile;
- rimuovere/disabilitare `product-admin-ai` soltanto dopo il rollback frontend;
- le suggestion già create restano dati separati e non modificano il catalogo;
- non cancellare suggestion/history e non toccare Shopify per il rollback.

## Stato conclusivo

- migration: **NO**;
- deploy/frontend publish: **NON ESEGUITI**;
- AI live: **NON CHIAMATA**;
- database live: **NON TOCCATO**;
- Shopify/storefront: **NON TOCCATI**.

**2D ADMIN AI — CODE READY FOR REVIEW**
