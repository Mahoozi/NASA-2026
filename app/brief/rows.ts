// Person A — rows of the /brief table. The brief's words, where Firebreak answers
// them, and a neutral description. Every number is computed from data/ here;
// none is typed. Quotes are exact substrings of BRIEF_TEXT.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import corpusJson from "../../data/corpus.json";
import findingsJson from "../../data/findings.json";
import investigationsJson from "../../data/investigations.json";
import runsJson from "../../data/runs.json";
import { limitPoints } from "../../lib/limits";
import type { CorpusDoc, Finding, Investigation, Run, SafetyArea } from "../../lib/schema";
import { EARTH_SECTIONS } from "../earth/content";
import { CSV_COLUMNS } from "../lab/export";
import { MAX_FINDINGS, verifiedFindings } from "../lab/findings";
import { SPACE_VS_EARTH_ID } from "../lab/gravity-bounds-note";
import { presets, scenarioToQuery } from "../lab/scenario";
import { DIMENSIONS, whatVaried } from "../lab/varied";
import { groupInvestigations } from "../investigations/hardware";
import { safetyLabel } from "../investigations/labels";
import { maxStartingO2, partialGravityRunCount, runsWithStartingO2 } from "./run-facts";

export type BriefLink = { label: string; href: string };
export type BriefRow = { quote: string; links: BriefLink[]; seen: string };

/** The "What you'll see" text the brief page must show for the bounds row, exact. */
export const BOUNDS_SEEN =
  "Firebreak shows this claim with a published caveat that lunar gravity may not be bounded.";

const FIRE_SAFETY_AREAS: SafetyArea[] = ["prevention", "detection", "suppression"];

export type BriefFacts = {
  runs: Run[];
  investigations: Investigation[];
  findingsVerified: number;
  evals: { citations: number; citationsVerified: number } | null;
};

/** Person B's latest scorecard, if it has been generated. */
function readEvals(): BriefFacts["evals"] {
  const path = join(process.cwd(), "data", "evals.latest.json");
  if (!existsSync(path)) return null;
  const t = JSON.parse(readFileSync(path, "utf8"))?.totals;
  return t && typeof t.citations === "number" && typeof t.citationsVerified === "number"
    ? { citations: t.citations, citationsVerified: t.citationsVerified }
    : null;
}

export function loadBriefFacts(): BriefFacts {
  return {
    runs: runsJson as Run[],
    investigations: investigationsJson as Investigation[],
    findingsVerified: verifiedFindings(findingsJson as Finding[], corpusJson as CorpusDoc[]).length,
    evals: readEvals(),
  };
}

const labHref = (query: string, hash = "") => `/lab${query ? `?${query}` : ""}${hash}`;

export function briefRows(f: BriefFacts): BriefRow[] {
  const { runs, investigations } = f;
  const presetList = presets(runs);
  const moon = presetList.find((p) => p.id === "moon")!;
  const moonHref = labHref(scenarioToQuery(moon.scenario));
  const points = limitPoints(runs).points;
  const byEvent = (e: string) => points.filter((p) => p.event === e).length;
  const areaCounts = FIRE_SAFETY_AREAS.map(
    (a) => `${safetyLabel(a)} ${investigations.filter((i) => i.safetyArea.includes(a)).length}`,
  );
  const spinoffs = EARTH_SECTIONS.reduce((n, s) => n + s.spinoffs.length, 0);
  const psiRecords = EARTH_SECTIONS.reduce((n, s) => n + s.psiIds.length, 0);
  const withO2 = runsWithStartingO2(runs).length;
  const hardware = groupInvestigations(investigations);
  const [acme, mdca, msg] = hardware.groups.map((g) => g.members.length);

  return [
    {
      quote: "summarizes, ranks, and interprets combustion science investigations",
      links: [
        { label: "Lab: ranked investigations", href: "/lab" },
        { label: "Investigations: summaries", href: "/investigations" },
        { label: "Ask: interpretation with verified quotes", href: "/ask" },
      ],
      seen:
        `The Lab ranks the ${investigations.length} investigations against a scenario you set. ` +
        `Each investigation has a page with its objectives, approach and hypothesis as stored in PSI. ` +
        `Ask answers only with quotes checked against the source text` +
        (f.evals
          ? ` (${f.evals.citationsVerified} of ${f.evals.citations} citations verified in the latest evals).`
          : "."),
    },
    {
      quote: "Identify investigations most relevant to the fire safety needs of habitable crew environments",
      links: [
        ...presetList.map((p) => ({
          label: `Lab preset: ${p.label}`,
          href: labHref(scenarioToQuery(p.scenario)),
        })),
        { label: "Landing page: evidence gap atlas", href: "/#atlas-heading" },
      ],
      seen: `${presetList.length} presets set a scenario in one click (${presetList.map((p) => p.label).join(", ")}), and the Lab ranks the investigations against it.`,
    },
    {
      quote: "Extract data that supports predictive modeling of flammability and fire scenarios",
      links: [
        { label: "Lab: download CSV or JSON, with data dictionary", href: labHref("", "#download-heading") },
        { label: "Lab: recorded flammability limits", href: labHref("", "#limits-heading") },
      ],
      seen:
        `All ${runs.length} imported runs download as CSV or JSON, and the data dictionary describes ${CSV_COLUMNS.length} columns. ` +
        `The limits panel lists ${points.length} recorded limit points (${byEvent("extinction")} extinction, ${byEvent("blowoff")} blowoff, ${byEvent("no-ignition")} no-ignition) ` +
        `and declines to extrapolate beyond them.`,
    },
    {
      quote: "Highlight research that informs the development of next-generation fire safety controls and equipment",
      links: [
        { label: "Investigations: prevention, detection, suppression", href: "/investigations#fire-safety-heading" },
        { label: "Lab: published findings", href: moonHref },
        { label: "Hardware watchlist", href: "/watchlist" },
      ],
      seen:
        `The investigations page groups the investigations by fire-safety area (${areaCounts.join(", ")}). ` +
        `The Lab shows up to ${MAX_FINDINGS} of ${f.findingsVerified} published findings that match your scenario, each a verbatim quote verified against the source text.`,
    },
    {
      quote: "potential applications of the PSI data to fire safety on Earth",
      links: [{ label: "Earth applications", href: "/earth" }],
      seen: `${EARTH_SECTIONS.length} sections (${EARTH_SECTIONS.map((s) => s.heading.toLowerCase()).join(", ")}), each separating the brief's words, the PSI record's words (${psiRecords} investigations) and NASA Spinoff links (${spinoffs}).`,
    },
    {
      quote: "how did tests from the same investigation differ and how were they the same?",
      links: [{ label: "Lab: what varied and what was held fixed", href: labHref("", "#varied-heading") }],
      seen: `A table with a column for each of the ${whatVaried(runs).length} investigations that have run data and a row for each of ${DIMENSIONS.length} dimensions. Each cell says varied, held fixed or not recorded, with the number of runs behind it.`,
    },
    {
      quote: "similarities and differences between different investigations",
      links: [{ label: "Investigations: comparison table", href: "/investigations#compare-heading" }],
      seen: `A table of all ${investigations.length} investigations that you can filter by safety area and fuel phase and sort by column.`,
    },
    {
      quote: "there is currently no partial-gravity combustion data available in PSI",
      links: [
        { label: "Landing page: the gap in one line", href: "/#gap-heading" },
        { label: "Lab: partial-gravity caveat (Moon Base preset)", href: moonHref },
      ],
      seen: `${partialGravityRunCount(runs, investigations)} of ${runs.length} imported runs were in lunar or Martian gravity. A lunar or Martian scenario in the Lab carries the partial-gravity caveat.`,
    },
    {
      quote: "Microgravity and normal-gravity results could bound what occurs at intermediate gravity levels.",
      links: [{ label: "Lab: Space vs Earth (Saffire-II)", href: labHref("", `#${SPACE_VS_EARTH_ID}`) }],
      seen: BOUNDS_SEEN,
    },
    {
      quote: "The intermediate oxygen concentration used on the Moon will likely be 30% or greater",
      links: [
        { label: "Lab preset: Moon Base (planned)", href: moonHref },
        { label: "Lab: where the evidence runs out", href: labHref(scenarioToQuery(moon.scenario), "#summary-heading") },
      ],
      seen: `The ${moon.label} preset sets ${moon.scenario.o2Pct}% oxygen at ${moon.scenario.pressurePsi} psi. Of ${withO2} solid-material runs with a recorded starting oxygen, the highest started at ${maxStartingO2(runs)}%; the Lab states the gap for your scenario.`,
    },
    {
      quote:
        "The six experiments in the ACME project featured flames of gaseous fuels and were all conducted with the same modular set of ACME hardware in the Combustion Integrated Rack (CIR).",
      links: [{ label: "Investigations: hardware groups", href: "/investigations#hardware-heading" }],
      seen: `Investigations grouped by the brief's three hardware families (ACME, MDCA, MSG flow duct), with the rest listed separately. ${acme} in ACME, ${mdca} in MDCA, ${msg} in the MSG group; ${hardware.rest.length} listed separately.`,
    },
  ];
}
