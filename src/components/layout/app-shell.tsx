import { AnimatePresence, motion } from "framer-motion";
import { History, Home, Lock, SlidersHorizontal, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { PRIVACY_SHORT } from "@/constants/privacy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore, VALID_VIEWS } from "@/store/use-app-store";

export function AppShell({ children }: { children: ReactNode }) {
  const rawView = useAppStore((s) => s.view);
  const view = VALID_VIEWS.has(rawView) ? rawView : "home";
  const { setView, isCalibrationComplete, reports } = useAppStore();

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[hsl(230_30%_5%/0.78)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setView("home")}
            className="flex items-center gap-2 text-left transition-opacity hover:opacity-90"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4 text-violet-200" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">Areum</span>
          </button>

          <nav className="flex items-center gap-1 md:gap-2">
            <NavButton
              active={view === "home"}
              onClick={() => setView("home")}
              icon={<Home className="h-3.5 w-3.5 opacity-70" />}
              label="Home"
            />
            <NavButton
              active={view === "calibrate"}
              onClick={() => setView("calibrate")}
              icon={<SlidersHorizontal className="h-3.5 w-3.5 opacity-70" />}
              label="Calibrate"
              dot={isCalibrationComplete()}
            />
            <NavButton
              active={view === "history"}
              onClick={() => setView("history")}
              icon={<History className="h-3.5 w-3.5 opacity-70" />}
              label="History"
              badge={reports.length > 0 ? reports.length : undefined}
            />
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 pb-2 text-[10px] text-foreground/45 md:px-6 md:text-xs">
          <Lock className="h-3 w-3" />
          {PRIVACY_SHORT}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0.6, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="mx-auto mt-8 max-w-6xl space-y-2 px-4 pb-10 text-center text-[11px] text-foreground/40 md:px-6">
        <p>
          Built as an open learning project using the public{" "}
          <span className="text-foreground/60">SCUT-FBP5500</span> dataset of real human attractiveness
          ratings.
        </p>
        <p>Entertainment and self-reflection only — not medical, cosmetic, or surgical advice.</p>
      </footer>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  dot,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  dot?: boolean;
  badge?: number;
}) {
  return (
    <Button
      variant={active ? "subtle" : "ghost"}
      size="sm"
      className={cn("relative gap-1.5", active && "bg-white/10")}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {dot && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
      {typeof badge === "number" && (
        <span className="ml-0.5 rounded-full bg-violet-500/20 px-1.5 text-[10px] font-semibold text-violet-200">
          {badge}
        </span>
      )}
    </Button>
  );
}
