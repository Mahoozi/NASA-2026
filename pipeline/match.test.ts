/**
 * matchInvestigations, tested only through its exported signature.
 * Runs are the real BASS-II runs from data/runs.json. The two investigations
 * are test fixtures: only "PSI-25" (the id the runs carry) is real, every
 * other field is a labelled placeholder so no NASA metadata is invented.
 * Expected numbers are worked by hand from the run values noted inline.
 */
import { describe, expect, it } from "vitest";
import runsJson from "../data/runs.json";
import { matchInvestigations } from "../lib/match";
import type { Investigation, Run, Scenario } from "../lib/schema";

const runs = runsJson as Run[];

const fixture = (
  id: string,
  over: Partial<Investigation>,
): Investigation => ({
  id,
  acronym: `TEST ${id}`,
  name: "TEST fixture",
  url: "TEST",
  safetyArea: [],
  fuelPhase: ["solid"],
  facility: "TEST",
  platform: "TEST",
  objectives: "TEST",
  approach: "TEST",
  hasRunData: false,
  ...over,
});

const PSI25 = fixture("PSI-25", { safetyArea: ["fundamental"], hasRunData: true });
const NO_RUNS = fixture("TEST-NORUNS", { safetyArea: ["suppression"] });
const investigations = [NO_RUNS, PSI25];

const match = (scenario: Scenario) => {
  const result = matchInvestigations(scenario, investigations, runs);
  const by = (id: string) => result.find((m) => m.investigation.id === id)!;
  return { result, psi25: by("PSI-25"), noRuns: by("TEST-NORUNS") };
};

describe("demo scenario: PMMA rod, 17% O2, 5 cm/s, microgravity", () => {
  const { result, psi25 } = match({
    materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro",
  });

  it("ranks PSI-25 first with direct coverage and a perfect score", () => {
    // P8: PMMA rod, O2 16.4 (within 1), flow 5–15 (contains 5) → 1, 1, 1; gravity micro → 1
    expect(result[0].investigation.id).toBe("PSI-25");
    expect(psi25.score).toBe(1);
    expect(psi25.coverage).toBe("direct");
    expect(psi25.breakdown).toEqual({ materialFamily: 1, o2Pct: 1, flowCmS: 1, gravity: 1 });
  });

  it("lists runs whose every run-level dimension is at least 0.5", () => {
    // P8 rod 16.4% 5–15 → all 1. B14 film (0.5), O2 15 (|Δ|=2 → 0.75), flow 2–5 → included.
    expect(psi25.matchingRunIds).toContain("PSI-25:P8");
    expect(psi25.matchingRunIds).toContain("PSI-25:B14");
    // T17 is SIBAL (material 0); O12 has no numeric flow (0); M5 O2 22.2 (|Δ|=5.2 → 0).
    expect(psi25.matchingRunIds).not.toContain("PSI-25:T17");
    expect(psi25.matchingRunIds).not.toContain("PSI-25:O12");
    expect(psi25.matchingRunIds).not.toContain("PSI-25:M5");
  });
});

describe("run-level dimensions are scored per run, as a set", () => {
  it("never combines the best O2 of one run with the best flow of another", () => {
    // O2 22.2 is matched exactly by B1 (flow 5 → 0 at 55). Flow 55 is closest to
    // T17 (max 53, 2 outside → 0.6) whose O2 16.9 is 5.3 away → 0.
    // Mixing runs would give 1 + 0.6; one run gives at most (1 + 0) / 2.
    const { psi25 } = match({ o2Pct: 22.2, flowCmS: 55 });
    expect(psi25.score).toBe(0.5);
    expect(psi25.breakdown.o2Pct + psi25.breakdown.flowCmS).toBe(1);
    expect(psi25.coverage).toBe("partial");
    expect(psi25.matchingRunIds).toEqual([]);
  });
});

describe("closeness per dimension", () => {
  it("O2 is linear from 1 at ±1 to 0 at ±5", () => {
    // highest initial O2 in the table is 22.2; 25 − 22.2 = 2.8 → (5 − 2.8) / 4 = 0.55
    expect(match({ o2Pct: 25 }).psi25.score).toBeCloseTo(0.55, 10);
    // 30 is 7.8 above every run → 0
    expect(match({ o2Pct: 30 }).psi25.score).toBe(0);
  });

  it("flow is 1 inside a run's range and linear to 0 at 5 cm/s outside it", () => {
    // T17 range 6–53: 55 is 2 outside → 1 − 2/5 = 0.6
    expect(match({ flowCmS: 55 }).psi25.score).toBeCloseTo(0.6, 10);
    expect(match({ flowCmS: 5 }).psi25.score).toBe(1);
  });

  it("material is 1 for the same family and 0.5 for another PMMA family", () => {
    expect(match({ materialFamily: "Nomex" }).psi25.score).toBe(1); // F1–F3
    expect(match({ materialFamily: "wax" }).psi25.score).toBe(1); // F4
    // no run is a PMMA sphere; any PMMA run counts half
    expect(match({ materialFamily: "PMMA sphere" }).psi25.score).toBe(0.5);
  });

  it("gravity is 1 for microgravity and 0 for anything there is no data for", () => {
    expect(match({ gravity: "micro" }).psi25.breakdown).toEqual({ gravity: 1 });
    for (const g of ["lunar", "martian", "1g"] as const) {
      const { psi25, noRuns } = match({ gravity: g });
      expect(psi25.score).toBe(0);
      expect(noRuns.score).toBe(0);
      expect(psi25.coverage).toBe("none");
    }
  });

  it("safety area is 1 when the investigation lists it", () => {
    const { psi25, noRuns } = match({ safetyArea: "suppression" });
    expect(noRuns.breakdown).toEqual({ safetyArea: 1 });
    expect(psi25.breakdown).toEqual({ safetyArea: 0 });
  });
});

describe("investigations without runs", () => {
  it("can reach at most partial coverage, even with a perfect score", () => {
    const { noRuns } = match({ gravity: "micro", safetyArea: "suppression" });
    expect(noRuns.score).toBe(1);
    expect(noRuns.coverage).toBe("partial");
    expect(noRuns.matchingRunIds).toEqual([]);
  });

  it("score 0 on run-level dimensions (no run evidence)", () => {
    const { noRuns } = match({ materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" });
    expect(noRuns.breakdown).toEqual({ materialFamily: 0, o2Pct: 0, flowCmS: 0, gravity: 1 });
    expect(noRuns.score).toBe(0.25);
    expect(noRuns.coverage).toBe("none");
  });
});

describe("contract", () => {
  it("returns one entry per investigation, sorted by score then id", () => {
    const { result } = match({ safetyArea: "suppression" });
    expect(result.map((m) => m.investigation.id)).toEqual(["TEST-NORUNS", "PSI-25"]);
    const tie = matchInvestigations({ gravity: "lunar" }, investigations, runs);
    expect(tie.map((m) => m.investigation.id)).toEqual(["PSI-25", "TEST-NORUNS"]);
  });

  it("an empty scenario, or pressure alone, scores 0 with an empty breakdown", () => {
    for (const s of [{}, { pressurePsi: 10.2 }] as Scenario[]) {
      for (const m of matchInvestigations(s, investigations, runs)) {
        expect(m).toMatchObject({ score: 0, coverage: "none", breakdown: {}, matchingRunIds: [] });
      }
    }
  });

  it("does not list matching runs when no run-level dimension is specified", () => {
    expect(match({ gravity: "micro" }).psi25.matchingRunIds).toEqual([]);
  });
});
