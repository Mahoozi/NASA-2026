"use client";
// Person A — "Recorded flammability limits": BASS-II limit points (lib/limits.ts)
// on O2 × airflow (log), the tested range of the selected material, and the
// scenario. Reports recorded limits only; never fits or extrapolates.
import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  describePoint,
  LIMITS_INVESTIGATION,
  LIMITS_PANEL_TEXT as T,
  limitPoints,
  limitsForScenario,
  testedEnvelope,
  type LimitPoint,
} from "@/lib/limits";
import type { Run, Scenario } from "@/lib/schema";

const REPORT_URL = "https://github.com/Mahoozi/NASA-2026/blob/main/pipeline/limits_report.md";
/** 0 cm/s cannot sit on a log axis; it is drawn at the left edge and labelled "0". */
const ZERO_AT = 0.4;
const X_DOMAIN: [number, number] = [0.3, 60];
const X_TICKS = [ZERO_AT, 1, 2, 5, 10, 20, 50];
/** 12–24% covers every PSI-25 run; it grows (in even steps) to show the scenario. */
function yAxis(o2: number | undefined): { domain: [number, number]; ticks: number[] } {
  const lo = o2 !== undefined && o2 < 12 ? Math.floor(o2 / 2) * 2 - 2 : 12;
  const hi = o2 !== undefined && o2 > 24 ? Math.ceil(o2 / 2) * 2 + 2 : 24;
  const step = hi - lo > 16 ? 4 : 2;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return { domain: [lo, hi], ticks };
}
const x = (flow: number) => (flow <= 0 ? ZERO_AT : flow);

type Kind = "extinctionAt" | "extinctionBelow" | "blowoff" | "noIgnition" | "notRecorded";
type Datum = { x: number; y: number; kind: Kind; dim: boolean; label: string };

const COLOUR: Record<Kind, string> = {
  extinctionAt: "var(--lc-ext)",
  extinctionBelow: "var(--lc-ext)",
  blowoff: "var(--lc-blow)",
  noIgnition: "var(--lc-noign)",
  notRecorded: "var(--muted-foreground)",
};

function Mark({ kind, cx, cy, dim }: { kind: Kind; cx: number; cy: number; dim?: boolean }) {
  const c = COLOUR[kind];
  const o = dim ? 0.3 : 1;
  const pts = (p: [number, number][]) => p.map(([a, b]) => `${cx + a},${cy + b}`).join(" ");
  const solid = { fill: c, fillOpacity: o, stroke: "var(--background)", strokeWidth: 1.5, paintOrder: "stroke" as const };
  switch (kind) {
    case "extinctionAt":
      return <polygon points={pts([[0, 6], [6, -4], [-6, -4]])} {...solid} />;
    case "extinctionBelow":
      return <polygon points={pts([[0, 6], [6, -4], [-6, -4]])} fill="none" stroke={c} strokeOpacity={o} strokeWidth={2} />;
    case "blowoff":
      return <polygon points={pts([[0, -6], [6, 4], [-6, 4]])} {...solid} />;
    case "noIgnition":
      return (
        <g stroke={c} strokeOpacity={o} strokeWidth={2.5} strokeLinecap="round">
          <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} />
          <line x1={cx - 5} y1={cy + 5} x2={cx + 5} y2={cy - 5} />
        </g>
      );
    case "notRecorded":
      return <circle cx={cx} cy={cy} r={3} fill={c} fillOpacity={0.35} />;
  }
}

function Dot(props: { cx?: number; cy?: number; payload?: Datum }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="transparent" />
      <Mark kind={payload.kind} cx={cx} cy={cy} dim={payload.dim} />
    </g>
  );
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Datum }[] }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div className="max-w-72 rounded-md border border-primary/40 bg-popover/95 px-2.5 py-2 text-sm text-popover-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_10px_30px_rgb(0_0_0/0.65)] backdrop-blur-md">
      {d.label}
    </div>
  );
}

function LegendMark({ kind }: { kind: Kind }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <Mark kind={kind} cx={7} cy={7} />
    </svg>
  );
}

const kindOf = (p: LimitPoint): Kind =>
  p.event === "blowoff"
    ? "blowoff"
    : p.event === "no-ignition"
      ? "noIgnition"
      : p.relation === "below"
        ? "extinctionBelow"
        : "extinctionAt";

export function LimitsPanel({ runs, scenario }: { runs: Run[]; scenario: Scenario }) {
  const { points, excluded } = useMemo(() => limitPoints(runs), [runs]);
  const view = useMemo(() => limitsForScenario(scenario, runs), [scenario, runs]);
  const family = scenario.materialFamily;
  const env = useMemo(() => (family ? testedEnvelope(runs, family) : null), [runs, family]);

  const data = useMemo(() => {
    const limitData: Datum[] = points.flatMap((p) => {
      const dim = family !== undefined && p.family !== family;
      const kind = kindOf(p);
      const label = describePoint(p);
      const at = { y: p.o2Pct, kind, dim, label };
      return p.flowMaxCmS !== undefined && p.flowMaxCmS !== p.flowCmS
        ? [{ ...at, x: x(p.flowCmS) }, { ...at, x: x(p.flowMaxCmS) }]
        : [{ ...at, x: x(p.flowCmS) }];
    });
    const grey: Datum[] = runs
      .filter(
        (r) =>
          r.investigationId === LIMITS_INVESTIGATION &&
          r.events.length === 0 &&
          r.o2InitialPct !== null &&
          r.flowCmS.max !== null,
      )
      .map((r) => ({
        x: x(r.flowCmS.max!),
        y: r.o2InitialPct!,
        kind: "notRecorded" as const,
        dim: true,
        label: `${LIMITS_INVESTIGATION} test ${r.testId}: ${T.legend.notRecorded.toLowerCase()} (${r.material.family}, starting oxygen ${r.o2InitialPct}%, highest airflow ${r.flowCmS.max} cm/s).`,
      }));
    return { limitData, grey };
  }, [points, runs, family]);

  const { o2Pct: o2, flowCmS: flow } = scenario;
  const y = yAxis(o2);
  const legend: Kind[] = ["extinctionAt", "extinctionBelow", "blowoff", "noIgnition", "notRecorded"];

  return (
    <div className="limits-chart flex flex-col gap-4 rounded-lg border bg-card/60 p-4 backdrop-blur-sm">
      <style>{`
        .limits-chart { --lc-ext:#2a78d6; --lc-blow:#eb6834; --lc-noign:#1baf7a; }
        .dark .limits-chart { --lc-ext:#3987e5; --lc-blow:#d95926; --lc-noign:#199e70; }
      `}</style>
      <p className="max-w-3xl text-sm text-muted-foreground">{T.intro}</p>

      <div className="flex flex-col gap-2" aria-live="polite">
        {view.kind === "refusal" && (
          <>
            <p className="text-base font-medium">{view.text}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {view.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}
        {view.kind === "needs-material" && <p className="text-sm">{view.text}</p>}
        {view.kind === "limits" && (
          <>
            <h3 className="text-base font-semibold">
              {T.nearestHeading}: {view.envelope.family}
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {view.nearest.map((p) => (
                <li key={`${p.testId}-${p.event}`}>{describePoint(p)}</li>
              ))}
            </ul>
            <h3 className="pt-1 text-base font-semibold">{T.positionHeading}</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {view.position.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground" aria-label="Legend">
        {legend.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <LegendMark kind={k} />
            {T.legend[k]}
          </li>
        ))}
        {env?.o2 && env.flow && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-3.5 rounded-sm bg-foreground/10 ring-1 ring-foreground/30" />
            {T.legend.envelope} ({env.family})
          </li>
        )}
      </ul>

      <div
        className="h-96 w-full"
        role="img"
        aria-label={`Recorded limit points by airflow (log scale) and starting oxygen: ${points.length} points from ${LIMITS_INVESTIGATION}. The lists above give the nearest points as text.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 24, bottom: 32, left: 4 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            {env?.o2 && env.flow && (
              <ReferenceArea
                x1={x(env.flow[0])}
                x2={env.flow[1]}
                y1={env.o2[0]}
                y2={env.o2[1]}
                fill="var(--foreground)"
                fillOpacity={0.07}
                stroke="var(--foreground)"
                strokeOpacity={0.3}
                strokeDasharray="4 3"
              />
            )}
            <XAxis
              type="number"
              dataKey="x"
              scale="log"
              domain={X_DOMAIN}
              ticks={X_TICKS}
              allowDataOverflow
              tickFormatter={(v: number) => (v === ZERO_AT ? "0" : String(v))}
              tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
              stroke="var(--border)"
              label={{
                value: "Airflow (cm/s, log scale)",
                position: "insideBottom",
                offset: -16,
                fill: "var(--muted-foreground)",
                fontSize: 14,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={y.domain}
              ticks={y.ticks}
              unit="%"
              tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
              stroke="var(--border)"
              width={56}
            />
            <Tooltip content={<Tip />} cursor={false} isAnimationActive={false} />
            <Scatter data={data.grey} shape={Dot} isAnimationActive={false} />
            <Scatter data={data.limitData} shape={Dot} isAnimationActive={false} />
            {o2 !== undefined && flow !== undefined && (
              <ReferenceDot
                x={x(flow)}
                y={o2}
                r={7}
                ifOverflow="hidden"
                fill="var(--background)"
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: "Your scenario", position: "top", offset: 10, fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
            {o2 !== undefined && flow === undefined && (
              <ReferenceLine
                y={o2}
                ifOverflow="hidden"
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: `Your scenario: ${o2}% O2`, position: "insideBottomRight", fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
            {flow !== undefined && o2 === undefined && (
              <ReferenceLine
                x={x(flow)}
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: `Your scenario: ${flow} cm/s`, position: "insideTopRight", fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-sm text-muted-foreground">
        {points.length} limit points from {points.length + excluded.length} recorded events in{" "}
        {LIMITS_INVESTIGATION}; {excluded.length} excluded because the raw airflow text is
        ambiguous (
        <a href={REPORT_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
          limits report<span className="sr-only"> (opens in a new tab)</span>
        </a>
        ). No-ignition points are drawn at each end of their recorded flow range. {T.zeroFlow}
      </p>
    </div>
  );
}
