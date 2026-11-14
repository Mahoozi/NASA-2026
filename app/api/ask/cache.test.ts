/**
 * The recorded demo cache, checked against the current data: every entry must
 * still verify against data/corpus.json, and the handoff entry must carry the
 * context the Lab's "Ask about this scenario" link sends today.
 */
import { describe, expect, it, vi } from "vitest";

// ask-link.tsx (the Lab's link builder) imports a UI button through the "@/"
// alias, which vitest does not resolve; askHref does not use it.
vi.mock("@/components/ui/button", () => ({ buttonVariants: () => "" }));
import demoCache from "../../../data/demo-cache.json";
import corpusJson from "../../../data/corpus.json";
import type { CorpusDoc } from "../../../lib/schema";
import type { DemoCacheEntry } from "./cache";
import { cacheKey, findCachedAnswer, reverify } from "./cache";
import { demoHandoffRequest } from "./demo";

const entries = demoCache as DemoCacheEntry[];
const corpus = corpusJson as CorpusDoc[];

describe("demo cache", () => {
  it("serves every recorded entry (all still verify against the current corpus)", () => {
    for (const e of entries) {
      const req = { question: e.question, context: e.context ?? undefined };
      expect(findCachedAnswer(req)).toEqual(e.response);
    }
  });

  it("drops an entry whose quote no longer appears in its doc", () => {
    const e = entries[0];
    const c = e.response.answer[0].citations[0];
    const doc = corpus.find((d) => d.id === c.docId)!;
    const changed = corpus.map((d) => (d === doc ? { ...d, text: "FIXTURE replaced text" } : d));
    expect(reverify(e.response, changed)).toBe(false);
    expect(reverify(e.response, corpus)).toBe(true);
  });

  it("has an entry for the Lab handoff request as the Lab builds it today", () => {
    const req = demoHandoffRequest();
    expect(entries.some((e) => cacheKey(e) === cacheKey(req))).toBe(true);
  });
});
