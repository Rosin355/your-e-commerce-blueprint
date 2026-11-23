// Guest QA. Only the storefront's versioned visitor script can be replaced locally.
import assert from 'node:assert/strict';
import { chromium, devices } from '@playwright/test';

const origin = 'https://onlinegarden.it';
const product = '/products/bulbo-di-dalia-purple-queen-confezione-da-1-tubero';
const loader = /^https:\/\/onlinegarden\.it\/__l5e\/events\.[\da-f]+\.js(?:\?.*)?$/;
const collector = '/__l5e/trackevents';
// After the owner disables Visitor Analytics, observe the real site without routing any request.
const liveOff = process.argv.includes('--live-off');

async function probe(browser, contextOptions, mode) {
  const context = await browser.newContext({ ...contextOptions, locale: 'it-IT', serviceWorkers: mode === 'live-off' ? 'allow' : 'block' });
  const page = await context.newPage();
  let phase = 'home';
  const result = {
    mode, collectorRequests: 0, initialRequests: 0, initial202: 0, posts: 0, accepted202: 0,
    loaderRequests: 0, loaderPaths: [], replaced: 0, legacyRequests: 0, otherHostingAssetsOK: 0,
    otherStorefrontPosts: 0,
    checkoutDiagnostics: 0, homepageChoiceControls: 0,
    cartAfterReload: false, checkoutProduct: false, accountForm: false,
  };
  const homePosts = new Set();
  context.on('request', req => {
    const u = new URL(req.url());
    if (u.origin !== origin) return;
    if (loader.test(req.url())) {
      result.loaderRequests++;
      if (!result.loaderPaths.includes(u.pathname)) result.loaderPaths.push(u.pathname);
    }
    if (u.pathname === '/~flock.js') result.legacyRequests++;
    if (u.pathname !== collector && req.method() === 'POST') result.otherStorefrontPosts++;
    if (u.pathname === collector) result.collectorRequests++;
    if (u.pathname === collector && req.method() === 'POST') {
      result.posts++;
      if (phase === 'home') {
        result.initialRequests++;
        homePosts.add(req);
      }
    }
  });
  context.on('response', res => {
    const u = new URL(res.url());
    if (u.origin === origin && u.pathname === collector && res.request().method() === 'POST' && res.status() === 202) {
      result.accepted202++;
      if (homePosts.has(res.request())) result.initial202++;
    }
    if (u.origin === origin && u.pathname.startsWith('/__l5e/') && !loader.test(res.url()) &&
        u.pathname !== collector && res.ok()) result.otherHostingAssetsOK++;
    if (phase === 'checkout' && /(?:^|\.)(?:shopify\.com|shopifysvc\.com)$/.test(u.hostname) &&
        /monorail|produce_batch|otlp|telemetry/i.test(u.hostname + u.pathname)) result.checkoutDiagnostics++;
  });
  // Install the same route in both arms. The collector and every other resource remain reachable.
  if (mode !== 'live-off') {
    await context.route(loader, route => {
      if (mode === 'control') return route.continue();
      result.replaced++;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* isolated QA */' });
    });
  }
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state: 'attached' });
    // Identical observation window, before interacting with the site.
    await page.waitForTimeout(mode === 'live-off' ? 30000 : 7000);
    result.homepageChoiceControls = await page.getByRole('button', {
      name: /^(accetta|declina|rifiuta|consenti|gestisci (?:i cookie|le preferenze)|preferenze cookie)/i,
    }).count();

    if (mode === 'live-off') {
      phase = 'catalog';
      const privacy = page.locator('footer a').filter({ hasText: /privacy/i }).first();
      const footerResponse = await context.request.get(await privacy.getAttribute('href'));
      assert.ok(footerResponse.ok() && /dati personali/i.test(await footerResponse.text()));
      await page.goto(origin + '/collections/all', { waitUntil: 'domcontentloaded' });
      await page.locator('main a[href*="/products/"]').first().waitFor({ state: 'visible' });
      result.catalogAndFooter = true;
    }

    phase = 'cart';
    await page.goto(origin + product, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /aggiungi al carrello/i }).first().click();
    await page.waitForFunction(() => Boolean(localStorage.getItem('shopify-cart')));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^carrello, 1 articol/i }).first().click();
    const drawer = page.getByRole('dialog');
    await drawer.getByText(/Purple Queen/i).first().waitFor({ state: 'visible' });
    result.cartAfterReload = true;

    phase = 'checkout';
    await drawer.getByRole('button', { name: /procedi al checkout/i }).click();
    await page.waitForURL(u => u.pathname.includes('/checkouts/'), { waitUntil: 'domcontentloaded' });
    await page.getByText(/Purple Queen/i).first().waitFor({ state: 'attached' });
    const checkoutPrivacy = page.getByRole('button', { name: /informativa sulla privacy/i }).first();
    await checkoutPrivacy.waitFor({ state: 'attached' });
    if (mode === 'live-off') {
      await checkoutPrivacy.click();
      const policyDialog = page.getByRole('dialog').filter({ hasText: /privacy|dati personali/i }).first();
      await policyDialog.waitFor({ state: 'visible' });
      await policyDialog.getByText(/dati personali/i).first().waitFor({ state: 'visible' });
      result.checkoutPrivacy = true;
    }
    result.checkoutProduct = true;
    await page.waitForTimeout(2000);

    phase = 'account';
    await page.goto(origin + '/account', { waitUntil: 'commit' });
    await page.waitForURL(u => u.hostname === 'shopify.com', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type=email]').first().waitFor({ state: 'visible' });
    result.accountForm = true;
    await page.waitForTimeout(2000);
    if (mode === 'live-off') {
      phase = 'staff';
      await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type=password]').waitFor({ state: 'visible' });
      await page.locator('input[type=email]').waitFor({ state: 'visible' });
      result.staffLogin = true;
    }
    return result;
  } catch (error) {
    // Checkout URLs may contain session identifiers. Do not log them or raw bodies.
    throw new Error(mode + '/' + phase + ': ' + error.name);
  } finally {
    await context.close();
  }
}

for (const [engine, options, modes] of [
  ['chromium-desktop', { viewport: { width: 1280, height: 840 } }, ['control', 'suppressed']],
  ['chromium-mobile', devices['Pixel 7'], ['suppressed', 'control']],
]) {
  const browser = await chromium.launch();
  try {
    for (const mode of liveOff ? ['live-off'] : modes) {
      const r = await probe(browser, options, mode);
      console.log(JSON.stringify({ engine, version: browser.version(), ...r }));
      assert.ok(r.cartAfterReload && r.checkoutProduct && r.accountForm);
      if (mode === 'live-off') {
        assert.equal(r.collectorRequests, 0, 'Visitor Analytics observed on public site');
        assert.ok(r.catalogAndFooter && r.checkoutPrivacy && r.staffLogin);
        continue;
      }
      assert.ok(r.loaderRequests > 0 && r.otherHostingAssetsOK > 0);
      if (mode === 'control') {
        assert.ok(r.initial202 > 0 && r.posts >= r.initial202 && r.replaced === 0, 'Missing positive control');
      } else {
        assert.ok(r.replaced === r.loaderRequests && r.posts === 0, 'Unexpected telemetry or missing suppression');
      }
    }
  } finally {
    await browser.close();
  }
}
