import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/** Mediapipe indices — local to avoid circular import from faceAnalysis. */
const EYE = {
  leftInner: 133,
  leftOuter: 33,
  leftTop: 159,
  leftBottom: 145,
  rightInner: 362,
  rightOuter: 263,
  rightTop: 386,
  rightBottom: 374,
  noseTip: 1,
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type LandmarkPoseDiagnostics = {
  rollDeg: number;
  yawDeg: number;
  detectionConfidence: number;
  poseWarning: string | null;
  severeYaw: boolean;
};

/** Rotate (x,y) around (cx,cy) by radians (positive = CCW). */
function rotateAround(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rad: number,
): { x: number; y: number } {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function eyeCenterAvg(lm: NormalizedLandmark[], inner: number, outer: number, top: number, bottom: number) {
  const a = lm[inner]!;
  const b = lm[outer]!;
  const t = lm[top]!;
  const u = lm[bottom]!;
  return { x: (a.x + b.x + t.x + u.x) / 4, y: (a.y + b.y + t.y + u.y) / 4 };
}

/**
 * Estimate head roll from inter-eye axis; correct all XY by inverse rotation around eye midpoint.
 */
export function rollCorrectLandmarks(lm: NormalizedLandmark[]): {
  landmarks: NormalizedLandmark[];
  rollDeg: number;
} {
  const leftC = eyeCenterAvg(lm, EYE.leftInner, EYE.leftOuter, EYE.leftTop, EYE.leftBottom);
  const rightC = eyeCenterAvg(lm, EYE.rightInner, EYE.rightOuter, EYE.rightTop, EYE.rightBottom);
  const rollRad = Math.atan2(rightC.y - leftC.y, rightC.x - leftC.x);
  const rollDeg = (rollRad * 180) / Math.PI;
  const cx = (leftC.x + rightC.x) / 2;
  const cy = (leftC.y + rightC.y) / 2;

  const landmarks = lm.map((p) => {
    const q = rotateAround(p.x, p.y, cx, cy, -rollRad);
    return { ...p, x: q.x, y: q.y };
  });
  return { landmarks, rollDeg };
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Crude yaw estimate on roll-corrected landmarks: nose vs eye midline + eye-width asymmetry.
 */
export function estimateYawDegrees(lm: NormalizedLandmark[]): number {
  const g = (i: number) => lm[i]!;
  const leftC = eyeCenterAvg(lm, EYE.leftInner, EYE.leftOuter, EYE.leftTop, EYE.leftBottom);
  const rightC = eyeCenterAvg(lm, EYE.rightInner, EYE.rightOuter, EYE.rightTop, EYE.rightBottom);
  const midEyes = { x: (leftC.x + rightC.x) / 2, y: (leftC.y + rightC.y) / 2 };
  const ipd = Math.max(1e-6, dist2(leftC, rightC));
  const nose = g(EYE.noseTip);
  const horizontalOffset = Math.abs(nose.x - midEyes.x) / ipd;

  const lw = dist2(g(EYE.leftInner), g(EYE.leftOuter));
  const rw = dist2(g(EYE.rightInner), g(EYE.rightOuter));
  const mx = Math.max(lw, rw, 1e-6);
  const eyeAsym = Math.abs(lw - rw) / mx;

  // Heuristic degrees: offset and asymmetry both rise with yaw.
  const deg = clamp(55 * horizontalOffset + 35 * eyeAsym, 0, 40);
  return round1(deg);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * Map pose quality to 0–100 “detection / pose confidence” for UI gating.
 */
export function computePoseDetectionConfidence(rollDeg: number, yawDeg: number): number {
  let c = 100;
  c -= Math.min(30, Math.abs(rollDeg) * 1.8);
  c -= Math.min(45, yawDeg * 2.2);
  return clamp(Math.round(c), 0, 100);
}

const YAW_WARN_DEG = 15;

/**
 * Full pipeline: roll-corrected landmarks + diagnostics for confidence / warnings.
 */
export function prepareLandmarksForMetrics(lm: NormalizedLandmark[]): {
  landmarks: NormalizedLandmark[];
  pose: LandmarkPoseDiagnostics;
} {
  const { landmarks, rollDeg } = rollCorrectLandmarks(lm);
  const yawDeg = estimateYawDegrees(landmarks);
  const detectionConfidence = computePoseDetectionConfidence(rollDeg, yawDeg);
  const severeYaw = yawDeg > YAW_WARN_DEG;
  const poseWarning = severeYaw
    ? "Turn your face more straight toward the camera — side angle can skew measurements."
    : Math.abs(rollDeg) > 12
      ? "Slight head tilt detected — for best results keep your head level with the guide."
      : null;

  return {
    landmarks,
    pose: {
      rollDeg: round1(rollDeg),
      yawDeg,
      detectionConfidence,
      poseWarning,
      severeYaw,
    },
  };
}
