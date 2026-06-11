import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getMetafieldConfig,
  getMetafieldConfigLive,
  listShopifyMetafieldDefinitions,
  type MetafieldConfig,
  type MetafieldDefinitionDiff,
} from "../lib/aiWriterEngine";

export default function MetafieldsConfigPanel() {
  const [config, setConfig] = useState<MetafieldConfig | null>(null);
  const [diff, setDiff] = useState<MetafieldDefinitionDiff[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [aligning, setAligning] = useState(false);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      try {
        const cfg = await getMetafieldConfig();
        if (!abort) setConfig(cfg);
      } catch (e) {
        if (!abort) toast.error("Impossibile caricare la configurazione metafield");
        console.error(e);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  async function verifyAgainstShopify() {
    setVerifying(true);
    setDiff(null);
    try {
      const res = await listShopifyMetafieldDefinitions();
      setDiff(res.diff);
      const missing = res.diff.filter((d) => d.status === "missing").length;
      const mismatch = res.diff.filter((d) => d.status === "type_mismatch").length;
      if (missing === 0 && mismatch === 0) {
        toast.success("Tutti i metafield sono definiti correttamente su Shopify");
      } else {
        toast.warning(`Differenze rilevate: ${missing} mancanti, ${mismatch} tipo non coincidente`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore verifica Shopify");
    } finally {
      setVerifying(false);
    }
  }

  async function loadEffectiveConfig() {
    setAligning(true);
    try {
      const cfg = await getMetafieldConfigLive();
      setConfig(cfg);
      setDiff(
        cfg.fields.map((f) => ({
          ...f,
          status: !f.liveType ? "missing" as const : f.liveType === f.type ? "ok" as const : "type_mismatch" as const,
          liveType: f.liveType,
        })),
      );
      toast.success("Tipi effettivi Shopify caricati: verranno usati alla prossima pubblicazione");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore caricamento tipi effettivi Shopify");
    } finally {
      setAligning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metafields Shopify — mapping</CardTitle>
        <CardDescription>
          Namespace e key dei {config?.fields.length ?? "—"} metafield <code>custom.*</code> inviati a Shopify
          durante la pubblicazione AI. Retry massimo (default): <strong>{config?.maxRetries ?? 3}</strong>{" "}
          (override via env <code>SHOPIFY_METAFIELDS_MAX_RETRIES</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Confronta la mappatura locale con le definizioni metafield presenti nel tuo store Shopify per
            verificare che namespace, key e tipo coincidano.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={verifyAgainstShopify} disabled={verifying || aligning} size="sm" className="gap-2">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Verifica su Shopify
            </Button>
            {diff?.some((d) => d.status === "type_mismatch") && (
              <Button onClick={loadEffectiveConfig} disabled={aligning || verifying} size="sm" variant="outline" className="gap-2">
                {aligning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Allinea automaticamente la mappa locale ai tipi Shopify
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Full key</th>
                  <th className="py-2 pr-3 font-medium">Tipo atteso</th>
                  <th className="py-2 pr-3 font-medium">Tipo su Shopify</th>
                  <th className="py-2 pr-3 font-medium">Tipo effettivo usato</th>
                  <th className="py-2 pr-3 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {(config?.fields ?? []).map((f) => {
                  const d = diff?.find((x) => x.fullKey === f.fullKey);
                  const status = d?.status;
                  return (
                    <tr key={f.fullKey} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono">{f.fullKey}</td>
                      <td className="py-2 pr-3 font-mono text-muted-foreground">{f.type}</td>
                      <td className="py-2 pr-3 font-mono text-muted-foreground">
                        {d?.liveType ?? (diff ? "—" : "(non verificato)")}
                      </td>
                      <td className="py-2 pr-3 font-mono text-muted-foreground">
                        {f.effectiveType ?? d?.liveType ?? f.type}
                      </td>
                      <td className="py-2 pr-3">
                        {!diff ? (
                          <Badge variant="outline">in attesa</Badge>
                        ) : status === "ok" ? (
                          <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </Badge>
                        ) : status === "missing" ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Mancante
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" /> Tipo diverso
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Per modificare il mapping (namespace/key/type) edita la costante <code>METAFIELD_TYPES</code> in{" "}
          <code>supabase/functions/shopify-admin-proxy/index.ts</code> e ridistribuisci la funzione.
        </p>
      </CardContent>
    </Card>
  );
}
