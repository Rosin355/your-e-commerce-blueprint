import EditorialText from './EditorialText';
import type { DraftSummary } from '../../../supabase/functions/_shared/admin-draft-view';

function amount(value: string | null, currency: string | null) {
  if (!value) return 'mancante';
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) return 'da verificare';
  return value.replace('.', ',') + ' ' + (currency || '(valuta mancante)');
}

export default function DraftSummaryView({ draft, saved = false }: { draft: DraftSummary; saved?: boolean }) {
  const missing = 'Non indicato';
  return <div className="space-y-3 break-words text-sm">
    {saved && (!draft.title || !draft.sku || !draft.description || !draft.currency ||
      !draft.variants?.length || draft.variants.some(v => !v.sku || !v.price || !v.option) || draft.categoryDataIncomplete) &&
      <p role="alert">Il salvataggio originario contiene dati mancanti o incompleti. Verifica i campi indicati con il responsabile.</p>}
    <dl className="grid gap-3 sm:grid-cols-2">
      {Object.entries({
        Titolo: draft.title, SKU: draft.sku, Fornitore: draft.vendor,
        ...(draft.productType ? { 'Tipo prodotto': draft.productType } : {}),
        Tag: draft.tags?.join(', '), Categorie: draft.categories?.join(', '),
        'Titolo SEO': draft.seoTitle, 'Descrizione SEO': draft.seoDescription,
      }).map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd>{value || missing}</dd></div>)}
    </dl>
    <div><h4 className="font-medium">Descrizione</h4>{draft.description ? <EditorialText value={draft.description} /> : missing}</div>
    <div><h4 className="font-medium">Formati e prezzi</h4>
      {draft.variants?.length ? <ul className="space-y-1">{draft.variants.map((v, i) =>
        <li key={i}>{v.option || 'Formato mancante'} · SKU {v.sku || 'mancante'} · Prezzo di vendita {amount(v.price, draft.currency)}
          {v.compareAtPrice && <> · Prezzo precedente {amount(v.compareAtPrice, draft.currency)}</>}</li>)}</ul> : 'Nessun formato disponibile'}
    </div>
    <div><h4 className="font-medium">Immagini</h4>
      {draft.images?.length ? <div className="flex flex-wrap gap-2">{draft.images.map((img, i) =>
        <figure key={i}>{img.url ? <img src={img.url} alt={img.alt || ''} loading="lazy" className="h-24 w-24 rounded border object-contain" /> : 'Riferimento immagine mancante o non verificato'}
          <figcaption>{img.alt || 'Testo alternativo mancante'}</figcaption></figure>)}</div> : 'Nessuna immagine associata'}
    </div>
  </div>;
}
