import React from 'react';
import type { ParsedCsv } from '../types/import';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CsvPreviewProps {
  csv: ParsedCsv;
  maxRows?: number;
}

export default function CsvPreview({ csv, maxRows = 20 }: CsvPreviewProps) {
  const displayRows = csv.rows.slice(0, maxRows);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{csv.headers.length} colonne</Badge>
        <Badge variant="secondary">{csv.rawRowCount} righe totali</Badge>
        {csv.rawRowCount > maxRows && (
          <Badge variant="outline">Mostrando prime {maxRows}</Badge>
        )}
      </div>
      <div className="border rounded-md overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {csv.headers.map((h) => (
                <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{i + 2}</TableCell>
                {csv.headers.map((h) => (
                  <TableCell key={h} className="max-w-[200px] truncate">{row[h] || ''}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
