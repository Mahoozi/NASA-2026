import type {
  Investigation,
  InvestigationMatch,
  MaterialFamily,
  Run,
  Scenario,
} from "./schema";

/**
 * Rank investigations by how closely their evidence matches a scenario.
 *
 * Contract (frozen, see plan/PLAN.md §2): one entry per investigation,
 * sorted by `score` descending then `investigation.id`. Scores measure
 * closeness of evidence, 0..1. They are never a risk or safety judgement.
 *
 * Dimensions (only those the scenario specifies are scored):
 *   run-level: materialFamily, o2Pct, flowCmS, gravity — scored per run, as a
 *     set, and only for investigations that have runs. An investigation with
 *     no imported runs has no test-level evidence to compare.
 *   investigation-level: safetyArea
 * Pressure is context only: no run records it, so it is never scored.
 */

export type RunDimension = "materialFamily" | "o2Pct" | "flowCmS" | "gravity";
export type Dimension = RunDimension | "safetyArea";
export const RUN_DIMENSIONS: RunDimension[] = ["materialFamily", "o2Pct", "flowCmS", "gravity"];

/** Closeness thresholds, in scenario units. */
const O2_FULL = 1; // ±1 % O2 → 1
const O2_ZERO = 5; // ±5 % O2 → 0
const FLOW_ZERO = 5; // 5 cm/s outside a run's range → 0
/** A run "matches" when each specified run-level dimension reaches this. */
export const RUN_MATCH_THRESHOLD = 0.5;
export const DIRECT_SCORE = 0.8;
export const PARTIAL_SCORE = 0.4;

const isPmma = (f: MaterialFamily) => f.startsWith("PMMA");

function materialCloseness(want: MaterialFamily, run: Run): number {
  const have = run.material.family;
  if (have === want) return 1;
  return isPmma(have) && isPmma(want) ? 0.5 : 0;
}

function o2Closeness(want: number, run: Run): number {
  if (run.o2InitialPct === null) return 0;
  const d = Math.abs(run.o2InitialPct - want);
  if (d <= O2_FULL) return 1;
  if (d >= O2_ZERO) return 0;
  return (O2_ZERO - d) / (O2_ZERO - O2_FULL);
}

function flowCloseness(want: number, run: Run): number {
  const { min, max } = run.flowCmS;
  if (min === null || max === null) return 0;
  const outside = want < min ? min - want : want > max ? want - max : 0;
  return Math.max(0, 1 - outside / FLOW_ZERO);
}

/** Per-dimension closeness of one run, for the run-level dimensions specified. */
export function runBreakdown(
  scenario: Scenario,
  run: Run,
): Partial<Record<RunDimension, number>> {
  const b: Partial<Record<RunDimension, number>> = {};
  if (scenario.materialFamily !== undefined)
    b.materialFamily = materialCloseness(scenario.materialFamily, run);
  if (scenario.o2Pct !== undefined) b.o2Pct = o2Closeness(scenario.o2Pct, run);
  if (scenario.flowCmS !== undefined) b.flowCmS = flowCloseness(scenario.flowCmS, run);
  // Every imported run comes from a microgravity investigation (platform per
  // data/investigations.json: the ISS or a Cygnus spacecraft).
  if (scenario.gravity !== undefined) b.gravity = scenario.gravity === "micro" ? 1 : 0;
  return b;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function coverageFor(score: number, matchingRuns: number): InvestigationMatch["coverage"] {
  if (score >= DIRECT_SCORE && matchingRuns > 0) return "direct";
  if (score >= PARTIAL_SCORE) return "partial";
  return "none";
}

export function matchInvestigations(
  scenario: Scenario,
  investigations: Investigation[],
  runs: Run[],
): InvestigationMatch[] {
  const runDims = RUN_DIMENSIONS.filter((d) => scenario[d] !== undefined);

  const runsByInvestigation = new Map<string, Run[]>();
  for (const r of runs)
    runsByInvestigation.set(r.investigationId, [...(runsByInvestigation.get(r.investigationId) ?? []), r]);

  return investigations
    .map((investigation): InvestigationMatch => {
      const own = runsByInvestigation.get(investigation.id) ?? [];
      const breakdown: Record<string, number> = {};
      let matchingRunIds: string[] = [];

      if (runDims.length && own.length) {
        // Score each run as a set and keep the single best run's values.
        let best: Partial<Record<RunDimension, number>> | null = null;
        let bestMean = -1;
        for (const run of own) {
          const b = runBreakdown(scenario, run);
          const m = mean(runDims.map((d) => b[d]!));
          if (m > bestMean) {
            best = b;
            bestMean = m;
          }
        }
        for (const d of runDims) breakdown[d] = best?.[d] ?? 0;

        matchingRunIds = own
          .filter((run) => {
            const b = runBreakdown(scenario, run);
            return runDims.every((d) => b[d]! >= RUN_MATCH_THRESHOLD);
          })
          .map((run) => run.id);
      }

      if (scenario.safetyArea !== undefined)
        breakdown.safetyArea = investigation.safetyArea.includes(scenario.safetyArea) ? 1 : 0;

      const values = Object.values(breakdown);
      const score = values.length ? mean(values) : 0;
      return {
        investigation,
        score,
        breakdown,
        coverage: values.length ? coverageFor(score, matchingRunIds.length) : "none",
        matchingRunIds,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.investigation.id.localeCompare(b.investigation.id),
    );
}
