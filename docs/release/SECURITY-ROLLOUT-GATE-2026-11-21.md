# Online Garden — Security rollout GO/NO-GO (21 novembre 2026)

**Fonte:** [audit mirato](../security-audit-2026-11-21.md) al commit Lovable `28372c30e13866dd0eb597b42cb621a420d955f8`.  
**Decisione:** **NO-GO alla pubblicazione indiscriminata.** Questa checklist non costituisce autorizzazione a deploy, SQL, policy o modifiche Shopify.

## Risultati accertati

- Audit iniziale 15 finding: 7 Critical, 7 Warning, 1 Info; deep scan avviato **prima** del commit correttivo segnala poi **21 finding, di cui 8 Critical**. Il numero aggiornato non descrive automaticamente lo stato del codice al commit `28372c3`: serve scansione nuova sul commit.
- Correzioni **solo nel sorgente**, non distribuite, per sei finding Critical segnalati inizialmente, con due finding che si riferiscono alla stessa funzione `ai-enrich-products`. Nove Edge Functions modificate complessivamente per Critical/Warning.
- Vecchio endpoint `get-customer-orders`: il sorgente attuale risponde 410, ma nel runtime osservato il percorso con credenziali risponde 200 con `success,orders`. La causa/gravità residua non è stata attestata. **Non usare email come prova dell'identità**.
- Due warning DB su helper `has_role(uuid,app_role)`, `can_publish_products(uuid)` e analoghi: modificare esecuzione/funzioni potrebbe influire su policy RLS e Storage. Esaminare le dipendenze prima di qualsiasi REVOKE o guard self-only.
- Checkout dell'ultimo test bloccato su «Creazione checkout…» oltre 45 s; il test precedente in preview aveva raggiunto Shopify. Serve diagnosi mirata, non si può dare PASS E2E.
- Advisory dependency: 8 segnalazioni su `ws`, Zod e React Router; esaminare reachability e upgrade senza forzare major.
- Il finding Storage sull'ownership del bucket pubblico immagini è informativo nel contesto documentato: non trasformare il bucket pubblico in privato indiscriminatamente né spostare documenti privati nel bucket sync.
- Fatti già attestati: 278 controlli mirati PASS, 20 auth clienti PASS, 46 preflight PASS; 644 catalogo PASS, 5 file `jsr:` non eseguibili con Node. Non confondere test mock con prove autorizzative live.
- PR #60 e #61 integrate su `main`; il Publish Lovable era stato avviato con ID `e75abdfd-a72e-4a23-a76b-1fbb2c657195`, ma lo stato specifico e il bundle pubblico non erano verificati nel momento della registrazione. Prima del rollout accertare versione effettiva e compatibilità dei vecchi client.

## Piano minimo proposto (senza esecuzione)

1. **Inventario release:** congelare SHA del codice corretto, lista esatta delle 9 funzioni, dipendenze `_shared`, baseline live e canale di rollback. Verificare che commit Lovable e GitHub coincidano.
2. **Critical residui:** classificare esplicitamente tutti gli **8 Critical** della deep scan e riportare differenza baseline vs nuovo commit. Nessun finding va chiamato «risolto» solo perché cambia lo scanner.
3. **Endpoint ordini legacy:** verificare versioning e invocazioni da vecchi bundle. Preparare dismissione in modo che nessun endpoint di ricerca per email possa esporre ordini di altre persone; non forzare HTTP 410 in produzione senza una compatibilità/rollout documentati.
4. **Ruoli/RLS/Storage:** definire il diff SQL esatto per `has_role`, `can_publish_products` e helper analoghi; censire le dipendenze, preservare accesso editor di Marco e permessi staff, nessuna modifica senza autorizzazione specifica.
5. **Checkout:** distinguere timeout di preview da rottura reale, verificare `cartCreate` e apertura checkout senza inviare ordini o pagamenti, preservando Shopify Payments.
6. **Scan e advisory:** ripetere deep security scan **sul commit corretto**, verificare i warning residui e l'applicabilità degli advisory. Documentare eccezioni motivate senza «ignora tutti».
7. **Rilascio a piccoli passi:** richiedere **una singola approvazione esplicita** con inventario operazioni su funzioni e DB, ordine delle operazioni, verifica auth/401/403 e rollback. Prevedere prima l'hotfix di esposizioni confermate, poi frontend/area clienti; no deploy implicitamente autorizzato da questo documento.
8. **Post-deploy:** evidenza di SHA/server, smoke cliente/staff, catalogo/checkout, assenza mutazioni prodotti/ordini e scan applicabile; riportare anomalie e ripristinare se il criterio NO-GO scatta.

## GO/NO-GO

**GO** solo dopo verifica della versione deployabile, esposizioni Critical affrontate, modifiche SQL esplicitamente approvate se necessarie, test checkout e login essenziali, piano di rollback pronto, controllo effettivo delle funzioni live.

**NO-GO** se rimane incertezza sull'accesso a ordini di terzi, su autorizzazioni prezzi/catalogo, sul collegamento Shopify, sui privilegi RLS/Storage, sul checkout, o se manca una verifica della versione realmente servita.

**Fase storica:** 953 ordini WooCommerce conteggiati ma indisponibili per import; 0 migrati. Non collegata alla bonifica di sicurezza.
