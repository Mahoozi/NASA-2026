import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClaimChecks } from "./claim-checks";
import runsJson from "../../data/runs.json";
import { importAll } from "../../pipeline/psi_import_all";
import { CLAIMS, mismatchMessages, runClaims } from "./claims";

/** The half of "PSI values unchanged" the page cannot bundle: runs.json equals a fresh import from data/raw. */
const PSI_VALUES_UNCHANGED = {
  id: "psi-values-unchanged",
  claim: "PSI values unchanged by the discrepancy flags",
  expected: "equal to a fresh import",
  compute: () => (JSON.stringify(importAll().runs) === JSON.stringify(runsJson) ? "equal to a fresh import" : "differs from a fresh import"),
};

describe("public claims", () => {
  const results = runClaims();

  it("registers every claim once", () => {
    expect(CLAIMS.length).toBe(11);
    expect(new Set(CLAIMS.map((c) => c.id)).size).toBe(CLAIMS.length);
  });

  it("every claim matches the shipped data", () => {
    expect(mismatchMessages(results), mismatchMessages(results).join("\n")).toEqual([]);
  });

  it("run values equal a fresh import from data/raw", () => {
    const [r] = runClaims([PSI_VALUES_UNCHANGED]);
    expect(mismatchMessages([r]), mismatchMessages([r]).join("\n")).toEqual([]);
  });

  it("reports a changed expectation as a readable mismatch", () => {
    const changed = runClaims(CLAIMS.map((c) => (c.id === "demo" ? { ...c, expected: c.expected.replace("46", "47") } : c)));
    const [msg] = mismatchMessages(changed);
    expect(mismatchMessages(changed)).toHaveLength(1);
    expect(msg).toContain("expected 47 matching runs");
    expect(msg).toContain("got 46 matching runs");
  });

  it("the page shows matches and mismatches plainly, with the check time", () => {
    const html = renderToStaticMarkup(
      createElement(ClaimChecks, {
        results: [
          { id: "a", claim: "A claim", expected: "1", actual: "1", matches: true },
          { id: "b", claim: "B claim", expected: "2", actual: "3", matches: false },
        ],
        checkedAt: "2026-11-14T23:00:00.000Z",
      }),
    );
    expect(html).toContain("matches");
    expect(html).toContain("does not match");
    expect(html).toContain("1 of 2 do not match");
    expect(html).toContain("14 Nov 2026");
  });

  it("own wording avoids verdict words", () => {
    const own = [...CLAIMS.flatMap((c) => [c.claim, c.expected]), ...results.map((r) => r.actual)].join(" ");
    expect(own).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });
});
