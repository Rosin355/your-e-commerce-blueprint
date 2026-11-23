import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutVisitorConsent, initializeStorefrontPrivacy } from '../../src/lib/shopify-privacy';

test('il checkout trasferisce soltanto le scelte esplicite Shopify, compresa la revoca', async () => {
  let choice: Record<string, string> = {};
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      Shopify: { customerPrivacy: { currentVisitorConsent: () => choice } },
    },
  });
  try {
    assert.equal(await checkoutVisitorConsent(), undefined);
    choice = { analytics: '', marketing: '', preferences: '', sale_of_data: '' };
    assert.equal(await checkoutVisitorConsent(), undefined);
    choice = { analytics: 'yes', marketing: 'no', sale_of_data: 'no' };
    assert.deepEqual(await checkoutVisitorConsent(), {
      analytics: true,
      marketing: false,
      saleOfData: false,
    });
    choice = { analytics: 'no', marketing: 'no', preferences: 'no' };
    assert.deepEqual(await checkoutVisitorConsent(), {
      analytics: false,
      marketing: false,
      preferences: false,
    });
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('carica il banner una sola volta, riprova dopo un errore e lascia a Shopify il rilevamento regione', async () => {
  const original = new Map(
    ['window', 'document', 'BroadcastChannel'].map(
      (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
    ),
  );
  type Script = { onerror(): void; onload(): void; remove(): void; src: string };
  const scripts: Script[] = [];
  const browser = { location: { hostname: 'www.onlinegarden.it' }, fetch, setTimeout, clearTimeout };
  const stub = (key: string, value: unknown) =>
    Object.defineProperty(globalThis, key, { configurable: true, value });
  // A host may provide a read-only transport. Consent initialization must never replace it.
  Object.defineProperty(browser, 'fetch', { value: fetch, writable: false });
  stub('window', browser);
  stub('BroadcastChannel', undefined);
  stub('document', {
    createElement: () => ({ remove() {} }),
    head: { append: (s: Script) => scripts.push(s) },
  });
  try {
    const unavailable = initializeStorefrontPrivacy();
    assert.equal(unavailable, initializeStorefrontPrivacy());
    assert.equal(scripts.length, 1);
    scripts[0].onerror();
    await assert.rejects(unavailable, /non disponibile/);
    assert.equal(await checkoutVisitorConsent(), undefined);
    const retry = initializeStorefrontPrivacy();
    assert.equal(scripts.length, 2);
    assert.equal(new URL(scripts[1].src).hostname, 'cdn.shopify.com');
    const loads: Record<string, string>[] = [];
    const banner = {
      loadBanner: async (options: Record<string, string>) => {
        loads.push(options);
      },
    };
    Object.assign(browser, { privacyBanner: banner });
    scripts[1].onload();
    await retry;
    await initializeStorefrontPrivacy();
    assert.strictEqual(browser.fetch, fetch);
    assert.equal(loads.length, 1);
    assert.equal(loads[0].storefrontRootDomain, 'onlinegarden.it');
    assert.equal(loads[0].locale, 'it');
    assert.ok(!('country' in loads[0]));
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
