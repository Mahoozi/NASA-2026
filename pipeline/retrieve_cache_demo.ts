// npm run cache:demo — record real /api/ask answers for the demo questions
// into data/demo-cache.json, the fallback served when the LLM call fails live.
// Calls OpenAI with .env.local. Only answered responses whose citations are
// all verified are kept; nothing is written by hand.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import goldenJson from "../data/golden.json";
import investigationsJson from "../data/investigations.json";
import runsJson from "../data/runs.json";
import { answer } from "../app/api/ask/ask";
import { parseAskContext } from "../app/ask/context";
import { askHref } from "../app/lab/ask-link";
import { matchInvestigations } from "../lib/match";
import type { AskRequest, AskResponse, Investigation, Run, Scenario } from "../lib/schema";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "demo-cache.json");

export type DemoCacheEntry = {
  question: string;
  context: AskRequest["context"] | null;
  response: AskResponse;
  model: string;
  generatedAt: string;
};

/** The demo scenario (plan/PLAN.md §9). */
const DEMO_SCENARIO: Scenario = { materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" };
/** Asked with the Lab handoff context. */
const HANDOFF_QUESTION_ID = "demo-pmma-rod-low-flow";
/** Asked with no context. */
const PLAIN_QUESTION_IDS = [
  "fact-bass2-flow-oxygen",
  "fact-guide-misconceptions",
  "fact-guide-water-mist",
  "fact-flex-suppressants",
  "compare-saffire1-saffire3-flow",
];

const golden = goldenJson as { id: string; question: string }[];
const questionFor = (id: string) => {
  const g = golden.find((q) => q.id === id);
  if (!g) throw new Error(`golden question ${id} not found`);
  return g.question;
};

/** The context /ask builds from the Lab's "Ask about this scenario" link. */
function handoffContext(): AskRequest["context"] {
  const matches = matchInvestigations(
    DEMO_SCENARIO,
    investigationsJson as Investigation[],
    runsJson as Run[],
  );
  const url = new URL(askHref(DEMO_SCENARIO, matches), "http://local");
  return parseAskContext(url.searchParams);
}

const allVerified = (r: AskResponse) =>
  r.status === "answered" && r.answer.every((s) => s.citations.every((c) => c.verified));

async function main() {
  const envFile = join(ROOT, ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set (.env.local); nothing written.");
    process.exit(1);
  }
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const requests: AskRequest[] = [
    { question: questionFor(HANDOFF_QUESTION_ID), context: handoffContext() },
    ...PLAIN_QUESTION_IDS.map((id) => ({ question: questionFor(id) })),
  ];

  const entries: DemoCacheEntry[] = [];
  for (const req of requests) {
    const response = await answer(req);
    const keep = allVerified(response);
    console.log(`${keep ? "kept" : "skip"} ${response.status}: ${req.question}`);
    if (keep) {
      entries.push({
        question: req.question,
        context: req.context ?? null,
        response,
        model,
        generatedAt: new Date().toISOString(),
      });
    }
  }

  writeFileSync(OUT, JSON.stringify(entries, null, 2) + "\n");
  console.log(`\n${entries.length} of ${requests.length} demo answers cached in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
