/**
 * Build data/investigations.json and data/corpus.json from raw NASA sources.
 *
 *   npm run build:corpus
 *
 * Reads  data/raw/psi-combustion-investigations-<date>.json (PSI API snapshot,
 *        never modified) and data/runs.json (for hasRunData)
 * Writes data/investigations.json, data/corpus.json, pipeline/corpus_report.md
 *
 * Text is copied verbatim from PSI. Nothing is summarised or filled in.
 * TODO(B): add the Researcher's Guide PDF pages (guide-p<page>) and NASA web
 * pages (nasa-web-<slug>) once their raw files are in data/raw/.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { CorpusDoc, Investigation, Run, SafetyArea } from "../lib/schema";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RAW_PSI = "data/raw/psi-combustion-investigations-2026-11-14.json";
export const pageUrl = (id: string) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;

type FuelPhase = Investigation["fuelPhase"][number];
type PsiRecord = Record<string, unknown> & { Accession: string };

// safetyArea follows the team handoff, which takes it from the challenge text:
// BASS, BASS-II, Saffire and ACME BRE are prevention (material flammability);
// SAME, SAME-R and DAFT (instrument for SAME) are detection; FLEX is
// suppression; everything else is fundamental.
export const SAFETY: Record<string, SafetyArea[]> = {
  "PSI-26": ["prevention"], // BASS
  "PSI-25": ["prevention"], // BASS-II
  "PSI-98": ["prevention"], // SAFFIRE-I
  "PSI-99": ["prevention"], // SAFFIRE-II
  "PSI-100": ["prevention"], // SAFFIRE-III
  "PSI-20": ["prevention"], // ACME BRE
  "PSI-102": ["detection"], // SAME
  "PSI-101": ["detection"], // SAME-R
  "PSI-47": ["detection"], // DAFT / DAFT-2
  "PSI-69": ["suppression"], // FLEX
};

// fuelPhase is set only where the PSI record supports it. Each entry quotes the
// PSI text it rests on; the build fails if the quote is not in the record.
// basis "material": the record names the fuel/material, not its phase.
// Investigations not listed get [] (phase not stated, or not a fuel study).
export const FUEL: Record<string, { phase: FuelPhase[]; quote: string; basis?: "material" }> = {
  "PSI-10": { phase: ["gas"], quote: "Flames of Gaseous Fuels" },
  "PSI-20": { phase: ["gas"], quote: "Flames of Gaseous Fuels" },
  "PSI-21": { phase: ["gas"], quote: "Flames of gaseous fuel" },
  "PSI-22": { phase: ["gas"], quote: "The gas-jet burner" },
  "PSI-23": { phase: ["gas"], quote: "Conventional gaseous fuels" },
  "PSI-25": { phase: ["solid"], quote: "Solid Fuels" },
  "PSI-26": { phase: ["solid"], quote: "Burning and Suppression of Solids" },
  "PSI-39": { phase: ["liquid droplet"], quote: "Droplet combustion" },
  "PSI-60": { phase: ["gas"], quote: "Gaseous" },
  "PSI-62": { phase: ["solid"], quote: "solid fuel combustion processes" },
  "PSI-68": { phase: ["liquid droplet"], quote: "droplet combustion" },
  "PSI-69": { phase: ["liquid droplet"], quote: "flammability limits of liquid fuels" },
  "PSI-98": { phase: ["solid"], quote: "Solid burning rate" },
  "PSI-99": { phase: ["solid"], quote: "SIBAL, silicone, structure PMMA, flat PMMA, and PMMA with Nomex", basis: "material" },
  "PSI-100": { phase: ["solid"], quote: "used SIBAL as the sample material", basis: "material" },
  "PSI-106": { phase: ["gas"], quote: "methane, ethylene, and nitrogen-diluted mixtures", basis: "material" },
  "PSI-107": { phase: ["gas"], quote: "ethylene, propane, and propylene mixtures", basis: "material" },
  "PSI-117": { phase: ["liquid droplet"], quote: "droplet cool flames" },
  "PSI-159": { phase: ["gas"], quote: "Flames of Gaseous Fuels" },
};

// [PSI field, corpus id section, heading]
const SECTIONS: [string, string, string][] = [
  ["Objectives", "objectives", "Objectives"],
  ["Approach", "approach", "Approach"],
  ["Hypothesis", "hypothesis", "Hypothesis"],
  ["Research Impacts/Earth Benefits", "earth-benefits", "Research Impacts / Earth Benefits"],
];

const str = (v: unknown) => (typeof v === "string" ? v : "");
/** Field value for investigations.json: verbatim, only line endings and outer whitespace trimmed. */
const clean = (v: unknown) => str(v).replace(/\r\n/g, "\n").trim();
/** Corpus text: verbatim with whitespace collapsed (plan/B.md). */
export const collapse = (v: unknown) => str(v).replace(/\s+/g, " ").trim();
/** PSI separates multiple values with runs of spaces. */
const splitMulti = (v: unknown) => clean(v).split(/\s{2,}/).map((x) => x.trim()).filter(Boolean);
const num = (id: string) => Number(id.replace(/^PSI-/, ""));

export function build(records: PsiRecord[], runs: Pick<Run, "investigationId">[]) {
  const errors: string[] = [];
  const notes: string[] = [];
  const investigations: Investigation[] = [];
  const corpus: CorpusDoc[] = [];
  const withRuns = new Set(runs.map((r) => r.investigationId));

  for (const r of records) {
    const id = r.Accession;
    if (r["Research Area"] !== "Combustion Science") errors.push(`${id}: not Combustion Science`);

    const fuel = FUEL[id];
    if (fuel) {
      const haystack = collapse(Object.values(r).map(str).join(" \n ")).toLowerCase();
      if (!haystack.includes(collapse(fuel.quote).toLowerCase())) {
        errors.push(`${id}: fuelPhase quote not found in PSI record: "${fuel.quote}"`);
      }
    }

    const hardware = (r["Experiment Hardware"] ?? {}) as { Name?: unknown };
    const platformRaw = clean(r["Flight Platform"]);
    const isGround = r["Project Type"] === "Ground Investigation";
    const platform = platformRaw && platformRaw !== "Not Applicable" ? platformRaw : isGround ? "Ground" : "";

    const inv: Investigation = {
      id,
      acronym: clean(r.Acronym),
      name: clean(r.Title),
      url: pageUrl(id),
      safetyArea: SAFETY[id] ?? ["fundamental"],
      fuelPhase: fuel?.phase ?? [],
      facility: splitMulti(hardware.Name).join("; "),
      platform,
      objectives: clean(r.Objectives),
      approach: clean(r.Approach),
      hasRunData: withRuns.has(id),
    };
    const hypothesis = clean(r.Hypothesis);
    if (hypothesis) inv.hypothesis = hypothesis;
    const earth = clean(r["Research Impacts/Earth Benefits"]);
    if (earth) inv.earthBenefits = earth;
    investigations.push(inv);

    if (!inv.acronym) notes.push(`${id}: no acronym in PSI`);
    if (!inv.facility) notes.push(`${id}: no Experiment Hardware in PSI`);
    if (!inv.platform) notes.push(`${id}: no Flight Platform in PSI`);
    if (!inv.fuelPhase.length) notes.push(`${id}: fuelPhase left empty (not stated in PSI record)`);
    if (fuel?.basis === "material") notes.push(`${id}: fuelPhase "${fuel.phase.join(", ")}" inferred from the named material: "${fuel.quote}"`);
    for (const [field] of SECTIONS) if (!clean(r[field])) notes.push(`${id}: PSI field "${field}" is empty`);

    const label = inv.acronym || inv.name;
    const n = id.toLowerCase();

    // Project facts, built only from labelled PSI fields.
    const project = (
      [
        ["Title", r.Title],
        ["Acronym", r.Acronym],
        ["Project Type", r["Project Type"]],
        ["Flight Platform", r["Flight Platform"]],
        ["Research Area", r["Research Area"]],
        ["SubResearch Area", r["SubResearch Area"]],
        ["Investigation Start Date", r["Investigation Start Date"]],
        ["Investigation End Date", r["Investigation End Date"]],
        ["Sponsoring Agency", r["Sponsoring Agency"]],
        ["Monitoring Center", r["Monitoring Center"]],
        ["Experiment Hardware", splitMulti(hardware.Name).join("; ")],
        ["Keywords", splitMulti(r.Keywords).join("; ")],
        ["Related Investigations", splitMulti(r["Related Investigations"]).join("; ")],
      ] as [string, unknown][]
    )
      .map(([k, v]) => [k, collapse(v)])
      .filter(([, v]) => v && v !== "Not Applicable")
      .map(([k, v]) => `${k}: ${v}.`)
      .join(" ");
    corpus.push({ id: `${n}-project`, source: "psi", investigationId: id, title: `${label}: Project (${id})`, url: inv.url, text: project });

    for (const [field, section, heading] of SECTIONS) {
      const text = collapse(r[field]);
      if (text) corpus.push({ id: `${n}-${section}`, source: "psi", investigationId: id, title: `${label}: ${heading} (${id})`, url: inv.url, text });
    }
  }

  // Asserts (plan/B.md Stage 1)
  for (const id of new Set([...Object.keys(SAFETY), ...Object.keys(FUEL)])) {
    if (!records.some((r) => r.Accession === id)) errors.push(`${id}: in curation tables but not in raw data`);
  }
  const ids = new Set<string>();
  for (const d of corpus) {
    if (ids.has(d.id)) errors.push(`duplicate corpus id ${d.id}`);
    ids.add(d.id);
    if (!d.text) errors.push(`${d.id}: empty text`);
    const host = new URL(d.url).hostname;
    if (!/(^|\.)(psi\.nasa\.gov|nasa\.gov|ntrs\.nasa\.gov)$/.test(host)) errors.push(`${d.id}: url not on a NASA host`);
  }
  for (const inv of investigations) {
    if (!corpus.some((d) => d.investigationId === inv.id)) errors.push(`${inv.id}: no corpus docs`);
  }

  investigations.sort((a, b) => num(a.id) - num(b.id));
  corpus.sort((a, b) => num(a.investigationId ?? "") - num(b.investigationId ?? "")); // stable: keeps section order
  notes.sort((a, b) => num(a.split(":")[0]) - num(b.split(":")[0]));
  return { investigations, corpus, errors, notes };
}

function report(investigations: Investigation[], corpus: CorpusDoc[], notes: string[]) {
  const bySource = new Map<string, number>();
  for (const d of corpus) bySource.set(d.source, (bySource.get(d.source) ?? 0) + 1);
  const lines = [
    "# Corpus build report",
    "",
    "Generated by `npm run build:corpus` (pipeline/corpus_build.ts). Do not edit by hand.",
    "",
    `Raw PSI snapshot: \`${RAW_PSI}\``,
    "",
    "## Doc counts per source",
    "",
    "| Source | Docs |",
    "|---|---|",
    ...[...bySource].map(([s, c]) => `| ${s} | ${c} |`),
    "",
    "## Investigations",
    "",
    "| Id | Acronym | Safety area | Fuel phase | Platform | Run data | Docs |",
    "|---|---|---|---|---|---|---|",
    ...investigations.map(
      (i) =>
        `| ${i.id} | ${i.acronym || "—"} | ${i.safetyArea.join(", ")} | ${i.fuelPhase.join(", ") || "—"} | ${i.platform || "—"} | ${i.hasRunData ? "yes" : "no"} | ${corpus.filter((d) => d.investigationId === i.id).length} |`,
    ),
    "",
    "## How labels were set",
    "",
    "- `safetyArea`: from the challenge text as recorded in the team handoff (BASS, BASS-II, Saffire, ACME BRE = prevention; SAME, SAME-R, DAFT = detection; FLEX = suppression; all others = fundamental).",
    "- `fuelPhase`: only where the PSI record supports it; each label's supporting PSI quote is in `FUEL` in corpus_build.ts and is checked against the record on every build.",
    "- `hasRunData`: true when `data/runs.json` has runs for the investigation.",
    "- `doi`: not provided by the PSI search API; omitted.",
    "",
    "## Gaps and notes",
    "",
    ...notes.map((n) => `- ${n}`),
    "",
  ];
  return lines.join("\n");
}

function main() {
  const raw = JSON.parse(readFileSync(join(ROOT, RAW_PSI), "utf8")) as {
    hits: { total: number; hits: { _source: PsiRecord }[] };
  };
  const records = raw.hits.hits.map((h) => h._source);
  if (records.length !== raw.hits.total) throw new Error("Raw PSI snapshot is incomplete");
  const runs = JSON.parse(readFileSync(join(ROOT, "data", "runs.json"), "utf8")) as Run[];

  const { investigations, corpus, errors, notes } = build(records, runs);
  if (errors.length) throw new Error(`Build failed:\n${errors.join("\n")}`);

  writeFileSync(join(ROOT, "data", "investigations.json"), JSON.stringify(investigations, null, 2) + "\n");
  writeFileSync(join(ROOT, "data", "corpus.json"), JSON.stringify(corpus, null, 2) + "\n");
  writeFileSync(join(ROOT, "pipeline", "corpus_report.md"), report(investigations, corpus, notes));
  console.log(`investigations.json: ${investigations.length} investigations`);
  console.log(`corpus.json: ${corpus.length} docs`);
  console.log(`corpus_report.md: ${notes.length} notes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
