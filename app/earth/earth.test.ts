import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import { Nav } from "../../components/nav";
import type { Investigation, Run } from "../../lib/schema";
import {
  BRIEF_FLEX_SENTENCE,
  BRIEF_TEXT,
  displayBriefQuote,
  EARTH_INTRO,
  EARTH_SECTIONS,
  NO_SPINOFF,
  SUPPRESSION_NOTE,
  nomexRuns,
  runFields,
  SPINOFF_LABEL,
  splitSentences,
} from "./content";
import EarthPage from "./page";

const investigations = investigationsJson as Investigation[];
const runs = runsJson as Run[];
const html = renderToStaticMarkup(createElement(EarthPage));

const decode = (s: string) =>
  s
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const text = (s: string) => decode(s.replace(/<[^>]*>/g, ""));
/** The page's own wording: quoted elements (brief, PSI record, stored run values) removed. */
const ownText = text(html.replace(/<(\w+)[^>]*data-quoted[^>]*>[\s\S]*?<\/\1>/g, " "));
const quotedText = [...html.matchAll(/<(\w+)[^>]*data-quoted[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => text(m[2]));

describe("/earth page", () => {
  it("lists only investigations that exist, in the requested order", () => {
    expect(EARTH_SECTIONS.map((s) => [s.id, s.psiIds])).toEqual([
      ["suppression", ["PSI-69"]],
      ["detection", ["PSI-102", "PSI-101", "PSI-47"]],
      ["gear", ["PSI-99"]],
    ]);
    for (const s of EARTH_SECTIONS)
      for (const id of s.psiIds) expect(investigations.some((i) => i.id === id), id).toBe(true);
    const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
    expect(headings).toEqual(["Suppression", "Smoke detection", "Firefighter gear"]);
  });

  it("has three parts per section, in order", () => {
    const parts = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1]));
    expect(parts).toEqual(
      EARTH_SECTIONS.flatMap(() => ["From the challenge brief", "What the PSI record says", "NASA Spinoffs"]),
    );
  });

  it("uses the exact intro text", () => {
    expect(text(html)).toContain(EARTH_INTRO);
    expect(EARTH_INTRO).toBe(
      "NASA's microgravity fire research also feeds fire safety on Earth. Each section separates what the challenge brief says, what the PSI records say, and NASA Spinoff pages. Firebreak does not claim that any specific PSI test led to a specific Earth product.",
    );
  });

  it("quotes the brief exactly and labels it", () => {
    for (const s of EARTH_SECTIONS)
      for (const q of s.briefQuotes) {
        expect(BRIEF_TEXT).toContain(q);
        expect(quotedText).toContain(displayBriefQuote(q));
      }
    expect(text(html).match(/NASA Space Apps challenge brief/g)).toHaveLength(EARTH_SECTIONS.length);
  });

  it("Suppression shows the two brief quotes and the no-link note", () => {
    const [suppression] = EARTH_SECTIONS;
    expect(suppression.briefQuotes).toEqual([
      "Suppression was studied in the Flame Extinguishment Experiment (FLEX) through dilution of the chamber atmosphere with carbon dioxide and helium, both of which suppress fire.",
      "Fine-water-mist extinguishers developed for use on the ISS have practical applications here on Earth",
    ]);
    // A whole sentence gets no ellipsis; a cut-out fragment does.
    expect(displayBriefQuote(BRIEF_FLEX_SENTENCE)).toBe(BRIEF_FLEX_SENTENCE);
    expect(displayBriefQuote(suppression.briefQuotes[1])).toBe(`${suppression.briefQuotes[1]}…`);
    expect(SUPPRESSION_NOTE).toBe("The brief does not link these two; Firebreak does not either.");
    expect(text(html)).toContain(SUPPRESSION_NOTE);
    expect(ownText).toContain(SUPPRESSION_NOTE);
  });

  it("does not show FLEX-2 (PSI-68) anywhere", () => {
    expect(EARTH_SECTIONS.flatMap((s) => s.psiIds)).not.toContain("PSI-68");
    expect(html).not.toContain("PSI-68");
    expect(html).not.toContain("FLEX-2");
    expect(text(html)).not.toContain("liquid fuels");
  });

  it("renders every earthBenefits string exactly as stored", () => {
    for (const s of EARTH_SECTIONS)
      for (const id of s.psiIds) {
        const stored = investigations.find((i) => i.id === id)!.earthBenefits!;
        const { lead, separator, rest } = splitSentences(stored);
        expect(lead + separator + rest, id).toBe(stored);
        expect(lead.length, id).toBeGreaterThan(0);
        expect(rest.length, id).toBeGreaterThan(0);
        expect(quotedText, id).toContain(lead);
        expect(quotedText, id).toContain(rest);
      }
  });

  it("shows two sentences before the expandable rest", () => {
    const { lead } = splitSentences(investigations.find((i) => i.id === "PSI-47")!.earthBenefits!);
    expect(lead.match(/[.!?](?=\s|$)/g)).toHaveLength(2);
    expect(html.match(/<details/g)).toHaveLength(EARTH_SECTIONS.flatMap((s) => s.psiIds).length);
  });

  it("links each acronym to its investigation page", () => {
    for (const id of EARTH_SECTIONS.flatMap((s) => s.psiIds)) {
      const inv = investigations.find((i) => i.id === id)!;
      const re = new RegExp(`href="/investigations/${id}"[^>]*>${inv.acronym.replace(/[/]/g, "\\/")}</a>`);
      expect(html, id).toMatch(re);
    }
  });

  it("shows the Saffire-II Nomex run with the stored values", () => {
    const found = nomexRuns(runs);
    expect(found.map((r) => r.id)).toEqual(["PSI-99:2-7"]);
    const run = found[0];
    const fields = runFields(run);
    const get = (label: string) => fields.find((f) => f.label === label)?.value;
    expect(get("Run id")).toBe(run.id);
    expect(get("Sample id")).toBe(run.testId);
    expect(get("Material as recorded")).toBe(run.material.raw);
    expect(get("Starting oxygen")).toBe(`${run.o2InitialPct}%`);
    expect(get("Airflow as recorded")).toBe(run.flowCmS.raw);
    expect(get("Event keyword")).toBe("outcome not recorded");
    expect(run.events).toEqual([]);
    for (const label of ["microgravity burn length", "1-g burn length"])
      expect(get(label)).toBe(run.observations!.find((o) => o.label === label)!.value);
    // Stored as "source note 2"; displayed as "Source note", value verbatim.
    const note = run.observations!.find((o) => o.label === "source note 2")!.value;
    expect(note).toBe("The PMMA portion was completely consumed but the Nomex was not ignited.");
    expect(get("Source note")).toBe(note);
    expect(fields.some((f) => f.label === "source note 2")).toBe(false);
    expect(html).toMatch(/<dt[^>]*>Source note<\/dt><dd[^>]*data-quoted="run"[^>]*>The PMMA portion was completely consumed but the Nomex was not ignited\.<\/dd>/);
    expect(fields.filter((f) => f.flag).map((f) => f.value)).toEqual(run.flags);
    for (const f of fields) expect(quotedText).toContain(f.value);
    expect(quotedText).toContain("The PMMA portion was completely consumed but the Nomex was not ignited.");
  });

  it("labels spinoffs and says when there are none", () => {
    const links = [...html.matchAll(/href="(https:\/\/spinoff\.nasa\.gov\/node\/\d+)"/g)].map((m) => m[1]);
    expect(links).toEqual([
      "https://spinoff.nasa.gov/node/9407",
      "https://spinoff.nasa.gov/node/9582",
      "https://spinoff.nasa.gov/node/9918",
    ]);
    expect(text(html).match(new RegExp(SPINOFF_LABEL.replace(/[()]/g, "\\$&"), "g"))).toHaveLength(3);
    expect(text(html).match(new RegExp(NO_SPINOFF.replace(/\./g, "\\."), "g"))).toHaveLength(1);
    expect(EARTH_SECTIONS[0].spinoffs).toEqual([]);
  });

  it("uses no banned words in the page's own text (quoted text is exempt)", () => {
    expect(ownText.length).toBeGreaterThan(200);
    expect(ownText).not.toMatch(/\b(safe|unsafe|risk|rating|probability|likely)\b/i);
  });

  it("keeps text at 14 px or larger", () => {
    expect(html).not.toMatch(/text-(xs|\[1[0-3]px\])/);
  });

  it("is linked from the nav", () => {
    expect(renderToStaticMarkup(createElement(Nav))).toMatch(/href="\/earth"[^>]*>Earth</);
  });
});
