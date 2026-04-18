import { motion } from "framer-motion";
import type { ThirdsBreakdown } from "@/lib/faceAnalysis";

type Props = {
  thirds: ThirdsBreakdown;
};

const IDEAL = 1 / 3;

function deviation(v: number): string {
  const d = ((v - IDEAL) * 100).toFixed(1);
  const sign = v >= IDEAL ? "+" : "";
  return `${sign}${d}pp vs ideal`;
}

export function ThirdsVisualizer({ thirds }: Props) {
  const rows: { label: string; value: number; from: string; to: string }[] = [
    { label: "Forehead third", value: thirds.upper, from: "from-violet-500/80", to: "to-fuchsia-500/80" },
    { label: "Midface third", value: thirds.middle, from: "from-fuchsia-500/80", to: "to-amber-400/80" },
    { label: "Lower face third", value: thirds.lower, from: "from-amber-400/80", to: "to-rose-400/80" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((r, i) => {
          const pct = Math.min(100, Math.round(r.value * 100));
          const idealPct = 33;
          return (
            <div key={r.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white/85">{r.label}</span>
                <span className="font-mono text-foreground/55">
                  {pct}% · {deviation(r.value)}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 + i * 0.08 }}
                  className={`h-full rounded-full bg-gradient-to-r ${r.from} ${r.to}`}
                />
                <span
                  className="absolute top-0 h-full w-px bg-white/55"
                  style={{ left: `${idealPct}%` }}
                  aria-label="Ideal 33.3% mark"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-foreground/60">
        <span>Reference</span>
        <span className="font-mono">Ideal 1 : 1 : 1 (each ≈ 33.3%)</span>
      </div>
    </div>
  );
}
