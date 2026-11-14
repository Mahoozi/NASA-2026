/**
 * Scenario context for /api/ask, tested through its exported functions with
 * the real data/investigations.json and data/runs.json. The demo scenario and
 * its expected PSI-25 direct coverage come from plan/PLAN.md §9.
 */
import { describe, expect, it } from "vitest";
import { scenarioPromptBlock, topScenarioMatches } from "./scenario";

const demo = { materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" } as const;

describe("topScenarioMatches", () => {
  it("puts PSI-25 first for the demo scenario and returns at most 3", () => {
    const top = topScenarioMatches(demo);
    expect(top[0].investigation.id).toBe("PSI-25");
    expect(top[0].coverage).toBe("direct");
    expect(top.length).toBeLessThanOrEqual(3);
  });

  it("returns nothing when no investigation scores above 0 (pressure is never scored)", () => {
    expect(topScenarioMatches({ pressurePsi: 14.7 })).toEqual([]);
  });
});

describe("scenarioPromptBlock", () => {
  it("states coverage as data and never includes a score", () => {
    const top = topScenarioMatches(demo);
    const block = scenarioPromptBlock(demo, top);
    expect(block).toContain("PSI-25");
    expect(block).toContain("direct");
    expect(block).not.toMatch(/score|0\.\d/i);
  });
});
