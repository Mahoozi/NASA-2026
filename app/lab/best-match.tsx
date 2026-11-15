// Person A — the headline card for the scenario's closest evidence, with the run that
// carries the score and how far that run is from the scenario in real units.
// Display only: the score and ranking come from lib/match.ts unchanged.
import type { InvestigationMatch, Run, Scenario } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { bestRun, gapsInUnits, type UnitGap } from "./match-explain";
import { COVERAGE_LABEL, DIMENSION_LABEL, investigationLabel } from "./summary";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One "Label: text (NASA cell …)" row per dimension. */
export function UnitGaps({ gaps }: { gaps: UnitGap[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {gaps.map((g) => (
        <div key={g.label} className="contents">
          <dt className="text-muted-foreground">{g.label}</dt>
          <dd>
            {g.text}
            {g.source && (
              <span className="text-muted-foreground"> (NASA cell &ldquo;{g.source}&rdquo;)</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BestMatch({
  scenario,
  matches,
  runs,
}: {
  scenario: Scenario;
  matches: InvestigationMatch[];
  runs: Run[];
}) {
  const top = matches.find((m) => m.score > 0);
  if (!top) return null;
  const best = bestRun(scenario, runs.filter((r) => r.investigationId === top.investigation.id));
  const dims = Object.keys(top.breakdown).map((d) => DIMENSION_LABEL[d] ?? d);
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background/40 p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">Best match for your scenario</p>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-5xl leading-none font-bold text-primary tabular-nums sm:text-6xl">
          {Math.round(top.score * 100)}%
        </span>
        <span className="text-2xl font-bold [font-stretch:84%]">{investigationLabel(top.investigation)}</span>
        <Badge variant={top.coverage === "direct" ? "default" : "secondary"}>{capitalise(COVERAGE_LABEL[top.coverage])}</Badge>
      </div>
      {top.investigation.name && top.investigation.name !== top.investigation.acronym && (
        <p className="text-sm text-muted-foreground">{top.investigation.name}</p>
      )}
      <p className="text-sm">
        Closeness covers {dims.join(", ")}.
        {scenario.pressurePsi !== undefined && " Pressure is not scored because no imported table records it."}
      </p>
      {best && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-sm font-medium">
            Closest run: test {best.run.testId}
          </p>
          <UnitGaps gaps={gapsInUnits(scenario, best.run)} />
        </div>
      )}
      <p className="border-t border-border pt-3 text-sm text-muted-foreground">
        Closeness measures how near NASA&apos;s recorded runs are to your scenario, not fire safety.
      </p>
    </div>
  );
}
