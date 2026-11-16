import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { ProductDraft } from '../../../supabase/functions/_shared/admin-operational-core';
export default function VariantEditor({ sku, variants, onChange }: { sku: string; variants: ProductDraft['variants']; onChange: (variants: ProductDraft['variants']) => void }) {
  const [multiple, setMultiple] = useState(variants.length > 1);
  const [compare, setCompare] = useState(variants.some(v => v.compareAtPrice));
  return <section className="space-y-4"><h2 className="font-semibold">Come vendi questo prodotto?</h2>
    <div className="flex flex-wrap gap-3" role="group" aria-label="Numero di formati"><Button type="button" variant={!multiple ? 'default' : 'outline'} onClick={() => { if (variants.length > 1 && !window.confirm('Rimuovere gli altri formati dalla compilazione?')) return; setMultiple(false); onChange([{ ...variants[0], sku }]); }}>Un solo formato</Button><Button type="button" variant={multiple ? 'default' : 'outline'} onClick={() => { setMultiple(true); if (variants.length === 1 && sku && variants[0].sku === sku) onChange([{ ...variants[0], sku: `${sku}-1` }]); }}>Più formati</Button></div>
    <p className="text-sm">Inserisci soltanto formati reali, ad esempio “Vaso diametro 14 cm” o “Confezione da 5 bulbi”. Gli esempi non vengono inseriti nel prodotto.</p>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={compare} onChange={e => { if (!e.target.checked && variants.some(v => v.compareAtPrice) && !window.confirm('Rimuovere i prezzi precedenti inseriti?')) return; setCompare(e.target.checked); if (!e.target.checked) onChange(variants.map(v => ({ ...v, compareAtPrice: null }))); }} />Inserisci un prezzo precedente reale (facoltativo)</label>
    {variants.map((v, i) => <div className="grid gap-3 rounded border p-3 sm:grid-cols-2" key={i}>
      {(['option', ...(multiple ? ['sku'] : []), 'price', ...(compare ? ['compareAtPrice'] : [])] as ('option'|'sku'|'price'|'compareAtPrice')[]).map(k => <label className="block" key={k}>{({ option: 'Nome formato', sku: 'Codice SKU del formato', price: 'Prezzo di vendita (€)', compareAtPrice: 'Prezzo precedente (€)' })[k]}<Input aria-label={`${k === 'price' ? 'Prezzo di vendita' : k === 'option' ? 'Nome formato' : k === 'sku' ? 'SKU formato' : 'Prezzo precedente'} ${i+1}`} value={v[k] ?? ''} inputMode={k.includes('rice') ? 'decimal' : undefined} onChange={e => onChange(variants.map((x,j) => i===j ? { ...x, [k]: e.target.value } : x))} /></label>)}
      {!multiple && <p className="text-sm">Codice SKU: {sku || 'inserisci il codice prodotto nel primo passaggio'} — condiviso con il prodotto.</p>}
      {multiple && variants.length>1 && <Button type="button" variant="outline" onClick={() => onChange(variants.filter((_,j) => i!==j))}>Rimuovi formato {i+1}</Button>}
      <p className="text-sm">{v.option || 'Formato da indicare'} · {v.price ? `${v.price} €` : 'Prezzo da indicare'}</p>
    </div>)}
    {multiple && <Button type="button" variant="outline" disabled={variants.length>=50} onClick={() => { const used = new Set([sku,...variants.map(v=>v.sku)].map(s=>s.toLowerCase())); let n=1; while(used.has(`${sku}-${n}`.toLowerCase())) n++; onChange([...variants,{ sku: sku ? `${sku}-${n}` : '', option:'', price:'', compareAtPrice:null }]); }}>Aggiungi formato</Button>}
    <p className="text-sm">Prezzi in euro: puoi usare la virgola (es. 12,50). Nessuna disponibilità o quantità viene assegnata. I codici proposti devono essere confermati e sono verificati dal server prima del salvataggio; non modificare SKU di prodotti già esistenti.</p>
  </section>;
}
