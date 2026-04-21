import { MapPin, Route, Shield, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";

type Provider = "AllTrails" | "Google Maps" | "Mapbox" | "Geoapify";

type RouteOption = {
  id: string;
  provider: Provider;
  name: string;
  distanceMiles: number;
  safetyRating: number;
  elevationGainFt: number;
  estimatedMinutes: number;
  sceneryScore: number;
};

const ROUTES: RouteOption[] = [
  {
    id: "alltrails-lakeside-loop",
    provider: "AllTrails",
    name: "Lakeside Forest Loop",
    distanceMiles: 4.3,
    safetyRating: 4.6,
    elevationGainFt: 520,
    estimatedMinutes: 95,
    sceneryScore: 9.2,
  },
  {
    id: "alltrails-ridge-climb",
    provider: "AllTrails",
    name: "Sunset Ridge Climb",
    distanceMiles: 6.8,
    safetyRating: 4.1,
    elevationGainFt: 1120,
    estimatedMinutes: 150,
    sceneryScore: 9.6,
  },
  {
    id: "google-riverwalk",
    provider: "Google Maps",
    name: "Riverwalk Downtown Circuit",
    distanceMiles: 3.1,
    safetyRating: 4.4,
    elevationGainFt: 120,
    estimatedMinutes: 62,
    sceneryScore: 8.1,
  },
  {
    id: "google-campus-greenway",
    provider: "Google Maps",
    name: "Campus Greenway Route",
    distanceMiles: 2.4,
    safetyRating: 4.7,
    elevationGainFt: 80,
    estimatedMinutes: 48,
    sceneryScore: 7.4,
  },
  {
    id: "mapbox-harbor-traverse",
    provider: "Mapbox",
    name: "Harbor View Traverse",
    distanceMiles: 5.2,
    safetyRating: 4.2,
    elevationGainFt: 330,
    estimatedMinutes: 108,
    sceneryScore: 8.8,
  },
  {
    id: "mapbox-park-link",
    provider: "Mapbox",
    name: "Park Connector Link",
    distanceMiles: 3.8,
    safetyRating: 4.5,
    elevationGainFt: 210,
    estimatedMinutes: 78,
    sceneryScore: 8.0,
  },
  {
    id: "geoapify-old-town",
    provider: "Geoapify",
    name: "Old Town Walkability Tour",
    distanceMiles: 2.9,
    safetyRating: 4.3,
    elevationGainFt: 150,
    estimatedMinutes: 56,
    sceneryScore: 8.3,
  },
  {
    id: "geoapify-waterfront",
    provider: "Geoapify",
    name: "Waterfront Promenade Walk",
    distanceMiles: 4.7,
    safetyRating: 4.8,
    elevationGainFt: 90,
    estimatedMinutes: 86,
    sceneryScore: 8.7,
  },
];

export function PlannerPage() {
  const [selectedProviders, setSelectedProviders] = useState<Record<Provider, boolean>>({
    AllTrails: true,
    "Google Maps": true,
    Mapbox: true,
    Geoapify: true,
  });
  const [maxDistance, setMaxDistance] = useState(8);
  const [minSafety, setMinSafety] = useState(3.5);
  const [sortBy, setSortBy] = useState<"best" | "distance" | "safety">("best");

  const { plannerMilesLog, addPlannerMiles, removePlannerMiles, clearPlannerMiles } = useAppStore();

  const visibleRoutes = useMemo(() => {
    const providers = new Set(
      (Object.entries(selectedProviders) as [Provider, boolean][]).filter(([, on]) => on).map(([name]) => name),
    );

    const filtered = ROUTES.filter(
      (route) =>
        providers.has(route.provider) && route.distanceMiles <= maxDistance && route.safetyRating >= minSafety,
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === "distance") return a.distanceMiles - b.distanceMiles;
      if (sortBy === "safety") return b.safetyRating - a.safetyRating;
      const scoreA = a.safetyRating * 0.6 + a.sceneryScore * 0.4;
      const scoreB = b.safetyRating * 0.6 + b.sceneryScore * 0.4;
      return scoreB - scoreA;
    });
  }, [maxDistance, minSafety, selectedProviders, sortBy]);

  const totalMiles = useMemo(
    () => plannerMilesLog.reduce((sum, entry) => sum + entry.miles, 0),
    [plannerMilesLog],
  );

  const providerMiles = useMemo(
    () =>
      plannerMilesLog.reduce<Record<Provider, number>>(
        (acc, entry) => {
          acc[entry.provider] += entry.miles;
          return acc;
        },
        {
          AllTrails: 0,
          "Google Maps": 0,
          Mapbox: 0,
          Geoapify: 0,
        },
      ),
    [plannerMilesLog],
  );

  const providerAvgSafety = useMemo(() => {
    const grouped = ROUTES.reduce<Record<Provider, { total: number; count: number }>>(
      (acc, route) => {
        acc[route.provider].total += route.safetyRating;
        acc[route.provider].count += 1;
        return acc;
      },
      {
        AllTrails: { total: 0, count: 0 },
        "Google Maps": { total: 0, count: 0 },
        Mapbox: { total: 0, count: 0 },
        Geoapify: { total: 0, count: 0 },
      },
    );

    return (Object.keys(grouped) as Provider[]).map((provider) => ({
      provider,
      avg: grouped[provider].count ? grouped[provider].total / grouped[provider].count : 0,
    }));
  }, []);

  const activeCount = visibleRoutes.length;
  const avgSafety =
    activeCount > 0 ? visibleRoutes.reduce((sum, route) => sum + route.safetyRating, 0) / activeCount : 0;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-violet-500/10 p-6 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
          <Route className="h-3 w-3" />
          Route Planner
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Compare walking routes across AllTrails, Google Maps, Mapbox, and Geoapify
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-foreground/65 md:text-base">
          Filter routes by distance and safety rating, then log completed walks to accumulate your miles.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Routes matching filters" value={String(activeCount)} hint="across selected providers" />
        <MetricCard label="Average safety" value={`${avgSafety.toFixed(1)} / 5`} hint="for currently visible routes" />
        <MetricCard label="Total miles completed" value={`${totalMiles.toFixed(1)} mi`} hint="persisted on this device" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-4 w-4 text-emerald-300" />
              Filters
            </CardTitle>
            <CardDescription>Tune distance, safety, and provider coverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">Providers</p>
              <div className="grid gap-2">
                {(Object.keys(selectedProviders) as Provider[]).map((provider) => (
                  <label
                    key={provider}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-sm">{provider}</span>
                    <input
                      type="checkbox"
                      checked={selectedProviders[provider]}
                      onChange={() =>
                        setSelectedProviders((prev) => ({
                          ...prev,
                          [provider]: !prev[provider],
                        }))
                      }
                      className="h-4 w-4 accent-emerald-400"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">
                Max distance: {maxDistance.toFixed(1)} mi
              </p>
              <input
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">
                Minimum safety: {minSafety.toFixed(1)} / 5
              </p>
              <input
                type="range"
                min={2.5}
                max={5}
                step={0.1}
                value={minSafety}
                onChange={(e) => setMinSafety(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">Sort results</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "best" | "distance" | "safety")}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-emerald-300/40"
              >
                <option value="best">Best overall</option>
                <option value="distance">Shortest distance</option>
                <option value="safety">Highest safety</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {visibleRoutes.map((route) => (
            <Card key={route.id} className="border-white/[0.09] bg-card/85">
              <CardContent className="p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                      {route.provider}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-white">{route.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/70">
                      <Pill>{route.distanceMiles.toFixed(1)} mi</Pill>
                      <Pill>{route.estimatedMinutes} min</Pill>
                      <Pill>{route.elevationGainFt} ft gain</Pill>
                      <Pill>Scenery {route.sceneryScore.toFixed(1)} / 10</Pill>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-center">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/60">Safety</p>
                    <p className="text-lg font-semibold text-emerald-200">{route.safetyRating.toFixed(1)} / 5</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    className="w-full md:w-auto"
                    onClick={() =>
                      addPlannerMiles({
                        routeId: route.id,
                        provider: route.provider,
                        routeName: route.name,
                        miles: route.distanceMiles,
                        safetyRating: route.safetyRating,
                      })
                    }
                  >
                    Log completed walk
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {visibleRoutes.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-foreground/65">
                No routes match your filters. Try increasing max distance or lowering the minimum safety threshold.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-4 w-4 text-amber-300" />
              Mile accumulation tracker
            </CardTitle>
            <CardDescription>Each logged walk contributes to your cumulative mileage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plannerMilesLog.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 text-sm text-foreground/60">
                No logged walks yet. Pick a route and click “Log completed walk”.
              </p>
            ) : (
              plannerMilesLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{entry.routeName}</p>
                    <p className="text-xs text-foreground/55">
                      {entry.provider} · {entry.miles.toFixed(1)} mi · Safety {entry.safetyRating.toFixed(1)}/5
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removePlannerMiles(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            {plannerMilesLog.length > 0 && (
              <Button variant="outline" onClick={clearPlannerMiles}>
                Clear all logged miles
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-4 w-4 text-cyan-300" />
              Provider comparison
            </CardTitle>
            <CardDescription>Average safety and logged miles by routing source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {providerAvgSafety.map((entry) => (
              <div key={entry.provider} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-sm font-semibold text-white">{entry.provider}</p>
                <p className="mt-1 text-xs text-foreground/65">Avg safety: {entry.avg.toFixed(2)} / 5</p>
                <p className="text-xs text-foreground/65">Miles logged: {providerMiles[entry.provider].toFixed(1)} mi</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-white/[0.09] bg-white/[0.02]">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 text-xs text-foreground/55">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium">
      {children}
    </span>
  );
}
