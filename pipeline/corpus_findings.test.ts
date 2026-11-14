/**
 * data/findings.json — the Finding contract with Person A (lib/schema.ts).
 * Every quote must be verbatim in its source corpus doc; title, url and year
 * must match the source; tags must use the shared enum values.
 */
import { describe, expect, it } from "vitest";
import corpusJson from "../data/corpus.json";
import findingsJson from "../data/findings.json";
import investigationsJson from "../data/investigations.json";
import ntrsJson from "../data/ntrs-papers.json";
import type { CorpusDoc, Finding, Investigation, MaterialFamily, Scenario } from "../lib/schema";

const corpus = corpusJson as CorpusDoc[];
const findings = findingsJson as Finding[];
const investigations = investigationsJson as Investigation[];
const papers = (ntrsJson as { papers: { id: string; year: number }[] }).papers;

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const TOPICS: Finding["tags"]["topic"][] = ["flammability-limit", "flame-spread", "test-method", "partial-gravity", "atmosphere"];
const MATERIALS: MaterialFamily[] = ["PMMA film", "PMMA slab", "PMMA rod", "PMMA sphere", "SIBAL fabric", "Nomex", "wax", "other"];
const GRAVITIES: NonNullable<Scenario["gravity"]>[] = ["micro", "lunar", "martian", "1g"];
/** Claims are neutral paraphrases: no ratings, verdicts or probabilities. */
const VERDICT_WORDS = /\b(safe|unsafe|safer|dangerous|hazardous|risky|probability|likely|rating|score)\b/i;

describe("data/findings.json", () => {
  it("has 6–10 findings with unique ids", () => {
    expect(findings.length).toBeGreaterThanOrEqual(6);
    expect(findings.length).toBeLessThanOrEqual(10);
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
  });

  for (const f of findings) {
    describe(f.id, () => {
      const doc = corpus.find((d) => d.id === f.sourceDocId);

      it("quote is verbatim in the source doc", () => {
        expect(doc, `no corpus doc ${f.sourceDocId}`).toBeDefined();
        expect(f.quote.trim().length).toBeGreaterThan(20);
        expect(collapse(doc!.text)).toContain(collapse(f.quote));
      });

      it("title, url and year match the source", () => {
        expect(f.sourceTitle).toBe(doc!.title);
        expect(f.url).toBe(doc!.url);
        const paper = papers.find((p) => f.sourceDocId.startsWith(`ntrs-${p.id}-`));
        expect(paper, "findings come from dated published papers").toBeDefined();
        expect(f.year).toBe(paper!.year);
      });

      it("claim is a neutral one-liner", () => {
        expect(f.claim.trim().length).toBeGreaterThan(10);
        expect(f.claim).not.toMatch(VERDICT_WORDS);
      });

      it("tags use the shared values", () => {
        expect(TOPICS).toContain(f.tags.topic);
        for (const m of f.tags.materials ?? []) expect(MATERIALS).toContain(m);
        for (const g of f.tags.gravity ?? []) expect(GRAVITIES).toContain(g);
        for (const r of [f.tags.o2Range, f.tags.flowRange]) {
          if (!r) continue;
          expect(r).toHaveLength(2);
          expect(r[0]).toBeLessThanOrEqual(r[1]);
        }
        for (const id of f.investigations) expect(investigations.map((i) => i.id)).toContain(id);
      });
    });
  }
});
