import { useEffect } from "react";
import { PRIVACY_POLICY } from "@/config/legal";
import { useStorefrontSeo } from "@/hooks/useStorefrontSeo";

/** Legacy/bookmarked local URL: redirect to the current policy at its official source.
 * No remote HTML rendering, iframe, cached copy, or independently versioned text.
 */
const PrivacyPolicy = () => {
  useStorefrontSeo({
    title: "Privacy Policy | Online Garden",
    description: "Consulta la Privacy Policy di Online Garden su Shopify.",
    path: PRIVACY_POLICY.path,
    noindex: true,
  });

  useEffect(() => {
    window.location.replace(PRIVACY_POLICY.href);
  }, []);

  return (
    <main id="main-content" className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">Consulta l’informativa sul sito ufficiale di Shopify.</p>
      <a href={PRIVACY_POLICY.href} className="mt-4 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
        Leggi la Privacy Policy
      </a>
    </main>
  );
};

export default PrivacyPolicy;
