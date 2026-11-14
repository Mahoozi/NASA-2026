// npm run cache:demo — record real /api/ask answers for the demo questions
// into data/demo-cache.json, the fallback served when the LLM call fails live.
// Calls OpenAI with .env.local. Only answered responses whose citations are
// all verified are kept; nothing is written by hand.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { answer } from "../app/api/ask/ask";
import { cacheKey, type DemoCacheEntry } from "../app/api/ask/cache";
import { demoRequests } from "../app/api/ask/demo";
import type { AskResponse } from "../lib/schema";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "data", "demo-cache.json");

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

  const requests = demoRequests();

  // By default keep every entry already recorded for a current demo request and
  // only call the model for new requests. `--refresh` re-records all of them.
  const refresh = process.argv.includes("--refresh");
  const existing = new Map<string, DemoCacheEntry>(
    !refresh && existsSync(OUT)
      ? (JSON.parse(readFileSync(OUT, "utf8")) as DemoCacheEntry[]).map((e) => [cacheKey(e), e] as const)
      : [],
  );

  const entries: DemoCacheEntry[] = [];
  for (const req of requests) {
    const kept = existing.get(cacheKey(req));
    if (kept) {
      console.log(`kept (already cached): ${req.question}`);
      entries.push(kept);
      continue;
    }
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
