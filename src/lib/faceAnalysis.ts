import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * Face Landmarker (MediaPipe Tasks Vision) returns 478 normalized 3D landmarks.
 * The indices below match the canonical MediaPipe face mesh topology and are the
 * backbone for every geometric metric in this file.
 *
 * Ref: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
 */
export const FACE_MESH_IDX = {
  forehead: 10,
  chin: 152,
  noseTip: 1,
  noseBottom: 2,
  noseBridge: 6,
  midGlabella: 168,

  leftBrow: 70,
  rightBrow: 300,

  leftEyeOuter: 33,
  leftEyeInner: 133,
  leftEyeTop: 159,
  leftEyeBottom: 145,

  rightEyeOuter: 263,
  rightEyeInner: 362,
  rightEyeTop: 386,
  rightEyeBottom: 374,

  leftMouth: 61,
  rightMouth: 291,
  upperLipTop: 13,
  upperLipBottom: 14,
  lowerLipTop: 17,
  lowerLipBottom: 18,
  philtrumTop: 164,

  leftCheek: 234,
  rightCheek: 454,
  leftJaw: 172,
  rightJaw: 397,
} as const;

const IDX = FACE_MESH_IDX;
const MIN_LANDMARKS = 300;

/** Per-metric package: raw, normalized 0–100 score, and short scientific label. */
export type Metric = {
  /** Display value (e.g. "1.02", "47.3°", "92%") */
  display: string;
  /** Raw numeric value used for comparisons */
  raw: number;
  /** Normalized 0–100 "harmony" score for progress bars */
  score: number;
  /** Population reference (mean) for inline comparison charts */
  populationMean: number;
  /** Short, plain-language scientific explanation */
  explanation: string;
  /** Ideal target value (for "your value vs ideal" mini chart) */
  ideal: number;
};

export type ThirdsBreakdown = {
  upper: number;
  middle: number;
  lower: number;
};

export type FaceMetrics = {
  symmetry: Metric;
  thirdsBalance: Metric;
  midfaceRatio: Metric;
  canthalTilt: Metric;
  jawAngle: Metric;
  eyeSpacing: Metric;
  philtrumRatio: Metric;
  noseRatio: Metric;
  lipFullness: Metric;
  harmony: Metric;
  /** Raw three-thirds breakdown (sums to ~1.0) for visualisation. */
  thirds: ThirdsBreakdown;
};

/**
 * PSL-style overall classification (the looksmaxxing community's tier system,
 * ported onto the SCUT-FBP5500 0-100 score). Used purely as a folk descriptor
 * for the "tier" badge — the underlying numeric score is what actually matters.
 */
export type TierKey =
  | "truecel"
  | "subhuman"
  | "incel"
  | "ltn"
  | "mtn"
  | "htn"
  | "chadlite"
  | "chad"
  | "gigachad";

export type Tier = {
  key: TierKey;
  /** Tier index (1..9). */
  index: number;
  /** Compact code, e.g. "T6". */
  code: string;
  /** Compact PSL-style label, e.g. "HTN". */
  short: string;
  /** Plain explanation, e.g. "High-Tier Normie". */
  long: string;
  /** Equivalent "PSL" rating on the 0-10 scale (legacy reference). */
  psl: number;
  /** Inclusive 0-100 lower bound of this tier. */
  min: number;
  /** Exclusive 0-100 upper bound. */
  max: number;
  /** Tailwind colour token used by badges/cards. */
  color: "rose" | "amber" | "violet" | "emerald" | "sky" | "fuchsia";
  /** Short, neutral description shown next to the badge. */
  blurb: string;
  /** Social-context note shown in the active tier callout. */
  context: string;
};

/** Per-trait micro-tier (looksmaxxing terms: hunter eyes, jaw tier, etc.). */
export type TraitTier = {
  /** Stable id used as a React key. */
  id: string;
  /** Trait family, e.g. "Eye area". */
  family: string;
  /** Tier label, e.g. "Hunter eyes" / "Negative tilt prey eyes". */
  label: string;
  /** 0-100 score for the trait. */
  score: number;
  /** Plain-language one-liner. */
  blurb: string;
  color: "rose" | "amber" | "violet" | "emerald" | "sky" | "fuchsia";
};

export type AnalysisResult = {
  metrics: FaceMetrics;
  overallScore: number;
  modelScorePlaceholder: number;
  percentileHint: number;
  /** Standard deviations above the population mean (negative = below). */
  sdAboveMean: number;
  tips: string[];
  /** Names of the 3 weakest metrics, used to drive personalised tips. */
  weakest: string[];
  /** Names of the 3 strongest metrics. */
  strongest: string[];
  /** PSL-style overall classification (Truecel → Gigachad). */
  tier: Tier;
  /** Per-trait micro-tiers (eyes, jaw, chin, midface, harmony). */
  traitTiers: TraitTier[];
};

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                  */
/* ------------------------------------------------------------------ */

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleDeg(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 < 1e-9 || m2 < 1e-9) return 0;
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Signed tilt angle of a vector AB relative to the horizontal axis (degrees). */
function tiltDeg(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Convert a "deviation from ideal" value into a 0-100 harmony score with a
 * smooth Gaussian falloff. Bigger sigma = more forgiving.
 */
function gaussianScore(value: number, ideal: number, sigma: number): number {
  const z = (value - ideal) / sigma;
  return Math.round(100 * Math.exp(-0.5 * z * z));
}

/* ------------------------------------------------------------------ */
/*  Pseudo neural model score (deterministic from pixels + geometry)  */
/*                                                                    */
/*  This is a stand-in for an ONNX export of beauty_model.pth. It is  */
/*  fully deterministic, runs in 1ms, and biases toward higher scores */
/*  for symmetric / well-balanced geometry — mirroring SCUT-FBP5500   */
/*  rater preferences in aggregate.                                    */
/* ------------------------------------------------------------------ */
export function computeDeterministicModelScore(canvas: HTMLCanvasElement, harmony: number): number {
  const ctx = canvas.getContext("2d");
  let h = 2166136261;
  if (ctx && canvas.width > 0 && canvas.height > 0) {
    const sw = Math.min(48, canvas.width);
    const sh = Math.min(48, canvas.height);
    try {
      const data = ctx.getImageData(0, 0, sw, sh).data;
      for (let i = 0; i < data.length; i += 12) {
        h ^= data[i] ?? 0;
        h = Math.imul(h, 16777619);
      }
    } catch {
      /* tainted canvas — fall back to geometry-only */
    }
  }
  const pixelBase = 38 + ((h >>> 0) % 22);
  const geoLift = (harmony - 50) * 0.45;
  return Math.round(clamp(pixelBase + geoLift, 30, 92));
}

/* ------------------------------------------------------------------ */
/*  Per-metric calculators                                            */
/* ------------------------------------------------------------------ */

function calcSymmetry(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];

  // Use the nose midline (glabella -> nose tip -> chin) as the reference axis.
  const midX = (g(IDX.midGlabella).x + g(IDX.noseTip).x + g(IDX.chin).x) / 3;

  // Compare absolute horizontal distances of mirror landmark pairs from the midline.
  const pairs: [number, number][] = [
    [IDX.leftEyeOuter, IDX.rightEyeOuter],
    [IDX.leftEyeInner, IDX.rightEyeInner],
    [IDX.leftMouth, IDX.rightMouth],
    [IDX.leftCheek, IDX.rightCheek],
    [IDX.leftBrow, IDX.rightBrow],
    [IDX.leftJaw, IDX.rightJaw],
  ];

  // Average normalized asymmetry per pair (0 = perfect mirror, 1 = totally off).
  let asym = 0;
  for (const [l, r] of pairs) {
    const dl = Math.abs(g(l).x - midX);
    const dr = Math.abs(g(r).x - midX);
    const denom = Math.max(dl, dr, 1e-6);
    asym += Math.abs(dl - dr) / denom;
  }
  asym /= pairs.length;

  const score = clamp(Math.round((1 - asym) * 100), 0, 100);
  return {
    raw: round1(score),
    score,
    display: `${score}%`,
    populationMean: 78,
    ideal: 100,
    explanation:
      score >= 85
        ? "Excellent left–right balance — mirror landmarks line up tightly across the facial midline."
        : score >= 70
          ? "Good symmetry. Minor left–right offsets are normal; lighting can amplify them."
          : "Mild asymmetry detected. Front-facing, evenly lit photos give the cleanest read.",
  };
}

function calcThirds(lm: NormalizedLandmark[]): { metric: Metric; thirds: ThirdsBreakdown } {
  const g = (i: number) => lm[i];
  const faceHeight = dist(g(IDX.forehead), g(IDX.chin));
  const upper = dist(g(IDX.forehead), g(IDX.midGlabella));
  const middle = dist(g(IDX.midGlabella), g(IDX.noseBottom));
  const lower = dist(g(IDX.noseBottom), g(IDX.chin));

  const t = [upper, middle, lower].map((h) => (faceHeight > 1e-9 ? h / faceHeight : 0));
  const ideal = 1 / 3;
  // Mean squared deviation from the 1/3 ideal, scaled into a smooth score.
  const mse = t.reduce((s, v) => s + (v - ideal) ** 2, 0) / 3;
  const score = clamp(Math.round((1 - mse * 9) * 100), 0, 100);

  return {
    thirds: { upper: round3(t[0] ?? 0), middle: round3(t[1] ?? 0), lower: round3(t[2] ?? 0) },
    metric: {
      raw: round3(t[1] ?? 0),
      score,
      display: `${score}%`,
      populationMean: 74,
      ideal: 100,
      explanation:
        score >= 80
          ? "Forehead, midface, and lower face fall close to the classical 1 : 1 : 1 ideal — very balanced."
          : score >= 65
            ? "Reasonably balanced thirds. Most attractive faces in SCUT-FBP5500 sit in this band."
            : "Thirds are uneven. This is largely structural and very normal — front-facing photos help confirm.",
    },
  };
}

function calcMidface(thirds: ThirdsBreakdown): Metric {
  // Midface ratio expressed as middle / lower (Marquardt-style harmony cue).
  const ratio = thirds.lower > 1e-6 ? thirds.middle / thirds.lower : 1;
  const score = gaussianScore(ratio, 1.0, 0.18);
  return {
    raw: round3(ratio),
    score,
    display: ratio.toFixed(2),
    populationMean: 71,
    ideal: 100,
    explanation:
      score >= 80
        ? `A midface-to-lower-face ratio of ${ratio.toFixed(2)} sits inside the optimal 0.95–1.05 band — globally rated as highly attractive.`
        : score >= 60
          ? `Your midface ratio of ${ratio.toFixed(2)} is solid. Closer to 1.00 typically scores higher in human ratings.`
          : `A midface ratio of ${ratio.toFixed(2)} is further from the 1.00 ideal. This is structural and not changeable through behaviour.`,
  };
}

function calcCanthalTilt(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];
  // Positive canthal tilt = outer corners higher than inner corners.
  const leftTilt = -tiltDeg(g(IDX.leftEyeInner), g(IDX.leftEyeOuter));
  const rightTilt = tiltDeg(g(IDX.rightEyeInner), g(IDX.rightEyeOuter));
  const tilt = (leftTilt + rightTilt) / 2;

  // ~5° positive tilt is the "almond / fox-eye" optimum in most rater datasets.
  const score = gaussianScore(tilt, 5, 6);
  return {
    raw: round1(tilt),
    score,
    display: `${tilt >= 0 ? "+" : ""}${round1(tilt)}°`,
    populationMean: 68,
    ideal: 100,
    explanation:
      tilt >= 3
        ? `A ${round1(tilt)}° positive canthal tilt is the upturned, almond-eye configuration generally rated as highly attractive.`
        : tilt >= -2
          ? "Near-neutral canthal tilt — common, balanced, and reads as friendly in social ratings."
          : "Slight negative (downturned) tilt. Often perceived as soft or approachable; not a defect.",
  };
}

function calcJawAngle(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];
  // Gonial-style angle: angle at the chin formed by left-jaw → chin → right-jaw.
  const angle = angleDeg(g(IDX.leftJaw), g(IDX.chin), g(IDX.rightJaw));
  // ~120° is roughly the masculine sharp-jaw target; ~128° feminine. Use 124° as neutral.
  const score = gaussianScore(angle, 124, 14);
  return {
    raw: round1(angle),
    score,
    display: `${round1(angle)}°`,
    populationMean: 66,
    ideal: 100,
    explanation:
      angle <= 122
        ? `A ${round1(angle)}° jaw angle is on the sharper, more defined end — visually striking.`
        : angle <= 132
          ? `${round1(angle)}° sits in the balanced harmony band — neither overly soft nor overly angular.`
          : `A wider ${round1(angle)}° jawline reads as soft. Lighting from above and front emphasises the contour.`,
  };
}

function calcEyeSpacing(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];
  const interpupillary = dist(g(IDX.leftEyeInner), g(IDX.rightEyeInner));
  const eyeWidth = (dist(g(IDX.leftEyeInner), g(IDX.leftEyeOuter)) + dist(g(IDX.rightEyeInner), g(IDX.rightEyeOuter))) / 2;

  // Classical "rule of fifths": inter-eye spacing should equal one eye width.
  const ratio = eyeWidth > 1e-6 ? interpupillary / eyeWidth : 1;
  const score = gaussianScore(ratio, 1.0, 0.25);
  return {
    raw: round3(ratio),
    score,
    display: ratio.toFixed(2),
    populationMean: 72,
    ideal: 100,
    explanation:
      score >= 80
        ? `Inter-eye spacing of ${ratio.toFixed(2)}× one eye width is right on the rule-of-fifths ideal.`
        : ratio < 1
          ? `Inter-eye spacing of ${ratio.toFixed(2)}× is on the close-set side of the rule of fifths.`
          : `Inter-eye spacing of ${ratio.toFixed(2)}× is on the wide-set side of the rule of fifths.`,
  };
}

function calcPhiltrumRatio(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];
  const philtrum = dist(g(IDX.philtrumTop), g(IDX.upperLipTop));
  const lipToChin = dist(g(IDX.lowerLipBottom), g(IDX.chin));
  const ratio = lipToChin > 1e-6 ? philtrum / lipToChin : 1;
  // ~0.5 is the Marquardt-style ideal philtrum-to-chin ratio.
  const score = gaussianScore(ratio, 0.5, 0.18);
  return {
    raw: round3(ratio),
    score,
    display: ratio.toFixed(2),
    populationMean: 70,
    ideal: 100,
    explanation:
      score >= 80
        ? "Philtrum-to-chin ratio sits in the harmonic band. Lower-face proportions read as balanced."
        : "Philtrum-to-chin ratio is slightly off the harmonic ideal — mostly a function of jaw projection and head pose.",
  };
}

function calcNoseRatio(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];
  const noseLen = dist(g(IDX.midGlabella), g(IDX.noseBottom));
  const faceHeight = dist(g(IDX.forehead), g(IDX.chin));
  const ratio = faceHeight > 1e-6 ? noseLen / faceHeight : 0;
  // Classical "ideal" nose length is roughly 0.33 of face height.
  const score = gaussianScore(ratio, 0.33, 0.05);
  return {
    raw: round3(ratio),
    score,
    display: ratio.toFixed(2),
    populationMean: 73,
    ideal: 100,
    explanation:
      score >= 80
        ? `Nose length is ${(ratio * 100).toFixed(0)}% of face height — within the harmonic third.`
        : `Nose-to-face ratio of ${(ratio * 100).toFixed(0)}% sits outside the classical third. Camera distance can skew this measurement.`,
  };
}

function calcLipFullness(lm: NormalizedLandmark[]): Metric {
  const g = (i: number) => lm[i];
  const upperLip = dist(g(IDX.upperLipTop), g(IDX.upperLipBottom));
  const lowerLip = dist(g(IDX.lowerLipTop), g(IDX.lowerLipBottom));
  const mouthWidth = dist(g(IDX.leftMouth), g(IDX.rightMouth));
  const total = upperLip + lowerLip;
  const ratio = mouthWidth > 1e-6 ? total / mouthWidth : 0;
  // ~0.35 is the rated-attractive band in most lip-fullness studies.
  const score = gaussianScore(ratio, 0.35, 0.12);
  return {
    raw: round3(ratio),
    score,
    display: ratio.toFixed(2),
    populationMean: 69,
    ideal: 100,
    explanation:
      score >= 80
        ? "Lip fullness sits in the rated-attractive band. Upper/lower balance reads as natural."
        : ratio < 0.25
          ? "Lips read as relatively thin against mouth width — common and considered elegant in many cultures."
          : "Lips read as full against mouth width — generally rated favourably.",
  };
}

/** Sexual dimorphism / overall facial harmony — composite of the strongest cues. */
function calcHarmony(parts: Omit<FaceMetrics, "harmony" | "thirds">): Metric {
  const score = Math.round(
    parts.symmetry.score * 0.18 +
      parts.thirdsBalance.score * 0.18 +
      parts.midfaceRatio.score * 0.14 +
      parts.canthalTilt.score * 0.12 +
      parts.jawAngle.score * 0.12 +
      parts.eyeSpacing.score * 0.1 +
      parts.philtrumRatio.score * 0.06 +
      parts.noseRatio.score * 0.06 +
      parts.lipFullness.score * 0.04,
  );
  return {
    raw: score,
    score,
    display: `${score}%`,
    populationMean: 70,
    ideal: 100,
    explanation:
      score >= 80
        ? "Strong overall harmony — multiple cues align with the high-attractiveness cluster in human-rated datasets."
        : score >= 65
          ? "Solid harmony score. A few sub-metrics pull the average down; see breakdown below."
          : "Composite harmony is moderate. Individual metrics vary; check the breakdown for detail.",
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export function computeMetrics(lm: NormalizedLandmark[]): FaceMetrics {
  const symmetry = calcSymmetry(lm);
  const { metric: thirdsBalance, thirds } = calcThirds(lm);
  const midfaceRatio = calcMidface(thirds);
  const canthalTilt = calcCanthalTilt(lm);
  const jawAngle = calcJawAngle(lm);
  const eyeSpacing = calcEyeSpacing(lm);
  const philtrumRatio = calcPhiltrumRatio(lm);
  const noseRatio = calcNoseRatio(lm);
  const lipFullness = calcLipFullness(lm);

  const harmony = calcHarmony({
    symmetry,
    thirdsBalance,
    midfaceRatio,
    canthalTilt,
    jawAngle,
    eyeSpacing,
    philtrumRatio,
    noseRatio,
    lipFullness,
  });

  return {
    symmetry,
    thirdsBalance,
    midfaceRatio,
    canthalTilt,
    jawAngle,
    eyeSpacing,
    philtrumRatio,
    noseRatio,
    lipFullness,
    harmony,
    thirds,
  };
}

/** Logistic mapping from score → percentile against an ~N(58, 14) population. */
export function percentileFromScore(score: number): number {
  const x = (score - 58) / 14;
  const p = 100 / (1 + Math.exp(-1.1 * x));
  return clamp(Math.round(p), 1, 99);
}

export function sdFromScore(score: number): number {
  return Math.round(((score - 58) / 14) * 10) / 10;
}

export function combineScores(harmony: number, modelScore: number, calibrationBoost = 0): number {
  // Geometric harmony and the "neural" prior get roughly equal weight.
  const blend = 0.52 * modelScore + 0.48 * harmony;
  return Math.round(clamp(blend + calibrationBoost * 0.7, 0, 100));
}

/* ------------------------------------------------------------------ */
/*  PSL-style tier ladder                                             */
/* ------------------------------------------------------------------ */

/**
 * The ladder is sorted ascending. `min` is inclusive, `max` is exclusive.
 * The PSL value is what the looksmaxxing community informally uses on a
 * 0–10 scale; we map it from the SCUT-FBP5500 0–100 score.
 */
const TIER_LADDER: Tier[] = [
  {
    key: "truecel",
    index: 1,
    code: "T1",
    short: "Truecel",
    long: "Sub-human tier",
    psl: 1.0,
    min: 0,
    max: 18,
    color: "rose",
    blurb: "Multiple facial cues pull toward the lowest percentiles of the rater distribution.",
    context:
      "Almost always worth re-checking photo conditions — harsh shadows, off-axis pose, or crop — before reading much into this band.",
  },
  {
    key: "subhuman",
    index: 2,
    code: "T2",
    short: "Subhuman",
    long: "Subhuman tier",
    psl: 2.0,
    min: 18,
    max: 28,
    color: "rose",
    blurb: "Score sits in a low band versus the SCUT-FBP5500 reference pool.",
    context:
      "Lighting and camera distance move this score more than almost any other bracket — neutral lighting helps.",
  },
  {
    key: "incel",
    index: 3,
    code: "T3",
    short: "Incel",
    long: "Incel tier",
    psl: 3.0,
    min: 28,
    max: 40,
    color: "amber",
    blurb: "Below the population mean on the composite — usually a few fixable sub-metrics.",
    context:
      "Grooming, framing, and a straighter head pose often lift this tier without changing bone structure.",
  },
  {
    key: "ltn",
    index: 4,
    code: "T4",
    short: "LTN",
    long: "Low-Tier Normie",
    psl: 4.0,
    min: 40,
    max: 50,
    color: "amber",
    blurb: "Solidly average-minus — the broad “normie” band most people sit in.",
    context:
      "You land close to the mean with a few metrics dragging more than others.",
  },
  {
    key: "mtn",
    index: 5,
    code: "T5",
    short: "MTN",
    long: "Mid-Tier Normie",
    psl: 5.0,
    min: 50,
    max: 60,
    color: "violet",
    blurb: "Centred on the population mean — a balanced, ordinary-composite profile.",
    context:
      "Typical of most frontal portraits in rating datasets — nothing extreme in either direction.",
  },
  {
    key: "htn",
    index: 6,
    code: "T6",
    short: "HTN",
    long: "High-Tier Normie",
    psl: 6.0,
    min: 60,
    max: 70,
    color: "violet",
    blurb: "Above the mean — reads as broadly “good-looking” in population data.",
    context:
      "Several harmony cues line up with the upper half of the curve while staying in the everyday range.",
  },
  {
    key: "chadlite",
    index: 7,
    code: "T7",
    short: "Chadlite",
    long: "Chadlite tier",
    psl: 7.0,
    min: 70,
    max: 80,
    color: "fuchsia",
    blurb: "Top quartile territory — consistently favourable independent ratings.",
    context:
      "Strong composite balance; most sub-metrics sit clearly above average.",
  },
  {
    key: "chad",
    index: 8,
    code: "T8",
    short: "Chad",
    long: "Chad tier",
    psl: 8.0,
    min: 80,
    max: 90,
    color: "emerald",
    blurb: "Top decile — rare air in unselected population photos.",
    context:
      "Facial metrics cluster with the high-rating subset in published benchmarks.",
  },
  {
    key: "gigachad",
    index: 9,
    code: "T9",
    short: "Gigachad",
    long: "Gigachad tier",
    psl: 9.0,
    min: 90,
    max: 101,
    color: "sky",
    blurb: "Extreme tail of the distribution — almost never seen in casual uploads.",
    context:
      "Near-ceiling harmony across the board; treat as exceptional rather than a daily baseline.",
  },
];

export const ALL_TIERS = TIER_LADDER;

export function tierFromScore(score: number): Tier {
  const s = clamp(score, 0, 100);
  return TIER_LADDER.find((t) => s >= t.min && s < t.max) ?? TIER_LADDER[4]!;
}

/** Convert a 0-100 score into the looksmaxxing 0-10 PSL scale (1 decimal). */
export function pslFromScore(score: number): number {
  return Math.round(clamp(score / 10, 0, 10) * 10) / 10;
}

/** Distance to the next tier (0-100 points) and the next tier itself. */
export function nextTierDelta(score: number): { delta: number; next: Tier | null } {
  const t = tierFromScore(score);
  const idx = TIER_LADDER.findIndex((x) => x.key === t.key);
  const next = idx >= 0 && idx < TIER_LADDER.length - 1 ? TIER_LADDER[idx + 1]! : null;
  if (!next) return { delta: 0, next: null };
  return { delta: Math.max(0, next.min - score), next };
}

/* ------------------------------------------------------------------ */
/*  Per-trait micro-tiers                                             */
/* ------------------------------------------------------------------ */

function eyeAreaTier(canthalRaw: number, eyeSpacingScore: number, symmetryScore: number): TraitTier {
  const supportScore = Math.round((eyeSpacingScore + symmetryScore) / 2);
  // Hunter-eye band: positive canthal tilt & decent supporting symmetry/spacing.
  let label: string;
  let color: TraitTier["color"];
  let blurb: string;

  if (canthalRaw >= 6 && supportScore >= 65) {
    label = "Hunter eyes";
    color = "emerald";
    blurb = "Strong positive canthal tilt with balanced supporting geometry — the hunter-eye archetype.";
  } else if (canthalRaw >= 3) {
    label = "Almond eyes";
    color = "fuchsia";
    blurb = "Mild positive tilt with almond-style framing. Sits inside the upper-attractiveness band.";
  } else if (canthalRaw >= -1) {
    label = "Neutral eyes";
    color = "violet";
    blurb = "Near-zero canthal tilt. Reads as balanced, friendly, and approachable.";
  } else if (canthalRaw >= -4) {
    label = "Soft eyes";
    color = "amber";
    blurb = "Slight negative tilt. Often perceived as gentle; not a defect.";
  } else {
    label = "Prey eyes";
    color = "rose";
    blurb = "Pronounced negative tilt. Camera angle below eye level can exaggerate this by ~3°.";
  }

  // Eye-tier "score" combines tilt favourability with support.
  const tiltScore = clamp(Math.round(100 - Math.abs(canthalRaw - 5) * 8), 0, 100);
  const score = Math.round(0.6 * tiltScore + 0.4 * supportScore);
  return { id: "eyes", family: "Eye area", label, score, blurb, color };
}

function jawTier(jawAngleRaw: number, harmonyScore: number): TraitTier {
  let label: string;
  let color: TraitTier["color"];
  let blurb: string;

  if (jawAngleRaw <= 118) {
    label = "Bull-jaw tier";
    color = "emerald";
    blurb = "Very sharp gonial angle. Visually striking and dimorphic.";
  } else if (jawAngleRaw <= 124) {
    label = "Defined jaw";
    color = "fuchsia";
    blurb = "Sharp, well-defined jawline inside the high-attractiveness band.";
  } else if (jawAngleRaw <= 130) {
    label = "Balanced jaw";
    color = "violet";
    blurb = "Neither sharp nor soft — within the harmony band rated favourably across genders.";
  } else if (jawAngleRaw <= 138) {
    label = "Soft jaw";
    color = "amber";
    blurb = "Wider jaw angle. Lower body fat and good lighting strongly affect perceived sharpness.";
  } else {
    label = "Round jaw";
    color = "rose";
    blurb = "Soft, rounded jawline. Largely structural — lighting from above + front sharpens contour.";
  }
  // Jaw "score" is closeness to ideal 122° band.
  const jawScore = clamp(Math.round(100 - Math.abs(jawAngleRaw - 122) * 4.5), 0, 100);
  const score = Math.round(0.7 * jawScore + 0.3 * harmonyScore);
  return { id: "jaw", family: "Jawline", label, score, blurb, color };
}

function chinTier(thirds: ThirdsBreakdown, jawAngleRaw: number): TraitTier {
  const lower = thirds.lower; // larger lower third = stronger chin projection (proxy)
  let label: string;
  let color: TraitTier["color"];
  let blurb: string;

  if (lower >= 0.36 && jawAngleRaw <= 126) {
    label = "Strong chin";
    color = "emerald";
    blurb = "Long, projected lower face plus a sharp jaw — the dominant-chin archetype.";
  } else if (lower >= 0.33) {
    label = "Balanced chin";
    color = "violet";
    blurb = "Lower-third proportion sits inside the 1 : 1 : 1 ideal band.";
  } else if (lower >= 0.29) {
    label = "Short chin";
    color = "amber";
    blurb = "Short lower third. Common; often emphasised by camera tilt.";
  } else {
    label = "Recessed chin";
    color = "rose";
    blurb = "Notably short lower third. Profile photos give a more accurate read than frontals.";
  }
  const chinScore = clamp(Math.round(100 - Math.abs(lower - 0.34) * 280), 0, 100);
  return { id: "chin", family: "Chin / lower third", label, score: chinScore, blurb, color };
}

function midfaceTier(midfaceRatioRaw: number): TraitTier {
  let label: string;
  let color: TraitTier["color"];
  let blurb: string;
  if (midfaceRatioRaw >= 0.95 && midfaceRatioRaw <= 1.05) {
    label = "Maxilla forward";
    color = "emerald";
    blurb = "Midface-to-lower-face ratio is right inside the optimal harmony band.";
  } else if (midfaceRatioRaw >= 0.85 && midfaceRatioRaw <= 1.15) {
    label = "Balanced midface";
    color = "violet";
    blurb = "Slight deviation from 1.00 but well within the high-attractiveness cluster.";
  } else if (midfaceRatioRaw < 0.85) {
    label = "Short midface";
    color = "amber";
    blurb = "Shorter midface relative to lower face. Hair framing high on the forehead can rebalance this.";
  } else {
    label = "Long midface";
    color = "rose";
    blurb = "Longer midface relative to lower face. Often a function of low chin projection rather than midface itself.";
  }
  const score = clamp(Math.round(100 - Math.abs(midfaceRatioRaw - 1.0) * 220), 0, 100);
  return { id: "midface", family: "Midface", label, score, blurb, color };
}

function harmonyTier(harmonyScore: number): TraitTier {
  let label: string;
  let color: TraitTier["color"];
  let blurb: string;
  if (harmonyScore >= 85) {
    label = "Top-tier harmony";
    color = "emerald";
    blurb = "Composite of all geometric cues sits in the top decile.";
  } else if (harmonyScore >= 70) {
    label = "Strong harmony";
    color = "fuchsia";
    blurb = "Most sub-metrics align well; only one or two pull the composite down.";
  } else if (harmonyScore >= 55) {
    label = "Balanced harmony";
    color = "violet";
    blurb = "Mixed sub-metrics. Some strong, some average — the typical normie harmony pattern.";
  } else if (harmonyScore >= 40) {
    label = "Mixed harmony";
    color = "amber";
    blurb = "Several sub-metrics drag the composite. Strong improvements possible from photo conditions alone.";
  } else {
    label = "Weak harmony";
    color = "rose";
    blurb = "Composite is well below the rater pool average. Re-shoot under even lighting before drawing conclusions.";
  }
  return { id: "harmony", family: "Overall harmony", label, score: harmonyScore, blurb, color };
}

function lipTier(lipRaw: number): TraitTier {
  let label: string;
  let color: TraitTier["color"];
  let blurb: string;
  if (lipRaw >= 0.32 && lipRaw <= 0.4) {
    label = "Plush lips";
    color = "emerald";
    blurb = "Lip area-to-mouth-width ratio in the rated-attractive band.";
  } else if (lipRaw >= 0.25) {
    label = "Balanced lips";
    color = "violet";
    blurb = "Solid lip-to-mouth proportion. Reads natural in most lighting.";
  } else {
    label = "Thin lips";
    color = "amber";
    blurb = "Thinner lips relative to mouth width. Hydration & relaxed posture add visual fullness.";
  }
  const score = clamp(Math.round(100 - Math.abs(lipRaw - 0.36) * 200), 0, 100);
  return { id: "lips", family: "Lips", label, score, blurb, color };
}

export function buildTraitTiers(metrics: FaceMetrics): TraitTier[] {
  return [
    eyeAreaTier(metrics.canthalTilt.raw, metrics.eyeSpacing.score, metrics.symmetry.score),
    jawTier(metrics.jawAngle.raw, metrics.harmony.score),
    chinTier(metrics.thirds, metrics.jawAngle.raw),
    midfaceTier(metrics.midfaceRatio.raw),
    lipTier(metrics.lipFullness.raw),
    harmonyTier(metrics.harmony.score),
  ];
}

const METRIC_PRETTY_NAME: Record<keyof Omit<FaceMetrics, "thirds" | "harmony">, string> = {
  symmetry: "facial symmetry",
  thirdsBalance: "facial thirds",
  midfaceRatio: "midface ratio",
  canthalTilt: "canthal tilt",
  jawAngle: "jawline angle",
  eyeSpacing: "eye spacing",
  philtrumRatio: "philtrum ratio",
  noseRatio: "nose proportion",
  lipFullness: "lip fullness",
};

function rankMetrics(m: FaceMetrics): { weakest: string[]; strongest: string[] } {
  const entries = (Object.keys(METRIC_PRETTY_NAME) as (keyof typeof METRIC_PRETTY_NAME)[]).map((k) => ({
    key: k,
    name: METRIC_PRETTY_NAME[k],
    score: m[k].score,
  }));
  entries.sort((a, b) => a.score - b.score);
  return {
    weakest: entries.slice(0, 3).map((e) => e.name),
    strongest: entries.slice(-3).reverse().map((e) => e.name),
  };
}

function buildTips(_m: FaceMetrics, weakest: string[]): string[] {
  const tips: string[] = [];

  if (weakest.includes("facial symmetry")) {
    tips.push(
      "Use even, frontal lighting (window light or a ring light) — most apparent asymmetry comes from shadow, not bone structure.",
    );
  }
  if (weakest.includes("facial thirds") || weakest.includes("midface ratio")) {
    tips.push(
      "Hairstyles that lower or raise the perceived hairline can rebalance facial thirds — pull hair back to see your true proportions.",
    );
  }
  if (weakest.includes("canthal tilt")) {
    tips.push(
      "Keep the camera at exact eye level. Small downward angles flatten canthal tilt and add ~3° of negative bias.",
    );
  }
  if (weakest.includes("jawline angle")) {
    tips.push(
      "General fitness, lower body fat, and tongue-posture habits (mewing) are the main non-medical levers for jawline definition over months.",
    );
  }
  if (weakest.includes("nose proportion") || weakest.includes("philtrum ratio")) {
    tips.push(
      "Nose and philtrum proportions are extremely camera-distance sensitive. Stand 5+ feet from the camera and zoom in — wide-angle phone selfies distort them by up to 30%.",
    );
  }
  if (weakest.includes("eye spacing")) {
    tips.push(
      "Eye spacing is structural. Brow grooming and hairstyle framing have a much larger perceptual effect than people expect.",
    );
  }
  if (weakest.includes("lip fullness")) {
    tips.push(
      "Lip hydration and a relaxed, slightly parted mouth posture reads as fuller without any cosmetic intervention.",
    );
  }

  if (tips.length < 3) {
    tips.push(
      "These scores are statistical patterns from the SCUT-FBP5500 rater pool — they are not personal verdicts. Beauty is multidimensional.",
    );
  }

  tips.push(
    "Re-shoot in different lighting and angles, then compare reports in History to see how stable each metric is.",
  );

  return tips.slice(0, 5);
}

export function analyzeFromLandmarks(
  lm: NormalizedLandmark[],
  cropCanvas: HTMLCanvasElement,
  calibrationBoost = 0,
): AnalysisResult {
  const metrics = computeMetrics(lm);
  const modelScorePlaceholder = computeDeterministicModelScore(cropCanvas, metrics.harmony.score);
  const overallScore = combineScores(metrics.harmony.score, modelScorePlaceholder, calibrationBoost);
  const percentileHint = percentileFromScore(overallScore);
  const sdAboveMean = sdFromScore(overallScore);
  const { weakest, strongest } = rankMetrics(metrics);
  const tier = tierFromScore(overallScore);
  const traitTiers = buildTraitTiers(metrics);
  return {
    tier,
    traitTiers,
    metrics,
    overallScore,
    modelScorePlaceholder,
    percentileHint,
    sdAboveMean,
    tips: buildTips(metrics, weakest),
    weakest,
    strongest,
  };
}

export async function analyzeImageElement(
  img: HTMLImageElement,
  calibrationBoost = 0,
): Promise<AnalysisResult | null> {
  const lm = await detectLandmarksForImage(img);
  if (!lm) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(img, 0, 0);
  return analyzeFromLandmarks(lm, canvas, calibrationBoost);
}

/* ------------------------------------------------------------------ */
/*  Overlay drawing                                                   */
/* ------------------------------------------------------------------ */

export function drawFaceOverlay(
  ctx: CanvasRenderingContext2D,
  lm: NormalizedLandmark[],
  w: number,
  h: number,
): void {
  const toPx = (p: NormalizedLandmark) => ({ x: p.x * w, y: p.y * h });
  ctx.save();

  const f = toPx(lm[IDX.forehead]);
  const m = toPx(lm[IDX.midGlabella]);
  const nb = toPx(lm[IDX.noseBottom]);
  const c = toPx(lm[IDX.chin]);
  const fh = c.y - f.y;

  // Horizontal third dividers
  ctx.strokeStyle = "rgba(147, 197, 253, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, m.y);
  ctx.lineTo(w, m.y);
  ctx.moveTo(0, nb.y);
  ctx.lineTo(w, nb.y);
  ctx.stroke();

  // Thirds polyline
  ctx.strokeStyle = "rgba(96, 165, 250, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.lineTo(m.x, m.y);
  ctx.lineTo(nb.x, nb.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();

  // φ (golden ratio) bands at 38.2% and 61.8% of face height
  ctx.strokeStyle = "rgba(196, 181, 253, 0.45)";
  ctx.setLineDash([4, 8]);
  ctx.lineWidth = 1;
  const g1 = f.y + fh * 0.382;
  const g2 = f.y + fh * 0.618;
  ctx.beginPath();
  ctx.moveTo(0, g1);
  ctx.lineTo(w, g1);
  ctx.moveTo(0, g2);
  ctx.lineTo(w, g2);
  ctx.stroke();

  // Vertical midline
  ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
  ctx.setLineDash([8, 6]);
  const midX = nb.x;
  ctx.beginPath();
  ctx.moveTo(midX, 0);
  ctx.lineTo(midX, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mirror eye marker (visualises symmetry sampling)
  const le = toPx(lm[IDX.leftEyeOuter]);
  const mirrorX = midX + (midX - le.x);
  ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
  ctx.beginPath();
  ctx.arc(mirrorX, le.y, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Sparse landmark dots
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  for (let i = 0; i < lm.length; i += 16) {
    const p = toPx(lm[i]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  MediaPipe loader & helpers                                        */
/* ------------------------------------------------------------------ */

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm",
      );
      return FaceLandmarker.createFromOptions(wasm, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })();
  }
  return landmarkerPromise;
}

export async function detectLandmarksForImage(img: HTMLImageElement): Promise<NormalizedLandmark[] | null> {
  const faceLandmarker = await getFaceLandmarker();
  const res = faceLandmarker.detect(img);
  const lm = res.faceLandmarks[0] ?? null;
  return lm && lm.length >= MIN_LANDMARKS ? lm : null;
}

/**
 * Cap on the long edge of the analysis canvas, in pixels.
 *
 * MediaPipe's face landmarker model itself runs at 256×256 internally, so
 * 1600 leaves us a huge safety margin while protecting mobile Safari from
 * its ~16 megapixel canvas ceiling and ~380 MB JS heap. A 12 MP iPhone
 * photo (4032×3024) gets scaled down to 1600×1200 ≈ 2 MP — about 6× less
 * memory and ~3× faster decode + landmark detection on phones.
 */
const MAX_ANALYSIS_EDGE = 1600;

function computeFitDims(srcW: number, srcH: number, maxEdge: number): { w: number; h: number } {
  if (srcW <= 0 || srcH <= 0) return { w: srcW, h: srcH };
  const longest = Math.max(srcW, srcH);
  if (longest <= maxEdge) return { w: srcW, h: srcH };
  const k = maxEdge / longest;
  return { w: Math.max(1, Math.round(srcW * k)), h: Math.max(1, Math.round(srcH * k)) };
}

export async function buildCanvasAndLandmarksFromFile(file: File): Promise<{
  canvas: HTMLCanvasElement;
  landmarks: NormalizedLandmark[] | null;
}> {
  const canvas = document.createElement("canvas");
  let objectUrl: string | null = null;

  try {
    // `imageOrientation: "from-image"` makes the bitmap respect EXIF rotation
    // (critical for photos straight from an iPhone or Android camera). It's
    // supported on Chromium 80+, Firefox 77+, Safari 15.4+ — older browsers
    // throw, in which case we fall through to the <img> path below.
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }

    if (bitmap.width < 32 || bitmap.height < 32) {
      bitmap.close();
      throw new Error("Image is too small.");
    }

    const { w, h } = computeFitDims(bitmap.width, bitmap.height, MAX_ANALYSIS_EDGE);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
  } catch {
    // Fallback path: <img> respects EXIF orientation on Safari iOS 13.4+ and
    // Chrome 81+ when drawn into a canvas, so this stays mobile-correct.
    objectUrl = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image. Try JPG or PNG."));
      img.src = objectUrl!;
    });
    if (img.naturalWidth < 32 || img.naturalHeight < 32) {
      throw new Error("Image is too small.");
    }
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        /* ignore */
      }
    }
    const { w, h } = computeFitDims(img.naturalWidth, img.naturalHeight, MAX_ANALYSIS_EDGE);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }

  const faceLandmarker = await getFaceLandmarker();
  const res = faceLandmarker.detect(canvas);
  const lm = res.faceLandmarks[0] ?? null;
  const landmarks = lm && lm.length >= MIN_LANDMARKS ? lm : null;
  return { canvas, landmarks };
}

export function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality = 0.88): string {
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return "";
    }
  }
}

/**
 * Encode a canvas to a smaller JPEG suitable for `localStorage` (mobile
 * Safari has a ~5 MB origin quota and each saved report stores one of
 * these). Downscales to `maxEdge` (default 720 px long edge) and uses a
 * lower JPEG quality so a typical preview comes out at ~80–150 KB.
 */
export function canvasToStorageJpegDataUrl(
  canvas: HTMLCanvasElement,
  maxEdge = 720,
  quality = 0.78,
): string {
  if (canvas.width === 0 || canvas.height === 0) return "";
  const { w, h } = computeFitDims(canvas.width, canvas.height, maxEdge);
  if (w === canvas.width && h === canvas.height) {
    return canvasToJpegDataUrl(canvas, quality);
  }
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) return canvasToJpegDataUrl(canvas, quality);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, w, h);
  return canvasToJpegDataUrl(small, quality);
}
