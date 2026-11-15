// Explains the Lab's ranking in plain units. Display only: it reads the matcher's own
// per-run closeness (runBreakdown) and never scores anything itself, so the ranking
// shown is always the one lib/match.ts produced.
import { RUN_DIMENSIONS, runBreakdown, type RunDimension } from "../../lib/match";
import type { InvestigationMatch, Run, Scenario } from "../../lib/schema";
import { flowText } from "./run-order";
import { GRAVITY_LABEL } from "./scenario";
import { DIMENSION_LABEL, investigationLabel } from "./summary";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The single run that carries an investigation's score: the one with the highest mean
 * closeness over the run-level dimensions the scenario sets, first in data order on a
 * tie. This is the same rule matchInvestigations uses. Null when no run-level
 * dimension is set or there are no runs.
 */
export function bestRun(
  scenario: Scenario,
  runs: Run[],
): { run: Run; breakdown: Partial<Record<RunDimension, number>> } | null {
  const dims = RUN_DIMENSIONS.filter((d) => scenario[d] !== undefined);
  if (!dims.length || !runs.length) return null;
  let best: { run: Run; breakdown: Partial<Record<RunDimension, number>> } | null = null;
  let bestMean = -1;
  for (const run of runs) {
    const b = runBreakdown(scenario, run);
    const m = mean(dims.map((d) => b[d]!));
    if (m > bestMean) {
      best = { run, breakdown: b };
      bestMean = m;
    }
  }
  return best;
}

export type UnitGap = { label: string; text: string; source?: string };

/** How far one run is from the scenario, dimension by dimension, in real units. */
export function gapsInUnits(scenario: Scenario, run: Run): UnitGap[] {
  const out: UnitGap[] = [];
  if (scenario.materialFamily !== undefined) {
    const have = run.material.family;
    const want = scenario.materialFamily;
    out.push({
      label: "Material",
      text:
        have === want
          ? `same family (${have})`
          : have.startsWith("PMMA") && want.startsWith("PMMA")
            ? `related PMMA form: the run used ${have}`
            : `different family: the run used ${have}`,
      source: run.material.raw,
    });
  }
  if (scenario.o2Pct !== undefined) {
    const o2 = run.o2InitialPct;
    out.push({
      label: "O₂",
      text:
        o2 === null
          ? "starting oxygen not recorded for this run"
          : o2 === scenario.o2Pct
            ? `same as yours (${o2}%)`
            : `Δ${round1(Math.abs(o2 - scenario.o2Pct))} pts: the run started at ${o2}%`,
    });
  }
  if (scenario.flowCmS !== undefined) {
    const { min, max, raw } = run.flowCmS;
    const want = scenario.flowCmS;
    const shown = flowText(run);
    const outside = min === null || max === null ? null : want < min ? min - want : want > max ? want - max : 0;
    out.push({
      label: "Airflow",
      text:
        outside === null
          ? "not recorded as a number"
          : outside === 0
            ? `within the run's ${shown} cm/s`
            : `Δ${round1(outside)} cm/s from the run's ${shown} cm/s`,
      source: raw,
    });
  }
  if (scenario.gravity !== undefined)
    out.push({
      label: "Gravity",
      text:
        scenario.gravity === "micro"
          ? "microgravity, as flown"
          : `the run was in microgravity; yours is ${GRAVITY_LABEL[scenario.gravity].toLowerCase()}`,
    });
  if (scenario.pressurePsi !== undefined)
    out.push({ label: "Pressure", text: "not recorded in any imported table, so not compared" });
  return out;
}

/** One line saying why `a` ranks directly above `b`, from their breakdowns. */
export function whyAbove(a: InvestigationMatch, b: InvestigationMatch): string {
  const below = investigationLabel(b.investigation);
  if (a.score === b.score) return `Tied with ${below} at ${a.score.toFixed(2)}; ties are ordered by PSI id.`;
  let dim = "";
  let diff = -Infinity;
  for (const [d, v] of Object.entries(a.breakdown)) {
    const delta = v - (b.breakdown[d] ?? 0);
    if (delta > diff) {
      diff = delta;
      dim = d;
    }
  }
  const theirs = b.breakdown[dim];
  return `Ranks above ${below} (${a.score.toFixed(2)} vs ${b.score.toFixed(2)}): ${DIMENSION_LABEL[dim] ?? dim} closeness ${a.breakdown[dim].toFixed(2)} vs ${
    theirs === undefined ? "none (no imported runs)" : theirs.toFixed(2)
  }.`;
}

/** Ids of the best run of each of the first `n` ranked investigations that have one. */
export function closestRunIds(scenario: Scenario, matches: InvestigationMatch[], runs: Run[], n = 3): Set<string> {
  const ids = new Set<string>();
  for (const m of matches) {
    if (ids.size >= n || m.score <= 0) break;
    const best = bestRun(scenario, runs.filter((r) => r.investigationId === m.investigation.id));
    if (best) ids.add(best.run.id);
  }
  return ids;
}
