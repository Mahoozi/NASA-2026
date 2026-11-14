// Person A — "where the evidence runs out". Pure; every number comes from the data.
import type { Investigation, Run, Scenario } from "@/lib/schema";

const GRAVITY_PHRASE = {
  lunar: "lunar gravity",
  martian: "Martian gravity",
  "1g": "Earth gravity (1 g)",
} as const;

export type GapReport = {
  /** One sentence per scenario dimension that no run / investigation comes close to. */
  gaps: string[];
  /** Nearest evidence per numeric dimension set, plus gravity and pressure context. */
  nearest: string[];
};

// Same closeness limits as lib/match.ts: beyond these a run contributes 0.
const O2_ZERO = 5;
const FLOW_ZERO = 5;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** "PSI-25 test T17" or "PSI-25 test B1 and 13 others", with flags when one run is cited. */
function cite(runs: Run[]): string {
  const name = (r: Run) => `${r.investigationId} test ${r.testId}`;
  if (runs.length === 1) {
    const [run] = runs;
    return run.flags.length ? `${name(run)}, flagged: ${run.flags.join("; ")}` : name(run);
  }
  const others = runs.length - 1;
  return `${name(runs[0])} and ${others} other${others === 1 ? "" : "s"}`;
}

/**
 * Who a sentence speaks about, with the counts that scope it: only runs that
 * record the value count, e.g. "run with a recorded starting oxygen (140 of 263)".
 */
function scope(
  what: string,
  pool: Run[],
  all: Run[],
  family: string | undefined,
): string {
  if (!family) return `run with a recorded ${what} (${pool.length} of ${all.length})`;
  const familyTotal = all.filter((r) => r.material.family === family).length;
  return `${family} run with a recorded ${what} (${pool.length} of ${familyTotal} ${family} runs)`;
}

function o2Lines(s: number, runs: Run[], family: string | undefined, out: GapReport) {
  const withO2 = runs.filter((r) => r.o2InitialPct !== null);
  if (!withO2.length) return;
  const values = withO2.map((r) => r.o2InitialPct!);
  const max = Math.max(...values);
  const min = Math.min(...values);

  // Gap sentence: no run (of the chosen family, when it has runs) within closeness range.
  const pool = family ? withO2.filter((r) => r.material.family === family) : withO2;
  if (pool.length && pool.every((r) => Math.abs(r.o2InitialPct! - s) >= O2_ZERO)) {
    const who = scope("starting oxygen", pool, runs, family);
    const pMax = Math.max(...pool.map((r) => r.o2InitialPct!));
    const pMin = Math.min(...pool.map((r) => r.o2InitialPct!));
    out.gaps.push(
      s > pMax
        ? `No ${who} started above ${pMax}%; your scenario is ${s}%.`
        : s < pMin
          ? `No ${who} started below ${pMin}%; your scenario is ${s}%.`
          : `No ${who} started within ${O2_ZERO} points of ${s}%.`,
    );
  }

  // Nearest evidence across all runs that record a starting oxygen.
  if (s > max) {
    const at = withO2.filter((r) => r.o2InitialPct === max);
    out.nearest.push(
      `Highest starting oxygen in any run: ${max}% (${cite(at)}). Your scenario: ${s}%, a gap of ${r1(s - max)} points.`,
    );
  } else if (s < min) {
    const at = withO2.filter((r) => r.o2InitialPct === min);
    out.nearest.push(
      `Lowest starting oxygen in any run: ${min}% (${cite(at)}). Your scenario: ${s}%, a gap of ${r1(min - s)} points.`,
    );
  } else {
    const d = Math.min(...values.map((v) => Math.abs(v - s)));
    const at = withO2.filter((r) => Math.abs(r.o2InitialPct! - s) === d);
    const v = at[0].o2InitialPct!;
    out.nearest.push(
      `Closest starting oxygen in any run: ${v}% (${cite(at)}). Your scenario: ${s}%, ${d === 0 ? "no gap" : `a gap of ${r1(d)} points`}.`,
    );
  }
}

function flowLines(s: number, runs: Run[], family: string | undefined, out: GapReport) {
  const withFlow = runs.filter((r) => r.flowCmS.min !== null && r.flowCmS.max !== null);
  if (!withFlow.length) return;
  const dist = (r: Run) =>
    s < r.flowCmS.min! ? r.flowCmS.min! - s : s > r.flowCmS.max! ? s - r.flowCmS.max! : 0;
  const max = Math.max(...withFlow.map((r) => r.flowCmS.max!));

  const pool = family ? withFlow.filter((r) => r.material.family === family) : withFlow;
  if (pool.length && pool.every((r) => dist(r) >= FLOW_ZERO)) {
    const who = scope("airflow", pool, runs, family);
    const pMax = Math.max(...pool.map((r) => r.flowCmS.max!));
    out.gaps.push(
      s > pMax
        ? `No ${who} went above ${pMax} cm/s; your scenario is ${s} cm/s.`
        : `No ${who} came within ${FLOW_ZERO} cm/s of ${s} cm/s.`,
    );
  }

  const covering = withFlow.filter((r) => dist(r) === 0);
  if (covering.length) {
    out.nearest.push(
      `${covering.length} of the ${withFlow.length} runs with a recorded airflow (of ${runs.length}) had airflow ranges that include ${s} cm/s.`,
    );
  } else if (s > max) {
    const at = withFlow.filter((r) => r.flowCmS.max === max);
    out.nearest.push(
      `Highest airflow in any run: ${max} cm/s (${cite(at)}). Your scenario: ${s} cm/s, a gap of ${r1(s - max)} cm/s.`,
    );
  } else {
    const d = Math.min(...withFlow.map(dist));
    const at = withFlow.filter((r) => dist(r) === d);
    out.nearest.push(
      `Closest airflow in any run: ${s > at[0].flowCmS.max! ? at[0].flowCmS.max : at[0].flowCmS.min} cm/s (${cite(at)}). Your scenario: ${s} cm/s, a gap of ${r1(d)} cm/s.`,
    );
  }
}

export function evidenceGaps(
  scenario: Scenario,
  runs: Run[],
  investigations: Investigation[],
): GapReport {
  const out: GapReport = { gaps: [], nearest: [] };
  const n = runs.length;
  const family = scenario.materialFamily;
  const familyRuns = family ? runs.filter((r) => r.material.family === family).length : 0;

  if (family !== undefined) {
    const anyPmma = family.startsWith("PMMA") && runs.some((r) => r.material.family.startsWith("PMMA"));
    if (familyRuns === 0 && !anyPmma) out.gaps.push(`0 of ${n} runs used ${family}.`);
    if (familyRuns === 0 && anyPmma)
      out.nearest.push(`0 of ${n} runs used ${family}; other PMMA shapes count half on material.`);
  }

  // Restrict O2/flow gap sentences to the family only when it has runs of its own.
  const scopeFamily = familyRuns > 0 ? family : undefined;
  if (scenario.o2Pct !== undefined) o2Lines(scenario.o2Pct, runs, scopeFamily, out);
  if (scenario.flowCmS !== undefined) flowLines(scenario.flowCmS, runs, scopeFamily, out);

  if (scenario.gravity !== undefined && scenario.gravity !== "micro") {
    const label = GRAVITY_PHRASE[scenario.gravity];
    out.gaps.push(
      scenario.gravity === "1g"
        ? `0 of ${n} runs were at ${label}.`
        : `0 of ${n} runs were at ${label}; NASA's challenge brief states PSI holds no partial-gravity combustion data.`,
    );
  }

  if (scenario.safetyArea !== undefined) {
    const listing = investigations.filter((i) => i.safetyArea.includes(scenario.safetyArea!));
    if (!listing.length)
      out.gaps.push(
        `None of the ${investigations.length} imported investigations lists ${scenario.safetyArea} as a safety area.`,
      );
  }

  if (scenario.pressurePsi !== undefined)
    out.nearest.push(
      `Pressure is not scored: no imported run records it. Your scenario: ${scenario.pressurePsi} psi.`,
    );

  return out;
}
