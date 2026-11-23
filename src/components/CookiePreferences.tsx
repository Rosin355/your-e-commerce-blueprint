import { useEffect, useState } from 'react';
import { initializeStorefrontPrivacy, openCookiePreferences } from '@/lib/shopify-privacy';

export function CookiePreferences() {
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeStorefrontPrivacy().catch(() => {
      if (mounted) setFailed(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function open() {
    setFailed(false);
    setOpening(true);
    try {
      await openCookiePreferences();
    } catch {
      setFailed(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <li data-storefront-privacy>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={opening}
        onClick={open}
        className="inline-flex min-h-6 items-center text-sm text-foreground/90 transition-colors hover:text-primary"
      >
        Preferenze cookie
      </button>
      {failed && (
        <p role="status" className="text-sm">
          Preferenze non disponibili. Riprova dal pulsante.
        </p>
      )}
    </li>
  );
}
