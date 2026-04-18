import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import { FACE_MESH_IDX } from "@/lib/faceAnalysis";
import { FEATURE_TONE_MAP, getFaceMeshEdges } from "@/lib/faceMeshTopology";

const PRE_SCALE = 1.35;
const Z_MUL = 0.85;
/** Target half-extent so the face fits comfortably in view (world units). */
const TARGET_HALF_EXTENT = 0.48;

function preWorld(
  lm: NormalizedLandmark,
  sagittalX: number,
): THREE.Vector3 {
  return new THREE.Vector3(
    (lm.x - sagittalX) * PRE_SCALE,
    -(lm.y - 0.5) * PRE_SCALE,
    (lm.z ?? 0) * Z_MUL,
  );
}

export type FaceMesh3DData = {
  /** Flat xyz per landmark, length = n * 3 */
  positions: Float32Array;
  pointColors: Float32Array;
  accentPositions: Float32Array;
  accentColors: Float32Array;
  linePositions: Float32Array;
  n: number;
  /** Horizontal lines for thirds (each pair of endpoints in world space). */
  thirdsSegments: [THREE.Vector3, THREE.Vector3][];
  /** Vertical midline top → bottom. */
  midline: [THREE.Vector3, THREE.Vector3];
  /** Normalized-space overlay helpers (for 2D photo SVG). */
  overlay: {
    sagittalX: number;
    yTop: number;
    yBot: number;
    minNx: number;
    maxNx: number;
    y1: number;
    y2: number;
  };
};

/**
 * Convert MediaPipe landmarks to centered, uniformly scaled 3D buffers + wireframe edges.
 * Uses full 468 face topology + iris edges for indices that exist (478 landmarks from Tasks Vision).
 */
export function buildFaceMesh3DData(landmarks: NormalizedLandmark[], fullEdgeMesh: boolean): FaceMesh3DData | null {
  const n = landmarks.length;
  if (n < 300) return null;

  const sagittalX =
    ((landmarks[FACE_MESH_IDX.midGlabella]?.x ?? 0.5) + (landmarks[FACE_MESH_IDX.chin]?.x ?? 0.5)) / 2;

  const pre: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    pre.push(preWorld(landmarks[i]!, sagittalX));
  }

  const box = new THREE.Box3();
  for (const p of pre) box.expandByPoint(p);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const uniform = TARGET_HALF_EXTENT / (maxDim * 0.5);

  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = pre[i]!.clone().sub(center).multiplyScalar(uniform);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }

  const palette = {
    base: new THREE.Color("#a5e8ff"),
    gold: new THREE.Color("#f5d48a"),
    cyan: new THREE.Color("#7af0ff"),
  };

  const pointColors = new Float32Array(n * 3);
  const accentIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    const tone = FEATURE_TONE_MAP.get(i);
    const c = tone === "gold" ? palette.gold : tone === "cyan" ? palette.cyan : palette.base;
    pointColors[i * 3] = c.r;
    pointColors[i * 3 + 1] = c.g;
    pointColors[i * 3 + 2] = c.b;
    if (tone) accentIdx.push(i);
  }
  const accentPositions = new Float32Array(accentIdx.length * 3);
  const accentColors = new Float32Array(accentIdx.length * 3);
  for (let j = 0; j < accentIdx.length; j++) {
    const i = accentIdx[j]!;
    accentPositions[j * 3] = positions[i * 3]!;
    accentPositions[j * 3 + 1] = positions[i * 3 + 1]!;
    accentPositions[j * 3 + 2] = positions[i * 3 + 2]!;
    const tone = FEATURE_TONE_MAP.get(i);
    const c = tone === "gold" ? palette.gold : palette.cyan;
    accentColors[j * 3] = c.r;
    accentColors[j * 3 + 1] = c.g;
    accentColors[j * 3 + 2] = c.b;
  }

  const edgePairs = getFaceMeshEdges(fullEdgeMesh).filter(([a, b]) => a < n && b < n);
  const linePositions = new Float32Array(edgePairs.length * 2 * 3);
  let o = 0;
  for (const [a, b] of edgePairs) {
    linePositions[o++] = positions[a * 3]!;
    linePositions[o++] = positions[a * 3 + 1]!;
    linePositions[o++] = positions[a * 3 + 2]!;
    linePositions[o++] = positions[b * 3]!;
    linePositions[o++] = positions[b * 3 + 1]!;
    linePositions[o++] = positions[b * 3 + 2]!;
  }

  const forehead = landmarks[FACE_MESH_IDX.forehead]!;
  const chin = landmarks[FACE_MESH_IDX.chin]!;
  const yTop = forehead.y;
  const yBot = chin.y;
  const h = Math.max(1e-4, yBot - yTop);
  const y1 = yTop + h / 3;
  const y2 = yTop + (2 * h) / 3;

  let minNx = 1;
  let maxNx = 0;
  for (const lm of landmarks) {
    minNx = Math.min(minNx, lm.x);
    maxNx = Math.max(maxNx, lm.x);
  }
  const pad = (maxNx - minNx) * 0.05;
  minNx -= pad;
  maxNx += pad;

  let zAvg = 0;
  for (let i = 0; i < n; i++) zAvg += positions[i * 3 + 2]!;
  zAvg /= n;

  const toWorld = (x: number, y: number, z: number) => {
    const v = preWorld({ x, y, z } as NormalizedLandmark, sagittalX);
    return v.sub(center).multiplyScalar(uniform);
  };

  const p1a = toWorld(minNx, y1, 0);
  p1a.z = zAvg;
  const p1b = toWorld(maxNx, y1, 0);
  p1b.z = zAvg;
  const p2a = toWorld(minNx, y2, 0);
  p2a.z = zAvg;
  const p2b = toWorld(maxNx, y2, 0);
  p2b.z = zAvg;

  const topMid = toWorld(sagittalX, yTop, 0);
  topMid.z = zAvg;
  const botMid = toWorld(sagittalX, yBot, 0);
  botMid.z = zAvg;

  return {
    positions,
    pointColors,
    accentPositions,
    accentColors,
    linePositions,
    n,
    thirdsSegments: [
      [p1a, p1b],
      [p2a, p2b],
    ],
    midline: [topMid, botMid],
    overlay: { sagittalX, yTop, yBot, minNx, maxNx, y1, y2 },
  };
}
