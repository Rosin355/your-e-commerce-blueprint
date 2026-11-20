# Fattibilita redirect 301 /prodotto/... su hosting nativo Lovable

Solo verifica: nessuna modifica eseguita.

## Esito: NO (redirect 301 per percorso non disponibili nell'hosting nativo)

| Punto | Esito | Fonte / prova |
|---|---|---|
| a) Redirect configurabile in Lovable prima della SPA | NO | Documentazione ufficiale (docs.lovable.dev/features/hosting, /features/custom-domain): nessuna regola redirect per percorso; esiste solo il fallback SPA verso index.html. Nessuna impostazione del genere visibile per il progetto. |
| b) `_redirects` / `vercel.json` / `netlify.toml` | NO | Documentazione: questi file non vengono interpretati da Lovable. Nel progetto non esistono (verificato). |
| c) React Router / JS | Non e HTTP 301 | Avviene nel browser dopo una risposta 200; i motori di ricerca non lo trattano come 301 server. |
| d) Normalizzazione www | 302 (by design) | Prova live: `www.onlinegarden.it/prodotto/test-legacy` -> 302 verso `onlinegarden.it/prodotto/test-legacy`; il dominio principale risponde 200. Documentazione: tra domini collegati Lovable usa 302/307, non 301, perche il dominio principale si puo cambiare. Unico 301 nativo: da HTTP a HTTPS. |

Conseguenza: oggi un singolo salto 301 dalla prima richiesta su entrambi gli host non si puo ottenere con le sole funzioni di Lovable. Su www ci sarebbero comunque almeno 302 + eventuale redirect successivo.

## Cosa chiedere al supporto Lovable (non posso aprire io la richiesta)
Testo proposto:
"Progetto Online Garden, domini onlinegarden.it (principale) e www.onlinegarden.it, DNS su IONOS. Chiediamo se l'hosting Lovable puo configurare lato server 16 redirect HTTP 301 permanenti da /prodotto/<slug> a /products/<handle>, applicati prima della SPA e su entrambi gli host con un solo salto (anche www/prodotto/... direttamente al percorso finale sul dominio principale). Chiediamo inoltre se la normalizzazione www puo essere 301 invece di 302. Se non disponibile, e prevista una funzione o un'eccezione per il progetto?"

Allegare l'elenco dei 16 URL vecchi -> nuovi.

## Nota
Nessuna implementazione proposta come certa finche il supporto non conferma. Nessuna modifica a DNS, domini, Publish, codice o impostazioni.
