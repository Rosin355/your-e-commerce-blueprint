/* Uso locale dalla radice del repository. Solo navigazione pubblica in lettura. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const draft = JSON.parse(fs.readFileSync('infra/seo/redirect-candidates.json'));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const rule of draft.rules) {
      const page = await browser.newPage();
      await page.route('**/*', route => {
        const req = route.request();
        const allowed = ['GET', 'HEAD', 'OPTIONS'].includes(req.method()) ||
          (req.method() === 'POST' && /\/graphql\.json$/.test(new URL(req.url()).pathname) &&
           !/mutation/i.test(req.postData() || ''));
        return allowed && !/analytics|collect\?|facebook\.com|google-analytics/.test(req.url())
          ? route.continue() : route.abort();
      });
      let result = { woo: rule.wooId, target: rule.newUrl, pass: false };
      try {
        const response = await page.goto(rule.newUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => {
          return [...document.querySelectorAll('script[type="application/ld+json"]')].some(s => /"Product"/.test(s.textContent));
        }, undefined, {timeout: 12000});
        const data = await page.evaluate(() => ({
          canonical: document.querySelector('link[rel="canonical"]')?.href,
          h1: document.querySelector('h1')?.textContent.trim(),
          products: [...document.querySelectorAll('script[type="application/ld+json"]')]
            .flatMap(s => {const d = JSON.parse(s.textContent); return d['@graph'] || [d];})
            .filter(d => d['@type'] === 'Product').map(d => d.name),
          robots: document.querySelector('meta[name="robots"]')?.content || ''
        }));
        const title = JSON.parse(fs.readFileSync(process.argv[2]))[rule.shopifyGid];
        result = { ...result, ...data, status: response.status(), final: page.url(),
          pass: response.status() === 200 && !response.request().redirectedFrom() &&
            page.url() === rule.newUrl && data.canonical === rule.newUrl &&
            data.h1 === title && data.products.includes(title) && !/noindex/i.test(data.robots) };
      } catch (error) { result.error = error.name; }
      finally { await page.close(); }
      results.push(result);
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(results, null, 2));
  if (!results.every(r => r.pass)) process.exitCode = 1;
})().catch(() => { process.exitCode = 1; });
