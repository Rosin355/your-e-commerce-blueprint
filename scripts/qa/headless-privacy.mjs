// Opt-in QA with the built storefront, real Shopify banner and guest checkout. No payment step.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from 'playwright';

const [engine = 'chromium', form = 'desktop'] = process.argv.slice(2);
assert.ok(['chromium', 'webkit'].includes(engine) && ['desktop', 'mobile'].includes(form));
const driver = engine === 'chromium' ? chromium : webkit;
const device = engine === 'chromium' ? devices['Pixel 7'] : devices['iPhone 15'];
const browser = await driver.launch();
const context = await browser.newContext({
  ...(form === 'mobile' ? device : { viewport: { width: 1365, height: 900 } }),
  locale: 'it-IT',
  serviceWorkers: 'block',
});
const origin = 'https://onlinegarden.it';
const pdp = origin + '/products/bulbo-di-dalia-purple-queen-confezione-da-1-tubero';
const dist = path.resolve('dist');
const metrics = {};
const checkouts = [];
const diagnosticHosts = {};
const unexpected = [];
const hostedDiagnostics = {};
function recordHostedDiagnostic(request, url) {
  // Keep only vendor schema/metric names. Cart URLs, event payloads and identifiers stay in the browser.
  const labels = new Set();
  function collect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, field] of Object.entries(value)) {
      if (
        ['schema_id', 'schemaId', 'metricName', 'event_name'].includes(key) &&
        typeof field === 'string' &&
        /^[a-z][a-z0-9_.:/-]{1,80}$/i.test(field)
      )
        labels.add(field);
      else if (typeof field === 'object') collect(field);
    }
    if (value.key === 'service.name' && /^[a-z][a-z0-9_.-]{1,60}$/i.test(value.value?.stringValue ?? ''))
      labels.add(value.value.stringValue);
  }
  try {
    collect(JSON.parse(request.postData() ?? 'null'));
  } catch {
    /* Some endpoints use a binary envelope. */
  }
  const path = /^\/(?:v1\/[a-z_]+|[a-z/_-]*produce_batch)\/?$/.test(url.pathname)
    ? url.pathname
    : '(altro percorso)';
  const key = [phase, url.hostname, path, [...labels].sort().join(',')].join(' ');
  hostedDiagnostics[key] = (hostedDiagnostics[key] ?? 0) + 1;
}

const seenHosts = new Set();
let phase = 'prima_visita';
let cartConsent;
const flags = () => window.Shopify?.customerPrivacy?.currentVisitorConsent();
const sdk = () => window.Shopify?.customerPrivacy?.getRegion();
function classify(u, request) {
  if (u.hostname === 'onlinegarden.it' && u.pathname.includes('/__l5e/trackevents'))
    return 'lovable_events';
  if (u.hostname === 'cdn.shopify.com' && u.pathname.includes('privacy-banner')) return 'banner';
  if (u.pathname.endsWith('/graphql.json')) {
    const body = request.postData() ?? '';
    if (body.includes('consentManagement')) return 'privacy_api';
    return 'storefront_api';
  }
  if (
    /analytics|monorail|opentelemetry|otlp/i.test(u.hostname) ||
    /\/(?:collect|pixels?|telemetry|trackevents|produce)(?:[/.]|$)/i.test(u.pathname)
  ) {
    const hostCounts = (diagnosticHosts[phase] ??= {});
    hostCounts[u.hostname] = (hostCounts[u.hostname] ?? 0) + 1;
    return 'misurazione_o_diagnostica';
  }
  return 'altre_risorse';
}
context.on('request', (req) => {
  const u = new URL(req.url());
  const key = classify(u, req);
  seenHosts.add(u.hostname);
  const storefront =
    !req.isNavigationRequest() &&
    req
      .frame()
      .page()
      .url()
      .startsWith(origin + '/');
  if (storefront && (key === 'misurazione_o_diagnostica' || key === 'lovable_events'))
    unexpected.push({ phase, host: u.hostname, kind: key });
  if (!storefront && key === 'misurazione_o_diagnostica') recordHostedDiagnostic(req, u);
  const bucket = (metrics[phase] ??= {});
  bucket[key] = (bucket[key] ?? 0) + 1;
  if (req.postData()?.includes('mutation cartCreate'))
    cartConsent = JSON.parse(req.postData()).variables.visitorConsent;
});
await context.route(origin + '/**', async (route) => {
  const req = route.request(),
    u = new URL(req.url());
  if (req.isNavigationRequest()) return route.fulfill({ path: path.join(dist, 'index.html') });
  if (u.pathname.startsWith('/assets/')) {
    const file = path.resolve(dist, '.' + u.pathname);
    if (file.startsWith(dist + path.sep) && fs.existsSync(file)) return route.fulfill({ path: file });
  }
  return route.continue();
});
let page = await context.newPage();
const purposes = ['analytics', 'marketing', 'preferences'];
function expectedFlags(choice) {
  return Object.fromEntries(
    purposes.map((key) => [key, choice === 'granulare' ? (key === 'marketing' ? 'no' : 'yes') : choice]),
  );
}
async function state(expected) {
  await page.waitForFunction(
    (expected) => {
      const f = window.Shopify?.customerPrivacy?.currentVisitorConsent();
      return f && Object.entries(expected).every(([key, value]) => f[key] === value);
    },
    expectedFlags(expected),
    { timeout: 20000 },
  );
  const region = await page.evaluate(sdk);
  assert.match(region, /^IT/);
  return region;
}
async function prefs(selector) {
  await page.getByRole('button', { name: 'Preferenze cookie', exact: true }).click();
  await page.locator(selector).click();
}
async function checkout(expected) {
  phase = 'checkout_' + expected;
  await page.goto(pdp, { waitUntil: 'domcontentloaded' });
  await state(expected);
  await page
    .getByRole('button', { name: /aggiungi al carrello/i })
    .first()
    .click();
  const pay = page.getByRole('button', { name: /procedi al checkout/i });
  if (!(await pay.isVisible()))
    await page
      .getByRole('button', { name: /^carrello,/i })
      .first()
      .click();
  cartConsent = undefined;
  await pay.click();
  await page.waitForURL((u) => u.pathname.includes('/checkouts/'), { waitUntil: 'domcontentloaded' });
  await page
    .getByText(/Purple Queen/i)
    .first()
    .waitFor({ state: 'attached' });
  await page.waitForTimeout(4000);
  const host = new URL(page.url()).hostname;
  assert.equal(host, 'ecom-blueprint-gen-6ud1s.myshopify.com');
  // Read only the purpose flags from Shopify's server-rendered v3 consent, never log the token.
  const received = await page.evaluate(() => {
    const raw = JSON.parse(document.querySelector('meta[name="serialized-trackingConsent"]').content);
    if (typeof raw !== 'string' || raw[0] !== '3') return null;
    const codes = raw.slice(1).split(/[._]/)[0];
    return Object.fromEntries(
      [
        ['analytics', 'a'],
        ['marketing', 'm'],
        ['preferences', 'p'],
      ].map(([key, code]) => [
        key,
        codes.includes(code.toUpperCase()) ? 'yes' : codes.includes(code) ? 'no' : '',
      ]),
    );
  });
  for (const [key, value] of Object.entries(expectedFlags(expected))) {
    assert.equal(received?.[key], value, 'Stato restituito dal checkout: ' + key);
    assert.equal(cartConsent?.[key], value === '' ? undefined : value === 'yes');
  }
  checkouts.push({ expected, received, host });
}
try {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Declina', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Gestisci le preferenze', exact: true }).count(), 1);
  const region = await state('');
  await page.waitForTimeout(7000);
  assert.ok(Object.values(await page.evaluate(flags)).every((v) => v === ''));
  await page.getByRole('button', { name: 'Gestisci le preferenze', exact: true }).click();
  await page.locator('#shopify-pc__prefs__header-close').click();
  await state('');
  await checkout('');
  phase = 'rifiuto';
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  if (form === 'mobile') {
    phase = 'accetta_dal_banner';
    await page.getByRole('button', { name: 'Accetta', exact: true }).click();
    await state('yes');
    phase = 'rifiuto';
    await prefs('#shopify-pc__prefs__header-decline');
  } else {
    await page.getByRole('button', { name: 'Declina', exact: true }).click();
  }
  await state('no');
  phase = 'ricarica_rifiuto';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await state('no');
  assert.equal(await page.getByRole('button', { name: 'Declina', exact: true }).isVisible(), false);
  phase = 'accettazione';
  await prefs('#shopify-pc__prefs__header-accept');
  await state('yes');
  phase = 'nuova_visita';
  const old = page;
  page = await context.newPage();
  await old.close();
  await page.goto(origin + '/contatti', { waitUntil: 'domcontentloaded' });
  await state('yes');
  await checkout('yes');
  phase = 'granulare';
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await state('yes');
  await page.getByRole('button', { name: 'Preferenze cookie', exact: true }).click();
  // Native checkboxes are visually styled, activate their associated visible labels.
  await page.locator('label[for="shopify-pc__prefs__marketing-input"]').click();
  await page.locator('#shopify-pc__prefs__header-save').click();
  await page.waitForFunction(() => {
    const c = window.Shopify.customerPrivacy.currentVisitorConsent();
    return c.marketing === 'no' && c.analytics === 'yes' && c.preferences === 'yes';
  });
  await checkout('granulare');
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await state('granulare');
  const prior = page;
  page = await context.newPage();
  await page.goto(pdp, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.Shopify?.customerPrivacy?.currentVisitorConsent().analytics === 'yes',
  );
  const olderProductTab = page;
  page = prior;
  phase = 'revoca';
  await prefs('#shopify-pc__prefs__header-decline');
  await state('no');
  phase = 'ricarica_revoca';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await state('no');
  await olderProductTab.waitForFunction(
    () => window.Shopify?.customerPrivacy?.currentVisitorConsent().analytics === 'no',
  );
  await page.close();
  page = olderProductTab;
  await checkout('no');
  phase = 'account';
  await page.goto(origin + '/account', { waitUntil: 'commit' });
  await page.waitForURL((u) => u.hostname === 'shopify.com', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=email]').waitFor({ state: 'visible' });
  phase = 'admin';
  await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=password]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-storefront-privacy]').count(), 0);
  assert.equal(await page.locator('#shopify-pc__banner:visible').count(), 0);
  console.log(
    JSON.stringify({
      engine,
      form,
      region,
      checkouts,
      requests: metrics,
      diagnosticHosts,
      unexpected,
      hostedDiagnostics,
      hosts: [...seenHosts],
    }),
  );
  if (unexpected.length) process.exitCode = 1;
} catch (error) {
  console.error(
    JSON.stringify({
      engine,
      form,
      phase,
      checkouts,
      requests: metrics,
      diagnosticHosts,
      reason: String(error.message)
        .split('\n')[0]
        .replace(/https?:\/\/\S+/g, '[URL]'),
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
