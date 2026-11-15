// Person A — the coverage grid's rows: runs by material label and starting-O2 band.
// Pure, so tests and the grid's hover details share one set of run lists.
import type { MaterialFamily, Run } from "../../lib/schema";
import { materialLabel } from "./material-label";
import { MATERIAL_FAMILIES } from "./scenario";

/** Lower-inclusive bands. "<15" spans the chart's 10–15 range for its midpoint. */
export const O2_BANDS = [
  { label: "<15", lo: -Infinity, hi: 15, mid: 12.5 },
  { label: "15–17", lo: 15, hi: 17, mid: 16 },
  { label: "17–19", lo: 17, hi: 19, mid: 18 },
  { label: "19–21", lo: 19, hi: 21, mid: 20 },
  { label: "21–23", lo: 21, hi: 23, mid: 22 },
  { label: "23–30", lo: 23, hi: 30, mid: 26.5 },
  { label: "30–36", lo: 30, hi: 36, mid: 33 },
] as const;

/** The importers' flag for a table with no oxygen column (pipeline/psi_shared.ts). */
export const OXYGEN_NOT_RECORDED = "oxygen not recorded in this table";

export type GridRow = {
  label: string;
  family: MaterialFamily;
  /** Runs per O2 band, in O2_BANDS order. */
  bands: number[];
  /** Runs with no starting oxygen value. */
  notRecorded: number;
  /** The runs behind each count, same order as `bands` and in data order. */
  bandRuns: Run[][];
  notRecordedRuns: Run[];
};

/**
 * One row per material label (see material-label.ts), ordered by family.
 * Only labels with runs appear: an all-empty row for a material that is not in
 * the data would claim a gap we cannot show.
 */
export function coverageRows(runs: Run[]): { rows: GridRow[]; outside: Run[] } {
  const rows = new Map<string, GridRow>();
  const outside: Run[] = [];
  for (const r of runs) {
    const label = materialLabel(r);
    const row =
      rows.get(label) ??
      { label, family: r.material.family, bands: O2_BANDS.map(() => 0), notRecorded: 0, bandRuns: O2_BANDS.map(() => []), notRecordedRuns: [] };
    rows.set(label, row);
    const v = r.o2InitialPct;
    if (v === null) {
      row.notRecorded++;
      row.notRecordedRuns.push(r);
      continue;
    }
    const b = O2_BANDS.findIndex((band) => v >= band.lo && v < band.hi);
    if (b < 0) outside.push(r);
    else {
      row.bands[b]++;
      row.bandRuns[b].push(r);
    }
  }
  const order = (f: MaterialFamily) => MATERIAL_FAMILIES.indexOf(f);
  return {
    rows: [...rows.values()].sort(
      (a, b) => order(a.family) - order(b.family) || a.label.localeCompare(b.label),
    ),
    outside,
  };
}

