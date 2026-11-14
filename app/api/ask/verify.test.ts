/**
 * verifyAnswer(), tested through its exported signature. Docs are labelled
 * placeholder fixtures, not NASA data; only their shape (CorpusDoc) is real.
 */
import { describe, expect, it } from "vitest";
import type { CorpusDoc } from "../../../lib/schema";
import { verifyAnswer, type DraftAnswer } from "./verify";

const docA: CorpusDoc = {
  id: "fixture-a",
  source: "psi",
  investigationId: "FIXTURE-1",
  title: "FIXTURE title A",
  url: "https://example.invalid/fixture-a",
  text: "FIXTURE alpha sentence one.   FIXTURE alpha\nsentence two burned a sample.",
};
const docB: CorpusDoc = {
  id: "fixture-b",
  source: "psi",
  investigationId: "FIXTURE-2",
  title: "FIXTURE title B",
  url: "https://example.invalid/fixture-b",
  text: "FIXTURE beta text about a flame.",
};
const docs = [docA, docB];

const draft = (sentences: DraftAnswer["sentences"]): DraftAnswer => ({
  status: "answered",
  sentences,
});

describe("verifyAnswer", () => {
  it("verifies a verbatim quote across whitespace differences, url and title from the corpus", () => {
    const res = verifyAnswer(
      draft([
        {
          sentence: "S1",
          citations: [{ docId: "fixture-a", quote: " alpha sentence two\tburned " }],
        },
      ]),
      docs,
    );
    expect(res).toEqual({
      status: "answered",
      answer: [
        {
          sentence: "S1",
          citations: [
            {
              docId: "fixture-a",
              url: "https://example.invalid/fixture-a",
              title: "FIXTURE title A",
              quote: " alpha sentence two\tburned ",
              verified: true,
            },
          ],
        },
      ],
      investigationsMentioned: ["FIXTURE-1"],
    });
  });

  it("drops a sentence whose only quote is a paraphrase, keeping verified sentences", () => {
    const res = verifyAnswer(
      draft([
        { sentence: "kept", citations: [{ docId: "fixture-b", quote: "beta text about a flame" }] },
        { sentence: "dropped", citations: [{ docId: "fixture-a", quote: "alpha sentence two burnt a sample" }] },
      ]),
      docs,
    );
    expect(res.status).toBe("answered");
    expect(res.answer.map((s) => s.sentence)).toEqual(["kept"]);
    expect(res.investigationsMentioned).toEqual(["FIXTURE-2"]);
  });

  it("returns insufficient_evidence with an empty answer when no sentence survives", () => {
    const res = verifyAnswer(
      draft([{ sentence: "x", citations: [{ docId: "fixture-a", quote: "not in any doc" }] }]),
      docs,
    );
    expect(res).toEqual({ status: "insufficient_evidence", answer: [], investigationsMentioned: [] });
  });

  it("returns insufficient_evidence when the model says so, whatever sentences it sent", () => {
    const res = verifyAnswer(
      {
        status: "insufficient_evidence",
        sentences: [{ sentence: "x", citations: [{ docId: "fixture-b", quote: "beta text about" }] }],
      },
      docs,
    );
    expect(res).toEqual({ status: "insufficient_evidence", answer: [], investigationsMentioned: [] });
  });

  it("never verifies an empty or whitespace-only quote", () => {
    const res = verifyAnswer(
      draft([{ sentence: "x", citations: [{ docId: "fixture-a", quote: " \n " }] }]),
      docs,
    );
    expect(res.status).toBe("insufficient_evidence");
  });

  it("drops citations to doc ids outside the given docs", () => {
    const res = verifyAnswer(
      draft([
        {
          sentence: "x",
          citations: [
            { docId: "not-a-doc", quote: "beta text about" },
            { docId: "fixture-b", quote: "beta text about" },
          ],
        },
      ]),
      docs,
    );
    expect(res.answer[0].citations.map((c) => c.docId)).toEqual(["fixture-b"]);
  });

  it("checks the quote against the doc it names, not any doc", () => {
    const res = verifyAnswer(
      draft([{ sentence: "x", citations: [{ docId: "fixture-a", quote: "beta text about" }] }]),
      docs,
    );
    expect(res.status).toBe("insufficient_evidence");
  });

  it("drops an unverified citation beside a verified one", () => {
    const res = verifyAnswer(
      draft([
        {
          sentence: "x",
          citations: [
            { docId: "fixture-a", quote: "made up words here" },
            { docId: "fixture-b", quote: "beta text about" },
          ],
        },
      ]),
      docs,
    );
    expect(res.answer[0].citations.map((c) => [c.docId, c.verified])).toEqual([["fixture-b", true]]);
    expect(res.investigationsMentioned).toEqual(["FIXTURE-2"]);
  });

  it("does not verify a quote shorter than 3 words, even if it is a substring", () => {
    const res = verifyAnswer(
      draft([{ sentence: "x", citations: [{ docId: "fixture-b", quote: "beta text" }] }]),
      docs,
    );
    expect(res.status).toBe("insufficient_evidence");
  });

  it("drops blank sentences and repeated citations", () => {
    const c = { docId: "fixture-b", quote: "beta text about" };
    const res = verifyAnswer(
      draft([
        { sentence: "  ", citations: [c] },
        { sentence: "x", citations: [c, { ...c, quote: " beta  text about " }] },
      ]),
      docs,
    );
    expect(res.answer).toHaveLength(1);
    expect(res.answer[0].citations).toHaveLength(1);
  });

  it("returns at most 4 sentences", () => {
    const s = { sentence: "x", citations: [{ docId: "fixture-b", quote: "beta text about" }] };
    const res = verifyAnswer(draft([s, s, s, s, s]), docs);
    expect(res.answer).toHaveLength(4);
  });
});
