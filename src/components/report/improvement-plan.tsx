import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

type Props = {
  tips: string[];
  weakest: string[];
};

export function ImprovementPlan({ tips, weakest }: Props) {
  return (
    <div className="space-y-5">
      {weakest.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/55">
          <span className="uppercase tracking-[0.18em] text-foreground/40">Targeted at</span>
          {weakest.map((w) => (
            <span
              key={w}
              className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-0.5 text-amber-200/90"
            >
              {w}
            </span>
          ))}
        </div>
      )}

      <ol className="space-y-3">
        {tips.map((tip, i) => (
          <motion.li
            key={tip}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/15 to-rose-400/10 ring-1 ring-amber-300/20">
              <Lightbulb className="h-4 w-4 text-amber-200" />
            </span>
            <p className="text-sm leading-relaxed text-foreground/80">{tip}</p>
          </motion.li>
        ))}
      </ol>

      <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-foreground/45">
        These suggestions are general, non-medical, and lifestyle/photographic in nature. They are not
        cosmetic, surgical, or psychological advice.
      </p>
    </div>
  );
}
