import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MetafieldsReport as Report } from "../lib/aiWriterEngine";

export function MetafieldsReport({ report }: { report: Report }) {
  const [showDebug, setShowDebug] = useState(false);
  const sent = report.details.filter((d) => d.status === "sent");
  const failed = report.details.filter((d) => d.status === "failed");
  const skipped = report.details.filter((d) => d.status === "skipped");

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          {sent.length} inviati
        </Badge>
        <Badge variant="destructive">{failed.length} falliti</Badge>
        <Badge variant="outline">{skipped.length} vuoti (saltati)</Badge>
        {report.debug && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2 text-[11px]"
            onClick={() => setShowDebug((s) => !s)}
          >
            {showDebug ? "Nascondi" : "Mostra"} debug GraphQL ({report.debug.length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        {report.details.map((d) => (
          <div
            key={`${d.namespace}.${d.key}`}
            className={`flex items-start justify-between gap-2 rounded border px-2 py-1.5 ${
              d.status === "failed"
                ? "border-destructive/50 bg-destructive/5"
                : d.status === "sent"
                  ? "border-green-200 bg-green-50/50"
                  : "border-muted bg-muted/30"
            }`}
          >
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-medium">
                {d.namespace}.{d.key}
              </div>
              {(d.liveTypeUsed || d.type) && (
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  type: {d.liveTypeUsed || d.type}
                  {d.type && d.liveTypeUsed && d.type !== d.liveTypeUsed ? ` (locale: ${d.type})` : ""}
                </div>
              )}
              {d.error && (
                <div className="mt-0.5 text-[10px] text-destructive break-words" title={d.error}>
                  {d.error}
                </div>
              )}
            </div>
            <div className="shrink-0 text-[10px] text-muted-foreground">
              {d.status === "sent" && d.attempts && d.attempts > 1 ? `OK (${d.attempts} tent.)` : d.status}
            </div>
          </div>
        ))}
      </div>

      {showDebug && report.debug && (
        <div className="space-y-2">
          {report.debug.map((entry, i) => (
            <details key={i} className="rounded border bg-background p-2">
              <summary className="cursor-pointer text-[11px] font-medium">
                Chunk {entry.chunkIndex} — attempt {entry.attempt}
                {entry.errorMessage ? ` — ERR: ${entry.errorMessage}` : ""}
              </summary>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Request</div>
                  <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-[10px]">
                    {JSON.stringify(entry.request, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Response</div>
                  <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-2 text-[10px]">
                    {JSON.stringify(entry.response, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
