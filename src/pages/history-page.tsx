import { motion } from "framer-motion";
import { ChevronRight, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store/use-app-store";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function HistoryPage() {
  const { reports, deleteReport, openReport, setView } = useAppStore();

  if (reports.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
          <Clock className="h-7 w-7 text-foreground/40" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-white">No saved reports yet</h1>
        <p className="text-foreground/55">
          Run an analysis and tap <strong>Save report</strong> to track changes over time. Lighting, angle,
          and expression all influence scores — comparing reports tells you what's stable.
        </p>
        <Button onClick={() => setView("home")}>Run an analysis</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80">History</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-white md:text-4xl">
          Your saved reports
        </h1>
        <p className="mt-2 text-sm text-foreground/55">
          {reports.length} report{reports.length === 1 ? "" : "s"} stored locally in this browser. Nothing is
          uploaded.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {reports.map((r, i) => {
          const top = Math.max(1, 100 - r.percentileHint);
          const vsTyp = Math.round(r.overallScore - 58);
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="glass-panel group overflow-hidden transition hover:border-violet-300/30">
                <button
                  type="button"
                  onClick={() => openReport(r.id)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                    {r.imageDataUrl ? (
                      <img
                        src={r.imageDataUrl}
                        alt=""
                        className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-foreground/40">
                        No preview
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-3xl font-semibold leading-none text-white">
                            {r.overallScore}%
                          </p>
                          {r.tier && (
                            <span className="rounded-md bg-violet-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-100 backdrop-blur">
                              {r.tier.short}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-foreground/65">
                          Top {top}% · {vsTyp >= 0 ? "+" : ""}
                          {vsTyp}% vs typical (58%)
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                  </div>
                </button>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-foreground/55">{formatDate(r.createdAt)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-300/80 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(r.id);
                      }}
                      aria-label="Delete report"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Progress value={r.overallScore} className="h-1" />
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <Stat label="Sym" value={`${r.metrics.symmetry.score}`} />
                    <Stat label="Thirds" value={`${r.metrics.thirdsBalance.score}`} />
                    <Stat label="Jaw" value={r.metrics.jawAngle.display} />
                    <Stat label="Tilt" value={r.metrics.canthalTilt.display} />
                  </div>
                </CardContent>
              </Card>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
      <p className="text-foreground/45">{label}</p>
      <p className="mt-0.5 font-medium text-white">{value}</p>
    </div>
  );
}
