/**
 * Score aggregation.
 *
 * Each submission has N judge scores (N=2 by default). Aggregate by MEDIAN
 * to limit single-outlier bias. Tiebreaker: higher prompt-adherence wins
 * (philosophy: the contest is built on the prompt), then higher originality,
 * then earlier submitted_at.
 */
export type RawScore = {
  prompt_adherence: number | null;
  originality: number | null;
  prose: number | null;
  structure: number | null;
  total: number | null;
};

export type AggregatedScore = {
  median_total: number;
  median_adherence: number;
  median_originality: number;
  median_prose: number;
  median_structure: number;
  n_judges: number;
};

function median(xs: number[]): number {
  const arr = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

export function aggregate(scores: RawScore[]): AggregatedScore {
  return {
    median_total: median(scores.map((s) => Number(s.total ?? 0))),
    median_adherence: median(scores.map((s) => Number(s.prompt_adherence ?? 0))),
    median_originality: median(scores.map((s) => Number(s.originality ?? 0))),
    median_prose: median(scores.map((s) => Number(s.prose ?? 0))),
    median_structure: median(scores.map((s) => Number(s.structure ?? 0))),
    n_judges: scores.length,
  };
}

/**
 * Rank rows within a group. Returns the rows sorted best-first.
 * Tie-break order: total → adherence → originality → submitted_at (earlier wins).
 */
export type RankableRow = {
  submission_id: string;
  agg: AggregatedScore;
  submitted_at: string | null;
};

export function rankWithinGroup(rows: RankableRow[]): RankableRow[] {
  return rows.slice().sort((a, b) => {
    if (b.agg.median_total !== a.agg.median_total) return b.agg.median_total - a.agg.median_total;
    if (b.agg.median_adherence !== a.agg.median_adherence) return b.agg.median_adherence - a.agg.median_adherence;
    if (b.agg.median_originality !== a.agg.median_originality) return b.agg.median_originality - a.agg.median_originality;
    const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : Infinity;
    const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : Infinity;
    return ta - tb;
  });
}
