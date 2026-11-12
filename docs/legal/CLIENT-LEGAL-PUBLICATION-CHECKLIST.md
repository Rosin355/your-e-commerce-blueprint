# Online Garden — checklist approvazione e pubblicazione legale

1 novembre 2026. Documento operativo interno, non una policy del negozio. **Footer pubblicato e verificato** su https://onlinegarden.it dopo il merge della PR #43. Commit di produzione `8d2a160917895735658e34a37d6b337733a32649`. Il rilascio tecnico non certifica la readiness legale/commerciale.

## Riscontro corrente — 12 novembre 2026

Rilettura Shopify: soltanto Privacy Policy presente, aggiornata il 30 ottobre; contatti e collegamento Privacy sono ancora visibili dopo il Publish SEO. Ricerca mirata di documenti legali nella cartella Drive del progetto: nessun testo utile individuato, senza leggere file clienti. Non equivale alla prova che nessun altro archivio esista.

Il backup Drive indicato dal proprietario è troncato: **20.447.232 byte**, interruzione nel membro `bandwidth_db_data.json` (57.723.050 byte dichiarati; 20.435.456 disponibili), prima di contenuti SQL/pagine leggibili. Zero testi, database o permalink recuperati; nessun restore/estrazione account/clienti. [Evidenza strutturale](../seo/evidence/legacy-backup-2026-11-12.json). Non ripetere gli stessi tentativi. La richiesta precisa al vecchio hosting è nella [checklist unica](../release/PROJECT-CLOSEOUT-CHECKLIST.md). Un testo eventualmente recuperato rimane da verificare e approvare prima della pubblicazione.

Termini, cookie, spedizioni/resi e dati societari attuali approvati restano necessari. Il file eventi hosting è ancora referenziato nell’HTML live: questo riscontro non dimostra da solo una nuova trasmissione né chiude il controllo consenso. Nessun testo inventato/pubblicato, nessuna CMP o telemetria modificata.

## Disponibile e utilizzabile

- [x] Privacy Policy Shopify esistente in italiano, aggiornata il 30 ottobre 2026: [apri informativa ufficiale](https://checkout.shopify.com/102600966484/policies/56892817748.html?locale=it). Pubblicata e verificata; collegamento autorizzato nella richiesta. Non equivale a una nuova revisione legale del testo.
- [x] Email `info@onlinegarden.it` confermata dal negozio Shopify e collegamento `mailto:` verificato. Nessun test di consegna email eseguito.
- [x] Footer pulito da voci provvisorie; cinque collegamenti al catalogo pubblico verificati.
- [x] Pagina Contatti e alias `/privacy-policy` **pubblicati e verificati realmente su onlinegarden.it**.

## Contenuti mancanti: richieste a Marco

| Documento / informazione | Stato attuale | Cosa deve fornire o approvare Marco |
| --- | --- | --- |
| Cookie Policy | Non disponibile, non pubblicabile; nessuna bozza reperita | Inventario fornitori, cookie/storage, finalità, conservazione e testo validato |
| Termini e condizioni | Non disponibili su Shopify/repository; nessuna bozza reperita | Testo definitivo e approvazione documentata |
| Spedizioni e consegne | Non disponibili; nessuna bozza reperita | Aree servite, costi, tempi e condizioni effettivi, testo approvato |
| Resi e rimborsi | Non disponibili; nessuna bozza reperita | Condizioni e procedura effettiva, recapiti/indirizzo reso approvati, testo validato |
| Dati societari | Nessun insieme approvato disponibile per il footer | Ragione sociale, P. IVA, sede ed eventuali dati ulteriori da pubblicare |
| Vecchie policy WordPress | Recupero non attestato | Consegnare file, fonte, data e approvazione; un documento recuperato non è automaticamente vigente |
| Social | Nessun canale ufficiale verificato | URL ufficiali soltanto se si desidera aggiungerli |
| Chi siamo / FAQ | Pagine reali non disponibili | Contenuti approvati ed eventuale decisione di creare le pagine |

Non è stato inventato alcun testo legale e non si dichiara alcuna policy “in bozza” se il file non è stato effettivamente reperito. Le quattro route legali mancanti restano disattive e senza link nel footer; controllo reale post-deploy: 404 UI e noindex JS, nessun testo fittizio.

## Consenso e hosting: decisione necessaria

- [ ] Completare con il fornitore la classificazione degli script iniettati `/~flock.js` e `/__l5e/events…js`: rilevato tentativo di invio eventi prima di qualsiasi scelta. Gli invii sono stati bloccati esclusivamente dallo strumento di audit.
- [ ] Confermare finalità, fornitori e classificazione cookie/storage, compresi font remoti, hosting, Shopify e autenticazione.
- [ ] Decidere e approvare la soluzione: eventuale disattivazione della telemetria o subordinazione al consenso dove richiesto. Nessuna CMP installata o scelta implicitamente.
- [ ] Se approvata una CMP, provarne blocco preventivo, rifiuto, accettazione, revoca e persistenza delle preferenze. Il banner visibile da solo non completa il controllo.

## Prossime pubblicazioni delle policy dopo le approvazioni

1. Registrare fonte, versione, data e approvazione del referente per ciascuna policy. Mantenere eventuali bozze solo in documentazione privata, mai in pagine servite al pubblico.
2. Inserire i testi approvati nelle Informative Shopify e verificare lingua/URL/link nel checkout. Non copiare l'HTML nel frontend senza un processo sicuro di aggiornamento e rendering.
3. Attivare nel registro frontend solo le destinazioni approvate e implementate; aggiungere handler, metadati e link, quindi verificare assenza di 404.
4. Verificare con l'hosting veri status HTTP per pagine assenti, noindex e redirect privacy. L'attuale `noindex` client-side non sostituisce la risposta HTTP.
5. Eseguire collaudo Safari/iOS reale, tastiera, contrasto, mobile e checkout sandbox autorizzato, senza ordini reali non richiesti.
6. Preparare una nuova modifica per i testi approvati e sottoporla a review/CI prima dell'attivazione. La PR #43 del solo footer è già stata unita e pubblicata; questa autorizzazione non si estende alle nuove policy o alle configurazioni privacy.

**Footer: ONLINE. Gate di uscita commerciale: BLOCKED per approvazione completa.** Mancano contenuti legali approvati e validazione consenso/telemetria hosting. Il footer pubblicato non risolve da solo questi blocchi. Visitor analytics confermato ON nel pannello; la disattivazione è disponibile in Impostazioni progetto → Generali → Pubblicazione e richiede una decisione specifica, non eseguita in questo rilascio.

[Report tecnico e QA](FOOTER-AND-POLICY-INTEGRATION.md) · [Screenshot e report](evidence/2026-11-01/README.md).

## Chiusura tecnica del solo footer — eseguita

- [x] Review finale, CI/GitGuardian positivi, uscita da Draft e merge della sola PR #43, senza bypass.
- [x] Sync del merge in Lovable, deploy esplicito e conferma del nuovo footer sul dominio pubblico.
- [x] Screenshot reali desktop/mobile e 16 controlli browser post-deploy superati; HTTPS/redirect e risorse iniziali verificati.
- [x] Policy mancanti mantenute non pubblicabili; nessuna modifica Shopify/Supabase/DNS, Admin V2, flag o privacy.
- [ ] Restano decisioni legali/commerciali, consenso/telemetria, checkout completo autorizzato e Safari/iOS reale.

[Evidenze del rilascio](release-evidence/2026-11-01/README.md). Nessuna operazione manuale ulteriore è necessaria per rendere visibile questo footer; i punti non completati riguardano la readiness commerciale e privacy successiva.
