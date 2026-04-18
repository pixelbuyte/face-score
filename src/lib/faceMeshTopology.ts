import { FaceLandmarker } from "@mediapipe/tasks-vision";

/**
 * MediaPipe Tasks Vision exposes the face mesh topology as static `Connection[]`
 * arrays on `FaceLandmarker`. Each `Connection` is `{ start, end }` — NOT a
 * `[number, number]` tuple, so we normalise to tuples here.
 *
 * NOTE: We intentionally do not import `@mediapipe/face_mesh`. That package
 * ships only a UMD bundle (`face_mesh.js`) that side-effects `window` and does
 * not provide ESM exports. Importing constants like `FACEMESH_TESSELATION`
 * from it returns `undefined`, which crashes spread/destructure in production
 * builds with errors like "n is not iterable".
 */

type Connection = { start: number; end: number };

function toPairs(conns: ReadonlyArray<Connection> | undefined | null): Array<[number, number]> {
  if (!conns) return [];
  const out: Array<[number, number]> = [];
  for (let i = 0; i < conns.length; i++) {
    const c = conns[i];
    if (!c) continue;
    out.push([c.start, c.end]);
  }
  return out;
}

const TESSELATION = toPairs(FaceLandmarker.FACE_LANDMARKS_TESSELATION);
const CONTOURS = toPairs(FaceLandmarker.FACE_LANDMARKS_CONTOURS);
const LEFT_IRIS = toPairs(FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS);
const RIGHT_IRIS = toPairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS);
const LIPS = toPairs(FaceLandmarker.FACE_LANDMARKS_LIPS);
const LEFT_EYE = toPairs(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE);
const LEFT_EYEBROW = toPairs(FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW);
const RIGHT_EYE = toPairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE);
const RIGHT_EYEBROW = toPairs(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW);
const FACE_OVAL = toPairs(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);

/** Edge pairs for a dense face mesh (468 topology + iris rings). */
export function getFaceMeshEdges(fullMesh: boolean): Array<[number, number]> {
  const base = fullMesh ? [...TESSELATION, ...LEFT_IRIS, ...RIGHT_IRIS] : [...CONTOURS, ...LEFT_IRIS, ...RIGHT_IRIS];

  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (let i = 0; i < base.length; i++) {
    const pair = base[i];
    if (!pair) continue;
    const [a, b] = pair;
    if (a === b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([a, b]);
  }
  return out;
}

type FeatureTone = "cyan" | "gold";

/** Per-landmark accent for premium point colours (eyes/iris → cyan, lips/brows/jaw → gold). */
export function buildFeatureToneMap(): Map<number, FeatureTone> {
  const m = new Map<number, FeatureTone>();
  const paint = (pairs: Array<[number, number]>, tone: FeatureTone) => {
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair) continue;
      m.set(pair[0], tone);
      m.set(pair[1], tone);
    }
  };
  paint(LIPS, "gold");
  paint(LEFT_EYEBROW, "gold");
  paint(RIGHT_EYEBROW, "gold");
  paint(FACE_OVAL, "gold");
  paint(LEFT_EYE, "cyan");
  paint(RIGHT_EYE, "cyan");
  paint(LEFT_IRIS, "cyan");
  paint(RIGHT_IRIS, "cyan");
  for (let i = 468; i < 478; i++) {
    m.set(i, "cyan");
  }
  return m;
}

export const FEATURE_TONE_MAP = buildFeatureToneMap();
