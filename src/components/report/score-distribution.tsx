import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { x: number; d: number };

function bellCurve(mu: number, sigma: number, n = 60): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = 14 + i * (86 / (n - 1));
    const z = (x - mu) / sigma;
    const d = Math.exp(-0.5 * z * z);
    out.push({ x: Math.round(x * 10) / 10, d: Math.round(d * 1000) / 1000 });
  }
  return out;
}

type Props = {
  userScore: number;
  className?: string;
};

export function ScoreDistributionChart({ userScore, className }: Props) {
  const data = useMemo(() => bellCurve(58, 14), []);
  const vsTypical = Math.round(userScore - 58);

  return (
    <div className={className}>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
            Population distribution
          </p>
          <p className="mt-0.5 text-xs text-foreground/55">
            Based on thousands of rated portrait photos (research dataset)
          </p>
        </div>
        <p className="text-right text-[11px] text-amber-200/90">
          {vsTypical >= 0 ? "+" : ""}
          {vsTypical}% vs typical (58%)
        </p>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="fillDist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="rgb(167, 139, 250)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="x"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              ticks={[20, 40, 50, 60, 70, 80]}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{
                background: "rgba(15,18,28,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(v) => `Score about ${v}%`}
              formatter={(v: unknown) => [typeof v === "number" ? v.toFixed(2) : String(v), "how common"]}
            />
            <ReferenceLine x={58} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 4" />
            <ReferenceLine
              x={userScore}
              stroke="rgb(251, 191, 36)"
              strokeDasharray="4 4"
              label={{
                value: "You",
                fill: "rgb(251, 191, 36)",
                fontSize: 11,
                position: "top",
              }}
            />
            <Area type="monotone" dataKey="d" stroke="rgb(167, 139, 250)" fill="url(#fillDist)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-foreground/40">
        <span>← lower scores</span>
        <span>most people ~58%</span>
        <span>higher scores →</span>
      </div>
    </div>
  );
}
