"use client";
// Person A — run counts by material × starting-O2 band. Empty cells are the gaps.
import type { Investigation, MaterialFamily, Run, Scenario } from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      { label, family: r.material.family, bands: O2_BANDS.map(() => 0), notRecorded: 0 };
    rows.set(label, row);
    const v = r.o2InitialPct;
    if (v === null) {
      row.notRecorded++;
      continue;
    }
    const b = O2_BANDS.findIndex((band) => v >= band.lo && v < band.hi);
    if (b < 0) outside.push(r);
    else row.bands[b]++;
  }
  const order = (f: MaterialFamily) => MATERIAL_FAMILIES.indexOf(f);
  return {
    rows: [...rows.values()].sort(
      (a, b) => order(a.family) - order(b.family) || a.label.localeCompare(b.label),
    ),
    outside,
  };
}

/** "121 BASS runs and 2 SAFFIRE-III runs", from the not-recorded flag. */
export function noOxygenTables(runs: Run[], investigations: Investigation[]): string | null {
  const byInv = new Map<string, number>();
  for (const r of runs)
    if (r.flags.includes(OXYGEN_NOT_RECORDED))
      byInv.set(r.investigationId, (byInv.get(r.investigationId) ?? 0) + 1);
  if (!byInv.size) return null;
  const parts = [...byInv].map(([id, n]) => {
    const inv = investigations.find((i) => i.id === id);
    return `${n} ${inv?.acronym || id} run${n === 1 ? "" : "s"}`;
  });
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `${list} record no oxygen value in their PSI tables.`;
}

/**
 * Display name for a family: the family itself, or for "other" the distinct
 * material labels of the runs in it (see material-label.ts).
 */
export function familyLabel(family: MaterialFamily, runs: Run[]): string {
  if (family !== "other") return family;
  const labels = [
    ...new Set(runs.filter((r) => r.material.family === "other").map(materialLabel)),
  ];
  return labels.length ? labels.join(", ") : "other";
}

export function CoverageGrid({
  runs,
  investigations,
  scenario,
  onPick,
}: {
  runs: Run[];
  investigations: Investigation[];
  scenario: Scenario;
  /** o2Pct undefined = the "O2 not recorded" column: set material only. */
  onPick: (family: MaterialFamily, o2Pct: number | undefined) => void;
}) {
  const { rows, outside } = coverageRows(runs);
  const activeBand =
    scenario.o2Pct === undefined
      ? -1
      : O2_BANDS.findIndex((b) => scenario.o2Pct! >= b.lo && scenario.o2Pct! < b.hi);
  const withO2 = runs.filter((r) => r.o2InitialPct !== null);
  const atOrAbove = (pct: number) => withO2.filter((r) => r.o2InitialPct! >= pct).length;
  const noOxygen = noOxygenTables(runs, investigations);

  const cellClass = (n: number, active: boolean) =>
    cn(
      "flex h-9 w-full min-w-12 items-center justify-center rounded-md text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      n === 0
        ? "border border-dashed border-border bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--muted)_6px_7px)] text-transparent hover:border-muted-foreground"
        : "bg-muted hover:bg-accent",
      active && "ring-2 ring-foreground",
    );
  const runsText = (n: number) => (n === 0 ? "no runs" : `${n} run${n === 1 ? "" : "s"}`);

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableCaption className="text-left">
          <span className="block">
            Microgravity only. No partial-gravity runs exist in PSI. Counts are runs by starting
            oxygen; empty cells have no run. Select a cell to set the scenario.
            {outside.length > 0 &&
              ` ${outside.length} run${outside.length === 1 ? "" : "s"} outside 10–36% not counted.`}
          </span>
          {noOxygen && <span className="block">{noOxygen}</span>}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Material</TableHead>
            {O2_BANDS.map((b) => (
              <TableHead key={b.label} scope="col" className="text-center tabular-nums">
                {b.label}% O₂
              </TableHead>
            ))}
            <TableHead scope="col" className="text-center">
              O₂ not recorded
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label} className="hover:bg-transparent">
              <TableHead scope="row" className="font-normal">
                {row.label}
              </TableHead>
              {row.bands.map((n, i) => {
                const band = O2_BANDS[i];
                const active = scenario.materialFamily === row.family && activeBand === i;
                return (
                  <TableCell key={band.label} className="p-1">
                    <button
                      type="button"
                      onClick={() => onPick(row.family, band.mid)}
                      aria-label={`${row.label}, ${band.label}% O2: ${runsText(n)}. Set scenario to ${row.family} at ${band.mid}% O2.`}
                      aria-pressed={active}
                      className={cellClass(n, active)}
                    >
                      {n === 0 ? "" : n}
                    </button>
                  </TableCell>
                );
              })}
              <TableCell className="p-1">
                <button
                  type="button"
                  onClick={() => onPick(row.family, undefined)}
                  aria-label={`${row.label}, starting O2 not recorded: ${runsText(row.notRecorded)}. Set scenario to ${row.family} with no oxygen value.`}
                  aria-pressed={scenario.materialFamily === row.family && scenario.o2Pct === undefined}
                  className={cellClass(
                    row.notRecorded,
                    scenario.materialFamily === row.family && scenario.o2Pct === undefined,
                  )}
                >
                  {row.notRecorded === 0 ? "" : row.notRecorded}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm">
        {atOrAbove(21)} of the {withO2.length} runs with a recorded starting oxygen (of{" "}
        {runs.length}) started at or above 21% oxygen; {atOrAbove(23)} started at or above 23%.
      </p>
    </div>
  );
}
