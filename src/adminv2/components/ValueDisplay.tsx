// F6 — Rende leggibile qualsiasi valore: mai JSON grezzo in UI cliente.
import { Badge } from '@/components/ui/badge';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isImageUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//.test(v) && /\.(jpe?g|png|webp|avif|gif)/i.test(v);
}

export default function ValueDisplay({ value, label }: { value: unknown; label?: string }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-sm text-muted-foreground">Nessun valore</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-sm">{value ? 'Sì' : 'No'}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-sm tabular-nums">{value.toLocaleString('it-IT')}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-sm text-muted-foreground">Nessun valore</span>;
    if (value.every(isImageUrl)) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.slice(0, 8).map((src, i) => (
            <img
              key={`${src}-${i}`}
              src={src as string}
              alt={`${label ?? 'Immagine prodotto'} ${i + 1}`}
              loading="lazy"
              className="h-20 w-20 rounded-md border object-cover"
            />
          ))}
        </div>
      );
    }
    if (value.every((v) => isPlainObject(v))) {
      return (
        <div className="space-y-2">
          {(value as Record<string, unknown>[]).map((entry, i) => (
            <div key={i} className="rounded-md border bg-muted/40 p-3">
              <dl className="space-y-1">
                {Object.entries(entry).map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                    <dt className="text-xs font-medium text-muted-foreground sm:w-40">{k}</dt>
                    <dd className="text-sm">{String(v ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((v, i) => (
          <Badge key={i} variant="secondary" className="font-normal">
            {String(v)}
          </Badge>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <dl className="space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="text-xs font-medium text-muted-foreground sm:w-40">{k}</dt>
            <dd className="text-sm">
              {isPlainObject(v) || Array.isArray(v) ? <ValueDisplay value={v} /> : String(v ?? '—')}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  const text: string = String(value as unknown as string);
  if (isImageUrl(text as unknown)) {
    return (
      <img
        src={text}
        alt={label ?? 'Immagine prodotto'}
        loading="lazy"
        className="h-24 w-24 rounded-md border object-cover"
      />
    );
  }
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {/<[a-z][\s\S]*>/i.test(text) ? plain : text}
    </p>
  );
}
