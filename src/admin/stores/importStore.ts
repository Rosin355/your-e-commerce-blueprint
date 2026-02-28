import { create } from 'zustand';
import type { ImportStatus, ImportType, ParsedCsv, ValidationResult, ImportResult, ImportRecordResult } from '../types/import';

interface ImportState {
  importType: ImportType;
  status: ImportStatus;
  csv: ParsedCsv | null;
  fileName: string;
  validation: ValidationResult | null;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  logs: string[];
  result: ImportResult | null;
  recordResults: ImportRecordResult[];

  setImportType: (t: ImportType) => void;
  setStatus: (s: ImportStatus) => void;
  setCsv: (csv: ParsedCsv, fileName: string) => void;
  setValidation: (v: ValidationResult) => void;
  setProgress: (processed: number, total: number) => void;
  addLog: (msg: string) => void;
  addRecordResult: (r: ImportRecordResult) => void;
  setResult: (r: ImportResult) => void;
  reset: () => void;
}

const initialState = {
  importType: 'customers' as ImportType,
  status: 'idle' as ImportStatus,
  csv: null as ParsedCsv | null,
  fileName: '',
  validation: null as ValidationResult | null,
  progress: 0,
  totalRecords: 0,
  processedRecords: 0,
  logs: [] as string[],
  result: null as ImportResult | null,
  recordResults: [] as ImportRecordResult[],
};

export const useImportStore = create<ImportState>((set) => ({
  ...initialState,
  setImportType: (importType) => set({ importType }),
  setStatus: (status) => set({ status }),
  setCsv: (csv, fileName) => set({ csv, fileName, validation: null, result: null, logs: [], recordResults: [], progress: 0, processedRecords: 0, totalRecords: csv.rows.length }),
  setValidation: (validation) => set({ validation }),
  setProgress: (processedRecords, totalRecords) => set({ processedRecords, totalRecords, progress: totalRecords > 0 ? Math.round((processedRecords / totalRecords) * 100) : 0 }),
  addLog: (msg) => set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  addRecordResult: (r) => set((s) => ({ recordResults: [...s.recordResults, r] })),
  setResult: (result) => set({ result }),
  reset: () => set(initialState),
}));
