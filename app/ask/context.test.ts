import { describe, expect, it } from "vitest";
import type { AskResponse } from "../../lib/schema";
import {
  parseAskContext,
  parseInvestigationIds,
  sanitizeScenario,
  scenarioSummary,
  shownAnswer,
} from "./context";

const params = (q: string) => new URLSearchParams(q);

describe("parseAskContext", () => {
  it("returns undefined with no params", () => {
    expect(parseAskContext(params(""))).toBeUndefined();
  });

  it("reads the Lab handoff", () => {
    const scenario = { materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" };
    const q = new URLSearchParams({
      scenario: JSON.stringify(scenario),
      investigations: "PSI-25,PSI-10",
    });
    expect(parseAskContext(q)).toEqual({ scenario, investigationIds: ["PSI-25", "PSI-10"] });
  });

  it("ignores a scenario that is not JSON", () => {
    expect(parseAskContext(params("scenario={oops&investigations=PSI-25"))).toEqual({
      investigationIds: ["PSI-25"],
    });
  });

  it("ignores a scenario JSON that is not an object", () => {
    expect(parseAskContext(params("scenario=[1,2]"))).toBeUndefined();
    expect(parseAskContext(params("scenario=null"))).toBeUndefined();
  });
});

describe("sanitizeScenario", () => {
  it("drops fields with invalid values", () => {
    expect(
      sanitizeScenario({ materialFamily: "wood", o2Pct: 140, flowCmS: -1, gravity: "lunar", x: 1 }),
    ).toEqual({ gravity: "lunar" });
  });

  it("returns undefined when nothing is left", () => {
    expect(sanitizeScenario({ o2Pct: "21" })).toBeUndefined();
  });
});

describe("parseInvestigationIds", () => {
  it("trims, upper-cases, de-duplicates and drops junk", () => {
    expect(parseInvestigationIds(" psi-25, PSI-25,,bass,PSI-10 ")).toEqual(["PSI-25", "PSI-10"]);
  });
});

describe("scenarioSummary", () => {
  it("lists the set fields in order", () => {
    expect(
      scenarioSummary({ materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" }),
    ).toBe("PMMA rod, 17% O2, 5 cm/s flow, microgravity");
  });

  it("prefixes the label", () => {
    expect(scenarioSummary({ label: "Moon Base", o2Pct: 30, pressurePsi: 10.2 })).toBe(
      "Moon Base: 30% O2, 10.2 psi",
    );
  });
});

describe("shownAnswer", () => {
  const cite = (verified: boolean) => ({
    docId: "psi-25-objectives",
    url: "https://example.org",
    title: "t",
    quote: "a b c",
    verified,
  });

  it("never shows unverified citations, and drops sentences left without one", () => {
    const res: AskResponse = {
      status: "answered",
      answer: [
        { sentence: "Kept.", citations: [cite(true), cite(false)] },
        { sentence: "Dropped.", citations: [cite(false)] },
      ],
      investigationsMentioned: [],
    };
    expect(shownAnswer(res)).toEqual([{ sentence: "Kept.", citations: [cite(true)] }]);
  });

  it("shows nothing for insufficient_evidence", () => {
    expect(
      shownAnswer({ status: "insufficient_evidence", answer: [], investigationsMentioned: [] }),
    ).toEqual([]);
  });
});
