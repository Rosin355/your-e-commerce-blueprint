import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Play, Download, AlertTriangle, CheckCircle, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PipelineReport {
  processedRows: number;
  createdRows: number;
  skippedRows: number;
  warningCount: number;
  errorCount: number;
  aiEnrichedCount: number;
  fallbackCount: number;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  totalSourceRows: number;
}

interface PipelineWarning {
  rowNumber: number;
  sku: string;
  title: string;
  code: string;
  message: string;
}

interface PipelineResult {
  success: boolean;
  error?: string;
  report?: PipelineReport;
  files?: {
    shopifyCsv: string | null;
    warnings: string | null;
    errors: string | null;
    report: string | null;
  };
  warnings?: PipelineWarning[];
  errors?: PipelineWarning[];
  sampleRows?: Record<string, string>[];
}

export default function WooPipelinePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [useAi, setUseAi] = useState(true);
  const [limit, setLimit] = useState('');
  const [defaultVendor, setDefaultVendor] = useState('Online Garden');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      if (f.size > 10 * 1024 * 1024) {
        setResult({ success: false, error: 'File troppo grande (max 10MB)' });
        return;
      }
      setFile(f);
      setResult(null);
    }
  }, []);

  const handleRun = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const csvText = await file.text();
      const { data, error } = await supabase.functions.invoke('woo-enrichment-pipeline', {
        body: {
          csvText,
          dryRun,
          useAi,
          limit: limit ? Number(limit) : undefined,
          defaultVendor,
          fileName: file.name,
        },
      });

      if (error) {
        setResult({ success: false, error: error.message });
      } else {
        setResult(data as PipelineResult);
      }
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : 'Errore sconosciuto' });
    } finally {
      setLoading(false);
    }
  };

  const [dragOver, setDragOver] = useState(false);

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
      {file && (
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
              {loading ? 'Elaborazione...' : dryRun ? 'Esegui Dry Run' : 'Esegui Pipeline'}
            </Button>

            {loading && <Progress value={undefined} className="h-2" />}
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !result.success && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Errore</span>
            </div>
            <p className="text-sm mt-2">{result.error}</p>
          </CardContent>
        </Card>
      )}

      {result?.success && result.report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Report {result.report.dryRun ? '(Dry Run)' : 'Pipeline'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">📦 Righe sorgente: {result.report.totalSourceRows}</Badge>
              <Badge variant="secondary">✅ Creati: {result.report.createdRows}</Badge>
              <Badge variant="outline">⏭️ Saltati: {result.report.skippedRows}</Badge>
              {result.report.warningCount > 0 && <Badge className="bg-accent/20 text-accent-foreground border-accent">⚠️ Warning: {result.report.warningCount}</Badge>}
              {result.report.errorCount > 0 && <Badge variant="destructive">❌ Errori: {result.report.errorCount}</Badge>}
              <Badge variant="secondary">🤖 AI: {result.report.aiEnrichedCount}</Badge>
              {result.report.fallbackCount > 0 && <Badge variant="outline">🔄 Fallback: {result.report.fallbackCount}</Badge>}
            </div>

            <p className="text-xs text-muted-foreground">
              Tempo: {result.report.startedAt && result.report.finishedAt
                ? `${((new Date(result.report.finishedAt).getTime() - new Date(result.report.startedAt).getTime()) / 1000).toFixed(1)}s`
                : 'n/a'}
            </p>

            {/* Download links */}
            {result.files && (
              <div className="flex gap-2 flex-wrap">
                {result.files.shopifyCsv && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={result.files.shopifyCsv} download="shopify-draft.csv"><Download className="h-4 w-4" /> CSV Shopify Draft</a>
                  </Button>
                )}
                {result.files.warnings && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={result.files.warnings} download="warnings.csv"><Download className="h-4 w-4" /> Warnings</a>
                  </Button>
                )}
                {result.files.errors && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={result.files.errors} download="errors.csv"><Download className="h-4 w-4" /> Errori</a>
                  </Button>
                )}
                {result.files.report && (
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={result.files.report} download="report.json"><Download className="h-4 w-4" /> Report JSON</a>
                  </Button>
                )}
              </div>
            )}

            {/* Warnings preview */}
            {result.warnings && result.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">⚠️ Warnings (primi {result.warnings.length})</p>
                <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-muted/50 p-2 rounded">
                  {result.warnings.map((w, i) => (
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
            {result.errors && result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">❌ Errori (primi {result.errors.length})</p>
                <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-destructive/5 p-2 rounded">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-muted-foreground">riga {e.rowNumber}</span>
                      <Badge variant="destructive" className="text-xs py-0">{e.code}</Badge>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample rows for dry run */}
            {result.sampleRows && result.sampleRows.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Anteprima prime {result.sampleRows.length} righe Shopify</p>
                <div className="overflow-x-auto max-h-60">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        {['Title', 'URL handle', 'Status', 'SKU', 'Price', 'Type', 'Tags', 'SEO title'].map(h => (
                          <th key={h} className="border border-border px-2 py-1 bg-muted text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.sampleRows.map((row, i) => (
                        <tr key={i}>
                          {['Title', 'URL handle', 'Status', 'SKU', 'Price', 'Type', 'Tags', 'SEO title'].map(h => (
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
