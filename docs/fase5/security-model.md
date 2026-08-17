# F5 — Modello di sicurezza

## Autenticazione
- JWT obbligatorio su ogni richiesta, verificato realmente con Supabase Auth (`auth.getUser`).
- L'identità deriva esclusivamente dal token: email, user id, ruolo o permessi inviati nel body sono ignorati.
- I ruoli sono letti server-side da `public.user_roles` con client service role.
- `actor` nello storico = user id del token verificato.

## Autorizzazione per ruolo

| Ruolo | Lettura Admin prodotti | Command F5 |
|---|---|---|
| Cliente/Editor (`editor`) | sì | sì (campi autorizzati, conferma legacy) |
| `publisher` | sì | no (solo se possiede anche `editor`); nessuna pubblicazione in F5 |
| `admin` | sì | sì, senza bypass dei vincoli campo |
| `tech_admin` | sì (diagnostica) | sì, nessun bypass degli snapshot immutabili |
| `moderator` / `user` | no | no |
| anon | no | no |

## Campi non modificabili in F5
Gruppi protetti: `inventory`, `shopify_state`, `system`, `other_imported`.
Chiavi protette: `sku`, `woo_product_id`, `entity_type`, `parent_sku`, `handle`,
`product_category_raw`, `category_effective`, `raw_unmapped`.
Inoltre ogni definizione con `editable=false` o `visible=false`, e ogni current value con `is_locked=true`
(eccetto la conferma legacy). I controlli sono duplicati in TypeScript **e** nella funzione DB.

`manual_only = true` significa "AI vietata", non "non modificabile": i 5 campi manuali restano editabili a mano.

## Accesso database
Il browser non scrive più direttamente. Migration F5.1:

```
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.products               FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_current_values FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_field_history  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_source_snapshots FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_import_batches FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.product_publication_jobs FROM authenticated;
```

Le policy SELECT esistenti (`can_edit_products(auth.uid())`) restano invariate: nessuna lettura autorizzata è stata interrotta.

Verifica post-migration:

| Check | Esito |
|---|---|
| `authenticated` UPDATE su `product_current_values` | `false` |
| `authenticated` SELECT su `product_current_values` | `true` |
| `anon` SELECT su `product_current_values` | `false` |
| `authenticated` EXECUTE su `admin_update_product_field` | `false` |
| `service_role` EXECUTE su `admin_update_product_field` | `true` |

## Funzione atomica
`public.admin_update_product_field(...)`: `SECURITY DEFINER`, `SET search_path = ''`, riferimenti completamente
qualificati, `EXECUTE` concesso al solo `service_role` (revocato a PUBLIC, `anon`, `authenticated`).
Esegue nella stessa transazione: verifica prodotto/campo/editabilità/tipo, optimistic concurrency,
`UPDATE` del current value, `INSERT` nello storico, registrazione idempotenza. Qualunque errore → rollback completo.

## Tabella idempotenza
`public.product_admin_command_log`: RLS abilitata **senza policy** e grant al solo `service_role`.
È volutamente irraggiungibile da `anon`/`authenticated`: nessun dato personale, sola chiave tecnica e risultato del comando.

## Rischi noti
- I test SQL transazionali di UPDATE non sono eseguibili dal canale SQL disponibile (privilegi limitati): finché non vengono eseguiti tramite canale privilegiato, `PRODUCT_ADMIN_WRITES_ENABLED` resta `false`.
- La ricerca testuale usa `ilike` con wildcard neutralizzati; su cataloghi molto più grandi andrà sostituita da un indice full-text.
