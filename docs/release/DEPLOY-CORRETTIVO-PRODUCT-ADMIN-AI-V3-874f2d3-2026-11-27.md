# Online Garden — deploy correttivo product-admin-ai V3

27 novembre 2026. **PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.**

## Risultato

| Campo richiesto | Esito verificato |
|---|---|
| DEPLOY | **SUCCESS**, solo `product-admin-ai` |
| SOURCE_SHA | `874f2d398bdb4c635955243ac2a3e1fc5546a254` |
| PACKAGE_MANIFEST | `d6c02bbce3b9d7365a16278487ac32edfcfbcddadab0b08f196dd54b7e9ccf41`, verificato |
| AUTH_CHECK | PASS: OPTIONS 200, senza token 401, token invalido 401, controllo autenticato non generativo 422 atteso |
| LEGACY_COMPATIBILITY | PASS nei 43 test offline pertinenti; generazione legacy reale non eseguita |
| RUNTIME_ATTESTATION | SHA runtime **non attestabile**; ricevuta identifica i sorgenti inviati, non il bytecode riletto |
| ROLLBACK_STATUS | Sorgenti precedenti conservati e manifest verificato; rollback autorizzato solo per regressione tecnica confermata, **non eseguito** |
| READY_FOR_REAL_GEMINI_TEST | **READY**, prova demandata al titolare; qualità editoriale non ancora accettata |

## Sorgente e ricevuta del deploy

Il checkout iniziale era `4e6ffc9d2a1011802f9a0667be212d3878c65983`, sul ramo `codex/ai-product-editor-v3-20261127`, pulito. È il commit documentale del preflight; tutti i **31 file transitivi (5 locali e 26 shared)** della funzione coincidono byte per byte con il candidato autorizzato `874f2d3`. Confronto effettuato anche con i blob Git del commit, non soltanto con i file temporanei.

Manifest ordinato `{path, sha256}`, JSON UTF-8 compatto: hash esattamente coincidente con quello autorizzato. [Manifest candidato completo](DEPLOY-CORRETTIVO-V3-874f2d3-manifest.json).

Unica invocazione di deploy effettuata:

```json
{"function_names":["product-admin-ai"]}
```

Ricevuta dello strumento:

```text
Successfully deployed edge functions: product-admin-ai
Submitted source SHA-256 (files and settings; live verification is reported separately):
product-admin-ai source_sha256: 14af6f9a418c63416d46ee02ab570f85f718ddecef55101a3d37bdc4f27fc332
```

Il valore della ricevuta include file e settings nel formato dello strumento; non è il manifest sorgente e non è uno SHA runtime. Lo strumento non ha restituito un deployment ID. [Ricevuta strutturata](DEPLOY-CORRETTIVO-V3-874f2d3-receipt.json).

Nessun nuovo preflight generale; riutilizzato il [piano verificato](PREFLIGHT-RETEST-GEMINI-V3-874f2d3-2026-11-27.md). Nessun altro deploy, retry del deploy, Publish, merge, migration o cambio di secret/JWT/grant/configurazione. Nessuna modifica ai sorgenti delle funzioni.

## Controlli post-deploy

| UTC | Richiesta | Risultato |
|---|---|---|
| 18:33:25 | POST `suggest_confirmed_field`, Authorization vuoto esplicito | 401 `UNAUTHENTICATED`, token mancante |
| 18:33:26 | POST stessa azione, token invalido esplicito | 401 `UNAUTHENTICATED`, token non valido o scaduto |
| 18:33:27 | POST `get_ai_suggestions`, sessione del richiedente, ID intenzionalmente invalido | 422 `VALIDATION_ERROR`; identità accettata, nessuna lettura di proposte |
| 18:33:27 | OPTIONS | 200, header `verified-editorial-20261126-r2` |
| 18:33:36 | POST `suggest_confirmed_field`, sessione del richiedente, `fieldKey: description`, fatti vuoti confermati | 422 `INVALID_CONFIRMED_FACTS`; grant/campo controllati, arresto prima della prenotazione e del provider |

L'ultimo controllo usa input deliberatamente invalido: non è una generazione fallita, non prenota AI e non chiama Gemini. Il suo requestId è `554252a2-d177-431c-a546-d1a4d1c6c1ca`.

I log HTTP, letti separatamente, confermano i cinque status nella finestra post-deploy. I log della funzione mostrano boot alle 18:33:25/26 e il warning atteso alle 18:33:36, `stage: input`, `INVALID_CONFIRMED_FACTS`. Nessun errore tecnico nella finestra osservata. La prima lettura dei log aveva restituito solo eventi antecedenti; la lettura successiva ha acquisito gli eventi post-deploy. Nessuna deduzione da log storici.

## Compatibilità e pagina Admin

Comando offline mirato, con rete chiusa:

```text
node --require ./ci/offline-network.cjs --import tsx --test \
  scripts/tests/admin-ai-confirmed.test.ts \
  scripts/tests/admin-ai-editor-regression.test.ts \
  scripts/tests/admin-ai-product-editor-v2.test.ts \
  scripts/tests/admin-ai-product-editor-v3.test.ts
```

**43/43 PASS**. Il percorso senza `article` conserva `online-garden-editoriale-it@2`; il percorso V3 usa `@3`, con recupero locale e SEO corretta. Queste sono prove simulate, non una chiamata reale legacy post-deploy. Il comparatore di copertura condiviso cambia anche per il legacy: compatibilità del contratto non implica identità byte-per-byte dei risultati editoriali.

Pagina `/admin/products/new` aperta con la sessione del titolare: Admin autenticato, Nuovo prodotto, Anteprima cliente e pulsante Genera scheda completa con AI visibili; nessun errore JavaScript. Filtro browser preventivo consente soltanto le letture Admin necessarie e blocca AI e comandi di scrittura. Sito pubblico HTTP 200; frontend non pubblicato né modificato.

Anteprima per la prova personale:

https://id-preview--95cad199-55fd-4870-9d5c-a2653edf88f5.lovable.app/admin/products/new

## Runtime e prova personale

`promptVersion=@3` e header `verified-editorial-20261126-r2` sono condivisi con il precedente backend; non identificano questa correzione. **Non sono stati usati come prova SHA.** La prossima risposta V3 valida dovrà mostrare `sectionAudit`; eventuali recuperi locali avranno `origin: derived`. Questi indicatori aiutano a distinguere i comportamenti noti, ma non certificano tutti i byte distribuiti.

Il titolare può verificare la pagina e premere **una sola volta** Genera scheda completa con AI con i fatti Yucca confermati. Budget applicativo massimo: **due chiamate Gemini**, descrizione e, solo se autorizzata, selezione SEO/tag. Nessun retry, seconda generazione o revisione AI durante il test. In caso di errore o risultato ambiguo fermarsi e conservare risposta/avvisi. Non applicare/salvare la scheda, creare bozze Shopify o pubblicare.

La generazione futura può registrare prenotazione e scope AI tecnici; nessuna prenotazione è stata effettuata dai controlli presenti. **Chiamate Gemini dell'agent: zero.** Copertura, lunghezza, scarti, recuperi, SEO, FAQ e curiosità reali restano da misurare con il confronto già previsto nel preflight.

## Rollback

Precedente: `fa2a0796a93cd2fe1d4ee7de1b80f9b0cf8dc0c1`. Grafo completo di 31 file conservato in area temporanea e recuperabile dal commit Git. [Manifest rollback](DEPLOY-CORRETTIVO-V3-fa2a079-rollback-manifest.json):

`8c867bad8767991a2d1826b36041bf0183bfcb587470b451b8d39c044647594e`.

Il mandato autorizza il rollback della sola funzione **in caso di regressione tecnica confermata**, non per esito ambiguo o qualità editoriale ancora da giudicare. Nessuna regressione tecnica confermata nei controlli: rollback non eseguito. Se necessario, ricostruire dal commit precedente l'intero grafo, verificare manifest e distribuire solo `product-admin-ai`; mantenere settings e ripetere controlli non generativi, senza Gemini. Le eventuali prenotazioni tecniche già registrate restano conservate.

I file temporanei non sono un archivio persistente: commit sorgente e manifest nel repository permettono di ricostruire il pacchetto esatto. Nessun restore generale né cambio ramo necessario.

## Limiti conservati

Nessun test Gemini reale, Publish, merge, migration, cambio permessi/secret/configurazione, salvataggio di prodotto o operazione Shopify. Documentazione e manifest di rilascio sono gli unici file aggiunti/modificati dopo il deploy. Attestazione runtime crittografica indisponibile; UAT cliente e qualità del modello reale restano aperte. **PENDING_CLIENT_ACCEPTANCE · SAL 57,75%.**