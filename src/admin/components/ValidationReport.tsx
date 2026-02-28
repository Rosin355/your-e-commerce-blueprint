import React from 'react';
import type { ValidationResult } from '../types/import';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationReportProps {
  validation: ValidationResult;
}

export default function ValidationReport({ validation }: ValidationReportProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {validation.valid ? (
          <><CheckCircle className="h-5 w-5 text-primary" /><span className="font-medium">Validazione superata</span></>
        ) : (
          <><XCircle className="h-5 w-5 text-destructive" /><span className="font-medium">Errori trovati</span></>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">✅ {validation.validRowCount} valide</Badge>
        {validation.invalidRowCount > 0 && <Badge variant="destructive">❌ {validation.invalidRowCount} non valide</Badge>}
      </div>
      {validation.warnings.length > 0 && (
        <div className="space-y-1">
          {validation.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
      {validation.errors.length > 0 && (
        <div className="border rounded-md p-3 max-h-[200px] overflow-auto space-y-1">
          {validation.errors.slice(0, 50).map((e, i) => (
            <p key={i} className="text-sm text-destructive">
              Riga {e.row} – {e.field}: {e.message}
            </p>
          ))}
          {validation.errors.length > 50 && (
            <p className="text-sm text-muted-foreground">...e altri {validation.errors.length - 50} errori</p>
          )}
        </div>
      )}
    </div>
  );
}
