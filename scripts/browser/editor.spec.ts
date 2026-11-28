import {test,expect} from '@playwright/test';
for (const width of [1280,390]) test(`editor, liste, prezzi e AI sintetica a ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
 await page.goto('/scripts/browser/editor.html');
 await expect(page.getByRole('heading',{name:'Fixture tecnica non pubblicata'})).toBeVisible();
 await expect(page.getByText('Solo Admin',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^Modifica (Descrizione estesa|Punti di forza)$/}).focus();
 await expect(page.getByRole('button',{name:/^Modifica (Descrizione estesa|Punti di forza)$/})).toBeFocused();
 await page.keyboard.press('Enter');
 const editor=page.getByRole('textbox',{name:'Descrizione',exact:true});
 await expect(editor.locator('strong')).toHaveText('verificata');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('0');
 await expect(page.getByTestId('stored')).toContainText('<strong>verificata</strong>');
 await page.getByRole('button',{name:/^Modifica (Descrizione estesa|Punti di forza)$/}).click();
 await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toBeEditable();
 await page.getByRole('textbox',{name:'Descrizione',exact:true}).fill('Bozza tecnica modificata');
 await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('1');
 await expect(page.getByRole('status',{name:'Sincronizzazioni'})).toHaveText('0');
 await page.getByRole('button',{name:'Sposta giù elemento 1'}).click();
 await expect(page.getByTestId('list')).toHaveText('Secondo|Primo');
 await page.getByRole('button',{name:'Aggiungi elemento'}).click();
 await page.getByRole('textbox',{name:'Punti di forza, elemento 3'}).fill('Terzo');
 await expect(page.getByTestId('list')).toHaveText('Secondo|Primo|Terzo');
 await page.getByRole('button',{name:'Aggiungi formato',exact:true}).click();
 await page.getByRole('textbox',{name:'Prezzo di vendita 2',exact:true}).fill('12,50');
 await expect(page.getByTestId('variants')).toContainText('12,50');
 await page.getByRole('button',{name:'Migliora il testo con AI'}).click();
 await expect(page.getByText('Proposta sintetica da approvare.')).toBeVisible();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('1');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Applica alla bozza',exact:true}).click();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('2');
 await expect(page.getByRole('status',{name:'Sincronizzazioni'})).toHaveText('0');
 await expect(page.getByTestId('stored')).toContainText('Proposta sintetica');
 await page.getByRole('checkbox',{name:'Simula concorrenza'}).check();
 await page.getByRole('button',{name:/^Modifica (Descrizione estesa|Punti di forza)$/}).click();
 await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toBeEditable();
 await page.getByRole('textbox',{name:'Descrizione',exact:true}).fill('Modifica in conflitto');
 await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();
 await expect(page.getByText('Versione modificata da un altro utente')).toBeVisible();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('2');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();
 await page.getByRole('button',{name:/^Confronta .* con Shopify$/}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Invia aggiornamenti a Shopify',exact:true}).click();
 await expect(page.getByRole('status',{name:'Sincronizzazioni'})).toHaveText('1');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('valore Shopify senza bozza locale: apertura e cancel non scrivono', async ({page})=>{
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('/scripts/browser/editor.html?missing=1');
 await page.getByRole('button',{name:'Modifica Descrizione estesa dal sito'}).click();
 await expect(page.getByRole('textbox',{name:'Descrizione',exact:true}).locator('strong')).toHaveText('verificata');
 await page.getByRole('button',{name:'Annulla',exact:true}).click();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('0');
 await page.getByRole('button',{name:'Modifica Descrizione estesa dal sito'}).click();
 await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toBeEditable();
 await page.getByRole('textbox',{name:'Descrizione',exact:true}).fill('Bozza dal sito verificata');
 await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('1');
});

test('refetch durante la modifica non aggiorna la versione base della bozza', async ({page})=>{
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('/scripts/browser/editor.html');
 await page.getByRole('button',{name:/^Modifica (Descrizione estesa|Punti di forza)$/}).click();
 await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toBeEditable();
 await page.getByRole('textbox',{name:'Descrizione',exact:true}).fill('Bozza locale non salvata');
 await page.getByRole('button',{name:'Simula aggiornamento esterno'}).click();
 await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();
 await expect(page.getByText('Versione modificata da un altro utente')).toBeVisible();
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('0');
 await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toContainText('Bozza locale non salvata');
});

test('AI da fatti confermati: campo vuoto e nuova bozza, proposta/scarto/applica senza salvataggi', async ({page})=>{
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('/scripts/browser/editor.html?missing=1');
 await expect(page.getByRole('status',{name:'Generazioni confermate'})).toHaveText('0');
 let calls=0;
 for (const label of ['Descrizione','Descrizione nuova bozza']) {
 const scope=page.getByRole('region',{name:'Assistenza AI '+label,exact:true});
 await expect(scope.getByRole('button',{name:'Organizza le informazioni con AI'})).toBeDisabled();
 await scope.getByRole('textbox',{name:'Informazioni fattuali '+label,exact:true}).fill('corto');
 await scope.getByRole('checkbox').check();await scope.getByRole('button',{name:'Organizza le informazioni con AI'}).click();await expect(scope.getByRole('alert')).toBeVisible();await expect(page.getByRole('status',{name:'Generazioni confermate'})).toHaveText(String(calls));
 await scope.getByRole('textbox',{name:'Informazioni fattuali '+label,exact:true}).fill('Il fiore ha petali di colore rosso.');
 await expect(scope.getByRole('checkbox')).not.toBeChecked();await scope.getByRole('checkbox').check();
 await scope.getByRole('button',{name:'Organizza le informazioni con AI'}).click();await expect(scope.getByText('Proposta da revisionare')).toBeVisible();calls++;await expect(page.getByRole('status',{name:'Generazioni confermate'})).toHaveText(String(calls));
 await scope.getByRole('button',{name:'Scarta proposta'}).click();await expect(scope.getByText('Proposta da revisionare')).toHaveCount(0);
 await scope.getByRole('button',{name:'Organizza le informazioni con AI'}).click();
 calls++;await expect(page.getByRole('status',{name:'Generazioni confermate'})).toHaveText(String(calls));
 await expect(scope.getByRole('textbox',{name:label,exact:true})).toBeEditable();
 await scope.getByRole('textbox',{name:label,exact:true}).fill('Il fiore ha petali di colore rosso. Revisione operatore.');
 page.once('dialog',d=>d.accept());await scope.getByRole('button',{name:'Applica alla compilazione'}).click();
 if(label==='Descrizione') {await expect(page.getByRole('textbox',{name:'Descrizione',exact:true})).toContainText('Revisione operatore');await page.getByRole('button',{name:'Annulla',exact:true}).click();}
 else {await expect(page.getByTestId('new-draft-ai')).toContainText('Revisione operatore');await expect(page.getByRole('textbox',{name:'Descrizione compilata nuova bozza',exact:true})).toContainText('Revisione operatore');}
 await expect(page.getByRole('status',{name:'Salvataggi'})).toHaveText('0');await expect(page.getByRole('status',{name:'Sincronizzazioni'})).toHaveText('0');
 }
});

test('elenchi: salva non sincronizza, conferma esplicita e definizione non verificata bloccante',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/scripts/browser/editor.html?listSync');
 await expect(page.getByRole('status',{name:'Sync elenco'})).toHaveText('0');
 await page.getByRole('button',{name:/^Modifica (Descrizione estesa|Punti di forza)$/}).click();
 await page.getByRole('button',{name:'Sposta giù elemento 1'}).click();
 await expect(page.getByRole('button',{name:'Salva e aggiorna sul sito',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();
 await expect(page.getByRole('status',{name:'Salvataggi elenco'})).toHaveText('1');
 await expect(page.getByRole('status',{name:'Valore elenco'})).toHaveText('Secondo|Primo');
 await expect(page.getByRole('status',{name:'Sync elenco'})).toHaveText('0');
 await page.getByRole('button',{name:/^Confronta .* con Shopify$/}).click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Invia aggiornamenti a Shopify',exact:true}).click();
 await expect(page.getByRole('status',{name:'Sync elenco'})).toHaveText('0');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Invia aggiornamenti a Shopify',exact:true}).click();
 await expect(page.getByRole('status',{name:'Sync elenco'})).toHaveText('1');
 await page.getByRole('button',{name:'Simula definizione incompatibile'}).click();
 await expect(page.getByRole('button',{name:/^Confronta .* con Shopify$/})).toHaveCount(0);
 await expect(page.getByText('Tipo o definizione Shopify non verificabile: sincronizzazione bloccata.',{exact:true})).toBeVisible();
});

for(const width of [1280,390])test(`PDP Punti di forza condizionale, senza duplicare altri consumer ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/scripts/browser/pdp-benefits.html');
 await page.getByRole('button',{name:'Punti di forza',exact:true}).click();
 await expect(page.getByLabel('Descrizione breve')).toHaveText('Sintesi distinta.');
 await expect(page.getByRole('region',{name:'Descrizione estesa'})).toContainText('Descrizione tecnica sintetica.');
 const benefits=page.locator('[data-state="open"]').filter({has:page.getByRole('button',{name:'Punti di forza',exact:true})}).first();
 await expect(benefits.getByRole('listitem')).toHaveText(['Beneficio & à 🌱','Secondo beneficio']);
 await expect(page.getByText('Voce comune',{exact:true})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Caratteristiche principali',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Cosa lo rende speciale',exact:true})).toBeVisible();
 await expect(page.getByText('Punto speciale',{exact:true})).toHaveCount(1);
 await page.screenshot({path:`/tmp/og-c3-pdp-${width}.png`,fullPage:true,animations:'disabled'});
 for(const mode of ['absent','empty','duplicate']){
  await page.goto('/scripts/browser/pdp-benefits.html?mode='+mode);
  await expect(page.getByRole('button',{name:'Punti di forza',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Caratteristiche principali',exact:true})).toBeVisible();
  await expect(page.getByText('Voce comune',{exact:true})).toHaveCount(1);
 }
});

for (const type of ['json','list.single_line_text_field']) test('PDP: caratteristiche e benefici nei metafield storici '+type, async ({page}) => {
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('/scripts/browser/pdp-benefits.html?mode='+type);
  for (const [section,items] of [['Caratteristiche principali',['Caratteristica esistente','Voce comune']],['Punti di forza',['Beneficio distinto','Secondo beneficio']]] as const) {
    const button=page.getByRole('button',{name:section,exact:true});
    if (await button.getAttribute('aria-expanded')!=='true') await button.click();
    const list=page.locator('[data-state="open"]').filter({has:button}).first().getByRole('listitem');
    await expect(list).toHaveText([...items]);
  }
});
