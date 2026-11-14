import { z } from "zod";
import type { AskResponse } from "@/lib/schema";
import { answer, MissingApiKeyError } from "./ask";

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

  try {
    const response: AskResponse = await answer(parsed.data);
    return Response.json(response);
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return Response.json({ error: "OPENAI_API_KEY is not set" }, { status: 503 });
    }
    console.error("ask: answer generation failed", err);
    return Response.json({ error: "Answer generation failed" }, { status: 502 });
  }
}
