# Online Garden — checklist approvazione e pubblicazione legale

1 novembre 2026. Documento operativo interno, non una policy del negozio. Implementazione sul branch `codex/storefront-footer-legal`; nessuna pubblicazione del sito effettuata.

## Disponibile e utilizzabile

- [x] Privacy Policy Shopify esistente in italiano, aggiornata il 30 ottobre 2026: [apri informativa ufficiale](https://checkout.shopify.com/102600966484/policies/56892817748.html?locale=it). Pubblicata e verificata; collegamento autorizzato nella richiesta. Non equivale a una nuova revisione legale del testo.
- [x] Email `info@onlinegarden.it` confermata dal negozio Shopify e collegamento `mailto:` verificato. Nessun test di consegna email eseguito.
- [x] Footer pulito da voci provvisorie; cinque collegamenti al catalogo pubblico verificati.
- [x] Pagina Contatti e alias `/privacy-policy` disponibili nella build del branch. Non ancora pubblicati su onlinegarden.it.

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

Non è stato inventato alcun testo legale e non si dichiara alcuna policy “in bozza” se il file non è stato effettivamente reperito. Le quattro route legali mancanti restano disattive e senza link nel footer.

## Consenso e hosting: decisione necessaria

- [ ] Verificare con il fornitore gli script iniettati `/~flock.js` e `/__l5e/events…js`: rilevato tentativo di invio eventi prima di qualsiasi scelta. Gli invii sono stati bloccati esclusivamente dallo strumento di audit.
- [ ] Confermare finalità, fornitori e classificazione cookie/storage, compresi font remoti, hosting, Shopify e autenticazione.
- [ ] Decidere e approvare la soluzione: eventuale disattivazione della telemetria o subordinazione al consenso dove richiesto. Nessuna CMP installata o scelta implicitamente.
- [ ] Se approvata una CMP, provarne blocco preventivo, rifiuto, accettazione, revoca e persistenza delle preferenze. Il banner visibile da solo non completa il controllo.

## Sequenza di pubblicazione dopo le approvazioni

1. Registrare fonte, versione, data e approvazione del referente per ciascuna policy. Mantenere eventuali bozze solo in documentazione privata, mai in pagine servite al pubblico.
2. Inserire i testi approvati nelle Informative Shopify e verificare lingua/URL/link nel checkout. Non copiare l'HTML nel frontend senza un processo sicuro di aggiornamento e rendering.
3. Attivare nel registro frontend solo le destinazioni approvate e implementate; aggiungere handler, metadati e link, quindi verificare assenza di 404.
4. Verificare con l'hosting veri status HTTP per pagine assenti, noindex e redirect privacy. L'attuale `noindex` client-side non sostituisce la risposta HTTP.
5. Eseguire collaudo Safari/iOS reale, tastiera, contrasto, mobile e checkout sandbox autorizzato, senza ordini reali non richiesti.
6. Review della Draft PR e CI sull'HEAD finale. Merge e pubblicazione richiedono una decisione successiva; questa attività non li esegue.

**Gate di uscita: BLOCKED per pubblicazione completa.** Mancano contenuti legali approvati e validazione consenso/telemetria hosting. Il footer tecnicamente verificato non risolve da solo questi blocchi.

[Report tecnico e QA](FOOTER-AND-POLICY-INTEGRATION.md) · [Screenshot e report](evidence/2026-11-01/README.md).
