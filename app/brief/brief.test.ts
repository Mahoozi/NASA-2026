import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import corpusJson from "../../data/corpus.json";
import findingsJson from "../../data/findings.json";
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import { Nav } from "../../components/nav";
import { limitPoints } from "../../lib/limits";
import type { CorpusDoc, Finding, Investigation, Run } from "../../lib/schema";
import { EARTH_SECTIONS } from "../earth/content";
import { CSV_COLUMNS } from "../lab/export";
import { MAX_FINDINGS, verifiedFindings } from "../lab/findings";
import { DIMENSIONS, whatVaried } from "../lab/varied";
import { ARTEMIS_ATTRIBUTION, ARTEMIS_QUOTE, BRIEF_TEXT, displayBriefQuote } from "./brief-text";
import BriefPage, { REFUSALS } from "./page";
import { BOUNDS_SEEN, briefRows, loadBriefFacts } from "./rows";
import { maxStartingO2, partialGravityRunCount } from "./run-facts";

const runs = runsJson as Run[];
const investigations = investigationsJson as Investigation[];
const facts = loadBriefFacts();
const rows = briefRows(facts);
const html = renderToStaticMarkup(createElement(BriefPage));
const decode = (s: string) =>
  s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (s: string) => decode(s.replace(/<[^>]*>/g, ""));
const strip = (h: string, attr: string) => h.replace(new RegExp(`<(\\w+)[^>]*${attr}[^>]*>[\\s\\S]*?</\\1>`, "g"), " ");
const ownText = text(strip(strip(html, "data-quoted"), "data-exempt"));
const ROOT = join(__dirname, "..", "..");

describe("/brief page", () => {
  it("has the ten rows in order, with the brief's own words", () => {
    expect(rows.map((r) => r.quote)).toEqual([
      "summarizes, ranks, and interprets combustion science investigations",
      "Identify investigations most relevant to the fire safety needs of habitable crew environments",
      "Extract data that supports predictive modeling of flammability and fire scenarios",
      "Highlight research that informs the development of next-generation fire safety controls and equipment",
      "potential applications of the PSI data to fire safety on Earth",
      "how did tests from the same investigation differ and how were they the same?",
      "similarities and differences between different investigations",
      "there is currently no partial-gravity combustion data available in PSI",
      "Microgravity and normal-gravity results could bound what occurs at intermediate gravity levels.",
      "The intermediate oxygen concentration used on the Moon will likely be 30% or greater",
    ]);
  });

  it("every quote is an exact substring of the stored brief text", () => {
    for (const r of rows) {
      expect(BRIEF_TEXT, r.quote).toContain(r.quote);
      expect(text(html), r.quote).toContain(displayBriefQuote(r.quote));
    }
    expect(BRIEF_TEXT).toContain(ARTEMIS_QUOTE);
  });

  it("has the three columns and the exact bounds text", () => {
    expect([...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => text(m[1]))).toEqual([
      "The brief asks",
      "Where in Firebreak",
      "What you'll see",
    ]);
    expect(rows[8].seen).toBe("Firebreak shows this claim with a published caveat that lunar gravity may not be bounded.");
    expect(BOUNDS_SEEN).toBe(rows[8].seen);
  });

  it("every link points to an existing route and anchor", () => {
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => decode(m[1]));
    const internal = hrefs.filter((h) => h.startsWith("/"));
    expect(internal.length).toBeGreaterThan(10);
    const sources = (dir: string): string =>
      readdirSync(dir)
        .map((f) => (statSync(join(dir, f)).isDirectory() ? sources(join(dir, f)) : readFileSync(join(dir, f), "utf8")))
        .join("\n");
    for (const href of internal) {
      const [path, hash] = href.replace(/\?[^#]*/, "").split("#");
      const dir = join(ROOT, "app", path === "/" ? "" : path);
      expect(existsSync(join(dir, "page.tsx")), href).toBe(true);
      if (hash) expect(sources(path === "/" ? join(ROOT, "app") : dir), href).toContain(hash);
    }
    // Internal links are exactly those in the rows.
    expect(internal).toEqual(rows.flatMap((r) => r.links.map((l) => l.href)));
  });

  it("computes every number from the data files", () => {
    const seen = (i: number) => rows[i].seen;
    const pts = limitPoints(runs).points;
    expect(seen(0)).toContain(`${investigations.length} investigations`);
    if (facts.evals) expect(seen(0)).toContain(`${facts.evals.citationsVerified} of ${facts.evals.citations} citations verified`);
    expect(seen(1)).toContain("4 presets");
    expect(seen(2)).toContain(`All ${runs.length} imported runs`);
    expect(seen(2)).toContain(`${CSV_COLUMNS.length} columns`);
    expect(seen(2)).toContain(`${pts.length} recorded limit points (${pts.filter((p) => p.event === "extinction").length} extinction, ${pts.filter((p) => p.event === "blowoff").length} blowoff, ${pts.filter((p) => p.event === "no-ignition").length} no-ignition)`);
    const area = (a: string) => investigations.filter((i) => i.safetyArea.includes(a as never)).length;
    expect(seen(3)).toContain(`(Prevention ${area("prevention")}, Detection ${area("detection")}, Suppression ${area("suppression")})`);
    const findingsOk = verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]).length;
    expect(seen(3)).toContain(`up to ${MAX_FINDINGS} of ${findingsOk} published findings`);
    expect(seen(4)).toContain(`${EARTH_SECTIONS.length} sections`);
    expect(seen(5)).toContain(`${whatVaried(runs).length} investigations that have run data`);
    expect(seen(5)).toContain(`${DIMENSIONS.length} dimensions`);
    expect(seen(6)).toContain(`all ${investigations.length} investigations`);
    const platform = (id: string) => investigations.find((i) => i.id === id)?.platform ?? "";
    expect(partialGravityRunCount(runs, investigations)).toBe(
      runs.filter((r) => /moon|lunar|mars|martian/i.test(platform(r.investigationId))).length,
    );
    expect(seen(7)).toContain(`${partialGravityRunCount(runs, investigations)} of ${runs.length} imported runs were in lunar or Martian gravity`);
    const o2 = runs.filter((r) => r.o2InitialPct !== null).map((r) => r.o2InitialPct!);
    expect(maxStartingO2(runs)).toBe(Math.max(...o2));
    expect(seen(9)).toContain(`Of ${o2.length} solid-material runs with a recorded starting oxygen, the highest started at ${Math.max(...o2)}%`);
    expect(seen(9)).toContain("sets 30% oxygen at 10.2 psi");
  });

  it("types no numbers into the rows or the page component", () => {
    let code = readFileSync(join(ROOT, "app/brief/rows.ts"), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    // Drop ${…} substitutions (innermost first); what is left is typed text.
    for (let prev = ""; prev !== code; ) {
      prev = code;
      code = code.replace(/\$\{[^{}]*\}/g, "");
    }
    const literals = [...code.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((m) => (m[1] ?? m[2] ?? "").trim());
    expect(literals.length).toBeGreaterThan(30);
    // Typed text has no digits, except brief quotes (substrings of the stored brief) and route paths.
    for (const lit of literals)
      if (/\d/.test(lit) && !/^[./#?=&\w-]*$/.test(lit)) expect(BRIEF_TEXT, lit).toContain(lit);
    const page = readFileSync(join(ROOT, "app/brief/page.tsx"), "utf8");
    expect(page.match(/>[^<{>]*\d[^<{>]*</g) ?? []).toEqual([]);
  });

  it("shows the three refusals, exactly", () => {
    expect(REFUSALS).toEqual([
      "No fire-risk scores, safety ratings or predictions beyond tested conditions.",
      "Every oxygen claim is limited to solid-material runs with a recorded starting oxygen.",
      "Where a PSI table disagrees with a NASA paper, the table value is kept and the difference is flagged.",
    ]);
    for (const t of REFUSALS) expect(text(html)).toContain(t);
    expect(text(html)).toContain("What Firebreak refuses to do");
  });

  it("uses no banned words in Firebreak's own text (quotes and the refusal list are exempt)", () => {
    expect(ownText.length).toBeGreaterThan(500);
    expect(ownText).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });

  it("keeps text at 14 px or larger", () => {
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/);
  });

  it("is linked from the nav and the landing page's How it works section", () => {
    expect(renderToStaticMarkup(createElement(Nav))).toMatch(/href="\/brief"[^>]*>Challenge</);
    const landing = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    expect(landing.slice(landing.indexOf("How it works"))).toContain('href="/brief"');
  });
});

describe("Artemis II opener on the landing page", () => {
  it("quotes the brief exactly and attributes it without naming the commander", () => {
    expect(ARTEMIS_ATTRIBUTION).toBe("Artemis II commander, quoted in the NASA Space Apps challenge brief");
    expect(BRIEF_TEXT).toContain(ARTEMIS_QUOTE);
    expect(BRIEF_TEXT).toContain(`commented, “${ARTEMIS_QUOTE}”`);
    const landing = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    expect(landing).toContain("ARTEMIS_QUOTE");
    expect(landing).toContain("ARTEMIS_ATTRIBUTION");
    expect(landing.indexOf("ARTEMIS_QUOTE}”")).toBeLessThan(landing.indexOf("{INCIDENTS.map"));
  });
});
