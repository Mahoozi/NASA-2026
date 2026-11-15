import { describe, expect, it } from "vitest";
import runsJson from "../../data/runs.json";
import { matchInvestigations, RUN_DIMENSIONS } from "../../lib/match";
import type { Investigation, InvestigationMatch, Run } from "../../lib/schema";
import { loadInvestigations } from "./load-investigations";
import { bestRun, closestRunIds, gapsInUnits, whyAbove } from "./match-explain";
import { DEMO_SCENARIO, presets } from "./scenario";

const runs = runsJson as Run[];
const investigations = loadInvestigations(runs).investigations;
const scenarios = [DEMO_SCENARIO, ...presets(runs).map((p) => p.scenario)];

describe("bestRun", () => {
  it("reproduces the matcher's breakdown for every preset and the demo scenario", () => {
    for (const s of scenarios) {
      const dims = RUN_DIMENSIONS.filter((d) => s[d] !== undefined);
      for (const m of matchInvestigations(s, investigations, runs)) {
        const own = runs.filter((r) => r.investigationId === m.investigation.id);
        const best = bestRun(s, own);
        if (!dims.length || !own.length) {
          expect(best).toBeNull();
          continue;
        }
        for (const d of dims) expect(best!.breakdown[d], `${m.investigation.id} ${d}`).toBe(m.breakdown[d]);
      }
    }
  });
});

describe("gapsInUnits", () => {
  it("states the demo's closest BASS-II run in the run's own recorded values", () => {
    const own = runs.filter((r) => r.investigationId === "PSI-25");
    const { run } = bestRun(DEMO_SCENARIO, own)!;
    const gaps = gapsInUnits(DEMO_SCENARIO, run);
    expect(gaps.map((g) => g.label)).toEqual(["Material", "O₂", "Airflow", "Gravity"]);
    expect(gaps[0].source).toBe(run.material.raw);
    expect(gaps[1].text).toContain(`${run.o2InitialPct}%`);
    expect(gaps[2].source).toBe(run.flowCmS.raw);
    expect(gaps[3].text).toBe("microgravity, as flown");
  });

  it("says pressure is not compared rather than inventing a distance", () => {
    const moon = presets(runs).find((p) => p.id === "moon")!.scenario;
    const run = runs.find((r) => r.o2InitialPct !== null)!;
    expect(gapsInUnits(moon, run).find((g) => g.label === "Pressure")!.text).toContain("not recorded");
  });
});

describe("whyAbove", () => {
  const inv = (id: string, acronym: string) => ({ id, acronym }) as Investigation;
  const m = (id: string, score: number, breakdown: Record<string, number>) =>
    ({ investigation: inv(id, id), score, breakdown, coverage: "partial", matchingRunIds: [] }) as InvestigationMatch;

  it("names the dimension with the largest difference", () => {
    expect(whyAbove(m("A", 0.9, { o2Pct: 1, materialFamily: 0.8 }), m("B", 0.5, { o2Pct: 0.2, materialFamily: 0.8 }))).toBe(
      "Ranks above B (0.90 vs 0.50): O₂ closeness 1.00 vs 0.20.",
    );
  });

  it("says when the next investigation has no runs to compare", () => {
    expect(whyAbove(m("A", 0.5, { o2Pct: 1, safetyArea: 0 }), m("B", 0.0, { safetyArea: 0 }))).toContain("none (no imported runs)");
  });

  it("reports ties as ordered by PSI id", () => {
    expect(whyAbove(m("A", 0.5, { o2Pct: 0.5 }), m("B", 0.5, { o2Pct: 0.5 }))).toBe(
      "Tied with B at 0.50; ties are ordered by PSI id.",
    );
  });
});

describe("closestRunIds", () => {
  it("rings one run per ranked investigation with runs, at most three", () => {
    const matches = matchInvestigations(DEMO_SCENARIO, investigations, runs);
    const ids = closestRunIds(DEMO_SCENARIO, matches, runs);
    expect(ids.size).toBeGreaterThan(0);
    expect(ids.size).toBeLessThanOrEqual(3);
    for (const id of ids) expect(runs.some((r) => r.id === id)).toBe(true);
  });
});
