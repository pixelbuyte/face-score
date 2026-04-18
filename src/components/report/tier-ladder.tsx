import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronDown, ChevronRight, Info, ListChecks, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ALL_TIERS, nextTierDelta, pslFromScore, type Tier } from "@/lib/faceAnalysis";

type TonePalette = {
  text: string;
  bar: string;
  ring: string;
  glow: string;
  border: string;
  chip: string;
  dot: string;
};

const TONE: Record<Tier["color"], TonePalette> = {
  rose: {
    text: "text-rose-200",
    bar: "from-rose-500 via-rose-400 to-orange-300",
    ring: "ring-rose-400/50",
    glow: "shadow-[0_0_44px_-8px_rgba(244,63,94,0.55)]",
    border: "border-rose-400/40",
    chip: "bg-rose-500/15 text-rose-200",
    dot: "bg-rose-300",
  },
  amber: {
    text: "text-amber-200",
    bar: "from-amber-500 via-orange-400 to-yellow-300",
    ring: "ring-amber-400/50",
    glow: "shadow-[0_0_44px_-8px_rgba(251,191,36,0.55)]",
    border: "border-amber-400/40",
    chip: "bg-amber-500/15 text-amber-200",
    dot: "bg-amber-300",
  },
  violet: {
    text: "text-violet-200",
    bar: "from-violet-500 via-fuchsia-500 to-pink-400",
    ring: "ring-violet-400/50",
    glow: "shadow-[0_0_44px_-8px_rgba(167,139,250,0.65)]",
    border: "border-violet-400/40",
    chip: "bg-violet-500/15 text-violet-200",
    dot: "bg-violet-300",
  },
  fuchsia: {
    text: "text-fuchsia-200",
    bar: "from-fuchsia-500 via-pink-400 to-rose-300",
    ring: "ring-fuchsia-400/50",
    glow: "shadow-[0_0_44px_-8px_rgba(232,121,249,0.6)]",
    border: "border-fuchsia-400/40",
    chip: "bg-fuchsia-500/15 text-fuchsia-200",
    dot: "bg-fuchsia-300",
  },
  emerald: {
    text: "text-emerald-200",
    bar: "from-emerald-500 via-teal-400 to-cyan-300",
    ring: "ring-emerald-400/50",
    glow: "shadow-[0_0_44px_-8px_rgba(52,211,153,0.6)]",
    border: "border-emerald-400/40",
    chip: "bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-300",
  },
  sky: {
    text: "text-sky-200",
    bar: "from-sky-500 via-cyan-400 to-violet-400",
    ring: "ring-sky-400/50",
    glow: "shadow-[0_0_44px_-8px_rgba(56,189,248,0.6)]",
    border: "border-sky-400/40",
    chip: "bg-sky-500/15 text-sky-200",
    dot: "bg-sky-300",
  },
};

/* ------------------------------------------------------------------ */
/*  Compact hero badge — used inside the overall score card            */
/* ------------------------------------------------------------------ */

export function TierBadge({ tier, score }: { tier: Tier; score: number }) {
  const tone = TONE[tier.color];
  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 18 }}
      className={`inline-flex items-center gap-3 rounded-2xl border ${tone.border} bg-card/60 px-4 py-2.5 ring-1 ${tone.ring} ${tone.glow}`}
    >
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${tone.chip}`}>
        {tier.code}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-base font-semibold ${tone.text}`}>{tier.short}</span>
        <span className="text-[11px] text-foreground/55">{tier.long}</span>
      </div>
      <span className="text-[11px] font-mono text-foreground/55">PSL {pslFromScore(score).toFixed(1)}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bell-curve mini chart                                              */
/* ------------------------------------------------------------------ */

type BellPoint = { x: number; d: number };

function bellCurve(mu: number, sigma: number, n = 70): BellPoint[] {
  const out: BellPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = 10 + i * (90 / (n - 1));
    const z = (x - mu) / sigma;
    const d = Math.exp(-0.5 * z * z);
    out.push({ x: Math.round(x * 10) / 10, d: Math.round(d * 1000) / 1000 });
  }
  return out;
}

function MiniBellCurve({ score, color }: { score: number; color: Tier["color"] }) {
  const data = useMemo(() => bellCurve(58, 14), []);
  const tone = TONE[color];
  const dotColor =
    color === "rose"
      ? "rgb(251,113,133)"
      : color === "amber"
        ? "rgb(251,191,36)"
        : color === "fuchsia"
          ? "rgb(232,121,249)"
          : color === "emerald"
            ? "rgb(52,211,153)"
            : color === "sky"
              ? "rgb(56,189,248)"
              : "rgb(167,139,250)";

  return (
    <div className="relative">
      <div className="h-[110px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="tierBellFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="rgb(167, 139, 250)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="x"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              ticks={[20, 40, 50, 60, 70, 80]}
            />
            <YAxis hide domain={[0, "auto"]} />
            <ReferenceLine x={58} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 4" />
            <ReferenceLine
              x={score}
              stroke={dotColor}
              strokeOpacity={0.55}
              strokeDasharray="3 4"
            />
            <Area type="monotone" dataKey="d" stroke="rgba(167,139,250,0.85)" fill="url(#tierBellFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Glowing user dot — positioned on the curve x-axis using the same domain (10 → 100) */}
      <div
        className="pointer-events-none absolute bottom-[18px] -translate-x-1/2"
        style={{ left: `calc(${((score - 10) / 90) * 100}% + 0px)` }}
      >
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 240, damping: 14 }}
          className={`block h-3.5 w-3.5 rounded-full bg-current ${tone.text}`}
          style={{ boxShadow: `0 0 18px 4px ${dotColor}` }}
        />
        <motion.span
          aria-hidden
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 -z-10 rounded-full"
          style={{ background: dotColor, filter: "blur(8px)" }}
        />
        <p className={`mt-1 whitespace-nowrap text-center text-[10px] font-semibold uppercase tracking-wider ${tone.text}`}>
          You · {score}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active tier callout                                                */
/* ------------------------------------------------------------------ */

function ActiveTierCallout({
  score,
  tier,
  percentile,
  sd,
}: {
  score: number;
  tier: Tier;
  percentile: number;
  sd: number;
}) {
  const tone = TONE[tier.color];
  const { delta, next } = nextTierDelta(score);
  const tierProgress = Math.min(100, Math.max(0, ((score - tier.min) / (tier.max - tier.min)) * 100));
  const top = Math.max(1, Math.min(99, 100 - percentile));

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${tone.border} bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-6 ring-1 ${tone.ring} ${tone.glow}`}>
      {/* Animated shine sweep — only on the active tier */}
      <motion.div
        aria-hidden
        initial={{ x: "-120%" }}
        animate={{ x: "140%" }}
        transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
      />

      <div className="relative grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            <span className={`rounded-md px-2 py-0.5 ${tone.chip}`}>{tier.code}</span>
            <span>{tier.long}</span>
          </div>
          <h3 className={`font-display text-3xl font-semibold leading-tight md:text-4xl ${tone.text}`}>
            {tier.short}
          </h3>
          <p className="text-sm leading-relaxed text-foreground/75">
            <strong className="text-white">{tier.blurb}</strong> {tier.context}
          </p>
          <p className="text-xs leading-relaxed text-foreground/55">
            This puts you above approximately{" "}
            <strong className="text-white">{percentile}%</strong> of people in the SCUT-FBP5500 reference
            dataset.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center md:grid-cols-1 md:gap-3">
          <Stat label="Overall score" value={`${score}`} suffix="/ 100" tone={tone.text} large />
          <Stat label="Global percentile" value={`Top ${top}%`} tone={tone.text} />
          <Stat
            label="Standard dev."
            value={`${sd >= 0 ? "+" : ""}${sd.toFixed(1)} SD`}
            sub={sd >= 0 ? "above mean" : "below mean"}
            tone={tone.text}
          />
        </div>
      </div>

      {/* Tier progress bar */}
      <div className="relative mt-5 space-y-1.5">
        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-foreground/45">
          <span>{tier.min} pts</span>
          <span className={tone.text}>position inside tier</span>
          <span>{tier.max} pts</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tierProgress}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
            style={{ boxShadow: "0 0 18px rgba(167,139,250,0.45)" }}
          />
          <motion.span
            aria-hidden
            initial={{ x: "-120%" }}
            animate={{ x: "260%" }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </div>
      </div>

      {next && (
        <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs">
          <ArrowUp className="h-3.5 w-3.5 text-emerald-300" />
          <span className="text-foreground/75">
            <strong className="text-white">{delta} pts</strong> to reach{" "}
            <span className={tone.text}>{next.short}</span>
            <span className="text-foreground/45"> ({next.long})</span>
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  sub,
  tone,
  large,
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  tone: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45">{label}</p>
      <p className="mt-1 flex items-baseline justify-center gap-1 md:justify-start">
        <span className={`font-display ${large ? "text-2xl md:text-3xl" : "text-xl"} font-semibold ${tone}`}>{value}</span>
        {suffix && <span className="text-[11px] text-foreground/45">{suffix}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-foreground/45">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Methodology accordion                                              */
/* ------------------------------------------------------------------ */

function MethodologyDetails() {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white/90">
          <ListChecks className="h-4 w-4 text-violet-200" />
          How this score was calculated
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-foreground/55" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="methodology"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/[0.05]"
          >
            <ul className="space-y-2.5 px-4 py-4 text-sm text-foreground/70">
              <MethodRow weight="40%" color="bg-violet-400" label="Geometric harmony">
                Facial thirds, symmetry, ratios, canthal tilt, jaw and other landmark-derived metrics.
              </MethodRow>
              <MethodRow weight="35%" color="bg-fuchsia-400" label="Model prediction">
                Neural-style prior trained on the public SCUT-FBP5500 dataset of real human ratings.
              </MethodRow>
              <MethodRow weight="25%" color="bg-amber-300" label="Personal calibration">
                Adjustment derived from your pairwise calibration votes (capped at +8 pts).
              </MethodRow>
              <li className="pt-2 text-[11px] text-foreground/45">
                Raw composite is normalised onto a population curve with μ = 58, σ = 14, then mapped to
                percentile and standard deviation.
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MethodRow({
  weight,
  color,
  label,
  children,
}: {
  weight: string;
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1 inline-flex h-5 w-12 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${color}`}>
        {weight}
      </span>
      <p className="text-sm leading-relaxed text-foreground/75">
        <span className="font-medium text-white">{label}.</span>{" "}
        <span className="text-foreground/65">{children}</span>
      </p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact full-ladder list                                           */
/* ------------------------------------------------------------------ */

function FullLadder({ score, tier }: { score: number; tier: Tier }) {
  return (
    <ol className="space-y-1.5">
      {ALL_TIERS.map((t) => {
        const isActive = t.key === tier.key;
        const tone = TONE[t.color];
        const fill = isActive ? Math.min(100, ((score - t.min) / (t.max - t.min)) * 100) : 0;
        return (
          <li
            key={t.key}
            className={[
              "relative grid grid-cols-[44px_minmax(0,1.4fr)_minmax(0,1fr)_56px] items-center gap-3 overflow-hidden rounded-xl border px-3 py-2 text-xs transition",
              isActive
                ? `${tone.border} bg-white/[0.05] ${tone.glow}`
                : "border-white/[0.05] bg-white/[0.015]",
            ].join(" ")}
          >
            <span
              className={[
                "rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold tracking-wider",
                isActive ? tone.chip : "bg-white/[0.05] text-foreground/55",
              ].join(" ")}
            >
              {t.code}
            </span>
            <span className={`truncate font-medium ${isActive ? "text-white" : "text-foreground/65"}`}>
              {t.short}
            </span>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              {isActive && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fill}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                  className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                  style={{ boxShadow: "0 0 14px rgba(167,139,250,0.45)" }}
                />
              )}
            </div>
            <span className="text-right font-mono text-[10px] text-foreground/45">
              {t.min}–{t.max - 1}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

type Props = {
  score: number;
  tier: Tier;
  percentile: number;
  sd: number;
  /** Optional anchor id to scroll to when "View full breakdown" is clicked. */
  scrollTargetId?: string;
};

export function AttractivenessTierCard({ score, tier, percentile, sd, scrollTargetId }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const tone = TONE[tier.color];

  const onScrollToBreakdown = () => {
    if (!scrollTargetId) return;
    const el = document.getElementById(scrollTargetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[hsl(232_30%_9%)] via-[hsl(255_25%_8%)] to-[hsl(280_30%_8%)] p-6 shadow-2xl md:p-8 ${tone.border} ring-1 ${tone.ring} ${tone.glow}`}
    >
      {/* Soft decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl"
      />

      {/* Header */}
      <div className="relative mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">
            Tier classification
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-white md:text-3xl">
            Attractiveness Tier &amp; Global Percentile
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-foreground/55 md:text-sm">
            Based on a model trained on real human ratings (SCUT-FBP5500) plus your calibration votes.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-foreground/65 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="What does the PSL tier mean?"
          >
            <Info className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-10 z-10 w-72 rounded-xl border border-white/10 bg-[hsl(232_28%_9%/0.98)] p-3 text-[11px] leading-relaxed text-foreground/75 shadow-2xl backdrop-blur"
              >
                Tiers are an approximate mapping from your overall numeric score onto the looksmaxxing
                community's PSL scale. Real attractiveness is multi-dimensional; treat the tier as a
                simplified label, and the underlying metrics as the actual measurement.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bell curve mini chart */}
      <div className="relative mb-6 rounded-2xl border border-white/[0.06] bg-black/25 p-3">
        <div className="mb-1 flex items-baseline justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
            Population distribution · n = 5,500
          </p>
          <p className="text-[10px] font-mono text-foreground/55">μ = 58 · σ = 14</p>
        </div>
        <MiniBellCurve score={score} color={tier.color} />
      </div>

      {/* Active tier callout */}
      <div className="relative mb-6">
        <ActiveTierCallout score={score} tier={tier} percentile={percentile} sd={sd} />
      </div>

      {/* Full ladder */}
      <div className="relative mb-6">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
          Full tier ladder
        </p>
        <FullLadder score={score} tier={tier} />
      </div>

      {/* Methodology */}
      <div className="relative mb-5">
        <MethodologyDetails />
      </div>

      {/* CTA */}
      {scrollTargetId && (
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-foreground/45">
            Want the full picture? Drill into every individual measurement.
          </p>
          <Button variant="outline" onClick={onScrollToBreakdown}>
            <Sparkles className="h-4 w-4" />
            View full breakdown
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Backward-compatible export — old name still works                  */
/* ------------------------------------------------------------------ */

export function TierLadder(props: { score: number; tier: Tier }) {
  return <FullLadder {...props} />;
}
