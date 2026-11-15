import { describe, expect, it } from "vitest";
import runsJson from "../../data/runs.json";
import investigationsJson from "../../data/investigations.json";
import { limitsForScenario, REFUSAL } from "../../lib/limits";
import { matchInvestigations } from "../../lib/match";
import type { Investigation, Run } from "../../lib/schema";
import { BRIEF_TEXT, BRIEF_URL, SPACESUIT_QUOTE } from "../brief/brief-text";
import { evidenceGaps } from "./gaps";
import { parseScenario, presets, scenarioToQuery } from "./scenario";

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const preset = (id: string) => presets(runs).find((p) => p.id === id)!;

describe("NASA Exploration Atmosphere preset", () => {
  it("is 34% O2 at 8.2 psi with gravity left unset", () => {
    expect(preset("exploration").scenario).toEqual({ o2Pct: 34, pressurePsi: 8.2 });
    expect(preset("exploration").sourceUrl).toMatch(/ntrs\.nasa\.gov\/api\/citations\/20220011152\//);
  });

  it("gets the limits refusal, with the oxygen reason only", () => {
    const view = limitsForScenario(preset("exploration").scenario, runs);
    expect(view.kind).toBe("refusal");
    if (view.kind === "refusal") {
      expect(view.text).toBe(REFUSAL);
      expect(view.reasons).toEqual([
        "Oxygen 34% is above every recorded starting oxygen for any material (max 22.2%).",
      ]);
    }
  });
});

describe("Spacesuit (EVA) preset", () => {
  const suit = preset("spacesuit");

  it("is 100% O2 at 4.3 psi with gravity unset, sourced to the brief sentence", () => {
    expect(suit.label).toBe("Spacesuit (EVA)");
    expect(suit.scenario).toEqual({ o2Pct: 100, pressurePsi: 4.3 });
    expect(BRIEF_TEXT).toContain(SPACESUIT_QUOTE);
    expect(suit.source).toContain(`“${SPACESUIT_QUOTE}”`);
    expect(suit.sourceUrl).toBe(BRIEF_URL);
  });

  it("is the fifth preset and leaves the other four unchanged", () => {
    const list = presets(runs);
    expect(list.map((p) => p.id)).toEqual(["iss", "moon", "rover", "exploration", "spacesuit"]);
    expect(list[0].scenario).toEqual({ o2Pct: 21, gravity: "micro" });
    expect(list[1].scenario).toEqual({ o2Pct: 30, pressurePsi: 10.2, gravity: "lunar" });
    expect(list[2].scenario).toEqual({ o2Pct: 30, pressurePsi: 10.2, gravity: "lunar" });
    expect(list[3].scenario).toEqual({ o2Pct: 34, pressurePsi: 8.2 });
  });

  it("round-trips through the URL", () => {
    expect(parseScenario(new URLSearchParams(scenarioToQuery(suit.scenario)))).toEqual(suit.scenario);
  });

  it("gets the limits refusal, with the oxygen reason only (max 22.2%)", () => {
    const view = limitsForScenario(suit.scenario, runs);
    expect(view.kind).toBe("refusal");
    if (view.kind === "refusal") {
      expect(view.text).toBe(REFUSAL);
      expect(view.reasons).toEqual([
        "Oxygen 100% is above every recorded starting oxygen for any material (max 22.2%).",
      ]);
    }
  });

  it("states the oxygen gap from the runs, not from typed numbers", () => {
    const max = Math.max(...runs.filter((r) => r.o2InitialPct !== null).map((r) => r.o2InitialPct!));
    const gap = Math.round((100 - max) * 10) / 10;
    const report = evidenceGaps(suit.scenario, runs, investigations);
    expect(report.nearest.join(" ")).toContain(
      `Highest starting oxygen in any imported solid-material run: ${max}%`,
    );
    expect(report.nearest.join(" ")).toContain(`Your scenario: 100%, a gap of ${gap} points.`);
    expect(report.gaps.join(" ")).toContain(`your scenario is 100%`);
    const summary = matchInvestigations(suit.scenario, investigations, runs);
    expect(summary.every((m) => m.coverage !== "direct")).toBe(true);
  });
});
