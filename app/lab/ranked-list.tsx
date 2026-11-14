// Person A — ranked investigations for the current scenario.
import type { InvestigationMatch } from "@/lib/schema";
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

const COVERAGE: Record<
  InvestigationMatch["coverage"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  direct: { label: "Direct evidence", variant: "default" },
  partial: { label: "Partial evidence", variant: "secondary" },
  none: { label: "No close evidence", variant: "outline" },
};

const DIMENSION_LABEL: Record<string, string> = {
  materialFamily: "Material",
  o2Pct: "O₂",
  flowCmS: "Flow",
  gravity: "Gravity",
  safetyArea: "Safety area",
};

export function RankedList({
  matches,
  pendingIds,
}: {
  matches: InvestigationMatch[];
  pendingIds: string[];
}) {
  return (
    <ol className="flex flex-col gap-3">
      {matches.map((m, i) => {
        const cov = COVERAGE[m.coverage];
        const pending = pendingIds.includes(m.investigation.id);
        const runs = m.matchingRunIds.length;
        return (
          <li key={m.investigation.id}>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                  <a
                    href={m.investigation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {m.investigation.acronym}
                  </a>
                  {pending && <Badge variant="outline">details pending</Badge>}
                </CardTitle>
                <CardDescription>{m.investigation.name}</CardDescription>
                <CardAction>
                  <Badge variant={cov.variant}>{cov.label}</Badge>
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
                    {m.investigation.hasRunData
                      ? `${runs} matching run${runs === 1 ? "" : "s"}`
                      : "no test-level data imported"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
