import { fieldForKey } from "./fieldRegistry.ts";
import type { LegacyFieldComparison, ResolvedField } from "./types.ts";

export interface ProductFieldHistoryItem {
  previousValue: unknown;
  newValue: unknown;
  action: string;
  source: string;
  actorId: string | null;
  createdAt: string;
}

export interface ProductAiSuggestionView {
  id: string;
  suggestedValue: unknown;
  baseVersion: number | null;
  model: string;
  promptVersion: string | null;
  status: "pending" | "accepted" | "discarded" | "superseded";
}

export interface AdminProductFieldContract {
  key: string;
  label: string;
  wordpressOriginal: unknown;
  currentValue: unknown;
  currentSource: string | null;
  sourceFile: string | null;
  sourceRow: number | null;
  version: number;
  history: ProductFieldHistoryItem[];
  aiAllowed: boolean;
  manualOnly: boolean;
  protected: boolean;
  conflict: boolean;
  aiSuggestion: ProductAiSuggestionView | null;
}

export function toAdminFieldContract(
  resolved: ResolvedField,
  comparison?: LegacyFieldComparison,
): AdminProductFieldContract {
  const definition = fieldForKey(resolved.key);
  return {
    key: resolved.key,
    label: definition?.label ?? resolved.rawColumn,
    wordpressOriginal: resolved.value,
    currentValue: comparison?.proposedCurrentValue ?? resolved.value,
    currentSource: comparison?.proposedCurrentSource ?? (resolved.value === null ? null : "wordpress"),
    sourceFile: resolved.sourceFile,
    sourceRow: resolved.sourceRow,
    version: 1,
    history: [],
    aiAllowed: definition?.aiAllowed ?? false,
    manualOnly: definition?.manualOnly ?? true,
    protected: definition?.protected ?? true,
    conflict: resolved.resolution === "SOURCE_CONFLICT",
    aiSuggestion: null,
  };
}
