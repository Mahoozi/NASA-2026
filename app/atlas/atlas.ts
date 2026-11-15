// Person A — the evidence gap atlas: every Lab preset against every material family
// that has a recorded starting oxygen. Cells use the Lab's own matching, unchanged
// (matchInvestigations); nothing is scored or thresholded here.
import { matchInvestigations } from "../../lib/match";
import type { Investigation, MaterialFamily, Run, Scenario } from "../../lib/schema";
import { scenarioSummary } from "../ask/context";
import { matchingRunIdSet } from "../lab/matching-runs";
import { maxStartingO2 } from "../brief/run-facts";
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
export type AtlasRow = {
  id: string;
  label: string;
  summary: string;
  scenario: Scenario;
  cells: AtlasCell[];
  /** Preset oxygen minus the highest recorded starting oxygen of any solid run. */
  o2Vs: { delta: number | null; text: string };
};
export type Atlas = {
  columns: AtlasColumn[];
  rows: AtlasRow[];
  /** The landing headline's maximum: highest starting oxygen in any imported solid run. */
  maxSolidO2: number;
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

/** One decimal, as the Lab writes oxygen gaps. */
const round1 = (n: number) => Math.round(n * 10) / 10;

export function o2VsText(delta: number | null): string {
  if (delta === null) return "oxygen not set";
  return delta > 0 ? `+${delta.toFixed(1)} points` : "within tested range";
}

export type ColumnGroup = { label: string; columns: AtlasColumn[]; subLabels: string[] | null };

/**
 * Header groups: consecutive "PMMA …" families share one "PMMA" header over
 * sub-headers (film / slab / rod); every other family is its own header.
 */
export function columnGroups(columns: AtlasColumn[]): ColumnGroup[] {
  const groups: ColumnGroup[] = [];
  for (const c of columns) {
    const sub = /^PMMA (.+)$/.exec(c.family)?.[1];
    const last = groups.at(-1);
    if (sub !== undefined && last?.subLabels) {
      last.columns.push(c);
      last.subLabels.push(sub);
    } else if (sub !== undefined) groups.push({ label: "PMMA", columns: [c], subLabels: [sub] });
    else groups.push({ label: c.family, columns: [c], subLabels: null });
  }
  return groups;
}

/** A second header row is needed only when some group has sub-headers. */
export const hasSubHeaders = (groups: ColumnGroup[]) => groups.some((g) => g.subLabels !== null);

/** Rows the header spans: single columns reach down through the sub-header row. */
export const headerRows = (groups: ColumnGroup[]) => (hasSubHeaders(groups) ? 2 : 1);

export function buildAtlas(runs: Run[], investigations: Investigation[]): Atlas {
  const columns = atlasColumns(runs);
  const maxSolidO2 = maxStartingO2(runs);
  const rows = presets(runs).map((p): AtlasRow => ({
    id: p.id,
    label: p.label,
    summary: scenarioSummary(p.scenario),
    scenario: p.scenario,
    o2Vs: (() => {
      const delta = p.scenario.o2Pct === undefined ? null : round1(p.scenario.o2Pct - maxSolidO2);
      return { delta, text: o2VsText(delta) };
    })(),
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
    maxSolidO2,
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

/** A cell's two lines: a large lead and a small line beneath. */
export function cellParts(n: number): { big: string; small: string } {
  return n > 0 ? { big: String(n), small: n === 1 ? "matching run" : "matching runs" } : { big: "No", small: "matching run" };
}
export const cellText = (n: number) => {
  const { big, small } = cellParts(n);
  return `${big} ${small}`;
};

export const ATLAS_O2_COLUMN = "Oxygen vs highest tested solid run";
export const ATLAS_BOTTOM_LABEL = "Highest tested starting O2 (this material)";

export const ATLAS_LEGEND = "Filled cell: at least one matching run. Hatched cell: no matching run.";
export const ATLAS_FOOTNOTE =
  "Matching uses the same rules as the Scenario Lab. A gap means no recorded run matches; it is not a statement about how a material would behave. The Lab treats PMMA film, slab and rod as close materials, so their counts can match.";
