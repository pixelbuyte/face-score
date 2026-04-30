import type { LandmarkPoseDiagnostics } from "@/lib/facePoseNormalize";

export type ConfidenceLevel = "high" | "medium" | "low";

export type MetricKey =
  | "symmetry"
  | "thirdsBalance"
  | "midfaceRatio"
  | "canthalTilt"
  | "jawAngle"
  | "eyeSpacing"
  | "philtrumRatio"
  | "noseRatio"
  | "lipFullness";

const BASE_WEIGHT: Record<MetricKey, number> = {
  symmetry: 0.18,
  thirdsBalance: 0.18,
  midfaceRatio: 0.14,
  canthalTilt: 0.12,
  jawAngle: 0.12,
  eyeSpacing: 0.1,
  philtrumRatio: 0.06,
  noseRatio: 0.06,
  lipFullness: 0.04,
};

export const METRIC_KEYS = Object.keys(BASE_WEIGHT) as MetricKey[];

export function deriveMetricConfidences(
  pose: LandmarkPoseDiagnostics,
): Record<MetricKey, ConfidenceLevel> {
  const { severeYaw, detectionConfidence, rollDeg } = pose;

  const baseRoll = Math.abs(rollDeg);
  let tier: ConfidenceLevel = "high";
  if (detectionConfidence < 55 || severeYaw) tier = "low";
  else if (detectionConfidence < 80 || baseRoll > 8) tier = "medium";

  const out = {} as Record<MetricKey, ConfidenceLevel>;

  const set = (k: MetricKey, c: ConfidenceLevel) => {
    out[k] = c;
  };

  if (severeYaw || detectionConfidence < 50) {
    for (const k of METRIC_KEYS) set(k, "low");
    return out;
  }

  set(
    "symmetry",
    detectionConfidence >= 82 && baseRoll <= 6 ? "high" : detectionConfidence >= 65 ? "medium" : "low",
  );
  set("eyeSpacing", tier === "high" ? "high" : tier);
  set("canthalTilt", baseRoll > 10 || tier !== "high" ? "medium" : "high");

  const jawConf: ConfidenceLevel =
    pose.yawDeg > 10 ? "medium" : pose.yawDeg > 6 ? "medium" : tier;
  set("jawAngle", jawConf === "high" ? "medium" : jawConf);
  set("noseRatio", pose.yawDeg > 9 ? "low" : pose.yawDeg > 5 ? "medium" : tier);
  set("philtrumRatio", pose.yawDeg > 9 ? "medium" : tier);
  set("thirdsBalance", tier);
  set("midfaceRatio", tier);
  set("lipFullness", tier);

  return out;
}

/** Weighted composite; drops `low`-confidence metrics and redistributes weights. */
export function harmonyWeightedExcludingLow(
  m: Record<MetricKey, { score: number }>,
  conf: Record<MetricKey, ConfidenceLevel>,
): number {
  let wSum = 0;
  let sSum = 0;
  for (const k of METRIC_KEYS) {
    if (conf[k] === "low") continue;
    const w = BASE_WEIGHT[k];
    wSum += w;
    sSum += m[k].score * w;
  }
  if (wSum < 1e-6) {
    const scores = METRIC_KEYS.map((k) => m[k].score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  return Math.round(sSum / wSum);
}

export function aggregateHarmonyConfidence(
  conf: Record<MetricKey, ConfidenceLevel>,
): ConfidenceLevel {
  const lows = METRIC_KEYS.filter((k) => conf[k] === "low").length;
  const highs = METRIC_KEYS.filter((k) => conf[k] === "high").length;
  if (lows >= 5) return "low";
  if (lows >= 2 || highs < 3) return "medium";
  return "high";
}
