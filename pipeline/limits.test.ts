import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import runsJson from "../data/runs.json";
import {
  describePoint,
  LIMITS_PANEL_TEXT,
  limitPoints,
  limitsForScenario,
  REFUSAL,
} from "../lib/limits";
import type { MaterialFamily, Run, Scenario } from "../lib/schema";
import { limitCounts, REPORT_PATH } from "./limits_report";

const runs = runsJson as Run[];
const { points, excluded } = limitPoints(runs);
const point = (testId: string) => points.find((p) => p.testId === testId);

describe("recorded flammability limits (PSI-25)", () => {
  it("B14 is an extinction at 15% O2 and 2 cm/s", () => {
    expect(point("B14")).toMatchObject({ event: "extinction", o2Pct: 15, flowCmS: 2, relation: "at" });
  });

  it("B18 is a blowoff at 17.4% O2 and 10 cm/s", () => {
    expect(point("B18")).toMatchObject({ event: "blowoff", o2Pct: 17.4, flowCmS: 10, relation: "at" });
  });

  it("has 18 extinction, 7 blowoff and 2 no-ignition candidates, each included or excluded once", () => {
    const counts = limitCounts(runs);
    expect(counts.extinction.candidates).toBe(18);
    expect(counts.blowoff.candidates).toBe(7);
    expect(counts["no-ignition"].candidates).toBe(2);
    for (const c of Object.values(counts)) expect(c.included + c.excluded).toBe(c.candidates);
    for (const x of excluded) expect(x.reason.length).toBeGreaterThan(0);
  });

  it("matches the counts written in pipeline/limits_report.md", () => {
    const md = readFileSync(REPORT_PATH, "utf8");
    const written = JSON.parse(md.match(/<!-- counts: (.*) -->/)![1]);
    expect(written).toEqual(limitCounts(runs));
    expect(md).toContain("Raw checks: all passed");
  });

  it("keeps test id and flags on every point and never treats a run without an event as a limit", () => {
    for (const p of points) {
      expect(p.testId).toBeTruthy();
      const run = runs.find((r) => r.id === p.runId)!;
      expect(p.flags).toEqual(run.flags);
      expect(run.events).toContain(p.event);
    }
  });

  it("refuses for the Moon Base and Pressurized rover presets", () => {
    const moon: Scenario = { o2Pct: 30, pressurePsi: 10.2, gravity: "lunar" };
    const view = limitsForScenario(moon, runs);
    expect(view.kind).toBe("refusal");
    if (view.kind === "refusal") {
      expect(view.text).toBe(REFUSAL);
      expect(view.reasons).toEqual([
        "Oxygen 30% is above every recorded starting oxygen for any material (max 22.2%).",
        "Every recorded limit is from microgravity on the ISS; your scenario is set to lunar gravity.",
      ]);
    }
    // With a material set, the oxygen reason names it and its own maximum.
    const rod = limitsForScenario({ ...moon, materialFamily: "PMMA rod" }, runs);
    expect(rod.kind === "refusal" && rod.reasons).toEqual([
      "Oxygen 30% is above every recorded starting oxygen for PMMA rod (max 22.2%).",
      "Every recorded limit is from microgravity on the ISS; your scenario is set to lunar gravity.",
    ]);
    expect(REFUSAL).toBe(
      "No recorded limit near this scenario. Firebreak does not extrapolate beyond tested conditions.",
    );
  });

  it("refuses when oxygen is outside the material's recorded range or the material has no points", () => {
    expect(limitsForScenario({ materialFamily: "PMMA rod", o2Pct: 30, gravity: "micro" }, runs).kind).toBe("refusal");
    expect(limitsForScenario({ materialFamily: "SIBAL fabric", o2Pct: 18 }, runs).kind).toBe("refusal");
  });

  it("shows nearest limits inside the envelope for the demo scenario", () => {
    const view = limitsForScenario({ materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" }, runs);
    expect(view.kind).toBe("limits");
    if (view.kind === "limits") {
      expect(view.nearest.length).toBe(3);
      expect(view.nearest.every((p) => p.family === "PMMA rod")).toBe(true);
      expect(view.position[0]).toMatch(/^Oxygen 17%: inside/);
    }
  });

  it("uses no banned words anywhere in the panel text", () => {
    const families: (MaterialFamily | undefined)[] = [
      undefined, ...new Set(runs.map((r) => r.material.family)),
    ];
    const texts: string[] = [
      ...JSON.stringify(LIMITS_PANEL_TEXT).split('"'),
      ...points.map(describePoint),
      ...excluded.map((x) => x.reason),
    ];
    for (const materialFamily of families)
      for (const o2Pct of [undefined, 10, 15, 17, 21, 30])
        for (const flowCmS of [undefined, 0, 5, 40])
          for (const gravity of [undefined, "micro", "lunar", "martian", "1g"] as const) {
            const v = limitsForScenario({ materialFamily, o2Pct, flowCmS, gravity }, runs);
            if (v.kind === "refusal") texts.push(v.text, ...v.reasons);
            else if (v.kind === "needs-material") texts.push(v.text);
            else texts.push(...v.position, ...v.nearest.map(describePoint));
          }
    const banned = /\b(safe|unsafe|risk|rating|probability|likely)\b/i;
    for (const t of texts) expect(t).not.toMatch(banned);
  });
});
