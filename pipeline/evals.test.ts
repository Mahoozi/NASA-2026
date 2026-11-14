import { describe, expect, it } from "vitest";
import corpusJson from "../data/corpus.json";
import goldenJson from "../data/golden.json";
import type { CorpusDoc } from "../lib/schema";

type GoldenItem = {
  id: string;
  question: string;
  expectDocIds: string[];
  expectStatus: "answered" | "insufficient_evidence";
};

const corpus = corpusJson as CorpusDoc[];
const golden = goldenJson as GoldenItem[];
const docIds = new Set(corpus.map((d) => d.id));

describe("data/golden.json", () => {
  it("has 20 to 25 items", () => {
    expect(golden.length).toBeGreaterThanOrEqual(20);
    expect(golden.length).toBeLessThanOrEqual(25);
  });

  it("has unique ids", () => {
    const ids = golden.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only expects docs that exist in data/corpus.json", () => {
    const missing = golden.flatMap((g) =>
      g.expectDocIds.filter((id) => !docIds.has(id)).map((id) => `${g.id}: ${id}`),
    );
    expect(missing).toEqual([]);
  });

  it("has a non-empty question and a known status on every item", () => {
    for (const g of golden) {
      expect(g.question.trim(), g.id).not.toBe("");
      expect(["answered", "insufficient_evidence"], g.id).toContain(g.expectStatus);
    }
  });

  it("expects sources for answered items and none for refusals", () => {
    for (const g of golden) {
      if (g.expectStatus === "answered") expect(g.expectDocIds.length, g.id).toBeGreaterThan(0);
      else expect(g.expectDocIds, g.id).toEqual([]);
    }
  });

  it("has at least 3 items that must return insufficient_evidence", () => {
    expect(golden.filter((g) => g.expectStatus === "insufficient_evidence").length).toBeGreaterThanOrEqual(3);
  });
});
