import investigationsJson from "../../../data/investigations.json";
import runsJson from "../../../data/runs.json";
import { matchInvestigations } from "../../../lib/match";
import type { Investigation, InvestigationMatch, Run, Scenario } from "../../../lib/schema";

const investigations = investigationsJson as Investigation[];
const runs = runsJson as Run[];

/** How many matched investigations get a retrieval boost. */
export const SCENARIO_TOP_N = 3;

/** The top matches for a scenario, skipping investigations with no closeness at all. */
export function topScenarioMatches(scenario: Scenario): InvestigationMatch[] {
  return matchInvestigations(scenario, investigations, runs)
    .filter((m) => m.score > 0)
    .slice(0, SCENARIO_TOP_N);
}

/**
 * The scenario and code-computed evidence coverage, as prompt data. Scores are
 * left out so the model cannot repeat them as a rating.
 */
export function scenarioPromptBlock(scenario: Scenario, matches: InvestigationMatch[]): string {
  const lines = [`Scenario (JSON, from the user): ${JSON.stringify(scenario)}`];
  if (matches.length) {
    lines.push(
      "Evidence coverage computed by code for this scenario (data about how closely recorded runs match it; not a verdict):",
      ...matches.map(
        (m) =>
          `- ${m.investigation.id} (${m.investigation.acronym}): coverage ${m.coverage}, ${m.matchingRunIds.length} matching recorded runs`,
      ),
    );
  }
  return lines.join("\n");
}
