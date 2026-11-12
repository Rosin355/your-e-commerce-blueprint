import type { AdminContext } from './adminApi';

export function canRecoverDraftAfterError(
  context: Pick<AdminContext, 'writesEnabled' | 'roles' | 'ordinaryCatalog'> | undefined,
  hasSavedOperation: boolean,
  sendFailed: boolean,
): boolean {
  return Boolean(
    hasSavedOperation && sendFailed && context?.writesEnabled &&
      (context.roles.some((role) => role === 'admin' || role === 'tech_admin') || (context.ordinaryCatalog === true && context.roles.includes('editor'))),
  );
}
