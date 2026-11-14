"use client";
// Person A — where the imported runs sit in airflow × starting O2, and where the
// scenario falls relative to them. One point per run; nothing is extrapolated.
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
import type { MaterialFamily, Run, Scenario } from "@/lib/schema";
import { familyLabel, OXYGEN_NOT_RECORDED } from "./coverage-grid";
import { materialLabel } from "./material-label";
import { MATERIAL_FAMILIES } from "./scenario";

// Scatter puts every pair on screen, so the dataviz palette caps colour at its
// first three slots (validated all-pairs, light and dark). The three largest
// families get them in fixed order; every other family is neutral gray and is
// identified by its marker shape (see SHAPE below).
const COLOURED: { family: MaterialFamily; slot: string }[] = [
  { family: "PMMA rod", slot: "--gc-s1" },
  { family: "SIBAL fabric", slot: "--gc-s2" },
  { family: "PMMA film", slot: "--gc-s3" },
];
const OTHER_SLOT = "--gc-other";
const Y_DOMAIN: [number, number] = [10, 36];
const MOON_O2 = 30;

type Point = {
  x: number;
  y: number;
  run: Run;
  match: boolean;
};

const slotFor = (f: MaterialFamily) => COLOURED.find((c) => c.family === f)?.slot ?? OTHER_SLOT;

// Every family also gets its own marker shape, so identity never rests on
// colour alone (the four gray families are told apart by shape only).
type Shape = "circle" | "square" | "triangle" | "diamond" | "plus" | "triangleDown" | "ring" | "squareRing";
const SHAPE: Record<MaterialFamily, Shape> = {
  "PMMA rod": "circle",
  "SIBAL fabric": "square",
  "PMMA film": "triangle",
  "PMMA slab": "diamond",
  Nomex: "plus",
  wax: "triangleDown",
  other: "ring",
  "PMMA sphere": "squareRing",
};

/** One marker, ~9–12px, centred on (cx, cy), with the 2px surface ring. */
function Marker({
  shape,
  cx,
  cy,
  colour,
  opacity = 1,
}: {
  shape: Shape;
  cx: number;
  cy: number;
  colour: string;
  opacity?: number;
}) {
  const solid = {
    fill: colour,
    fillOpacity: opacity,
    stroke: "var(--background)",
    strokeWidth: 2,
    paintOrder: "stroke" as const,
  };
  const hollow = { fill: "none", stroke: colour, strokeOpacity: opacity, strokeWidth: 2 };
  const pts = (p: [number, number][]) => p.map(([x, y]) => `${cx + x},${cy + y}`).join(" ");
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={4.5} {...solid} />;
    case "square":
      return <rect x={cx - 4} y={cy - 4} width={8} height={8} {...solid} />;
    case "triangle":
      return <polygon points={pts([[0, -5.5], [5, 3.5], [-5, 3.5]])} {...solid} />;
    case "triangleDown":
      return <polygon points={pts([[0, 5.5], [5, -3.5], [-5, -3.5]])} {...solid} />;
    case "diamond":
      return <polygon points={pts([[0, -6], [6, 0], [0, 6], [-6, 0]])} {...solid} />;
    case "plus":
      return (
        <polygon
          points={pts([[-1.75, -5.5], [1.75, -5.5], [1.75, -1.75], [5.5, -1.75], [5.5, 1.75], [1.75, 1.75], [1.75, 5.5], [-1.75, 5.5], [-1.75, 1.75], [-5.5, 1.75], [-5.5, -1.75], [-1.75, -1.75]])}
          {...solid}
        />
      );
    case "ring":
      return <circle cx={cx} cy={cy} r={4} {...hollow} />;
    case "squareRing":
      return <rect x={cx - 4} y={cy - 4} width={8} height={8} {...hollow} />;
  }
}

function Dot(props: { cx?: number; cy?: number; payload?: Point }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return <g />;
  const family = payload.run.material.family;
  return (
    <g>
      {/* 24px transparent hit target around a ~10px mark */}
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <Marker
        shape={SHAPE[family]}
        cx={cx}
        cy={cy}
        colour={`var(${slotFor(family)})`}
        opacity={payload.match ? 1 : 0.25}
      />
    </g>
  );
}

function LegendMark({ family }: { family: MaterialFamily }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <Marker shape={SHAPE[family]} cx={7} cy={7} colour={`var(${slotFor(family)})`} />
    </svg>
  );
}

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  const r = p.run;
  const flow =
    r.flowCmS.min === r.flowCmS.max ? `${r.flowCmS.max}` : `${r.flowCmS.min}–${r.flowCmS.max}`;
  return (
    <div className="flex max-w-64 flex-col gap-0.5 rounded-md border border-border bg-popover px-2.5 py-2 text-sm text-popover-foreground shadow-md">
      <span className="font-medium">Test {r.testId}</span>
      <span>{materialLabel(r)} — {r.material.raw}</span>
      <span>Starting O₂ {r.o2InitialPct}% · airflow {flow} cm/s</span>
      <span className="text-muted-foreground">
        {r.events.length ? r.events.join(", ") : "outcome not recorded"}
      </span>
      {r.flags.length > 0 && (
        <span className="text-muted-foreground">
          {r.flags.length} data-quality flag{r.flags.length === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

const AIRFLOW_NOT_RECORDED = "airflow not recorded in this table";
const AIRFLOW_NOT_NUMERIC = "airflow not numeric in source";

/** Why each unplotted run is missing a coordinate, grouped by reason and investigation. */
export function unplottedReasons(unplotted: Run[]) {
  const groups = new Map<string, { reason: string; investigationId: string; runs: Run[] }>();
  for (const r of unplotted) {
    const parts: string[] = [];
    if (r.o2InitialPct === null)
      parts.push(r.flags.includes(OXYGEN_NOT_RECORDED) ? "oxygen not recorded in its table" : "starting oxygen missing");
    if (r.flowCmS.max === null && r.flowCmS.min === null)
      parts.push(
        r.flags.includes(AIRFLOW_NOT_RECORDED)
          ? "airflow not recorded in its table"
          : r.flags.includes(AIRFLOW_NOT_NUMERIC)
            ? "airflow not numeric in source"
            : "airflow missing",
      );
    const reason = parts.join(" and ");
    const key = `${r.investigationId}|${reason}`;
    const g = groups.get(key) ?? { reason, investigationId: r.investigationId, runs: [] };
    g.runs.push(r);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.runs.length - a.runs.length);
}

export function GapChart({
  runs,
  scenario,
  matchingRunIds,
}: {
  runs: Run[];
  scenario: Scenario;
  /** null = no run-level dimension set, so every run is shown at full strength. */
  matchingRunIds: Set<string> | null;
}) {
  const { groups, unplotted, families } = useMemo(() => {
    const groups = new Map<MaterialFamily, Point[]>();
    const unplotted: Run[] = [];
    for (const run of runs) {
      const x = run.flowCmS.max ?? run.flowCmS.min;
      if (run.o2InitialPct === null || x === null) {
        unplotted.push(run);
        continue;
      }
      const key = run.material.family;
      const point = { x, y: run.o2InitialPct, run, match: matchingRunIds?.has(run.id) ?? true };
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }
    // Legend order: the three coloured families in slot order, then the rest
    // in schema order. Only families with plotted runs are listed.
    const present = new Set(groups.keys());
    const families = [
      ...COLOURED.map((c) => c.family),
      ...MATERIAL_FAMILIES.filter((f) => !COLOURED.some((c) => c.family === f)),
    ].filter((f) => present.has(f));
    return { groups, unplotted, families };
  }, [runs, matchingRunIds]);

  const { o2Pct: o2, flowCmS: flow } = scenario;
  const plotted = runs.length - unplotted.length;
  const plottedRuns = [...groups.values()].flat().map((p) => p.run);
  const reasons = unplottedReasons(unplotted);

  return (
    <figure className="gap-chart flex flex-col gap-3">
      <style>{`
        .gap-chart { --gc-s1:#2a78d6; --gc-s2:#eb6834; --gc-s3:#1baf7a; --gc-other:#898781; }
        .dark .gap-chart { --gc-s1:#3987e5; --gc-s2:#d95926; --gc-s3:#199e70; --gc-other:#898781; }
      `}</style>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground" aria-label="Legend">
        {families.map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <LegendMark family={f} />
            {familyLabel(f, plottedRuns)}
          </li>
        ))}
        {matchingRunIds && <li>Faded marks: runs that do not match the scenario</li>}
      </ul>

      <div
        className="h-96 w-full"
        role="img"
        aria-label={`Scatter of ${plotted} runs by airflow and starting oxygen.${
          o2 !== undefined ? ` Scenario oxygen ${o2}%.` : ""
        }${flow !== undefined ? ` Scenario airflow ${flow} cm/s.` : ""} The table below lists every run.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 24, bottom: 32, left: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="" vertical={false} />
            <ReferenceArea
              y1={MOON_O2}
              y2={Y_DOMAIN[1]}
              ifOverflow="extendDomain"
              fill="var(--foreground)"
              fillOpacity={0.06}
              stroke="none"
              label={{
                value: "Moon Base planned atmosphere (≥30% O2, NASA challenge brief)",
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 14,
              }}
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Airflow"
              unit=" cm/s"
              domain={[0, "dataMax"]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
              stroke="var(--border)"
              label={{
                value: "Airflow (cm/s, highest recorded in the run)",
                position: "insideBottom",
                offset: -16,
                fill: "var(--muted-foreground)",
                fontSize: 14,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Starting O2"
              unit="%"
              domain={Y_DOMAIN}
              ticks={[10, 15, 20, 25, 30, 35]}
              allowDataOverflow={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
              stroke="var(--border)"
              width={56}
            />
            <Tooltip content={<PointTooltip />} cursor={false} isAnimationActive={false} />
            {[...groups].map(([key, points]) => (
              <Scatter key={key} data={points} shape={Dot} isAnimationActive={false} />
            ))}

            {o2 !== undefined && flow !== undefined && (
              <ReferenceDot
                x={flow}
                y={o2}
                r={7}
                ifOverflow="extendDomain"
                fill="var(--background)"
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: "Your scenario", position: "top", offset: 10, fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
            {o2 !== undefined && flow === undefined && (
              <ReferenceLine
                y={o2}
                ifOverflow="extendDomain"
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: `Your scenario: ${o2}% O2`, position: "insideBottomRight", fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
            {flow !== undefined && o2 === undefined && (
              <ReferenceLine
                x={flow}
                ifOverflow="extendDomain"
                stroke="var(--foreground)"
                strokeWidth={2}
                label={{ value: `Your scenario: ${flow} cm/s`, position: "insideTopRight", fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>
          {plotted} of {runs.length} runs plotted: only runs that record both a starting oxygen
          and an airflow. X is the highest airflow recorded in a run, because crews stepped the
          flow during some tests.
        </span>
        {reasons.length > 0 && (
          <span>
            Not plotted:{" "}
            {reasons
              .map(
                (g) =>
                  `${g.runs.length} ${g.investigationId} run${g.runs.length === 1 ? "" : "s"}${
                    g.runs.length <= 10 ? ` (${g.runs.map((r) => r.testId).join(", ")})` : ""
                  }: ${g.reason}`,
              )
              .join("; ")}
            .
          </span>
        )}
      </figcaption>
    </figure>
  );
}
