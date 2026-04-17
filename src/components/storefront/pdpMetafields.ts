import type { ShopifyProduct } from "@/lib/shopify";

type Metafield = { value?: string | null } | null | undefined;

type ProductNode = ShopifyProduct["node"];

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SeasonalCalendarSlot {
  id: "flowering" | "pruning" | "planting" | "harvest";
  label: string;
  value: string;
}

export interface BotanicalInfo {
  commonName: string | null;
  botanicalName: string | null;
  cultivationDifficulty: string | null;
}

export function parseSingleLineMetafield(mf: Metafield): string | null {
  const value = mf?.value?.trim();
  return value && value.length > 0 ? value : null;
}

export function parseMultilineMetafield(mf: Metafield, fallback: string[] = []): string[] {
  if (!mf?.value) return fallback;
  const items = mf.value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function parseJsonMetafield<T>(mf: Metafield): T | null {
  const raw = mf?.value?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseProductAttributes(mf: Metafield): ProductAttribute[] {
  const parsed = parseJsonMetafield<unknown>(mf);
  if (!Array.isArray(parsed)) return [];
  const items: ProductAttribute[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const key = typeof obj.key === "string" ? obj.key.trim() : "";
    const value = typeof obj.value === "string" ? obj.value.trim() : "";
    if (key && value) items.push({ key, value });
  }
  return items;
}

export function parseFaqItems(mf: Metafield): FaqItem[] {
  const parsed = parseJsonMetafield<unknown>(mf);
  if (!Array.isArray(parsed)) return [];
  const items: FaqItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const question = typeof obj.question === "string" ? obj.question.trim() : "";
    const answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
    if (question && answer) items.push({ question, answer });
  }
  return items;
}

export function parseBotanicalInfo(node: ProductNode): BotanicalInfo {
  return {
    commonName: parseSingleLineMetafield(node.commonName),
    botanicalName: parseSingleLineMetafield(node.botanicalName),
    cultivationDifficulty: parseSingleLineMetafield(node.cultivationDifficulty),
  };
}

export function parseSeasonalCalendar(node: ProductNode): SeasonalCalendarSlot[] {
  const slots: Array<{ id: SeasonalCalendarSlot["id"]; label: string; mf: Metafield }> = [
    { id: "flowering", label: "Fioritura", mf: node.floweringPeriod },
    { id: "pruning", label: "Potatura", mf: node.pruningPeriod },
    { id: "planting", label: "Messa a dimora", mf: node.plantingPeriod },
    { id: "harvest", label: "Raccolta", mf: node.harvestPeriod },
  ];
  const result: SeasonalCalendarSlot[] = [];
  for (const slot of slots) {
    const value = parseSingleLineMetafield(slot.mf);
    if (value) result.push({ id: slot.id, label: slot.label, value });
  }
  return result;
}

export type DifficultyLevel = "easy" | "medium" | "hard" | "unknown";

export function getDifficultyLevel(value: string | null): DifficultyLevel {
  if (!value) return "unknown";
  const normalized = value.toLowerCase().trim();
  if (/\b(facile|bassa|easy|semplice|principiante)\b/.test(normalized)) return "easy";
  if (/\b(media|intermedia|medium|moderata)\b/.test(normalized)) return "medium";
  if (/\b(esperto|alta|difficile|hard|avanzato)\b/.test(normalized)) return "hard";
  return "unknown";
}
