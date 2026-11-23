import { SHOPIFY_STORE_PERMANENT_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } from './shopify';
import { withoutPrivacyDiagnostics } from './shopify-privacy-diagnostics';

type Choice = 'yes' | 'no' | '';
type VisitorChoices = Partial<Record<'analytics' | 'marketing' | 'preferences' | 'sale_of_data', Choice>>;
type BannerOptions = {
  storefrontAccessToken: string;
  storefrontRootDomain: string;
  checkoutRootDomain: string;
  locale: string;
};
type Banner = {
  loadBanner(options: BannerOptions): Promise<void>;
  showPreferences(options: BannerOptions): Promise<void>;
};
declare global {
  interface Window {
    privacyBanner?: Banner;
    Shopify?: { customerPrivacy?: { currentVisitorConsent(): VisitorChoices } };
  }
}

const scriptUrl = 'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';
const loadTimeout = 8000;
let configured = false;
let loading: Promise<Banner> | undefined;

function options(): BannerOptions {
  const host = window.location.hostname;
  return {
    storefrontAccessToken: SHOPIFY_STOREFRONT_TOKEN,
    storefrontRootDomain: host === 'www.onlinegarden.it' ? 'onlinegarden.it' : host,
    checkoutRootDomain: SHOPIFY_STORE_PERMANENT_DOMAIN,
    locale: 'it',
    // Shopify resolves the visitor region. The language of the store isn't a location.
  };
}

function bannerScript(): Promise<Banner> {
  if (window.privacyBanner) return Promise.resolve(window.privacyBanner);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error('Servizio preferenze cookie non disponibile'));
    };
    const timer = window.setTimeout(fail, loadTimeout);
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.privacyBanner) resolve(window.privacyBanner);
      else fail();
    };
    script.onerror = fail;
    script.src = scriptUrl;
    script.async = true;
    document.head.append(script);
  });
}

// The SDK caches consent in each document. Another open storefront tab must
// re-read Shopify's persisted choice before it can start a checkout with stale flags.
function synchronizeOpenStorefronts() {
  if (typeof BroadcastChannel === 'undefined') return;
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel('shopify-storefront-consent');
  } catch {
    return; // Browser storage restrictions can disable cross-tab messaging.
  }
  const snapshot = () => {
    const choice = window.Shopify?.customerPrivacy?.currentVisitorConsent();
    if (!choice) return '';
    return [choice.analytics, choice.marketing, choice.preferences, choice.sale_of_data].join('|');
  };
  document.addEventListener('visitorConsentCollected', () => {
    const current = snapshot();
    if (/yes|no/.test(current)) channel.postMessage(current);
  });
  channel.onmessage = (event) => {
    const current = snapshot();
    if (current && event.data !== current && document.querySelector('[data-storefront-privacy]')) {
      window.location.reload();
    }
  };
}

function withTimeout<T>(operation: Promise<T>, timeout: number): Promise<T> {
  let timer: number;
  const deadline = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error('Servizio preferenze cookie non disponibile')),
      timeout,
    );
  });
  return Promise.race([operation, deadline]).finally(() => window.clearTimeout(timer));
}

export function initializeStorefrontPrivacy() {
  if (!configured) {
    window.fetch = withoutPrivacyDiagnostics(window.fetch.bind(window));
    synchronizeOpenStorefronts();
    configured = true;
  }
  loading ??= bannerScript()
    .then(async (banner) => {
      await withTimeout(banner.loadBanner(options()), loadTimeout);
      return banner;
    })
    .catch((error) => {
      loading = undefined;
      throw error;
    });
  return loading;
}

export async function openCookiePreferences() {
  const banner = await initializeStorefrontPrivacy();
  await withTimeout(banner.showPreferences(options()), loadTimeout);
  // The SDK can finish loading before its asynchronous banner configuration has rendered.
  const visible = () =>
    Boolean(document.getElementById('shopify-pc__prefs__dialog')?.getClientRects().length);
  if (visible()) return;
  await new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (!visible()) return;
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    });
    const timer = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error('Preferenze non disponibili'));
    }, loadTimeout);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
}

// Forward only choices the visitor actually made. Region-level defaults are not consent.
export async function checkoutVisitorConsent() {
  if (typeof window === 'undefined') return;
  try {
    if (loading) {
      // A stalled Shopify configuration request must not hold the cart indefinitely.
      await withTimeout(loading, 1500).catch(() => undefined);
    }
    const choice = window.Shopify?.customerPrivacy?.currentVisitorConsent();
    if (!choice) return;
    const consent: Partial<Record<'analytics' | 'marketing' | 'preferences' | 'saleOfData', boolean>> = {};
    for (const key of ['analytics', 'marketing', 'preferences', 'sale_of_data'] as const) {
      if (choice[key] === 'yes' || choice[key] === 'no') {
        consent[key === 'sale_of_data' ? 'saleOfData' : key] = choice[key] === 'yes';
      }
    }
    if (Object.keys(consent).length) return consent;
  } catch {
    // Keep the guest checkout available if the privacy provider cannot be reached.
  }
}
