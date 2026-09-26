import type { JobStatus, SyncReportState } from "./product-sync-types.ts";

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function expectedProductSyncSourcePath(jobId: string): string | null {
  return JOB_ID_PATTERN.test(jobId) ? `product-sync/jobs/${jobId}/input.csv` : null;
}

export type SourceRegistrationResult =
  | { ok: true; report: SyncReportState; unchanged: boolean }
  | { ok: false; status: 400 | 409; error: string };

export function registerProductSyncSource(
  jobId: string,
  status: JobStatus,
  report: SyncReportState,
  sourcePath: string,
): SourceRegistrationResult {
  if (status !== "pending") {
    return { ok: false, status: 409, error: "Il job non accetta più una sorgente" };
  }
  const expected = expectedProductSyncSourcePath(jobId);
  if (!expected || sourcePath !== expected) {
    return { ok: false, status: 400, error: "Percorso sorgente non consentito" };
  }
  if (report.source_state === "registered" && report.source_path === sourcePath) {
    return { ok: true, report, unchanged: true };
  }
  return {
    ok: true,
    unchanged: false,
    report: { ...report, source_state: "registered", source_path: sourcePath },
  };
}

export function smartSyncBatchIsBlocked(report: SyncReportState | null | undefined): boolean {
  return report?.source_state === "awaiting_upload";
}
