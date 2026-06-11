import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, PlayCircle, X } from "lucide-react";
import type { EnrichmentRunItemRow, EnrichmentRunRow } from "../lib/aiWriterEngine";

interface Props {
  run: EnrichmentRunRow;
  items: EnrichmentRunItemRow[];
  loadedProductSkus: Set<string>;
  onResume: (pendingSkus: string[]) => void;
  onClose: () => void;
  closing?: boolean;
}

export default function ResumeRunBanner({ run, items, loadedProductSkus, onResume, onClose, closing }: Props) {
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const pending = items.filter((i) => i.status === "pending");
  const pendingSkus = pending.map((p) => p.sku);
  const pendingInLoaded = pendingSkus.filter((s) => loadedProductSkus.has(s));
  const created = new Date(run.created_at).toLocaleString();

  return (
    <Card className="border-amber-300 bg-amber-50/60">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-amber-900">
              Run di arricchimento aperto del {created}
            </p>
            <p className="mt-1 text-xs text-amber-900/80">
              <strong>{done}</strong> completati · <strong>{failed}</strong> falliti ·{" "}
              <strong>{pending.length}</strong> ancora da fare su {run.total}. Stato salvato sul
              database: sopravvive al refresh.
            </p>
            {loadedProductSkus.size > 0 && pendingInLoaded.length !== pending.length && (
              <p className="mt-1 text-[11px] text-amber-900/70">
                {pendingInLoaded.length} dei {pending.length} SKU pending sono presenti nella lista
                caricata sotto. Carica più prodotti per riprenderli tutti.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => onResume(pendingSkus)}
            disabled={pending.length === 0}
          >
            <PlayCircle className="h-4 w-4" />
            Mostrami i {pending.length} da fare
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={onClose} disabled={closing}>
            <X className="h-4 w-4" />
            Chiudi run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
