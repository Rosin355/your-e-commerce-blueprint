const hosts = new Set(['onlinegarden.it', 'www.onlinegarden.it']);
const legacyPath = /^\/prodotto\/(?:[a-z0-9-]+\/)+$/;
const destinationUrl = /^https:\/\/onlinegarden\.it\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const utm = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']);

function respond(request, findTarget) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol) || !hosts.has(url.host) || !legacyPath.test(url.pathname)) return null;
  const destination = findTarget(url.pathname);
  if (!destination) return null;
  const target = new URL(destination);
  for (const [key, value] of url.searchParams) {
    if (key === 'attribute_dimensioni') continue;
    if (!utm.has(key)) return null;
    target.searchParams.append(key, value);
  }
  return new Response(null, {status: 301, headers: {Location: target.href, 'Cache-Control': 'no-store'}});
}

// Il manifest storico conserva i gate originali per i chiamanti della PR #82.
export function redirectResponse(request, manifest) {
  if (manifest?.enabled !== true || !manifest.approvalReference?.trim?.() || !Array.isArray(manifest.rules)) return null;
  return respond(request, path => {
    const matches = manifest.rules.filter(rule => rule?.oldPath === path);
    if (matches.length !== 1) return null;
    const [rule] = matches;
    return rule.reviewApproved === true && rule.confidence === 'HIGH' && rule.qaStatus === 'PASS' &&
      rule.destinationStatus === 200 && destinationUrl.test(rule.newUrl) ? rule.newUrl : null;
  });
}

export function createHandler(manifest, originFetch = fetch) {
  return {fetch(request) { return redirectResponse(request, manifest) ?? originFetch(request); }};
}

// Le coppie vengono validate una sola volta all'avvio dell'isolato.
export function createMappedHandler(pairs, originFetch = fetch) {
  const lookup = new Map();
  for (const [path, target] of pairs) {
    if (!legacyPath.test(path) || !destinationUrl.test(target) || lookup.has(path)) throw Error('Mapping non valido o duplicato: ' + path);
    lookup.set(path, target);
  }
  return {fetch(request) { return respond(request, path => lookup.get(path)) ?? originFetch(request); }};
}
