// GET pubblici e GraphQL di lettura. La creazione carrello e la navigazione al checkout sono intercettate nel browser.
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const output = process.argv[2];
if (!output || fs.existsSync(output)) throw Error('Indicare una ricevuta nuova');
const origin = 'https://onlinegarden.it';
const pilot = '/prodotto/rose/rosa-jasmina-rampicante/';
const checkout = 'https://checkout.invalid/checkout/seo-fixture';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const ctx = await browser.newContext({serviceWorkers:'block'});
  let checkoutRequests = 0, checkoutDocuments = 0;
  const rows = [];
  await ctx.route('**/*', async route => {
    const req = route.request();
    if (req.url().startsWith(checkout)) {
      checkoutDocuments++;
      return route.fulfill({contentType:'text/html',body:'<h1>Checkout di prova</h1>'});
    }
    if (req.method()==='POST' && new URL(req.url()).pathname.endsWith('/graphql.json')) {
      const query = req.postDataJSON()?.query || '';
      if (/\bmutation\b/i.test(query)) {
        if (!/\bcartCreate\b/.test(query)) return route.abort();
        checkoutRequests++;
        return route.fulfill({json:{data:{cartCreate:{cart:{id:'fixture',checkoutUrl:checkout},userErrors:[]}}}});
      }
      if (query) return route.continue();
    }
    if (!['GET','HEAD','OPTIONS'].includes(req.method())) return route.abort();
    return route.continue();
  });
  async function test(name, action) {
    try {rows.push({name,pass:true,...await action()});}
    catch(e){rows.push({name,pass:false,error:e.name});}
  }
  try {
    const page = await ctx.newPage();
    for (const [path,selector] of [['/','h1'],['/collections/all','a[href^="/products/"]'],['/products/rosa-jasmina-rampicante','h1'],['/auth','input[type=email]']]) {
      await test('Pagina '+path,async()=>{
        const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
        await page.locator(selector).first().waitFor({timeout:14000});
        assert.equal(response.status(),200);
        if(path==='/auth'){
          await page.waitForURL(u=>u.hostname==='shopify.com' && /^\/authentication\/[^/]+\/login/.test(u.pathname));
          return {http:response.status(),login_host:'shopify.com',campo_email:true};
        }
        assert.equal(page.url(),origin+path);
        const text=(await page.locator('h1').first().innerText({timeout:5000})).trim();
        assert.ok(text && !/404|pagina non trovata/i.test(text));
        return {http:response.status(),h1:text};
      });
    }
    for (const start of ['http://onlinegarden.it/','https://www.onlinegarden.it/','http://www.onlinegarden.it/']) {
      await test(start,async()=>{
        const res=await page.goto(start,{waitUntil:'domcontentloaded'}); assert.equal(page.url(),origin+'/');assert.equal(res.status(),200);
        return {final:page.url(),http:res.status()};
      });
    }
    await test('Carrello vuoto',async()=>{
      await page.getByRole('button',{name:/carrello, 0 articoli/i}).first().click({timeout:8000});
      await page.getByText('Il tuo carrello è vuoto',{exact:true}).first().waitFor();
      return {cart:'vuoto'};
    });
    await test('Checkout con carrello e risposta Shopify sintetici',async()=>{
      const price={amount:'10.00',currencyCode:'EUR'},variantId='gid://shopify/ProductVariant/1';
      const item={product:{node:{title:'Fiore di prova',handle:'fixture',variants:{edges:[{node:{id:variantId,availableForSale:true}}]},images:{edges:[]}}},
        variantId,variantTitle:'Prova',price,quantity:1,selectedOptions:[]};
      await page.evaluate(item=>localStorage.setItem('shopify-cart',JSON.stringify({version:0,state:{items:[item]}})),item);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:/carrello, 1 articoli/i}).first().click({timeout:8000});
      await page.getByRole('button',{name:/procedi al checkout/i}).click();
      await page.waitForURL(checkout+'?channel=online_store',{timeout:10000});
      assert.equal(checkoutRequests,1);assert.equal(checkoutDocuments,1);
      return {cartCreate_intercettata:1,checkout_intercettato:1};
    });
    for(const path of [pilot+'?qa_non_riconosciuto=1','/prodotto/controllo-inesistente-301/']){
      await test('Passaggio origine '+path,async()=>{
        const res=await ctx.request.get(origin+path,{maxRedirects:0});
        assert.ok([200,404,410].includes(res.status()));assert.ok(!res.headers().location);
        return {http:res.status(),location:''};
      });
    }
  } finally {await browser.close();}
  const result={utc:new Date().toISOString(),rows};
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result));
  if(rows.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
