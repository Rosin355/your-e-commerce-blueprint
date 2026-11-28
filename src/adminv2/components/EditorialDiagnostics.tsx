import type { FactOutcome } from '../../../supabase/functions/_shared/admin-ai-evidence';
import type { DescriptionIssue } from '../../../supabase/functions/_shared/admin-ai-description';

const labels: Record<FactOutcome['status'], string> = {
  included: 'Incluso',
  equivalent: 'Formulazione equivalente',
  contradictory: 'Contraddittorio',
  unverified: 'Da verificare',
  uncovered: 'Non coperto',
};
export default function EditorialDiagnostics({ issues = [], coverage = [], missing = [] }: {
  issues?: DescriptionIssue[];
  coverage?: FactOutcome[];
  missing?: string[];
}) {
  if (!issues.length && !coverage.length && !missing.length) return null;
  const excluded = issues.filter((i) => i.code !== 'INCOMPLETE_RESPONSE');
  const uncovered = coverage.filter((f) => f.status === 'uncovered').length;
  const conflicts = coverage.filter((f) => f.status === 'contradictory').length;
  const uncertain = coverage.filter((f) => f.status === 'unverified').length;
  return (
    <details className='rounded border p-3 text-sm'>
      <summary className='cursor-pointer font-medium'>
        Verifica editoriale{[
          excluded.length && excluded.length + ' sezioni da rivedere',
          uncovered && uncovered + ' fatti non coperti',
          conflicts && conflicts + ' fatti in conflitto',
          uncertain && uncertain + ' da verificare',
          missing.length && missing.length + ' informazioni mancanti',
        ].filter(Boolean).map((v) => ' · ' + v)}
      </summary>
      {issues.length > 0 && (
        <ul className='list-disc pl-5'>{issues.map((i, n) => <li key={n}>{i.section}
          {i.sentence !== undefined && ' · frase ' + i.sentence} · {i.message}</li>)}</ul>
      )}
      {coverage.length > 0 && (
        <ol className='list-decimal pl-5'>
          {coverage.map((f, i) => (
            <li key={i}>
              <strong>{labels[f.status]}</strong>{f.duplicateOf !== undefined && ' · Duplicato della riga ' + (f.duplicateOf + 1)} · {f.text} {f.reason} {f.headings.join(', ')}
            </li>
          ))}
        </ol>
      )}
      {missing.length > 0 && <p>Informazioni mancanti · {missing.join(', ')}.</p>}
      {conflicts + uncertain > 0 && (
        <p>
          Verifica le fonti, correggi la descrizione di partenza e confermala prima di richiedere una nuova
          proposta.
        </p>
      )}
    </details>
  );
}
