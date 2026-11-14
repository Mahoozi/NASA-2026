// Fixture text below is deliberately fake. It lives only in this file and must
// never be copied into data/.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { CorpusDoc, Finding } from "../../lib/schema";
import { FINDINGS_EMPTY, FindingsPanel } from "./findings-panel";
import { FINDING_LABEL, findingOverlaps, relevantFindings, verifiedFindings } from "./findings";
import { presets } from "./scenario";
import runsJson from "../../data/runs.json";
import findingsJson from "../../data/findings.json";
import corpusJson from "../../data/corpus.json";
import type { Run } from "../../lib/schema";

const base = {
  sourceTitle: "Fixture source",
  url: "https://example.invalid/fixture",
  investigations: [] as string[],
};

const fixture: Finding[] = [
  { ...base, id: "fx-a", claim: "Fixture claim A", quote: "Fixture quote A", sourceDocId: "fx-doc", year: 2020,
    tags: { topic: "flammability-limit", materials: ["PMMA rod"], o2Range: [15, 19], flowRange: [1, 10], gravity: ["micro"] } },
  { ...base, id: "fx-b", claim: "Fixture claim B", quote: "Fixture quote B", sourceDocId: "fx-doc", year: 2022,
    tags: { topic: "flame-spread", materials: ["PMMA rod"] } },
  { ...base, id: "fx-c", claim: "Fixture claim C", quote: "Fixture quote C", sourceDocId: "fx-doc", year: 2021,
    tags: { topic: "partial-gravity" } },
  { ...base, id: "fx-d", claim: "Fixture claim D", quote: "Fixture quote D", sourceDocId: "fx-doc", year: 2023,
    tags: { topic: "atmosphere", o2Range: [30, 36], gravity: ["lunar"] } },
  { ...base, id: "fx-e", claim: "Fixture claim E", quote: "Fixture quote E", sourceDocId: "fx-doc", year: 2024,
    tags: { topic: "test-method", materials: ["Nomex"] } },
];

const demo = { materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" } as const;
const moon = presets(runsJson as Run[]).find((p) => /Moon Base/.test(p.label))!.scenario;
const render = (findings: Finding[], scenario = {}) =>
  renderToStaticMarkup(createElement(FindingsPanel, { findings, scenario }));

describe("published findings", () => {
  it("matches on material, O2 range, flow range and gravity", () => {
    expect(findingOverlaps(demo, fixture[0])).toEqual(["material", "oxygen", "airflow", "gravity"]);
    expect(findingOverlaps({ o2Pct: 20 }, fixture[0])).toEqual([]);
    expect(findingOverlaps({ flowCmS: 10 }, fixture[0])).toEqual(["airflow"]);
  });

  it("matches topic partial-gravity only for lunar or Martian gravity", () => {
    expect(findingOverlaps({ gravity: "lunar" }, fixture[2])).toEqual(["partial gravity"]);
    expect(findingOverlaps({ gravity: "martian" }, fixture[2])).toEqual(["partial gravity"]);
    expect(findingOverlaps({ gravity: "micro" }, fixture[2])).toEqual([]);
  });

  it("returns at most 3, most overlaps first, then newest", () => {
    const r = relevantFindings(demo, fixture);
    expect(r.map((m) => m.finding.id)).toEqual(["fx-a", "fx-b"]);
    const all = relevantFindings({ materialFamily: "PMMA rod", gravity: "lunar", o2Pct: 32 }, fixture);
    expect(all.map((m) => m.finding.id)).toEqual(["fx-d", "fx-b", "fx-c"]);
  });

  it("shows partial-gravity and atmosphere findings on Moon Base", () => {
    expect(relevantFindings(moon, fixture).map((m) => m.finding.id)).toEqual(["fx-d", "fx-c"]);
  });

  it("keeps only findings whose quote is an exact substring of its source doc", () => {
    const corpus: CorpusDoc[] = [
      { id: "fx-doc", source: "ntrs", title: "Fixture", url: base.url, text: "… Fixture quote A, and Fixture quote C …" },
    ];
    expect(verifiedFindings(fixture, corpus).map((f) => f.id)).toEqual(["fx-a", "fx-c"]);
    expect(verifiedFindings([{ ...fixture[0], sourceDocId: "missing" }], corpus)).toEqual([]);
  });

  it("renders claim, quote, source link and label", () => {
    const html = render(fixture, demo);
    expect(html).toContain("Fixture claim A");
    expect(html).toContain("Fixture quote A");
    expect(html).toContain('href="https://example.invalid/fixture"');
    expect(html).toContain(FINDING_LABEL);
    expect(html).not.toContain("Fixture claim E");
  });

  it("renders a one-line empty state when nothing matches", () => {
    expect(render([], demo)).toContain(FINDINGS_EMPTY);
    expect(render(fixture, { materialFamily: "wax" })).toContain(FINDINGS_EMPTY);
  });

  it("uses no banned words in the panel's own text", () => {
    const banned = /\b(safe|unsafe|risk|rating|probability|likely)\b/i;
    for (const t of [FINDING_LABEL, FINDINGS_EMPTY, render(fixture, demo)]) expect(t).not.toMatch(banned);
  });

  it("every entry in data/findings.json has a quote found verbatim in data/corpus.json", () => {
    const findings = findingsJson as Finding[];
    expect(verifiedFindings(findings, corpusJson as CorpusDoc[])).toHaveLength(findings.length);
  });
});
