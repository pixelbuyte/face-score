import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { FACE_MESH_IDX } from "@/lib/faceAnalysis";
import type { Tier } from "@/lib/faceAnalysis";
import { FEATURE_TONE_MAP, getFaceMeshEdges } from "@/lib/faceMeshTopology";
import { TierBadge } from "@/components/report/tier-ladder";
import { Button } from "@/components/ui/button";
import { Layers, Sparkles, SunMedium, Triangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  landmarks: NormalizedLandmark[];
  className?: string;
  width?: number;
  height?: number;
};

type SectionProps = Omit<Props, "width" | "height"> & {
  imageDataUrl: string | null;
  tier: Tier;
  overallScore: number;
};

const SCALE = 1.12;
const Z_MUL = 0.62;

function toLocal(
  lm: NormalizedLandmark,
  sagittalX: number,
  scale: number,
  zMul: number,
): THREE.Vector3 {
  return new THREE.Vector3((lm.x - sagittalX) * scale, -(lm.y - 0.5) * scale, (lm.z ?? 0) * zMul);
}

function useMeshGeometries(landmarks: NormalizedLandmark[], fullEdgeMesh: boolean) {
  return useMemo(() => {
    const n = landmarks.length;
    if (n < 10) return null;

    const sagittalX =
      ((landmarks[FACE_MESH_IDX.midGlabella]?.x ?? 0.5) + (landmarks[FACE_MESH_IDX.chin]?.x ?? 0.5)) / 2;

    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      positions.push(toLocal(landmarks[i]!, sagittalX, SCALE, Z_MUL));
    }

    const palette = {
      base: new THREE.Color("#dbeafe"),
      gold: new THREE.Color("#fbbf24"),
      cyan: new THREE.Color("#67e8f9"),
    };

    const baseColors: number[] = [];
    const accentPositions: THREE.Vector3[] = [];
    const accentColors: number[] = [];

    for (let i = 0; i < n; i++) {
      const tone = FEATURE_TONE_MAP.get(i);
      const c = tone === "gold" ? palette.gold : tone === "cyan" ? palette.cyan : palette.base;
      baseColors.push(c.r, c.g, c.b);
      if (tone) {
        accentPositions.push(positions[i]!.clone());
        const glow = tone === "gold" ? palette.gold : palette.cyan;
        accentColors.push(glow.r, glow.g, glow.b);
      }
    }

    const edgePairs = getFaceMeshEdges(fullEdgeMesh).filter(([a, b]) => a < n && b < n);
    const lineVerts: number[] = [];
    for (const [a, b] of edgePairs) {
      const pa = positions[a]!;
      const pb = positions[b]!;
      lineVerts.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));

    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute("position", new THREE.Float32BufferAttribute(Float32Array.from(positions.flatMap((p) => [p.x, p.y, p.z])), 3));
    ptsGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(baseColors), 3));

    const accentGeo = new THREE.BufferGeometry();
    accentGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(accentPositions.flatMap((p) => [p.x, p.y, p.z])), 3),
    );
    accentGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(accentColors), 3));

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
    const pad = (maxNx - minNx) * 0.04;
    minNx -= pad;
    maxNx += pad;

    const p1a = toLocal({ x: minNx, y: y1, z: 0 } as NormalizedLandmark, sagittalX, SCALE, Z_MUL);
    const p1b = toLocal({ x: maxNx, y: y1, z: 0 } as NormalizedLandmark, sagittalX, SCALE, Z_MUL);
    const p2a = toLocal({ x: minNx, y: y2, z: 0 } as NormalizedLandmark, sagittalX, SCALE, Z_MUL);
    const p2b = toLocal({ x: maxNx, y: y2, z: 0 } as NormalizedLandmark, sagittalX, SCALE, Z_MUL);

    const zMid =
      positions.reduce((s, p) => s + p.z, 0) / Math.max(1, positions.length);
    p1a.z = p1b.z = p2a.z = p2b.z = zMid;

    const topMid = toLocal({ x: sagittalX, y: yTop, z: 0 } as NormalizedLandmark, sagittalX, SCALE, Z_MUL);
    const botMid = toLocal({ x: sagittalX, y: yBot, z: 0 } as NormalizedLandmark, sagittalX, SCALE, Z_MUL);
    topMid.z = botMid.z = zMid;

    return {
      positions,
      ptsGeo,
      accentGeo,
      lineGeo,
      thirdsH: [
        [p1a, p1b] as [THREE.Vector3, THREE.Vector3],
        [p2a, p2b] as [THREE.Vector3, THREE.Vector3],
      ],
      midline: [topMid, botMid] as [THREE.Vector3, THREE.Vector3],
      sagittalX,
      yTop,
      yBot,
      minNx,
      maxNx,
      y1,
      y2,
    };
  }, [landmarks, fullEdgeMesh]);
}

function SceneBody({
  landmarks,
  showLandmarks,
  showMesh,
  showThirds,
  fullEdgeMesh,
}: {
  landmarks: NormalizedLandmark[];
  showLandmarks: boolean;
  showMesh: boolean;
  showThirds: boolean;
  fullEdgeMesh: boolean;
}) {
  const geo = useMeshGeometries(landmarks, fullEdgeMesh);

  if (!geo) return null;

  return (
    <group>
      {showMesh && (
        <lineSegments geometry={geo.lineGeo}>
          <lineBasicMaterial
            color="#c4b5fd"
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {showLandmarks && (
        <>
          <points geometry={geo.ptsGeo}>
            <pointsMaterial
              vertexColors
              size={0.019}
              sizeAttenuation
              transparent
              opacity={0.92}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </points>
          <points geometry={geo.accentGeo}>
            <pointsMaterial
              vertexColors
              size={0.032}
              sizeAttenuation
              transparent
              opacity={0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>
        </>
      )}

      {showThirds && (
        <>
          <Line
            points={geo.thirdsH[0]!}
            color="#d4af37"
            lineWidth={0.5}
            transparent
            opacity={0.2}
            dashed={false}
          />
          <Line
            points={geo.thirdsH[1]!}
            color="#d4af37"
            lineWidth={0.5}
            transparent
            opacity={0.18}
            dashed={false}
          />
          <Line
            points={geo.midline}
            color="#a5f3fc"
            lineWidth={0.6}
            transparent
            opacity={0.28}
            dashed
            dashSize={0.04}
            gapSize={0.03}
          />
        </>
      )}
    </group>
  );
}

function FaceMeshCanvas({
  landmarks,
  showLandmarks,
  showMesh,
  showThirds,
  fullEdgeMesh,
}: {
  landmarks: NormalizedLandmark[];
  showLandmarks: boolean;
  showMesh: boolean;
  showThirds: boolean;
  fullEdgeMesh: boolean;
}) {
  const dpr =
    typeof window !== "undefined" ? (window.matchMedia("(max-width: 768px)").matches ? [1, 1.5] : [1, 2]) : [1, 2];

  if (landmarks.length < 10) {
    return (
      <div
        className="flex min-h-[240px] w-full items-center justify-center rounded-2xl border border-white/10 text-center text-xs text-foreground/45"
        style={{ background: "linear-gradient(165deg, #1a0033 0%, #0a001a 55%, #05030f 100%)" }}
      >
        3D mesh available right after analysis. Save reports to keep their thumbnails.
      </div>
    );
  }

  return (
    <div
      className="h-full min-h-[260px] w-full overflow-hidden rounded-2xl border border-violet-500/25 shadow-[0_0_60px_-12px_rgba(139,92,246,0.45)]"
      style={{ background: "linear-gradient(165deg, #1a0033 0%, #0a001a 55%, #05030f 100%)" }}
    >
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={dpr as [number, number]}
        className="h-full w-full"
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#0a001a"]} />
        <PerspectiveCamera makeDefault position={[0, 0, 0.92]} fov={36} near={0.01} far={10} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[1.4, 2.2, 2.8]} intensity={1.1} color="#f5f3ff" />
        <directionalLight position={[-2, -0.5, 1.5]} intensity={0.35} color="#6366f1" />

        <SceneBody
          landmarks={landmarks}
          showLandmarks={showLandmarks}
          showMesh={showMesh}
          showThirds={showThirds}
          fullEdgeMesh={fullEdgeMesh}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={0.72}
          maxDistance={1.55}
          rotateSpeed={0.5}
          zoomSpeed={0.45}
          autoRotate
          autoRotateSpeed={0.35}
          minPolarAngle={0.85}
          maxPolarAngle={Math.PI - 0.65}
        />

        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.25} mipmapBlur intensity={0.55} radius={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

function ReferencePhotoOverlay({
  sagittalX,
  yTop,
  yBot,
  minNx,
  maxNx,
  y1,
  y2,
  showThirds,
}: {
  sagittalX: number;
  yTop: number;
  yBot: number;
  minNx: number;
  maxNx: number;
  y1: number;
  y2: number;
  showThirds: boolean;
}) {
  if (!showThirds) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      <line x1={minNx} y1={y1} x2={maxNx} y2={y1} stroke="rgba(212,175,55,0.35)" strokeWidth={0.0015} vectorEffect="non-scaling-stroke" />
      <line x1={minNx} y1={y2} x2={maxNx} y2={y2} stroke="rgba(212,175,55,0.28)" strokeWidth={0.0015} vectorEffect="non-scaling-stroke" />
      <line
        x1={sagittalX}
        y1={yTop}
        x2={sagittalX}
        y2={yBot}
        stroke="rgba(165,243,252,0.45)"
        strokeWidth={0.002}
        strokeDasharray="0.008 0.006"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Premium 3D mesh analysis block: tier context, reference photo, R3F canvas, visibility toggles. */
export function FaceMeshAnalysisSection({
  landmarks,
  imageDataUrl,
  tier,
  overallScore,
  className,
}: SectionProps) {
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [showThirds, setShowThirds] = useState(true);
  const [wireframeOnly, setWireframeOnly] = useState(false);

  const overlay = useMemo(() => {
    if (landmarks.length < 10) return null;
    const sagittalX =
      ((landmarks[FACE_MESH_IDX.midGlabella]?.x ?? 0.5) + (landmarks[FACE_MESH_IDX.chin]?.x ?? 0.5)) / 2;
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
    const pad = (maxNx - minNx) * 0.04;
    return {
      sagittalX,
      yTop,
      yBot,
      minNx: minNx - pad,
      maxNx: maxNx + pad,
      y1,
      y2,
    };
  }, [landmarks]);

  const showPoints = showLandmarks && !wireframeOnly;
  const fullEdgeMesh = !wireframeOnly;

  return (
    <div
      className={cn(
        "rounded-3xl border border-violet-500/20 bg-black/20 p-1 shadow-[0_25px_80px_-30px_rgba(76,29,149,0.55)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="rounded-[1.35rem] border border-white/[0.07] bg-gradient-to-br from-violet-950/50 via-[#0d0518] to-black/80 p-5 md:p-7">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/80">3D Face Mesh Analysis</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white md:text-2xl">Structural scan & harmony map</h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-foreground/50">
              Dense MediaPipe topology with sagittal reference, facial thirds, and soft luminance bloom — drag the mesh to orbit,
              scroll to zoom.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <TierBadge tier={tier} score={overallScore} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-foreground/55">
                  Overall {overallScore.toFixed(0)} · {tier.short}{" "}
                  <span className="text-foreground/40">({tier.long})</span>
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/40">Reference photo</p>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="" className="block w-full object-contain" />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center px-4 text-center text-xs text-foreground/45">
                  No inline preview — landmarks still drive the 3D reconstruction.
                </div>
              )}
              {overlay && imageDataUrl && (
                <ReferencePhotoOverlay {...overlay} showThirds={showThirds} />
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/40">Interactive mesh</p>
            <div
              className="relative w-full max-w-[min(100%,480px)] xl:max-w-none"
              style={{ aspectRatio: "380 / 420" }}
            >
              <div className="absolute inset-0">
                <FaceMeshCanvas
                  landmarks={landmarks}
                  showLandmarks={showPoints}
                  showMesh={showMesh}
                  showThirds={showThirds}
                  fullEdgeMesh={fullEdgeMesh}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-5">
          <TogglePill
            active={showLandmarks}
            onClick={() => setShowLandmarks((v) => !v)}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Landmarks"
          />
          <TogglePill
            active={showMesh}
            onClick={() => setShowMesh((v) => !v)}
            icon={<Triangle className="h-3.5 w-3.5" />}
            label="Mesh"
          />
          <TogglePill
            active={showThirds}
            onClick={() => setShowThirds((v) => !v)}
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Thirds & midline"
          />
          <TogglePill
            active={wireframeOnly}
            onClick={() => setWireframeOnly((v) => !v)}
            icon={<SunMedium className="h-3.5 w-3.5" />}
            label="Contour wireframe"
          />
        </div>
      </div>
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn(
        "gap-1.5 rounded-full border-violet-500/30 text-[11px]",
        active && "shadow-[0_0_24px_-4px_rgba(139,92,246,0.6)]",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

/** @deprecated Use FaceMeshAnalysisSection — kept for quick imports */
export function FaceMeshPreview(props: Props) {
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [showThirds, setShowThirds] = useState(true);
  const [wireframeOnly, setWireframeOnly] = useState(false);

  return (
    <div className={cn("space-y-3", props.className)}>
      <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: "320 / 360" }}>
        <div className="absolute inset-0">
          <FaceMeshCanvas
            landmarks={props.landmarks}
            showLandmarks={showLandmarks && !wireframeOnly}
            showMesh={showMesh}
            showThirds={showThirds}
            fullEdgeMesh={!wireframeOnly}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowLandmarks((v) => !v)}>
          Landmarks
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowMesh((v) => !v)}>
          Mesh
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowThirds((v) => !v)}>
          Thirds
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setWireframeOnly((v) => !v)}>
          Wire
        </Button>
      </div>
    </div>
  );
}
