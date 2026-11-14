import { describe, expect, it } from "vitest";
import runsJson from "../../data/runs.json";
import { limitsForScenario, REFUSAL } from "../../lib/limits";
import type { Run } from "../../lib/schema";
import { presets } from "./scenario";

const runs = runsJson as Run[];
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
