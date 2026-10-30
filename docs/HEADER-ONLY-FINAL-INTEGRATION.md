# Online Garden — integrazione finale Header Only

30 ottobre 2026. **QA locale positiva, proposta di integrazione pronta per Draft PR; BLOCKED al merge finché mancano CI applicativa e review adeguate.** Nessun merge/deploy o modifica ai dati/configurazioni live.

## Decisione cliente e genealogia

La richiesta originale UX 2.0 completa è superata dalla decisione: soltanto navbar recente, veste precedente nel resto del sito. Base remota verificata PR #39: aa7e6aeb9aa0eafc01f655976f342733562bb824; PR #40: 2e07293aa3edab382fb470108df6317ef573b23a; risultato locale approvato: 99fb008f8173a599b6ab28b21e6e30d98859d494.

Nuovo worktree `/private/tmp/online-garden-header-final`, branch `codex/customer-experience-header-final`, creato **direttamente da aa7e6ae**. Trasferimento per file da oggetti Git committati, non da working tree; nessun cherry-pick indiscriminato o ancestry della #40. Il nuovo src coincide interamente con 99fb008. Le PR #39/#40 e tutti i worktree originari restano invariati. [Riferimenti iniziali](header-only-integration-evidence/2026-10-30/remote-before.json).

| Confronto | Risultato |
| --- | --- |
| Finale vs #39 | 10 file applicativi diversi: header + fix tecnici/accessibili approvati |
| Finale vs #40 | 7 file diversi per annullare la veste UX 2.0 non più desiderata |
| Finale vs 99fb008 | zero differenze nell’intero src |
| HomeHero/HomepageV3 vs #39 | identici byte per byte; header condiviso recente richiamato dalla variante hero esistente |

[Inventario confronto sorgenti](header-only-integration-evidence/2026-10-30/source-comparison.json) · [23 controlli contratti](header-only-integration-evidence/2026-10-30/contracts.json).

## Differenze applicative selezionate

| File | Differenza rispetto alla base #39 |
| --- | --- |
| src/components/storefront/HomeHeaderOverlay.tsx | Navbar recente: touch target, focus, stato disclosure/ARIA, menu mobile e ricerca preservati |
| src/components/CartDrawer.tsx | Prezzi/subtotali per valuta, contrasto alert e dialog 44px |
| src/components/ProductCard.tsx | Layout precedente; formato monetario corretto e focus visibile |
| src/components/storefront/CatalogProductCard.tsx | Layout precedente; prezzo condiviso e intervallo reale |
| src/components/storefront/Pdp.tsx | Struttura/gallery precedenti; money, ARIA, target, annuncio e zoom/sticky compatibili |
| src/hooks/useProduct.ts | maxVariantPrice richiesto per distinguere range reali |
| src/lib/shopify.ts | Campo min/max e relativo tipo/query; fallback pubblico e mutation checkout invariati |
| src/lib/storefront-money.ts | Helper EUR/altre valute, prezzi fissi/range e subtotali per valuta |
| src/pages/AllProducts.tsx | Layout precedente; sort vendite infondato rimosso, valuta reale nei prezzi filtro e dialog/target compatibili |
| src/index.css | Regole circoscritte per focus/errori/dialog; nessun radius o grid del redesign |

Portato soltanto `scripts/tests/storefront-money.test.ts`. Gli harness di base e il runner Node/Deno esistono già in #39 e non sono modificati. Package e lock invariati; nessuna dipendenza aggiunta. Non trasferiti i cinque commit applicativi/documentali della #40 come serie Git, le sue proposte storiche né le intere cartelle screenshot.

Conservati: SiteHeader/announcement bar, navigazione categorie, ricerca, account/cart, prezzi reali e ordinamenti globali, scelta variante/quantità e accessibilità compatibile. Ripristinati: home/hero/sezioni, card squadrate, catalogo e struttura PDP precedenti. Il pulsante Acquista ora era già presente nella base e nella #40: handler invariato, non una nuova azione commerciale. Moduli editoriali/newsletter restano inattivi come prima; nessun contenuto commerciale inventato.

## QA eseguita sul branch finale

| Controllo | Evidenza / esito |
| --- | --- |
| npm run typecheck | PASS |
| ESLint mirato 9 file TS/TSX modificati | PASS, zero diagnostici; index.css non è un file ESLint e viene compilato da build |
| npm run build | PASS; warning preesistenti Tailwind/classi e chunk grandi, nessuna nuova dipendenza |
| node scripts/ux-audit/domain.mjs | 339 Node + 92 Deno PASS, zero fail; runtime corretti, non comando npm misto |
| Checkout simulato mirato | 2 test PASS, incluso invalid quantity senza chiamate, errore cartCreate e URL di successo, variante/quantità esatte. Fetch interamente stub: nessuna mutation Shopify reale |
| Browser Chrome, dati reali in sola lettura | 18 controlli layout home/catalogo/PDP × 320/375/390/430/768/1440; nessun overflow orizzontale |
| Interazioni browser | 8 gruppi PASS: menu/tastiera/Escape, ricerca desktop/mobile, navigazione categorie, account → auth senza login, carrello vuoto desktop/mobile, formato/quantità/price sticky, zoom/focus, prodotto indisponibile |
| Error log browser restituiti | zero nel perimetro osservato |
| Fonte approvata e confini | src identico a 99fb008; handler acquisto/varianti e contratti protetti verificati |
| Credenziali | 160 file frontend controllati, zero riscontri dei pattern privati/privilegiati noti; token pubblico ereditato identico alla base |

Il checkout simulato è il **test di contratto del trasporto Node**, non un checkout end-to-end nel browser né un ordine sandbox Shopify. Browser QA non preme add-to-cart/Acquista ora/checkout: accede al carrello vuoto e modifica soltanto la selezione/quantità locale PDP. Non eseguito login, ordine, rotazione o modifica di permessi. Gli accessi account verificano il percorso non autenticato, non il ciclo completo di autenticazione.

[Browser QA](header-only-integration-evidence/2026-10-30/browser-qa.json) · [Checkout simulato](header-only-integration-evidence/2026-10-30/checkout-simulated.txt) · [Scan statico](header-only-integration-evidence/2026-10-30/security-scan.json). La scansione non è una certificazione esaustiva di tutti i segreti in cronologia/env runtime. Nessun valore o frammento di credenziale esportato nelle nuove evidenze.

## Documenti ed evidenze ridotti

Aggiornati PROJECT_STATUS e CLIENT-ECOMMERCE-STATUS conservando il testo della base; roadmap e design system nuovi e mirati allo stato approvato. Nessuna importazione dei lunghi audit/proposte Fase 7–9 della #40 come specifiche attive. Le versioni storiche rimangono nel branch/PR originali, non vengono eliminate.

[Confronto visuale](header-only-integration-evidence/2026-10-30/comparison.html): **14 PNG** essenziali, sei base già committati e otto finali nuovi (home/catalogo/PDP desktop-mobile, navbar finale desktop-mobile). Riduzione da 26 immagini dell’audit header-only, senza ricopiare l’archivio completo della #40. Sono viewport Chrome; dati live possono variare. Source identity rafforza il confronto visuale. La cartella evidenze è temporanea di review, non asset runtime.

Anteprima locale finale: http://127.0.0.1:5176/. Fonte approvata precedente su 5174 preservata.

## Gate GitHub e release

Alla verifica iniziale GitGuardian #39 è SUCCESS (nuovo check 124043005202), #40 SUCCESS; zero workflow applicativi e nessuna review sulle due PR. L’incidente pubblico 33905767 è stato classificato manualmente dall’utente Ignored → Low risk secret nella fase precedente. Non modificato in questa integrazione; il risultato del nuovo branch va verificato dopo la pubblicazione. [Snapshot riferimenti](header-only-integration-evidence/2026-10-30/github-reference-checks.json).

Pubblicato soltanto `codex/customer-experience-header-final` senza force push e aperta la **[Draft PR #41](https://github.com/Rosin355/your-e-commerce-blueprint/pull/41)** con base `codex/storefront-main-integration`. Dipendenza esplicita dalla #39 e proposta di sostituzione della #40 documentate; **#40 resta aperta e invariata**. Il diff GitHub è stato confrontato con il manifest locale: soltanto file approvati e documentazione/evidenze mirate. Snapshot dopo apertura: HEAD `f4164ed`, GitGuardian **SUCCESS**, mergeable=true/clean, zero review, zero workflow applicativi. [Snapshot pubblicazione e lista file](header-only-integration-evidence/2026-10-30/github-published-snapshot.json). Questo snapshot si riferisce all’apertura; HEAD/check più recenti vanno letti nella PR e nella consegna finale. Nessun merge su main e nessun deploy. **BLOCKED al merge** se mancano CI obbligatoria/review o il controllo sicurezza è mancante/fallito.

Rischi residui: ripristino intenzionale del maggiore scorrimento PDP mobile; costo O(N) e attesa catalogo completi preesistenti; Safari/device/screen reader reale, staging/checkout sandbox autorizzato, condizioni commerciali Marco e audit WCAG completo ancora separati. Riduzione degli scope Storefront non applicata. QA offline non equivale a validazione commerciale. Shopify checkout/Admin V2/Supabase/RLS/Edge/sync/inventario/prezzi live non modificati.

## Commit e consegna

Commit applicativo selettivo: **a51c8c8**, parent aa7e6ae, 10 file applicativi + test money. Un commit separato raccoglie i cinque documenti permanenti e le evidenze essenziali. Snapshot di integrità: 13 worktree preesistenti, 8.821 file censiti invariati. Nessuna modifica non committata viene trasferita. [Integrità e perimetro](header-only-integration-evidence/2026-10-30/integrity.json). Pubblicazione e apertura Draft PR eseguite; un successivo commit soltanto documentale registra URL ed evidenze GitHub. I check del suo HEAD vengono ricontrollati prima della consegna.
