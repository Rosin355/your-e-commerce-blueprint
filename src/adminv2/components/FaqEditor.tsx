import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FaqItem } from '../lib/fieldValueCodecs';

interface FaqEditorProps {
  value: FaqItem[];
  onChange: (value: FaqItem[]) => void;
  disabled?: boolean;
}

export default function FaqEditor({ value, onChange, disabled = false }: FaqEditorProps) {
  const update = (index: number, patch: Partial<FaqItem>) => {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3" aria-label="Editor FAQ strutturate">
      {value.map((item, index) => (
        <fieldset key={index} className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-xs font-medium">FAQ {index + 1}</legend>
          <Input
            value={item.question}
            onChange={(event) => update(index, { question: event.target.value })}
            placeholder="Domanda"
            aria-label={`Domanda FAQ ${index + 1}`}
            disabled={disabled}
          />
          <Textarea
            value={item.answer}
            onChange={(event) => update(index, { answer: event.target.value })}
            placeholder="Risposta"
            aria-label={`Risposta FAQ ${index + 1}`}
            rows={3}
            disabled={disabled}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            disabled={disabled}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Rimuovi FAQ
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...value, { question: '', answer: '' }])}
        disabled={disabled}
      >
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Aggiungi FAQ
      </Button>
    </div>
  );
}
