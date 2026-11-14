"use client";
// Person A — run counts by material family × starting-O2 band. Empty cells are the gaps.
import type { MaterialFamily, Run, Scenario } from "@/lib/schema";
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

export function coverageCounts(runs: Run[]) {
  const counts = new Map<MaterialFamily, number[]>(
    MATERIAL_FAMILIES.map((f) => [f, O2_BANDS.map(() => 0)]),
  );
  const outside: Run[] = [];
  for (const r of runs) {
    const v = r.o2InitialPct;
    const b = v === null ? -1 : O2_BANDS.findIndex((band) => v >= band.lo && v < band.hi);
    if (b < 0) outside.push(r);
    else counts.get(r.material.family)![b]++;
  }
  return { counts, outside };
}

export function CoverageGrid({
  runs,
  scenario,
  onPick,
}: {
  runs: Run[];
  scenario: Scenario;
  onPick: (family: MaterialFamily, o2Pct: number) => void;
}) {
  const { counts, outside } = coverageCounts(runs);
  const activeBand =
    scenario.o2Pct === undefined
      ? -1
      : O2_BANDS.findIndex((b) => scenario.o2Pct! >= b.lo && scenario.o2Pct! < b.hi);

  return (
    <Table>
      <TableCaption className="text-left">
        Microgravity only. No partial-gravity runs exist in PSI. Counts are BASS-II runs by
        starting oxygen; empty cells have no run. Select a cell to set the scenario.
        {outside.length > 0 &&
          ` ${outside.length} run${outside.length === 1 ? "" : "s"} with no starting O2 or outside 10–36% not counted.`}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Material</TableHead>
          {O2_BANDS.map((b) => (
            <TableHead key={b.label} scope="col" className="text-center tabular-nums">
              {b.label}% O₂
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {MATERIAL_FAMILIES.map((family) => (
          <TableRow key={family} className="hover:bg-transparent">
            <TableHead scope="row" className="font-normal">
              {family}
            </TableHead>
            {counts.get(family)!.map((n, i) => {
              const band = O2_BANDS[i];
              const active = scenario.materialFamily === family && activeBand === i;
              return (
                <TableCell key={band.label} className="p-1">
                  <button
                    type="button"
                    onClick={() => onPick(family, band.mid)}
                    aria-label={`${family}, ${band.label}% O2: ${n === 0 ? "no runs" : `${n} run${n === 1 ? "" : "s"}`}. Set scenario to ${family} at ${band.mid}% O2.`}
                    aria-pressed={active}
                    className={cn(
                      "flex h-9 w-full min-w-12 items-center justify-center rounded-md text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      n === 0
                        ? "border border-dashed border-border bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--muted)_6px_7px)] text-transparent hover:border-muted-foreground"
                        : "bg-muted hover:bg-accent",
                      active && "ring-2 ring-foreground",
                    )}
                  >
                    {n === 0 ? "" : n}
                  </button>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
