/** Errore applicativo puro: separato dal client Supabase per poter testare i conflitti senza rete. */
export class AdminApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
