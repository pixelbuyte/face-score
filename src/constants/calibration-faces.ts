/**
 * Curated portrait pool for pairwise calibration.
 *
 * Source: randomuser.me public stock portraits (no API key, stable URLs, frontal,
 * neutral, photo-realistic). Used only for "which face do you find more
 * attractive?" style preference learning — never sent anywhere.
 */
const MEN_IDS = [4, 8, 11, 15, 17, 22, 27, 33, 41, 44, 46, 52, 55, 61, 64, 69, 73, 78, 83, 89, 92, 96];
const WOMEN_IDS = [3, 9, 12, 18, 23, 27, 32, 34, 39, 41, 45, 47, 52, 56, 58, 63, 67, 71, 76, 79, 82, 88];

const men = MEN_IDS.map((n) => `https://randomuser.me/api/portraits/men/${n}.jpg`);
const women = WOMEN_IDS.map((n) => `https://randomuser.me/api/portraits/women/${n}.jpg`);

/** Interleaved so adjacent picks tend to be diverse. */
export const CALIBRATION_FACE_URLS: string[] = men.flatMap((m, i) => {
  const w = women[i];
  return w ? [m, w] : [m];
});

/** Number of pairwise votes that "calibrates" the model. */
export const CALIBRATION_TARGET_VOTES = 12;
