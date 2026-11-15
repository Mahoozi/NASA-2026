// Person A — the evidence gap atlas: every Lab preset against every material family
// that has a recorded starting oxygen. Cells use the Lab's own matching, unchanged
// (matchInvestigations); nothing is scored or thresholded here.
import { matchInvestigations } from "../../lib/match";
import type { Investigation, MaterialFamily, Run, Scenario } from "../../lib/schema";
import { scenarioSummary } from "../ask/context";
import { matchingRunIdSet } from "../lab/matching-runs";
import { MATERIAL_FAMILIES, presets, scenarioToQuery } from "../lab/scenario";

export type AtlasColumn = { family: MaterialFamily; highestO2: number };
export type AtlasCell = {
  family: MaterialFamily;
  scenario: Scenario;
  /** Matching runs, as the Lab's runs table counts them. */
  n: number;
  /** The Lab URL carrying exactly this scenario. */
  href: string;
  highestO2: number;
};
export type AtlasRow = { id: string; label: string; summary: string; scenario: Scenario; cells: AtlasCell[] };
export type Atlas = {
  columns: AtlasColumn[];
  rows: AtlasRow[];
  covered: number;
  total: number;
  /** Preset labels with at least one matching run, in the Lab's order. */
  coveredPresets: string[];
};

/**
 * Material families, in the Lab form's order, that have at least one run with a
 * recorded starting oxygen. Every imported run burned a solid material.
 */
export function atlasColumns(runs: Run[]): AtlasColumn[] {
  return MATERIAL_FAMILIES.flatMap((family) => {
    const o2 = runs
      .filter((r) => r.material.family === family && r.o2InitialPct !== null)
      .map((r) => r.o2InitialPct!);
    return o2.length ? [{ family, highestO2: Math.max(...o2) }] : [];
  });
}

export function buildAtlas(runs: Run[], investigations: Investigation[]): Atlas {
  const columns = atlasColumns(runs);
  const rows = presets(runs).map((p): AtlasRow => ({
    id: p.id,
    label: p.label,
    summary: scenarioSummary(p.scenario),
    scenario: p.scenario,
    cells: columns.map(({ family, highestO2 }) => {
      const scenario: Scenario = { ...p.scenario, materialFamily: family };
      const matches = matchInvestigations(scenario, investigations, runs);
      return {
        family,
        scenario,
        n: matchingRunIdSet(scenario, matches)?.size ?? 0,
        href: `/lab?${scenarioToQuery(scenario)}`,
        highestO2,
      };
    }),
  }));
  const cells = rows.flatMap((r) => r.cells);
  return {
    columns,
    rows,
    covered: cells.filter((c) => c.n > 0).length,
    total: cells.length,
    coveredPresets: rows.filter((r) => r.cells.some((c) => c.n > 0)).map((r) => r.label),
  };
}

/** "A", "A and B", "A, B and C" */
export const listOf = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

/** The one computed sentence under the grid. */
export function atlasSentence(a: Atlas): string {
  const head = `${a.covered} of ${a.total} atmosphere–material combinations have at least one matching flight test`;
  return a.covered > 0 ? `${head}; every match is in ${listOf(a.coveredPresets)}.` : `${head}.`;
}

export const cellText = (n: number) => (n > 0 ? `${n} matching run${n === 1 ? "" : "s"}` : "No matching run");

export const ATLAS_LEGEND = "Filled cell: at least one matching run. Hatched cell: no matching run.";
export const ATLAS_FOOTNOTE =
  "Matching uses the same rules as the Scenario Lab. A gap means no recorded run matches; it is not a statement about how a material would behave.";
