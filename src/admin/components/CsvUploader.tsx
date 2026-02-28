import React, { useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';

interface CsvUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function CsvUploader({ onFileSelected, disabled }: CsvUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'} ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Trascina qui il file CSV oppure clicca per selezionarlo
        </p>
        <Button variant="outline" size="sm" className="gap-2" type="button">
          <FileText className="h-4 w-4" />
          Seleziona CSV
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </CardContent>
    </Card>
  );
}
