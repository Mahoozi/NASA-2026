import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import corpusJson from "../../../data/corpus.json";
import findingsJson from "../../../data/findings.json";
import investigationsJson from "../../../data/investigations.json";
import runsJson from "../../../data/runs.json";
import { limitsForScenario, REFUSAL } from "../../../lib/limits";
import { matchInvestigations } from "../../../lib/match";
import type { CorpusDoc, Finding, Investigation, Run, Scenario } from "../../../lib/schema";
import { relevantFindings, verifiedFindings } from "../findings";
import { evidenceGaps } from "../gaps";
import { matchingRunIdSet } from "../matching-runs";
import { inTableOrder, outcomeText } from "../run-order";
import { hasScoredDimension, parseScenario, presets, scenarioToQuery } from "../scenario";
import {
  buildScenarioReport,
  labHref,
  matchingPresets,
  NO_SCENARIO_TEXT,
  REPORT_FOOTER,
  REPORT_MAX_RUNS,
  REPORT_TOP_INVESTIGATIONS,
  reportHref,
} from "./report";
import { EmptyReport, ScenarioReportView } from "./scenario-report";

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const findings = verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]);
const ROOT = join(__dirname, "..", "..", "..");

const DEMO: Scenario = { materialFamily: "PMMA rod", o2Pct: 17, flowCmS: 5, gravity: "micro" };
const MOON: Scenario = presets(runs).find((p) => p.id === "moon")!.scenario;
const SUIT: Scenario = presets(runs).find((p) => p.id === "spacesuit")!.scenario;

const report = (scenario: Scenario, over: Partial<Parameters<typeof buildScenarioReport>[0]> = {}) =>
  buildScenarioReport({ scenario, runs, investigations, findings, generatedOn: "2026-11-14", origin: "https://firebreak.example", ...over });
const view = (r: ReturnType<typeof report>) => renderToStaticMarkup(createElement(ScenarioReportView, { report: r }));
const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** Text as read: block boundaries become spaces; inline tags (links, spans) add nothing. */
const plain = (h: string) =>
  decode(
    h
      .replace(/<\/(p|li|h\d|dd|dt|td|th|tr|div|section|ul|ol|header|footer|article|blockquote|figcaption|figure)>/g, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " "),
  ).trim();
const headings = (h: string) => [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => plain(m[1]).trim());
const stripQuoted = (h: string) => h.replace(/<(\w+)[^>]*data-quoted[^>]*>[\s\S]*?<\/\1>/g, " ");

const demo = report(DEMO);
const moon = report(MOON);
const suit = report(SUIT);
const demoHtml = view(demo);
const moonHtml = view(moon);
const suitHtml = view(suit);

describe("report URL", () => {
  it("round-trips the scenario through the Lab's parser, in the Lab's own URL format", () => {
    for (const s of [DEMO, MOON, SUIT, { o2Pct: 21, gravity: "micro" as const, safetyArea: "detection" as const }]) {
      expect(parseScenario(new URL(reportHref(s), "http://x").searchParams)).toEqual(s);
      expect(reportHref(s)).toBe(`/lab/report?${scenarioToQuery(s)}`);
      expect(labHref(s)).toBe(`/lab?${scenarioToQuery(s)}`);
    }
  });

  it("has no stray question mark when no scenario is set", () => {
    expect(reportHref({})).toBe("/lab/report");
    expect(labHref({})).toBe("/lab");
  });

  it("is linked from the Lab's download section with the current scenario", () => {
    const lab = readFileSync(join(ROOT, "app/lab/lab-client.tsx"), "utf8");
    expect(lab).toContain("reportHref(scenario)");
    expect(lab).toContain("Print or save as PDF");
    expect(lab.indexOf("Print or save as PDF")).toBeGreaterThan(lab.indexOf("download-heading"));
    const dl = readFileSync(join(ROOT, "app/lab/download-dataset.tsx"), "utf8");
    expect(dl.indexOf("{extra}")).toBeGreaterThan(dl.indexOf("Download cleaned dataset (JSON)"));
  });

  it("puts the full Lab URL for the scenario in the header", () => {
    expect(demo.labUrl).toBe(`https://firebreak.example/lab?${scenarioToQuery(DEMO)}`);
    expect(demoHtml).toContain(`href="${demo.labUrl.replace(/&/g, "&amp;")}"`);
    expect(plain(demoHtml)).toContain(demo.labUrl);
    expect(report(DEMO, { origin: null }).labUrl).toBe(`/lab?${scenarioToQuery(DEMO)}`);
  });
});

describe("report sections equal what the Lab computes", () => {
  it("has the sections in order, with the title and generation date first", () => {
    expect(headings(demoHtml)).toEqual([
      "Scenario",
      "Where the evidence runs out",
      "Ranked investigations",
      "Matching runs",
      "Recorded flammability limits",
      "Published findings",
      "Caveats that apply",
      "Sources",
    ]);
    expect(plain(demoHtml).indexOf("Firebreak scenario report")).toBeLessThan(plain(demoHtml).indexOf("Generated 2026-11-14 (UTC)"));
    expect(plain(demoHtml)).toContain("Generated 2026-11-14 (UTC)");
  });

  it("demo scenario: PSI-25 direct with 46 matching runs, first ten in the Lab's table order", () => {
    const matches = matchInvestigations(DEMO, investigations, runs);
    const set = matchingRunIdSet(DEMO, matches)!;
    expect(set.size).toBe(46);
    expect(demo.matching.total).toBe(46);
    expect(demo.ranked[0].investigation.id).toBe("PSI-25");
    expect(demo.ranked[0].coverage).toBe("direct");
    expect(demo.ranked.map((m) => m.investigation.id)).toEqual(
      matches.filter((m) => m.score > 0).slice(0, REPORT_TOP_INVESTIGATIONS).map((m) => m.investigation.id),
    );
    expect(demo.ranked.map((m) => m.breakdown)).toEqual(
      matches.filter((m) => m.score > 0).slice(0, REPORT_TOP_INVESTIGATIONS).map((m) => m.breakdown),
    );
    expect(demo.matching.shown.map((r) => r.id)).toEqual(
      inTableOrder(runs.filter((r) => set.has(r.id))).slice(0, REPORT_MAX_RUNS).map((r) => r.id),
    );
    expect(demo.matching.shown).toHaveLength(REPORT_MAX_RUNS);
    const text = plain(demoHtml);
    expect(text).toContain("Showing the first 10 of 46 runs that match every run-level dimension");
    expect(text).toContain("1. BASS-II (PSI-25), direct evidence, closeness");
    expect(text).toContain("46 matching runs");
  });

  it("uses the Lab's own gap, limits and findings output", () => {
    for (const [s, r] of [[DEMO, demo], [MOON, moon], [SUIT, suit]] as const) {
      expect(r.gaps).toEqual(evidenceGaps(s, runs, investigations));
      expect(r.limits).toEqual(limitsForScenario(s, runs));
      expect(r.findings).toEqual(relevantFindings(s, findings));
    }
    for (const sentence of [...demo.gaps.gaps, ...demo.gaps.nearest]) expect(plain(demoHtml)).toContain(sentence);
  });

  it("demo scenario: the nearest recorded limits, and where the scenario sits in the tested range", () => {
    expect(demo.limits.kind).toBe("limits");
    const text = plain(demoHtml);
    if (demo.limits.kind === "limits") {
      for (const line of demo.limits.position) expect(text).toContain(line);
      expect(demo.limits.nearest).toHaveLength(3);
      for (const p of demo.limits.nearest) expect(text).toContain(`PSI-25 test ${p.testId}`);
    }
    expect(demo.findings.length).toBeGreaterThan(0);
    expect(text).toContain("Published finding; quote verified against source");
    for (const { finding } of demo.findings) {
      expect(text).toContain(finding.claim);
      expect(demoHtml).toContain(`href="${finding.url}"`);
    }
  });

  it("Moon Base: the full refusal with both reasons, the partial-gravity caveat and the E-FIELD note", () => {
    expect(moon.limits.kind).toBe("refusal");
    if (moon.limits.kind === "refusal") {
      expect(moon.limits.text).toBe(REFUSAL);
      expect(moon.limits.reasons).toEqual([
        "Oxygen 30% is above every recorded starting oxygen for any material (max 22.2%).",
        "Every recorded limit is from microgravity on the ISS; your scenario is set to lunar gravity.",
      ]);
    }
    const text = plain(moonHtml);
    expect(text).toContain(REFUSAL);
    expect(text).toContain("Oxygen 30% is above every recorded starting oxygen for any material (max 22.2%).");
    expect(text).toContain("your scenario is set to lunar gravity");
    expect(moon.caveats).toEqual({ partialGravity: true, pressure: true });
    expect(text).toContain("Caveat: published tests suggest flammability may peak near lunar gravity.");
    expect(text).toContain("Firebreak has no run table for E-FIELD Flames; see its investigation page.");
    expect(text).toContain("Pressure is context only; none of the imported PSI tables records it.");
    expect(text).toContain("No imported investigation covers this scenario.");
    expect(text).toContain("No run matches every run-level dimension you set.");
    expect(moon.presets.map((p) => p.label)).toEqual(["Moon Base (planned)", "Pressurized rover (planned)"]);
  });

  it("Spacesuit: oxygen refusal with max 22.2%, the higher-oxygen note, and its preset source", () => {
    expect(suit.limits.kind).toBe("refusal");
    if (suit.limits.kind === "refusal")
      expect(suit.limits.reasons).toEqual(["Oxygen 100% is above every recorded starting oxygen for any material (max 22.2%)."]);
    const text = plain(suitHtml);
    expect(suit.gaps.aboveSolidO2).toBe(22.2);
    expect(text).toContain("Higher-oxygen microgravity tests exist: ACME CFI-G flowed up to 85% oxygen");
    expect(text).toContain("Highest starting oxygen in any imported solid-material run: 22.2%");
    expect(text).toContain("Your scenario: 100%, a gap of 77.8 points.");
    expect(text).toContain("Matches the Lab preset: Spacesuit (EVA)");
    expect(text).toContain("spacesuits are filled with 100% oxygen to only 4.3 psi");
    expect(suit.caveats.partialGravity).toBe(false);
    expect(text).not.toContain("E-FIELD");
  });

  it("matches a preset only when every value is the preset's", () => {
    expect(matchingPresets(DEMO, presets(runs))).toEqual([]);
    expect(matchingPresets({ ...MOON, materialFamily: "PMMA rod" }, presets(runs))).toEqual([]);
    expect(matchingPresets(SUIT, presets(runs)).map((p) => p.id)).toEqual(["spacesuit"]);
    expect(plain(demoHtml)).not.toContain("Matches the Lab preset");
  });
});

describe("report: runs table", () => {
  it("shows test id, material, oxygen, airflow, outcome and every flag, source-discrepancy flags included", () => {
    const saffire = runs.filter((r) => r.investigationId === "PSI-99" || r.investigationId === "PSI-100");
    const r = report({ o2Pct: 22, gravity: "micro" }, { runs: saffire });
    expect(r.matching.shown.length).toBeGreaterThan(0);
    const html = view(r);
    for (const run of r.matching.shown) {
      const row = [...html.matchAll(/<tr class="border-b align-top">([\s\S]*?)<\/tr>/g)].map((m) => m[1]).find((x) => plain(x).includes(`${run.investigationId} ${run.testId}`))!;
      expect(row, run.id).toBeTruthy();
      const text = plain(row);
      expect(text).toContain(run.material.raw);
      expect(text).toContain(run.o2InitialPct === null ? "not recorded" : `${run.o2InitialPct}%`);
      expect(text).toContain(outcomeText(run));
      for (const flag of run.flags) expect(text).toContain(flag);
    }
    // PSI-99 sample 2-6 carries a source-discrepancy flag; it is printed.
    const flagged = r.matching.shown.flatMap((x) => x.flags).filter((f) => /NTRS \d{11}/.test(f));
    expect(flagged.length).toBeGreaterThan(0);
    for (const f of flagged) expect(plain(html)).toContain(f);
    // No event keyword: "outcome not recorded", never a result.
    expect(plain(html)).toContain(outcomeText(r.matching.shown.find((x) => x.events.length === 0)!));
    expect(plain(demoHtml)).toContain("outcome not recorded");
  });

  it("explains when no run-level dimension is set", () => {
    const r = report({ safetyArea: "detection" });
    expect(r.matching).toEqual({ total: null, shown: [] });
    expect(plain(view(r))).toContain("No run-level dimension is set");
  });
});

describe("report: sources and footer", () => {
  it("lists every external URL once, and every URL cited above is in the list", () => {
    for (const [r, html] of [[demo, demoHtml], [moon, moonHtml], [suit, suitHtml]] as const) {
      const urls = r.sources.map((s) => s.url);
      expect(new Set(urls).size).toBe(urls.length);
      const body = html.slice(0, html.indexOf('id="sources-heading"'));
      const cited = [...body.matchAll(/href="(https?:[^"]+)"/g)].map((m) => decode(m[1]));
      const labUrl = r.labUrl;
      for (const url of cited) if (url !== labUrl) expect(urls, url).toContain(url);
    }
    const demoUrls = demo.sources.map((s) => s.url);
    for (const m of demo.ranked) expect(demoUrls).toContain(m.investigation.url);
    for (const { finding } of demo.findings) expect(demoUrls).toContain(finding.url);
    expect(moon.sources.map((s) => s.url)).toContain("https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/");
    expect(suit.sources.map((s) => s.url)).toEqual(["https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/"]);
  });

  it("ends with the exact footer", () => {
    expect(REPORT_FOOTER).toBe(
      "Generated by Firebreak from NASA PSI data. Not affiliated with or endorsed by NASA. Firebreak ranks evidence; it does not rate fire risk or predict behaviour beyond tested conditions.",
    );
    for (const html of [demoHtml, moonHtml, suitHtml]) {
      expect(html).toMatch(/<footer[^>]*><p>Generated by Firebreak[^<]*<\/p><\/footer><\/article>$/);
      expect(plain(html).endsWith(REPORT_FOOTER)).toBe(true);
    }
  });
});

describe("report: no scenario", () => {
  it("shows a short message with a link back to /lab", () => {
    for (const s of [{}, { pressurePsi: 10.2 }]) expect(hasScoredDimension(s)).toBe(false);
    const html = renderToStaticMarkup(createElement(EmptyReport, { message: NO_SCENARIO_TEXT }));
    expect(plain(html)).toContain(NO_SCENARIO_TEXT);
    expect(html).toMatch(/href="\/lab"/);
    expect(NO_SCENARIO_TEXT).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });
});

describe("report: wording and print design", () => {
  it("uses no banned words in Firebreak's own text (stored text and quotes exempt)", () => {
    for (const html of [demoHtml, moonHtml, suitHtml]) {
      const own = plain(stripQuoted(html));
      expect(own.length).toBeGreaterThan(800);
      // The footer is the one place the word "risk" appears: it says Firebreak does not rate it.
      const withoutFooter = own.replace(REPORT_FOOTER, "");
      expect(withoutFooter).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
    }
  });

  it("has a print stylesheet: no chrome, black on white, rows kept together, URLs after links", () => {
    const css = readFileSync(join(ROOT, "app/lab/report/report.css"), "utf8");
    expect(css).toContain("@media print");
    expect(css).toMatch(/body:has\(\.report\) > header\s*{\s*display: none/);
    expect(css).toMatch(/--background: #fff;[\s\S]*--foreground: #000;/);
    expect(css).toMatch(/tr[^{]*\{\s*break-inside: avoid/);
    expect(css).toContain('content: " (" attr(href) ")"');
    expect(css).toContain(".no-url");
    expect(css).toMatch(/font-size: 1[01](\.5)?pt/);
  });

  it("lets the runs table scroll inside its own box on screen and be unclipped in print", () => {
    expect(demoHtml).toContain("report-table-scroll relative max-w-full overflow-x-auto");
    expect(readFileSync(join(ROOT, "app/lab/report/report.css"), "utf8")).toContain(".report .report-table-scroll { overflow: visible; }");
  });

  it("keeps screen text at 14 px or larger and is neutral", () => {
    for (const html of [demoHtml, moonHtml, suitHtml]) expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/);
    const files = ["scenario-report.tsx", "print-button.tsx", "report.css"].map((f) => readFileSync(join(ROOT, "app/lab/report", f), "utf8")).join("\n");
    expect(files).not.toMatch(/text-xs/);
  });

  it("marks the print button and navigation as screen-only", () => {
    expect(demoHtml).toContain("report-screen-only");
    expect(readFileSync(join(ROOT, "app/lab/report/report.css"), "utf8")).toContain(".report .report-screen-only { display: none !important; }");
  });
});
