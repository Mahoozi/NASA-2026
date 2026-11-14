// Person B — shape of data/evals.latest.json and the pure scoring that fills it.
// Written by pipeline/evals.ts, read by app/evals (no LLM call at render).
import type { AskResponse } from "../lib/schema";

export type GoldenItem = {
  id: string;
  question: string;
  expectDocIds: string[];
  expectStatus: AskResponse["status"];
};

export type EvalCitation = { docId: string; verified: boolean; expected: boolean };

export type EvalItem = {
  id: string;
  question: string;
  expectStatus: AskResponse["status"];
  /** "error" when retrieval or answering threw; `error` then says why. */
  gotStatus: AskResponse["status"] | "error";
  statusMatch: boolean;
  expectDocIds: string[];
  retrievedDocIds: string[];
  /** Every expected doc was retrieved. False for items that expect no docs. */
  retrievalHit: boolean;
  citations: EvalCitation[];
  error?: string;
};

export type EvalTotals = {
  questions: number;
  statusMatches: number;
  answeredExpected: number;
  answeredCorrect: number;
  refusalsExpected: number;
  refusalsCorrect: number;
  wronglyRefused: number;
  /** Out of the items that expect at least one doc. */
  retrievalHits: number;
  citations: number;
  citationsVerified: number;
  /** Verified citations whose doc is one of the item's expectDocIds. */
  citationsExpected: number;
};

export type EvalReport = {
  generatedAt: string;
  model: string;
  totals: EvalTotals;
  items: EvalItem[];
};

/** Score one golden item from what retrieve() and answer() returned (or the error). */
export function scoreItem(
  g: GoldenItem,
  retrievedDocIds: string[],
  outcome: { res: AskResponse } | { error: string },
): EvalItem {
  const retrieved = new Set(retrievedDocIds);
  const expected = new Set(g.expectDocIds);
  const base = {
    id: g.id,
    question: g.question,
    expectStatus: g.expectStatus,
    expectDocIds: g.expectDocIds,
    retrievedDocIds,
    retrievalHit: g.expectDocIds.length > 0 && g.expectDocIds.every((id) => retrieved.has(id)),
  };
  if ("error" in outcome) {
    return { ...base, gotStatus: "error", statusMatch: false, citations: [], error: outcome.error };
  }
  const { res } = outcome;
  return {
    ...base,
    gotStatus: res.status,
    statusMatch: res.status === g.expectStatus,
    citations: res.answer.flatMap((s) =>
      s.citations.map((c) => ({
        docId: c.docId,
        verified: c.verified,
        expected: expected.has(c.docId),
      })),
    ),
  };
}

export function computeTotals(items: EvalItem[]): EvalTotals {
  const count = (p: (i: EvalItem) => boolean) => items.filter(p).length;
  const cites = items.flatMap((i) => i.citations);
  return {
    questions: items.length,
    statusMatches: count((i) => i.statusMatch),
    answeredExpected: count((i) => i.expectStatus === "answered"),
    answeredCorrect: count((i) => i.expectStatus === "answered" && i.gotStatus === "answered"),
    refusalsExpected: count((i) => i.expectStatus === "insufficient_evidence"),
    refusalsCorrect: count(
      (i) => i.expectStatus === "insufficient_evidence" && i.gotStatus === "insufficient_evidence",
    ),
    wronglyRefused: count(
      (i) => i.expectStatus === "answered" && i.gotStatus === "insufficient_evidence",
    ),
    retrievalHits: count((i) => i.retrievalHit),
    citations: cites.length,
    citationsVerified: cites.filter((c) => c.verified).length,
    citationsExpected: cites.filter((c) => c.verified && c.expected).length,
  };
}
