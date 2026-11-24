import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { ProductDraft, DraftVariant } from '../../../supabase/functions/_shared/admin-operational-core';
import { addFormat, type DraftErrors } from '../lib/newDraft';

interface Props {
  sku: string;
  currency?: string;
  variants: DraftVariant[];
  onChange: (variants: ProductDraft['variants']) => void;
  errors?: DraftErrors;
}

export default function VariantEditor({ sku, currency = 'EUR', variants, onChange, errors = {} }: Props) {
  const [compare, setCompare] = useState(variants.some(v => v.compareAtPrice));
  const multiple = variants.length > 1;
  function remove(index: number) {
    const left = variants.filter((_, i) => index !== i);
    onChange(left.length === 1 ? [{ ...left[0], sku }] : left);
  }
  function input(i: number, key: keyof DraftVariant, label: string, required = false) {
    const id = `variant-${i}-${key}`;
    return <label className="block">{label} {i + 1}{required && ' (obbligatorio)'}
      <Input aria-label={label + ' ' + (i + 1)} id={id} required={required} aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? id + '-error' : undefined}
        inputMode={key === 'price' || key === 'compareAtPrice' ? 'decimal' : 'text'}
        value={variants[i][key] ?? ''} onChange={e => onChange(variants.map((v, j) => j === i ? { ...v, [key]: e.target.value } : v))} />
      {errors[id] && <span id={id + '-error'} className="text-sm text-destructive">{errors[id]}</span>}
    </label>;
  }
  return <section className="space-y-3" aria-label="Formati e prezzi">
    <h2 className="font-semibold">Formato e prezzo ({currency})</h2>
    {variants.map((_, i) => <div key={i} className="space-y-2 rounded border p-3">
      <div className="grid gap-3 sm:grid-cols-2">{input(i, 'option', 'Nome formato', true)}{input(i, 'price', 'Prezzo di vendita', true)}</div>
      {compare && input(i, 'compareAtPrice', 'Prezzo precedente')}
      {multiple && <details><summary className="cursor-pointer">Codice avanzato del formato {i + 1}</summary>{input(i, 'sku', 'SKU formato')}</details>}
      {multiple && <Button type="button" variant="outline" onClick={() => {
        if (window.confirm('Rimuovere questo formato dalla bozza?')) remove(i);
      }}>Rimuovi formato {i + 1}</Button>}
    </div>)}
    <Button type="button" variant="outline" disabled={variants.length >= 50} onClick={() => onChange(addFormat(variants, sku))}>Aggiungi formato</Button>
    <details><summary className="cursor-pointer">Prezzo precedente (facoltativo)</summary>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={compare} onChange={e => {
        if (!e.target.checked && variants.some(v => v.compareAtPrice) && !window.confirm('Rimuovere i prezzi precedenti inseriti?')) return;
        setCompare(e.target.checked);
        if (!e.target.checked) onChange(variants.map(v => ({ ...v, compareAtPrice: null })));
      }} />Inserisci un prezzo precedente reale</label>
    </details>
  </section>;
}
