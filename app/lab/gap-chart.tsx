"use client";
// Person A — where the imported runs sit in airflow × starting O2, and where the
// scenario falls relative to them. One point per run; nothing is extrapolated.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import type { Investigation, MaterialFamily, Run, Scenario } from "@/lib/schema";
import { familyLabel, OXYGEN_NOT_RECORDED } from "./coverage-grid";
import { type Anchor, anchorOf, FloatingTip, justTouched, noteTouch, RunTipBody, useDismiss } from "./floating-tip";
import { o2OffAxis, o2OffAxisNote, Y_DOMAIN } from "./gap-axis";
import { runTip, runTipText } from "./run-details";
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
const MOON_O2 = 30;

// The default view colours points by investigation, as most cabin-evidence charts do.
// The three hues stay clear of red, amber and green, which would read as safety verdicts.
const INVESTIGATION_COLOUR: Record<string, string> = {
  "PSI-25": "#7dd3fc",
  "PSI-98": "#c4b5fd",
  "PSI-99": "#f9a8d4",
};
const OTHER_INVESTIGATION = "#a3a3a3";
const colourOfInvestigation = (id: string) => INVESTIGATION_COLOUR[id] ?? OTHER_INVESTIGATION;
type ColourBy = "investigation" | "material";

/** Fixed, repeatable horizontal spread for the strip of runs placed by oxygen only. */
const stripX = (i: number) => 0.15 + 0.7 * ((i * 0.618034) % 1);

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

type Ctl = {
  investigations: Investigation[];
  colourBy: ColourBy;
  /** Runs that carry the score of a top-ranked investigation; drawn with a ring. */
  closest: Set<string>;
  show: (run: Run, el: Element) => void;
  hide: (run: Run) => void;
  /** A tap on a touch screen: toggles the pinned tooltip. */
  tap: (run: Run, el: Element) => void;
  /** Click or Enter: go to the run's row in the runs table. */
  select: (run: Run) => void;
};
const ChartCtl = createContext<Ctl | null>(null);

/** One focusable point. Hover and keyboard focus show the details; a tap toggles them. */
function DotMark({ cx, cy, point }: { cx: number; cy: number; point: Point }) {
  const ctl = useContext(ChartCtl)!;
  const { run } = point;
  const family = run.material.family;
  return (
    <g
      data-point
      data-tip-root="chart"
      data-run={run.id}
      tabIndex={0}
      role="button"
      aria-label={`${runTipText(runTip(run, ctl.investigations))} Press Enter to show this run in the runs table.`}
      className="cursor-pointer"
      onPointerDown={(e) => {
        if (e.pointerType === "touch") noteTouch();
      }}
      onPointerEnter={(e) => e.pointerType !== "touch" && ctl.show(run, e.currentTarget)}
      onPointerLeave={(e) => e.pointerType !== "touch" && ctl.hide(run)}
      onPointerUp={(e) => e.pointerType === "touch" && ctl.tap(run, e.currentTarget)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && ctl.show(run, e.currentTarget)}
      onBlur={() => ctl.hide(run)}
      onClick={() => !justTouched() && ctl.select(run)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctl.select(run);
        }
      }}
    >
      {/* 24px transparent hit target around a ~10px mark */}
      <circle className="hit" cx={cx} cy={cy} r={12} fill="transparent" />
      {ctl.closest.has(run.id) && (
        <circle cx={cx} cy={cy} r={9} fill="none" stroke="var(--foreground)" strokeWidth={2} />
      )}
      {ctl.colourBy === "investigation" ? (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={colourOfInvestigation(run.investigationId)}
          fillOpacity={point.match ? 0.8 : 0.16}
          stroke={colourOfInvestigation(run.investigationId)}
          strokeOpacity={point.match ? 1 : 0.35}
          strokeWidth={1.5}
        />
      ) : (
        <Marker
          shape={SHAPE[family]}
          cx={cx}
          cy={cy}
          colour={`var(${slotFor(family)})`}
          opacity={point.match ? 1 : 0.25}
        />
      )}
    </g>
  );
}

function Dot(props: { cx?: number; cy?: number; payload?: Point }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return <g />;
  return <DotMark cx={cx} cy={cy} point={payload} />;
}

function LegendMark({ family }: { family: MaterialFamily }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <Marker shape={SHAPE[family]} cx={7} cy={7} colour={`var(${slotFor(family)})`} />
    </svg>
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
  investigations = [],
  onSelectRun,
  closestRunIds,
}: {
  runs: Run[];
  /** For the acronym in each point's details; ids are shown when omitted. */
  investigations?: Investigation[];
  /** Called when a point is clicked or activated by keyboard (the Lab scrolls to the run's table row). */
  onSelectRun?: (run: Run) => void;
  scenario: Scenario;
  /** null = no run-level dimension set, so every run is shown at full strength. */
  matchingRunIds: Set<string> | null;
  /** Best run of each top-ranked investigation (match-explain.ts); ringed on the chart. */
  closestRunIds?: Set<string>;
}) {
  const [colourBy, setColourBy] = useState<ColourBy>("investigation");
  const [tip, setTip] = useState<{ run: Run; anchor: Anchor; pinned: boolean } | null>(null);
  const close = useCallback(() => setTip(null), []);
  useDismiss(tip !== null, "chart", close);
  const ctl = useMemo<Ctl>(
    () => ({
      investigations,
      colourBy,
      closest: closestRunIds ?? new Set(),
      show: (run, el) => setTip({ run, anchor: anchorOf(el), pinned: false }),
      // A tap-pinned tooltip holds a button, so losing focus to it must not close the tooltip.
      hide: (run) => setTip((t) => (t?.run.id === run.id && !t.pinned ? null : t)),
      tap: (run, el) =>
        setTip((t) => (t?.run.id === run.id ? null : { run, anchor: anchorOf(el), pinned: true })),
      select: (run) => {
        setTip(null);
        onSelectRun?.(run);
      },
    }),
    [investigations, onSelectRun, colourBy, closestRunIds],
  );

  const { groups, unplotted, strip, families } = useMemo(() => {
    const groups = new Map<MaterialFamily, Point[]>();
    const unplotted: Run[] = [];
    // Runs with a starting oxygen but no numeric airflow: placed by oxygen only, in the strip.
    const strip: Point[] = [];
    for (const run of runs) {
      const x = run.flowCmS.max ?? run.flowCmS.min;
      if (run.o2InitialPct !== null && x === null) {
        strip.push({ x: stripX(strip.length), y: run.o2InitialPct, run, match: matchingRunIds?.has(run.id) ?? true });
        continue;
      }
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
    return { groups, unplotted, strip, families };
  }, [runs, matchingRunIds]);

  const { o2Pct: o2, flowCmS: flow } = scenario;
  // Oxygen outside the fixed axis (for example a 100% spacesuit): no marker, said in the caption.
  const o2Off = o2OffAxis(o2);
  const plotted = runs.length - unplotted.length - strip.length;
  const plottedRuns = [...groups.values()].flat().map((p) => p.run);
  const reasons = unplottedReasons(unplotted);
  // Investigation legend: every investigation with a point on the chart or in the strip.
  const shownInvestigations = [...new Set([...plottedRuns, ...strip.map((p) => p.run)].map((r) => r.investigationId))].map(
    (id) => ({
      id,
      label: investigations.find((i) => i.id === id)?.acronym || id,
      n: [...plottedRuns, ...strip.map((p) => p.run)].filter((r) => r.investigationId === id).length,
    }),
  );
  const crosshair = o2 !== undefined && !o2Off && flow !== undefined;
  const legendItem = "flex items-center gap-1.5";

  return (
    <figure className="gap-chart flex flex-col gap-3 rounded-lg border bg-card/60 p-4 backdrop-blur-sm">
      <style>{`
        .gap-chart { --gc-s1:#2a78d6; --gc-s2:#eb6834; --gc-s3:#1baf7a; --gc-other:#898781; }
        .dark .gap-chart { --gc-s1:#3987e5; --gc-s2:#d95926; --gc-s3:#199e70; --gc-other:#898781; }
        .gap-chart [data-point]:focus { outline: none; }
        .gap-chart [data-point]:focus-visible .hit { stroke: var(--foreground); stroke-width: 2; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-sm" role="group" aria-label="Colour points by">
          <span className="px-2 text-muted-foreground">Colour by</span>
          {(["investigation", "material"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={colourBy === c}
              onClick={() => setColourBy(c)}
              className={`rounded px-2.5 py-1 font-medium capitalize ${
                colourBy === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Every point is a NASA PSI run · crosshair = your scenario</p>
      </div>

      <div className="flex w-full gap-2">
      {strip.length > 0 && (
        <div className="flex w-14 shrink-0 flex-col items-center sm:w-24">
          <div className="h-96 w-full rounded-md border border-border bg-muted/40" aria-label={`${strip.length} runs placed by starting oxygen only`}>
            <ChartCtl.Provider value={ctl}>
              <ResponsiveContainer width="100%" height="100%">
                {/* Top and bottom margins match the main plot (32 + 30 px axis) so oxygen lines up. */}
                <ScatterChart margin={{ top: 12, right: 8, bottom: 62, left: 8 }}>
                  <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
                  <YAxis type="number" dataKey="y" domain={Y_DOMAIN} hide />
                  <Scatter data={strip} shape={Dot} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCtl.Provider>
          </div>
          <p className="-mt-14 px-1 text-center text-sm leading-tight text-muted-foreground">airflow not in cm/s</p>
        </div>
      )}
      <div
        className="h-96 min-w-0 flex-1"
        role="group"
        aria-label={`Scatter of ${plotted} runs by airflow and starting oxygen.${
          o2 !== undefined ? ` Scenario oxygen ${o2}%.` : ""
        }${flow !== undefined ? ` Scenario airflow ${flow} cm/s.` : ""} The table below lists every run.`}
      >
        <ChartCtl.Provider value={ctl}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 24, bottom: 32, left: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="" />
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
              ticks={[0, 10, 20, 30, 40, 50]}
              height={30}
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
              ticks={[10, 20, 30]}
              allowDataOverflow={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 14 }}
              stroke="var(--border)"
              width={56}
            />
            {[...groups].map(([key, points]) => (
              <Scatter key={key} data={points} shape={Dot} isAnimationActive={false} />
            ))}

            {crosshair && <ReferenceLine y={o2} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="6 5" />}
            {crosshair && <ReferenceLine x={flow} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="6 5" />}
            {crosshair && (
              <ReferenceDot
                x={flow}
                y={o2}
                r={9}
                ifOverflow="extendDomain"
                fill="none"
                stroke="var(--primary)"
                strokeWidth={2.5}
                label={{ value: "Your scenario", position: "top", offset: 10, fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
            {o2 !== undefined && !o2Off && flow === undefined && (
              <ReferenceLine
                y={o2}
                ifOverflow="extendDomain"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="6 5"
                label={{ value: `Your scenario: ${o2}% O2`, position: "insideBottomRight", fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
            {flow !== undefined && (o2 === undefined || o2Off) && (
              <ReferenceLine
                x={flow}
                ifOverflow="extendDomain"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="6 5"
                label={{ value: `Your scenario: ${flow} cm/s`, position: "insideTopRight", fill: "var(--foreground)", fontSize: 14, fontWeight: 600, stroke: "var(--background)", strokeWidth: 4, paintOrder: "stroke" }}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        </ChartCtl.Provider>
      </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground" aria-label="Legend">
        {colourBy === "investigation"
          ? shownInvestigations.map((inv) => (
              <li key={inv.id} className={legendItem}>
                <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
                  <circle cx={7} cy={7} r={5} fill={colourOfInvestigation(inv.id)} />
                </svg>
                {inv.label} ({inv.n} run{inv.n === 1 ? "" : "s"})
              </li>
            ))
          : families.map((f) => (
              <li key={f} className={legendItem}>
                <LegendMark family={f} />
                {familyLabel(f, plottedRuns)}
              </li>
            ))}
        {(o2 !== undefined || flow !== undefined) && (
          <li className={legendItem}>
            <svg width={18} height={14} viewBox="0 0 18 14" aria-hidden className="shrink-0">
              <circle cx={9} cy={7} r={5} fill="none" stroke="var(--primary)" strokeWidth={2} />
            </svg>
            Your scenario
          </li>
        )}
        {(closestRunIds?.size ?? 0) > 0 && (
          <li className={legendItem}>
            <svg width={18} height={14} viewBox="0 0 18 14" aria-hidden className="shrink-0">
              <circle cx={9} cy={7} r={5.5} fill="none" stroke="var(--foreground)" strokeWidth={2} />
            </svg>
            Closest run of each top-ranked investigation
          </li>
        )}
        {matchingRunIds && <li>Faded marks: runs that do not match the scenario</li>}
      </ul>
      {tip && (
        <FloatingTip anchor={tip.anchor} id="chart-tip" root="chart" interactive={tip.pinned}>
          <RunTipBody run={tip.run} investigations={investigations} />
          {tip.pinned && (
            <button
              type="button"
              onClick={() => ctl.select(tip.run)}
              className="mt-1 min-h-9 self-start rounded-md border border-border px-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              Show in runs table
            </button>
          )}
        </FloatingTip>
      )}

      <figcaption className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>
          {plotted} of {runs.length} runs plotted: only runs that record both a starting oxygen
          and an airflow. X is the highest airflow recorded in a run, because crews stepped the
          flow during some tests.
        </span>
        {strip.length > 0 && (
          <span>
            The strip on the left places {strip.length} more run{strip.length === 1 ? "" : "s"} by starting
            oxygen only, because the source does not give the airflow as a number (
            {[...new Set(strip.map((p) => p.run.investigationId))].join(", ")}:{" "}
            {strip.map((p) => p.run.testId).join(", ")}).
          </span>
        )}
        {o2Off && <span>{o2OffAxisNote(o2)}</span>}
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
