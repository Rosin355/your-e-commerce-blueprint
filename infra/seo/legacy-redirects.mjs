/** HTTP redirect preparation only. No provider binding, DNS change or automatic deployment. */
const hosts = new Set(['onlinegarden.it', 'www.onlinegarden.it']);
const legacyPath = /^\/prodotto\/(?:[a-z0-9-]+\/)+$/;
const destinationPath = /^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function redirectResponse(request, manifest) {
  if (manifest?.enabled !== true || typeof manifest.approvalReference !== 'string' || !manifest.approvalReference.trim()) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol) || !hosts.has(url.hostname) || url.port || !legacyPath.test(url.pathname)) return null;
  // No action/cart parameters, arbitrary parameters or variant-to-product guesses.
  if ([...url.searchParams.keys()].some(key => key !== 'attribute_dimensioni' && !/^utm_(source|medium|campaign|term|content)$/.test(key))) return null;
  if (!Array.isArray(manifest.rules)) return null;
  const matches = manifest.rules.filter(rule => rule?.oldPath === url.pathname);
  if (matches.length !== 1) return null;
  const rule = matches[0];
  if (rule.reviewApproved !== true || rule.confidence !== 'HIGH' || rule.qaStatus !== 'PASS' || rule.destinationStatus !== 200) return null;
  let target;
  try { target = new URL(rule.newUrl); } catch { return null; }
  if (target.username || target.password || target.origin !== 'https://onlinegarden.it' || !destinationPath.test(target.pathname) || target.search || target.hash) return null;
  for (const [key, value] of url.searchParams) if (key.startsWith('utm_')) target.searchParams.append(key, value);
  return new Response(null, { status: 301, headers: { Location: target.href, 'Cache-Control': 'no-store' } });
}

/** Adapter for an existing, owner-controlled HTTP edge. Other requests use its origin. */
export function createHandler(manifest, originFetch = fetch) {
  return { fetch(request) { return redirectResponse(request, manifest) ?? originFetch(request); } };
}
