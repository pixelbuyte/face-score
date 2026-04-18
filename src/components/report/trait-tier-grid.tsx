import { motion } from "framer-motion";
import type { TraitTier } from "@/lib/faceAnalysis";

const TONE: Record<TraitTier["color"], { chip: string; bar: string; ring: string; text: string }> = {
  rose: {
    chip: "bg-rose-500/15 text-rose-200",
    bar: "from-rose-500/80 to-rose-400/70",
    ring: "ring-rose-400/30",
    text: "text-rose-200",
  },
  amber: {
    chip: "bg-amber-500/15 text-amber-200",
    bar: "from-amber-500/80 to-orange-400/70",
    ring: "ring-amber-400/30",
    text: "text-amber-200",
  },
  violet: {
    chip: "bg-violet-500/15 text-violet-200",
    bar: "from-violet-500/80 to-fuchsia-500/70",
    ring: "ring-violet-400/30",
    text: "text-violet-200",
  },
  fuchsia: {
    chip: "bg-fuchsia-500/15 text-fuchsia-200",
    bar: "from-fuchsia-500/80 to-pink-400/70",
    ring: "ring-fuchsia-400/30",
    text: "text-fuchsia-200",
  },
  emerald: {
    chip: "bg-emerald-500/15 text-emerald-200",
    bar: "from-emerald-500/80 to-teal-400/70",
    ring: "ring-emerald-400/30",
    text: "text-emerald-200",
  },
  sky: {
    chip: "bg-sky-500/15 text-sky-200",
    bar: "from-sky-500/80 to-cyan-400/70",
    ring: "ring-sky-400/30",
    text: "text-sky-200",
  },
};

export function TraitTierGrid({ tiers }: { tiers: TraitTier[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tiers.map((t, i) => {
        const tone = TONE[t.color];
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 ring-1 ${tone.ring}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
                  {t.family}
                </p>
                <p className={`mt-1 font-display text-lg font-semibold ${tone.text}`}>{t.label}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.chip}`}>
                {t.score}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, t.score))}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 + i * 0.03 }}
                className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-foreground/65">{t.blurb}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
