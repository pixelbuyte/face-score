export type ShoulderWidth = "narrow" | "average" | "wide";
export type Somatotype = "ectomorph" | "mesomorph" | "endomorph";
export type BodySex = "male" | "female";

export type BodyProfileInput = {
  heightCm: number;
  weightKg: number;
  shoulder: ShoulderWidth;
  somatotype: Somatotype;
  sex: BodySex;
};

export type BodyProfileResult = BodyProfileInput & {
  bmi: number;
  bmiCategory: string;
  shoulderToWaistRatio: number;
  frameRating: number;
  /** 0–100 for combining with face score */
  bodyScore: number;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  return "Obese range";
}

/** Heuristic V-taper style ratio from shoulder pick + somatotype (not measured). */
function shoulderToWaist(input: BodyProfileInput): number {
  const base =
    input.shoulder === "narrow" ? 1.38 : input.shoulder === "wide" ? 1.68 : 1.52;
  const somaAdj =
    input.somatotype === "mesomorph" ? 1.05 : input.somatotype === "endomorph" ? 0.94 : 1.0;
  const sexAdj = input.sex === "male" ? 1.02 : 0.98;
  return Math.round(base * somaAdj * sexAdj * 100) / 100;
}

/** 1–10 frame / proportion score from BMI band + ratio. */
function frameRating10(input: BodyProfileInput, ratio: number, bmi: number): number {
  let r = 5.5;
  if (bmi >= 18.5 && bmi < 25) r += 1.2;
  else if (bmi >= 25 && bmi < 28) r += 0.3;
  else if (bmi < 18.5) r -= 0.4;
  else r -= 0.8;

  if (input.sex === "male") {
    if (ratio >= 1.55) r += 1.3;
    else if (ratio >= 1.45) r += 0.6;
  } else {
    if (ratio >= 1.42) r += 1.0;
    else if (ratio >= 1.35) r += 0.5;
  }

  if (input.somatotype === "mesomorph") r += 0.5;
  if (input.somatotype === "ectomorph") r += input.shoulder === "wide" ? 0.4 : -0.1;

  return clamp(Math.round(r * 10) / 10, 1, 10);
}

export function analyzeBodyProfile(input: BodyProfileInput): BodyProfileResult {
  const hM = Math.max(input.heightCm / 100, 0.01);
  const bmi = Math.round(((input.weightKg / (hM * hM)) * 10)) / 10;
  const ratio = shoulderToWaist(input);
  const frame = frameRating10(input, ratio, bmi);
  const bodyScore = clamp(Math.round((frame / 10) * 75 + (bmi >= 18 && bmi <= 26 ? 20 : 10) + ratio * 2), 0, 100);

  return {
    ...input,
    bmi,
    bmiCategory: bmiCategory(bmi),
    shoulderToWaistRatio: ratio,
    frameRating: frame,
    bodyScore,
  };
}

export function feetInchesToCm(ft: number, inch: number) {
  return Math.round(((ft * 12 + inch) * 2.54) * 10) / 10;
}

export function cmToFeetInches(cm: number) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return { ft, inch };
}

export function lbsToKg(lbs: number) {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

export function kgToLbs(kg: number) {
  return Math.round((kg / 0.453592) * 10) / 10;
}

export function totalSmv(faceScore: number, bodyScore: number | null) {
  if (bodyScore == null) return faceScore;
  return Math.round(clamp(0.55 * faceScore + 0.45 * bodyScore, 0, 100));
}
