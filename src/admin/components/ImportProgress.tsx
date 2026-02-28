import React from 'react';
import { Progress } from '@/components/ui/progress';
import { useImportStore } from '../stores/importStore';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ImportProgress() {
  const { progress, processedRecords, totalRecords, logs, status } = useImportStore();

  if (status !== 'dry-run' && status !== 'syncing') return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{status === 'dry-run' ? 'Dry Run' : 'Sync'} in corso...</span>
        <span className="text-muted-foreground">{processedRecords}/{totalRecords} ({progress}%)</span>
      </div>
      <Progress value={progress} />
      <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
        <div className="space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <p key={i}>{log}</p>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
