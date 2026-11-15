"use client";
// Person A — run counts by material × starting-O2 band. Empty cells are the gaps.
import { useCallback, useState } from "react";
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
import { type Anchor, anchorOf, CellTipBody, FloatingTip, justTouched, noteTouch, useDismiss } from "./floating-tip";
import { O2_BANDS, OXYGEN_NOT_RECORDED, coverageRows } from "./coverage-rows";
import { materialLabel } from "./material-label";

export { O2_BANDS, OXYGEN_NOT_RECORDED, coverageRows };
export type { GridRow } from "./coverage-rows";

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
  const [tip, setTip] = useState<{ key: string; anchor: Anchor; label: string; runs: Run[]; pinned: boolean; pickLabel: string; pick: () => void } | null>(null);
  const close = useCallback(() => setTip(null), []);
  useDismiss(tip !== null, "grid", close);
  // Hover and keyboard focus show the details; a tap toggles them (touch has no hover).
  const tipHandlers = (key: string, label: string, cellRuns: Run[], pickLabel: string, pick: () => void) => {
    const open = (el: Element, pinned: boolean) => {
      setTip({ key, anchor: anchorOf(el), label, runs: cellRuns, pinned, pickLabel, pick });
    };
    // A tap-pinned tooltip holds a button, so losing focus to it must not close the tooltip.
    const hide = () => setTip((t) => (t?.key === key && !t.pinned ? null : t));
    return {
      "data-tip-root": "grid",
      "aria-describedby": tip?.key === key ? "grid-tip" : undefined,
      onPointerEnter: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType !== "touch") open(e.currentTarget, false);
      },
      onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType !== "touch") hide();
      },
      onFocus: (e: React.FocusEvent<HTMLButtonElement>) => {
        if (e.currentTarget.matches(":focus-visible")) open(e.currentTarget, false);
      },
      onBlur: hide,
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType === "touch") noteTouch();
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.pointerType !== "touch") return;
        const el = e.currentTarget;
        setTip((t) =>
          t?.key === key ? null : { key, anchor: anchorOf(el), label, runs: cellRuns, pinned: true, pickLabel, pick },
        );
      },
    };
  };
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
                      onClick={() => !justTouched() && onPick(row.family, band.mid)}
                      {...tipHandlers(
                        `${row.label}|${band.label}`,
                        `${row.label}, ${band.label}% O₂`,
                        row.bandRuns[i],
                        `Set scenario to ${row.family} at ${band.mid}% O₂`,
                        () => onPick(row.family, band.mid),
                      )}
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
                  onClick={() => !justTouched() && onPick(row.family, undefined)}
                  {...tipHandlers(
                    `${row.label}|none`,
                    `${row.label}, starting O₂ not recorded`,
                    row.notRecordedRuns,
                    `Set scenario to ${row.family} with no oxygen value`,
                    () => onPick(row.family, undefined),
                  )}
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
      {tip && (
        <FloatingTip anchor={tip.anchor} id="grid-tip" root="grid" interactive={tip.pinned}>
          <CellTipBody label={tip.label} runs={tip.runs} investigations={investigations} />
          {tip.pinned && (
            <button
              type="button"
              onClick={() => {
                tip.pick();
                close();
              }}
              className="mt-1 min-h-9 self-start rounded-md border border-border px-2 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              {tip.pickLabel}
            </button>
          )}
        </FloatingTip>
      )}
      <p className="text-sm">
        {atOrAbove(21)} of the {withO2.length} solid-material runs with a recorded starting oxygen (of{" "}
        {runs.length}) started at or above 21% oxygen; {atOrAbove(23)} started at or above 23%.
      </p>
    </div>
  );
}
