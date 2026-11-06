import type { AdminContext } from './adminApi';

export function canRecoverDraftAfterError(
  context: Pick<AdminContext, 'writesEnabled' | 'roles'> | undefined,
  hasSavedOperation: boolean,
  sendFailed: boolean,
): boolean {
  return Boolean(
    hasSavedOperation && sendFailed && context?.writesEnabled &&
      context.roles.some((role) => role === 'admin' || role === 'tech_admin'),
  );
}
