// Pure quest helpers (safe for both server and client).
import type { Quest } from "./types";

type Orderable = Pick<Quest, "id" | "title" | "questNumber" | "prerequisites">;

/**
 * Order quests the way you unlock them in-game: a topological sort over the
 * prerequisite graph (edges that stay within the given set), with a stable
 * tie-break by questNumber then title. Falls back gracefully when the graph
 * is sparse.
 */
export function orderQuests<T extends Orderable>(quests: T[]): T[] {
  const ids = new Set(quests.map((q) => q.id));
  const byId = new Map(quests.map((q) => [q.id, q]));

  // indegree = number of prerequisites that are also in this set
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const q of quests) {
    const preds = q.prerequisites.filter((p) => ids.has(p.id));
    indegree.set(q.id, preds.length);
    for (const p of preds) {
      const arr = dependents.get(p.id) ?? [];
      arr.push(q.id);
      dependents.set(p.id, arr);
    }
  }

  const tieBreak = (a: string, b: string) => {
    const qa = byId.get(a)!;
    const qb = byId.get(b)!;
    const na = qa.questNumber ?? Number.MAX_SAFE_INTEGER;
    const nb = qb.questNumber ?? Number.MAX_SAFE_INTEGER;
    if (na !== nb) return na - nb;
    return qa.title.localeCompare(qb.title);
  };

  // Kahn's algorithm with a sorted "ready" frontier for deterministic output.
  const ready = quests
    .filter((q) => (indegree.get(q.id) ?? 0) === 0)
    .map((q) => q.id)
    .sort(tieBreak);
  const out: T[] = [];
  const seen = new Set<string>();

  while (ready.length) {
    const id = ready.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(byId.get(id)!);
    const next: string[] = [];
    for (const dep of dependents.get(id) ?? []) {
      indegree.set(dep, (indegree.get(dep) ?? 1) - 1);
      if ((indegree.get(dep) ?? 0) <= 0) next.push(dep);
    }
    ready.push(...next);
    ready.sort(tieBreak);
  }

  // Append anything left (cycles), keeping a stable order.
  for (const q of quests) if (!seen.has(q.id)) out.push(q);
  return out;
}

/** Split "Trader's Plan - Part 2" → { base: "Trader's Plan", part: 2 }. */
export function partBase(title: string): { base: string; part: number } | null {
  const m = title.match(/^(.*?)\s*[-–]\s*Part\s+(\d+)\s*$/i);
  if (!m) return null;
  return { base: m[1].trim(), part: Number(m[2]) };
}

export interface QuestGroup<T> {
  key: string;
  base: string; // group title
  isSeries: boolean; // true when it's a multi-part series
  items: T[]; // ordered parts (or a single quest)
}

/**
 * Collapse multi-part quest series ("X - Part 1/2/3") into one group with the
 * parts as ordered children. Single quests become a group of one.
 * Preserves the incoming order of first appearance.
 */
export function groupQuestParts<T extends { id: string; title: string }>(
  quests: T[],
): QuestGroup<T>[] {
  const groups: QuestGroup<T>[] = [];
  const index = new Map<string, QuestGroup<T>>();

  for (const q of quests) {
    const pb = partBase(q.title);
    if (pb) {
      const key = `series:${pb.base.toLowerCase()}`;
      let g = index.get(key);
      if (!g) {
        g = { key, base: pb.base, isSeries: true, items: [] };
        index.set(key, g);
        groups.push(g);
      }
      g.items.push(q);
    } else {
      groups.push({ key: q.id, base: q.title, isSeries: false, items: [q] });
    }
  }

  // Sort parts within each series by their part number.
  for (const g of groups) {
    if (g.isSeries) {
      g.items.sort((a, b) => (partBase(a.title)?.part ?? 0) - (partBase(b.title)?.part ?? 0));
    }
  }
  return groups;
}
