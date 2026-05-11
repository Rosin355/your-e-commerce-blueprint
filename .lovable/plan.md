## Obiettivo
Negozio Shopify riconnesso. Procedo a creare le 20 collezioni manuali del mega menu, pre-popolandole con prodotti coerenti già presenti nel catalogo. Il cliente potrà poi aggiungere/togliere prodotti uno a uno dall'admin Shopify.

## Cosa farò

### 1. Censimento prodotti per categoria
Per ogni handle del mega menu uso `shopify--search_products` con query mirate (titolo, tag, type, vendor) per identificare i prodotti coerenti già presenti nello store.

Esempi di query:
- `agrumi` → `title:limon* OR title:arancio* OR title:mandarin* OR product_type:Agrumi`
- `rampicanti` → `title:glicin* OR title:gelsomin* OR title:bouganv* OR tag:rampicante`
- `rose-rampicanti` → `title:rosa AND tag:rampicante`
- `rose-profumate` → `title:rosa AND tag:profumata`
- `aromatiche` → `title:rosmarin* OR title:salvia OR title:lavand* OR title:menta`
- `piccoli-frutti` → `title:lampon* OR title:mirtill* OR title:ribes OR title:more`
- `alberi-da-frutto` → `title:melo OR title:pero OR title:susin* OR title:cilieg*`
- ...e così via per tutti i 20 handle

### 2. Creazione collezioni manuali su Shopify
Per ogni handle creo una `Collection` di tipo **manual (custom collection)** via Admin GraphQL `collectionCreate`, impostando:
- `title` leggibile (es. "Rose profumate")
- `handle` identico a quello usato dal mega menu
- `descriptionHtml` breve coerente con il tono del brand
- `published: true` sul canale Online Store

Poi associo i prodotti trovati al passo 1 con `collectionAddProducts`.

Se per una collezione non trovo prodotti coerenti (es. `bulbi`), la creo comunque vuota — sarà popolata dal cliente.

### 3. Esecuzione
Faccio tutto in un'unica edge function `setup-collections` (già scaffoldata) che:
1. Per ogni handle, esegue search → crea collezione → aggiunge prodotti
2. Restituisce un report con: collezioni create, prodotti aggiunti per ognuna, eventuali errori
3. È idempotente: se una collezione con quell'handle esiste già, la aggiorna invece di duplicarla

Lancio la function via curl e ti mostro il report.

### 4. QA
- Apro 4-5 voci del mega menu in preview e verifico che `/collections/:handle` mostri i prodotti
- Verifico stato vuoto su collezioni come `bulbi`
- Confermo che il cliente possa modificare i prodotti dall'admin Shopify (Collezioni → seleziona → Prodotti)

## Note
- Le collezioni sono **manuali**, non smart: il tuo cliente avrà pieno controllo
- La pagina `/collections/:handle` è già pronta lato frontend (creata nello step precedente)
- Tutto reversibile dall'admin Shopify
