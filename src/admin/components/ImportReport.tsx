import React from 'react';
import type { ImportResult } from '../types/import';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';

interface ImportReportProps {
  result: ImportResult;
}

function downloadJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(records: ImportResult['records'], filename: string) {
  const header = 'row,status,identifier,message\n';
  const rows = records.map(r => `${r.row},"${r.status}","${r.identifier}","${r.message || ''}"`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportReport({ result }: ImportReportProps) {
  const errorRecords = result.records.filter(r => r.status === 'error');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">Report Import</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">✅ Creati: {result.created}</Badge>
        <Badge variant="secondary">🔄 Aggiornati: {result.updated}</Badge>
        <Badge variant="outline">⏭️ Saltati: {result.skipped}</Badge>
        {result.errors > 0 && <Badge variant="destructive">❌ Errori: {result.errors}</Badge>}
      </div>
      {errorRecords.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadJson(errorRecords, 'errori-import.json')}>
            <Download className="h-4 w-4" /> JSON Errori
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadCsv(errorRecords, 'errori-import.csv')}>
            <Download className="h-4 w-4" /> CSV Errori
          </Button>
        </div>
      )}
    </div>
  );
}
