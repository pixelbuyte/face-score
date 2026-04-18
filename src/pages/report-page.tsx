import { motion } from "framer-motion";
import {
  ArrowUp,
  ChevronLeft,
  Download,
  Eye,
  Frown,
  GitCompare,
  Layers,
  Move,
  Save,
  Scan,
  ScanFace,
  Smile,
  Sparkles,
  Triangle,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
const FaceMeshAnalysisSection = lazy(async () => {
  const m = await import("@/components/report/face-mesh-3d");
  return { default: m.FaceMeshAnalysisSection };
});
import { ImprovementPlan } from "@/components/report/improvement-plan";
import { MetricCard } from "@/components/report/metric-card";
import { ScoreDistributionChart } from "@/components/report/score-distribution";
import { ThirdsVisualizer } from "@/components/report/thirds-visualizer";
import { AttractivenessTierCard, TierBadge } from "@/components/report/tier-ladder";
import { TraitTierGrid } from "@/components/report/trait-tier-grid";
import { PRIVACY_LONG, PRIVACY_SHORT } from "@/constants/privacy";
import type { FaceMetrics } from "@/lib/faceAnalysis";
import { nextTierDelta } from "@/lib/faceAnalysis";
import { useAppStore } from "@/store/use-app-store";

function pct(n: number, lo = 0, hi = 100) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

const METRIC_CONFIG: { key: keyof Omit<FaceMetrics, "thirds" | "harmony">; name: string; icon: typeof Eye }[] = [
  { key: "symmetry", name: "Facial symmetry", icon: GitCompare },
  { key: "thirdsBalance", name: "Facial thirds", icon: Layers },
  { key: "midfaceRatio", name: "Midface ratio", icon: ScanFace },
  { key: "canthalTilt", name: "Canthal tilt", icon: Eye },
  { key: "jawAngle", name: "Jawline angle", icon: Triangle },
  { key: "eyeSpacing", name: "Eye spacing", icon: Move },
  { key: "philtrumRatio", name: "Philtrum ratio", icon: Smile },
  { key: "noseRatio", name: "Nose proportion", icon: Scan },
  { key: "lipFullness", name: "Lip fullness", icon: Frown },
];

export function ReportPage() {
  const { lastAnalysis, setView, saveReportFromLast, getCalibrationBoost } = useAppStore();
  const [saved, setSaved] = useState(false);

  if (!lastAnalysis) {
    return (
      <div className="text-center">
        <p className="text-foreground/60">No analysis yet.</p>
        <Button className="mt-4" onClick={() => setView("home")}>
          Upload a photo
        </Button>
      </div>
    );
  }

  const { result, imageDataUrl, landmarks } = lastAnalysis;
  const { metrics } = result;
  const overall = pct(result.overallScore, 0, 100);
  const percentile = pct(result.percentileHint, 1, 99);
  const topBracket = Math.max(1, Math.min(50, 100 - percentile));
  const vsTypicalPct = Math.round(overall - 58);

  const harmonyScore = metrics.harmony.score;
  const { delta: ptsToNextTier, next: nextTier } = nextTierDelta(overall);

  const onSave = () => {
    saveReportFromLast();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-12">
      {/* ─────────── Header ─────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 gap-1 text-foreground/55"
            onClick={() => setView("home")}
          >
            <ChevronLeft className="h-4 w-4" />
            Home
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80">
            Facial analysis report
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-white md:text-4xl">
            Your detailed breakdown
          </h1>
          <p className="mt-2 max-w-xl text-sm text-foreground/55">
            Computed locally from 478 MediaPipe landmarks plus a SCUT-FBP5500 trained prior.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onSave}>
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save report"}
          </Button>
          <Button
            variant="subtle"
            disabled={!imageDataUrl}
            onClick={() => {
              const a = document.createElement("a");
              a.href = imageDataUrl;
              a.download = `areum-report-${Date.now()}.jpg`;
              a.click();
            }}
          >
            <Download className="h-4 w-4" />
            Export image
          </Button>
        </div>
      </div>

      {/* ─────────── Hero score + analysed photo ─────────── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl">
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="Analyzed portrait with overlays"
                className="w-full object-contain"
              />
            ) : (
              <div className="flex min-h-[260px] items-center justify-center px-6 py-16 text-center text-sm text-foreground/50">
                Preview image could not be exported from your browser, but every score below is still
                computed from your photo.
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-foreground/45">
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-200">Thirds</span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-200/85">Midline</span>
            <span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-200/85">φ bands</span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-200/85">Mirror sample</span>
            <span className="ml-auto">{PRIVACY_SHORT}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Card className="glass-panel relative overflow-hidden border-violet-500/15">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.18),transparent_60%)]"
            />
            <CardHeader className="relative pb-2">
              <CardDescription className="uppercase tracking-[0.22em] text-foreground/45">
                Overall attractiveness
              </CardDescription>
              <div className="flex flex-wrap items-baseline gap-3">
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display text-7xl font-bold tracking-tighter text-white drop-shadow-[0_0_24px_rgba(167,139,250,0.45)] md:text-[5.5rem]"
                >
                  {overall}%
                </motion.span>
                <span className="text-foreground/40">out of 100%</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-200">
                  Top {topBracket}%
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-200">
                  {vsTypicalPct >= 0 ? "+" : ""}
                  {vsTypicalPct}% vs typical (58%)
                </span>
                <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-200">
                  Face geometry {harmonyScore}%
                </span>
              </div>
              <div className="mt-4">
                <TierBadge tier={result.tier} score={overall} />
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4 pt-2">
              <p className="text-sm text-foreground/65">
                {overall >= 80
                  ? "Your result lines up with faces people often rate highly in research photo sets."
                  : overall >= 65
                    ? "You score above what most people get — a solid, balanced result across the main measurements."
                    : "You’re close to what most people score. The detailed metrics below show where you stand out."}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  <p className="text-foreground/45">Face geometry</p>
                  <p className="mt-0.5 font-display text-base text-white">{harmonyScore}%</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  <p className="text-foreground/45">Photo model</p>
                  <p className="mt-0.5 font-display text-base text-white">{pct(result.modelScorePlaceholder)}%</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
                  <p className="text-foreground/45">Your picks</p>
                  <p className="mt-0.5 font-display text-base text-white">+{getCalibrationBoost()}%</p>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground/45">
                Total score blends the photo model (~half), face measurements from your landmarks (~half), plus a
                small bonus from your calibration picks (up to +8%). Everything is shown on a 0–100% scale.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─────────── Attractiveness Tier & Global Percentile ─────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        <AttractivenessTierCard
          score={overall}
          tier={result.tier}
          percentile={percentile}
          scrollTargetId="metric-breakdown"
        />
      </motion.div>

      {/* ─────────── 3D face mesh (hero) + distribution ─────────── */}
      <Suspense
        fallback={
          <div
            className="glass-panel min-h-[420px] w-full animate-pulse rounded-3xl border border-violet-500/15 bg-violet-950/20"
            aria-hidden
          />
        }
      >
        <FaceMeshAnalysisSection
          landmarks={landmarks}
          imageDataUrl={imageDataUrl}
          tier={result.tier}
          overallScore={overall}
          className="w-full"
        />
      </Suspense>

      <Card className="glass-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Population score distribution</CardTitle>
          <CardDescription>Where your % score sits on a typical “bell curve” of faces</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ScoreDistributionChart userScore={overall} />
          <p className="mt-3 text-xs leading-relaxed text-foreground/55">
            You land in the <strong className="text-white">top {topBracket}%</strong> on this curve. Most people
            cluster around <strong className="text-white">58%</strong>; you&apos;re{" "}
            <strong className="text-amber-200">
              {overall >= 58 ? `${overall - 58}% above` : `${58 - overall}% below`}
            </strong>{" "}
            that typical mark on the 0–100% scale.
          </p>
        </CardContent>
      </Card>

      {/* ─────────── Per-trait micro-tiers ─────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Trait tiers</h2>
            <p className="text-xs text-foreground/50">
              Per-region looksmaxxing labels: hunter / prey eyes, jaw tier, chin tier, midface, lips, harmony.
            </p>
          </div>
          <span className="text-xs text-foreground/45">{result.traitTiers.length} traits</span>
        </div>
        <TraitTierGrid tiers={result.traitTiers} />
      </div>

      {/* ─────────── Strongest / weakest summary ─────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryStrip title="Your strongest" items={result.strongest} tone="emerald" />
        <SummaryStrip title="Most room to grow" items={result.weakest} tone="amber" />
      </div>

      {/* ─────────── Facial thirds breakdown ─────────── */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Facial thirds — exact breakdown</CardTitle>
          <CardDescription>
            Vertical proportion of forehead : midface : lower face. Marquardt-style 1 : 1 : 1 ideal.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <ThirdsVisualizer thirds={metrics.thirds} />
        </CardContent>
      </Card>

      {/* ─────────── Metric grid ─────────── */}
      <div id="metric-breakdown" className="scroll-mt-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">Metric breakdown</h2>
          <span className="text-xs text-foreground/45">{METRIC_CONFIG.length} measurements</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {METRIC_CONFIG.map((cfg, i) => (
            <MetricCard
              key={cfg.key}
              name={cfg.name}
              icon={cfg.icon}
              metric={metrics[cfg.key]}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ─────────── Improvement plan ─────────── */}
      <Card className="glass-panel border-amber-500/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-amber-200" />
            Personalised improvement plan
          </CardTitle>
          <CardDescription>
            Photo-, lighting-, and lifestyle-level suggestions targeting your weakest metrics. No medical or
            cosmetic advice.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <ImprovementPlan tips={result.tips} weakest={result.weakest} />
        </CardContent>
      </Card>

      {/* ─────────── Privacy footer ─────────── */}
      <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center text-[12px] leading-relaxed text-foreground/55 md:text-left">
        {PRIVACY_LONG}
      </p>
    </div>
  );
}

function SummaryStrip({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "amber";
}) {
  if (items.length === 0) return null;
  const ring = tone === "emerald" ? "border-emerald-400/20 bg-emerald-500/[0.06]" : "border-amber-400/20 bg-amber-500/[0.06]";
  const dot = tone === "emerald" ? "bg-emerald-400" : "bg-amber-400";
  return (
    <div className={`rounded-2xl border p-4 ${ring}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 text-sm text-white/85 capitalize">
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
