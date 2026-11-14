"use client";
// Person A
import { Fragment, useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Run } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { materialLabel } from "./material-label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey =
  | "test" | "investigation" | "pi" | "family" | "thickness" | "o2" | "flow" | "direction" | "events" | "flags";
type Dir = "asc" | "desc";

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "test", label: "Test" },
  { key: "investigation", label: "Investigation" },
  { key: "pi", label: "PI" },
  { key: "family", label: "Material" },
  { key: "thickness", label: "Thickness (mm)", numeric: true },
  { key: "o2", label: "Initial O₂ %", numeric: true },
  { key: "flow", label: "Flow (cm/s)", numeric: true },
  { key: "direction", label: "Direction" },
  { key: "events", label: "Events" },
  { key: "flags", label: "Flags", numeric: true },
];

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function sortValue(r: Run, key: SortKey): string | number | null {
  switch (key) {
    case "test": return r.testId;
    case "investigation": return r.investigationId;
    case "pi": return r.pi;
    case "family": return materialLabel(r);
    case "thickness": return r.material.thicknessMm ?? null;
    case "o2": return r.o2InitialPct;
    case "flow": return r.flowCmS.max;
    case "direction": return r.flowDirection ?? null;
    case "events": return r.events.join(", ") || (hasRecordedResult(r) ? "see observations" : null);
    case "flags": return r.flags.length;
  }
}

function compare(a: Run, b: Run, key: SortKey, dir: Dir): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  // Missing values always sort last, whatever the direction.
  if (va === null && vb === null) return collator.compare(a.testId, b.testId);
  if (va === null) return 1;
  if (vb === null) return -1;
  const c = typeof va === "number" && typeof vb === "number"
    ? va - vb
    : collator.compare(String(va), String(vb));
  return (dir === "asc" ? c : -c) || collator.compare(a.testId, b.testId);
}

const dash = <span className="text-muted-foreground">—</span>;

/** Saffire results (burn time, burn length, spread) live in observations, not events. */
const hasRecordedResult = (r: Run) => !!r.observations?.some((o) => /burn|spread/i.test(o.label));

function flow(r: Run) {
  const { min, max } = r.flowCmS;
  if (min === null || max === null) return dash;
  return min === max ? String(min) : `${min}–${max}`;
}

function FlagsBadge({ flags }: { flags: string[] }) {
  if (!flags.length) return <Badge variant="outline">0</Badge>;
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded-4xl focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`${flags.length} flag${flags.length > 1 ? "s" : ""}: ${flags.join("; ")}`}
      >
        <Badge variant="destructive">{flags.length}</Badge>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-popover p-2 text-sm text-popover-foreground opacity-0 shadow-md transition-opacity motion-reduce:transition-none group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <ul className="list-disc space-y-1 pl-4 text-left whitespace-normal">
          {flags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </span>
    </span>
  );
}

export function RunsTable({
  runs,
  matchingRunIds = null,
}: {
  runs: Run[];
  /** Runs matching the scenario; null when no run-level dimension is set (no filter). */
  matchingRunIds?: Set<string> | null;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "investigation", dir: "asc" });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [showAll, setShowAll] = useState(false);
  const filtering = matchingRunIds !== null && !showAll;
  // Count matches among the runs this table was given (it may be pre-filtered).
  const matchCount = matchingRunIds ? runs.filter((r) => matchingRunIds.has(r.id)).length : 0;
  const rows = useMemo(
    () =>
      runs
        .filter((r) => !filtering || matchingRunIds!.has(r.id))
        .sort((a, b) => compare(a, b, sort.key, sort.dir)),
    [runs, sort, filtering, matchingRunIds],
  );

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div className="flex flex-col gap-3">
      {matchingRunIds !== null && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtering
              ? `Showing the ${matchCount} of ${runs.length} runs that match every run-level dimension you set.`
              : `Showing all ${runs.length} runs.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)} aria-pressed={showAll}>
            {showAll ? `Show only the ${matchCount} matching` : `Show all ${runs.length}`}
          </Button>
        </div>
      )}
      {filtering && matchCount === 0 ? (
        <p className="text-sm">No run matches every run-level dimension you set.</p>
      ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <span className="sr-only">Observations</span>
          </TableHead>
          {columns.map((c) => {
            const active = sort.key === c.key;
            return (
              <TableHead
                key={c.key}
                aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                className={c.numeric ? "text-right" : undefined}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.key)}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  {c.label}
                  <span aria-hidden className={active ? "" : "opacity-30"}>
                    {active && sort.dir === "desc" ? "↓" : "↑"}
                  </span>
                </button>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const open = expanded.has(r.id);
          const panelId = `obs-${r.id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
          return (
            <Fragment key={r.id}>
              <TableRow>
                <TableCell className="p-1">
                  {r.observations?.length ? (
                    <button
                      type="button"
                      onClick={() => toggleRow(r.id)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      aria-label={`${open ? "Hide" : "Show"} ${r.observations.length} observation${r.observations.length === 1 ? "" : "s"} for ${r.investigationId} test ${r.testId}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronRightIcon className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-90")} />
                    </button>
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">{r.testId}</TableCell>
                <TableCell>{r.investigationId}</TableCell>
                <TableCell className="max-w-28 whitespace-normal">{r.pi}</TableCell>
                <TableCell title={r.material.raw} className="max-w-36 whitespace-normal">{materialLabel(r)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.material.thicknessMm ?? dash}</TableCell>
                <TableCell className="text-right tabular-nums">{r.o2InitialPct ?? dash}</TableCell>
                <TableCell className="text-right tabular-nums" title={r.flowCmS.raw}>{flow(r)}</TableCell>
                <TableCell>{r.flowDirection ?? dash}</TableCell>
                <TableCell className="max-w-32 whitespace-normal">
                  {r.events.length ? (
                    r.events.join(", ")
                  ) : hasRecordedResult(r) ? (
                    <span className="text-muted-foreground">see observations</span>
                  ) : (
                    <span className="text-muted-foreground">outcome not recorded</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <FlagsBadge flags={r.flags} />
                </TableCell>
              </TableRow>
              {open && r.observations && (
                <TableRow id={panelId} className="hover:bg-transparent">
                  <TableCell />
                  <TableCell colSpan={columns.length} className="whitespace-normal">
                    <dl className="grid gap-x-6 gap-y-1 py-1 text-sm sm:grid-cols-[max-content_1fr]">
                      {r.observations.map((o, i) => (
                        <Fragment key={`${o.label}-${i}`}>
                          <dt className="text-muted-foreground">{o.label}</dt>
                          <dd>{o.value}</dd>
                        </Fragment>
                      ))}
                    </dl>
                    <p className="pt-1 text-sm text-muted-foreground">Copied verbatim from the source table.</p>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
      )}
    </div>
  );
}
