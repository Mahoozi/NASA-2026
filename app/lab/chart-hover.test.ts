import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import type { Investigation, Run } from "../../lib/schema";
import { O2_BANDS, coverageRows } from "./coverage-rows";
import { CellTipBody, placeTip, RunTipBody } from "./floating-tip";
import { materialLabel } from "./material-label";
import { cellTip, cellTipText, flagCountText, MAX_TEST_IDS, NO_RUN_IN_CELL, runTip } from "./run-details";
import { flowText, outcomeText, runRowId } from "./run-order";

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const get = (id: string) => runs.find((r) => r.id === id)!;
const value = (r: Run, label: string) => runTip(r, investigations).lines.find((l) => l.label === label)!.value;

describe("gap-chart point details", () => {
  // A PSI-25 run, a Saffire run flagged against NASA's paper, and a Saffire run with no events.
  for (const id of ["PSI-25:P8", "PSI-98:S1", "PSI-99:2-6"]) {
    it(`${id}: every line equals runs.json through the table's formatters`, () => {
      const r = get(id);
      const acronym = investigations.find((i) => i.id === r.investigationId)?.acronym || r.investigationId;
      expect(runTip(r, investigations).title).toBe(`Test ${r.testId}`);
      expect(value(r, "Investigation")).toBe(acronym);
      expect(value(r, "Material")).toBe(materialLabel(r));
      expect(value(r, "Starting O₂")).toBe(`${r.o2InitialPct}%`);
      expect(value(r, "Airflow")).toBe(`${flowText(r)} cm/s`);
      expect(value(r, "Outcome")).toBe(outcomeText(r));
      expect(value(r, "Flags")).toBe(flagCountText(r.flags.length));
    });
  }

  it("matches the raw run values", () => {
    const p8 = get("PSI-25:P8");
    expect(value(p8, "Starting O₂")).toBe("16.4%");
    expect(value(p8, "Airflow")).toBe("5–15 cm/s");
    const s1 = get("PSI-98:S1");
    expect(value(s1, "Starting O₂")).toBe("21.5%");
    expect(value(s1, "Airflow")).toBe("20 cm/s");
  });

  it("counts flags in words and names the source-discrepancy flag's run", () => {
    const s1 = get("PSI-98:S1");
    expect(s1.flags.some((f) => /NTRS \d{11}/.test(f))).toBe(true);
    expect(value(s1, "Flags")).toBe("4 flags");
    expect(flagCountText(0)).toBe("no flags");
    expect(flagCountText(1)).toBe("1 flag");
    expect(flagCountText(2)).toBe("2 flags");
  });

  it("says 'outcome not recorded' for a run with no event and no recorded result", () => {
    const bare = runs.find((r) => r.events.length === 0 && outcomeText(r) === "outcome not recorded")!;
    expect(value(bare, "Outcome")).toBe("outcome not recorded");
    expect(outcomeText(get("PSI-98:S1"))).not.toBe("");
  });

  it("renders the values in the tooltip markup", () => {
    const r = get("PSI-99:2-6");
    const html = renderToStaticMarkup(createElement(RunTipBody, { run: r, investigations }));
    for (const l of runTip(r, investigations).lines) expect(html).toContain(l.value);
    expect(html).toContain("Test 2-6");
  });

  it("gives every run a unique table row id", () => {
    expect(new Set(runs.map((r) => runRowId(r.id))).size).toBe(runs.length);
  });
});

describe("coverage-grid cell details", () => {
  const { rows, outside } = coverageRows(runs);
  const cells = rows.flatMap((row) => [
    ...row.bandRuns.map((rs, i) => ({ label: `${row.label} ${O2_BANDS[i].label}`, count: row.bands[i], runs: rs, band: O2_BANDS[i] })),
    { label: `${row.label} none`, count: row.notRecorded, runs: row.notRecordedRuns, band: null },
  ]);

  it("every cell's run list has exactly the grid's count and the right oxygen", () => {
    for (const c of cells) {
      expect(c.runs.length, c.label).toBe(c.count);
      for (const r of c.runs) {
        if (c.band) expect(r.o2InitialPct! >= c.band.lo && r.o2InitialPct! < c.band.hi, `${c.label} ${r.id}`).toBe(true);
        else expect(r.o2InitialPct, `${c.label} ${r.id}`).toBeNull();
      }
    }
  });

  it("the cell lists together hold every run once (no new binning)", () => {
    const ids = [...cells.flatMap((c) => c.runs), ...outside].map((r) => r.id);
    expect(ids.length).toBe(runs.length);
    expect(new Set(ids).size).toBe(runs.length);
  });

  it("shows count, investigations and test ids from the cell's own list", () => {
    const c = cells.find((x) => x.count > 0 && x.count <= MAX_TEST_IDS)!;
    const t = cellTip(c.runs, investigations);
    if (t.empty) throw new Error("expected a non-empty cell");
    expect(t.count).toBe(c.count === 1 ? "1 run" : `${c.count} runs`);
    expect(t.testIds).toBe(c.runs.map((r) => r.testId).join(", "));
    for (const id of new Set(c.runs.map((r) => r.investigationId)))
      expect(t.investigations).toContain(investigations.find((i) => i.id === id)?.acronym || id);
  });

  it("lists at most 5 test ids, then '+N more'", () => {
    const c = cells.find((x) => x.count > MAX_TEST_IDS)!;
    const t = cellTip(c.runs, investigations);
    if (t.empty) throw new Error("expected a non-empty cell");
    expect(t.testIds).toBe(`${c.runs.slice(0, 5).map((r) => r.testId).join(", ")} +${c.count - 5} more`);
  });

  it("an empty cell says exactly: No recorded run in this cell.", () => {
    expect(NO_RUN_IN_CELL).toBe("No recorded run in this cell.");
    const empty = cells.find((c) => c.count === 0)!;
    expect(empty).toBeDefined();
    expect(cellTipText(cellTip(empty.runs, investigations))).toBe("No recorded run in this cell.");
    const html = renderToStaticMarkup(createElement(CellTipBody, { label: "x", runs: [], investigations }));
    expect(html).toContain("No recorded run in this cell.");
  });

  it("uses no verdict words", () => {
    const text = cells.map((c) => cellTipText(cellTip(c.runs, investigations))).join(" ");
    const own = [text, ...runs.slice(0, 40).map((r) => JSON.stringify(runTip(r, investigations).lines.map((l) => l.label)))].join(" ");
    expect(own).not.toMatch(/\b(safe|unsafe|risk|risky|rating|probability|likely)\b/i);
  });
});

describe("tooltip placement", () => {
  const view = { w: 360, h: 640 };
  const size = { w: 320, h: 140 };
  it("stays inside a 360 px viewport wherever the anchor is", () => {
    for (const left of [0, 10, 180, 340, 359])
      for (const top of [0, 60, 300, 620]) {
        const p = placeTip({ left, right: left + 24, top, bottom: top + 24 }, size, view);
        expect(p.left).toBeGreaterThanOrEqual(8);
        expect(p.left + size.w).toBeLessThanOrEqual(view.w - 8);
        expect(p.top).toBeGreaterThanOrEqual(8);
        expect(p.top + size.h).toBeLessThanOrEqual(view.h - 8);
      }
  });
  it("sits above the anchor when there is room, below otherwise", () => {
    expect(placeTip({ left: 100, right: 124, top: 400, bottom: 424 }, size, view).top).toBeLessThan(400);
    expect(placeTip({ left: 100, right: 124, top: 20, bottom: 44 }, size, view).top).toBeGreaterThan(44);
  });
});
