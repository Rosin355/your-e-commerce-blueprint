import { mapCsvBySku, parseShopifyReadyCsv } from "./csv-parser.ts";
import { upsertCsvCatalogRows } from "./product-catalog-repo.ts";
import type {
  CsvProductRow,
  ProductSyncJobRow,
  SyncLogEntry,
  SyncReportState,
} from "./product-sync-types.ts";

const STORAGE_BUCKET = Deno.env.get("SYNC_CSV_BUCKET") || "sync";
const STORAGE_PATH = Deno.env.get("SYNC_CSV_PATH") || "shopify-ready.csv";
const MAX_LOG_ENTRIES = 300;

function nowIso(): string {
  return new Date().toISOString();
}

function appendLog(report: SyncReportState, entry: Omit<SyncLogEntry, "timestamp">): SyncReportState {
  const logs = [...(report.logs || []), { ...entry, timestamp: nowIso() }].slice(-MAX_LOG_ENTRIES);
  return { ...report, logs };
}

function normalizeReport(report: SyncReportState | null | undefined, mode: ProductSyncJobRow["mode"]): SyncReportState {
  return {
    mode,
    cursor: report?.cursor || null,
    hasNextPage: typeof report?.hasNextPage === "boolean" ? report.hasNextPage : true,
    processed: Number(report?.processed || 0),
    updated: Number(report?.updated || 0),
    unchanged: Number(report?.unchanged || 0),
    failed: Number(report?.failed || 0),
    logs: Array.isArray(report?.logs) ? report.logs : [],
    startedAt: report?.startedAt || nowIso(),
    finishedAt: report?.finishedAt,
    integrity: report?.integrity,
  };
}

function getCsvAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const storageToken = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (storageToken) {
    headers.Authorization = `Bearer ${storageToken}`;
  }
  return headers;
}

async function loadCsvRows(): Promise<CsvProductRow[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL mancante");

  const publicStorageUrl = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${STORAGE_PATH}`;
  const response = await fetch(publicStorageUrl, {
    headers: getCsvAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`CSV non disponibile in Storage (${response.status})`);
  }

  const csvText = await response.text();
  return parseShopifyReadyCsv(csvText);
}

export async function verifyCatalogIntegrityCsvOnly(): Promise<SyncReportState["integrity"]> {
  const csvRows = await loadCsvRows();
  const missingInShopify = Array.from(csvBySku.keys());
  const missingInCsv: string[] = [];
  const productsWithoutImages = csvRows
    .filter((row) => !row.imageUrls?.length)
    .map((row) => String(row.title || row.sku));
  const productsWithoutBarcode = csvRows
    .filter((row) => !String(row.barcode || "").trim())
    .map((row) => String(row.title || row.sku));

  return {
    csvSkuCount: csvBySku.size,
    shopifySkuCount: 0,
    missingInShopify,
    missingInCsv,
    productsWithoutImages,
    productsWithoutBarcode,
  };
}

export async function processSyncBatch(job: ProductSyncJobRow): Promise<{
  updatedJob: Partial<ProductSyncJobRow>;
  done: boolean;
}> {
  const report = normalizeReport(job.report_json, job.mode);

  if (job.mode === "integrity") {
    const integrity = await verifyCatalogIntegrityCsvOnly();
    const completedReport = appendLog(
      {
        ...report,
        hasNextPage: false,
        finishedAt: nowIso(),
        integrity,
      },
      { level: "info", message: "Verifica integrità completata" },
    );

    return {
      updatedJob: {
        status: "completed",
        report_json: completedReport,
      },
      done: true,
    };
  }

  const csvRows = await loadCsvRows();
  const csvBySku = mapCsvBySku(csvRows);
  let nextReport = report;

  if (!report.csvSnapshot?.persistedAt) {
    const persistedCount = await upsertCsvCatalogRows(csvRows, STORAGE_PATH);
    nextReport = appendLog(nextReport, {
      level: "info",
      message: `Catalogo CSV salvato su DB (${persistedCount} righe)`,
    });
    nextReport = {
      ...nextReport,
      csvSnapshot: {
        persistedAt: nowIso(),
        persistedCount,
        sourceFile: STORAGE_PATH,
      },
    };
  }
  nextReport = appendLog(nextReport, {
    level: "info",
    message: "Modalità DB-only: nessuna sincronizzazione Shopify eseguita",
  });

  const totalRows = csvRows.length;
  const mergedReport: SyncReportState = {
    ...nextReport,
    cursor: null,
    hasNextPage: false,
    processed: totalRows,
    updated: totalRows,
    unchanged: 0,
    failed: 0,
    finishedAt: nowIso(),
  };

  return {
    updatedJob: {
      status: "completed",
      total_products: totalRows,
      updated_products: totalRows,
      unchanged_products: 0,
      failed_products: 0,
      report_json: mergedReport,
    },
    done: true,
  };
}
