// Person A — one-line summary of the closest evidence for the scenario.
import type { Investigation, InvestigationMatch } from "@/lib/schema";

/** Some PSI investigations have no acronym; fall back to the PSI id. */
export const investigationLabel = (i: Investigation) => i.acronym || i.id;

export const COVERAGE_LABEL: Record<InvestigationMatch["coverage"], string> = {
  direct: "direct evidence",
  partial: "partial evidence",
  none: "no close evidence",
};

export const DIMENSION_LABEL: Record<string, string> = {
  materialFamily: "Material",
  o2Pct: "O₂",
  flowCmS: "Flow",
  gravity: "Gravity",
  safetyArea: "Safety area",
};

export const NO_COVERAGE = "No imported investigation covers this scenario.";

/**
 * An investigation has test-level data when runs exist for its id in
 * data/runs.json, whatever its `hasRunData` field says.
 */
export function Summary({
  matches,
  withRuns,
}: {
  matches: InvestigationMatch[];
  withRuns: Set<string>;
}) {
  const top = matches.find((m) => m.score > 0);
  if (!top) return <p className="text-base font-medium">{NO_COVERAGE}</p>;
  const runs = top.matchingRunIds.length;
  return (
    <p className="text-base">
      <span className="font-medium">Closest evidence: {investigationLabel(top.investigation)}</span>
      {top.investigation.name && top.investigation.name !== top.investigation.acronym && (
        <span className="text-muted-foreground"> ({top.investigation.name})</span>
      )}
      , {COVERAGE_LABEL[top.coverage]}, closeness {top.score.toFixed(2)},{" "}
      {withRuns.has(top.investigation.id)
        ? `${runs} matching run${runs === 1 ? "" : "s"}`
        : "no test-level data imported"}
      .
    </p>
  );
}
