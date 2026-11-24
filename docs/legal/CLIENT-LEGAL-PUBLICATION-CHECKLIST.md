# Fascicolo delle informative e dei contatti Shopify

## Revisione 4 del 23 novembre 2026

Cinque testi candidati negli stessi file della r3. Ogni SHA-256 identifica i byte UTF-8 che seguono la riga del marcatore iniziale fino al marcatore finale escluso, compreso il ritorno a capo finale. Una modifica al testo richiede nuova impronta e approvazione. Il titolare può rivedere questa versione ora. La pubblicazione richiede che siano stati inseriti i dati mancanti e verificati i servizi descritti. [Scheda unica di Marco](../release/FINAL-CLIENT-APPROVALS.md)

| Testo da approvare | SHA-256 del corpo cliente r4 |
|---|---|
| [Termini e condizioni](DRAFT-TERMS-AND-CONDITIONS-2026-11-22.md) | `b97c5607d6ca0c0402663930c6f9ab90d19e80850e88f95a6ef7bb302465e20e` |
| [Privacy Policy](DRAFT-PRIVACY-POLICY-REVIEW-2026-11-22.md) | `9ee1d6c86395bca92db2758f9e5d7fe29dbb8f3a041cc7cb38644f0c3d64ca60` |
| [Spedizione e consegna](CANDIDATE-SHIPPING-2026-11-22.md) | `d292e5264e6c90ea123327358a845390d3f3f15d6437917b2912a5d067a8f8ad` |
| [Resi e rimborsi](CANDIDATE-RETURNS-2026-11-22.md) | `939eac108aad57e0150366524879c5e00a6c70d5d3929ade0ffefbf894ab7449` |
| [Cookie Policy](CANDIDATE-COOKIES-2026-11-22.md) | `afe8c7b7c8c0182e196cadb54ba0fa4fd934bb390b00f7de256d804d24270e15` |

## Informazioni di contatto per il campo nativo Shopify

> M.G. PLANT DI GERON MARCO
>
> Via San Giovanni 25, 35010 Santa Giustina in Colle (PD), Italia
>
> P. IVA 04347360242 · C.F. GRNMRC86R20B563H · REA PD-464045
>
> Email di assistenza e reclami: info@onlinegarden.it
>
> PEC: geronmarco@pec.agritel.it

La scheda negozio contiene un telefono. Aggiungere il numero destinato all’assistenza dopo la conferma di Marco, prima del salvataggio. La sede indicata riceve comunicazioni. La destinazione fisica dei resi ha un campo separato nella scheda decisionale.

## Unica sessione autorizzata di pubblicazione

1. Selezionare Online Garden, verificare dominio, lingua italiana, cinque corpi completi e versione approvata dei contatti. Registrare in privato versione, operatore e orario. Salvare gli attuali testi completi, URL, stato automatico/manuale della Privacy e collegamenti. Il 23/11 la lettura Admin API ha restituito soltanto PRIVACY_POLICY, aggiornata il 30/10 alle 15:02 UTC. Il footer italiano e il checkout la espongono.
2. In **Impostazioni → Informative** inserire Termini, Privacy, Spedizioni, Resi e Informazioni di contatto nelle rispettive sedi. Applicare titoli e tabelle nell’editor, preservando tutti i valori A/B. Verificare preventivamente se l’aggiornamento automatico della Privacy interferisce con la versione firmata. Per Cookie, predisporre una pagina Shopify raggiungibile tramite URL pubblico, oppure una destinazione pubblicabile sulla vetrina headless se la pagina Shopify non è raggiungibile. Il relativo collegamento sulla vetrina rientra nel Publish frontend autorizzato.
3. Usare la versione approvata del solo corpo cliente. Verificare nel rendering italiano di ciascuna destinazione testo normalizzato, dati di contatto, accenti, importi, tabelle e link. Registrare URL canonici e evidenza del contenuto visualizzato; aggiornare la lista dei link in `src/config/legal.ts` solo con destinazioni realmente pubbliche. La configurazione del footer fa parte del rilascio della vetrina. Verificare da ospite su mobile/desktop anche le informative native nel dialogo del checkout, il percorso di preferenze e il recesso.
4. Se un salvataggio fallisce, interrompere la sequenza, annotare quali campi sono effettivamente pubblicati e ripristinare testi, pagine e collegamenti dalla copia precedente. I salvataggi Shopify sono distinti. Una sessione unica richiede questa riconciliazione. Verificare dal pubblico il ripristino prima di riaprire il rilascio. [Documentazione Shopify](https://help.shopify.com/en/manual/checkout-settings/refund-privacy-tos)

## Revisioni precedenti

## Pacchetto candidato del 22 novembre, revisione 3

I cinque corpi cliente aggiornati sono nei file originari al commit `0e474b7`. Per la revisione si usa SHA-256 sugli stessi byte descritti nella revisione 2. Il titolare deve integrare i dati residui e approvare le impronte del testo completo prima della pubblicazione. Il riepilogo Shopify espone una sola Privacy del 30 ottobre. Nel nuovo controllo il footer italiano la raggiunge e il dialogo al checkout si apre. La [scheda unica per Marco](../release/FINAL-DELIVERY-2026-11-22.md#g-decisioni-residue-per-marco) elenca i dati commerciali e privacy da confermare.

| Corpo cliente | SHA-256 della revisione 3 |
|---|---|
| [Termini](DRAFT-TERMS-AND-CONDITIONS-2026-11-22.md) | `954c7af5160c0653e5f39426692ffd8846dd34f9dd670119c448675fcf8f1ca1` |
| [Privacy](DRAFT-PRIVACY-POLICY-REVIEW-2026-11-22.md) | `2bab8f306155f7334bac06d70ce221dd5c51b8d2fe39bd8181265b7123af15bf` |
| [Spedizioni](CANDIDATE-SHIPPING-2026-11-22.md) | `652bd40d397d2358a813b178fe01e8f3abc140320019c3da93d1d8f1f043a2a9` |
| [Resi](CANDIDATE-RETURNS-2026-11-22.md) | `0df23d141f55192b70730980b944c2c8e6eae08baf62080de442a585e95a1048` |
| [Cookie](CANDIDATE-COOKIES-2026-11-22.md) | `cbb2d78cddf5ce741706b1727c1898af6a176bb1e60f407daa78981c40c21cb7` |

## Pacchetto candidato del 22 novembre, revisione 2

Le impronte storiche si verificano sui file del commit `e0840e2`.

Il commit `e0840e2` identifica i cinque file. Ogni impronta SHA-256 copre i byte UTF-8 fra le righe `<!-- testo-cliente:inizio -->` e `<!-- testo-cliente:fine -->`, compreso il ritorno a capo finale. Il titolo della sezione Shopify è identificato dalla prima colonna. Le note per il revisore rimangono nel fascicolo.

| Testo e destinazione | SHA-256 del corpo candidato | Stato |
|---|---|---|
| [Termini](DRAFT-TERMS-AND-CONDITIONS-2026-11-22.md) | `4e7b5bb5f340883bbd891d3dedd2cb9c9d8fb0f628760fd7ad82a32395194ae6` | Candidato da integrare e approvare |
| [Privacy](DRAFT-PRIVACY-POLICY-REVIEW-2026-11-22.md) | `ad73e0eb795a757be6ad4f38af38a5d9ea577e37fd3e4f89ca7391b57dcea307` | Candidato da integrare e approvare |
| [Spedizioni](CANDIDATE-SHIPPING-2026-11-22.md) | `93d254dbcc84b9683aa4caa1927d87e93dd4ea290decceb9bb4f11a0771b3ac1` | Candidato da integrare e approvare |
| [Resi](CANDIDATE-RETURNS-2026-11-22.md) | `aadcfb12c1da669056f2d24a954b39faeccba196d2ccacd32e55a0f74a02a20e` | Candidato da integrare e approvare |
| [Cookie](CANDIDATE-COOKIES-2026-11-22.md) | `c5f8380b94be136bb05dd1f4d5f579a401d05c78bfe16db3f04d7c63e72bd154` | Candidato da integrare e approvare |

Per Termini, Privacy, Spedizioni e Resi usare la corrispondente policy di Shopify. Per Cookie usare una pagina Shopify approvata con link in vetrina se non è disponibile un tipo nativo dedicato. La privacy pubblicata il 30 ottobre rimane la fonte del checkout. Il numero nella scheda negozio Shopify non compare nel corpo della privacy pubblica. Il titolare può confermare in privato se usarlo per l’assistenza o indicare quello corretto. Prima di esporre un testo integrato, calcolare il nuovo hash, associare la firma del titolare alla revisione, salvare la copia ripristinabile e verificare i collegamenti italiani in footer e checkout, inclusi i nuovi testi applicabili.
