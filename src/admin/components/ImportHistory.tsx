import React from 'react';
import { getImportLogs } from '../lib/auditLog';
import { Badge } from '@/components/ui/badge';

export default function ImportHistory() {
  const logs = getImportLogs();

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna importazione precedente.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Storico Importazioni</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="border rounded-md p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{log.fileName}</span>
              <Badge variant="outline">{log.importType}</Badge>
            </div>
            <div className="text-muted-foreground text-xs">
              {new Date(log.timestamp).toLocaleString('it-IT')} — {log.adminEmail}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">✅ {log.result.created}</Badge>
              <Badge variant="secondary">🔄 {log.result.updated}</Badge>
              {log.result.errors > 0 && <Badge variant="destructive">❌ {log.result.errors}</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
