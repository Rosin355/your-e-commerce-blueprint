# Online Garden — release readiness footer e policy

1 novembre 2026. Base main `b5cbe57` che include l'Header Only approvato. Branch `codex/storefront-footer-legal`, Draft PR separata verso main. Nessun merge, deploy o modifica live.

**Stato: implementazione disponibile per review; pubblicazione completa BLOCKED.** La verifica tecnica del footer non costituisce approvazione legale del negozio.

| Gate | Stato attuale |
| --- | --- |
| Footer e contatti | Implementati e verificati nella build; nessun placeholder o dato societario inventato |
| Privacy | Fonte Shopify italiana pubblicata e verificata, URL HTTP 200; link autorizzato nella richiesta, nessuna copia locale del testo |
| Altre policy | Cookie, termini, spedizioni, resi assenti; nessuna bozza reperita o approvazione dedotta. Non pubblicabili, route disattive senza link |
| Consenso/script | BLOCKED alla validazione: hosting aggiunge analytics/telemetria, tentativo POST eventi prima del consenso; invii bloccati dall'audit, non dall'app. Nessuna CMP approvata/installata |
| Dati societari | Da Marco; nessuna P. IVA, sede o ragione sociale inserita per deduzione |
| UI approvata | Homepage/catalogo/PDP/header non modificati nei sorgenti; confronto screenshot desktop/mobile documentato |
| QA locale | Build/typecheck/lint mirato PASS; 339 Node + 92 Deno e 15 scenari UX esistenti PASS; controlli specifici nel report browser |
| Lint globale | 43 errori/11 warning identici alla base main, zero nuovi; non dichiarato verde |
| SEO/HTTP | Noindex nel DOM per percorsi assenti e alias; veri HTTP 404/X-Robots-Tag/redirect server-side da validare con hosting |
| Checkout | Contratto e handler invariati, regressione simulata PASS; footer policy Shopify e checkout sandbox da confermare senza creare ordini reali |
| Safari/iOS e screen reader | Non disponibili per il collaudo reale in questa sessione |
| CI/review | Verificare i check dell'HEAD finale della Draft PR; review e decisione di merge ancora necessarie |
| Produzione | Non autorizzata da questo intervento; blocchi legali/consenso e validazione commerciale separati |

[Report tecnico](../legal/FOOTER-AND-POLICY-INTEGRATION.md) · [Checklist cliente](../legal/CLIENT-LEGAL-PUBLICATION-CHECKLIST.md) · [Evidenze](../legal/evidence/2026-11-01/README.md).

---

## Storico precedente: CI minima, 30 ottobre

Il testo seguente descrive lo stato prima dell'integrazione in main, non lo stato attuale delle PR #39/#41, successivamente integrate.

# Online Garden — release readiness dopo introduzione CI minima

30 ottobre 2026. Documento corrente del branch Header Only; non importa il report storico della proposta Fase 10 come se fosse già eseguita.

**CI locale e GitHub positiva sul commit 6957184 ([run](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699)); merge ancora BLOCKED per review adeguate e decisione di integrazione.** [Implementazione CI](../CI-INTEGRATION.md) · [Integrazione Header Only](../HEADER-ONLY-FINAL-INTEGRATION.md).

| Gate | Stato |
| --- | --- |
| UI approvata | src invariato rispetto al risultato Header Only già verificato |
| Base #39 | aa7e6ae preservato; validazione esatta nel job technical-base della CI #41 approvata dall’utente |
| CI applicativa | Ubuntu GitHub SUCCESS: #41 339 Node + 92 Deno; #39 336 Node + 92 Deno; typecheck/lint/build positivi ([evidenze](../ci-evidence/2026-10-30/github-verified-run.json)) |
| GitGuardian | SUCCESS sul commit 6957184; controllo separato, da riconfermare sul successivo HEAD delle evidenze |
| Review | Necessarie review adeguate di codice, workflow e dipendenza #39 |
| Required checks/protezione | Nessuna modifica; verificare bootstrap e nomi check prima di eventuale enforcement |
| Ready for code merge | BLOCKED: CI positiva sulla revisione indicata, review adeguate e verifica del successivo HEAD ancora necessarie |
| Ready for staging / produzione | Non attestati; autorizzazione sandbox e validazione commerciale ancora separate |

La #39 non viene aggiornata e non avrà un nuovo check collegato al suo HEAD tramite questo intervento. La prova del codice aa7e6ae è un job distinto nella run della #41; non è equivalente a un check automatico direttamente sulla #39. La scelta preserva ancestry e PR non coinvolte. Nessun merge, deploy o scrittura live.

Il commit delle evidenze non modifica workflow o sorgenti e attiva comunque la CI completa. Il suo SHA e la run finale verificata sono riportati nella consegna; nessuna esecuzione precedente viene presentata come prova automatica di un HEAD diverso. Non sono stati osservati fallimenti applicativi nella prima run.
