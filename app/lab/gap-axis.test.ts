import { describe, expect, it } from "vitest";
import { o2OffAxis, o2OffAxisNote, Y_DOMAIN } from "./gap-axis";

describe("gap chart: scenario oxygen outside the fixed axis", () => {
  it("says so in a sentence computed from the axis range", () => {
    expect(Y_DOMAIN).toEqual([10, 36]);
    expect(o2OffAxisNote(100)).toBe(
      "Your scenario's oxygen, 100%, is outside the 10–36% range shown, so no scenario marker is drawn for it.",
    );
    expect(o2OffAxisNote(5)).toContain("oxygen, 5%, is outside the 10–36% range");
  });

  it("is silent when the oxygen is on the axis or unset", () => {
    for (const v of [10, 17, 30, 34, 36, undefined]) {
      expect(o2OffAxis(v)).toBe(false);
      expect(o2OffAxisNote(v)).toBeNull();
    }
  });

  it("uses no banned words", () => {
    expect(o2OffAxisNote(100)).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });
});
