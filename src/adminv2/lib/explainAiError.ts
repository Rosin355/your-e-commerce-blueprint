import { AdminApiError } from './AdminApiError';

function explainError(error: unknown) {
  if (!(error instanceof AdminApiError)) return 'Impossibile preparare la proposta. I fatti inseriti sono conservati. Puoi riprovare.';
  switch (error.code) {
    case 'VALIDATION_ERROR': return 'Il servizio non ha convalidato la richiesta. I fatti inseriti sono conservati. Puoi riprovare oppure compilare la descrizione a mano.';
    case 'FORBIDDEN': return 'Il tuo account non è autorizzato a usare l’AI su questo campo. Puoi continuare a mano.';
    case 'RATE_LIMITED': case 'AI_NOT_CONFIGURED': case 'AI_PROVIDER_ERROR': case 'AI_TIMEOUT':
    case 'INVALID_CONFIRMED_FACTS': case 'INVALID_MODEL_PROPOSAL': case 'INVALID_FIELD_VALUE': case 'AI_CONNECTION_ERROR':
    case 'MALFORMED_AI_OUTPUT': case 'AI_NOT_ALLOWED': case 'WRITES_DISABLED': case 'UNAUTHENTICATED':
      return error.message;
    default: return 'Impossibile completare la proposta. I fatti inseriti sono conservati.';
  }
}

export function explainAiRequestError(error: unknown) {
  const reference = error instanceof AdminApiError ? error.details?.requestId : null;
  return explainError(error) + (typeof reference === 'string' && /^[0-9a-f-]{36}$/i.test(reference) ? ' Riferimento ' + reference : '');
}
