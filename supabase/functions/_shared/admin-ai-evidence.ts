import type { EditorialSection } from './admin-ai-sections.ts';

export type FactStatus = 'included' | 'equivalent' | 'contradictory' | 'unverified' | 'uncovered';
export interface SourceFact {
  row: number;
  text: string;
  exclusion?: 'contradictory' | 'unverified';
  reason?: string;
}
export interface FactOutcome extends SourceFact {
  status: FactStatus;
  headings: string[];
  duplicateOf?: number;
}

export const normalize = (s: string) =>
  s.toLocaleLowerCase('it').normalize('NFD').replace(/\p{M}/gu, '').replace(/\*\*/g, '').replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ').trim();
export const countEditorialWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const absence =
  /\b(?:senza|priv[oaie] di|sprovvist[oaie] di|assenza (?:di|del)|non (?:ha|presenta|possiede|sviluppa)(?: (?:un|il))?)\s+(?:un\s+)?fust[oi]\b/;
const qualified =
  /\b(?:generalmente|solitamente|normalmente|in genere|di solito|di norma|per lo piu)\b/;
function frequency(s:string) {
  if (qualified.test(s)) return 'abituale';
  if (/\b(?:talvolta|a volte|occasionalmente)\b/.test(s)) return 'occasionale';
  if (/\b(?:raramente|di rado)\b/.test(s)) return 'raro';
  return '';
}
const commercial = /\b(?:prezz\w*|sku|disponibil\w*|inventario|stock|giacenz\w*|euro)\b|€/;
// Only a complete assertion about growth habit can establish this equivalence.
// In particular, "sviluppo verticale dello stelo" describes a different subject.
const uprightHabit = /^(?:(?:il|lo) )?(?:portamento|sviluppo)(?: della pianta)? (?:e )?(?:eretto|verticale)$/;
function hasUprightHabit(text: string) {
  return normalize(text).split(/[.!?;\n]/).some(sentence => {
    if (frequency(sentence) || growthContext(sentence) ||
      /\b(?:non|senza|mai|solo|soltanto|se|salvo|tranne|purche|quando|esclusivamente|durante)\b/.test(sentence)) return false;
    const clause = sentence.split(':')[0].trim();
    if (uprightHabit.test(clause)) return true;
    const match = /\bportamento(?: della pianta)? (?:e )?(?:eretto|verticale)\b/.exec(clause);
    if (!match || !/^(?:$|,| e )/.test(clause.slice(match.index + match[0].length))) return false;
    return !/\b(?:fogli\w*|fior[ei]|stel[oi]|coroll[ae]|ram[oi]|radic[ei])\b/.test(clause.slice(0, match.index));
  });
}
// Match only standalone floral predicates. Qualifiers, negations and other organs
// must continue through the original botanical checks.
const hangingFlowers = /^(?:i )?fiori (?:(?:sono )?penduli|ricadono verso il basso)$/;
function statesHangingFlowers(text: string) {
  return normalize(text).split(/[.!?;\n]/).some(clause => hangingFlowers.test(clause.trim()));
}
function hangingOrgans(text: string): string[] {
  return text.split(/[.,;:!?\n]/).flatMap(clause => {
    const context = clause.match(/\b(?:se|solo|salvo|senza|non|mai|quando|durante)\b/g) ?? [];
    return [...clause.matchAll(/\b(fior[ei]|fogli[ae]|coroll[ae]|stel[oi]|ram[oi]|radic[ei]|frutt[oi]) (?:non )?(?:(?:sono|e|si presenta|si presentano) )?(?:pendul[oaie]|ricad(?:e|ono) verso il basso)\b/g)]
      .map(match => [match[1].slice(0,-1),frequency(clause),...context].join('|'));
  });
}
const uncertain =
  /\b(?:forse|ipotetic\w*|da verificare|da confermare|non (?:e |sono )?(?:verificat\w*|conferm\w*|attest\w*)|potrebbe)\b/;
const families = (s: string): string[] => s.match(/\b[a-z]+aceae\b/g) ?? [];
const units: Record<string, number> = {
  m: 1000,
  mt: 1000,
  metro: 1000,
  metri: 1000,
  cm: 10,
  centimetri: 10,
  mm: 1,
  millimetri: 1,
};
function growthContext(s: string) {
  if (/\bin vaso\b/.test(s)) return 'vaso';
  if (/\b(?:in piena terra|in pieno campo)\b/.test(s)) return 'piena terra';
  if (/\b(?:a maturita|da adulta|a sviluppo completo)\b/.test(s)) return 'adulta';
  if (/\b(?:da giovane|allo stadio giovanile)\b/.test(s)) return 'giovane';
  return '';
}
function measures(text: string) {
  const quantities: Record<string, string> = {
    uno: '1',
    un: '1',
    due: '2',
    tre: '3',
    quattro: '4',
    cinque: '5',
    sei: '6',
    sette: '7',
    otto: '8',
    nove: '9',
    dieci: '10',
    venti: '20',
    cento: '100',
  };
  const s = normalize(text).replace(
    /\b(uno|un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|venti|cento)(?=\s+(?:metr|centimetr|millimetr))/g,
    (w) => quantities[w],
  );
  return [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(millimetri|centimetri|metri|metro|mm|cm|mt|m)\b/g)].map((m) => {
    const before = s.slice(0, m.index);
    const organs = [
      ...before.matchAll(
        /\b(stel\w*|ass[ei] floreal\w*|infiorescenz\w*|pannocchi\w*|foglie?|fogliame|tronco|arbusto|pianta|altezza massima)\b/g,
      ),
    ];
    const last = organs[organs.length - 1]?.[0] ?? '';
    const subject = /^(stel|ass|infioresc|pannocchi)/.test(last)
      ? 'floreale'
      : /^fogli/.test(last)
      ? 'foglia'
      : last === 'tronco'
      ? 'tronco'
      : 'pianta';
    return {
      context: growthContext(s),
      value: Math.round(Number(m[1].replace(',', '.')) * units[m[2]] * 1000) / 1000,
      subject,
    };
  });
}

function clauses(row: string) {
  // Preserve labelled FAQ pairs; isolate independent assertions within mixed source paragraphs.
  if (/^FAQ\s*:/i.test(row)) return [row];
  return row.split(
    /(?<=[.!?;])\s+|\s+(?=ed è molto apprezzat|appartenente alla famiglia)|(?<=sempreverde)\s+(?=che può raggiungere)|,\s*(?=(?:senza fusto|originari[oa]\b|la pianta tende|sui quali|formando rosette))/iu,
  )
    .map((part) => part.trim()).filter(Boolean);
}
export function analyzeFacts(rows: string[]): SourceFact[] {
  const facts: SourceFact[] = rows.flatMap((line, row) => clauses(line).map((text) => ({ row, text })));
  const names = new Set<string>();
  const heights: { fact: SourceFact; value: number; context: string }[] = [];
  for (const fact of facts) {
    const s = normalize(fact.text);
    if (uncertain.test(s) || commercial.test(s) || /fusto a fiamma/.test(s)) {
      fact.exclusion = 'unverified';
      fact.reason = commercial.test(s)
        ? 'Dato commerciale riservato ai campi manuali.'
        : 'Formulazione incerta o ambigua. Correggi o conferma la fonte.';
      continue;
    }
    families(s).forEach((f) => names.add(f));
    if (/\baltezza\b|\balt[oa]\b|\braggiunge\b/.test(s)) {
      for (const m of measures(s).filter((m) => m.subject === 'pianta')) {
        heights.push({ fact, value: m.value, context: m.context });
      }
    }
  }
  for (const fact of facts) {
    if (fact.exclusion) continue;
    const s = normalize(fact.text);
    const familyConflict = names.size > 1 && families(s).length > 0;
    const heightConflict = heights.some((a) =>
      a.fact === fact &&
      heights.some((b) => a.value !== b.value && (!a.context || !b.context || a.context === b.context))
    );
    if (familyConflict || heightConflict) {
      fact.exclusion = 'contradictory';
      fact.reason = familyConflict
        ? 'Le fonti indicano famiglie diverse. Verifica la famiglia e correggi le informazioni.'
        : 'Altezze della pianta apparentemente incompatibili. Specifica organo, condizioni o valore verificato.';
    }
  }
  return facts;
}
// Keep row indices stable for provider citations, even when a whole row is excluded.
export function allowedRows(rows: string[], analysis: SourceFact[]) {
  return rows.map((line, i) => {
    const atoms = analysis.filter((a) => a.row === i);
    return atoms.every((a) => !a.exclusion)
      ? line
      : atoms.filter((a) => !a.exclusion).map((a) => a.text).join(' ');
  });
}
export const usableFacts = (facts: SourceFact[]) => facts.filter((f) => !f.exclusion).map((f) => f.text);

const synonyms: [RegExp, string][] = [
  [/\b(?:fertilita|fertil[ei])\b/g,'fertile'],
  [/\b(?:predilige|preferisce|preferenza)\b/g, 'preferire'],
  [/\b(?:tratta di|tratti|dotate di|presenza di|facilmente|si distingue|tende a|in grado di)\b/g, ' '],
  [/\b(?:fogliame|fogliari|foglia|foglie)\b/g, 'foglia'],
  [/\b(?:suolo|terreno|substrato)\b/g, 'terreno'],
  [/\b(?:drenaggio|drenat[oi])\b/g, 'drenato'],
  [/\b(?:cespuglio|arbusto)\b/g, 'arbusto'],
  [/\b(?:argentat[eoia]|argente[eoia]|argento)\b/g, 'argento'],
  [/\b(?:campanulat[oi]|campana)\b/g, 'campana'],
  [/\b(?:generalmente|solitamente|normalmente|di solito|di norma|in genere)\b/g, 'solitamente'],
  [/\b(?:proviene|proveniente|originari[oa])\b/g, 'origine'],
  [/\b(?:numeros[ie]|molteplici|molti)\b/g, 'numerosi'],
  [
    /\b(?:spunta\w*|compaiono|sbocciano|presenta\w*|riunit\w*|raggiunge\w*|sono|possono|appartiene|appartenente|appartenenti|caratterizzat\w*|costituit\w*|assume|formando|forma|specie|pianta|questa|questo|colore|dalle|dagli|dallo|dalla|nella|nello|degli|della|delle|dello|negli|nelle|dalla|sulla|sulle|anche|lungo i|quali|sugli|allora|circa|fino|alla|dall|dell|dell[aie]|dove|come|dati|confermat[ie]|indicazioni)\b/g,
    ' ',
  ],
];
function terms(text: string) {
  let s = normalize(text).replace(absence, ' acaule ').replace(/\bacaule\b/g, ' acaule ');
  for (const [from, to] of synonyms) s = s.replace(from, to);
  return [
    ...new Set(
      (s.match(/[a-z]{4,}|\d+(?:[.,]\d+)?/g) ?? []).map((word) =>
        word.length >= 5 ? word.slice(0, -1) : word
      ),
    ),
  ];
}
const protectedClaims = [
  'tossic',
  'rustic',
  'certificat',
  'biologic',
  'purifica',
  'ideal',
  'scultore',
  'architettonic',
  'apprezzat',
  'ricercat',
  'paesaggistic',
  'contemporane',
  'annaffi',
  'irrig',
  'concim',
  'fertilizz',
  'potatur',
  'commestib',
  'velenos',
  'sempreverd',
  'caduc',
  'blu',
  'giall',
  'rosa',
  'rosso',
  'bianc',
  'esposizion',
  'pieno sole',
  'mezzombr',
  'ombra',
  'siccita',
  'gelat',
  'resisten',
  'resistent',
  'climat',
  'esemplare isolato',
  'siepe',
  'benefic',
  'balcon',
  'terraz',
  'parassit',
  'profumat',
  'drenat',
  'sole',
  'gelo',
  'usda',
  'quotidian',
  'settimanal',
  'mensil',
  'temperatur',
  'clima',
  'rinvas',
  'innaffi',
  'acqua',
  'ventos',
  'ventil',
  'pesticid',
  'fertilita',
  'alcalin',
  'acid',
  'calcare',
  'fertile',
  'mellifer',
  'impollinat',
  'farfall',
  'insetti',
  'api',
  'profum',
  'variegat',
  'viola',
  'porpor',
  'arancion',
  'azzurr',
  'argent',
  'fioritura precoce',
  'bordur',
  'aiuol',
  'giardin',
  'ornamental',
  'curativ',
  'medicina',
  'foglie carnose',
  'malatti',
  'curat',
  'terapeut',
  'assorb',
  'attra',
  'attira',
  'favorisc',
  'longev',
  'miracol',
  'garant',
  'fabbisogno',
  'resiste',
  'tollera',
  'depur',
  'adatt',
  'in vaso',
  'in appartamento',
  'interni',
  'esterni',
  'sopport',
  'toller',
  'dop',
  'doc',
  'igp',
  'fsc',
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];
function hasClaim(s: string, term: string) {
  const canonical = s.replace(/drenaggio/g, 'drenato').replace(
    /fertilità|fertilita|fertil[ei]\b/g,
    'fertile',
  );
  const exact = ['dop','doc','igp','fsc','api','sole','stock','usda'];
  return new RegExp('\\b' + term + (exact.includes(term) ? '\\b' : '')).test(canonical);
}
function negativeObjects(s: string) {
  return [...s.matchAll(/\b(?:senza|non|mai|priv[oaie] di|sprovvist[oaie] di|assenza di)\s+([^.,;!?]+)/g)]
    .map((m) =>
      terms(
        m[1].split(/\b(?:ma|mentre|tuttavia|invece)\b/)[0].replace(
          /^(?:e |ha |presenta |necessita di |richiede |di |un |il )+/g,
          '',
        ),
      )
    ).filter((a) => a.length);
}
function uncertaintySubject(text: string) {
  const marker = /\bnon (?:e |sono )?(?:confermat[aeio]|attestat[aeio]|verificat[aeio])\b/;
  const s = normalize(text);
  if (marker.test(s)) return s.replace(marker, '').replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim();
}
function propertyError(sentence: string, sources: SourceFact[]) {
  const s = normalize(sentence);
  // A disclosed uncertainty can only be repeated as uncertainty about that very property.
  const subject = uncertaintySubject(sentence);
  if (subject) {
    return sources.some((a) => a.exclusion === 'unverified' && uncertaintySubject(a.text) === subject)
      ? undefined
      : 'Informazione non verificata o qualificazione modificata.';
  }
  const anchors = sources.filter((a) => !a.exclusion);
  if (!anchors.length) return 'La fonte richiede verifica o correzione.';
  const evidence = normalize(anchors.map((a) => a.text).join(' '));
  const hanging = hangingOrgans(s);
  if (hanging.length) {
    const evidence = anchors.flatMap(a => hangingOrgans(normalize(a.text)));
    if (!hanging.every(claim => evidence.includes(claim))) return 'Orientamento non confermato per l’organo indicato.';
  }
  if (hasUprightHabit(sentence) && !anchors.some(a => hasUprightHabit(a.text))) {
    return 'Portamento eretto della pianta non confermato.';
  }
  // Direct predicates include "il portamento dello stelo è verticale" and
  // "le foglie hanno un portamento eretto". Neither is evidence of plant habit.
  const organDirection = /\b(fogl(?:ia|ie)|fior[ei]|stel[oi]|radic[ei]) (?:(?:sono|e) |(?:ha|hanno) (?:un )?(?:portamento|sviluppo) )?(?:vertical[ei]|erett[oaie])\b/;
  const direction = organDirection.exec(s);
  if (direction && !anchors.some(a => {
    const atom = normalize(a.text);
    return organDirection.exec(atom)?.[1].slice(0, 3) === direction[1].slice(0, 3) && !negativeObjects(atom).length;
  })) return 'Orientamento non confermato per l’organo indicato.';
  // A subjective adjective needs evidence about the same organ. Do not transfer
  // an assessment of the foliage to the flowers just because both rows are cited.
  if (/\belegant[ei]\b/.test(s)) {
    const subject = (value: string) => {
      const organs = [...value.matchAll(/\b(fior[ei]|coroll[ae]|fogli[ae]|fogliame|stel[oi]|piant[ae]|portamento)\b/g)]
        .map(m => /^(fior|coroll)/.test(m[1]) ? 'fiore' : m[1].slice(0, 4));
      return new Set(organs).size === 1 ? organs[0] : undefined;
    };
    const organ = subject(s);
    if (!organ || !anchors.some(a => {
      const atom = normalize(a.text);
      return subject(atom) === organ && /\belegant[ei]\b/.test(atom) && !negativeObjects(atom).length;
    })) return 'Giudizio estetico non confermato per il soggetto indicato.';
  }
  if (commercial.test(s)) return 'Dati commerciali esclusi dalla generazione.';
  if (families(s).some((f) => !families(evidence).includes(f))) return 'Famiglia botanica non confermata.';
  for (const m of measures(s)) {
    if (
      !anchors.some((a) =>
        measures(a.text).some((x) =>
          x.subject === m.subject && x.value === m.value && (!x.context || x.context === m.context)
        )
      )
    ) {
      return 'Misura, unità o organo non confermati.';
    }
  }
  const numbers = (value: string): string[] => value.match(/[−-]?\d+(?:[.,]\d+)?/g) ?? [];
  if (numbers(s).some((n) => !numbers(evidence).includes(n))) {
    return 'Numero non presente nelle fonti citate.';
  }
  const otherUnits = /[−-]?\d+(?:[.,]\d+)?\s*(?:°\s*c?|gradi|%|litri|kg|grammi)/g;
  for (const token of s.match(otherUnits) ?? []) {
    if (!evidence.replace(/\s/g, '').includes(token.replace(/\s/g, ''))) {
      return 'Quantità o unità non confermata.';
    }
  }
  const hasAbsence = (v: string) => absence.test(v) || /\bacaule\b|\bfusto (?:e )?(?:(?:generalmente|solitamente|normalmente) )?assente\b/.test(v);
  if (/\bnon\s+(?:e\s+)?(?:senza|priv[oaie]|sprovvist[oaie]|acaule)\b/.test(s)) {
    return 'Doppia negazione ambigua.';
  }
  if (/\bfust[oi]\b|\bacaule\b/.test(s)) {
    const stem = anchors.map((a) => normalize(a.text)).filter((a) => /\bfust[oi]\b|\bacaule\b/.test(a));
    if (
      !stem.length || stem.some(hasAbsence) !== hasAbsence(s) ||
      stem.some(a => frequency(a) && frequency(a)!==frequency(s))
    ) {
      return 'Verifica la presenza del fusto e la qualificazione di frequenza.';
    }
  }
  for (const term of protectedClaims) {
    if (!hasClaim(s, term)) continue;
    const support = anchors.filter((a) => hasClaim(normalize(a.text), term));
    if (!support.length) return 'Proprietà o utilizzo non confermato nelle fonti citate.';
    const negates = (v: string) =>
      negativeObjects(v).some((obj) => obj.some((t) => t.startsWith(term.slice(0, 4))));
    if (!support.some((a) => negates(normalize(a.text)) === negates(s))) {
      return 'Polarità della proprietà non confermata.';
    }
  }
  // Do not require an unrelated sentence to repeat a negation. Match its actual object.
  const negated = negativeObjects(s);
  for (const atom of anchors) {
    const a = normalize(atom.text);
    for (const obj of negativeObjects(a)) {
      const mentioned = obj.filter((t) => terms(s).includes(t));
      if (
        mentioned.length && !mentioned.some((t) => negated.some((group) => group.includes(t))) &&
        !(obj.includes('fust') && hasAbsence(s))
      ) {
        return 'Negazione riferita alla proprietà omessa.';
      }
    }
  }
  for (const obj of negativeObjects(s)) {
    if (
      !(obj.includes('fust') && hasAbsence(s)) &&
      !anchors.some((a) => negativeObjects(normalize(a.text)).some((src) => src.some((t) => obj.includes(t))))
    ) {
      return 'Negazione priva di una fonte corrispondente.';
    }
  }
}
export function unsupportedSection(text: string, sources: SourceFact[]) {
  if (
    !sources.some((a) => !a.exclusion) &&
    !sources.some((a) => a.exclusion === 'unverified' && uncertain.test(normalize(a.text)))
  ) return 'Le fonti citate richiedono conferma o correzione.';
  for (const sentence of text.split(/(?<=[.!?;])\s+|\n+/).filter(Boolean)) {
    const message = propertyError(sentence, sources);
    if (message) return message;
    if (uprightHabit.test(normalize(sentence).replace(/[.!?]$/, ''))) continue;
    const words = terms(sentence);
    if (/^(?:caratteristiche(?: principali| confermate)?|dettagli(?: botanici)?):$/i.test(sentence.trim())) {
      continue;
    }
    const grounded = new Set(
      sources.filter((a) => !a.exclusion || uncertaintySubject(sentence)).flatMap((a) => terms(a.text)),
    );
    const matching = words.filter((w) => grounded.has(w));
    if (
      !matching.length ||
      (words.length >= 5 && matching.length === 1 && /^(?:fogli|arbust|fior|stel|piant)/.test(matching[0]))
    ) {
      return 'Affermazione priva di riscontro sufficiente nelle fonti citate.';
    }
  }
}
// Canonicalise equivalent expressions only for coverage; property validation still runs on original prose.
function coverageTerms(text: string) {
  const canonical = normalize(text).replace(/(?:^|(?<=[.!?;:\n]))[^.!?;:\n]+/g,
    clause => uprightHabit.test(clause.trim()) ? ' portamento eretto ' :
      hangingFlowers.test(clause.trim()) ? ' fiori penduli ' : clause);
  return terms(canonical
    .replace(/\b(?:steli?|stelo|ass[ei]) floreal[ei]\b/g, 'stelo floreale')
    .replace(/\b(?:produce|produrre)\b/g, 'produce')
    .replace(/\b(?:di altezza|in altezza)\b/g, ' ')
    .replace(/\b(?:possono arrivare|puo arrivare|raggiungono|sviluppa)\b/g, ' ')
    .replace(/(\d)\s*(?:metri|metro|m)\b/g, '$1 metri'));
}

// A salvaged sentence must stand on one source atom. Generic word overlap that
// suffices for reviewing a full paragraph does not justify keeping a fragment.
export function independentlyGrounded(sentence: string, cited: SourceFact[]) {
  const words = coverageTerms(sentence);
  const subjects = (s: string) => new Set((normalize(s).match(/\b(?:portamento|sviluppo|fior[ei]|coroll[ae]|fogli[ae]|fogliame|stel[oi]|pianta|terreno|substrato|suolo|arbusto)\b/g) ?? [])
    .map(v => /^(?:terreno|substrato|suolo)$/.test(v) ? 'terreno' : v.slice(0, 4)));
  const stated = [...subjects(sentence)];
  return words.length > 0 && cited.some(f => {
    if (f.exclusion || unsupportedSection(sentence, [f])) return false;
    if (hasUprightHabit(sentence) && hasUprightHabit(f.text)) return true;
    if (hangingFlowers.test(normalize(sentence).replace(/[.!?]$/, '')) && statesHangingFlowers(f.text)) return true;
    const sourceSubjects = subjects(f.text);
    if (stated.length !== 1 || sourceSubjects.size !== 1 || !sourceSubjects.has(stated[0])) return false;
    const source = new Set(coverageTerms(f.text));
    return words.every(w => source.has(w));
  });
}

export const factIdentity = (text: string) =>
  normalize(text).replace(/^si tratta di un(?:a)? /,'').replace(/[.!;]+$/, '');

export function factCoverage(facts: SourceFact[], sections: EditorialSection[]): FactOutcome[] {
  const validated = sections.filter(s => !unsupportedSection(s.text, facts.filter(f => s.factIndices.includes(f.row))));
  const first = new Map<string, number>();
  return facts.map((fact) => {
    const identity = factIdentity(fact.text);
    const duplicateOf = first.get(identity);
    if (duplicateOf === undefined) first.set(identity, fact.row);
    const citationRows = facts.filter(f => !f.exclusion && factIdentity(f.text) === identity).map(f => f.row);
    const cited = validated.filter(s => s.factIndices.some(i => citationRows.includes(i)));
    const source = identity;
    const relevant = hasUprightHabit(source) ? cited.filter(s => hasUprightHabit(s.text)) : cited;
    const exact = relevant.filter((s) => normalize(s.text).includes(source));
    const words = coverageTerms(source);
    const matches = relevant.filter((s) => words.some((w) => coverageTerms(s.text).includes(w)));
    const material = normalize(matches.map((s) => s.text).join(' '));
    const tokens = new Set(coverageTerms(material));
    const flowerShapeAndColor = /\bfior[ei]\b/.test(source) && /bianco[ -]crema/.test(source) &&
      /campan(?:a|ulat)/.test(source);
    // Never attach a leaf's colour/shape to flowers merely because both appear in the same paragraph.
    const floralEvidence = !flowerShapeAndColor || matches.some(section => {
      const phrases = normalize(section.text).split(/[.!?;\n]/);
      const floral = (v: string) => /\b(?:fior[ei]|coroll[ae])\b/.test(v) && !/\b(?:fogli[ae]|fogliame)\b/.test(v);
      const descriptions = phrases.filter((v,i) => floral(v) ||
        (i > 0 && /^\s*(?:ognuno|ciascuno)\b/.test(v) && floral(phrases[i-1]) && !/\bfogli/.test(v)));
      return descriptions.some(v => /bianco[ -]crema/.test(v)) && descriptions.some(v => /campan(?:a|ulat)/.test(v));
    });
    const guarded = floralEvidence && protectedClaims.every((t) => !hasClaim(source, t) || hasClaim(material, t)) &&
      measures(source).every((m) =>
        measures(material).some((c) => c.subject === m.subject && c.value === m.value && c.context === m.context)
      ) &&
      (!absence.test(source) || absence.test(material) || /\bacaule\b/.test(material)) &&
      (!qualified.test(source) || qualified.test(material));
    const equivalent = words.length > 0 && guarded && (words.every((w) => tokens.has(w)) ||
      (uprightHabit.test(source) && relevant.length > 0));
    const status = fact.exclusion ?? (exact.length ? 'included' : equivalent ? 'equivalent' : 'uncovered');
    return {
      ...fact,
      duplicateOf,
      status,
      headings: status === 'included'
        ? exact.map((s) => s.heading)
        : status === 'equivalent'
        ? matches.map((s) => s.heading)
        : [],
    };
  });
}
