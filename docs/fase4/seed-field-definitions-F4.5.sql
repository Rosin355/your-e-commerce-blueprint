-- =====================================================================
-- F4.5 — SEED PROPOSTO product_field_definitions   (NON APPLICATO)
-- Read-only proposal. Nessuna DELETE, nessuna UPDATE distruttiva.
-- Idempotente su product_field_definitions.key (ON CONFLICT DO NOTHING).
-- =====================================================================
BEGIN;

INSERT INTO public.product_field_definitions
  (key, label, field_group, source_aliases, editor_type, data_type,
   shopify_mapping, visible, editable, ai_allowed, manual_only, publishable,
   required, protected_on_reimport, applies_to, sort_order, help_text)
VALUES
-- ---------------------------------------------------------------- main
('sku','SKU','main',ARRAY['sku','SKU','Codice'],'text','text','{"type":"core","field":"sku"}'::jsonb,true,false,false,false,true,true,true,'both',10,'Codice univoco del prodotto. Non modificabile.'),
('woo_product_id','ID WooCommerce','main',ARRAY['ID','id','post_id'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',20,'Identificativo del prodotto nel vecchio sito. Serve solo per ritrovare la riga di origine.'),
('gtin','EAN / GTIN','main',ARRAY['barcode','EAN','GTIN','gtin','ean'],'text','text','{"type":"variant","field":"barcode"}'::jsonb,true,true,false,false,true,false,true,'both',30,'Codice a barre commerciale, se disponibile.'),
('title','Titolo prodotto','main',ARRAY['title','name','Nome','Title','post_title'],'text','text','{"type":"core","field":"title"}'::jsonb,true,true,true,false,true,true,true,'both',40,'Nome del prodotto mostrato nel negozio.'),
('commercial_title','Titolo commerciale','main',ARRAY['h1_title'],'text','text','{}'::jsonb,true,true,true,false,true,false,true,'both',50,'Titolo alternativo, più orientato alla vendita.'),
('handle','Handle','main',ARRAY['handle','slug','post_name'],'text','text','{"type":"core","field":"handle"}'::jsonb,true,false,false,false,true,false,true,'both',60,'Indirizzo web del prodotto. Non va cambiato se il prodotto è già online.'),
('entity_type','Tipo prodotto','main',ARRAY['type','product_type'],'select','text','{}'::jsonb,true,false,false,false,true,true,true,'both',70,'Semplice, con varianti oppure variante.'),
('parent_sku','Prodotto padre','main',ARRAY['parent_sku','parent','post_parent'],'text','text','{}'::jsonb,true,false,false,false,true,false,true,'variant',80,'SKU del prodotto principale a cui appartiene la variante.'),
('vendor','Fornitore','main',ARRAY['vendor','Fornitore','brand'],'text','text','{"type":"core","field":"vendor"}'::jsonb,true,true,false,false,true,false,false,'both',90,'Marchio o fornitore del prodotto.'),
('publication_status','Stato pubblicazione','main',ARRAY['status','post_status'],'select','text','{"type":"core","field":"status"}'::jsonb,true,true,false,false,true,false,true,'both',100,'Indica se il prodotto è online o in bozza.'),

-- ------------------------------------------------------------- content
('description','Descrizione estesa','content',ARRAY['description','Descrizione','post_content','body_html'],'richtext','text','{"type":"core","field":"descriptionHtml"}'::jsonb,true,true,true,false,true,false,true,'both',200,'Testo lungo di presentazione del prodotto.'),
('short_description','Descrizione breve','content',ARRAY['short_description','Descrizione breve','post_excerpt'],'textarea','text','{}'::jsonb,true,true,true,false,true,false,true,'both',210,'Riassunto di poche righe.'),
('optimized_description','Descrizione ottimizzata','content',ARRAY['optimized_description'],'richtext','text','{"type":"core","field":"descriptionHtml"}'::jsonb,true,true,true,false,true,false,true,'both',220,'Versione della descrizione pensata per il web e la ricerca.'),
('key_benefits','Punti di forza','content',ARRAY['key_benefits'],'multiselect','json','{"type":"metafield","namespace":"custom","key":"key_benefits"}'::jsonb,true,true,true,false,true,false,true,'both',230,'Elenco dei principali vantaggi.'),
('key_features','Caratteristiche chiave','content',ARRAY['key_features'],'multiselect','json','{"type":"metafield","namespace":"custom","key":"key_features"}'::jsonb,true,true,true,false,true,false,true,'both',240,'Elenco delle caratteristiche principali.'),
('special_bullets','Bullet speciali','content',ARRAY['special_bullets'],'multiselect','json','{"type":"metafield","namespace":"custom","key":"special_bullets"}'::jsonb,true,true,true,false,true,false,true,'both',250,'Elenco di punti in evidenza.'),
('short_intro','Introduzione','content',ARRAY['short_intro'],'textarea','text','{"type":"metafield","namespace":"custom","key":"short_intro"}'::jsonb,true,true,true,false,true,false,true,'both',260,'Frase introduttiva breve.'),
('promo_text','Testo promozionale','content',ARRAY['promo_text'],'textarea','text','{"type":"metafield","namespace":"custom","key":"promo_text"}'::jsonb,true,true,true,false,true,false,true,'both',270,'Testo usato nelle sezioni promozionali.'),
('faq','FAQ','content',ARRAY['faq','faq_prodotto'],'json','json','{"type":"metafield","namespace":"custom","key":"faq_prodotto"}'::jsonb,true,true,true,false,true,false,true,'both',280,'Domande e risposte frequenti.'),
('titolo_sezione_faq','Titolo sezione FAQ','content',ARRAY['titolo_sezione_faq'],'text','text','{"type":"metafield","namespace":"custom","key":"titolo_sezione_faq"}'::jsonb,true,true,true,false,true,false,true,'both',290,'Titolo mostrato sopra le domande frequenti.'),
('care_guide','Guida alla cura','content',ARRAY['care_guide'],'richtext','text','{"type":"metafield","namespace":"custom","key":"care_guide"}'::jsonb,true,true,true,false,true,false,true,'both',300,'Istruzioni complete di coltivazione.'),
('care_info','Informazioni di cura','content',ARRAY['care_info'],'textarea','text','{"type":"metafield","namespace":"custom","key":"care_info"}'::jsonb,true,true,true,false,true,false,true,'both',310,'Sintesi delle cure principali.'),
('come_prendersene_cura','Come prendersene cura','content',ARRAY['come_prendersene_cura'],'textarea','text','{"type":"metafield","namespace":"custom","key":"come_prendersene_cura"}'::jsonb,true,true,true,false,true,false,true,'both',320,'Consigli pratici di manutenzione.'),
('conosci_meglio_la_tua_pianta','Conosci meglio la tua pianta','content',ARRAY['conosci_meglio_la_tua_pianta'],'textarea','text','{"type":"metafield","namespace":"custom","key":"conosci_meglio_la_tua_pianta"}'::jsonb,true,true,true,false,true,false,true,'both',330,'Approfondimento descrittivo.'),

-- ----------------------------------------------------------- botanical
('nome_comune','Nome comune','botanical',ARRAY['nome_comune'],'text','text','{"type":"metafield","namespace":"custom","key":"nome_comune"}'::jsonb,true,true,false,true,true,false,true,'both',400,'Nome con cui la pianta è conosciuta. Campo compilato a mano.'),
('nome_botanico','Nome botanico','botanical',ARRAY['nome_botanico'],'text','text','{"type":"metafield","namespace":"custom","key":"nome_botanico"}'::jsonb,true,true,true,false,true,false,true,'both',410,'Nome scientifico della specie.'),
('ibridatore','Ibridatore','botanical',ARRAY['ibridatore'],'text','text','{"type":"metafield","namespace":"custom","key":"ibridatore"}'::jsonb,true,true,false,true,true,false,true,'both',420,'Chi ha creato la varietà. Campo compilato a mano.'),
('colore_fiore','Colore del fiore','botanical',ARRAY['colore_fiore'],'text','text','{"type":"metafield","namespace":"custom","key":"colore_fiore"}'::jsonb,true,true,false,true,true,false,true,'both',430,'Colore prevalente della fioritura. Campo compilato a mano.'),
('colore_foglia','Colore della foglia','botanical',ARRAY['colore_foglia'],'text','text','{"type":"metafield","namespace":"custom","key":"colore_foglia"}'::jsonb,true,true,false,true,true,false,true,'both',440,'Colore del fogliame. Campo compilato a mano.'),
('curiosita','Curiosità','botanical',ARRAY['curiosita'],'textarea','text','{"type":"metafield","namespace":"custom","key":"curiosita"}'::jsonb,true,true,false,true,true,false,true,'both',450,'Aneddoto o nota particolare. Campo compilato a mano.'),
('origini_e_habitat','Origini e habitat','botanical',ARRAY['origini_e_habitat'],'textarea','text','{"type":"metafield","namespace":"custom","key":"origini_e_habitat"}'::jsonb,true,true,true,false,true,false,true,'both',460,'Zona di provenienza e ambiente naturale.'),
('periodo_di_fioritura','Periodo di fioritura','botanical',ARRAY['periodo_di_fioritura'],'text','text','{"type":"metafield","namespace":"custom","key":"periodo_di_fioritura"}'::jsonb,true,true,true,false,true,false,true,'both',470,'Mesi in cui la pianta fiorisce.'),
('periodo_di_messa_a_dimora','Periodo di messa a dimora','botanical',ARRAY['periodo_di_messa_a_dimora'],'text','text','{"type":"metafield","namespace":"custom","key":"periodo_di_messa_a_dimora"}'::jsonb,true,true,true,false,true,false,true,'both',480,'Momento migliore per piantare.'),
('periodo_di_raccolta','Periodo di raccolta','botanical',ARRAY['periodo_di_raccolta'],'text','text','{"type":"metafield","namespace":"custom","key":"periodo_di_raccolta"}'::jsonb,true,true,true,false,true,false,true,'both',490,'Mesi di raccolta dei frutti.'),
('periodo_ottimale_di_potatura','Periodo di potatura','botanical',ARRAY['periodo_ottimale_di_potatura'],'text','text','{"type":"metafield","namespace":"custom","key":"periodo_ottimale_di_potatura"}'::jsonb,true,true,true,false,true,false,true,'both',500,'Momento consigliato per potare.'),
('difficolta_di_coltivazione','Difficoltà di coltivazione','botanical',ARRAY['difficolta_di_coltivazione'],'select','text','{"type":"metafield","namespace":"custom","key":"difficolta_di_coltivazione"}'::jsonb,true,true,true,false,true,false,true,'both',510,'Quanto è impegnativa da coltivare.'),

-- ---------------------------------------------------------- categories
('product_category_raw','Categoria importata','categories',ARRAY['product_category','Categorie','product_cat','categories'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',600,'Categoria così come arrivava dal file di origine. Non modificabile.'),
('tags','Tag','categories',ARRAY['tags','Tag','product_tag'],'multiselect','json','{"type":"core","field":"tags"}'::jsonb,true,true,false,false,true,false,false,'both',610,'Etichette libere associate al prodotto.'),
('category_effective','Categoria effettiva','categories',ARRAY[]::text[],'select','text','{}'::jsonb,true,false,false,false,true,false,true,'both',620,'Categoria realmente usata, anche se ereditata dal prodotto padre.'),

-- ------------------------------------------------------------- pricing
('price','Prezzo','pricing',ARRAY['price','Prezzo','regular_price','Prezzo di listino'],'number','number','{"type":"variant","field":"price"}'::jsonb,true,true,false,false,true,false,true,'both',700,'Prezzo di vendita in euro.'),
('compare_at_price','Prezzo barrato','pricing',ARRAY['compare_at_price','sale_price','Prezzo scontato'],'number','number','{"type":"variant","field":"compareAtPrice"}'::jsonb,true,true,false,false,true,false,true,'both',710,'Prezzo pieno mostrato barrato accanto allo sconto.'),

-- ----------------------------------------------------------- inventory
('inventory_quantity','Quantità disponibile','inventory',ARRAY['inventory_quantity','stock','Scorte'],'number','number','{}'::jsonb,true,false,false,false,false,false,true,'both',800,'Disponibilità gestita da Shopify. Qui è solo consultabile.'),
('stock_status','Disponibilità','inventory',ARRAY['stock_status','in_stock'],'select','text','{}'::jsonb,true,false,false,false,false,false,true,'both',810,'Indica se il prodotto risulta disponibile.'),
('backorder','Ordine arretrato','inventory',ARRAY['backorders','backorder'],'select','text','{}'::jsonb,true,false,false,false,false,false,true,'both',820,'Se il prodotto può essere ordinato anche quando esaurito.'),
('weight_grams','Peso (grammi)','inventory',ARRAY['weight','weight_grams','Peso'],'number','number','{}'::jsonb,true,true,false,false,false,false,true,'both',830,'Peso usato per il calcolo della spedizione.'),
('dimensions','Dimensioni','inventory',ARRAY['length','width','height','Dimensioni'],'json','json','{}'::jsonb,true,true,false,false,false,false,true,'both',840,'Misure del pacco.'),
('shipping_class','Classe di spedizione','inventory',ARRAY['shipping_class'],'text','text','{}'::jsonb,true,true,false,false,false,false,true,'both',850,'Regola di spedizione applicata.'),

-- -------------------------------------------------------------- images
('image_urls','Immagini','images',ARRAY['image_urls','images','Immagini'],'multiselect','json','{"type":"media"}'::jsonb,true,true,false,false,true,false,true,'both',900,'Elenco ordinato degli indirizzi delle immagini.'),
('image_alt_texts','Testi alternativi immagini','images',ARRAY['image_alt_texts'],'multiselect','json','{"type":"media_alt"}'::jsonb,true,true,true,false,true,false,true,'both',910,'Descrizione delle immagini per accessibilità e ricerca.'),

-- ----------------------------------------------------------------- seo
('seo_title','Titolo SEO','seo',ARRAY['seo_title'],'text','text','{"type":"seo","field":"title"}'::jsonb,true,true,true,false,true,false,true,'both',1000,'Titolo mostrato nei risultati di ricerca.'),
('seo_description','Descrizione SEO','seo',ARRAY['seo_description'],'textarea','text','{"type":"seo","field":"description"}'::jsonb,true,true,true,false,true,false,true,'both',1010,'Riassunto mostrato nei risultati di ricerca.'),
('keywords_suggested','Parole chiave suggerite','seo',ARRAY['keywords_suggested'],'multiselect','json','{}'::jsonb,true,true,true,false,false,false,true,'both',1020,'Suggerimenti interni, non pubblicati.'),
('internal_links_suggestions','Link interni suggeriti','seo',ARRAY['internal_links_suggestions'],'multiselect','json','{}'::jsonb,true,true,true,false,false,false,true,'both',1030,'Suggerimenti interni, non pubblicati.'),

-- ------------------------------------------------------ shopify_state
('shopify_product_id','ID Shopify','shopify_state',ARRAY['shopify_product_id'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1100,'Identificativo del prodotto sul negozio.'),
('shopify_sync_status','Stato sincronizzazione','shopify_state',ARRAY['shopify_sync_status'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1110,'Esito dell''ultimo invio al negozio.'),
('shopify_synced_at','Ultima sincronizzazione','shopify_state',ARRAY['shopify_synced_at'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1120,'Data dell''ultimo invio riuscito.'),
('shopify_resolved_by','Corrispondenza trovata tramite','shopify_state',ARRAY['shopify_resolved_by'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1130,'Come è stato riconosciuto il prodotto sul negozio.'),
('shopify_last_sync_mode','Modalità ultimo invio','shopify_state',ARRAY['shopify_last_sync_mode'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1140,'Tipo di operazione eseguita.'),
('shopify_metafields_written','Campi inviati','shopify_state',ARRAY['shopify_metafields_written'],'number','number','{}'::jsonb,true,false,false,false,false,false,true,'both',1150,'Quanti campi personalizzati sono stati scritti.'),
('shopify_metafields_skipped','Campi saltati','shopify_state',ARRAY['shopify_metafields_skipped'],'number','number','{}'::jsonb,true,false,false,false,false,false,true,'both',1160,'Quanti campi sono stati ignorati perché vuoti.'),
('shopify_metafields_failed','Campi falliti','shopify_state',ARRAY['shopify_metafields_failed'],'number','number','{}'::jsonb,true,false,false,false,false,false,true,'both',1170,'Quanti campi hanno dato errore.'),
('shopify_metafields_report','Report sincronizzazione','shopify_state',ARRAY['shopify_metafields_report'],'json','json','{}'::jsonb,true,false,false,false,false,false,true,'both',1180,'Dettaglio tecnico dell''ultimo invio.'),

-- ------------------------------------------------------ other_imported
('raw_unmapped','Altri dati importati','other_imported',ARRAY[]::text[],'json','json','{}'::jsonb,true,false,false,false,false,false,true,'both',1200,'Tutte le colonne del file che non hanno un campo dedicato. Conservate integralmente.'),

-- -------------------------------------------------------------- system
('source_file','File di origine','system',ARRAY['source_file'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1300,'Nome del file da cui proviene il dato.'),
('imported_at','Data importazione','system',ARRAY['imported_at'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1310,'Quando il dato è entrato nel sistema.'),
('ai_enrichment_json','Dati AI completi','system',ARRAY['ai_enrichment_json'],'json','json','{}'::jsonb,true,false,false,false,false,false,true,'both',1320,'Contenuto grezzo generato dall''assistente, conservato per verifica.'),
('ai_enriched_at','Data generazione AI','system',ARRAY['ai_enriched_at'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1330,'Quando è stato generato il testo assistito.'),
('ai_seed_style','Stile di scrittura AI','system',ARRAY['ai_seed_style'],'text','text','{}'::jsonb,true,false,false,false,false,false,true,'both',1340,'Impostazione di tono usata dall''assistente.')
ON CONFLICT (key) DO NOTHING;

-- Review policy dei tre campi editoriali legacy non verificati (idempotente)
UPDATE public.product_field_definitions
   SET review_policy = 'legacy_unverified'
 WHERE key IN ('seo_title','seo_description','optimized_description')
   AND review_policy IS DISTINCT FROM 'legacy_unverified';

COMMIT;

-- Verifica proposta (read-only):
-- SELECT field_group, count(*) FROM public.product_field_definitions GROUP BY 1 ORDER BY 1;
-- SELECT count(*) FILTER (WHERE ai_allowed), count(*) FILTER (WHERE manual_only),
--        count(*) FILTER (WHERE NOT publishable) FROM public.product_field_definitions;
