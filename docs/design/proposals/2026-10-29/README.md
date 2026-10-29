# Proposta visuale Online Garden — 29 ottobre 2026

**Archivio della proposta visuale approvata dall’utente.** Gli screenshot qui sotto sono i mockup precedenti allo sviluppo; i [confronti dell’app realmente implementata](../../../customer-experience-implementation-evidence/2026-10-29/README.md) sono separati. Reference A/B lette dal worktree originale; [analisi, adattamenti, token e decisione richiesta](../../../CUSTOMER-EXPERIENCE-VISUAL-DIRECTION.md).

## Sei viste complete

| Superficie | Desktop, 1440px | Mobile, 390px |
| --- | --- | --- |
| Homepage | [Proposta completa](proposta-home-desktop.png) | [Proposta completa](proposta-home-mobile.png) |
| Catalogo | [Proposta completa](proposta-catalog-desktop.png) | [Proposta completa](proposta-catalog-mobile.png) |
| PDP | [Proposta completa](proposta-pdp-desktop.png) | [Proposta completa](proposta-pdp-mobile.png) |

## Prima area visibile: confronto attuale / proposto

| Superficie | Attuale, PR #39 | Proposta |
| --- | --- | --- |
| Home desktop, 1440×900 | [Attuale](confronto-attuale-home-desktop.png) | [Proposta](confronto-proposta-home-desktop.png) |
| Home mobile, 390×900 | [Attuale](confronto-attuale-home-mobile.png) | [Proposta](confronto-proposta-home-mobile.png) |
| Catalogo desktop, 1440×900 | [Attuale](confronto-attuale-catalog-desktop.png) | [Proposta](confronto-proposta-catalog-desktop.png) |
| Catalogo mobile, 390×900 | [Attuale](confronto-attuale-catalog-mobile.png) | [Proposta](confronto-proposta-catalog-mobile.png) |
| PDP desktop, 1440×900 | [Attuale](confronto-attuale-pdp-desktop.png) | [Proposta](confronto-proposta-pdp-desktop.png) |
| PDP mobile, 390×900 | [Attuale](confronto-attuale-pdp-mobile.png) | [Proposta](confronto-proposta-pdp-mobile.png) |

Le immagini attuali sono copie byte-identiche degli screenshot della Fase 7 del 28 ottobre: baseline `aa7e6aeb9aa0eafc01f655976f342733562bb824`, fixture offline, font remoti esclusi. Le immagini proposte sono catture del solo prototipo del 29 ottobre, con asset locali e segnaposto. I dati e alcuni contenuti differiscono: il confronto valuta composizione e gerarchia, **non** una misura prestazionale/conversione o una differenza pixel sullo stesso prodotto.

Nel prototipo interattivo mostrato in chat, usare Pagina/Formato/Vista. In Proposta si possono cambiare i due formati segnaposto, la quantità locale, aprire le pillole e il menu; nessuna azione avvia acquisti. In Confronto sono visibili le coppie di prime schermate; le miniature incorporate sono compresse per la visualizzazione, mentre i PNG qui collegati conservano la risoluzione delle catture.

Il riepilogo mobile è illustrato staticamente dopo i dettagli: non simula un footer fixed funzionante. Posizionamento, safe-area, focus, tastiera virtuale e rapporto con drawer/zoom appartengono alla successiva implementazione e QA autorizzata. Le foto/nomi/importi dei concorrenti non sono stati riusati.

## Verifiche del prototipo

[Report](prototype-qa.json): sei catture complete, reflow delle tre pagine a 320/375/390/430/768/1440, controlli formato/quantità/riepilogo, radio da tastiera, apertura pillole/menu e sei confronti. Acquisti disabilitati. Le eventuali richieste statiche Lucide/Floating UI sono introdotte dal renderer della skill, registrate separatamente; nessun endpoint Shopify/Supabase o checkout viene invocato.

Le famiglie font sono quelle esistenti con fallback locali; nessuna nuova dipendenza o font installato. Nessuna certificazione WCAG o QA dell'applicazione deriva da questi controlli. [Integrità e file modificati](visual-review-integrity.json).

La sonda `prototype-qa.mjs` conserva i percorsi di questo ambiente; adattarli prima di una ripetizione. Non avvia l'applicazione React. La bozza preliminare precedente rimane archiviata in `visual-direction-preliminary.md` per distinguere l'assenza iniziale delle reference dalla situazione corrente.
