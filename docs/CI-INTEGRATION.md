# CI minima dello storefront — implementazione e bootstrap

30 ottobre 2026. Workflow implementato e verificato localmente e su Ubuntu GitHub: [run 41072668699](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699) SUCCESS sul commit 6957184. L’incarico autorizza l’aggiornamento CI della PR #41. La scelta esplicita dell’utente preserva la catena Git: **non aggiornare la #39, validarne lo SHA esatto nella CI della #41**.

## File introdotti

- `.github/workflows/storefront-checks.yml`: evento pull_request verso main e codex/storefront-main-integration, senza filtri path o esclusioni Draft. Nessun pull_request_target, push, dispatch, deploy o environment di produzione.
- `ci/run-domain.mjs`: discovery di tutti gli scripts/tests/*.test.ts, classificazione Node/Deno come runner di dominio esistente. Fallisce per suite vuota e propaga gli exit code; nessun test rimosso o disabilitato.
- `ci/offline-network.cjs`: blocco preventivo di fetch/HTTP/HTTPS/TCP/TLS/UDP/WebSocket nei test Node; gli stub dei test restano consentiti. Non è un sandbox OS contro codice ostile.
- `ci/deno-ci.lock`: lock versionato dedicato, derivato dalla proposta Fase 10 già verificata, congelato nelle esecuzioni. Il deno.lock alla root è ignorato e non costituisce un lock condiviso riproducibile.

La proposta inattiva della release readiness è stata consultata, non trasferita insieme all’intero archivio. Nessuna modifica a src, package.json/package-lock.json, test esistenti, Admin/auth/RLS/Edge/sync o comportamento applicativo.

## Runtime e dipendenze

Package-lock v3, npm ci con lifecycle script disabilitati, no audit/fund durante installazione. Pin applicativi verificati: **Node 22.22.3, npm 10.9.8, Deno 2.9.5**; nessuna dichiarazione che siano necessariamente le ultime versioni. Il repository non aveva un pin runtime comune; non sono cambiati package manager o dipendenze.

Action ufficiali fissate a SHA completo e riconfermate via GitHub API:
- actions/checkout v7.0.1: 3d3c42e5aac5ba805825da76410c181273ba90b1
- actions/setup-node v7.1.0: 949feb2413d6458794dcd2491c4babbbce0c15c1
- denoland/setup-deno v2.0.5: 22d081ff2d3a40755e97629de92e3bcbfa7cf2ed

Ubuntu 24.04, timeout 20 minuti/job, cancellazione esecuzioni obsolete per PR. Le Action usano il proprio runtime, distinto dal Node applicativo installato. Nessuna cache condivisa aggiunta; package-manager-cache disabilitata. Runner image e registry rimangono infrastruttura esterna aggiornabile, quindi non è una garanzia di build bit-identica.

## Permessi e sicurezza

Solo `contents: read`, checkout `persist-credentials: false`; nessun secrets context o token applicativo configurato nel workflow, nessun dump di env, nessun upload di build/artifact. Il token GitHub implicito del checkout ha permessi di lettura; non si concedono checks:write, status:write, pull-requests:write o accessi live.

La build è stata provata con processo ad ambiente minimo: nella repository è già versionato un env contenente soltanto nomi pubblici VITE_SUPABASE e JWT con ruolo anon, senza credenziali privilegiate. Nessun valore copiato nel workflow/documenti/log. Il fallback Public Storefront ereditato rimane invariato; non servono credenziali Admin/Private Storefront/service-role. I valori VITE pubblici rimangono pubblici per definizione; non si dichiara assenza di tutte le stringhe pubbliche nel bundle.

Non vengono eseguiti sync, import, backup, CLI Admin o servizi Shopify/Supabase. I test di dominio possono riguardare logica Admin/sync, ma usano fixture/stub, non operazioni su servizi. Node ha un guard runtime verificato con richieste a example.invalid bloccate; Deno non riceve allow-net, allow-run o allow-write. I download delle dipendenze durante npm ci e caricamento moduli Deno sono letture dei registry, distinti da traffico applicativo. Nessun private token viene fornito al processo.

Deno conserva `--no-check` della suite esistente, insieme a --no-config --no-npm --frozen e lock esplicito, permessi read/env. Questo esegue tutti i 92 test, non un typecheck aggiuntivo di tutte le Edge Functions. Il typecheck React/TypeScript è un passo separato; nessun controllo esistente viene nascosto.

## Due revisioni verificate, catena preservata

Per le PR verso codex/storefront-main-integration la matrice contiene:

| Job | Sorgente effettiva |
| --- | --- |
| Storefront / pull-request | github.event.pull_request.head.sha, registrato nel log |
| Storefront / technical-base | github.event.pull_request.base.sha, attualmente aa7e6ae della #39 |

Per PR verso main viene eseguito il job pull-request. Il tooling CI è letto separatamente dalla revisione del workflow, in checkout sparse; il codice applicativo/test arriva dal checkout dello SHA selezionato. Il runner e il lock CI possono quindi validare #39 anche se quel commit non contiene ancora ci/ o il workflow. Entrambi i job eseguono installazione, typecheck, lint pertinente, build e suite Node/Deno: non è un semplice confronto di hash.

I check appartengono alla **PR #41**, che ospita il workflow; il job technical-base fornisce evidenza riferita allo SHA esatto della #39. **Non si dichiara un check applicativo collegato alla #39**: il suo HEAD rimane aa7e6ae, senza workflow, e nessun evento/configurazione è stato modificato su quella PR. Non vengono creati check verdi retroattivi via API.

Il modo meno invasivo di proseguire ora è usare e revisionare le due evidenze della #41, come approvato. Non esiste una run applicativa precedente della #39 da rieseguire: quel commit non contiene il workflow e non è stato aggiornato. Una futura associazione diretta di check applicativi alla #39 richiede un piano separato e revisionato (aggiornamento coordinato dei branch oppure tooling di validazione esterno con autorizzazioni dedicate). Nessuna soluzione alternativa viene applicata qui. Nessuna branch protection o required check viene imposto prima di verifica e decisione del responsabile.

## Risultati locali prima della pubblicazione

Installazione nuova npm ci --ignore-scripts: PASS. Toolchain Node/npm/Deno e YAML/pin/permessi verificati. Typecheck, lint e build PASS su entrambe le revisioni con dipendenze bloccate; build senza env privati.

| Revisione locale | Node | Deno | Fail/skip |
| --- | --- | --- | --- |
| #41, codice approvato 416dd96 + tooling CI | 339 PASS | 92 PASS | 0 / 0 |
| #39, aa7e6ae immutato | 336 PASS | 92 PASS | 0 / 0 |

La differenza di tre test è la suite money presente soltanto nella #41. I comandi runtime non avviano il comando npm misto che tenta di eseguire Deno in Node. Nessun test disabilitato. Warning di build Tailwind/chunk preesistenti conservati e da non confondere con errori.

[Evidenze locali](ci-evidence/2026-10-30/local-summary.json) · [Pin Action](ci-evidence/2026-10-30/action-pins.json) · [Riferimenti iniziali](ci-evidence/2026-10-30/remote-before.json). Log locali completi conservati fuori dal diff in `/private/tmp/og-ci-local-logs/`; i risultati GitHub verificati sono nel [record sanificato](ci-evidence/2026-10-30/github-verified-run.json).

## Risultati GitHub verificati

[Run 41072668699](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699), evento pull_request, commit **6957184c5c4a1368202f924059dd8b09a2e2dff9**, conclusione SUCCESS. Gli SHA sorgente sono stati verificati nei log, senza esportare configurazioni o valori di token.

| Job | SHA sorgente | Node / Deno | Esito |
| --- | --- | --- | --- |
| [pull-request](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699/job/124120522348) | 6957184 | 339 / 92 | SUCCESS, 0 fail/skip |
| [technical-base](https://github.com/Rosin355/your-e-commerce-blueprint/actions/runs/41072668699/job/124120522477) | aa7e6ae | 336 / 92 | SUCCESS, 0 fail/skip |

Tutti i passi di installazione, controllo runtime, typecheck, lint, build, guard offline e integrità lock sono SUCCESS in entrambi i job. [GitGuardian](https://github.com/Rosin355/your-e-commerce-blueprint/runs/124120496518) SUCCESS sullo stesso HEAD. Nessun fallimento del workflow o test disabilitato; i warning di build preesistenti rimangono visibili nei log.

Questo aggiornamento delle evidenze è un successivo commit di sola documentazione: genera una nuova run sul suo SHA. La run sopra certifica esclusivamente il commit indicato; il risultato dell’HEAD finale viene controllato separatamente e riportato nella consegna, senza presumere che erediti automaticamente il verde precedente.

## Gate residui

Review adeguate di codice e CI, conferma del processo di integrazione delle PR dipendenti, validazione staging/checkout sandbox autorizzato, Safari/device/screen reader e conferme commerciali rimangono separati. GitGuardian resta un controllo distinto. Nessun merge, deploy, ordine o modifica a impostazioni live/credenziali/branch protection.
