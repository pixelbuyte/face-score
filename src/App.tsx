import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CalibrationPage } from "@/pages/calibration-page";
import { HistoryPage } from "@/pages/history-page";
import { HomePage } from "@/pages/home-page";
import { PlannerPage } from "@/pages/planner-page";
import { ReportPage } from "@/pages/report-page";
import { useAppStore, VALID_VIEWS } from "@/store/use-app-store";

export default function App() {
  const view = useAppStore((s) => s.view);

  useEffect(() => {
    if (!VALID_VIEWS.has(view)) {
      useAppStore.setState({ view: "home" });
    }
  }, [view]);

  const safe = VALID_VIEWS.has(view) ? view : "home";

  return (
    <AppShell>
      {safe === "home" && <HomePage />}
      {safe === "calibrate" && <CalibrationPage />}
      {safe === "report" && <ReportPage />}
      {safe === "history" && <HistoryPage />}
      {safe === "planner" && <PlannerPage />}
    </AppShell>
  );
}