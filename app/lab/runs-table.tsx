"use client";
// Person A
import { useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey = "test" | "pi" | "family" | "thickness" | "o2" | "flow" | "events" | "flags";
type Dir = "asc" | "desc";

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "test", label: "Test" },
  { key: "pi", label: "PI" },
  { key: "family", label: "Material" },
  { key: "thickness", label: "Thickness (mm)", numeric: true },
  { key: "o2", label: "Initial O₂ %", numeric: true },
  { key: "flow", label: "Flow (cm/s)", numeric: true },
  { key: "events", label: "Events" },
  { key: "flags", label: "Flags", numeric: true },
];

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function sortValue(r: Run, key: SortKey): string | number | null {
  switch (key) {
    case "test": return r.testId;
    case "pi": return r.pi;
    case "family": return r.material.family;
    case "thickness": return r.material.thicknessMm ?? null;
    case "o2": return r.o2InitialPct;
    case "flow": return r.flowCmS.max;
    case "events": return r.events.join(", ") || null;
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
        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-popover p-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <ul className="list-disc space-y-1 pl-4 text-left whitespace-normal">
          {flags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </span>
    </span>
  );
}

export function RunsTable({ runs }: { runs: Run[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "test", dir: "asc" });
  const rows = useMemo(
    () => [...runs].sort((a, b) => compare(a, b, sort.key, sort.dir)),
    [runs, sort],
  );

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <Table>
      <TableHeader>
        <TableRow>
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
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.testId}</TableCell>
            <TableCell>{r.pi}</TableCell>
            <TableCell title={r.material.raw}>{r.material.family}</TableCell>
            <TableCell className="text-right tabular-nums">{r.material.thicknessMm ?? dash}</TableCell>
            <TableCell className="text-right tabular-nums">{r.o2InitialPct ?? dash}</TableCell>
            <TableCell className="text-right tabular-nums" title={r.flowCmS.raw}>{flow(r)}</TableCell>
            <TableCell>
              {r.events.length ? (
                r.events.join(", ")
              ) : (
                <span className="text-muted-foreground">outcome not recorded</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <FlagsBadge flags={r.flags} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
