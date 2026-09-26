export type SmartSyncMode = "sync" | "ai_content" | "ai_images" | "integrity";

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildProductSyncStoragePath(jobId: string): string {
  if (!JOB_ID_PATTERN.test(jobId)) throw new Error("Identificativo job non valido");
  return `product-sync/jobs/${jobId}/input.csv`;
}

export interface SmartSyncPreparation<TJob> {
  jobId: string;
  storagePath: string;
  job: TJob;
}

export interface SmartSyncDependencies<TFile, TJob> {
  start: (mode: SmartSyncMode, adminEmail: string) => Promise<{ job_id: string }>;
  upload: (file: TFile, jobId: string) => Promise<string>;
  register: (jobId: string, sourcePath: string, adminEmail: string) => Promise<{ job: TJob }>;
}

/**
 * Security-critical ordering for Smart Sync. A rejected upload aborts the
 * promise before source registration and before the caller can send batches.
 */
export async function prepareSmartSyncCsv<TFile, TJob>(
  file: TFile,
  mode: SmartSyncMode,
  adminEmail: string,
  dependencies: SmartSyncDependencies<TFile, TJob>,
): Promise<SmartSyncPreparation<TJob>> {
  const started = await dependencies.start(mode, adminEmail);
  const storagePath = await dependencies.upload(file, started.job_id);
  const registered = await dependencies.register(started.job_id, storagePath, adminEmail);
  return { jobId: started.job_id, storagePath, job: registered.job };
}
