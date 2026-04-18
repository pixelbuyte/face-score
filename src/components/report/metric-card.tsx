import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { Metric } from "@/lib/faceAnalysis";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  name: string;
  metric: Metric;
  icon: LucideIcon;
  index?: number;
};

function bandColor(score: number): string {
  if (score >= 80) return "from-emerald-400 to-teal-300";
  if (score >= 65) return "from-violet-400 to-fuchsia-400";
  if (score >= 50) return "from-amber-300 to-orange-400";
  return "from-rose-400 to-red-400";
}

function bandLabel(score: number): string {
  if (score >= 85) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Balanced";
  if (score >= 45) return "Average";
  return "Below average";
}

export function MetricCard({ name, metric, icon: Icon, index = 0 }: Props) {
  const userPct = Math.min(100, Math.max(0, metric.score));
  const meanPct = Math.min(100, Math.max(0, metric.populationMean));
  const delta = userPct - meanPct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="glass-panel relative h-full overflow-hidden">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 ring-1 ring-white/10">
                <Icon className="h-4 w-4 text-violet-200" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                  {name}
                </p>
                <p className="font-display text-2xl font-semibold leading-tight text-white">
                  {metric.display}
                </p>
              </div>
            </div>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                userPct >= 75
                  ? "bg-emerald-500/15 text-emerald-300"
                  : userPct >= 55
                    ? "bg-violet-500/15 text-violet-200"
                    : "bg-amber-500/15 text-amber-300",
              ].join(" ")}
            >
              {bandLabel(userPct)}
            </span>
          </div>

          {/* Score gauge */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[11px] text-foreground/45">
              <span>Harmony score</span>
              <span className="font-medium text-white/85">{userPct} / 100</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${userPct}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 + index * 0.03 }}
                className={`h-full rounded-full bg-gradient-to-r ${bandColor(userPct)} shadow-[0_0_14px_rgba(167,139,250,0.4)]`}
              />
              {/* Population mean marker */}
              <span
                className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/40"
                style={{ left: `${meanPct}%` }}
                aria-label="Population mean"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-foreground/40">
              <span>↑ avg ({meanPct})</span>
              <span className={delta >= 0 ? "text-emerald-300/80" : "text-amber-300/80"}>
                {delta >= 0 ? "+" : ""}
                {delta} vs avg
              </span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-foreground/65">{metric.explanation}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
