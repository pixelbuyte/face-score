import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Lock,
  ScanFace,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CALIBRATION_TARGET_VOTES } from "@/constants/calibration-faces";
import { PRIVACY_LONG } from "@/constants/privacy";
import {
  analyzeFromLandmarks,
  buildCanvasAndLandmarksFromFile,
  canvasToJpegDataUrl,
  drawFaceOverlay,
  getFaceLandmarker,
} from "@/lib/faceAnalysis";
import { useAppStore } from "@/store/use-app-store";

const ANALYSIS_STAGES = [
  "Loading MediaPipe face mesh…",
  "Detecting 478 facial landmarks…",
  "Computing geometric harmony…",
  "Running neural prior…",
  "Compiling your report…",
];

export function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const { finishAnalysis, getCalibrationBoost, calibrationVotes, isCalibrationComplete, setView } =
    useAppStore();

  // Pre-warm the face landmarker so the first analysis feels instant.
  useEffect(() => {
    void getFaceLandmarker().catch(() => {
      /* defer error handling to upload time */
    });
  }, []);

  // Cycle through analysis stage labels while busy.
  useEffect(() => {
    if (!busy) {
      setStage(0);
      return;
    }
    const id = window.setInterval(() => {
      setStage((s) => Math.min(ANALYSIS_STAGES.length - 1, s + 1));
    }, 600);
    return () => window.clearInterval(id);
  }, [busy]);

  const processFile = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setErr(null);
      setBusy(true);
      setStage(0);
      try {
        const { canvas: full, landmarks } = await buildCanvasAndLandmarksFromFile(file);

        if (!landmarks) {
          setErr("No face detected. Use a clear, front-facing photo with your face centered and well lit.");
          setBusy(false);
          return;
        }

        const maxW = 920;
        const scale = Math.min(1, maxW / full.width);
        const cw = Math.round(full.width * scale);
        const ch = Math.round(full.height * scale);
        const preview = document.createElement("canvas");
        preview.width = cw;
        preview.height = ch;
        const ctx = preview.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(full, 0, 0, cw, ch);
        drawFaceOverlay(ctx, landmarks, cw, ch);

        let imageDataUrl = canvasToJpegDataUrl(preview);
        if (!imageDataUrl) imageDataUrl = canvasToJpegDataUrl(full);

        const boost = getCalibrationBoost();
        const result = analyzeFromLandmarks(landmarks, full, boost);

        finishAnalysis({ result, imageDataUrl: imageDataUrl || "", landmarks });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setErr(
          msg.includes("MediaPipe") || msg.includes("wasm")
            ? "Face model failed to load. Check your network, disable strict blockers, and try again."
            : msg,
        );
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
        if (cameraRef.current) cameraRef.current.value = "";
      }
    },
    [finishAnalysis, getCalibrationBoost],
  );

  const calibrated = isCalibrationComplete();
  const calProgress = Math.min(100, (calibrationVotes.length / CALIBRATION_TARGET_VOTES) * 100);

  return (
    <div className="space-y-12">
      {/* ─────────── Hero ─────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-violet-600/10 via-fuchsia-500/5 to-amber-300/5 px-6 py-14 text-center md:px-12 md:text-left">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200"
          >
            <Lock className="h-3 w-3" />
            Private · On-device · Real human ratings
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl lg:text-[3.5rem]"
          >
            Discover your facial attractiveness{" "}
            <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-amber-100 bg-clip-text text-transparent">
              with science.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="mt-5 max-w-2xl text-base text-foreground/65 md:text-lg"
          >
            Calibrated on millions of real human votes from the public SCUT-FBP5500 dataset. 478 MediaPipe
            landmarks, 9 geometric metrics, a neural prior, and a personalised improvement plan — all
            computed in your browser.
          </motion.p>
        </div>
      </section>

      {/* ─────────── Two big choices ─────────── */}
      <section className="grid gap-5 md:grid-cols-2">
        <ActionCard
          title="Calibrate the model"
          subtitle={`Quick pairwise votes on ${CALIBRATION_TARGET_VOTES} AI face pairs`}
          description="Tune the model to your taste. Each vote nudges the prior toward what you find attractive — stored only on this device."
          cta={
            calibrated ? (
              <span className="inline-flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Calibrated · re-run anytime
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Start calibration <ArrowRight className="h-4 w-4" />
              </span>
            )
          }
          icon={Wand2}
          accent="from-violet-500/25 to-fuchsia-500/15"
          onClick={() => setView("calibrate")}
          progress={calProgress}
          progressLabel={`${calibrationVotes.length} / ${CALIBRATION_TARGET_VOTES} votes`}
        />

        <ActionCard
          title="Upload photo & get report"
          subtitle="Detailed scientific facial analysis"
          description="Drop a clear front-facing portrait. Get an Areum-style report: 9 metrics, 3D mesh, distribution chart, and personalised tips."
          cta={
            <span className="inline-flex items-center gap-2">
              Upload photo <ArrowRight className="h-4 w-4" />
            </span>
          }
          icon={ScanFace}
          accent="from-amber-400/25 to-rose-400/15"
          onClick={() => inputRef.current?.click()}
          highlight
        />
      </section>

      {/* ─────────── Upload dropzone ─────────── */}
      <Card className="glass-panel overflow-hidden border-white/[0.08]">
        <CardContent className="p-5 md:p-8">
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void processFile(e.dataTransfer.files?.[0] ?? null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
            className={[
              "cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300",
              drag
                ? "border-violet-400/60 bg-violet-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20",
            ].join(" ")}
          >
            <div className="flex flex-col items-center gap-5 py-12 md:py-14">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-fuchsia-600/15 ring-1 ring-white/10">
                {busy ? (
                  <Loader2 className="h-7 w-7 animate-spin text-violet-300" />
                ) : (
                  <ImagePlus className="h-7 w-7 text-violet-200/90" />
                )}
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-medium text-white">
                  {busy ? "Analyzing your face…" : "Drop a portrait or selfie"}
                </p>
                <p className="mt-2 text-sm text-foreground/55">
                  {busy ? ANALYSIS_STAGES[stage] : "JPG / PNG · Front-facing · Even lighting"}
                </p>
              </div>

              {busy && (
                <div className="w-full max-w-xs space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                      animate={{ width: `${((stage + 1) / ANALYSIS_STAGES.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="text-center text-[11px] uppercase tracking-[0.18em] text-foreground/40">
                    Stage {stage + 1} / {ANALYSIS_STAGES.length}
                  </p>
                </div>
              )}

              {!busy && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Choose photo
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraRef.current?.click();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Use camera
                  </Button>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => void processFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                disabled={busy}
                onChange={(e) => void processFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {err && (
            <p className="mt-4 text-center text-sm text-red-300/90" role="alert">
              {err}
            </p>
          )}

          <p className="mt-6 text-center text-[12px] leading-relaxed text-foreground/50 md:text-sm">
            {PRIVACY_LONG}
          </p>
        </CardContent>
      </Card>

      {/* ─────────── Trust strip ─────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <TrustItem icon={Lock} title="Private" body="Photos never leave your device." />
        <TrustItem icon={ScanFace} title="478 landmarks" body="MediaPipe face mesh, in-browser." />
        <TrustItem icon={Sparkles} title="SCUT-FBP5500" body="Trained on real human ratings." />
      </div>
    </div>
  );
}

function ActionCard({
  title,
  subtitle,
  description,
  cta,
  icon: Icon,
  accent,
  onClick,
  progress,
  progressLabel,
  highlight,
}: {
  title: string;
  subtitle: string;
  description: string;
  cta: React.ReactNode;
  icon: typeof Wand2;
  accent: string;
  onClick: () => void;
  progress?: number;
  progressLabel?: string;
  highlight?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-3xl border bg-card/70 p-6 text-left shadow-xl transition-all md:p-7",
        highlight
          ? "border-amber-300/25 hover:border-amber-300/45"
          : "border-white/[0.08] hover:border-violet-300/30",
      ].join(" ")}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gradient-to-br ${accent} opacity-70 blur-3xl transition-opacity group-hover:opacity-100`}
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} ring-1 ring-white/10`}>
            <Icon className="h-5 w-5 text-white" />
          </span>
          {highlight && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              Recommended
            </span>
          )}
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold text-white md:text-2xl">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-foreground/45">{subtitle}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/65">{description}</p>

        {typeof progress === "number" && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45">{progressLabel}</p>
          </div>
        )}

        <div className="mt-1 text-sm font-medium text-white/90">{cta}</div>
      </div>
    </motion.button>
  );
}

function TrustItem({ icon: Icon, title, body }: { icon: typeof Lock; title: string; body: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
        <Icon className="h-4 w-4 text-violet-200" />
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-[11px] text-foreground/55">{body}</p>
      </div>
    </div>
  );
}
