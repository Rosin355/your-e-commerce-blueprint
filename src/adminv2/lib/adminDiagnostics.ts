export type AdminDiagnostics = {
  writesEnabled: boolean;
  writeMode: 'canary' | 'full';
  shopifySyncEnabled: boolean;
};

export type AdminDiagnosticStatus = 'READ-ONLY' | 'SCRITTURE ABILITATE' | 'NON VERIFICATO';

export function canViewAdminDiagnostics(roles: unknown): boolean {
  return Array.isArray(roles) &&
    roles.some((role) => role === 'admin' || role === 'tech_admin');
}

/** Accept only the three known flags from a successful, admin-authorized response. */
export function parseAdminDiagnostics(response: unknown): AdminDiagnostics | null {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
  const value = response as Record<string, unknown>;
  if (value.ok !== true || !canViewAdminDiagnostics(value.roles)) return null;
  if (typeof value.writesEnabled !== 'boolean' ||
    typeof value.shopifySyncEnabled !== 'boolean' ||
    (value.writeMode !== 'canary' && value.writeMode !== 'full')) return null;
  return {
    writesEnabled: value.writesEnabled,
    writeMode: value.writeMode,
    shopifySyncEnabled: value.shopifySyncEnabled,
  };
}

export function adminDiagnosticStatus(value: AdminDiagnostics | null): AdminDiagnosticStatus {
  if (!value) return 'NON VERIFICATO';
  return value.writesEnabled || value.shopifySyncEnabled
    ? 'SCRITTURE ABILITATE'
    : 'READ-ONLY';
}
