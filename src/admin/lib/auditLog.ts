import type { ImportLogEntry, ImportResult, ImportType } from '../types/import';

const LOG_KEY = 'admin_import_log';
const MAX_ENTRIES = 20;

export function saveImportLog(entry: Omit<ImportLogEntry, 'id'>): void {
  const logs = getImportLogs();
  logs.unshift({ ...entry, id: crypto.randomUUID() });
  if (logs.length > MAX_ENTRIES) logs.length = MAX_ENTRIES;
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

export function getImportLogs(): ImportLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function createLogEntry(
  adminEmail: string,
  fileName: string,
  importType: ImportType,
  result: ImportResult,
): Omit<ImportLogEntry, 'id'> {
  return { timestamp: new Date().toISOString(), adminEmail, fileName, importType, result };
}
