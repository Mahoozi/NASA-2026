/**
 * retrieve(), tested only through its exported signature against the real
 * data/corpus.json. Expected ids come from the corpus id scheme
 * (`psi-<n>-<section>`), not from the retrieval code.
 */
import { describe, expect, it } from "vitest";
import { retrieve } from "../lib/retrieve";

describe("retrieve", () => {
  it("returns a BASS-II (psi-25-*) doc in the top 3 for a BASS-II question", () => {
    const top3 = retrieve("What did BASS-II burn?").slice(0, 3);
    expect(top3.some((d) => d.id.startsWith("psi-25-"))).toBe(true);
  });

  it("ranks docs of investigations in ctx.investigationIds first", () => {
    const question = "What are the objectives of the flame experiment?";
    const boosted = "PSI-142";

    // Precondition: without context this investigation does not lead.
    expect(retrieve(question)[0]?.investigationId).not.toBe(boosted);

    const top3 = retrieve(question, { investigationIds: [boosted] }).slice(0, 3);
    expect(top3.map((d) => d.investigationId)).toEqual([boosted, boosted, boosted]);
  });
});
