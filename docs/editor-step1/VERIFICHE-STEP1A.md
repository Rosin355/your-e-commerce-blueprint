# Step 1A — verifica offline e gate Step 1B

16 novembre 2026. PR #56, stessa branch `codex/marco-product-editor-step1`; partenza remota `3669975` (inclusa checklist aggiunta dal proprietario). **Step 1A sviluppato e verificato offline. GO tecnico al solo preflight Step 1B in sola lettura dopo CI verde. Editor non consegnato a Marco.** Nessuna lettura/configurazione di servizi reali, prodotto commerciale, grant live, deploy, Publish o chiamata AI a pagamento.

| Verifica effettiva | Esito |
| --- | --- |
| Suite dominio Node | 449 PASS; include regressioni preesistenti e nuovi test fatti/permessi/output AI |
| Suite dominio Deno | 106 PASS, lock congelato e nessun permesso rete runtime |
| Chromium locale | 5 PASS, compresi i quattro percorsi Step 1 e il nuovo flusso campo vuoto/nuova bozza |
| Typecheck, lint del perimetro modificato, build | PASS; restano warning build preesistenti |
| Deno check API, entrypoint e service AI, nuovo modulo confermato | PASS |
| PostgreSQL locale 16.15 | Migrazioni Drizzle 0016/0017 applicate tramite migratore ufficiale e richiamate una seconda volta senza riapplicazione |
| Test SQL | PASS: schema/RLS/ACL, grant invariati, capability ignota negata, identità/campo/azione negati, accesso client effettivamente negato |
| Concorrenza SQL | 5 richieste AI ammesse su 8 concorrenti e budget unico vecchio/nuovo verificato in entrambe le direzioni; 1 vincitore e 1 VERSION_CONFLICT su due creazioni concorrenti dello stesso primo valore |
| Primo valore locale | PASS: input errato, tre elenchi vuoti negati, liste valide, testo valido, replay, versione obsoleta e rollback conservano il valore precedente |
| CI della PR | Workflow Storefront/PostgreSQL 17 esteso ai nuovi test SQL; esito del commit riportato nella PR |

Il DB locale è un cluster effimero dedicato sotto `/private/tmp/og-editor-*`, senza TCP, con database `og_admin_test_step1a` e sole fixture. Il cluster è stato fermato dopo le prove. Non è il progetto Supabase/Lovable. La baseline storica necessaria è ricostruita da SQL versionato; una history Drizzle sintetica segna la baseline 0015, quindi il migratore reale legge il journal ed esegue soltanto 0016/0017. Non è una certificazione della history/schema live: quella verifica appartiene allo Step 1B. In CI lo stesso test usa il solo container localhost effimero, con guard esplicita su nome DB/host.

**Difetto trovato e corretto:** la migrazione primo valore della fase precedente applicava la validazione dei mesi anche alle nuove descrizioni/liste. La prova SQL ha rilevato il problema; ora i rami sono separati e i tre elenchi iniziali richiedono stringhe non vuote. Le copie Supabase/Drizzle sono uguali e le due nuove migrazioni sono registrate nel journal effettivo. Nessun valore/account precedente viene modificato dalle migrazioni; il test confronta grant, ruoli e valori prodotto preesistenti prima/dopo, senza differenze. I grant aggiuntivi usati nei test sono soltanto fixture successive alla migrazione.

**AI provata con provider simulato:** dati vuoti/corti/non confermati o HTML/email rifiutati, grant ai/edit e campo obbligatori, produttore derivato dalla sessione, proposta separata, scarto, revisione e applicazione nella compilazione. Nessuna richiesta al caricamento e nessun salvataggio/sync dopo applicazione. La nuova bozza mostra anche nell'editor visuale il testo approvato. Cambiare i fatti invalida conferma e proposta; errore richiede riconferma; nessun retry automatico a consumo.

Il modello può organizzare solo frasi confermate riportandole esattamente: output con parole/frasi, prezzi, numeri, SKU, stock o certificazioni nuovi viene rifiutato. La revisione manuale è esplicita e soggetta alle validazioni ordinarie al successivo salvataggio. Non certificata la verità botanica dei fatti forniti dall'operatore, né il comportamento del modello reale. La nuova richiesta non memorizza fatti o output nel journal, soltanto metadati/hash; i log non riportano questi contenuti.

## Restano fuori da Step 1A

- Progetto/schema/history live, grant nominativi, field registry/mapping e versioni effettive delle Edge Functions: non letti.
- Secret provider (valore mai richiesto), modello realmente disponibile, credito e limiti di spesa: non verificati.
- Una generazione reale a consumo, accettazione nella sessione personale Marco, Safari/screen reader e sync su DRAFT reale: non eseguiti.
- Nessuna migrazione/live grant o distribuzione autorizzati da questa PR. Step 1C/1D rimangono NO-GO.

## Step 1B: controlli consentiti e criteri di stop

Identificare in sola lettura il progetto corretto, confrontare schema/history e CHECK capability, funzioni/RLS/revoche, grant dei soli operatori previsti e campi, registro e versioni backend/frontend. Verificare presenza (non valore) della configurazione provider e disponibilità modello/credito senza una generazione. Produrre solo differenze minime e aggregate da approvare. Ambiguità di identità, drift non spiegato o accesso insufficiente => stop; nessuna modifica per ottenere un PASS.

Riferimenti operativi: [developer](DEVELOPER.md), [designer](DESIGNER.md), [guida Marco](GUIDA-MARCO.md), [checklist](CHECKLIST.md). Il report Step 1 precedente resta cronologia ed è superato da questo per i blocchi tecnici risolti.
