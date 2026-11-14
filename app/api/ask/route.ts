import { z } from "zod";
import type { AskResponse } from "@/lib/schema";

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

  // Hardcoded stub. No LLM call yet.
  const response: AskResponse = {
    status: "answered",
    answer: [
      {
        sentence: "SAMPLE answer sentence. This is placeholder output, not NASA data.",
        citations: [
          {
            docId: "SAMPLE-1",
            url: "SAMPLE url",
            title: "SAMPLE title",
            quote: "SAMPLE quote",
            verified: false,
          },
        ],
      },
    ],
    investigationsMentioned: [],
  };

  return Response.json(response);
}
