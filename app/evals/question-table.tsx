"use client";
// Person B — the per-question table on /evals. Missed questions first; six rows at
// first, the rest revealed on request (they stay in the HTML either way).
import type { EvalItem } from "@/pipeline/evals-result";
import { Badge } from "@/components/ui/badge";
import { RevealControls, revealItemClass, useReveal } from "@/components/ui/reveal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, fraction } from "./format";


export function QuestionTable({ items }: { items: EvalItem[] }) {
  // Questions that missed the expected result come first, so they are never behind the fold.
  const ordered = [...items].sort((a, b) => Number(a.statusMatch) - Number(b.statusMatch));
  const [reveal, listRef] = useReveal(ordered.length, 6, 10);
  return (
    <div className="flex flex-col gap-3">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%] min-w-64">Question</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead>Got</TableHead>
          <TableHead>Expected sources</TableHead>
          <TableHead>Citations</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody ref={listRef}>
        {ordered.map((i, n) => {
          const retrieved = new Set(i.retrievedDocIds);
          const verified = i.citations.filter((c) => c.verified);
          const onTarget = verified.filter((c) => c.expected).length;
          return (
            <TableRow
              key={i.id}
              data-reveal-item
              hidden={reveal.isHidden(n)}
              className={cn(!i.statusMatch && "bg-destructive/5", n >= reveal.initial && revealItemClass)}
            >
              <TableCell className="whitespace-normal align-top">
                <p>{i.question}</p>
                <p translate="no" className="font-mono text-sm text-muted-foreground">{i.id}</p>
                {i.error && <p className="text-sm text-destructive">Error: {i.error}</p>}
              </TableCell>
              <TableCell className="align-top">{STATUS_LABEL[i.expectStatus]}</TableCell>
              <TableCell className="align-top">
                {i.statusMatch ? (
                  STATUS_LABEL[i.gotStatus]
                ) : (
                  <Badge variant="destructive">{STATUS_LABEL[i.gotStatus]}</Badge>
                )}
              </TableCell>
              <TableCell className="align-top">
                {i.expectDocIds.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {i.expectDocIds.map((id) => (
                      <li key={id}>
                        <Badge translate="no" variant={retrieved.has(id) ? "secondary" : "destructive"}>
                          {id}
                          <span className="sr-only">
                            {retrieved.has(id) ? " (retrieved)" : " (not retrieved)"}
                          </span>
                        </Badge>
                        {!retrieved.has(id) && (
                          <span aria-hidden className="ml-1 text-sm text-destructive">
                            not retrieved
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell className="min-w-40 align-top text-sm whitespace-normal tabular-nums">
                {i.citations.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  <>
                    <p>{fraction(verified.length, i.citations.length)} verified</p>
                    {i.expectDocIds.length > 0 && (
                      <p className="text-muted-foreground">
                        {fraction(onTarget, verified.length)} to an expected source
                      </p>
                    )}
                  </>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <RevealControls reveal={reveal} moreLabel="Show 10 more" />
    </div>
  );
}
