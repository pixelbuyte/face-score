/** 0–100 score → whole-number % label for UI copy. */
export function asPercent(score: number): string {
  return `${Math.round(Math.min(100, Math.max(0, score)))}%`;
}

/** How many percentage points (on the 0–100 scale) separate you from the usual benchmark (58). */
export function pointsVsTypical(score: number, typical = 58): number {
  return Math.round(score - typical);
}

/** Plain line for “next tier” using % language (same scale as score / 100). */
export function nextTierPlainParts(
  currentScore: number,
  delta: number,
  nextTierMin: number,
): { headline: string; detail: string } {
  const d = Math.max(0, Math.round(delta));
  const target = Math.min(100, Math.round(nextTierMin));
  const cur = Math.round(Math.min(100, Math.max(0, currentScore)));
  return {
    headline: `About ${d}% more on your score`,
    detail: `Move from ${cur}% toward ${target}% to reach the next tier up.`,
  };
}
