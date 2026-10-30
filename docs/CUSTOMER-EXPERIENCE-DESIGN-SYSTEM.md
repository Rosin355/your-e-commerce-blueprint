# Online Garden — design system attivo Header Only

30 ottobre 2026. **Specifica attiva approvata:** veste precedente della PR #39 aa7e6ae, navbar della Customer Experience 2.0 conservata da 99fb008. Le reference Silver Garden/Plantella non sono autorizzazione ad altri redesign.

| Elemento | Decisione implementata |
| --- | --- |
| Palette e font | Token crema/verde e font esistenti; nessun token Admin sovrascritto |
| Header | HomeHeaderOverlay recente, SiteHeader e announcement bar esistenti; mega-menu/categorie reali, ricerca, account e cart |
| Integrazione home | Hero originale a tutta larghezza; SiteHeader usa la variante hero già supportata. Sulle pagine interne usa page |
| Homepage | HomepageV3 e HomeHero identici a aa7e6ae: proporzioni, sezioni e fotografie precedenti |
| Card | Bordi squadrati e layout precedenti; helper monetario condiviso, badge esaurito derivato da disponibilità reale |
| Catalogo | Intro, toolbar, sidebar, spaziature e filtri della base; niente pillole CX; rimossa la voce vendite non supportata |
| PDP | Gallery grande squadrata, struttura/editoriali precedenti, aside sticky desktop e barra mobile precedente; colori CTA precedenti |
| Responsive | Breakpoint della base; marchio compatto e target mobile header della proposta recente |
| Accessibilità compatibile | aria-pressed, gruppi/annunci variante e quantità, focus visibile, target varianti/dialog/quantità 44px e contrasto errore conservati |

Non presenti `--og-radius-card` né `og-pdp-layout`. In index.css rimangono soltanto aggiunte storefront circoscritte per focus, errore e dialog. Le dimensioni di alcuni controlli accessibili possono differire di pochi pixel dalla base; è l’eccezione compatibile richiesta, non una nuova gerarchia.

La sticky mobile segue il prezzo selezionato e scompare durante lo zoom. L’ordine editoriale originale mobile comporta più scorrimento del layout UX 2.0 annullato. Nessuna descrizione di fallback inventata se Shopify non fornisce contenuto. Il preesistente Acquista ora mantiene lo stesso handler/contratto; nessuna nuova azione commerciale.

[Confronti desktop/mobile](header-only-integration-evidence/2026-10-30/comparison.html) · [Report e limiti](HEADER-ONLY-FINAL-INTEGRATION.md). Non è dichiarata conformità WCAG AA completa; Safari/device e lettore di schermo reale restano da validare.
