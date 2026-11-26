# Online Garden — prompt unico per Lovable Cloud, SQL e permessi Marco

26 novembre 2026. **Procedura da eseguire nella chat dell'editor Lovable** (la voce SQL Editor non è più disponibile nell'interfaccia dell'utente). Questa è una **istruzione di rilascio, non una dichiarazione di modifiche già eseguite**.

## Prompt da incollare in Lovable

> ONLINE GARDEN — IDENTIFICAZIONE EDITOR MARCO + MIGRAZIONI SQL CONTROLLATE
>
> Lavoriamo ESCLUSIVAMENTE sul progetto Online Garden già esistente, Cloud project ref `iekwvvihjwghosqdxrdi`, repository `Rosin355/your-e-commerce-blueprint`, candidato PR #76 già integrato nel ramo Lovable isolato a `8a4794d96215a0cb038b393cfeb824e510c66963`. Non creare altri progetti, database o ambienti Supabase. Il frontend pubblico resta `index-BcqOotvz.js` salvo prova diversa.
>
> **MANDATO CONDIZIONATO SOLO AL DATABASE.** Autorizzo la sola applicazione delle migrazioni e dei cinque grant nominativi indicati qui sotto, ma SOLO SE tutti i controlli preflight sono positivi, esiste uno snapshot privato ripristinabile, l'identità di Marco è accertata senza ambiguità e l'esecuzione rispetta le transazioni originali. Se uno di questi requisiti manca, FERMATI senza scrivere e chiedimi soltanto il dato/GO necessario. NON autorizzo deploy Edge, Publish, modifica di prodotti Shopify, aggiornamento prezzi, cancellazioni, migrazioni di altri sistemi.
>
> 1. **Identifica privatamente Marco**, non per il solo ruolo Editor: leggi `auth.users` + `public.user_roles` + `public.admin_catalog_capabilities` + `public.admin_draft_ai_field_opt_ins`. La baseline aveva due Editor, uno con tre opt-in AI e uno senza. Il conteggio dei tre opt-in è un indizio, NON una prova sufficiente: confronta identità/email con l'account staff nominale documentato e, se manca un riscontro indipendente, chiedimi di confermare l'email mascherata prima di scrivere. Non mostrare email intere, UUID, token o dati riservati nella risposta pubblica né su GitHub. Conserva l'UUID solo nel contesto operativo privato.
>
> 2. **Preflight di sola lettura**: conferma `admin_update_product_field` MD5 `2621cc0ee78a99e6dc55bd0602dc4ac3`, `admin_claim_catalog_approval` MD5 `35742108b8980a1cb930aee7d453dc75`, constraint journal, mapping `short_description` inizialmente `{}` e metafield `custom.short_intro` esistente e Storefront-readable. Verifica stato corrente delle chiavi dell'account Marco, delle capability `sync` e `publish`, dell'altro Editor, e delle RPC/ACL/RLS. Confronta la baseline con `docs/release/ADMIN-V2-CONSEGNA-MARCO-2026-11-25.md` e con le precondizioni degli script. Salva privatamente snapshot completo e verificabile delle sole definizioni e righe interessate, inclusa procedura di ripristino. Non includere dati personali in commit o output.
>
> 3. **Script ORIGINALI da eseguire in questo ordine** (file precisi già verificati nel merge #76):
>    - `docs/release/pending/marco-editor-registry.sql`
>    - `docs/release/pending/marco-editor-actions.sql`
>    - `docs/release/pending/marco-product-lifecycle.sql`
>    - `docs/release/pending/marco-editor-tags.sql`: una transazione per ciascuna chiave `tags`, `product_gallery`, `product_formats`.
>    - `docs/release/pending/marco-reversible-grant.sql`: una transazione per `product_unpublish` e una per `product_archive`.
>
> 4. Gli script sono scritti per `psql` e includono `:'direction'`, `:'staff_id'`, `:'grant_key'`, `\if`, `\set`. Se li esegui attraverso gli strumenti DB di Lovable, **converti soltanto questi parametri e direttive di `psql` in SQL compatibile**, mantenendo invariati logica, transazioni e guardie SHA/MD5, oppure usa `psql` con parametri espliciti se disponibile. NON separare `BEGIN`, `set_config(...,true)` e `DO` in chiamate con connessioni o transazioni diverse. Per riferimento esiste una trascrizione SQL senza `psql`: `docs/release/manual/MARCO-SQL-LOVABLE-COPY-PASTE-2026-11-26.md` su `main`, ma usa l'UUID privato verificato e non copiare mai il segnaposto.
>
> 5. **Regola irreversibile per Marco**: `product_delete` NON va aggiunto, né alla sua riga `field_keys` né ai suoi permessi o alla UI operativa. La cancellazione definitiva rimane al proprietario tramite Shopify Admin, fuori da questo mandato. Lo script del lifecycle può preparare la tabella di clearance senza concedere eliminazioni. Non abilitare grant distruttivi per analogia con `product_archive`. Non modificare `sync` o `publish` già presenti, né i grant di altri Editor.
>
> 6. Per ciascuna transazione: verifica la precondizione, applica una sola modifica, leggi esito e stato DB; se errore o timeout, non ritentare alla cieca. Se manca la possibilità di eseguire SQL tramite gli strumenti autorizzati di questo progetto, interrompi e indica UN percorso supportato; non inventare un SQL Editor, non simulare un `PASS` e non esportare credenziali.
>
> 7. **Postflight**: controlla che Marco abbia esattamente le nuove chiavi `tags`, `product_gallery`, `product_formats`, `product_unpublish`, `product_archive` oltre alle preesistenti, e **non** `product_delete`. Confronta un altro account Editor, RPC, vincolo journal, mapping breve/lungo e permessi RLS/ACL con lo snapshot. Conferma che nessun prodotto Shopify è stato scritto/pubblicato e nessun altro progetto alterato. Controlla l'assenza di migrazioni duplicate.
>
> 8. **GitHub**: aggiorna la documentazione di release e l'handoff, indicando esattamente le operazioni realmente riuscite, lo stato GO/NO-GO della Edge e del Publish, snapshot privato, rollback e data. Non mettere email, UUID o contenuti dello snapshot nel repository. **SAL 57,75% invariata**.
>
> 9. **Output finale sintetico**: identità Marco confermata SÌ/NO (email solo mascherata), preflight, 3 migrazioni PASS/NO-GO, ciascuno dei 5 grant PASS/NO-GO, rollback pronto SÌ/NO, test postflight, nessun `product_delete` a Marco, eventuale unica azione umana necessaria. Non dichiarare il nuovo Admin disponibile in produzione finché non saranno autorizzati e verificati separatamente deploy `product-admin-api`, anteprima personale e Publish Lovable.

## Fonte tecnica

- [PR #76](https://github.com/Rosin355/your-e-commerce-blueprint/pull/76)
- [Verbale di rilascio](https://github.com/Rosin355/your-e-commerce-blueprint/blob/8a4794d96215a0cb038b393cfeb824e510c66963/docs/release/ADMIN-V2-CONSEGNA-MARCO-2026-11-25.md)
- [Precedente guida SQL editor](MARCO-SQL-LOVABLE-COPY-PASTE-2026-11-26.md) (solo riferimento tecnico, NON procedura UI attuale)
- [Rollback SQL](MARCO-SQL-LOVABLE-ROLLBACK-2026-11-26.md)
