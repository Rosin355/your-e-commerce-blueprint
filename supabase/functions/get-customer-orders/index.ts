// Retire the former Admin API lookup for all callers, including older storefront bundles.
Deno.serve(() => new Response(null, {
  status: 410,
  headers: { 'Cache-Control': 'no-store' },
}));
