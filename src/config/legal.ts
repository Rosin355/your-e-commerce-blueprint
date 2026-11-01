/** Only verified, publishable destinations belong in public navigation.
 * Unavailable policies reserve their paths without publishing a page or draft.
 * Approval/provenance and the activation checklist live in docs/legal/.
 */
type LegalPolicy = {
  path: string;
  label: string;
} & (
  | { publication: "external"; href: string }
  | { publication: "unavailable"; href?: never }
);

export const CONTACT_PATH = "/contatti";
export const CONTACT_EMAIL = "info@onlinegarden.it";
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;

// Shopify Admin read-only verification: 2026-11-01. Keep Shopify as source of truth.
export const PRIVACY_POLICY = {
  path: "/privacy-policy",
  label: "Privacy Policy",
  publication: "external",
  href: "https://checkout.shopify.com/102600966484/policies/56892817748.html?locale=it",
} as const satisfies LegalPolicy;

export const LEGAL_POLICIES = [
  PRIVACY_POLICY,
  { path: "/cookie-policy", label: "Cookie Policy", publication: "unavailable" },
  { path: "/termini-e-condizioni", label: "Termini e condizioni", publication: "unavailable" },
  { path: "/spedizioni", label: "Spedizioni e consegne", publication: "unavailable" },
  { path: "/resi-e-rimborsi", label: "Resi e rimborsi", publication: "unavailable" },
] as const satisfies readonly LegalPolicy[];

export const PUBLIC_LEGAL_LINKS = LEGAL_POLICIES.filter(
  (policy) => policy.publication === "external",
);
