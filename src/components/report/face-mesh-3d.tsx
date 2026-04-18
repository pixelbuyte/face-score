import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Line, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { TierBadge } from "@/components/report/tier-ladder";
import { Button } from "@/components/ui/button";
import { buildFaceMesh3DData } from "@/lib/faceMesh3d";
import type { Tier } from "@/lib/faceAnalysis";
import { FACE_MESH_IDX, nextTierDelta } from "@/lib/faceAnalysis";
import { nextTierPlainParts } from "@/lib/scorePlainLanguage";
import { ArrowUp, Eye, Grid3x3, Layers, Move, Sparkles, Triangle } from "lucide-react";
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

function SceneBody({
  data,
  showPoints,
  showLines,
  showThirds,
  showSymmetry,
}: {
  data: NonNullable<ReturnType<typeof buildFaceMesh3DData>>;
  showPoints: boolean;
  showLines: boolean;
  showThirds: boolean;
  showSymmetry: boolean;
}) {
  const ptsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(data.pointColors, 3));
    return g;
  }, [data]);

  const accentGeo = useMemo(() => {
    if (data.accentPositions.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.accentPositions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(data.accentColors, 3));
    return g;
  }, [data]);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.linePositions, 3));
    return g;
  }, [data]);

  return (
    <group>
      {showLines && (
        <lineSegments geometry={lineGeo}>
          <lineBasicMaterial
            color="#c4b5fd"
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {showPoints && (
        <>
          <points geometry={ptsGeo}>
            <pointsMaterial
              vertexColors
              size={0.028}
              sizeAttenuation
              transparent
              opacity={0.95}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </points>
          {accentGeo && (
            <points geometry={accentGeo}>
              <pointsMaterial
                vertexColors
                size={0.048}
                sizeAttenuation
                transparent
                opacity={0.92}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </points>
          )}
        </>
      )}

      {showThirds &&
        data.thirdsSegments.map((seg, i) => (
          <Line
            key={`t-${i}`}
            points={seg}
            color="#e8c547"
            lineWidth={1}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        ))}

      {showSymmetry && (
        <Line
          points={data.midline}
          color="#67e8f9"
          lineWidth={1}
          transparent
          opacity={0.5}
          dashed
          dashSize={0.035}
          gapSize={0.028}
          depthWrite={false}
        />
      )}
    </group>
  );
}

function FaceMeshCanvas({
  landmarks,
  showPoints,
  showLines,
  showThirds,
  showSymmetry,
  fullEdgeMesh,
  onReady,
}: {
  landmarks: NormalizedLandmark[];
  showPoints: boolean;
  showLines: boolean;
  showThirds: boolean;
  showSymmetry: boolean;
  fullEdgeMesh: boolean;
  onReady?: () => void;
}) {
  const dpr =
    typeof window !== "undefined" ? (window.matchMedia("(max-width: 768px)").matches ? [1, 1.5] : [1, 2]) : [1, 2];

  const data = useMemo(() => buildFaceMesh3DData(landmarks, fullEdgeMesh), [landmarks, fullEdgeMesh]);

  if (!data) {
    return (
      <div
        className="flex min-h-[280px] w-full items-center justify-center rounded-2xl border border-white/10 px-4 text-center text-xs text-foreground/45"
        style={{ background: "linear-gradient(165deg, #14061f 0%, #0a0514 55%, #05030f 100%)" }}
      >
        3D mesh needs landmarks from a fresh analysis. Run analysis again or check that the face was detected.
      </div>
    );
  }

  return (
    <div
      className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-violet-500/30 shadow-[0_0_60px_-12px_rgba(139,92,246,0.5)]"
      style={{ background: "linear-gradient(165deg, #1a0a28 0%, #0d0518 50%, #05030f 100%)" }}
    >
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={dpr as [number, number]}
        className="h-full w-full"
        style={{ touchAction: "none" }}
        onCreated={() => onReady?.()}
      >
        <color attach="background" args={["#080410"]} />
        <PerspectiveCamera makeDefault position={[0, 0, 1.38]} fov={42} near={0.05} far={20} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[1.2, 2.0, 2.4]} intensity={1.15} color="#f0e8ff" />
        <directionalLight position={[-1.8, -0.4, 1.2]} intensity={0.4} color="#6366f1" />
        <pointLight position={[0, 0, 1.6]} intensity={0.25} color="#a78bfa" />

        <SceneBody
          data={data}
          showPoints={showPoints}
          showLines={showLines}
          showThirds={showThirds}
          showSymmetry={showSymmetry}
        />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={0.75}
          maxDistance={2.4}
          rotateSpeed={0.65}
          zoomSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.45}
          minPolarAngle={0.75}
          maxPolarAngle={Math.PI - 0.55}
        />

        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.35} mipmapBlur intensity={0.42} radius={0.42} />
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
  showSymmetry,
}: {
  sagittalX: number;
  yTop: number;
  yBot: number;
  minNx: number;
  maxNx: number;
  y1: number;
  y2: number;
  showThirds: boolean;
  showSymmetry: boolean;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
    >
      {showThirds && (
        <>
          <line
            x1={minNx}
            y1={y1}
            x2={maxNx}
            y2={y1}
            stroke="rgba(232,197,71,0.45)"
            strokeWidth={0.0018}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={minNx}
            y1={y2}
            x2={maxNx}
            y2={y2}
            stroke="rgba(232,197,71,0.38)"
            strokeWidth={0.0018}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      {showSymmetry && (
        <line
          x1={sagittalX}
          y1={yTop}
          x2={sagittalX}
          y2={yBot}
          stroke="rgba(103,232,249,0.5)"
          strokeWidth={0.002}
          strokeDasharray="0.01 0.008"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/** Premium 3D mesh: full MediaPipe topology, normalized scale, toggles, reference photo. */
export function FaceMeshAnalysisSection({
  landmarks,
  imageDataUrl,
  tier,
  overallScore,
  className,
}: SectionProps) {
  const [showPoints, setShowPoints] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showThirds, setShowThirds] = useState(true);
  const [showSymmetry, setShowSymmetry] = useState(true);
  const [wireframeOnly, setWireframeOnly] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  const meshKey = useMemo(() => {
    const a = landmarks[0];
    if (!a) return "0";
    return `${landmarks.length}-${a.x}-${a.y}-${a.z ?? 0}`;
  }, [landmarks]);

  useEffect(() => {
    setCanvasReady(false);
  }, [meshKey]);

  const overlay = useMemo(() => {
    const d = buildFaceMesh3DData(landmarks, true);
    if (!d) return null;
    return d.overlay;
  }, [landmarks]);

  useEffect(() => {
    if (!buildFaceMesh3DData(landmarks, true)) setCanvasReady(true);
  }, [landmarks]);

  const showPts = showPoints && !wireframeOnly;
  const fullEdgeMesh = !wireframeOnly;

  const { delta, next } = useMemo(() => nextTierDelta(overallScore), [overallScore]);
  const nextPlain = useMemo(() => {
    if (!next) return null;
    return nextTierPlainParts(overallScore, delta, next.min);
  }, [overallScore, delta, next]);

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/80">
              Structural geometry
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white md:text-2xl">Interactive 3D Face Mesh</h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-foreground/50">
              Your face as hundreds of dots in 3D (photo landmarks), with lines showing structure. Drag to spin the
              model; scroll to zoom. Gold lines = upper/middle/lower thirds; cyan dashed = center line of the face.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <TierBadge tier={tier} score={overallScore} />
            {next && nextPlain && (
              <div className="flex max-w-[min(100%,320px)] items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] leading-snug text-foreground/75 md:items-center md:text-right">
                <ArrowUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300 md:mt-0" aria-hidden />
                <span>
                  <strong className="text-white">{nextPlain.headline}</strong>
                  <span className="text-foreground/55"> — {nextPlain.detail} </span>
                  <strong className="text-violet-200">{next.short}</strong>
                  <span className="text-foreground/45"> ({next.long})</span>
                </span>
              </div>
            )}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-foreground/55">
              Score {Math.round(overallScore)}% · {tier.short}{" "}
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
                  No inline preview — upload a new photo to see the side-by-side image. Landmark data still drives the 3D
                  view when available.
                </div>
              )}
              {overlay && imageDataUrl && (
                <ReferencePhotoOverlay
                  {...overlay}
                  showThirds={showThirds}
                  showSymmetry={showSymmetry}
                />
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/40">478-point mesh</p>
            <div
              className="relative w-full max-w-[min(100%,480px)] xl:max-w-none"
              style={{ aspectRatio: "380 / 420" }}
            >
              {!canvasReady && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#080410]/90 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-300" />
                  <p className="text-[11px] text-foreground/55">Initializing WebGL…</p>
                </div>
              )}
              <div className="absolute inset-0">
                <FaceMeshCanvas
                  key={meshKey}
                  landmarks={landmarks}
                  showPoints={showPts}
                  showLines={showLines}
                  showThirds={showThirds}
                  showSymmetry={showSymmetry}
                  fullEdgeMesh={fullEdgeMesh}
                  onReady={() => setCanvasReady(true)}
                />
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-foreground/40">
              Landmarks {FACE_MESH_IDX.forehead}–{FACE_MESH_IDX.chin} define vertical extent; edges follow{" "}
              <code className="text-foreground/55">@mediapipe/face_mesh</code> FACEMESH_TESSELATION + iris rings.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-5">
          <TogglePill
            active={showPoints}
            onClick={() => setShowPoints((v) => !v)}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Show points"
          />
          <TogglePill
            active={showLines}
            onClick={() => setShowLines((v) => !v)}
            icon={<Triangle className="h-3.5 w-3.5" />}
            label="Show mesh lines"
          />
          <TogglePill
            active={showThirds}
            onClick={() => setShowThirds((v) => !v)}
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Show facial thirds"
          />
          <TogglePill
            active={showSymmetry}
            onClick={() => setShowSymmetry((v) => !v)}
            icon={<Move className="h-3.5 w-3.5" />}
            label="Show symmetry"
          />
          <TogglePill
            active={wireframeOnly}
            onClick={() => setWireframeOnly((v) => !v)}
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
            label="Contour only"
          />
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-foreground/40">
            <Eye className="h-3 w-3" />
            Orbit · scroll zoom
          </span>
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

/** @deprecated Prefer FaceMeshAnalysisSection */
export function FaceMeshPreview(props: Props) {
  const [showPoints, setShowPoints] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showThirds, setShowThirds] = useState(true);
  const [showSymmetry, setShowSymmetry] = useState(true);
  const [wireframeOnly, setWireframeOnly] = useState(false);
  const [ready, setReady] = useState(false);

  return (
    <div className={cn("space-y-3", props.className)}>
      <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: "320 / 360" }}>
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/80 text-xs text-foreground/50">
            Loading…
          </div>
        )}
        <div className="absolute inset-0">
          <FaceMeshCanvas
            landmarks={props.landmarks}
            showPoints={showPoints && !wireframeOnly}
            showLines={showLines}
            showThirds={showThirds}
            showSymmetry={showSymmetry}
            fullEdgeMesh={!wireframeOnly}
            onReady={() => setReady(true)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowPoints((v) => !v)}>
          Points
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowLines((v) => !v)}>
          Lines
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowThirds((v) => !v)}>
          Thirds
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowSymmetry((v) => !v)}>
          Symmetry
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setWireframeOnly((v) => !v)}>
          Contour
        </Button>
      </div>
    </div>
  );
}
