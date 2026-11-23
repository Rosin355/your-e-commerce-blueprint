// The hosted Customer Privacy SDK sends these optional fetches independently of
// the storefront's analytics integrations. Its consent GraphQL endpoint is separate.
const events = 'https://monorail-edge.shopifysvc.com/v1/produce';
const metrics = 'https://otlp-http-production.shopifysvc.com/v1/metrics';

export function withoutPrivacyDiagnostics(original: typeof fetch): typeof fetch {
  return (input, init) => {
    if (
      (input === events || input === metrics) &&
      init?.method === 'POST' &&
      typeof init.body === 'string'
    ) {
      try {
        const payload = JSON.parse(init.body);
        const isConsentEvent =
          input === events &&
          typeof payload?.schema_id === 'string' &&
          payload.schema_id.startsWith('customer_privacy_api_events/');
        const batches: unknown = payload?.resourceMetrics;
        const isConsentMetric =
          input === metrics &&
          Array.isArray(batches) &&
          batches.length > 0 &&
          batches.every((batch) =>
            batch?.resource?.attributes?.some(
              (attribute: { key?: string; value?: { stringValue?: string } }) =>
                attribute?.key === 'service.name' &&
                attribute.value?.stringValue === 'consent-tracking-api',
            ),
          );
        if (isConsentEvent || isConsentMetric) return Promise.resolve(new Response(null, { status: 204 }));
      } catch {
        // Let the caller's original fetch handle other payload formats.
      }
    }
    return original(input, init);
  };
}
