import corpusJson from "../../../data/corpus.json";
import demoCacheJson from "../../../data/demo-cache.json";
import type { AskRequest, AskResponse, CorpusDoc } from "../../../lib/schema";
import { verifyAnswer } from "./verify";

/** One recorded answer in data/demo-cache.json (written by `npm run cache:demo`). */
export type DemoCacheEntry = {
  question: string;
  context: AskRequest["context"] | null;
  response: AskResponse;
  model: string;
  generatedAt: string;
};

/** Response header that marks an answer served from the demo cache. */
export const CACHE_SOURCE_HEADER = "x-firebreak-source";

/** Case, spacing and trailing punctuation do not change the question. */
function normalizeQuestion(q: string): string {
  return q.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim().replace(/[?.!\s]+$/, "");
}

/**
 * Only differences answer() ignores are normalized: key order, id order and
 * repeats, and an empty id list (same as none). Ids keep their case, and an
 * empty scenario stays distinct from no scenario, as in answer().
 */
function normalizeContext(ctx: AskRequest["context"] | null | undefined) {
  const scenario = ctx?.scenario
    ? Object.fromEntries(
        Object.entries(ctx.scenario)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b)),
      )
    : null;
  const ids = [...new Set(ctx?.investigationIds ?? [])].sort();
  return { scenario, investigationIds: ids.length ? ids : null };
}

export function cacheKey(req: { question: string; context?: AskRequest["context"] | null }): string {
  return JSON.stringify({ q: normalizeQuestion(req.question), ...normalizeContext(req.context) });
}

/**
 * True when a recorded response passes verifyAnswer against `corpus` unchanged:
 * every quote still in its doc, url and title still the corpus values.
 */
export function reverify(response: AskResponse, corpus: CorpusDoc[]): boolean {
  if (response.status !== "answered") return false;
  const draft = {
    status: response.status,
    sentences: response.answer.map((s) => ({
      sentence: s.sentence,
      citations: s.citations.map((c) => ({ docId: c.docId, quote: c.quote })),
    })),
  };
  return JSON.stringify(verifyAnswer(draft, corpus)) === JSON.stringify(response);
}

const corpus = corpusJson as CorpusDoc[];
const byKey = new Map(
  (demoCacheJson as DemoCacheEntry[])
    .filter((e) => reverify(e.response, corpus))
    .map((e) => [cacheKey(e), e.response] as const),
);

/** The recorded answer for this exact question + context, if one exists and still verifies. */
export function findCachedAnswer(req: AskRequest): AskResponse | undefined {
  return byKey.get(cacheKey(req));
}
