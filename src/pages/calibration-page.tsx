import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronLeft, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CALIBRATION_FACE_URLS, CALIBRATION_TARGET_VOTES } from "@/constants/calibration-faces";
import { PRIVACY_SHORT } from "@/constants/privacy";
import { useAppStore } from "@/store/use-app-store";

type Pair = { id: string; left: string; right: string };

function makePair(): Pair {
  const n = CALIBRATION_FACE_URLS.length;
  let a = Math.floor(Math.random() * n);
  let b = Math.floor(Math.random() * n);
  let guard = 0;
  while (b === a && guard++ < 20) b = Math.floor(Math.random() * n);
  return {
    id: `${a}-${b}-${Math.random().toString(36).slice(2, 7)}`,
    left: CALIBRATION_FACE_URLS[a]!,
    right: CALIBRATION_FACE_URLS[b]!,
  };
}

export function CalibrationPage() {
  const {
    calibrationVotes,
    addCalibrationVote,
    setView,
    isCalibrationComplete,
    resetCalibration,
  } = useAppStore();

  // Pre-compute the full sequence of pairs once per session so progress feels stable.
  const sessionPairs = useRef<Pair[]>(
    Array.from({ length: CALIBRATION_TARGET_VOTES + 6 }, () => makePair()),
  );
  const [voteIndex, setVoteIndex] = useState(0);
  const [chosen, setChosen] = useState<"left" | "right" | null>(null);
  const [showSuccess, setShowSuccess] = useState(isCalibrationComplete());

  // If user re-enters the page after already calibrating, show the success view.
  useEffect(() => {
    setShowSuccess(isCalibrationComplete());
    setVoteIndex(0);
    setChosen(null);
  }, [isCalibrationComplete]);

  const pair = sessionPairs.current[voteIndex] ?? makePair();
  const totalVotes = isCalibrationComplete()
    ? calibrationVotes.length
    : Math.min(CALIBRATION_TARGET_VOTES, calibrationVotes.length + voteIndex);
  const targetForUI = CALIBRATION_TARGET_VOTES;
  const displayedVoteNumber = Math.min(targetForUI, voteIndex + 1);
  const progressPct = Math.min(100, (voteIndex / targetForUI) * 100);

  const vote = useCallback(
    (winner: "left" | "right") => {
      if (chosen) return;
      setChosen(winner);
      addCalibrationVote({ leftUrl: pair.left, rightUrl: pair.right, winner });

      // Brief celebration, then advance.
      setTimeout(() => {
        setChosen(null);
        const next = voteIndex + 1;
        if (next >= targetForUI) {
          setShowSuccess(true);
        } else {
          setVoteIndex(next);
        }
      }, 320);
    },
    [chosen, addCalibrationVote, pair.left, pair.right, voteIndex, targetForUI],
  );

  // Keyboard support: ← / → to vote.
  useEffect(() => {
    if (showSuccess) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") vote("left");
      if (e.key === "ArrowRight") vote("right");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [vote, showSuccess]);

  if (showSuccess) {
    return <CalibrationSuccess onAnalyse={() => setView("home")} onRestart={() => {
      resetCalibration();
      setShowSuccess(false);
      setVoteIndex(0);
      sessionPairs.current = Array.from({ length: CALIBRATION_TARGET_VOTES + 6 }, () => makePair());
    }} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-foreground/55" onClick={() => setView("home")}>
          <ChevronLeft className="h-4 w-4" />
          Home
        </Button>
        <p className="text-xs text-foreground/45">{PRIVACY_SHORT}</p>
      </div>

      <div className="text-center md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80">
          Pairwise calibration
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
          Vote {displayedVoteNumber} of {targetForUI}
        </h1>
        <p className="mt-2 max-w-xl text-foreground/55">
          Pick the face you find more attractive. Your taste is stored only on this device and used to
          personalise the model's prior.
        </p>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-300 shadow-[0_0_18px_rgba(217,70,239,0.4)]"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>

      <p className="text-center font-display text-2xl font-medium text-white md:text-3xl">
        Which face is more attractive?
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={pair.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-5 md:grid-cols-2"
        >
          <FaceCard
            src={pair.left}
            label="Left"
            shortcut="←"
            chosen={chosen === "left"}
            dimmed={chosen === "right"}
            onClick={() => vote("left")}
          />
          <FaceCard
            src={pair.right}
            label="Right"
            shortcut="→"
            chosen={chosen === "right"}
            dimmed={chosen === "left"}
            onClick={() => vote("right")}
          />
        </motion.div>
      </AnimatePresence>

      <div className="grid gap-3 md:grid-cols-2">
        <Button
          size="lg"
          variant="outline"
          disabled={!!chosen}
          onClick={() => vote("left")}
          className="h-14 text-base"
        >
          Left is more attractive
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={!!chosen}
          onClick={() => vote("right")}
          className="h-14 text-base"
        >
          Right is more attractive
        </Button>
      </div>

      <p className="text-center text-xs text-foreground/40">
        {totalVotes} cumulative votes recorded · Use ← / → to vote with keyboard
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FaceCard({
  src,
  label,
  shortcut,
  chosen,
  dimmed,
  onClick,
}: {
  src: string;
  label: string;
  shortcut: string;
  chosen: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      animate={{
        opacity: dimmed ? 0.35 : 1,
        scale: chosen ? 1.03 : 1,
      }}
      transition={{ duration: 0.18 }}
      className={[
        "group relative overflow-hidden rounded-3xl border bg-black/30 ring-1 transition",
        chosen
          ? "border-emerald-400/70 ring-emerald-400/50 shadow-[0_0_42px_rgba(52,211,153,0.35)]"
          : "border-white/10 ring-white/5 hover:border-violet-400/40 hover:ring-violet-400/30",
      ].join(" ")}
    >
      <img
        src={src}
        alt={`Calibration portrait ${label}`}
        referrerPolicy="no-referrer"
        loading="eager"
        className="aspect-[4/5] w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 py-3">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs text-white/80 backdrop-blur">
          {shortcut}
        </span>
      </div>
      {chosen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-emerald-500/10"
        >
          <CheckCircle2 className="h-12 w-12 text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.7)]" />
        </motion.div>
      )}
    </motion.button>
  );
}

function CalibrationSuccess({ onAnalyse, onRestart }: { onAnalyse: () => void; onRestart: () => void }) {
  const orbs = useMemo(
    () => Array.from({ length: 16 }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 0.8,
      hue: Math.random() > 0.5 ? "rgba(167,139,250,0.7)" : "rgba(244,182,108,0.7)",
    })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-violet-600/[0.08] to-fuchsia-500/[0.08] p-10 text-center shadow-2xl"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {orbs.map((o, i) => (
          <motion.span
            key={i}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: -260, opacity: [0, 1, 0] }}
            transition={{ duration: o.duration, delay: o.delay, ease: "easeOut" }}
            style={{ left: `${o.x}%`, background: o.hue }}
            className="absolute bottom-0 h-2 w-2 rounded-full blur-[1px]"
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 14 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.6)]" />
      </motion.div>

      <h2 className="mt-6 font-display text-3xl font-semibold text-white">Model calibrated</h2>
      <p className="mt-3 text-foreground/70">
        Your future scores are now personalised based on your taste — your votes act as a small Bayesian
        prior on top of the SCUT-FBP5500 trained model.
      </p>
      <p className="mt-2 text-xs text-foreground/45">
        All calibration data stays in this browser. You can re-calibrate at any time.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onAnalyse}>
          <Sparkles className="h-4 w-4" />
          Start analysis
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Re-calibrate
        </Button>
      </div>
    </motion.div>
  );
}
