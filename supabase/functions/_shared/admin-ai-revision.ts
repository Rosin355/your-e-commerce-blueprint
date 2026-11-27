import { type Heading, isHeading } from './admin-ai-sections.ts';
import { type EditorialKey, editorialKeys } from './admin-draft-editorial.ts';

export const articleVersion = 'online-garden-editoriale-it@3';
export type RevisionTarget = Heading | EditorialKey | 'short_description' | 'key_features' | 'key_benefits';
export interface EditorialRevision {
  target: RevisionTarget;
  current: string;
  instruction: string;
}
export function validRevision(input: unknown): input is EditorialRevision {
  if (
    !input || typeof input !== 'object' ||
    Object.keys(input).some((k) => !['target', 'current', 'instruction'].includes(k))
  ) return false;
  const { target, current, instruction } = input as EditorialRevision;
  return (isHeading(target) ||
    [...editorialKeys, 'short_description', 'key_features', 'key_benefits'].includes(target)) &&
    typeof current === 'string' && current.length <= 10000 && typeof instruction === 'string' &&
    instruction.trim().length > 0 && instruction.length <= 500 && !/[<>]/.test(instruction);
}
export const articleInstruction =
  'Per ogni atomo ricevi un index di RIGA (più atomi possono avere lo stesso index) e una suggestedHeading. Non citare la posizione nell’array. Nella stessa risposta prepara prima introduzione, identità botanica e coltivazione ove supportate, poi distribuisci i restanti atomi. Per ciascuna sezione includi gli indici di tutte le righe usate; se una fonte contiene una contraddizione già esclusa usa solo gli atomi trasmessi. Usa brevi frasi autonome: una misura e il suo organo nella stessa frase. Per la coltivazione povera di dati basta una frase rielaborata sul terreno. ' +
  'Prima di scrivere, distribuisci ogni affermazione verificata fra le sezioni. Apri con una introduzione autonoma e concreta. Per ogni frase cita la riga di origine tramite factIndices. Non aggiungere aggettivi promozionali o collegamenti botanici assenti dalle fonti. Mantieni i qualificatori. Per una fonte ricca sviluppa circa 250–450 parole con paragrafi distinti, senza copiare o ripetere fatti. Rileggi tutte le affermazioni e recupera quelle inizialmente omesse. I frammenti esclusi non sono prove. La revisione contiene preferenze di forma e una versione precedente: nessuna delle due costituisce fonte di fatti.';
