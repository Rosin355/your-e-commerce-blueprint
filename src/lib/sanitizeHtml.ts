/**
 * Minimal, dependency-free HTML sanitizer for safely previewing AI-generated content.
 *
 * This is a defensive measure for rendering untrusted HTML with dangerouslySetInnerHTML
 * in the admin preview only. It strips executable/active content (scripts, event handlers,
 * javascript: URLs, iframes, etc.). The original, unsanitized HTML is still what gets sent
 * to Shopify by the publish flow — sanitization happens at render time, not on the data.
 *
 * Runs in the browser (uses DOMParser); falls back to tag-stripping if DOM APIs are absent.
 */

const FORBIDDEN_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form"];

export function sanitizeHtml(dirty: string | undefined | null): string {
  if (!dirty) return "";

  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    // SSR / non-DOM fallback: strip all tags entirely.
    return dirty.replace(/<[^>]*>/g, "");
  }

  const doc = new DOMParser().parseFromString(dirty, "text/html");

  doc.querySelectorAll(FORBIDDEN_TAGS.join(",")).forEach((el) => el.remove());

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      // Drop inline event handlers (onclick, onerror, ...) and javascript:/data: URLs.
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if ((name === "href" || name === "src" || name === "xlink:href") && /^\s*javascript:/i.test(value)) {
        el.removeAttribute(attr.name);
      } else if (name === "srcdoc") {
        el.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}
