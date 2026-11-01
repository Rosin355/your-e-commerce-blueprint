// Reproducible production QA. Synthetic catalog; every external request intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mockStorefront, makeProduct } from './fixtures.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { default: AxeBuilder } = await import(process.env.AXE_PLAYWRIGHT_MODULE || '@axe-core/playwright');
const before = process.env.FOOTER_BEFORE_URL || 'http://127.0.0.1:8085';
const after = process.env.UX_BASE_URL || 'http://127.0.0.1:8086';
const output = process.env.UX_OUTPUT_DIR || 'docs/legal/evidence/2026-11-01';
const policy = 'https://checkout.shopify.com/102600966484/policies/56892817748.html?locale=it';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { synthetic: true, browser: browser.version(), checks: [], pageErrors: [], comparisons: [], accessibility: [], screenshots: [] };
await fs.mkdir(output, { recursive: true });
const hash = data => createHash('sha256').update(data).digest('hex');
// Chromium can dither/resample photographs slightly between browser contexts.
// Compare decoded pixels, ignoring channel deltas <= 24/255; at most 0.1% may differ.
function comparePixels(name, width) {
  return JSON.parse(execFileSync('python3', ['-c', `
import json,sys
from PIL import Image,ImageChops,ImageStat
a=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB')
assert a.size==b.size
d=ImageChops.difference(a,b)
n=sum(1 for p in d.get_flattened_data() if max(p)>24)
print(json.dumps({'significantPixels':n,'totalPixels':a.width*a.height,'ratio':n/(a.width*a.height),'meanChannelDelta':ImageStat.Stat(d).mean}))
`, `${output}/before-${name}-${width}.png`, `${output}/after-${name}-${width}.png`], { encoding: 'utf8' }));
}
async function setup(width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const state = { products: Array.from({ length: 14 }, (_, i) => makeProduct(i + 1)) };
  state.products.forEach(p => { p.node.images.edges[0].node.url = '/assets/rose-C0q0uc8j.jpg'; });
  await mockStorefront(context, state);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => report.pageErrors.push(e.message));
  return { context, page, state };
}
async function ready(page) {
  await page.locator('footer').waitFor();
  await page.locator('[role="status"]').waitFor({ state: 'hidden' }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i => {
      const box = i.getBoundingClientRect();
      return box.top < innerHeight && box.bottom > 0;
    }).map(i => i.decode().catch(() => {})));
  });
  await page.addStyleTag({ content: '*,*::before,*::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' });
}
async function screenshot(page, name, locator) {
  const path = `${output}/${name}.png`;
  const data = locator ? await locator.screenshot({ path, animations: 'disabled' }) : await page.screenshot({ path, animations: 'disabled' });
  report.screenshots.push(`${name}.png`);
  return hash(data);
}
async function check(name, run) {
  try { await run(); report.checks.push({ name, status: 'PASS' }); console.log('PASS', name); }
  catch (e) { report.checks.push({ name, status: 'FAIL', error: e.stack }); console.error('FAIL', name, e.message); }
}
try {
  await check('Homepage, catalogo e PDP: confronto grafico sopra il footer, desktop/mobile', async () => {
    for (const width of [1440, 390]) {
      for (const [name, path] of [['home', '/'], ['catalog', '/collections/all'], ['pdp', '/products/pianta-test-1']]) {
        const hashes = {};
        for (const [version, base] of [['before', before], ['after', after]]) {
          const { context, page } = await setup(width);
          await page.goto(base + path);
          await ready(page);
          await page.locator('main h1').waitFor();
          if (name !== 'home') await page.locator('main img').first().waitFor();
          await page.evaluate(() => scrollTo(0, 0));
          hashes[version] = await screenshot(page, `${version}-${name}-${width}`);
          if (name === 'home') await screenshot(page, `${version}-footer-${width}`, page.locator('footer'));
          await context.close();
        }
        const pixels = comparePixels(name, width);
        report.comparisons.push({ name, width, ...hashes, byteIdentical: hashes.before === hashes.after, ...pixels });
        assert.ok(pixels.ratio <= 0.001, `${name} ${width}: significant visual change ${pixels.ratio}`);
      }
    }
  });
  await check('Footer: link reali, nessun placeholder, nessun form/social non verificato', async () => {
    const { context, page, state } = await setup(1440);
    try {
      await page.goto(after); await ready(page);
      const footer = page.locator('footer');
      assert.doesNotMatch(await footer.innerText(), /preparazione|newsletter|seguici|FAQ|Chi siamo|Ispirazioni/i);
      assert.equal(await footer.locator('form,input,button').count(), 0);
      assert.equal(await footer.getByRole('link', { name: 'Privacy Policy', exact: true }).getAttribute('href'), policy);
      assert.equal(await footer.getByRole('link', { name: 'info@onlinegarden.it', exact: true }).getAttribute('href'), 'mailto:info@onlinegarden.it');
      const paths = await footer.locator('a[href^="/"]').evaluateAll(links => links.map(a => a.getAttribute('href')));
      assert.equal(paths.length, 6);
      for (const path of paths) {
        await page.goto(after + path); await ready(page);
        assert.doesNotMatch(await page.locator('main').innerText(), /Pagina non trovata|Collezione non trovata/);
      }
      assert.equal(state.checkoutCalls, 0);
    } finally { await context.close(); }
  });
  await check('Contatti: sei larghezze, mailto, focus all’ingresso, menu mobile e accessibilità', async () => {
    const { context, page } = await setup();
    try {
      for (const width of [320, 375, 390, 430, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(after + '/contatti'); await ready(page);
        assert.equal(await page.title(), 'Contatti e assistenza | Online Garden');
        assert.equal(await page.locator('main a[href="mailto:info@onlinegarden.it"]').count(), 1);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index,follow');
        assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('/contatti'));
        if (width === 390 || width === 1440) {
          await screenshot(page, `after-contacts-${width}`);
          const result = await new AxeBuilder({ page }).include('main').include('footer').analyze();
          report.accessibility.push({ width, violations: result.violations });
          assert.equal(result.violations.length, 0, JSON.stringify(result.violations));
        }
        if (width < 768) {
          const menu = page.getByRole('button', { name: 'Apri menu', exact: true });
          await menu.click();
          const dialog = page.getByRole('dialog'); await dialog.waitFor();
          assert.ok(await dialog.getByRole('link', { name: 'Rose', exact: true }).count());
          await dialog.focus();
          await page.waitForTimeout(150); // Radix installs the focus trap/Escape listener after mounting.
          await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
          assert.equal(await menu.evaluate(el => el === document.activeElement), true);
        }
      }
    } finally { await context.close(); }
  });
  await check('Footer: ordine di tabulazione, focus visibile e navigazione Contatti con Invio', async () => {
    const { context, page } = await setup();
    try {
      await page.goto(after); await ready(page);
      const links = page.locator('footer a');
      await links.first().focus();
      const visited = [];
      for (let i = 0; i < await links.count(); i++) {
        if (i) await page.keyboard.press('Tab');
        const active = await page.evaluate(() => ({ href: document.activeElement.getAttribute('href'), outline: getComputedStyle(document.activeElement).outlineWidth, style: getComputedStyle(document.activeElement).outlineStyle }));
        assert.equal(active.href, await links.nth(i).getAttribute('href'));
        assert.equal(active.outline, '2px'); assert.equal(active.style, 'solid');
        visited.push(active.href);
      }
      report.keyboardDestinations = visited;
      await page.locator('footer').getByRole('link', { name: 'Contatti e assistenza', exact: true }).focus();
      await page.keyboard.press('Enter'); await page.waitForURL('**/contatti');
      await page.waitForFunction(() => document.activeElement.id === 'main-content');
    } finally { await context.close(); }
  });
  await check('Policy assenti: nessun link/footer/testo pubblicato, fallback noindex; ripristino SEO', async () => {
    const { context, page } = await setup();
    try {
      for (const path of ['/cookie-policy', '/termini-e-condizioni', '/spedizioni', '/resi-e-rimborsi']) {
        await page.goto(after + path);
        await page.getByRole('heading', { name: '404', exact: true }).waitFor();
        assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,follow');
        await page.getByRole('link', { name: 'Torna alla homepage' }).click(); await ready(page);
        assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index,follow');
        assert.equal(await page.locator(`footer a[href="${path}"]`).count(), 0);
      }
    } finally { await context.close(); }
  });
  await check('Alias privacy: reindirizzamento esatto alla fonte Shopify senza copia HTML', async () => {
    const { context, page, state } = await setup();
    try {
      await page.goto(after + '/privacy-policy');
      await page.waitForURL(policy);
      assert.equal(page.url(), policy);
      assert.equal(state.checkoutCalls, 0);
    } finally { await context.close(); }
  });
} finally {
  await browser.close();
  report.summary = { passed: report.checks.filter(c => c.status === 'PASS').length, failed: report.checks.filter(c => c.status === 'FAIL').length };
  await fs.writeFile(`${output}/footer-legal-browser-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed || report.pageErrors.length) process.exitCode = 1;
}
