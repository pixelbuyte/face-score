import {
  FACEMESH_CONTOURS,
  FACEMESH_FACE_OVAL,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_LEFT_IRIS,
  FACEMESH_LEFT_EYE,
  FACEMESH_LIPS,
  FACEMESH_RIGHT_EYEBROW,
  FACEMESH_RIGHT_EYE,
  FACEMESH_RIGHT_IRIS,
  FACEMESH_TESSELATION,
} from "@mediapipe/face_mesh";

/** Edge pairs for a dense face mesh (468 topology + iris rings). */
export function getFaceMeshEdges(fullMesh: boolean): Array<[number, number]> {
  const base = fullMesh
    ? [...FACEMESH_TESSELATION, ...FACEMESH_LEFT_IRIS, ...FACEMESH_RIGHT_IRIS]
    : [...FACEMESH_CONTOURS, ...FACEMESH_LEFT_IRIS, ...FACEMESH_RIGHT_IRIS];

  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (const [a, b] of base) {
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
  const gold = (pairs: Array<[number, number]>) => {
    for (const [a, b] of pairs) {
      m.set(a, "gold");
      m.set(b, "gold");
    }
  };
  const cyan = (pairs: Array<[number, number]>) => {
    for (const [a, b] of pairs) {
      m.set(a, "cyan");
      m.set(b, "cyan");
    }
  };
  gold(FACEMESH_LIPS);
  gold(FACEMESH_LEFT_EYEBROW);
  gold(FACEMESH_RIGHT_EYEBROW);
  gold(FACEMESH_FACE_OVAL);
  cyan(FACEMESH_LEFT_EYE);
  cyan(FACEMESH_RIGHT_EYE);
  cyan(FACEMESH_LEFT_IRIS);
  cyan(FACEMESH_RIGHT_IRIS);
  return m;
}

export const FEATURE_TONE_MAP = buildFeatureToneMap();
