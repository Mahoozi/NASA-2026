// The demo questions recorded by `npm run cache:demo`. Used by the script and
// tests only, never by the route (it pulls in the Lab's link builder).
import goldenJson from "../../../data/golden.json";
import investigationsJson from "../../../data/investigations.json";
import runsJson from "../../../data/runs.json";
import { parseAskContext } from "../../ask/context";
import { EXAMPLE_QUESTIONS } from "../../ask/examples";
import { askHref } from "../../lab/ask-link";
import { matchInvestigations } from "../../../lib/match";
import type { AskRequest, Investigation, Run, Scenario } from "../../../lib/schema";

/** The demo scenario (plan/PLAN.md §9). */
export const DEMO_SCENARIO: Scenario = {
  materialFamily: "PMMA rod",
  o2Pct: 17,
  flowCmS: 5,
  gravity: "micro",
};
/** Golden question asked with the Lab handoff context. */
const HANDOFF_QUESTION_ID = "demo-pmma-rod-low-flow";
/** Golden questions asked with no context. */
const PLAIN_QUESTION_IDS = [
  "fact-bass2-flow-oxygen",
  "fact-guide-misconceptions",
  "fact-guide-water-mist",
  "fact-flex-suppressants",
  "compare-saffire1-saffire3-flow",
];

const golden = goldenJson as { id: string; question: string }[];
function questionFor(id: string): string {
  const g = golden.find((q) => q.id === id);
  if (!g) throw new Error(`golden question ${id} not found`);
  return g.question;
}

/** The request /ask sends after the Lab's "Ask about this scenario" link, as built today. */
export function demoHandoffRequest(): AskRequest {
  const matches = matchInvestigations(
    DEMO_SCENARIO,
    investigationsJson as Investigation[],
    runsJson as Run[],
  );
  const url = new URL(askHref(DEMO_SCENARIO, matches), "http://local");
  return { question: questionFor(HANDOFF_QUESTION_ID), context: parseAskContext(url.searchParams) };
}

export function demoRequests(): AskRequest[] {
  return [
    demoHandoffRequest(),
    ...PLAIN_QUESTION_IDS.map((id) => ({ question: questionFor(id) })),
    // The clickable example questions on /ask (asked with no context).
    ...EXAMPLE_QUESTIONS.map((ex) => ({ question: ex.question })),
  ];
}
