# Checkpoint Isole — 4 novembre 2026

Baseline PR #45: 6b628e139ef3330e92b53c69f725fede8f95e6c1. Questa evidenza è un resoconto delle letture UI effettive, non una prova checkout.

La sessione autenticata mostrava Online Garden Shipping Test, dev, organizzazione Online Garden. Nel selettore Mercati sono state selezionate:
Agrigento, Caltanissetta, Catania, Enna, Messina, Palermo, Ragusa, Siracusa, Trapani, Cagliari, Sassari, Nuoro, Oristano, Ogliastra, Medio Campidano, Gallura Nord-Est Sardegna, Sulcis Iglesiente.

Dopo Salva, la UI mostrava QA Isole Sicilia e Sardegna, stato Bozza, ID 119731978565 e genitore Italy 119681515845. L'override spedizione è stato iniziato tramite Personalizza e l'opzione ereditata appariva nella sezione Personalizzazioni. Non sono state completate né rilette le tariffe speciali. L'ultimo inventario Chrome conferma la scheda sul mercato 119731978565.

Il controllo è stato interrotto dal reset del runtime, poi due chiamate getTab sulla scheda esistente hanno restituito esattamente «Debugger unattached». Nessun risultato tariffario regionale acquisito e nessuno screenshot checkout nuovo disponibile.

## Ripresa minima

1. Riaprire il mercato Dev 119731978565 e verificare la bozza e le condizioni.
2. Completare l'override A/B speciale nella stessa unica opzione; verificare gratuità spenta, nessuna modifica al genitore.
3. Attivare solo nel Dev e provare Palermo con due bulbi 30 € (6,90 €) e Cagliari con bulbo + arbusto 45 € (12,50 €). Roma già PASS da riutilizzare.
4. Se l'override non è corretto, riportare il mercato in bozza; non modificare la tariffa standard del genitore.
5. Elba, Lido e Pellestrina: eccezioni aperte. Non includere Livorno o Venezia intere per aggirare l'assenza del criterio CAP/località.

Non sono stati creati ordini, pagamenti, app o abbonamenti. Non sono state effettuate scritture Shopify produzione o Sendcloud.
