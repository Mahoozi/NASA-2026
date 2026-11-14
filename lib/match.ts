import type {
  Investigation,
  InvestigationMatch,
  Run,
  Scenario,
} from "./schema";

/**
 * Rank investigations by how closely their evidence matches a scenario.
 *
 * Contract (frozen, see plan/PLAN.md §2): one entry per investigation,
 * sorted by `score` descending then `investigation.id`. Scores are
 * closeness of evidence, 0..1, never a risk or safety judgement.
 *
 * Stage 0 stub: every investigation scores 0 with coverage "none".
 * Real scoring lands in Stage 1 (plan/A.md).
 */
export function matchInvestigations(
  scenario: Scenario,
  investigations: Investigation[],
  runs: Run[],
): InvestigationMatch[] {
  void scenario;
  void runs;
  return investigations
    .map((investigation) => ({
      investigation,
      score: 0,
      breakdown: {},
      coverage: "none" as const,
      matchingRunIds: [],
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.investigation.id.localeCompare(b.investigation.id),
    );
}
