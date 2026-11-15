import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import corpusJson from "../../data/corpus.json";
import runsJson from "../../data/runs.json";
import watchlistJson from "../../data/hardware_watchlist.json";
import { Nav } from "../../components/nav";
import type { CorpusDoc, Investigation, Run } from "../../lib/schema";
import { quoteIsVerbatim } from "../lab/findings";
import { evidenceGaps } from "../lab/gaps";
import { parseScenario, presets } from "../lab/scenario";
import investigationsJson from "../../data/investigations.json";
import { limitsForScenario } from "../../lib/limits";
import { evidenceFamily, materialEvidence } from "./evidence";
import type { HardwareEntry, WatchlistEntry } from "./types";
import {
  atmospheresFrom,
  evidenceText,
  familyWatchCounts,
  NO_RUN_TEXT,
  NOT_MATCHED_TEXT,
  WATCHLIST_FOOTNOTE,
  WATCHLIST_INTRO,
  WATCHLIST_TITLE,
  watchlistLineText,
  watchlistRows,
  watchlistSentence,
} from "./watchlist";
import { WatchlistLine } from "./watchlist-line";
import { WatchlistView } from "./watchlist-view";

const corpus = corpusJson as CorpusDoc[];
const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const entries = watchlistJson as WatchlistEntry[];
const hardware = entries.filter((e): e is HardwareEntry => e.kind === "hardware");
const rows = watchlistRows(entries, runs, corpus);
const html = renderToStaticMarkup(createElement(WatchlistView, { entries, runs, corpus }));
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const plain = (h: string) =>
  decode(h.replace(/<\/(p|li|h\d|td|th|tr|div|blockquote|figcaption|figure|span)>/g, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ")).trim();
const rowHtml = (id: string) => html.match(new RegExp(`<tr[^>]*data-entry="${id}"[^>]*>([\\s\\S]*?)</tr>`))![1];
const ROOT = join(__dirname, "..", "..");

describe("/watchlist page", () => {
  it("has the exact title, intro and footnote", () => {
    expect(WATCHLIST_TITLE).toBe("ISS hardware NASA flagged for higher-oxygen cabins");
    expect(WATCHLIST_INTRO).toBe(
      "In 2026, NASA's Engineering and Safety Center assessed ISS life-support hardware for Exploration cabin atmospheres with lower pressure and more oxygen. For each item where the report names a material, Firebreak shows NASA's own sentence and what microgravity flight evidence PSI holds for that material.",
    );
    expect(WATCHLIST_FOOTNOTE).toBe(
      "Material match is by name only: the form tested in PSI (sheet, rod, fabric) can differ from the hardware's form, such as honeycomb or foam. The report is an engineering assessment of hardware; PSI runs are flight tests of material samples. Firebreak lists both side by side and draws no conclusion about any item.",
    );
    const text = plain(html);
    for (const s of [WATCHLIST_TITLE, WATCHLIST_INTRO, WATCHLIST_FOOTNOTE]) expect(text).toContain(s);
  });

  it("shows the two context sentences as NASA quotes with a link to the NTRS record", () => {
    const limited = entries.find((e) => e.id === "context-limited-flammability-data")!;
    const subsystems = entries.find((e) => e.id === "context-33-subsystems")!;
    const text = plain(html);
    for (const e of [limited, subsystems]) {
      expect(text).toContain(`“${e.quote}”`);
      expect(text).toContain(`NASA NESC report, p. ${e.page}`);
    }
    expect(html).toContain('href="https://ntrs.nasa.gov/citations/20260003925"');
    expect(text).not.toContain("Specifically, nominal cabin atmospheres"); // the atmospheres entry feeds the sentence only
    expect(text.indexOf("33 subsystems")).toBeLessThan(text.indexOf("limited material flammability data"));
  });

  it("has one row per hardware entry, in report page order, with every quote verbatim and its page", () => {
    expect(rows).toHaveLength(hardware.length);
    const pages = rows.map((r) => r.entry.page);
    expect(pages).toEqual([...pages].sort((a, b) => a - b));
    for (const r of rows) {
      const h = rowHtml(r.entry.id);
      const text = plain(h);
      const quoted = [...h.matchAll(/<blockquote[^>]*data-quoted[^>]*>([\s\S]*?)<\/blockquote>/g)].map((m) => decode(m[1].replace(/<[^>]*>/g, "")));
      expect(quoted, r.entry.id).toEqual([`“${r.entry.quote}”`]);
      expect(quoteIsVerbatim(quoted[0].slice(1, -1), r.entry.sourceDocId, corpus), r.entry.id).toBe(true);
      expect(text, r.entry.id).toContain(`NASA NESC report, p. ${r.entry.page}`);
      expect(h, r.entry.id).toContain(`href="${corpus.find((d) => d.id === r.entry.sourceDocId)!.url}"`);
      expect(text, r.entry.id).toContain(r.entry.hardware);
      expect(text, r.entry.id).toContain(r.entry.subsystem);
      expect(text, r.entry.id).toContain(r.entry.materialAsWritten);
    }
    expect(rows.find((r) => r.entry.id === "minion-pmma-case")!.entry.page).toBe(66);
  });

  it("states each row's PSI flight evidence exactly as evidence.ts computes it", () => {
    for (const r of rows) {
      const ev = materialEvidence(r.entry.materialKey, runs);
      expect(r.evidence, r.entry.id).toEqual(ev);
      expect(r.evidenceText, r.entry.id).toBe(evidenceText(ev));
      expect(plain(rowHtml(r.entry.id)), r.entry.id).toContain(evidenceText(ev));
      // Exactly one of the three forms.
      const forms = [
        /^\d+ flight runs? with this material name; (highest recorded starting O2: [\d.]+%|no starting O2 recorded)$/.test(r.evidenceText),
        r.evidenceText === NO_RUN_TEXT,
        r.evidenceText === NOT_MATCHED_TEXT,
      ];
      expect(forms.filter(Boolean), r.entry.id).toHaveLength(1);
    }
    const by = (id: string) => rows.find((r) => r.entry.id === id)!.evidenceText;
    expect(by("minion-pmma-case")).toBe("177 flight runs with this material name; highest recorded starting O2: 22.2%");
    expect(by("cwqmk-durette-fabric")).toBe("Not matched: PSI run tables use different material names");
    expect(by("cdra-armaflex")).toBe(NOT_MATCHED_TEXT);
    expect(by("wpa-teflon-cables")).toBe("No PSI flight run with this material name");
    expect(by("crew-quarters-nomex-honeycomb")).toBe("10 flight runs with this material name; highest recorded starting O2: 22.2%");
  });

  it("offers 'Open in the Lab' only where runs match, with the Exploration preset and the family holding the most runs that record an oxygen", () => {
    const exploration = presets(runs).find((p) => p.id === "exploration")!.scenario;
    for (const r of rows) {
      const h = rowHtml(r.entry.id);
      if (r.evidence.runs === 0) {
        expect(r.labHref, r.entry.id).toBeNull();
        expect(h, r.entry.id).not.toContain("Open in the Lab");
        continue;
      }
      // Independent count, per Lab family, of matching runs and of those recording a starting O2.
      const words = r.entry.materialKey === "pmma" ? /\b(pmma|acrylic)\b/i : new RegExp(`\\b${r.entry.materialKey}\\b`, "i");
      const byFamily = new Map<string, { all: number; withO2: number }>();
      for (const run of runs) {
        if (!words.test(`${run.material.family} ${run.material.raw}`)) continue;
        const c = byFamily.get(run.material.family) ?? { all: 0, withO2: 0 };
        c.all += 1;
        if (run.o2InitialPct !== null) c.withO2 += 1;
        byFamily.set(run.material.family, c);
      }
      const anyO2 = [...byFamily.values()].some((c) => c.withO2 > 0);
      const family = evidenceFamily(r.entry.materialKey, runs)!;
      const chosen = byFamily.get(family)!;
      if (anyO2) {
        // Most runs that record an oxygen; ties go to more runs overall.
        const topO2 = Math.max(...[...byFamily.values()].map((c) => c.withO2));
        expect(chosen.withO2, r.entry.id).toBe(topO2);
        expect(chosen.all, r.entry.id).toBe(Math.max(...[...byFamily.values()].filter((c) => c.withO2 === topO2).map((c) => c.all)));
      } else {
        // Fallback: no matching run records an oxygen, so the family with the most matching runs.
        expect(chosen.all, r.entry.id).toBe(Math.max(...[...byFamily.values()].map((c) => c.all)));
      }
      const scenario = parseScenario(new URL(r.labHref!, "http://x").searchParams);
      expect(scenario, r.entry.id).toEqual({ ...exploration, materialFamily: family });
      expect(scenario.o2Pct).toBe(34);
      expect(scenario.pressurePsi).toBe(8.2);
      expect(h, r.entry.id).toContain(`href="${r.labHref!.replace(/&/g, "&amp;")}"`);
      expect(h, r.entry.id).toContain("Open in the Lab");
    }
  });

  it("MinION links to the PMMA family with recorded oxygen, and its Lab scenario round-trips", () => {
    const minion = rows.find((r) => r.entry.id === "minion-pmma-case")!;
    expect(minion.labScenario!.materialFamily).toBe("PMMA rod");
    // That family's matching runs record a starting oxygen (PMMA sphere's 63 runs do not).
    const inFamily = runs.filter((r) => r.material.family === "PMMA rod");
    expect(inFamily.some((r) => r.o2InitialPct !== null)).toBe(true);
    expect(runs.filter((r) => r.material.family === "PMMA sphere").every((r) => r.o2InitialPct === null)).toBe(true);
    expect(parseScenario(new URL(minion.labHref!, "http://x").searchParams)).toEqual({
      materialFamily: "PMMA rod", o2Pct: 34, pressurePsi: 8.2,
    });
    // The Lab's own gap and limits output for that link: the 22.2% gap and the oxygen refusal.
    const scenario = minion.labScenario!;
    const gaps = evidenceGaps(scenario, runs, investigations);
    expect(gaps.nearest.join(" ")).toContain("Highest starting oxygen in any imported solid-material run: 22.2%");
    expect(gaps.nearest.join(" ")).toContain("Your scenario: 34%, a gap of 11.8 points.");
    const limits = limitsForScenario(scenario, runs);
    expect(limits.kind).toBe("refusal");
    if (limits.kind === "refusal") expect(limits.reasons).toEqual(["Oxygen 34% is above every recorded starting oxygen for PMMA rod (max 22.2%)."]);
  });

  it("shows Ultem's PSI runs: an independent count of runs whose material contains the word", () => {
    const ultem = runs.filter((r) => /\bultem\b/i.test(`${r.material.family} ${r.material.raw}`));
    expect(ultem).toHaveLength(2);
    const row = rows.find((r) => r.entry.id === "cad-ultem")!;
    expect(row.entry.materialKey).toBe("ultem");
    expect(row.evidence).toEqual({ matchable: true, runs: ultem.length, withO2: ultem.filter((r) => r.o2InitialPct !== null).length, maxO2: null });
    expect(row.evidenceText).toBe("2 flight runs with this material name; no starting O2 recorded");
    expect(plain(rowHtml("cad-ultem"))).toContain(row.evidenceText);
    expect(row.labScenario!.materialFamily).toBe("other"); // no ultem run records an oxygen: the fallback family
  });

  it("states the computed sentence from the data, with the atmospheres read from the report's sentence", () => {
    const atm = atmospheresFrom(entries);
    expect(atm).toEqual({ o2a: "26.5", psiA: "10.2", o2b: "34", psiB: "8.2" });
    const withRuns = hardware.filter((h) => materialEvidence(h.materialKey, runs).runs > 0);
    const o2 = withRuns.map((h) => materialEvidence(h.materialKey, runs).maxO2).filter((v): v is number => v !== null);
    const sentence = `${withRuns.length} of ${hardware.length} flagged items name a material with at least one PSI flight run. Among those runs, the highest recorded starting oxygen is ${Math.max(...o2)}%. The report assessed Exploration atmospheres of ${atm.o2a}% O2 at ${atm.psiA} psia and ${atm.o2b}% O2 at ${atm.psiB} psia.`;
    expect(watchlistSentence(rows, atm)).toBe(sentence);
    expect(plain(html)).toContain(sentence);
    expect(sentence).toContain("7 of 15 flagged items");
    expect(sentence).toContain("highest recorded starting oxygen is 22.2%");
    // No highest-oxygen sentence when no matching run records one.
    expect(watchlistSentence(rows.map((r) => ({ ...r, evidence: { ...r.evidence, runs: 1, maxO2: null } })), atm)).not.toContain("highest recorded");
  });

  it("types no numbers in the page logic or view", () => {
    for (const file of ["app/watchlist/watchlist.ts", "app/watchlist/watchlist-view.tsx"]) {
      let code = readFileSync(join(ROOT, file), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      code = code.replace(/const (cell|linkClass) =\s*"[^"]*";/g, "").replace(/className=(\{?)(`[^`]*`|"[^"]*")\}?/g, "");
      for (let prev = ""; prev !== code; ) { prev = code; code = code.replace(/\$\{[^{}]*\}/g, ""); }
      const literals = [...code.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((m) => (m[1] ?? m[2] ?? ""));
      for (const lit of literals) {
        const stripped = lit.replace(/\bO2\b/g, ""); // the chemical formula
        // The intro and footnote quote the report's year; they are exact required text.
        if (lit === WATCHLIST_INTRO || /^context-[a-z0-9-]+$/.test(lit)) continue; // entry ids are identifiers, not numbers
        expect(stripped, `${file}: ${lit.slice(0, 50)}`).not.toMatch(/\d/);
      }
    }
  });

  it("uses no banned words in Firebreak's own text (NASA's words exempt)", () => {
    const own = plain(html.replace(/<(\w+)[^>]*data-quoted[^>]*>[\s\S]*?<\/\1>/g, " "));
    expect(own.length).toBeGreaterThan(600);
    expect(own).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
    expect(WATCHLIST_FOOTNOTE).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });

  it("stacks into cards below 768 px, keeps text at 14 px, and shows column names on each cell", () => {
    expect(html).toContain("hidden md:table-header-group");
    expect(html).toContain("md:table-cell md:px-3 md:before:hidden");
    expect([...html.matchAll(/data-label="([^"]+)"/g)].map((m) => decode(m[1])).slice(0, 4)).toEqual([
      "Hardware", "Material, as NASA wrote it", "NASA's sentence", "PSI flight evidence",
    ]);
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/);
  });
});

describe("watchlist links and the Lab line", () => {
  it("appends one nav link and one /brief link", () => {
    const nav = renderToStaticMarkup(createElement(Nav));
    expect(nav).toMatch(/href="\/watchlist"[^>]*>Watchlist</);
    expect([...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).at(-1)).toBe("/watchlist");
    const rowsSource = readFileSync(join(ROOT, "app/brief/rows.ts"), "utf8");
    expect(rowsSource).toContain('{ label: "Hardware watchlist", href: "/watchlist" }');
  });

  it("counts, per Lab family, the watchlist items with flight evidence in it", () => {
    const counts = familyWatchCounts(entries, runs);
    expect(counts.wax).toBeUndefined();
    expect(counts["PMMA rod"]).toBe(1); // MinION
    for (const family of ["PMMA film", "PMMA slab", "PMMA sphere"] as const) expect(counts[family], family).toBe(1);
    expect(counts.Nomex).toBe(2); // Emergency Mask bags, Crew Quarters
    expect(counts.other).toBeGreaterThan(2); // silicone items, the PMMA & Nomex sample, PMMA named in the raw text
    expect(counts["SIBAL fabric"]).toBeUndefined(); // fabric is not matchable
  });

  it("shows one line linking to /watchlist, and nothing when there is no item", () => {
    expect(watchlistLineText(1)).toBe("NASA's NESC report flags 1 ISS hardware item made of this material.");
    expect(watchlistLineText(3)).toBe("NASA's NESC report flags 3 ISS hardware items made of this material.");
    const line = renderToStaticMarkup(createElement(WatchlistLine, { count: 1 }));
    expect(line).toContain('href="/watchlist"');
    expect(plain(line)).toBe(watchlistLineText(1));
    expect(renderToStaticMarkup(createElement(WatchlistLine, { count: 0 }))).toBe("");
  });

  it("sits directly under the Lab's Summary, driven by the scenario's material family", () => {
    const lab = readFileSync(join(ROOT, "app/lab/lab-client.tsx"), "utf8");
    const at = lab.indexOf("<WatchlistLine");
    expect(at).toBeGreaterThan(lab.indexOf("<Summary matches"));
    expect(at).toBeLessThan(lab.indexOf("<GapsPanel"));
    expect(lab).toContain("watchlistCounts[scenario.materialFamily]");
  });
});
