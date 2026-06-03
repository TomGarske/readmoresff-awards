/**
 * Group assignment algorithm.
 *
 * At registration close, we randomly bucket paid writers into groups of ~40
 * and draw a unique (genre, theme, object) prompt for each group.
 *
 * Properties we want:
 *   - Every writer in exactly one group
 *   - Group size as close to 40 as possible; never < 20, never > 50
 *   - Each group gets a distinct prompt (no two groups in the same round get
 *     identical genre+theme+object)
 *   - Deterministic given the same input + seed (for testability)
 */
import { GENRES, THEMES, OBJECTS } from "./prompts";

export type Writer = { registrationId: string };
export type GroupAssignment = {
  groupNumber: number;
  prompt: { genre: string; theme: string; object: string };
  members: string[];     // registration IDs
};

const TARGET_SIZE = 40;
const MIN_SIZE = 20;

// Fisher-Yates shuffle with an optional seed for reproducibility.
export function shuffle<T>(arr: readonly T[], seed = Date.now()): T[] {
  const out = arr.slice();
  let s = seed >>> 0;
  const rand = () => {
    // Mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function planGroupSizes(total: number, target = TARGET_SIZE, min = MIN_SIZE): number[] {
  if (total <= 0) return [];
  if (total < min) return [total];   // too few, single group
  const groups = Math.max(1, Math.round(total / target));
  const base = Math.floor(total / groups);
  const remainder = total % groups;
  const sizes: number[] = [];
  for (let i = 0; i < groups; i++) {
    sizes.push(base + (i < remainder ? 1 : 0));
  }
  return sizes;
}

export function assignWriters(writers: readonly Writer[], seed?: number): { groupNumber: number; members: string[] }[] {
  const shuffled = shuffle(writers, seed);
  const sizes = planGroupSizes(shuffled.length);
  const groups: { groupNumber: number; members: string[] }[] = [];
  let cursor = 0;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    groups.push({
      groupNumber: i + 1,
      members: shuffled.slice(cursor, cursor + size).map((w) => w.registrationId),
    });
    cursor += size;
  }
  return groups;
}

export function drawDistinctPrompts(n: number, seed?: number): { genre: string; theme: string; object: string }[] {
  // Build all combinations, shuffle, take first n
  const all: { genre: string; theme: string; object: string }[] = [];
  for (const g of GENRES) for (const t of THEMES) for (const o of OBJECTS) {
    all.push({ genre: g.slug, theme: t.slug, object: o.slug });
  }
  return shuffle(all, seed).slice(0, n);
}

export function assignAll(writers: readonly Writer[], seed?: number): GroupAssignment[] {
  const grouped = assignWriters(writers, seed);
  const prompts = drawDistinctPrompts(grouped.length, seed ? seed + 17 : undefined);
  return grouped.map((g, i) => ({
    groupNumber: g.groupNumber,
    members: g.members,
    prompt: prompts[i],
  }));
}
