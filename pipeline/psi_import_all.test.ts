/** The combined import, and the committed data/runs.json matching it. */
import { describe, expect, it } from "vitest";
import runsJson from "../data/runs.json";
import { combinedAcceptance, importAll } from "./psi_import_all";

const { runs, groups } = importAll();

describe("combined import", () => {
  it("passes the combined checks: 263 runs, 140 with starting O2, max 22.2", () => {
    expect(() => combinedAcceptance(runs)).not.toThrow();
  });

  it("counts per investigation", () => {
    expect(Object.fromEntries(groups.map((g) => [g.psiId, g.runs.length]))).toEqual({
      "PSI-25": 129, "PSI-26": 121, "PSI-98": 2, "PSI-99": 9, "PSI-100": 2,
    });
  });

  it("data/runs.json is exactly what the importers produce (rerun `npm run import:psi` if not)", () => {
    expect(runsJson).toEqual(JSON.parse(JSON.stringify(runs)));
  });
});
