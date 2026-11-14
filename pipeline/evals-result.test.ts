import { describe, expect, it } from "vitest";
import type { AskResponse } from "../lib/schema";
import { computeTotals, scoreItem, type GoldenItem } from "./evals-result";

const answerable: GoldenItem = {
  id: "a",
  question: "q?",
  expectDocIds: ["d1", "d2"],
  expectStatus: "answered",
};
const refusal: GoldenItem = { id: "r", question: "q?", expectDocIds: [], expectStatus: "insufficient_evidence" };

const cite = (docId: string, verified = true) => ({ docId, url: "u", title: "t", quote: "a b c", verified });
const answered = (...docIds: string[]): AskResponse => ({
  status: "answered",
  answer: [{ sentence: "s", citations: docIds.map((d) => cite(d)) }],
  investigationsMentioned: [],
});
const refused: AskResponse = { status: "insufficient_evidence", answer: [], investigationsMentioned: [] };

describe("scoreItem", () => {
  it("needs every expected doc retrieved for a retrieval hit", () => {
    expect(scoreItem(answerable, ["d1", "d2", "x"], { res: refused }).retrievalHit).toBe(true);
    expect(scoreItem(answerable, ["d1"], { res: refused }).retrievalHit).toBe(false);
    expect(scoreItem(refusal, [], { res: refused }).retrievalHit).toBe(false);
  });

  it("marks citations to expected docs", () => {
    const item = scoreItem(answerable, ["d1"], { res: answered("d1", "x") });
    expect(item.statusMatch).toBe(true);
    expect(item.citations).toEqual([
      { docId: "d1", verified: true, expected: true },
      { docId: "x", verified: true, expected: false },
    ]);
  });

  it("records an error as a failed item instead of throwing", () => {
    const item = scoreItem(answerable, [], { error: "boom" });
    expect(item).toMatchObject({ gotStatus: "error", statusMatch: false, error: "boom", citations: [] });
  });
});

describe("computeTotals", () => {
  it("counts each total", () => {
    const items = [
      scoreItem(answerable, ["d1", "d2"], { res: answered("d1", "x") }),
      scoreItem({ ...answerable, id: "b" }, ["d1"], { res: refused }),
      scoreItem(refusal, [], { res: refused }),
      scoreItem({ ...refusal, id: "s" }, [], { res: answered("d1") }),
      scoreItem({ ...answerable, id: "e" }, [], { error: "boom" }),
    ];
    expect(computeTotals(items)).toEqual({
      questions: 5,
      statusMatches: 2,
      answeredExpected: 3,
      answeredCorrect: 1,
      refusalsExpected: 2,
      refusalsCorrect: 1,
      wronglyRefused: 1,
      retrievalHits: 1,
      citations: 3,
      citationsVerified: 3,
      citationsExpected: 1,
    });
  });
});
