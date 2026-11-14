// Person A — "What varied and what was held fixed", one column per investigation
// with runs. Every cell is computed from data/runs.json (varied.ts).
import Link from "next/link";
import type { Investigation, InvestigationMatch, Run } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COVERAGE_LABEL } from "./summary";
import { DIMENSIONS, whatVaried, type Cell } from "./varied";

function CellBody({ cell }: { cell: Cell }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cell.status === "not recorded" ? "text-muted-foreground" : undefined}>
        {cell.text}
      </span>
      {cell.status !== "not recorded" && (
        <span className="text-muted-foreground tabular-nums">
          {cell.runs} of {cell.total} run{cell.total === 1 ? "" : "s"}
        </span>
      )}
      {cell.flagged > 0 && (
        <span className="text-destructive" title={cell.flagTypes.join("; ")}>
          ⚑ {cell.flagged} flagged: {cell.flagTypes.join("; ")}
        </span>
      )}
    </div>
  );
}

export function WhatVaried({
  runs,
  investigations,
  matchedCoverage,
}: {
  runs: Run[];
  investigations: Investigation[];
  /** Investigations with direct or partial coverage for the scenario; empty when none. */
  matchedCoverage: Map<string, InvestigationMatch["coverage"]>;
}) {
  const columns = whatVaried(runs);
  const acronym = (id: string) => investigations.find((i) => i.id === id)?.acronym || id;

  return (
    <Table className="min-w-[56rem] text-sm">
      <TableCaption className="text-left">
        Computed from the imported runs only. &ldquo;Held fixed&rdquo; and &ldquo;varied&rdquo;
        describe the runs that record a value; &ldquo;not recorded&rdquo; means no run in that
        table has one. ⚑ marks values the importer flagged; they are shown as recorded, never
        corrected.
        {matchedCoverage.size > 0 &&
          " Highlighted columns have direct or partial evidence for your scenario."}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-40">
            Dimension
          </TableHead>
          {columns.map((c) => (
            <TableHead
              key={c.id}
              scope="col"
              className={cn("align-bottom whitespace-normal", matchedCoverage.has(c.id) && "bg-accent")}
            >
              <div className="flex flex-col items-start gap-1 py-1">
                <Link
                  href={`/investigations/${encodeURIComponent(c.id)}`}
                  className="underline-offset-4 hover:underline"
                >
                  {acronym(c.id)}
                </Link>
                <span className="font-normal text-muted-foreground">
                  {c.id} · {c.runs} runs
                </span>
                {matchedCoverage.has(c.id) && (
                  <Badge>{COVERAGE_LABEL[matchedCoverage.get(c.id)!]}</Badge>
                )}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {DIMENSIONS.map((d) => (
          <TableRow key={d.key} className="hover:bg-transparent">
            <TableHead scope="row" className="align-top whitespace-normal">
              {d.label}
            </TableHead>
            {columns.map((c) => (
              <TableCell
                key={c.id}
                className={cn("align-top whitespace-normal", matchedCoverage.has(c.id) && "bg-accent/50")}
              >
                <CellBody cell={c.cells[d.key]} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
