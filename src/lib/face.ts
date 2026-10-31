export const DEFAULT_THRESHOLD = 0.55;
// Two candidates this close to the top score are treated as ambiguous (alternate course 6b)
export const AMBIGUITY_MARGIN = 0.03;

export function getThreshold(): number {
  const v = Number(process.env.FACE_MATCH_THRESHOLD);
  return Number.isFinite(v) && v > 0 && v < 1 ? v : DEFAULT_THRESHOLD;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export type FaceCandidate = { id: string; embedding: number[] };
export type ScoredCandidate = { id: string; score: number };

export type MatchResult =
  | { status: "MATCH"; best: ScoredCandidate }
  | { status: "AMBIGUOUS"; best: ScoredCandidate; others: ScoredCandidate[] }
  | { status: "NO_MATCH"; best: ScoredCandidate | null };

export function findMatch(
  probe: number[],
  candidates: FaceCandidate[],
  threshold = getThreshold(),
): MatchResult {
  const scored = candidates
    .map((c) => ({ id: c.id, score: cosineSimilarity(probe, c.embedding) }))
    .sort((x, y) => y.score - x.score);
  const best = scored[0] ?? null;
  if (!best || best.score < threshold) return { status: "NO_MATCH", best };

  const others = scored
    .slice(1)
    .filter((s) => s.score >= threshold && best.score - s.score <= AMBIGUITY_MARGIN);
  if (others.length > 0) return { status: "AMBIGUOUS", best, others };
  return { status: "MATCH", best };
}
