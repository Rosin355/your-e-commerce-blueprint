import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminField } from '../lib/adminApi';
import { editorKind, parseFaqValue } from '../lib/fieldValueCodecs';
import FaqEditor from './FaqEditor';

interface FieldEditorProps {
  field: AdminField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export default function FieldEditor({ field, value, onChange, disabled = false }: FieldEditorProps) {
  const kind = editorKind(field);

  if (kind === 'faq') {
    const parsed = parseFaqValue(value);
    if (parsed.kind === 'unsupported') {
      return <p className="text-xs text-destructive">{parsed.reason}</p>;
    }
    return <FaqEditor value={parsed.items} onChange={onChange} disabled={disabled} />;
  }

  if (kind === 'number') {
    return (
      <Input
        type="number"
        value={typeof value === 'number' ? value : ''}
        min={typeof field.validationRules.min === 'number' ? field.validationRules.min : undefined}
        max={typeof field.validationRules.max === 'number' ? field.validationRules.max : undefined}
        step="any"
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          onChange(Number.isNaN(next) ? null : next);
        }}
        aria-label={`Modifica ${field.label}`}
        disabled={disabled}
      />
    );
  }

  if (kind === 'boolean') {
    return (
      <Select
        value={typeof value === 'boolean' ? String(value) : undefined}
        onValueChange={(next) => onChange(next === 'true')}
        disabled={disabled}
      >
        <SelectTrigger aria-label={`Modifica ${field.label}`}>
          <SelectValue placeholder="Seleziona sì o no" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Sì</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (kind === 'string_list') {
    const items = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(event) => onChange(items.map((entry, itemIndex) => itemIndex === index ? event.target.value : entry))}
              aria-label={`${field.label}, elemento ${index + 1}`}
              disabled={disabled}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              aria-label={`Rimuovi elemento ${index + 1}`}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, ''])} disabled={disabled}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Aggiungi elemento
        </Button>
      </div>
    );
  }

  if (kind === 'select') {
    const options = Array.isArray(field.validationRules.enum)
      ? field.validationRules.enum.filter((item): item is string => typeof item === 'string')
      : [];
    if (options.length) {
      return (
        <Select value={typeof value === 'string' ? value : ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger aria-label={`Modifica ${field.label}`}><SelectValue /></SelectTrigger>
          <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
  }

  if (kind === 'unsupported_json') {
    return <p className="text-xs text-destructive">Formato JSON non supportato dall’editor tipizzato.</p>;
  }

  if (kind === 'textarea') {
    return (
      <Textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        aria-label={`Modifica ${field.label}`}
        disabled={disabled}
      />
    );
  }

  return (
    <Input
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      aria-label={`Modifica ${field.label}`}
      disabled={disabled}
    />
  );
}
