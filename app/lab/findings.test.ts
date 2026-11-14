// Fixture text below is deliberately fake. It lives only in this file and must
// never be copied into data/.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import type { CorpusDoc, Finding, Scenario } from "../../lib/schema";
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
    expect(verifiedFindings([{ ...fixture[0], quote: "Fixture  quote A" }], corpus)).toEqual([]);
    expect(verifiedFindings([{ ...fixture[0], quote: "" }], corpus)).toEqual([]);
    expect(verifiedFindings([], corpus)).toEqual([]);
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
    const corpus = corpusJson as CorpusDoc[];
    const verified = verifiedFindings(findings, corpus);
    const sourceIds = new Set(corpus.map((doc) => doc.id));
    const rejected = findings.filter((finding) => !verified.includes(finding)).map((finding) => ({
      id: finding.id,
      sourceDocId: finding.sourceDocId,
      sourceExists: sourceIds.has(finding.sourceDocId),
      quotePreview: finding.quote.slice(0, 80),
    }));
    expect(rejected, `Rejected findings (exact substring required):\n${JSON.stringify(rejected, null, 2)}`).toEqual([]);
  });

  it("selects real PMMA findings for the demo", () => {
    const verified = verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]);
    const selected = relevantFindings(demo, verified);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.some(({ finding, overlaps }) =>
      finding.tags.materials?.includes(demo.materialFamily) && overlaps.includes("material"),
    )).toBe(true);
  });

  it("selects the prospective FM2 finding and supported atmosphere evidence for Moon Base", () => {
    const verified = verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]);
    const selected = relevantFindings(moon, verified);
    const fm2 = selected.find(({ finding }) => finding.id === "fm2-lunar-reference")?.finding;
    expect(fm2, "Moon Base must include the prospective FM2 finding").toBeDefined();
    expect(fm2!.claim).toContain("planned");
    expect(fm2!.quote).toContain("will be sent to the Lunar surface");
    expect(selected.some(({ finding, overlaps }) =>
      finding.tags.topic === "atmosphere" && overlaps.includes("oxygen"),
    )).toBe(true);
  });

  it("caps real-data selection at three across presets and tagged scenario dimensions", () => {
    const verified = verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]);
    const scenarios: Scenario[] = [
      {}, demo, ...presets(runsJson as Run[]).map((preset) => preset.scenario),
      ...verified.flatMap((finding) => [
        ...(finding.tags.materials ?? []).map((materialFamily) => ({ materialFamily }) as Scenario),
        ...(finding.tags.o2Range ?? []).map((o2Pct) => ({ o2Pct })),
        ...(finding.tags.flowRange ?? []).map((flowCmS) => ({ flowCmS })),
        ...(finding.tags.gravity ?? []).map((gravity) => ({ gravity })),
      ]),
    ];
    expect(scenarios.some((scenario) => relevantFindings(scenario, verified).length === 3)).toBe(true);
    for (const scenario of scenarios) {
      expect(relevantFindings(scenario, verified).length, JSON.stringify(scenario)).toBeLessThanOrEqual(3);
    }
  });

  for (const [name, scenario] of [["demo", demo], ["Moon Base", moon]] as const) {
    it(`renders the real selected findings for ${name} with source links and verification labels`, () => {
      const verified = verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]);
      const selected = relevantFindings(scenario, verified);
      const rows = parse(render(verified, scenario)).querySelectorAll("li");
      expect(rows).toHaveLength(selected.length);
      expect(rows.length).toBeGreaterThan(0);
      for (const { finding } of selected) {
        const row = rows.find((node) => node.querySelector("a")?.getAttribute("href") === finding.url &&
          node.querySelectorAll("p").some((p) => p.text === finding.claim));
        expect(row, `Missing rendered finding ${finding.id}`).toBeDefined();
        expect(row!.querySelectorAll("p").some((p) => p.text === FINDING_LABEL)).toBe(true);
        expect(row!.querySelector("a")!.text).toContain(finding.sourceTitle);
        // The panel changes nested quote marks for typography; all quoted words must survive.
        const words = (text: string) => text.replace(/[“”‘’"']/g, "");
        expect(words(row!.querySelector("blockquote")!.text)).toBe(words(finding.quote));
      }
    });
  }
});
