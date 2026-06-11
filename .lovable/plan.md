## Perché i metafield sono vuoti

Non è un bug: oggi il pulsante **Pubblica su Shopify** è progettato per inviare via API **solo** `body_html`, `seo_title`, `seo_description` e gli `alt` delle immagini. Lo dice anche il banner giallo nell'admin: «I 16 metafield personalizzati non vengono salvati da questo pulsante — vanno esportati e importati tramite il CSV».

Quindi i 16 metafield generati dall'AI (visibili nella tabella "Metafield CSV Shopify — 16 campi") restano nel database Lovable e nel CSV scaricabile, ma non vengono scritti su Shopify finché non importi il CSV.

## Cosa propongo di cambiare

Estendere la pubblicazione perché scriva **anche i 16 metafield** direttamente su Shopify via Admin API, in un'unica operazione. Niente più CSV manuale.

### Comportamento finale
1. Clic su "Pubblica su Shopify" (sia singolo che "tutti") aggiorna:
   - body HTML, SEO title, SEO meta description, alt immagini (come ora)
   - **+ i 16 metafield `custom.*`** con i valori della bozza già rivista
2. I metafield con valore vuoto/"Da compilare" vengono **saltati** (non sovrascrivono eventuali valori già presenti su Shopify).
3. Il banner giallo viene aggiornato: «I 16 metafield personalizzati vengono ora scritti direttamente su Shopify». Il pulsante CSV resta per usi manuali/backup.

### Dettagli tecnici (per il backend)

- **Edge function**: estendere `publishProductCopyDraft` in `supabase/functions/shopify-admin-proxy/index.ts` aggiungendo una chiamata GraphQL `metafieldsSet` (batch fino a 25 per call) con namespace fisso `custom` e le 16 chiavi già definite in `src/admin/types/productEnrichment.ts → ALL_METAFIELD_KEYS`.
- Tipo Shopify per metafield: `single_line_text_field` per testi brevi (nome botanico, nome comune, periodi, difficoltà, titolo sezione FAQ, short_intro, promo_text), `multi_line_text_field` per i lunghi (come_prendersene_cura, conosci_meglio_la_tua_pianta, origini_e_habitat, care_info), `list.single_line_text_field` (JSON array) per `key_features` e `special_bullets`.
- Mapping dalla bozza: leggere `draft.metafields` (già salvato in `product_ai_drafts`) e ignorare i campi vuoti.
- In caso di errore su un singolo metafield: registrare il messaggio nel log della draft ma non bloccare gli altri (parziale OK).
- Stesso fix per il flusso "Pubblica tutti" (`publishAll` lato client) e per il pulsante singolo riga, perché passano dalla stessa edge function.

### Cosa NON cambia
- Lo stile di scrittura, il prompt AI e i contenuti generati restano identici.
- Il CSV resta scaricabile per backup/import bulk.
- Nessuna modifica allo storefront, nessun rischio sul checkout.

### Verifica dopo l'implementazione
1. Genera la bozza di un prodotto di test, clicca "Pubblica".
2. Apri il prodotto su Shopify Admin → tab Metafield: i 16 campi devono essere popolati.
3. Ripeti su un secondo prodotto con uno o due campi vuoti → quelli vuoti devono restare invariati su Shopify.

Confermi che procedo così?