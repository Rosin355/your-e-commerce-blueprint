import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Play, Download, AlertTriangle, CheckCircle, Loader2, Zap, StopCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface JobData {
  id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  created_rows: number;
  skipped_rows: number;
  warning_count: number;
  error_count: number;
  ai_enriched_count: number;
  fallback_count: number;
  report_json: Record<string, unknown> | null;
  error_message: string | null;
  warnings: Array<{ rowNumber: number; sku: string; title: string; code: string; message: string }>;
  errors: Array<{ rowNumber: number; sku: string; title: string; code: string; message: string }>;
}

interface DryRunResult {
  success: boolean;
  dryRun: boolean;
  report: {
    totalSourceRows: number;
  };
  totalParentRows: number;
  sampleRows: Record<string, string>[];
}

export default function WooPipelinePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [useAi, setUseAi] = useState(true);
  const [limit, setLimit] = useState('');
  const [defaultVendor, setDefaultVendor] = useState('Online Garden');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dry run state
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(false);
  const abortRef = useRef(false);

  const handleFile = useCallback((f: File) => {
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      if (f.size > 50 * 1024 * 1024) {
        setError('File troppo grande (max 50MB)');
        return;
      }
      setFile(f);
      setError(null);
      setDryRunResult(null);
      setJob(null);
      setJobId(null);
    }
  }, []);

  const handleRun = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDryRunResult(null);
    setJob(null);
    setJobId(null);
    abortRef.current = false;

    try {
      const csvText = await file.text();
      const { data, error: fnError } = await supabase.functions.invoke('woo-enrichment-pipeline', {
        body: {
          csvText,
          dryRun,
          useAi,
          limit: limit ? Number(limit) : undefined,
          defaultVendor,
          fileName: file.name,
        },
      });

      if (fnError) {
        setError(fnError.message);
        setLoading(false);
        return;
      }

      if (dryRun) {
        setDryRunResult(data as DryRunResult);
        setLoading(false);
      } else {
        // Async job created
        if (data?.jobId) {
          setJobId(data.jobId);
          startPolling(data.jobId);
        } else {
          setError(data?.error || 'Errore sconosciuto');
          setLoading(false);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
      setLoading(false);
    }
  };

  const startPolling = (id: string) => {
    setPolling(true);
    pollingRef.current = true;
    abortRef.current = false;
    processNextBatch(id);
  };

  const processNextBatch = async (id: string) => {
    if (abortRef.current || !pollingRef.current) {
      setPolling(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('process-woo-job', {
        body: { jobId: id, batchSize: 15 },
      });

      if (fnError) {
        setError(fnError.message);
        setPolling(false);
        setLoading(false);
        return;
      }

      if (data?.job) {
        setJob(data.job as JobData);
      }

      if (data?.done) {
        setPolling(false);
        setLoading(false);
        pollingRef.current = false;
      } else {
        // Wait 1s before next batch
        setTimeout(() => processNextBatch(id), 1000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore batch');
      setPolling(false);
      setLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    pollingRef.current = false;
    setPolling(false);
    setLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
      abortRef.current = true;
    };
  }, []);

  const progressPercent = job && job.total_rows > 0
    ? Math.round((job.processed_rows / job.total_rows) * 100)
    : 0;

  const isComplete = job?.status === 'completed';
  const isFailed = job?.status === 'failed';
  const files = job?.report_json?.files as Record<string, string> | undefined;

  return (
    <div className="space-y-4">
      {/* Upload */}
      <Card
        className={`border-2 border-dashed transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'} ${loading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Trascina qui il CSV WooCommerce oppure clicca per selezionarlo
          </p>
          {file && (
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </Badge>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </CardContent>
      </Card>

      {/* Options */}
      {file && !polling && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opzioni Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="dry-run">Dry Run (solo anteprima)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="use-ai" checked={useAi} onCheckedChange={setUseAi} />
                <Label htmlFor="use-ai">AI Enrichment</Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="limit" className="text-xs text-muted-foreground">Limite righe (vuoto = tutte)</Label>
                <Input id="limit" type="number" min="1" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-28" placeholder="∞" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="vendor" className="text-xs text-muted-foreground">Vendor predefinito</Label>
                <Input id="vendor" value={defaultVendor} onChange={(e) => setDefaultVendor(e.target.value)} className="w-44" />
              </div>
            </div>

            <Button onClick={handleRun} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : dryRun ? <Play className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {loading ? 'Elaborazione...' : dryRun ? 'Esegui Dry Run' : 'Avvia Pipeline'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Errore</span>
            </div>
            <p className="text-sm mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Job Progress */}
      {(polling || job) && !dryRunResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isComplete ? (
                <><CheckCircle className="h-5 w-5 text-primary" /> Pipeline Completata</>
              ) : isFailed ? (
                <><AlertTriangle className="h-5 w-5 text-destructive" /> Pipeline Fallita</>
              ) : (
                <><Loader2 className="h-5 w-5 animate-spin" /> Elaborazione in corso...</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            {job && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progresso: {job.processed_rows} / {job.total_rows} prodotti</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />

                {/* Live counters */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">✅ Creati: {job.created_rows}</Badge>
                  <Badge variant="outline">⏭️ Saltati: {job.skipped_rows}</Badge>
                  {job.warning_count > 0 && <Badge className="bg-accent/20 text-accent-foreground border-accent">⚠️ Warning: {job.warning_count}</Badge>}
                  {job.error_count > 0 && <Badge variant="destructive">❌ Errori: {job.error_count}</Badge>}
                  <Badge variant="secondary">🤖 AI: {job.ai_enriched_count}</Badge>
                  {job.fallback_count > 0 && <Badge variant="outline">🔄 Fallback: {job.fallback_count}</Badge>}
                </div>
              </>
            )}

            {/* Stop button */}
            {polling && (
              <Button variant="outline" size="sm" onClick={handleStop} className="gap-2">
                <StopCircle className="h-4 w-4" /> Ferma Pipeline
              </Button>
            )}

            {/* Failed message */}
            {isFailed && job?.error_message && (
              <p className="text-sm text-destructive">{job.error_message}</p>
            )}

            {/* Download links on complete */}
            {isComplete && files && (
              <div className="flex gap-2 flex-wrap">
                {files.shopifyCsv && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={files.shopifyCsv} download="shopify-draft.csv"><Download className="h-4 w-4" /> CSV Shopify Draft</a>
                  </Button>
                )}
                {files.warnings && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={files.warnings} download="warnings.csv"><Download className="h-4 w-4" /> Warnings</a>
                  </Button>
                )}
                {files.errors && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={files.errors} download="errors.csv"><Download className="h-4 w-4" /> Errori</a>
                  </Button>
                )}
                {files.report && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={files.report} download="report.json"><Download className="h-4 w-4" /> Report JSON</a>
                  </Button>
                )}
              </div>
            )}

            {/* Warnings preview */}
            {isComplete && job?.warnings && job.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">⚠️ Warnings ({job.warnings.length})</p>
                <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-muted/50 p-2 rounded">
                  {job.warnings.slice(0, 50).map((w, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-muted-foreground">riga {w.rowNumber}</span>
                      <Badge variant="outline" className="text-xs py-0">{w.code}</Badge>
                      <span>{w.message}</span>
                      {w.sku && <span className="text-muted-foreground">({w.sku})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors preview */}
            {isComplete && job?.errors && job.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">❌ Errori ({job.errors.length})</p>
                <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-destructive/5 p-2 rounded">
                  {job.errors.slice(0, 50).map((e, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-muted-foreground">riga {e.rowNumber}</span>
                      <Badge variant="destructive" className="text-xs py-0">{e.code}</Badge>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dry Run Result */}
      {dryRunResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Anteprima Dry Run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">📦 Righe sorgente: {dryRunResult.report.totalSourceRows}</Badge>
              <Badge variant="secondary">👤 Prodotti parent: {dryRunResult.totalParentRows}</Badge>
            </div>

            {dryRunResult.sampleRows && dryRunResult.sampleRows.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Anteprima prime {dryRunResult.sampleRows.length} righe</p>
                <div className="overflow-x-auto max-h-60">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        {['Title', 'SKU', 'Price', 'Type', 'Tags', 'Status'].map(h => (
                          <th key={h} className="border border-border px-2 py-1 bg-muted text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunResult.sampleRows.map((row, i) => (
                        <tr key={i}>
                          {['Title', 'SKU', 'Price', 'Type', 'Tags', 'Status'].map(h => (
                            <td key={h} className="border border-border px-2 py-1 max-w-[200px] truncate">{row[h] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
