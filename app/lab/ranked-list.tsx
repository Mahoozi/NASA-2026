// Person A — ranked investigations for the current scenario.
// Only investigations scoring above 0 are listed; a 0-score item is never "top".
import Link from "next/link";
import type { InvestigationMatch, Run, Scenario } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { UnitGaps } from "./best-match";
import { bestRun, gapsInUnits, whyAbove } from "./match-explain";
import { COVERAGE_LABEL, DIMENSION_LABEL, investigationLabel, NO_COVERAGE } from "./summary";

const COVERAGE_VARIANT: Record<InvestigationMatch["coverage"], "default" | "secondary" | "outline"> = {
  direct: "default",
  partial: "secondary",
  none: "outline",
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function RankedList({
  matches,
  pendingIds,
  withRuns,
  scenario,
  runs: allRuns = [],
}: {
  matches: InvestigationMatch[];
  pendingIds: string[];
  /** Investigation ids with runs in data/runs.json (not the `hasRunData` field). */
  withRuns: Set<string>;
  /** With these, each card also shows its closest run and why it ranks where it does. */
  scenario?: Scenario;
  runs?: Run[];
}) {
  const listed = matches.filter((m) => m.score > 0);
  const hidden = matches.length - listed.length;

  if (!listed.length)
    return (
      <p className="text-sm">
        {NO_COVERAGE}{" "}
        <a href="#gaps" className="underline underline-offset-4">
          See where the evidence runs out
        </a>
        .
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {listed.map((m, i) => {
          const pending = pendingIds.includes(m.investigation.id);
          const runs = m.matchingRunIds.length;
          const best = scenario ? bestRun(scenario, allRuns.filter((r) => r.investigationId === m.investigation.id)) : null;
          const next = listed[i + 1];
          return (
            <li key={m.investigation.id}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                    <Link
                      href={`/investigations/${encodeURIComponent(m.investigation.id)}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {investigationLabel(m.investigation)}
                    </Link>
                    {pending && <Badge variant="outline">details pending</Badge>}
                    <a
                      href={m.investigation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-normal text-muted-foreground underline-offset-4 hover:underline"
                    >
                      PSI page <span aria-hidden>↗</span><span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </CardTitle>
                  <CardDescription>{m.investigation.name}</CardDescription>
                  <CardAction>
                    <Badge variant={COVERAGE_VARIANT[m.coverage]}>
                      {capitalise(COVERAGE_LABEL[m.coverage])}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Progress value={Math.round(m.score * 100)}>
                    <ProgressLabel>Closeness</ProgressLabel>
                    <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                      {m.score.toFixed(2)}
                    </span>
                  </Progress>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.entries(m.breakdown).map(([dim, v]) => (
                      <Badge key={dim} variant="outline" className="tabular-nums">
                        {DIMENSION_LABEL[dim] ?? dim} {v.toFixed(2)}
                      </Badge>
                    ))}
                    <span className="text-sm text-muted-foreground">
                      {withRuns.has(m.investigation.id)
                        ? `${runs} matching run${runs === 1 ? "" : "s"}`
                        : "no test-level data imported"}
                    </span>
                  </div>
                  {best && scenario && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">Closest run: test {best.run.testId}</p>
                      <UnitGaps gaps={gapsInUnits(scenario, best.run)} />
                    </div>
                  )}
                  {next && <p className="text-sm text-muted-foreground">{whyAbove(m, next)}</p>}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <p className="text-sm text-muted-foreground">
          {hidden} other imported investigation{hidden === 1 ? "" : "s"} score 0 for this
          scenario and {hidden === 1 ? "is" : "are"} not listed.
        </p>
      )}
    </div>
  );
}
