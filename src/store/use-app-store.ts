import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CALIBRATION_TARGET_VOTES } from "@/constants/calibration-faces";
import type { AnalysisResult, FaceMetrics, Tier, TraitTier } from "@/lib/faceAnalysis";
import { buildTraitTiers, tierFromScore } from "@/lib/faceAnalysis";

export type AppView = "home" | "calibrate" | "report" | "history";

export const VALID_VIEWS = new Set<AppView>(["home", "calibrate", "report", "history"]);

export type CalibrationVote = {
  id: string;
  leftUrl: string;
  rightUrl: string;
  winner: "left" | "right";
};

export type SavedReport = {
  id: string;
  createdAt: number;
  overallScore: number;
  percentileHint: number;
  sdAboveMean: number;
  metrics: FaceMetrics;
  tips: string[];
  tier: Tier;
  traitTiers: TraitTier[];
  imageDataUrl?: string;
};

export type LastAnalysis = {
  result: AnalysisResult;
  imageDataUrl: string;
  landmarks: NormalizedLandmark[];
};

type State = {
  view: AppView;
  calibrationVotes: CalibrationVote[];
  reports: SavedReport[];
  lastAnalysis: LastAnalysis | null;
  setView: (v: AppView) => void;
  addCalibrationVote: (v: Omit<CalibrationVote, "id">) => void;
  resetCalibration: () => void;
  getCalibrationBoost: () => number;
  isCalibrationComplete: () => boolean;
  setLastAnalysis: (a: LastAnalysis | null) => void;
  /** Single update so the report always opens with data (avoids persist/render races). */
  finishAnalysis: (a: LastAnalysis) => void;
  saveReportFromLast: () => string | null;
  deleteReport: (id: string) => void;
  openReport: (id: string) => void;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      view: "home",
      calibrationVotes: [],
      reports: [],
      lastAnalysis: null,

      setView: (view) => set({ view }),

      addCalibrationVote: (v) =>
        set((s) => ({
          calibrationVotes: [...s.calibrationVotes, { ...v, id: uid() }],
        })),

      resetCalibration: () => set({ calibrationVotes: [] }),

      getCalibrationBoost: () => {
        const n = get().calibrationVotes.length;
        if (n < CALIBRATION_TARGET_VOTES) return 0;
        return Math.min(8, 2 + Math.floor((n - CALIBRATION_TARGET_VOTES + 1) * 0.5));
      },

      isCalibrationComplete: () => get().calibrationVotes.length >= CALIBRATION_TARGET_VOTES,

      setLastAnalysis: (lastAnalysis) => set({ lastAnalysis }),

      finishAnalysis: (lastAnalysis) => set({ lastAnalysis, view: "report" }),

      saveReportFromLast: () => {
        const la = get().lastAnalysis;
        if (!la) return null;
        const id = uid();
        const r: SavedReport = {
          id,
          createdAt: Date.now(),
          overallScore: la.result.overallScore,
          percentileHint: la.result.percentileHint,
          sdAboveMean: la.result.sdAboveMean,
          metrics: la.result.metrics,
          tips: la.result.tips,
          tier: la.result.tier,
          traitTiers: la.result.traitTiers,
          imageDataUrl: la.imageDataUrl,
        };
        set((s) => ({ reports: [r, ...s.reports] }));
        return id;
      },

      deleteReport: (id) =>
        set((s) => ({
          reports: s.reports.filter((x) => x.id !== id),
        })),

      openReport: (id) => {
        const r = get().reports.find((x) => x.id === id);
        if (!r) return;
        // Re-hydrate `lastAnalysis` from the saved report (landmarks not persisted).
        set({
          view: "report",
          lastAnalysis: {
            result: {
              metrics: r.metrics,
              overallScore: r.overallScore,
              modelScorePlaceholder: r.overallScore,
              percentileHint: r.percentileHint,
              sdAboveMean: r.sdAboveMean,
              tips: r.tips,
              weakest: [],
              strongest: [],
              tier: r.tier ?? tierFromScore(r.overallScore),
              traitTiers: r.traitTiers ?? buildTraitTiers(r.metrics),
            },
            imageDataUrl: r.imageDataUrl ?? "",
            landmarks: [],
          },
        });
      },
    }),
    {
      name: "areum-local-v3",
      partialize: (s) => ({
        calibrationVotes: s.calibrationVotes,
        reports: s.reports,
      }),
      onRehydrateStorage: () => (state, err) => {
        if (err) console.warn("areum: storage rehydrate", err);
        if (state && !VALID_VIEWS.has(state.view)) {
          useAppStore.setState({ view: "home" });
        }
      },
    },
  ),
);
