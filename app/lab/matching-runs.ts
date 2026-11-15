// Person A — the Lab's set of matching runs for a scenario. The runs table, the gap
// chart and the landing page's evidence atlas all use this one definition.
import { RUN_DIMENSIONS } from "../../lib/match";
import type { InvestigationMatch, Scenario } from "../../lib/schema";

/**
 * Every run that matches all the scenario's run-level dimensions (material, oxygen,
 * airflow, gravity), across investigations. Null when the scenario sets none of
 * them, because then nothing is being matched. `matches` comes from matchInvestigations.
 */
export function matchingRunIdSet(scenario: Scenario, matches: InvestigationMatch[]): Set<string> | null {
  return RUN_DIMENSIONS.some((d) => scenario[d] !== undefined)
    ? new Set(matches.flatMap((m) => m.matchingRunIds))
    : null;
}
