// Person B — `npm run evals`: run every golden question through the same code
// path as POST /api/ask (retrieve() + answer(), no HTTP) and write
// data/evals.latest.json for the /evals scorecard. Calls OpenAI with .env.local.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import goldenJson from "../data/golden.json";
import { answer } from "../app/api/ask/ask";
import { retrieve } from "../lib/retrieve";
import { computeTotals, scoreItem, type EvalItem, type EvalReport, type GoldenItem } from "./evals-result";

/** npm runs scripts from the package root. */
const ROOT = process.cwd();
const OUT = join(ROOT, "data", "evals.latest.json");
/** Questions answered at once; keeps OpenAI rate limits comfortable. */
const CONCURRENCY = 4;

async function runItem(g: GoldenItem): Promise<EvalItem> {
  let retrievedDocIds: string[] = [];
  try {
    retrievedDocIds = retrieve(g.question).map((d) => d.id);
    const res = await answer({ question: g.question });
    return scoreItem(g, retrievedDocIds, { res });
  } catch (err) {
    // One failing question is recorded, never thrown.
    const error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return scoreItem(g, retrievedDocIds, { error });
  }
}

async function main() {
  const envFile = join(ROOT, ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set (.env.local); no results written.");
    process.exit(1);
  }
  // Same fallback as app/api/ask/ask.ts (DEFAULT_MODEL, the agreed default in plan/REQUESTS.md).
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const golden = goldenJson as GoldenItem[];
  const items: EvalItem[] = new Array(golden.length);
  let next = 0;
  async function worker() {
    while (next < golden.length) {
      const i = next++;
      items[i] = await runItem(golden[i]);
      const it = items[i];
      console.log(
        `${it.statusMatch ? "ok  " : "FAIL"} ${it.id}: expected ${it.expectStatus}, got ${it.gotStatus}` +
          (it.error ? ` (${it.error})` : ""),
      );
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    model,
    totals: computeTotals(items),
    items,
  };
  writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  const t = report.totals;
  console.log(
    `\n${t.statusMatches} of ${t.questions} questions got the expected result; ` +
      `${t.retrievalHits} of ${t.answeredExpected} answerable questions had every expected source retrieved; ` +
      `${t.citationsExpected} of ${t.citationsVerified} verified citations point to an expected source.\n` +
      `Wrote ${OUT}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
