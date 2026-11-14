import { z } from "zod";
import type { AskResponse } from "@/lib/schema";
import { answer, MissingApiKeyError } from "./ask";
import { CACHE_SOURCE_HEADER, findCachedAnswer } from "./cache";

/** LLM budget (retries included) for cached questions; past it the cache answers. */
const CACHED_QUESTION_TIMEOUT_MS = 20_000;

const materialFamily = z.enum([
  "PMMA film", "PMMA slab", "PMMA rod", "PMMA sphere",
  "SIBAL fabric", "Nomex", "wax", "other",
]);
const safetyArea = z.enum(["prevention", "detection", "suppression", "fundamental"]);

const askRequestSchema = z.object({
  question: z.string().min(1),
  context: z
    .object({
      investigationIds: z.array(z.string()).optional(),
      scenario: z
        .object({
          label: z.string().optional(),
          materialFamily: materialFamily.optional(),
          o2Pct: z.number().optional(),
          pressurePsi: z.number().optional(),
          flowCmS: z.number().optional(),
          gravity: z.enum(["micro", "lunar", "martian", "1g"]).optional(),
          safetyArea: safetyArea.optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = askRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid AskRequest", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Demo safety net: a recorded real answer for this exact question + context.
  // Only then is the live call time-limited; other questions behave as before.
  const cached = findCachedAnswer(parsed.data);
  try {
    const response: AskResponse = await answer(
      parsed.data,
      cached ? { timeoutMs: CACHED_QUESTION_TIMEOUT_MS } : {},
    );
    return Response.json(response);
  } catch (err) {
    if (cached) {
      console.warn("ask: live answer failed, serving demo cache", err instanceof Error ? err.message : err);
      return Response.json(cached, { headers: { [CACHE_SOURCE_HEADER]: "cache" } });
    }
    if (err instanceof MissingApiKeyError) {
      return Response.json({ error: "OPENAI_API_KEY is not set" }, { status: 503 });
    }
    console.error("ask: answer generation failed", err);
    return Response.json({ error: "Answer generation failed" }, { status: 502 });
  }
}
